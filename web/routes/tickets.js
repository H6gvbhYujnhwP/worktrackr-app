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

// Bulk update tickets
router.put('/bulk', async (req, res) => {
  console.log('🚨🚨🚨 BULK UPDATE ENDPOINT HIT!');
  console.log('📦 Full request body:', JSON.stringify(req.body, null, 2));
  console.log('📦 Body keys:', Object.keys(req.body));
  console.log('📦 Body.ids:', req.body.ids);
  console.log('📦 Body.updates:', req.body.updates);
  console.log('📦 Body.updates type:', typeof req.body.updates);
  console.log('📦 Body.updates keys:', req.body.updates ? Object.keys(req.body.updates) : 'UNDEFINED');
  console.log('📦 Body.updates.priority:', req.body.updates?.priority);
  console.log('📦 Body.updates.status:', req.body.updates?.status);
  
  try {
    const { organizationId } = req.orgContext;
    const { ids, updates } = req.body;
    
    console.log('📦 After destructuring - ids:', ids);
    console.log('📦 After destructuring - updates:', updates);
    console.log('📦 After destructuring - updates type:', typeof updates);
    console.log('📦 After destructuring - updates keys:', updates ? Object.keys(updates) : 'UNDEFINED');

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'updates object is required' });
    }

    // Validate updates against schema (partial)
    console.log('🔍 Bulk update request:', { ids, updates });
    console.log('🔍 Raw updates object:', updates);
    console.log('🔍 Raw updates.priority:', updates.priority);
    console.log('🔍 Raw updates.status:', updates.status);
    let validatedUpdates;
    try {
      validatedUpdates = updateTicketSchema.partial().parse(updates);
      console.log('✅ Validation passed:', validatedUpdates);
      console.log('✅ Validated updates keys:', Object.keys(validatedUpdates));
      console.log('✅ Validated updates.priority:', validatedUpdates.priority);
      console.log('✅ Validated updates.status:', validatedUpdates.status);
    } catch (validationError) {
      console.error('❌ Validation failed:', validationError);
      return res.status(400).json({ error: 'Validation failed', details: validationError.errors });
    }

    // Build SET clause dynamically
    const setClauses = [];
    const values = [];
    let paramCount = 1;

    if (validatedUpdates.title !== undefined) {
      setClauses.push(`title = $${paramCount++}`);
      values.push(validatedUpdates.title);
    }
    if (validatedUpdates.description !== undefined) {
      setClauses.push(`description = $${paramCount++}`);
      values.push(validatedUpdates.description);
    }
    if (validatedUpdates.status !== undefined) {
      setClauses.push(`status = $${paramCount++}`);
      values.push(validatedUpdates.status);
    }
    if (validatedUpdates.priority !== undefined) {
      setClauses.push(`priority = $${paramCount++}`);
      values.push(validatedUpdates.priority);
    }
    if (validatedUpdates.assigneeId !== undefined) {
      setClauses.push(`assignee_id = $${paramCount++}`);
      values.push(validatedUpdates.assigneeId);
    }
    if (validatedUpdates.sector !== undefined) {
      setClauses.push(`sector = $${paramCount++}`);
      values.push(validatedUpdates.sector);
    }
    if (validatedUpdates.scheduled_date !== undefined) {
      setClauses.push(`scheduled_date = $${paramCount++}`);
      values.push(validatedUpdates.scheduled_date);
    }
    if (validatedUpdates.scheduled_duration_mins !== undefined) {
      setClauses.push(`scheduled_duration_mins = $${paramCount++}`);
      values.push(validatedUpdates.scheduled_duration_mins);
    }

    setClauses.push('updated_at = NOW()');
    
    console.log('📦 SET clauses built:', setClauses);
    console.log('📦 SET clauses length:', setClauses.length);
    console.log('📦 Values array:', values);

    if (setClauses.length === 1) {
      console.log('❌ NO VALID FIELDS TO UPDATE! Only updated_at was set.');
      console.log('❌ validatedUpdates was:', validatedUpdates);
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add organization ID and IDs to values
    values.push(organizationId);
    const orgIdParam = paramCount++;
    values.push(ids);
    const idsParam = paramCount;

    const updateQuery = `
      UPDATE tickets
      SET ${setClauses.join(', ')}
      WHERE organisation_id = $${orgIdParam}
        AND id = ANY($${idsParam}::uuid[])
    `;

    const result = await query(updateQuery, values);

    res.json({ updated: result.rowCount });

  } catch (error) {
    console.error('Bulk update error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to bulk update tickets' });
  }
});

// Bulk delete tickets
router.delete('/bulk', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await query(`
      DELETE FROM tickets
      WHERE organisation_id = $1
        AND id = ANY($2::uuid[])
    `, [organizationId, ids]);

    res.json({ deleted: result.rowCount });

  } catch (error) {
    console.error('❌ Bulk update error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to update tickets', details: error.message });
  }
});

// Delete single ticket
router.delete('/:id', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;

    const result = await query(`
      DELETE FROM tickets
      WHERE id = $1 AND organisation_id = $2
    `, [id, organizationId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

module.exports = router;
