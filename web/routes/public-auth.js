// web/routes/public-auth.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Helpers
 */
async function findUserByEmail(client, email) {
  const { rows } = await client.query(
    'SELECT id, email, password_hash FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

async function createOrgWithAdmin(client, { orgName, name, email, password }) {
  // create org
  const orgRes = await client.query(
    `INSERT INTO organisations (name) VALUES ($1) RETURNING id`,
    [orgName]
  );
  const organisationId = orgRes.rows[0].id;

  // create user
  const passwordHash = await bcrypt.hash(password, 12);
  const userRes = await client.query(
    `INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, email, name`,
    [name, email, passwordHash]
  );
  const userId = userRes.rows[0].id;

  // membership: admin
  await client.query(
    `INSERT INTO memberships (user_id, organisation_id, role) VALUES ($1,$2,'admin')`,
    [userId, organisationId]
  );

  return { userId, organisationId, user: userRes.rows[0] };
}

function issueJwt(res, user) {
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
  // httpOnly session cookie
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: true,          // production over HTTPS
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

/**
 * POST /api/public-auth/register
 * body: { name, email, password, organisationName }
 */
router.post('/register', async (req, res) => {
  const { name, email, password, organisationName } = req.body || {};
  if (!name || !email || !password || !organisationName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await findUserByEmail(client, email);
    if (existing) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email already registered' });
    }

    const { userId, organisationId, user } = await createOrgWithAdmin(client, {
      orgName: organisationName,
      name,
      email,
      password,
    });

    await client.query('COMMIT');

    issueJwt(res, { id: userId, email: user.email });

    return res.status(201).json({
      user: { id: userId, email: user.email, name: user.name },
      organisation: { id: organisationId, name: organisationName },
      message: 'Registration successful',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/public-auth/login
 * body: { email, password }
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email/password' });
  }

  const client = await pool.connect();
  try {
    const user = await findUserByEmail(client, email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    issueJwt(res, { id: user.id, email: user.email });

    // fetch their latest org (simple: last membership)
    const { rows } = await client.query(
      `SELECT organisation_id AS id
         FROM memberships
        WHERE user_id = $1
        ORDER BY created_at DESC NULLS LAST
        LIMIT 1`,
      [user.id]
    );

    return res.json({
      user: { id: user.id, email: user.email },
      organisation: rows[0] ? { id: rows[0].id } : null,
      message: 'Login successful',
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  } finally {
    client.release();
  }
});

module.exports = router;
