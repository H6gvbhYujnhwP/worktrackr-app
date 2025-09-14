// web/routes/public-auth.js
const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

// --- In-memory users for demo; replace with your DB logic when ready
const users = new Map(); // email -> { id, name, email, orgId, passwordHash }

// --- helpers
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setAuthCookie(res, payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('auth_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function validateRegister(body) {
  const errors = [];
  const name = (body?.name ?? '').trim();
  const email = (body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');
  const orgId = (body?.orgId ?? '').trim();

  if (!name) errors.push({ field: 'name', message: 'Name is required.' });

  if (!email) errors.push({ field: 'email', message: 'Email is required.' });
  else if (!emailRegex.test(email)) errors.push({ field: 'email', message: 'Email is invalid.' });

  if (!password) errors.push({ field: 'password', message: 'Password is required.' });
  else if (password.length < 8) errors.push({ field: 'password', message: 'Password must be at least 8 characters.' });

  if (!orgId) errors.push({ field: 'orgId', message: 'Organization ID is required.' });

  return { errors, data: { name, email, password, orgId } };
}

function validateLogin(body) {
  const errors = [];
  const email = (body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');

  if (!email) errors.push({ field: 'email', message: 'Email is required.' });
  else if (!emailRegex.test(email)) errors.push({ field: 'email', message: 'Email is invalid.' });

  if (!password) errors.push({ field: 'password', message: 'Password is required.' });

  return { errors, data: { email, password } };
}

// --- routes

// POST /api/public-auth/register
router.post('/register', async (req, res) => {
  const { errors, data } = validateRegister(req.body);
  if (errors.length) {
    return res.status(400).json({ ok: false, error: 'Validation failed', errors });
  }

  const { name, email, password, orgId } = data;

  if (users.has(email)) {
    return res.status(409).json({
      ok: false,
      error: 'User already exists',
      errors: [{ field: 'email', message: 'User already exists.' }],
    });
  }

  // TODO: hash password + save to DB
  const user = { id: `u_${Date.now()}`, name, email, orgId, passwordHash: password };
  users.set(email, user);

  setAuthCookie(res, { userId: user.id, email: user.email, orgId });
  return res.json({ ok: true, user: { id: user.id, name, email, orgId } });
});

// POST /api/public-auth/login
router.post('/login', async (req, res) => {
  const { errors, data } = validateLogin(req.body);
  if (errors.length) {
    return res.status(400).json({ ok: false, error: 'Validation failed', errors });
  }

  const { email, password } = data;
  const user = users.get(email);

  if (!user || user.passwordHash !== password) {
    return res.status(401).json({
      ok: false,
      error: 'Invalid credentials',
      errors: [{ field: 'password', message: 'Invalid credentials.' }],
    });
  }

  setAuthCookie(res, { userId: user.id, email: user.email, orgId: user.orgId });
  return res.json({ ok: true, user: { id: user.id, name: user.name, email, orgId: user.orgId } });
});

// POST /api/public-auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  res.json({ ok: true });
});

module.exports = router;
