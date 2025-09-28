const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../../shared/db.js');
const { authenticateToken } = require('./auth.js');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await query(
      'SELECT id, email, full_name, mfa_enabled, mfa_method FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      mfa_enabled: user.mfa_enabled || false,
      mfa_method: user.mfa_method || null
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update MFA settings
router.post('/mfa', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { mfa_enabled, mfa_method } = req.body;
    
    // Validate input
    if (typeof mfa_enabled !== 'boolean') {
      return res.status(400).json({ error: 'mfa_enabled must be a boolean' });
    }
    
    if (mfa_enabled && !mfa_method) {
      return res.status(400).json({ error: 'mfa_method is required when enabling MFA' });
    }
    
    if (mfa_method && !['email'].includes(mfa_method)) {
      return res.status(400).json({ error: 'Invalid MFA method' });
    }
    
    // Update user MFA settings
    await query(
      'UPDATE users SET mfa_enabled = $1, mfa_method = $2 WHERE id = $3',
      [mfa_enabled, mfa_enabled ? mfa_method : null, userId]
    );
    
    res.json({ 
      success: true,
      mfa_enabled,
      mfa_method: mfa_enabled ? mfa_method : null
    });
  } catch (error) {
    console.error('Error updating MFA settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;
    
    // Validate input
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }
    
    // Get current user
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);
    
    // Update password
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
