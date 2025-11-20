const express = require('express');
const { z } = require('zod');
const { query } = require('@worktrackr/shared/db');

const router = express.Router();

// Validation schemas
const brandingSchema = z.object({
  product_name: z.string().min(1).max(255),
  logo_url: z.string().url().optional(),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  accent_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  email_from_name: z.string().min(1).max(255)
});

// Get organizations (for partner admins)
router.get('/', async (req, res) => {
  try {
    const { type, partnerId } = req.orgContext;

    if (type !== 'partner_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const orgsResult = await query(`
      SELECT o.id, o.name, o.created_at,
             COUNT(m.id) as user_count,
             COUNT(t.id) as ticket_count,
             ob.product_name, ob.primary_color, ob.accent_color
      FROM organisations o
      LEFT JOIN memberships m ON o.id = m.organisation_id
      LEFT JOIN tickets t ON o.id = t.organisation_id
      LEFT JOIN org_branding ob ON o.id = ob.organisation_id
      WHERE o.partner_id = $1
      GROUP BY o.id, o.name, o.created_at, ob.product_name, ob.primary_color, ob.accent_color
      ORDER BY o.name
    `, [partnerId]);

    res.json({ organizations: orgsResult.rows });

  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Get current organization details
router.get('/current', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;

    const orgResult = await query(`
      SELECT o.*, 
             ob.product_name, ob.logo_url, ob.primary_color, ob.accent_color, ob.email_from_name,
             p.name as partner_name, p.support_email as partner_support_email
      FROM organisations o
      LEFT JOIN org_branding ob ON o.id = ob.organisation_id
      LEFT JOIN partners p ON o.partner_id = p.id
      WHERE o.id = $1
    `, [organizationId]);

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get user count
    const userCountResult = await query(
      'SELECT COUNT(*) as count FROM memberships WHERE organisation_id = $1',
      [organizationId]
    );

    // Get ticket stats
    const ticketStatsResult = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed
      FROM tickets 
      WHERE organisation_id = $1
    `, [organizationId]);

    res.json({
      organization: orgResult.rows[0],
      stats: {
        users: parseInt(userCountResult.rows[0].count),
        tickets: ticketStatsResult.rows[0]
      }
    });

  } catch (error) {
    console.error('Get current organization error:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Get organization branding
router.get('/:id/branding', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, partnerId, organizationId } = req.orgContext;

    // Check access permissions
    if (type === 'partner_admin') {
      // Verify organization belongs to partner
      const orgCheck = await query(
        'SELECT id FROM organisations WHERE id = $1 AND partner_id = $2',
        [id, partnerId]
      );
      if (orgCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (id !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const brandingResult = await query(
      'SELECT * FROM org_branding WHERE organisation_id = $1',
      [id]
    );

    if (brandingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Branding not found' });
    }

    res.json({ branding: brandingResult.rows[0] });

  } catch (error) {
    console.error('Get branding error:', error);
    res.status(500).json({ error: 'Failed to fetch branding' });
  }
});

// Update organization branding
router.put('/:id/branding', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, partnerId, organizationId, role } = req.orgContext;
    const branding = brandingSchema.parse(req.body);

    // Check access permissions
    if (type === 'partner_admin') {
      // Verify organization belongs to partner
      const orgCheck = await query(
        'SELECT id FROM organisations WHERE id = $1 AND partner_id = $2',
        [id, partnerId]
      );
      if (orgCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (id !== organizationId || !['admin', 'manager'].includes(role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update or insert branding
    const brandingResult = await query(`
      INSERT INTO org_branding (organisation_id, product_name, logo_url, primary_color, accent_color, email_from_name)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (organisation_id) 
      DO UPDATE SET 
        product_name = EXCLUDED.product_name,
        logo_url = EXCLUDED.logo_url,
        primary_color = EXCLUDED.primary_color,
        accent_color = EXCLUDED.accent_color,
        email_from_name = EXCLUDED.email_from_name,
        updated_at = NOW()
      RETURNING *
    `, [id, branding.product_name, branding.logo_url, branding.primary_color, branding.accent_color, branding.email_from_name]);

    res.json({ branding: brandingResult.rows[0] });

  } catch (error) {
    console.error('Update branding error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update branding' });
  }
});

// Get organization users
router.get('/:id/users', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, partnerId, organizationId, role } = req.orgContext;

    // Check access permissions
    if (type === 'partner_admin') {
      // Verify organization belongs to partner
      const orgCheck = await query(
        'SELECT id FROM organisations WHERE id = $1 AND partner_id = $2',
        [id, partnerId]
      );
      if (orgCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (id !== organizationId || !['admin', 'manager'].includes(role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const usersResult = await query(`
      SELECT u.id, u.name, u.email, u.created_at, m.role
      FROM users u
      JOIN memberships m ON u.id = m.user_id
      WHERE m.organisation_id = $1
      ORDER BY u.name
    `, [id]);

    res.json({ users: usersResult.rows });

  } catch (error) {
    console.error('Get organization users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Invite user to organization
router.post('/:id/users/invite', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, role = 'staff', mobile, emailNotifications, password, sendInvitation = true } = req.body;
    const { type, partnerId, organizationId, role: userRole } = req.orgContext;

    // Check access permissions
    if (type === 'partner_admin') {
      // Verify organization belongs to partner
      const orgCheck = await query(
        'SELECT id FROM organisations WHERE id = $1 AND partner_id = $2',
        [id, partnerId]
      );
      if (orgCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (id !== organizationId || !['admin', 'manager'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check user limit based on subscription plan
    const orgResult = await query(
      'SELECT plan, included_seats FROM organisations WHERE id = $1',
      [id]
    );
    
    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    const subscriptionPlan = orgResult.rows[0].plan || 'starter';
    const maxUsers = orgResult.rows[0].included_seats || 1;
    
    // Count current users in organization
    const userCountResult = await query(
      'SELECT COUNT(*) as count FROM memberships WHERE organisation_id = $1',
      [id]
    );
    
    const currentUserCount = parseInt(userCountResult.rows[0].count);
    
    if (currentUserCount >= maxUsers) {
      return res.status(403).json({ 
        error: `User limit reached. Your ${subscriptionPlan} plan allows up to ${maxUsers} user${maxUsers > 1 ? 's' : ''}. Please upgrade your plan to add more users.`,
        currentUsers: currentUserCount,
        maxUsers: maxUsers,
        plan: subscriptionPlan
      });
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    let userId;
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      
      // Check if already a member
      const existingMembership = await query(
        'SELECT id FROM memberships WHERE user_id = $1 AND organisation_id = $2',
        [userId, id]
      );
      
      if (existingMembership.rows.length > 0) {
        return res.status(400).json({ error: 'User is already a member' });
      }
    } else {
      // Create new user
      const bcrypt = require('bcryptjs');
      let passwordHash;
      
      if (sendInvitation) {
        // Generate temporary password for invitation flow
        const tempPassword = Math.random().toString(36).slice(-8);
        passwordHash = await bcrypt.hash(tempPassword, 12);
        // TODO: Send invitation email with password setup link
      } else {
        // Use admin-provided password
        if (!password || password.length < 8) {
          return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }
        passwordHash = await bcrypt.hash(password, 12);
      }
      
      const userResult = await query(
        'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
        [email.toLowerCase(), name, passwordHash]
      );
      userId = userResult.rows[0].id;
    }

    // Create membership
    await query(
      'INSERT INTO memberships (organisation_id, user_id, role) VALUES ($1, $2, $3)',
      [id, userId, role]
    );

    res.json({ message: 'User invited successfully' });

  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
});

module.exports = router;

