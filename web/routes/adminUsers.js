const express = require('express');
const router = express.Router();
const { query } = require('../../shared/db');
const { requireMasterAdmin, logAdminAction } = require('../middleware/adminAuth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Apply master admin middleware to all routes
router.use(requireMasterAdmin);

/**
 * GET /api/admin/users
 * List all users with pagination, search, and filters
 */
router.get('/', async (req, res) => {
  try {
    const {
      query: searchQuery = '',
      page = 1,
      pageSize = 20,
      role,
      plan,
      status
    } = req.query;

    const limit = Math.min(parseInt(pageSize), 50);
    const offset = (parseInt(page) - 1) * limit;

    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Search by email or ID
    if (searchQuery) {
      conditions.push(`(LOWER(u.email) LIKE LOWER($${paramIndex}) OR u.id::text = $${paramIndex})`);
      params.push(`%${searchQuery}%`);
      paramIndex++;
    }

    // Filter by role
    if (role) {
      conditions.push(`m.role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    // Filter by plan
    if (plan) {
      conditions.push(`o.plan = $${paramIndex}`);
      params.push(plan);
      paramIndex++;
    }

    // Filter by status
    if (status === 'suspended') {
      conditions.push('u.is_suspended = true');
    } else if (status === 'active') {
      conditions.push('(u.is_suspended = false OR u.is_suspended IS NULL)');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(DISTINCT u.id) as total
       FROM users u
       LEFT JOIN memberships m ON u.id = m.user_id
       LEFT JOIN organisations o ON m.organisation_id = o.id
       ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    // Get paginated users
    const usersResult = await query(
      `SELECT DISTINCT ON (u.id)
        u.id,
        u.email,
        u.name,
        u.is_suspended,
        u.last_login,
        u.admin_notes,
        u.created_at,
        m.role,
        o.id as org_id,
        o.name as org_name,
        o.plan,
        o.stripe_subscription_id,
        o.current_period_end,
        o.included_seats,
        o.active_user_count,
        o.seat_overage_cached,
        o.cancellation_reason,
        o.cancellation_comment,
        o.cancelled_at
       FROM users u
       LEFT JOIN memberships m ON u.id = m.user_id
       LEFT JOIN organisations o ON m.organisation_id = o.id
       ${whereClause}
       ORDER BY u.id, u.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const items = usersResult.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      status: row.is_suspended ? 'suspended' : 'active',
      is_suspended: row.is_suspended,
      last_login: row.last_login,
      admin_notes: row.admin_notes,
      created_at: row.created_at,
      membership: row.role ? {
        role: row.role
      } : null,
      organisation: row.org_id ? {
        id: row.org_id,
        name: row.org_name,
        plan: row.plan,
        stripe_subscription_id: row.stripe_subscription_id,
        current_period_end: row.current_period_end,
        included_seats: row.included_seats,
        active_user_count: row.active_user_count,
        seat_overage_cached: row.seat_overage_cached,
        cancellation_reason: row.cancellation_reason,
        cancellation_comment: row.cancellation_comment,
        cancelled_at: row.cancelled_at
      } : null
    }));

    res.json({
      items,
      total,
      page: parseInt(page),
      pageSize: limit
    });
  } catch (error) {
    console.error('[admin/users] Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/admin/users/:id
 * Get detailed information about a specific user
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await query(
      `SELECT u.*, m.role, m.organisation_id,
              o.name as org_name, o.plan, o.stripe_subscription_id,
              o.stripe_customer_id, o.current_period_end,
              o.included_seats, o.active_user_count,
              o.cancellation_reason, o.cancellation_comment, o.cancelled_at
       FROM users u
       LEFT JOIN memberships m ON u.id = m.user_id
       LEFT JOIN organisations o ON m.organisation_id = o.id
       WHERE u.id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get recent audit logs for this user
    const auditResult = await query(
      `SELECT a.*, u.email as actor_email, u.name as actor_name
       FROM audit_logs a
       LEFT JOIN users u ON a.actor_id = u.id
       WHERE a.target_id = $1
       ORDER BY a.created_at DESC
       LIMIT 20`,
      [id]
    );

    // Log the view action
    await logAdminAction(req.adminUser.id, 'USER_VIEW', id, 'user');

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_suspended: user.is_suspended,
        last_login: user.last_login,
        admin_notes: user.admin_notes,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      membership: user.role ? {
        role: user.role,
        organisation_id: user.organisation_id
      } : null,
      organisation: user.org_name ? {
        id: user.organisation_id,
        name: user.org_name,
        plan: user.plan,
        stripe_subscription_id: user.stripe_subscription_id,
        stripe_customer_id: user.stripe_customer_id,
        current_period_end: user.current_period_end,
        included_seats: user.included_seats,
        active_user_count: user.active_user_count,
        cancellation_reason: user.cancellation_reason,
        cancellation_comment: user.cancellation_comment,
        cancelled_at: user.cancelled_at
      } : null,
      audit_logs: auditResult.rows
    });
  } catch (error) {
    console.error('[admin/users] Error fetching user details:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

/**
 * POST /api/admin/users/:id/suspend
 * Suspend a user account
 */
router.post('/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;

    await query(
      'UPDATE users SET is_suspended = true, updated_at = NOW() WHERE id = $1',
      [id]
    );

    await logAdminAction(req.adminUser.id, 'USER_SUSPEND', id, 'user');

    res.json({ ok: true, message: 'User suspended successfully' });
  } catch (error) {
    console.error('[admin/users] Error suspending user:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

/**
 * POST /api/admin/users/:id/unsuspend
 * Unsuspend a user account
 */
router.post('/:id/unsuspend', async (req, res) => {
  try {
    const { id } = req.params;

    await query(
      'UPDATE users SET is_suspended = false, updated_at = NOW() WHERE id = $1',
      [id]
    );

    await logAdminAction(req.adminUser.id, 'USER_UNSUSPEND', id, 'user');

    res.json({ ok: true, message: 'User unsuspended successfully' });
  } catch (error) {
    console.error('[admin/users] Error unsuspending user:', error);
    res.status(500).json({ error: 'Failed to unsuspend user' });
  }
});

/**
 * POST /api/admin/users/:id/notes
 * Update admin notes for a user
 */
router.post('/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    await query(
      'UPDATE users SET admin_notes = $1, updated_at = NOW() WHERE id = $2',
      [notes, id]
    );

    await logAdminAction(req.adminUser.id, 'USER_NOTES_UPDATE', id, 'user', { notes });

    res.json({ ok: true, message: 'Notes updated successfully' });
  } catch (error) {
    console.error('[admin/users] Error updating notes:', error);
    res.status(500).json({ error: 'Failed to update notes' });
  }
});

/**
 * POST /api/admin/users/bulk
 * Perform bulk operations on multiple users
 */
router.post('/bulk', async (req, res) => {
  try {
    const { ids, action } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid user IDs' });
    }

    if (!['suspend', 'unsuspend'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const isSuspended = action === 'suspend';
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');

    await query(
      `UPDATE users SET is_suspended = $${ids.length + 1}, updated_at = NOW()
       WHERE id IN (${placeholders})`,
      [...ids, isSuspended]
    );

    await logAdminAction(
      req.adminUser.id,
      action === 'suspend' ? 'BULK_SUSPEND' : 'BULK_UNSUSPEND',
      null,
      'user',
      { ids, count: ids.length }
    );

    res.json({
      ok: true,
      message: `Bulk ${action} completed for ${ids.length} user(s)`
    });
  } catch (error) {
    console.error('[admin/users] Error performing bulk operation:', error);
    res.status(500).json({ error: 'Failed to perform bulk operation' });
  }
});

/**
 * PATCH /api/admin/users/:id
 * Update user details
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, admin_notes, password } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (admin_notes !== undefined) {
      updates.push(`admin_notes = $${paramCount++}`);
      values.push(admin_notes);
    }
    
    // Handle password update
    if (password && password.length >= 8) {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 12);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    await logAdminAction(req.adminUser.id, 'USER_UPDATE', id, 'user', { name, email });

    res.json({ ok: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('[admin/users] Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * GET /api/admin/users/export
 * Expo/**
 * POST /api/admin/users/:id/soft-delete
 * Soft delete user (disable login, keep data)
 */
router.post('/:id/soft-delete', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Update user to disable login
    await query(
      `UPDATE users 
       SET is_suspended = true,
           admin_notes = COALESCE(admin_notes || E'\n\n', '') || $1
       WHERE id = $2`,
      [`[SOFT DELETED] ${new Date().toISOString()} - Reason: ${reason || 'No reason provided'}`, id]
    );

    // Log the action
    await logAdminAction(req.adminUser.id, 'USER_SOFT_DELETE', 'user', id, {
      reason,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'User login disabled successfully' });
  } catch (error) {
    console.error('Error soft deleting user:', error);
    res.status(500).json({ error: 'Failed to disable user login' });
  }
});

/**
 * POST /api/admin/users/:id/hard-delete
 * Hard delete user (permanently remove all data)
 */
router.post('/:id/hard-delete', async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmation } = req.body;

    if (confirmation !== 'DELETE') {
      return res.status(400).json({ error: 'Confirmation required' });
    }

    // Get user details before deletion for logging
    const userResult = await query(
      'SELECT email, name FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get organization IDs where user is a member
    const orgResult = await query(
      'SELECT organisation_id FROM memberships WHERE user_id = $1',
      [id]
    );

    // Delete in order (respecting foreign key constraints):
    
    // 1. Handle tickets created by this user
    // Option: Delete tickets created by this user
    await query('DELETE FROM tickets WHERE created_by = $1', [id]);
    
    // Also handle tickets assigned to this user
    await query('UPDATE tickets SET assigned_to = NULL WHERE assigned_to = $1', [id]);
    
    // 2. Memberships
    await query('DELETE FROM memberships WHERE user_id = $1', [id]);

    // 3. Audit logs
    await query('DELETE FROM audit_logs WHERE actor_id = $1', [id]);

    // 4. User
    await query('DELETE FROM users WHERE id = $1', [id]);

    // 5. Organizations if user was the only member
    for (const org of orgResult.rows) {
      const memberCount = await query(
        'SELECT COUNT(*) as count FROM memberships WHERE organisation_id = $1',
        [org.organisation_id]
      );

      if (memberCount.rows[0].count === '0') {
        // Delete organization if no members left
        await query('DELETE FROM organisations WHERE id = $1', [org.organisation_id]);
      }
    }

    // Log the action (before user is deleted)
    await logAdminAction(req.adminUser.id, 'USER_HARD_DELETE', 'user', id, {
      email: user.email,
      name: user.name,
      timestamp: new Date().toISOString()
    });

    res.json({ 
      success: true, 
      message: 'User and all associated data permanently deleted' 
    });
  } catch (error) {
    console.error('Error hard deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user permanently' });
  }
});

// Export users to CSV
router.get('/export', async (req, res) => {
  try {
    const usersResult = await query(
      `SELECT u.id, u.email, u.name, u.is_suspended, u.created_at,
              m.role, o.name as org_name, o.plan,
              o.included_seats, o.active_user_count,
              o.cancellation_reason, o.cancelled_at
       FROM users u
       LEFT JOIN memberships m ON u.id = m.user_id
       LEFT JOIN organisations o ON m.organisation_id = o.id
       ORDER BY u.created_at DESC`
    );

    // Generate CSV
    const headers = [
      'ID', 'Email', 'Name', 'Role', 'Organization', 'Plan',
      'Status', 'Suspended', 'Seats Used', 'Seats Included',
      'Cancellation Reason', 'Cancelled At', 'Created At'
    ];

    const rows = usersResult.rows.map(row => [
      row.id,
      row.email,
      row.name,
      row.role || 'N/A',
      row.org_name || 'N/A',
      row.plan || 'N/A',
      row.status,
      row.is_suspended ? 'Yes' : 'No',
      row.active_user_count || 0,
      row.included_seats || 0,
      row.cancellation_reason || '',
      row.cancelled_at ? new Date(row.cancelled_at).toISOString() : '',
      new Date(row.created_at).toISOString()
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    await logAdminAction(req.adminUser.id, 'USER_EXPORT', null, 'user', {
      count: usersResult.rows.length
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="worktrackr-users-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('[admin/users] Error exporting users:', error);
    res.status(500).json({ error: 'Failed to export users' });
  }
});

/**
 * POST /api/admin/users/:id/portal
 * Get Stripe billing portal URL for a user's organization
 */
router.post('/:id/portal', async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await query(
      `SELECT o.stripe_customer_id
       FROM users u
       JOIN memberships m ON u.id = m.user_id
       JOIN organisations o ON m.organisation_id = o.id
       WHERE u.id = $1`,
      [id]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].stripe_customer_id) {
      return res.status(404).json({ error: 'No Stripe customer found for this user' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: userResult.rows[0].stripe_customer_id,
      return_url: `${process.env.BASE_URL || 'https://worktrackr.cloud'}/app/dashboard`
    });

    await logAdminAction(req.adminUser.id, 'USER_PORTAL_ACCESS', id, 'user');

    res.json({ url: session.url });
  } catch (error) {
    console.error('[admin/users] Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

module.exports = router;
