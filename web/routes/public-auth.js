// web/routes/public-auth.js
// SECURITY FIX (2025-04): This route has been disabled.
// The original implementation stored users in memory (lost on restart)
// and saved passwords as plaintext strings with no hashing.
// All authentication now goes through /api/auth which uses bcrypt + PostgreSQL.

const express = require('express');
const router = express.Router();

const DISABLED_MESSAGE = 'This endpoint is disabled. Please use /api/auth/login and /api/auth/register.';

router.post('/register', (_req, res) => {
  res.status(410).json({ ok: false, error: DISABLED_MESSAGE });
});

router.post('/login', (_req, res) => {
  res.status(410).json({ ok: false, error: DISABLED_MESSAGE });
});

router.post('/logout', (_req, res) => {
  res.status(410).json({ ok: false, error: DISABLED_MESSAGE });
});

module.exports = router;
