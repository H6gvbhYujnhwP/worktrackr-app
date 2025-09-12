const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { query } = require('@worktrackr/shared/db');

const router = express.Router();

// Validation schemas
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

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const userResult = await query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check memberships
    const membershipResult = await query(`
      SELECT m.organisation_id, m.role, o.name as org_name,
             pm.partner_id, pm.role as partner_role
      FROM users u
      LEFT JOIN memberships m ON u.id = m.user_id
      LEFT JOIN organisations o ON m.organisation_id = o.id
      LEFT JOIN partner_memberships pm ON u.id = pm.user_id
      WHERE u.id = $1
    `, [user.id]);

    const memberships = membershipResult.rows;
    
    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        name: user.name 
      },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      memberships,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, name, password, organizationName } = registerSchema.parse(req.body);

    // Check if user exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user and organization in transaction
    const { transaction } = require('@worktrackr/shared/db');
    
    const result = await transaction(async (client) => {
      // Create user
      const userResult = await client.query(
        'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name',
        [email.toLowerCase(), name, passwordHash]
      );
      const user = userResult.rows[0];

      let organization = null;
      if (organizationName) {
        // Create organization
        const orgResult = await client.query(
          'INSERT INTO organisations (name) VALUES ($1) RETURNING id, name',
          [organizationName]
        );
        organization = orgResult.rows[0];

        // Create membership
        await client.query(
          'INSERT INTO memberships (organisation_id, user_id, role) VALUES ($1, $2, $3)',
          [organization.id, user.id, 'admin']
        );

        // Create default queue
        await client.query(
          'INSERT INTO queues (organisation_id, name, is_default) VALUES ($1, $2, $3)',
          [organization.id, 'General', true]
        );

        // Create default branding
        await client.query(
          'INSERT INTO org_branding (organisation_id, product_name, email_from_name) VALUES ($1, $2, $3)',
          [organization.id, `${organizationName} Support`, `${organizationName} Support`]
        );
      }

      return { user, organization };
    });

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: result.user.id, 
        email: result.user.email, 
        name: result.user.name 
      },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      user: result.user,
      organization: result.organization,
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    
    // Get user with memberships
    const userResult = await query(`
      SELECT u.id, u.email, u.name,
             m.organisation_id, m.role, o.name as org_name,
             pm.partner_id, pm.role as partner_role
      FROM users u
      LEFT JOIN memberships m ON u.id = m.user_id
      LEFT JOIN organisations o ON m.organisation_id = o.id
      LEFT JOIN partner_memberships pm ON u.id = pm.user_id
      WHERE u.id = $1
    `, [decoded.userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const memberships = userResult.rows;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      memberships
    });

  } catch (error) {
    console.error('Auth check error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;

