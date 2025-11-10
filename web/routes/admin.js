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
    
    // Update organization plan
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
    console.error('Admin update plan error:', error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

module.exports = router;
