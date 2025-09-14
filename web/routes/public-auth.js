// web/routes/public-auth.js
const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Dummy in-memory users for demo; replace with your DB logic.
const users = new Map(); // key: email -> { id, orgId, name, passwordHash }

// Helper to issue cookie
function setAuthCookie(res, payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('auth_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

router.post('/register', async (req, res) => {
  const { name, email, password, orgId } = req.body || {};
  if (!name || !email || !password || !orgId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (users.has(email)) {
    return res.status(409).json({ error: 'User already exists' });
  }

  // TODO: save to DB and hash password
  const user = { id: `u_${Date.now()}`, name, email, orgId, passwordHash: password };
  users.set(email, user);

  setAuthCookie(res, { userId: user.id, email: user.email, orgId });
  res.json({ ok: true, user: { id: user.id, name, email, orgId } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

  const user = users.get(email);
  if (!user || user.passwordHash !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  setAuthCookie(res, { userId: user.id, email: user.email, orgId: user.orgId });
  res.json({ ok: true, user: { id: user.id, name: user.name, email, orgId: user.orgId } });
});

router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ ok: true });
});

module.exports = router;
