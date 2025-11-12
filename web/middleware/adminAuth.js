const { query } = require('../../shared/db');
const jwt = require('jsonwebtoken');

/**
 * Read user from JWT token in cookies
 * @param {Request} req - Express request object
 * @returns {object|null} - Decoded user object or null
 */
function readUserFromRequest(req) {
  const token = req.cookies.auth_token || req.cookies.jwt;
  if (!token) return null;
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Middleware to require Master Admin access
 * Checks if user is authenticated and has is_master_admin = true
 */
async function requireMasterAdmin(req, res, next) {
  try {
    // First check if user is authenticated
    const user = readUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Please log in' });
    }
    
    // Check if user has master admin privileges
    const result = await query(
      'SELECT id, email, name, is_master_admin FROM users WHERE id = $1',
      [user.userId]
    );
    
    if (!result.rows[0]) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }
    
    if (!result.rows[0].is_master_admin) {
      return res.status(403).json({ error: 'Forbidden: Master Admin access required' });
    }
    
    // Attach admin user to request
    req.adminUser = result.rows[0];
    next();
  } catch (error) {
    console.error('[adminAuth] Error checking master admin:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Log an admin action to the audit log
 * @param {string} actorId - ID of the admin performing the action
 * @param {string} action - Action type (e.g., 'USER_SUSPEND', 'USER_UNSUSPEND')
 * @param {string} targetId - ID of the target entity (optional)
 * @param {string} targetType - Type of target entity (e.g., 'user', 'organisation')
 * @param {object} meta - Additional metadata (optional)
 */
async function logAdminAction(actorId, action, targetId = null, targetType = null, meta = {}) {
  try {
    await query(
      `INSERT INTO audit_logs (actor_id, action, target_id, target_type, meta)
       VALUES ($1, $2, $3, $4, $5)`,
      [actorId, action, targetId, targetType, JSON.stringify(meta)]
    );
  } catch (error) {
    console.error('[adminAuth] Error logging admin action:', error);
    // Don't throw - audit log failure shouldn't break the operation
  }
}

module.exports = {
  requireMasterAdmin,
  logAdminAction
};
