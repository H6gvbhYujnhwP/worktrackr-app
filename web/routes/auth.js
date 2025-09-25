// web/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const Stripe = require('stripe');
const { query, transaction } = require('@worktrackr/shared/db');

const router = express.Router();

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// -------------------- helpers --------------------
function signJwt(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

async function findUserByEmail(email) {
  const r = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
  return r.rows[0] || null;
}

// NEW: accept friendly org text, send a safe slug to DB
function toSlug(s) {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')  // non-alphanum → hyphen
    .replace(/^-+|-+$/g, '')      // trim hyphens
    .slice(0, 60);
}

// -------------------- schemas --------------------
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  organizationName: z.string().min(1).optional()
});

// Option B: start Stripe signup (new customer)
const startSignupSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  // RELAXED: let users type normal names; we'll slugify
  org_slug: z.string().min(2).max(80),
  price_id: z.string().optional() // defaults to STRIPE/PRICE_STARTER
});

// -------------------- Option A: existing customers (login/register) --------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signJwt({ userId: user.id, email: user.email });
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // simple membership context
    const m = await query(
      'SELECT organisation_id AS "orgId", role FROM memberships WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1',
      [user.id]
    );

    return res.json({ user: { id: user.id, email: user.email, name: user.name }, membership: m.rows[0] || null });
  } catch (error) {
    console.error('login error:', error);
    res.status(400).json({ error: 'Login failed' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, name, password, organizationName } = registerSchema.parse(req.body);
    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await transaction(async (client) => {
      const userResult = await client.query(
        'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name',
        [email.toLowerCase(), name, passwordHash]
      );
      const user = userResult.rows[0];

      let organization = null;
      if (organizationName) {
        const orgResult = await client.query(
          'INSERT INTO organisations (name) VALUES ($1) RETURNING id, name',
          [organizationName]
        );
        organization = orgResult.rows[0];
        await client.query(
          'INSERT INTO memberships (user_id, organisation_id, role) VALUES ($1, $2, $3)',
          [user.id, organization.id, 'owner']
        );
      }

      return { user, organization };
    });

    const token = signJwt({ userId: result.user.id, email: result.user.email });
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      user: result.user,
      organization: result.organization,
    });
  } catch (error) {
    console.error('register error:', error);
    res.status(400).json({ error: 'Registration failed' });
  }
});

// -------------------- Option B: Stripe trial flow (new customers) --------------------

// 1) start signup → create Stripe checkout, store payload
router.post('/signup/start', async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    const { full_name, email, password, org_slug, price_id } = startSignupSchema.parse(req.body);

    // accept explicit price from client, else fallback
    const priceId = price_id || process.env.PRICE_STARTER || process.env.STRIPE_PRICE_STARTER;
    if (!priceId) return res.status(400).json({ error: 'Price ID not configured' });

    const existing = await findUserByEmail(email);
    const password_hash = await bcrypt.hash(password, 10);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${APP_BASE_URL}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_BASE_URL}/signup?canceled=1`,
      customer_creation: 'if_required',
      metadata: { email, full_name, org_slug: toSlug(org_slug), existing_user: existing ? '1' : '0' }
    });

    await query(`
      INSERT INTO checkout_sessions (stripe_session_id, email, full_name, org_slug, password_hash, price_id)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (stripe_session_id) DO NOTHING
    `, [session.id, email, full_name, toSlug(org_slug), password_hash, priceId]);

    res.json({ url: session.url });
  } catch (error) {
    console.error('signup/start error:', error);
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', details: error.errors });
    res.status(500).json({ error: 'Failed to start signup' });
  }
});

// 2) complete signup after redirect
router.post('/signup/complete', async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    const sessionId = z.string().min(10).parse(req.query.session_id || req.body.session_id);
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });

    if (session.status !== 'complete') {
      return res.status(400).json({ error: 'Checkout not complete' });
    }

    const row = await query('SELECT * FROM checkout_sessions WHERE stripe_session_id = $1 LIMIT 1', [sessionId]);
    if (row.rows.length === 0) return res.status(400).json({ error: 'Signup context not found' });
    const s = row.rows[0];

    // idempotency: if org exists, just log in the user
    const existingOrg = await query('SELECT id FROM organisations WHERE LOWER(name) = LOWER($1) LIMIT 1', [s.org_slug]);
    let orgId;
    if (existingOrg.rows.length > 0) {
      orgId = existingOrg.rows[0].id;
    } else {
      const org = await query(`
        INSERT INTO organisations (name, stripe_customer_id, stripe_subscription_id, plan_price_id)
        VALUES ($1,$2,$3,$4) RETURNING id
      `, [s.org_slug, session.customer, session.subscription?.id || null, s.price_id]);
      orgId = org.rows[0].id;

      // create default queue
      await query(
        'INSERT INTO queues (organisation_id, name, is_default) VALUES ($1,$2,true) ON CONFLICT DO NOTHING',
        [orgId, 'General']
      );
    }

    // create user if needed
    const existingUser = await findUserByEmail(s.email);
    let userId;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const u = await query(
        'INSERT INTO users (email, name, password_hash) VALUES ($1,$2,$3) RETURNING id',
        [s.email.toLowerCase(), s.full_name, s.password_hash]
      );
      userId = u.rows[0].id;
    }

    // ensure membership
    await query(
      `INSERT INTO memberships (user_id, organisation_id, role)
       VALUES ($1,$2,'owner')
       ON CONFLICT (user_id, organisation_id) DO NOTHING`,
      [userId, orgId]
    );

    const token = signJwt({ userId, email: s.email });

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ ok: true, token, organisationId: orgId });
  } catch (error) {
    console.error('signup/complete error:', error);
    res.status(500).json({ error: 'Failed to complete signup' });
  }
});

// 3) webhook fallback (mounted with raw body in server.js as well)
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('webhook signature error', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const sessionId = session.id;

      const row = await query('SELECT * FROM checkout_sessions WHERE stripe_session_id = $1 LIMIT 1', [sessionId]);
      if (row.rows.length === 0) return res.json({ received: true });

      const s = row.rows[0];

      // Ensure org
      const existingOrg = await query('SELECT id FROM organisations WHERE LOWER(name) = LOWER($1) LIMIT 1', [s.org_slug]);
      let orgId;
      if (existingOrg.rows.length > 0) {
        orgId = existingOrg.rows[0].id;
      } else {
        const org = await query(`
          INSERT INTO organisations (name, stripe_customer_id, stripe_subscription_id, plan_price_id)
          VALUES ($1,$2,$3,$4) RETURNING id
        `, [s.org_slug, session.customer, session.subscription?.id || null, s.price_id]);
        orgId = org.rows[0].id;

        await query(
          'INSERT INTO queues (organisation_id, name, is_default) VALUES ($1,$2,true) ON CONFLICT DO NOTHING',
          [orgId, 'General']
        );
      }

      // Ensure user + membership
      const existingUser = await findUserByEmail(s.email);
      let userId;
      if (existingUser) {
        userId = existingUser.id;
      } else {
        const u = await query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1,$2,$3) RETURNING id',
          [s.email.toLowerCase(), s.full_name, s.password_hash]
        );
        userId = u.rows[0].id;
      }

      await query(
        `INSERT INTO memberships (user_id, organisation_id, role)
         VALUES ($1,$2,'owner')
         ON CONFLICT (user_id, organisation_id) DO NOTHING`,
        [userId, orgId]
      );
    }

    res.json({ received: true });
  } catch (e) {
    console.error('webhook handler error', e);
    res.status(500).send('Webhook handler failed');
  }
});

// -------------------- logout + me -----------
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const decoded = jwt.verify(token, JWT_SECRET);

    const userResult = await query(`
      SELECT u.id, u.email, u.name,
             m.organisation_id, m.role, o.name as org_name,
             o.plan_price_id
      FROM users u
      LEFT JOIN memberships m ON m.user_id = u.id
      LEFT JOIN organisations o ON o.id = m.organisation_id
      WHERE u.id = $1
      ORDER BY m.created_at ASC
      LIMIT 1
    `, [decoded.userId]);

    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(userResult.rows[0]);
  } catch (error) {
    console.error('me error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

/* -------------------- lightweight session check -------------------- */
router.get('/session', async (req, res) => {
  try {
    const token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const decoded = jwt.verify(token, JWT_SECRET);

    const rUser = await query('SELECT id, email, name FROM users WHERE id = $1 LIMIT 1', [decoded.userId]);
    if (rUser.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const rMem = await query(
      'SELECT organisation_id AS "orgId", role FROM memberships WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1',
      [decoded.userId]
    );

    return res.json({
      user: rUser.rows[0],
      membership: rMem.rows[0] || null
    });
  } catch (err) {
    console.error('Session check failed:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
