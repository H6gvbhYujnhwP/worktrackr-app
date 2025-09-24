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
  org_slug: z.string().min(3).max(50).regex(/^[a-z][a-z0-9-]+$/i),
  price_id: z.string().optional() // defaults to STRIPE_PRICE_STARTER
});

// -------------------- Option A: existing customer login --------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // get first membership (for org context)
    const membershipResult = await query(`
      SELECT m.organisation_id, m.role, o.name as org_name,
             pm.partner_id, pm.role as partner_role
      FROM users u
      LEFT JOIN memberships m ON u.id = m.user_id
      LEFT JOIN organisations o ON m.organisation_id = o.id
      LEFT JOIN partner_memberships pm ON u.id = pm.user_id
      WHERE u.id = $1
      ORDER BY m.created_at ASC
    `, [user.id]);

    const token = signJwt({ userId: user.id, email: user.email, name: user.name });

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      memberships: membershipResult.rows,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', details: error.errors });
    res.status(500).json({ error: 'Login failed' });
  }
});

// -------------------- Option A: register (kept for admin/backoffice) --------------------
router.post('/register', async (req, res) => {
