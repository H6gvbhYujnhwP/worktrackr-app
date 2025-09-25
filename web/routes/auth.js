// web/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// --- Helpers ---
function toSlug(s) {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-') // non-alphanum -> hyphen
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

function setAuthCookie(res, token) {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// --- Schemas ---
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const startSignupSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  org_slug: z.string().min(2).max(80),
  price_id: z.string().optional(),
});

// --- Routes ---
// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await req.db('users').where({ email }).first();
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    setAuthCookie(res, token);
    res.json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Signup start
router.post('/signup/start', async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    const { full_name, email, password, org_slug, price_id } = startSignupSchema.parse(req.body);
    const orgSlug = toSlug(org_slug);
    const password_hash = await bcrypt.hash(password, 10);

    const [sessionRow] = await req.db('checkout_sessions')
      .insert({
        email,
        full_name,
        org_slug: orgSlug,
        password_hash,
        price_id: price_id || process.env.PRICE_STARTER || process.env.STRIPE_PRICE_STARTER,
      })
      .returning('*');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: sessionRow.price_id, quantity: 1 }],
      success_url: `${process.env.APP_BASE_URL}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_BASE_URL}/signup?canceled=1`,
    });

    await req.db('checkout_sessions').where({ id: sessionRow.id }).update({ stripe_session_id: session.id });

    res.json({ url: session.url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Signup complete
router.post('/signup/complete', async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) return res.status(400).json({ error: 'Missing session_id' });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const record = await req.db('checkout_sessions').where({ stripe_session_id: session.id }).first();
    if (!record) return res.status(400).json({ error: 'Session not found' });

    // Provision org/user if not already done
    const existing = await req.db('users').where({ email: record.email }).first();
    let user = existing;
    if (!user) {
      const [org] = await req.db('orgs').insert({ slug: record.org_slug, name: record.full_name }).returning('*');
      const [newUser] = await req.db('users').insert({
        email: record.email,
        full_name: record.full_name,
        password_hash: record.password_hash,
      }).returning('*');
      await req.db('memberships').insert({ user_id: newUser.id, org_id: org.id, role: 'owner' });
      user = newUser;
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    res.json({ ok: true, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Stripe webhook
router.post('/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const record = await req.db('checkout_sessions').where({ stripe_session_id: session.id }).first();
    if (record) {
      const existing = await req.db('users').where({ email: record.email }).first();
      if (!existing) {
        const [org] = await req.db('orgs').insert({ slug: record.org_slug, name: record.full_name }).returning('*');
        const [user] = await req.db('users').insert({
          email: record.email,
          full_name: record.full_name,
          password_hash: record.password_hash,
        }).returning('*');
        await req.db('memberships').insert({ user_id: user.id, org_id: org.id, role: 'owner' });
      }
    }
  }

  res.json({ received: true });
});

// Session check
router.get('/session', async (req, res) => {
  try {
    const token = req.cookies.auth_token;
    if (!token) return res.json({ user: null });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await req.db('users').where({ id: decoded.id }).first();
    res.json({ user });
  } catch {
    res.json({ user: null });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ ok: true });
});

module.exports = router;
