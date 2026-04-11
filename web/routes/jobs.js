// web/routes/jobs.js
// Jobs Module — Phase 1 API
// Mounted at /api/jobs in server.js (authenticateToken applied there)

const express = require('express');
const router = express.Router();
const { z } = require('zod');
const db = require('../../shared/db');

// =============================================================================
// Zod schemas
// =============================================================================

const JOB_STATUSES = ['scheduled', 'in_progress', 'on_hold', 'completed', 'invoiced', 'cancelled'];

const createJobSchema = z.object({
  title:           z.string().min(1, 'Title is required'),
  description:     z.string().optional().nullable(),
  status:          z.enum(JOB_STATUSES).default('scheduled'),
  quote_id:        z.string().uuid().optional().nullable(),
  ticket_id:       z.string().uuid().optional().nullable(),
  contact_id:      z.string().uuid().optional().nullable(),
  scheduled_start: z.string().datetime({ offset: true }).optional().nullable(),
  scheduled_end:   z.string().datetime({ offset: true }).optional().nullable(),
  assigned_to:     z.string().uuid().optional().nullable(),
  notes:           z.string().optional().nullable(),
});

const updateJobSchema = z.object({
  title:           z.string().min(1).optional(),
  description:     z.string().optional().nullable(),
  status:          z.enum(JOB_STATUSES).optional(),
  scheduled_start: z.string().datetime({ offset: true }).optional().nullable(),
  scheduled_end:   z.string().datetime({ offset: true }).optional().nullable(),
  actual_start:    z.string().datetime({ offset: true }).optional().nullable(),
  actual_end:      z.string().datetime({ offset: true }).optional().nullable(),
  assigned_to:     z.string().uuid().optional().nullable(),
  contact_id:      z.string().uuid().optional().nullable(),
  notes:           z.string().optional().nullable(),
});

const createTimeEntrySchema = z.object({
  description:      z.string().optional().nullable(),
  started_at:       z.string().datetime({ offset: true }).optional().nullable(),
  ended_at:         z.string().datetime({ offset: true }).optional().nullable(),
  duration_minutes: z.number().int().min(0),
  billable:         z.boolean().default(true),
  hourly_rate:      z.number().min(0).optional().nullable(),
});

const createPartSchema = z.object({
  product_id:  z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  quantity:    z.number().min(0).default(1),
  unit:        z.string().optional().nullable(),
  unit_cost:   z.number().min(0).optional().nullable(),
  unit_price:  z.number().min(0).optional().nullable(),
});

// =============================================================================
// Helper: map a DB row to the API response shape
// =============================================================================
function mapJob(row) {
  return {
    id:                     row.id,
    jobNumber:              row.job_number,
    title:                  row.title,
    description:            row.description || null,
    status:                 row.status,
    quoteId:                row.quote_id || null,
    ticketId:               row.ticket_id || null,
    contactId:              row.contact_id || null,
    contactName:            row.contact_name || null,
    quoteNumber:            row.quote_number || null,
    scheduledStart:         row.scheduled_start || null,
    scheduledEnd:           row.scheduled_end || null,
    actualStart:            row.actual_start || null,
    actualEnd:              row.actual_end || null,
    assignedTo:             row.assigned_to || null,
    assignedToName:         row.assigned_to_name || null,
    createdBy:              row.created_by,
    createdByName:          row.created_by_name || null,
    notes:                  row.notes || null,
    convertedToInvoiceId:   row.converted_to_invoice_id || null,
    // Aggregates (present on detail view, null on list)
    totalTimeMinutes:       row.total_time_minutes != null ? parseInt(row.total_time_minutes, 10) : null,
    totalPartsValue:        row.total_parts_value != null ? parseFloat(row.total_parts_value) : null,
    createdAt:              row.created_at,
    updatedAt:              row.updated_at,
  };
}

function mapTimeEntry(row) {
  return {
    id:              row.id,
    jobId:           row.job_id,
    userId:          row.user_id,
    userName:        row.user_name || null,
    description:     row.description || null,
    startedAt:       row.started_at || null,
    endedAt:         row.ended_at || null,
    durationMinutes: parseInt(row.duration_minutes, 10),
    billable:        row.billable,
    hourlyRate:      row.hourly_rate != null ? parseFloat(row.hourly_rate) : null,
    createdAt:       row.created_at,
  };
}

function mapPart(row) {
  return {
    id:          row.id,
    jobId:       row.job_id,
    productId:   row.product_id || null,
    description: row.description,
    quantity:    parseFloat(row.quantity),
    unit:        row.unit || null,
    unitCost:    row.unit_cost != null ? parseFloat(row.unit_cost) : null,
    unitPrice:   row.unit_price != null ? parseFloat(row.unit_price) : null,
    createdBy:   row.created_by,
    createdAt:   row.created_at,
  };
}

// =============================================================================
// GET /api/jobs — list jobs for org
// Query params: status, contact_id, assigned_to, page, limit
// =============================================================================
router.get('/', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { status, contact_id, assigned_to, page = 1, limit = 50 } = req.query;

    const conditions = ['j.organisation_id = $1'];
    const params = [organizationId];
    let p = 2;

    if (status) {
      conditions.push(`j.status = $${p++}`);
      params.push(status);
    }
    if (contact_id) {
      conditions.push(`j.contact_id = $${p++}`);
      params.push(contact_id);
    }
    if (assigned_to) {
      conditions.push(`j.assigned_to = $${p++}`);
      params.push(assigned_to);
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const sql = `
      SELECT
        j.*,
        c.name  AS contact_name,
        q.quote_number,
        u1.name AS assigned_to_name,
        u2.name AS created_by_name
      FROM jobs j
      LEFT JOIN contacts c  ON c.id = j.contact_id
      LEFT JOIN quotes  q   ON q.id = j.quote_id
      LEFT JOIN users   u1  ON u1.id = j.assigned_to
      LEFT JOIN users   u2  ON u2.id = j.created_by
      WHERE ${conditions.join(' AND ')}
      ORDER BY j.created_at DESC
      LIMIT $${p++} OFFSET $${p++}
    `;
    params.push(parseInt(limit, 10), offset);

    const countSql = `
      SELECT COUNT(*) FROM jobs j
      WHERE ${conditions.slice(0, p - 2).join(' AND ')}
    `;
    // Re-use the non-pagination params for count
    const countParams = params.slice(0, params.length - 2);

    const [result, countResult] = await Promise.all([
      db.query(sql, params),
      db.query(countSql, countParams),
    ]);

    res.json({
      jobs:  result.rows.map(mapJob),
      total: parseInt(countResult.rows[0].count, 10),
      page:  parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  } catch (error) {
    console.error('[Jobs] GET / error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// =============================================================================
// GET /api/jobs/:id — single job with time-entry + parts totals
// =============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;

    const sql = `
      SELECT
        j.*,
        c.name  AS contact_name,
        q.quote_number,
        u1.name AS assigned_to_name,
        u2.name AS created_by_name,
        (
          SELECT COALESCE(SUM(te.duration_minutes), 0)
          FROM job_time_entries te
          WHERE te.job_id = j.id
        ) AS total_time_minutes,
        (
          SELECT COALESCE(SUM(p.quantity * p.unit_price), 0)
          FROM job_parts p
          WHERE p.job_id = j.id
        ) AS total_parts_value
      FROM jobs j
      LEFT JOIN contacts c  ON c.id = j.contact_id
      LEFT JOIN quotes  q   ON q.id = j.quote_id
      LEFT JOIN users   u1  ON u1.id = j.assigned_to
      LEFT JOIN users   u2  ON u2.id = j.created_by
      WHERE j.id = $1 AND j.organisation_id = $2
    `;

    const result = await db.query(sql, [id, organizationId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ job: mapJob(result.rows[0]) });
  } catch (error) {
    console.error('[Jobs] GET /:id error:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// =============================================================================
// POST /api/jobs — create a job manually (not via quote conversion)
// =============================================================================
router.post('/', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { userId } = req.user;

    const parsed = createJobSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    const data = parsed.data;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const jobNumberResult = await client.query(
        'SELECT generate_job_number($1) AS job_number',
        [organizationId]
      );
      const jobNumber = jobNumberResult.rows[0].job_number;

      const result = await client.query(
        `INSERT INTO jobs (
          organisation_id, job_number, title, description, status,
          quote_id, ticket_id, contact_id,
          scheduled_start, scheduled_end,
          assigned_to, created_by, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING *`,
        [
          organizationId,
          jobNumber,
          data.title,
          data.description || null,
          data.status,
          data.quote_id || null,
          data.ticket_id || null,
          data.contact_id || null,
          data.scheduled_start || null,
          data.scheduled_end || null,
          data.assigned_to || null,
          userId,
          data.notes || null,
        ]
      );

      await client.query('COMMIT');

      console.log(`[Jobs] Created ${result.rows[0].job_number} for org ${organizationId}`);
      res.status(201).json({ job: mapJob(result.rows[0]) });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Jobs] POST / error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// =============================================================================
// PUT /api/jobs/:id — update job fields
// Auto-sets actual_start when status → in_progress (if not already set)
// Auto-sets actual_end   when status → completed   (if not already set)
// =============================================================================
router.put('/:id', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;

    const parsed = updateJobSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    const data = parsed.data;

    // Fetch the current row to handle auto-timestamps
    const current = await db.query(
      'SELECT * FROM jobs WHERE id = $1 AND organisation_id = $2',
      [id, organizationId]
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const existing = current.rows[0];

    // Auto actual_start / actual_end
    if (data.status === 'in_progress' && !existing.actual_start && !data.actual_start) {
      data.actual_start = new Date().toISOString();
    }
    if (data.status === 'completed' && !existing.actual_end && !data.actual_end) {
      data.actual_end = new Date().toISOString();
    }

    // Build SET clause from provided fields only
    const fields = [
      'title', 'description', 'status', 'scheduled_start', 'scheduled_end',
      'actual_start', 'actual_end', 'assigned_to', 'contact_id', 'notes',
    ];
    const setClauses = [];
    const values = [];
    let p = 1;

    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        setClauses.push(`${field} = $${p++}`);
        values.push(data[field] ?? null);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id, organizationId);

    const sql = `
      UPDATE jobs
      SET ${setClauses.join(', ')}
      WHERE id = $${p++} AND organisation_id = $${p++}
      RETURNING *
    `;

    const result = await db.query(sql, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    console.log(`[Jobs] Updated ${result.rows[0].job_number} status=${result.rows[0].status}`);
    res.json({ job: mapJob(result.rows[0]) });
  } catch (error) {
    console.error('[Jobs] PUT /:id error:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// =============================================================================
// DELETE /api/jobs/:id — soft-cancel (status = 'cancelled')
// =============================================================================
router.delete('/:id', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;

    const result = await db.query(
      `UPDATE jobs
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND organisation_id = $2
         AND status NOT IN ('invoiced')
       RETURNING *`,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found or cannot be cancelled' });
    }

    res.json({ message: 'Job cancelled', job: mapJob(result.rows[0]) });
  } catch (error) {
    console.error('[Jobs] DELETE /:id error:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

// =============================================================================
// Time entries
// =============================================================================

// POST /api/jobs/:id/time-entries
router.post('/:id/time-entries', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { userId } = req.user;
    const { id: jobId } = req.params;

    // Confirm job belongs to org
    const job = await db.query(
      'SELECT id FROM jobs WHERE id = $1 AND organisation_id = $2',
      [jobId, organizationId]
    );
    if (job.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const parsed = createTimeEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    const data = parsed.data;

    // If both start and end provided, compute duration (overrides manual value)
    let durationMinutes = data.duration_minutes;
    if (data.started_at && data.ended_at) {
      const diffMs = new Date(data.ended_at) - new Date(data.started_at);
      durationMinutes = Math.max(0, Math.round(diffMs / 60000));
    }

    const result = await db.query(
      `INSERT INTO job_time_entries
         (job_id, organisation_id, user_id, description, started_at, ended_at,
          duration_minutes, billable, hourly_rate)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        jobId,
        organizationId,
        userId,
        data.description || null,
        data.started_at || null,
        data.ended_at || null,
        durationMinutes,
        data.billable,
        data.hourly_rate ?? null,
      ]
    );

    res.status(201).json({ timeEntry: mapTimeEntry(result.rows[0]) });
  } catch (error) {
    console.error('[Jobs] POST /:id/time-entries error:', error);
    res.status(500).json({ error: 'Failed to log time entry' });
  }
});

// GET /api/jobs/:id/time-entries
router.get('/:id/time-entries', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id: jobId } = req.params;

    const job = await db.query(
      'SELECT id FROM jobs WHERE id = $1 AND organisation_id = $2',
      [jobId, organizationId]
    );
    if (job.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const result = await db.query(
      `SELECT te.*, u.name AS user_name
       FROM job_time_entries te
       LEFT JOIN users u ON u.id = te.user_id
       WHERE te.job_id = $1
       ORDER BY te.created_at DESC`,
      [jobId]
    );

    const totalMinutes = result.rows.reduce((acc, r) => acc + parseInt(r.duration_minutes, 10), 0);

    res.json({
      timeEntries:  result.rows.map(mapTimeEntry),
      totalMinutes,
    });
  } catch (error) {
    console.error('[Jobs] GET /:id/time-entries error:', error);
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

// DELETE /api/jobs/:id/time-entries/:entryId
router.delete('/:id/time-entries/:entryId', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id: jobId, entryId } = req.params;

    // Verify job ownership
    const job = await db.query(
      'SELECT id FROM jobs WHERE id = $1 AND organisation_id = $2',
      [jobId, organizationId]
    );
    if (job.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const result = await db.query(
      'DELETE FROM job_time_entries WHERE id = $1 AND job_id = $2 RETURNING id',
      [entryId, jobId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    res.json({ message: 'Time entry deleted' });
  } catch (error) {
    console.error('[Jobs] DELETE /:id/time-entries/:entryId error:', error);
    res.status(500).json({ error: 'Failed to delete time entry' });
  }
});

// =============================================================================
// Parts
// =============================================================================

// POST /api/jobs/:id/parts
router.post('/:id/parts', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { userId } = req.user;
    const { id: jobId } = req.params;

    const job = await db.query(
      'SELECT id FROM jobs WHERE id = $1 AND organisation_id = $2',
      [jobId, organizationId]
    );
    if (job.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const parsed = createPartSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    const data = parsed.data;

    const result = await db.query(
      `INSERT INTO job_parts
         (job_id, organisation_id, product_id, description, quantity, unit,
          unit_cost, unit_price, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        jobId,
        organizationId,
        data.product_id || null,
        data.description,
        data.quantity,
        data.unit || null,
        data.unit_cost ?? null,
        data.unit_price ?? null,
        userId,
      ]
    );

    res.status(201).json({ part: mapPart(result.rows[0]) });
  } catch (error) {
    console.error('[Jobs] POST /:id/parts error:', error);
    res.status(500).json({ error: 'Failed to add part' });
  }
});

// GET /api/jobs/:id/parts
router.get('/:id/parts', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id: jobId } = req.params;

    const job = await db.query(
      'SELECT id FROM jobs WHERE id = $1 AND organisation_id = $2',
      [jobId, organizationId]
    );
    if (job.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const result = await db.query(
      `SELECT * FROM job_parts WHERE job_id = $1 ORDER BY created_at ASC`,
      [jobId]
    );

    const totalCost  = result.rows.reduce((a, r) => a + (parseFloat(r.quantity) * (parseFloat(r.unit_cost)  || 0)), 0);
    const totalValue = result.rows.reduce((a, r) => a + (parseFloat(r.quantity) * (parseFloat(r.unit_price) || 0)), 0);

    res.json({
      parts:      result.rows.map(mapPart),
      totalCost:  Math.round(totalCost  * 100) / 100,
      totalValue: Math.round(totalValue * 100) / 100,
    });
  } catch (error) {
    console.error('[Jobs] GET /:id/parts error:', error);
    res.status(500).json({ error: 'Failed to fetch parts' });
  }
});

// DELETE /api/jobs/:id/parts/:partId
router.delete('/:id/parts/:partId', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id: jobId, partId } = req.params;

    const job = await db.query(
      'SELECT id FROM jobs WHERE id = $1 AND organisation_id = $2',
      [jobId, organizationId]
    );
    if (job.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const result = await db.query(
      'DELETE FROM job_parts WHERE id = $1 AND job_id = $2 RETURNING id',
      [partId, jobId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Part not found' });
    }

    res.json({ message: 'Part deleted' });
  } catch (error) {
    console.error('[Jobs] DELETE /:id/parts/:partId error:', error);
    res.status(500).json({ error: 'Failed to delete part' });
  }
});

module.exports = router;
