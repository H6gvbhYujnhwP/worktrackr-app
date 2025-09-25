// web/routes/auth.js
// Authentication & signup flow for WorkTrackr Cloud

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // pure-JS, Render-friendly
const { z } = require('zod');
const router = express.Router();

// Stripe (only initialized if a key is present)
const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecret ? require('stripe')(stripeSecret) : null;

/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */

function toSlug(s) {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-') // non-alphanum → hyphen
    .replace(/^-+|-+$/g, '')     // trim leading/trailing hyphens
    .slice(0, 60);               // keep slugs short/reasonable
}

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function setAuthCookie(res, token) {
  // Cookie name defined by the handover
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: true,       // assumes HTTPS (Render prod)
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

/* -------------------------------------------------------------------------- */
/* Validation Schemas                                                         */
/* -------------------------------------------------------------------------- */

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Internal/backoffice register (not used by public flow)
const registerSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2),
  password: z.string().min(8),
  org_slug: z.string().min(2),
  org_name: z.string().min(2).optional(),
  role: z.enum(['owner', 'admin', 'member']).default('owner'),
});

const startSignupSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  // Accept friendly input; we’ll slugify before DB write
  org_slug: z.string().min(2).max(80),
  price_id: z.string().optional(),
});

const completeSchema = z.object({
  session_id: z.string().min(10),
});

/* -------------------------------------------------------------------------- */
/* Helpers: DB                                                                */
/* -------------------------------------------------------------------------- */

// These helpers assume `req.db` is a Knex instance injected by server.js.

async function findUserByEmail(db, email) {
  return db('users').where({ email }).first();
}

async function createOrgWithOwner(db, { orgSlug, orgName, email, fullName, passwordHash }) {
  // Create org
  const [org] = await db('orgs')
    .insert({ slug: orgSlug, name: orgName || fullName })
    .returning('*');

  // Create user
  const [user] = await db('users')
    .insert({
      email,
      full_name: fullName,
      password_hash: passwordHash,
    })
    .returning('*');

  // Create membership (owner by default)
  await db('memberships').insert({
    user_id: user.id,
    org_id: org.id,
    role: 'owner',
  });

  return { org, user };
}

async function defaultMembershipForUser(db, userId) {
  // Return the first membership (or you can order by created_at desc)
  return db('memberships').where({ user_id: userId }).first();
}

/* -------------------------------------------------------------------------- */
/* Routes                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * POST /api/auth/login
 * Existing customers sign in.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await findUserByEmail(req.db, email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    setAuthCookie(res, token);

    const membership = await defaultMembershipForUser(req.db, user.id);
    return res.json({ user, membership });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Bad request' });
  }
});

/**
 * POST /api/auth/register
 * Internal/backoffice registration (not used by public flow).
 */
router.post('/register', async (req, res) => {
  try {
    const { email, full_name, password, org_slug, org_name, role } = registerSchema.parse(req.body);
    const existing = await findUserByEmail(req.db, email);
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    const orgSlug = toSlug(org_slug);
    const orgName = org_name || full_name;

    const { user } = await createOrgWithOwner(req.db, {
      orgSlug,
      orgName,
      email,
      fullName: full_name,
      passwordHash: password_hash,
    });

    // If role !== owner, adjust membership
    if (role !== 'owner') {
      const org = await req.db('orgs').where({ slug: orgSlug }).first();
      await req.db('memberships')
        .where({ user_id: user.id, org_id: org.id })
        .update({ role });
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    const membership = await defaultMembershipForUser(req.db, user.id);
    return res.json({ user, membership });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Bad request' });
  }
});

/**
 * POST /api/auth/signup/start
 * Public flow: creates a Stripe Checkout session and stores context.
 */
router.post('/signup/start', async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

    const { full_name, email, password, org_slug, price_id } = startSignupSchema.parse(req.body);
    const orgSlug = toSlug(org_slug);
    const password_hash = await bcrypt.hash(password, 10);

    // Determine the price to use (client-provided > PRICE_STARTER > STRIPE_PRICE_STARTER)
    const chosenPriceId =
      price_id ||
      process.env.PRICE_STARTER ||
      process.env.STRIPE_PRICE_STARTER;

    if (!chosenPriceId) {
      return res.status(400).json({ error: 'Price ID not configured' });
    }

    // Persist a pending checkout session record
    const [row] = await req.db('checkout_sessions')
      .insert({
        email,
        full_name,
        org_slug: orgSlug,
        password_hash,
        price_id: chosenPriceId,
      })
      .returning('*');

    const appBase = process.env.APP_BASE_URL || '';
    if (!appBase) {
      return res.status(500).json({ error: 'APP_BASE_URL not configured' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: chosenPriceId, quantity: 1 }],
      success_url: `${appBase}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBase}/signup?canceled=1`,
    });

    // Link Stripe session id to our record
    await req.db('checkout_sessions')
      .where({ id: row.id })
      .update({ stripe_session_id: session.id });

    return res.json({ url: session.url });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Failed to start checkout' });
  }
});

/**
 * POST /api/auth/signup/complete?session_id=...
 * Called from /welcome page after Stripe redirects back (optional — webhook is the fallback).
 */
router.post('/signup/complete', async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

    const { session_id } = completeSchema.parse({ session_id: req.query.session_id });
    const session = await stripe.checkout.sessions.retrieve(session_id);

    const record = await req.db('checkout_sessions')
      .where({ stripe_session_id: session.id })
      .first();

    if (!record) return res.status(400).json({ error: 'Session not found' });

    // Provision only if not yet provisioned
    let user = await findUserByEmail(req.db, record.email);
    if (!user) {
      const { user: created } = await createOrgWithOwner(req.db, {
        orgSlug: record.org_slug,
        orgName: record.full_name, // You can replace with a separate org name field if available
        email: record.email,
        fullName: record.full_name,
        passwordHash: record.password_hash,
      });
      user = created;
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    const membership = await defaultMembershipForUser(req.db, user.id);
    return res.json({ ok: true, user, membership });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Failed to complete signup' });
  }
});

/**
 * POST /api/auth/stripe/webhook
 * Must be mounted BEFORE express.json() in server.js to preserve raw body.
 * server.js should assign `req.rawBody` for this route.
 */
router.post('/stripe/webhook', async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    if (!webhookSecret) return res.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET not configured' });

    let event;
    try {
      // IMPORTANT: req.rawBody is set in server.js via a raw body parser for this path
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Look up our stored context for this checkout
      const record = await req.db('checkout_sessions')
        .where({ stripe_session_id: session.id })
        .first();

      if (record) {
        const existingUser = await findUserByEmail(req.db, record.email);
        if (!existingUser) {
          await createOrgWithOwner(req.db, {
            orgSlug: record.org_slug,
            orgName: record.full_name,
            email: record.email,
            fullName: record.full_name,
            passwordHash: record.password_hash,
          });
        }
      }
    }

    return res.json({ received: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Webhook handler failed' });
  }
});

/**
 * GET /api/auth/session
 * Quick “am I logged in?” for the SPA.
 */
router.get('/session', async (req, res) => {
  try {
    const token = req.cookies?.auth_token;
    if (!token) return res.json({ user: null, membership: null });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await req.db('users').where({ id: decoded.id }).first();
    if (!user) return res.json({ user: null, membership: null });

    const membership = await defaultMembershipForUser(req.db, user.id);
    return res.json({ user, membership });
  } catch {
    return res.json({ user: null, membership: null });
  }
});

/**
 * POST /api/auth/logout
 * Clears auth cookie.
 */
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', { path: '/' });
  return res.json({ ok: true });
});

module.exports = router;
