const express = require('express');
const router = express.Router();
const { query } = require('../../shared/db');

// Plan configurations
const PLAN_CONFIGS = {
  starter: {
    name: 'Starter',
    maxUsers: 1,
    includedSeats: 1,
    price: 49
  },
  pro: {
    name: 'Pro',
    maxUsers: 10,
    includedSeats: 10,
    price: 99
  },
  enterprise: {
    name: 'Enterprise',
    maxUsers: 50,
    includedSeats: 50,
    price: 299
  }
};

// Admin endpoint to update organization plan (bypass Stripe for testing)
router.post('/update-plan', async (req, res) => {
  try {
    const { email, plan, adminKey } = req.body;
    
    // Check admin key (for testing/development)
    const expectedKey = process.env.ADMIN_API_KEY || 'worktrackr-admin-2025';
    if (adminKey !== expectedKey) {
      console.log('❌ Invalid admin key provided');
      return res.status(403).json({ error: 'Invalid admin key' });
    }
    
    // Validate input
    if (!email || !plan) {
      return res.status(400).json({ error: 'Email and plan are required' });
    }
    
    if (!['starter', 'pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be starter, pro, or enterprise' });
    }
    
    console.log(`🔧 Admin: Updating ${email} to ${plan} plan`);
    
    // Find user and organization
    const userResult = await query(
      'SELECT u.id, u.email FROM users u WHERE u.email = $1',
      [email.toLowerCase()]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;
    
    // Find organization through membership
    const orgResult = await query(
      'SELECT o.id, o.name FROM organisations o JOIN memberships m ON o.id = m.organisation_id WHERE m.user_id = $1',
      [userId]
    );
    
    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found for user' });
    }
    
    const orgId = orgResult.rows[0].id;
    const orgName = orgResult.rows[0].name;
    
    // Get plan details
    const planConfig = PLAN_CONFIGS[plan];
    const includedSeats = planConfig.includedSeats;
    
    // Update organization plan (use plan column name)
    await query(
      'UPDATE organisations SET plan = $1, included_seats = $2, updated_at = NOW() WHERE id = $3',
      [plan, includedSeats, orgId]
    );
    
    console.log(`✅ Updated ${orgName} (${orgId}) to ${plan} plan with ${includedSeats} seats`);
    
    res.json({
      success: true,
      message: `Organization updated to ${plan} plan`,
      organization: {
        id: orgId,
        name: orgName,
        plan: plan,
        includedSeats: includedSeats
      }
    });
    
  } catch (error) {
    console.error('❌ Admin update plan error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to update plan',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test endpoint to verify database connection
router.get('/test', async (req, res) => {
  try {
    const result = await query('SELECT NOW() as current_time');
    res.json({ success: true, time: result.rows[0].current_time });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check organisations table schema
router.get('/check-schema', async (req, res) => {
  try {
    const result = await query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'organisations'
      ORDER BY ordinal_position
    `);
    res.json({ columns: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Migration endpoint to add missing columns to organisations table
router.post('/migrate-organisations', async (req, res) => {
  try {
    const { adminKey } = req.body;
    
    // Check admin key
    const expectedKey = process.env.ADMIN_API_KEY || 'worktrackr-admin-2025';
    if (adminKey !== expectedKey) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }
    
    console.log('🔧 Running organisations table migration...');
    
    // Add plan column if it doesn't exist
    await query(`
      ALTER TABLE organisations 
      ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'pro' 
      CHECK (plan IN ('individual', 'starter', 'pro', 'enterprise'))
    `);
    
    // Add included_seats column if it doesn't exist
    await query(`
      ALTER TABLE organisations 
      ADD COLUMN IF NOT EXISTS included_seats INTEGER DEFAULT 10
    `);
    
    // Add other Phase 2 columns if they don't exist
    await query(`
      ALTER TABLE organisations 
      ADD COLUMN IF NOT EXISTS stripe_seat_item_id TEXT
    `);
    
    await query(`
      ALTER TABLE organisations 
      ADD COLUMN IF NOT EXISTS active_user_count INTEGER DEFAULT 0
    `);
    
    await query(`
      ALTER TABLE organisations 
      ADD COLUMN IF NOT EXISTS seat_overage_cached INTEGER DEFAULT 0
    `);
    
    console.log('✅ Migration completed successfully');
    
    res.json({ 
      success: true, 
      message: 'Organisations table migrated successfully'
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({ 
      error: 'Migration failed',
      details: error.message
    });
  }
});

module.exports = router;
