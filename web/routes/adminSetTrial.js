const express = require('express');
const router = express.Router();
const { query } = require('@worktrackr/shared/db');

// Admin endpoint to set trial dates for an organization
// POST /api/admin/set-trial
// Body: { email: "user@example.com", days: 14 }
router.post('/set-trial', async (req, res) => {
  try {
    const { email, days = 14, adminKey } = req.body;
    
    // Check admin key
    const expectedKey = process.env.ADMIN_API_KEY || 'worktrackr-admin-2025';
    if (adminKey !== expectedKey) {
      console.log('❌ Invalid admin key provided');
      return res.status(403).json({ error: 'Invalid admin key' });
    }
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    console.log(`🔧 Admin: Setting ${days}-day trial for user ${email}`);
    
    // Find user and their organization
    const userResult = await query(`
      SELECT u.id, u.email, m.organisation_id
      FROM users u
      JOIN memberships m ON u.id = m.user_id
      WHERE u.email = $1
      LIMIT 1
    `, [email.toLowerCase()]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { organisation_id } = userResult.rows[0];
    
    // Calculate trial dates
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + days);
    
    // Update organization with trial dates
    await query(`
      UPDATE organisations
      SET trial_start = $1, trial_end = $2
      WHERE id = $3
    `, [trialStart, trialEnd, organisation_id]);
    
    console.log(`✅ Admin: Set trial for org ${organisation_id}: ${trialStart.toISOString()} to ${trialEnd.toISOString()}`);
    
    res.json({
      success: true,
      message: `Trial set for ${email}`,
      organisationId: organisation_id,
      trialStart: trialStart.toISOString(),
      trialEnd: trialEnd.toISOString(),
      daysRemaining: days
    });
    
  } catch (error) {
    console.error('❌ Admin: Error setting trial:', error);
    res.status(500).json({ error: 'Failed to set trial dates' });
  }
});

module.exports = router;
