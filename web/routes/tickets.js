const express = require('express');
const { z } = require('zod');
const { query } = require('@worktrackr/shared/db');

const router = express.Router();

// Validation schemas
const createTicketSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  queueId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  sector: z.string().max(255).optional(),
  scheduled_date: z.string().datetime().optional(), // ISO string
  scheduled_duration_mins: z.number().int().positive().optional(),
  method_statement: z.any().optional(), // JSON object
  risk_assessment: z.any().optional()   // JSON object
});

const updateTicketSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: z.enum(['open', 'pending', 'closed', 'resolved']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  sector: z.string().max(255).nullable().optional(),
  scheduled_date: z.string().datetime().nullable().optional(),
  scheduled_duration_mins: z.number().int().positive().nullable().optional(),
  method_statement: z.any().nullable().optional(),
  risk_assessment: z.any().nullable().optional()
});

const commentSchema = z.object({
  body: z.string().min(1)
});

// -------------------- ROUTES --------------------

// Get tickets for organization
router.get('/', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { status, assignee, priority, page = 1, limit = 50 } = req.query;
    
    let whereClause = 'WHERE t.organisation_id = $1';
    const params = [organizationId];
    let paramCount = 1;

    if (status) {
      whereClause += ` AND t.status = $${++paramCount}`;
      params.push(status);
    }

    if (assignee) {
      whereClause += ` AND t.assignee_id = $${++paramCount}`;
      params.push(assignee);
    }

    if (priority) {
      whereClause += ` AND t.priority = $${++paramCount}`;
      params.push(priority);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const ticketsResult = await query(`
      SELECT t.*,
             creator.name as created_by_name, creator.email as created_by_email,
             assignee.name as assignee_name, assignee.email as assignee_email,
             q.name as queue_name,
             (SELECT COUNT(*) FROM comments c WHERE c.ticket_id = t.id) as comment_count
      FROM tickets t
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN queues q ON t.queue_id = q.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `, [...params, limit, offset]);

    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM tickets t
      ${whereClause}
    `, params);

    res.json({
      tickets: ticketsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Get single ticket
router.get('/:id', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;

    const ticketResult = await query(`
      SELECT t.*, 
             creator.name as created_by_name, creator.email as created_by_email,
             assignee.name as assignee_name, assignee.email as assignee_email,
             q.name as queue_name
      FROM tickets t
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN queues q ON t.queue_id = q.id
      WHERE t.id = $1 AND t.organisation_id = $2
    `, [id, organizationId]);

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const commentsResult = await query(`
      SELECT c.*, u.name as author_name, u.email as author_email
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.ticket_id = $1
      ORDER BY c.created_at ASC
    `, [id]);

    const attachmentsResult = await query(`
      SELECT a.*, u.name as uploader_name
      FROM attachments a
      JOIN users u ON a.uploader_id = u.id
      WHERE a.ticket_id = $1
      ORDER BY a.created_at ASC
    `, [id]);

    res.json({
      ticket: ticketResult.rows[0],
      comments: commentsResult.rows,
      attachments: attachmentsResult.rows
    });

  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Create ticket
router.post('/', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const {
      title, description, priority, queueId, assigneeId,
      sector, scheduled_date, scheduled_duration_mins,
      method_statement, risk_assessment
    } = createTicketSchema.parse(req.body);

    let finalQueueId = queueId;
    if (!finalQueueId) {
      const defaultQueue = await query(
        'SELECT id FROM queues WHERE organisation_id = $1 AND is_default = true LIMIT 1',
        [organizationId]
      );
      if (defaultQueue.rows.length > 0) {
        finalQueueId = defaultQueue.rows[0].id;
      }
    }

    const ticketResult = await query(`
      INSERT INTO tickets (
        organisation_id, title, description, priority, queue_id, assignee_id, created_by,
        sector, scheduled_date, scheduled_duration_mins, method_statement, risk_assessment
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [
      organizationId, title, description, priority, finalQueueId, assigneeId, req.user.userId,
      sector, scheduled_date, scheduled_duration_mins, method_statement, risk_assessment
    ]);

    res.status(201).json({ ticket: ticketResult.rows[0] });

  } catch (error) {
    console.error('Create ticket error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Update ticket
router.put('/:id', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;
    const updates = updateTicketSchema.parse(req.body);

    const updateFields = [];
    const params = [id, organizationId];
    let paramCount = 2;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${++paramCount}`);
        params.push(value);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = NOW()`);

    const ticketResult = await query(`
      UPDATE tickets 
      SET ${updateFields.join(', ')}
      WHERE id = $1 AND organisation_id = $2
      RETURNING *
    `, params);

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ ticket: ticketResult.rows[0] });

  } catch (error) {
    console.error('Update ticket error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// Add comment
router.post('/:id/comments', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;
    const { body } = commentSchema.parse(req.body);

    const ticketCheck = await query(
      'SELECT id FROM tickets WHERE id = $1 AND organisation_id = $2',
      [id, organizationId]
    );
    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const commentResult = await query(`
      INSERT INTO comments (ticket_id, author_id, body)
      VALUES ($1,$2,$3)
      RETURNING *
    `, [id, req.user.userId, body]);

    await query('UPDATE tickets SET updated_at = NOW() WHERE id = $1', [id]);

    res.status(201).json({ comment: commentResult.rows[0] });

  } catch (error) {
    console.error('Add comment error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Queues list
router.get('/queues/list', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const queuesResult = await query(
      'SELECT * FROM queues WHERE organisation_id = $1 ORDER BY name',
      [organizationId]
    );
    res.json({ queues: queuesResult.rows });
  } catch (error) {
    console.error('Get queues error:', error);
    res.status(500).json({ error: 'Failed to fetch queues' });
  }
});

// Users list
router.get('/users/list', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const usersResult = await query(`
      SELECT u.id, u.name, u.email, m.role
      FROM users u
      JOIN memberships m ON u.id = m.user_id
      WHERE m.organisation_id = $1
      ORDER BY u.name
    `, [organizationId]);
    res.json({ users: usersResult.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Calendar feed
router.get('/calendar', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: 'start and end required' });
    }

    const rows = await query(`
      SELECT id, title, scheduled_date, scheduled_duration_mins
      FROM tickets
      WHERE organisation_id = $1
        AND scheduled_date IS NOT NULL
        AND scheduled_date >= $2
        AND scheduled_date < $3
      ORDER BY scheduled_date ASC
    `, [organizationId, start, end]);

    const events = rows.rows.map(r => {
      const startISO = r.scheduled_date;
      let endISO = null;
      if (r.scheduled_duration_mins) {
        endISO = new Date(new Date(startISO).getTime() + r.scheduled_duration_mins * 60000).toISOString();
      }
      return {
        id: r.id,
        title: r.title,
        start: startISO,
        end: endISO,
        allDay: !r.scheduled_duration_mins
      };
    });

    res.json({ events });

  } catch (error) {
    console.error('Calendar feed error:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

module.exports = router;
