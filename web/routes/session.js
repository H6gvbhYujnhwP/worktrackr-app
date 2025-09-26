const express = require('express');
const jwt = require('jsonwebtoken');
const { query } = require('../shared/db');

const router = express.Router();

// Session check endpoint
router.get('/session', async (req, res) => {
  try {
    console.log('🔍 Session check requested');
    console.log('🍪 Available cookies:', req.cookies);
    
    const token = req.cookies.auth_token || req.cookies.jwt;
    console.log('🔑 Found token:', token ? `${token.substring(0, 20)}...` : 'NONE');
    
    if (!token) {
      console.log('❌ No token found in session check');
      return res.status(401).json({ error: 'No authentication token' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token verified for user:', decoded.userId);
      
      // Get user details
      const userResult = await query(
        'SELECT id, email, name FROM users WHERE id = $1',
        [decoded.userId]
      );
      
      if (userResult.rows.length === 0) {
        console.log('❌ User not found in database');
        return res.status(401).json({ error: 'User not found' });
      }
      
      const user = userResult.rows[0];
      
      // Get membership
      const membershipResult = await query(
        'SELECT organisation_id AS "orgId", role FROM memberships WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1',
        [decoded.userId]
      );
      
      const membership = membershipResult.rows[0] || null;
      
      console.log('✅ Session check successful for:', user.email);
      return res.json({ 
        user: { id: user.id, email: user.email, name: user.name }, 
        membership 
      });
      
    } catch (jwtError) {
      console.log('❌ Token verification failed:', jwtError.message);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
  } catch (error) {
    console.error('💥 Session check error:', error);
    res.status(500).json({ error: 'Session check failed' });
  }
});

module.exports = router;
