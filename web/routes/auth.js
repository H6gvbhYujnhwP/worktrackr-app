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
    console.log('🔐 Login attempt started for:', req.body.email);
    const { email, password } = loginSchema.parse(req.body);
    const user = await findUserByEmail(email);
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.log('✅ User found:', user.email);
    
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      console.log('❌ Password mismatch for:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.log('✅ Password verified for:', email);

    // Check if user has MFA enabled
    if (user.mfa_enabled) {
      console.log('🔐 MFA required for user:', email);
      
      // Generate MFA challenge
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const crypto = require('crypto');
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      
      // Store challenge with 10 minute expiry
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      const challengeResult = await query(`
        INSERT INTO mfa_challenges (user_id, code_hash, expires_at)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [user.id, codeHash, expiresAt]);
      
      const challengeId = challengeResult.rows[0].id;
      
      // Send email or log for testing
      if (process.env.SMTP_HOST) {
        // TODO: Send actual email when SMTP is configured
        console.log(`📧 MFA code email would be sent to ${email}`);
        console.log(`🔢 MFA Code: [REDACTED]`);
      } else {
        // Log for testing
        console.log(`🔢 MFA code created for ${email}`);
        console.log(`🔑 MFA Code (DEV ONLY): ${code}`);
      }
      
      // Return MFA challenge (do not set cookie yet)
      return res.json({
        requires_mfa: true,
        challenge_id: challengeId,
        message: 'MFA code sent to your email address'
      });
    }

    // Regular login flow (no MFA)
    console.log('👥 Fetching membership for user:', user.id);
    const m = await query(
      'SELECT organisation_id AS "orgId", role FROM memberships WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1',
      [user.id]
    );
    console.log('✅ Membership found:', m.rows[0]);

    console.log('🔑 Generating JWT token...');
    const token = signJwt({ userId: user.id, email: user.email });
    console.log('✅ JWT token generated, length:', token.length);
    
    console.log('🍪 Setting auth cookie...');
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    };
    
    console.log('🔧 Cookie settings:', cookieOptions);
    
    // Set cookie immediately after token generation
    res.cookie('auth_token', token, cookieOptions);
    console.log('✅ Auth cookie set successfully');

    // Send response immediately after cookie is set
    console.log('🎉 Login successful for:', email);
    return res.json({ 
      user: { id: user.id, email: user.email, name: user.name }, 
      membership: m.rows[0] || null 
    });
  } catch (error) {
    console.error('💥 Login error:', error);
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
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    };
    
    res.cookie('auth_token', token, cookieOptions);

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

    // Phase 2: Support all plan types including Individual
    const priceId = price_id || process.env.PRICE_STARTER_BASE || process.env.PRICE_STARTER;
    if (!priceId) return res.status(400).json({ error: 'Price ID not configured' });

    // Validate that this is a valid base plan price
    const validBasePrices = [
      process.env.PRICE_INDIVIDUAL_BASE,
      process.env.PRICE_STARTER_BASE,
      process.env.PRICE_PRO_BASE,
      process.env.PRICE_ENTERPRISE_BASE
    ].filter(Boolean);
    
    if (!validBasePrices.includes(priceId)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const existing = await findUserByEmail(email);
    const password_hash = await bcrypt.hash(password, 10);

    // Phase 2: Create line items for base plan + initial seat add-on (quantity 0)
    const lineItems = [
      { price: priceId, quantity: 1 } // Base plan
    ];
    
    // Add seat add-on with quantity 0 (will be adjusted after provisioning)
    if (process.env.PRICE_SEAT_ADDON) {
      lineItems.push({ 
        price: process.env.PRICE_SEAT_ADDON, 
        quantity: 0 
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: lineItems,
      allow_promotion_codes: true,
      success_url: `${APP_BASE_URL}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_BASE_URL}/signup?canceled=1`,
      customer_creation: 'if_required',
      metadata: { 
        email, 
        full_name, 
        org_slug: toSlug(org_slug), 
        existing_user: existing ? '1' : '0',
        plan_price_id: priceId // Phase 2: Store selected plan
      }
    });

    await query(`
      INSERT INTO checkout_sessions (stripe_session_id, email, full_name, org_slug, password_hash, price_id)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (stripe_session_id) DO NOTHING
    `, [session.id, email, full_name, toSlug(org_slug), password_hash, priceId]);

    console.log(`🚀 Created checkout session for ${email} with plan ${priceId}`);
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

    // Phase 2: Import plan utilities
    const { planFromPriceId, PLAN_INCLUDED } = require('../shared/plans.js');
    const { initializeSeatTracking } = require('../shared/stripeSeats.js');

    // Determine plan from price ID (Phase 2)
    const selectedPlan = planFromPriceId(s.price_id, process.env) || 'starter';
    const includedSeats = PLAN_INCLUDED[selectedPlan] || 5;

    // idempotency: if org exists, just log in the user
    const existingOrg = await query('SELECT id FROM organisations WHERE LOWER(name) = LOWER($1) LIMIT 1', [s.org_slug]);
    let orgId;
    if (existingOrg.rows.length > 0) {
      orgId = existingOrg.rows[0].id;
      
      // Update existing org with new subscription data (Phase 2)
      await query(`
        UPDATE organisations 
        SET stripe_customer_id = $1, 
            stripe_subscription_id = $2, 
            plan_price_id = $3,
            plan = $4,
            included_seats = $5
        WHERE id = $6
      `, [session.customer, session.subscription?.id || null, s.price_id, selectedPlan, includedSeats, orgId]);
    } else {
      // Create new organization with Phase 2 fields
      const org = await query(`
        INSERT INTO organisations (
          name, stripe_customer_id, stripe_subscription_id, plan_price_id,
          plan, included_seats, active_user_count
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
      `, [s.org_slug, session.customer, session.subscription?.id || null, s.price_id, selectedPlan, includedSeats, 0]);
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
      `INSERT INTO memberships (user_id, organisation_id, role, status)
       VALUES ($1,$2,'owner','active')
       ON CONFLICT (user_id, organisation_id) DO UPDATE SET status = 'active'`,
      [userId, orgId]
    );

    // Phase 2: Initialize seat tracking after user/org creation
    if (session.subscription?.id) {
      try {
        const orgData = await query(`
          SELECT id, plan, included_seats, stripe_subscription_id, stripe_seat_item_id
          FROM organisations WHERE id = $1
        `, [orgId]);
        
        if (orgData.rows.length > 0) {
          await initializeSeatTracking(stripe, orgData.rows[0], session.subscription.id);
          console.log(`✅ Initialized seat tracking for org ${orgId}`);
        }
      } catch (seatError) {
        console.error('❌ Error initializing seat tracking:', seatError);
        // Don't fail the signup for seat tracking errors
      }
    }

    const token = signJwt({ userId, email: s.email });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    };
    
    res.cookie('auth_token', token, cookieOptions);

    console.log(`✅ Signup completed for ${s.email} with plan ${selectedPlan}`);
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
    // Phase 2: Import plan utilities for webhooks
    const { planFromPriceId, PLAN_INCLUDED } = require('../shared/plans.js');
    const { initializeSeatTracking, syncSeatsForOrg } = require('../shared/stripeSeats.js');

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const sessionId = session.id;

      const row = await query('SELECT * FROM checkout_sessions WHERE stripe_session_id = $1 LIMIT 1', [sessionId]);
      if (row.rows.length === 0) return res.json({ received: true });

      const s = row.rows[0];

      // Phase 2: Determine plan from price ID
      const selectedPlan = planFromPriceId(s.price_id, process.env) || 'starter';
      const includedSeats = PLAN_INCLUDED[selectedPlan] || 5;

      // Ensure org with Phase 2 fields
      const existingOrg = await query('SELECT id FROM organisations WHERE LOWER(name) = LOWER($1) LIMIT 1', [s.org_slug]);
      let orgId;
      if (existingOrg.rows.length > 0) {
        orgId = existingOrg.rows[0].id;
        
        // Update existing org with subscription data
        await query(`
          UPDATE organisations 
          SET stripe_customer_id = $1, 
              stripe_subscription_id = $2, 
              plan_price_id = $3,
              plan = $4,
              included_seats = $5
          WHERE id = $6
        `, [session.customer, session.subscription?.id || null, s.price_id, selectedPlan, includedSeats, orgId]);
      } else {
        const org = await query(`
          INSERT INTO organisations (
            name, stripe_customer_id, stripe_subscription_id, plan_price_id,
            plan, included_seats, active_user_count
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
        `, [s.org_slug, session.customer, session.subscription?.id || null, s.price_id, selectedPlan, includedSeats, 0]);
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
        `INSERT INTO memberships (user_id, organisation_id, role, status)
         VALUES ($1,$2,'owner','active')
         ON CONFLICT (user_id, organisation_id) DO UPDATE SET status = 'active'`,
        [userId, orgId]
      );

      // Phase 2: Initialize seat tracking after webhook provisioning
      if (session.subscription?.id) {
        try {
          const orgData = await query(`
            SELECT id, plan, included_seats, stripe_subscription_id, stripe_seat_item_id
            FROM organisations WHERE id = $1
          `, [orgId]);
          
          if (orgData.rows.length > 0) {
            await initializeSeatTracking(stripe, orgData.rows[0], session.subscription.id);
            console.log(`✅ Webhook: Initialized seat tracking for org ${orgId}`);
          }
        } catch (seatError) {
          console.error('❌ Webhook: Error initializing seat tracking:', seatError);
        }
      }
    }

    // Phase 2: Handle subscription update events
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      
      // Find organization by subscription ID
      const orgResult = await query(
        'SELECT id FROM organisations WHERE stripe_subscription_id = $1',
        [subscription.id]
      );
      
      if (orgResult.rows.length > 0) {
        const orgId = orgResult.rows[0].id;
        await syncSeatsForOrg(stripe, orgId);
        console.log(`✅ Webhook: Synced seats for org ${orgId} after subscription update`);
      }
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

/* -------------------- Password Reset -------------------- */

// POST /api/auth/password/forgot
router.post('/password/forgot', async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    
    // Always return 200 for security (don't reveal if email exists)
    const user = await findUserByEmail(email);
    
    if (user) {
      // Generate secure token
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      // Store token hash with 1 hour expiry
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      await query(`
        INSERT INTO password_resets (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
      `, [user.id, tokenHash, expiresAt]);
      
      // Send email or log for testing
      const resetUrl = `${APP_BASE_URL}/reset-password?token=${token}`;
      
      if (process.env.SMTP_HOST) {
        // TODO: Send actual email when SMTP is configured
        console.log(`📧 Password reset email would be sent to ${email}`);
        console.log(`🔗 Reset URL: ${resetUrl}`);
      } else {
        // Log for testing (with redacted token for security)
        console.log(`🔗 Password reset token created for ${email}`);
        console.log(`🔗 Reset URL: ${APP_BASE_URL}/reset-password?token=[REDACTED]`);
        console.log(`🔑 Full reset URL (DEV ONLY): ${resetUrl}`);
      }
    }
    
    // Always return success message
    res.json({ 
      message: "If that email exists in our system, we've sent a password reset link." 
    });
    
  } catch (error) {
    console.error('Password forgot error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// POST /api/auth/password/reset
router.post('/password/reset', async (req, res) => {
  try {
    const { token, new_password } = z.object({
      token: z.string().min(1),
      new_password: z.string().min(8)
    }).parse(req.body);
    
    // Hash the token to compare with stored hash
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find valid, unused token
    const resetResult = await query(`
      SELECT pr.id, pr.user_id, pr.used_at, pr.expires_at, u.email
      FROM password_resets pr
      JOIN users u ON u.id = pr.user_id
      WHERE pr.token_hash = $1
        AND pr.expires_at > NOW()
        AND pr.used_at IS NULL
      ORDER BY pr.created_at DESC
      LIMIT 1
    `, [tokenHash]);
    
    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    const resetRecord = resetResult.rows[0];
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(new_password, 10);
    
    // Update user password and mark token as used
    await transaction(async (client) => {
      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, resetRecord.user_id]
      );
      
      // Mark token as used
      await client.query(
        'UPDATE password_resets SET used_at = NOW() WHERE id = $1',
        [resetRecord.id]
      );
      
      // Optional: Revoke other active reset tokens for this user
      await client.query(
        'UPDATE password_resets SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL AND id != $2',
        [resetRecord.user_id, resetRecord.id]
      );
    });
    
    console.log(`✅ Password reset successful for user: ${resetRecord.email}`);
    
    res.json({ message: 'Password reset successful. You can now log in with your new password.' });
    
  } catch (error) {
    console.error('Password reset error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: error.errors 
      });
    }
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/* -------------------- Basic 2FA (Email Codes) -------------------- */

// POST /api/auth/mfa/start
router.post('/mfa/start', async (req, res) => {
  try {
    const { user_id } = z.object({ user_id: z.string().uuid() }).parse(req.body);
    
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const crypto = require('crypto');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    
    // Store challenge with 10 minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    const result = await query(`
      INSERT INTO mfa_challenges (user_id, code_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [user_id, codeHash, expiresAt]);
    
    const challengeId = result.rows[0].id;
    
    // Get user email for logging/sending
    const userResult = await query('SELECT email FROM users WHERE id = $1', [user_id]);
    const userEmail = userResult.rows[0]?.email;
    
    // Send email or log for testing
    if (process.env.SMTP_HOST) {
      // TODO: Send actual email when SMTP is configured
      console.log(`📧 MFA code email would be sent to ${userEmail}`);
      console.log(`🔢 MFA Code: [REDACTED]`);
    } else {
      // Log for testing
      console.log(`🔢 MFA code created for ${userEmail}`);
      console.log(`🔑 MFA Code (DEV ONLY): ${code}`);
    }
    
    res.json({ 
      challenge_id: challengeId,
      message: 'MFA code sent to your email address'
    });
    
  } catch (error) {
    console.error('MFA start error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    res.status(500).json({ error: 'Failed to start MFA challenge' });
  }
});

// POST /api/auth/mfa/verify
router.post('/mfa/verify', async (req, res) => {
  try {
    const { challenge_id, code } = z.object({
      challenge_id: z.string().uuid(),
      code: z.string().length(6)
    }).parse(req.body);
    
    // Hash the provided code
    const crypto = require('crypto');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    
    // Find valid challenge
    const challengeResult = await query(`
      SELECT mc.id, mc.user_id, mc.attempts, mc.max_attempts, mc.used_at, mc.expires_at,
             u.email, u.name
      FROM mfa_challenges mc
      JOIN users u ON u.id = mc.user_id
      WHERE mc.id = $1
        AND mc.code_hash = $2
        AND mc.expires_at > NOW()
        AND mc.used_at IS NULL
    `, [challenge_id, codeHash]);
    
    if (challengeResult.rows.length === 0) {
      // Increment attempts for failed verification
      await query(`
        UPDATE mfa_challenges 
        SET attempts = attempts + 1 
        WHERE id = $1 AND attempts < max_attempts
      `, [challenge_id]);
      
      return res.status(400).json({ error: 'Invalid or expired MFA code' });
    }
    
    const challenge = challengeResult.rows[0];
    
    // Check if too many attempts
    if (challenge.attempts >= challenge.max_attempts) {
      return res.status(429).json({ error: 'Too many failed attempts. Please request a new code.' });
    }
    
    // Mark challenge as used
    await query(`
      UPDATE mfa_challenges 
      SET used_at = NOW() 
      WHERE id = $1
    `, [challenge.id]);
    
    // Get membership data
    const membershipResult = await query(
      'SELECT organisation_id AS "orgId", role FROM memberships WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1',
      [challenge.user_id]
    );
    
    // Generate JWT and set cookie
    const token = signJwt({ userId: challenge.user_id, email: challenge.email });
    
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    };
    
    res.cookie('auth_token', token, cookieOptions);
    
    console.log(`✅ MFA verification successful for user: ${challenge.email}`);
    
    res.json({
      user: { id: challenge.user_id, email: challenge.email, name: challenge.name },
      membership: membershipResult.rows[0] || null
    });
    
  } catch (error) {
    console.error('MFA verify error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: error.errors 
      });
    }
    res.status(500).json({ error: 'Failed to verify MFA code' });
  }
});

module.exports = router;
