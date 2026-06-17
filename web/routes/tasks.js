const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { query, getOrgContext } = require('@worktrackr/shared/db');

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  assignedUserId: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),               // 'YYYY-MM-DD' or null
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['open', 'done']).default('open'),
});

function mapTask(r) {
  return {
    id: r.id,
    title: r.title,
    description: r.description || '',
    contactId: r.contact_id,
    companyName: r.company_name || null,
    assignedUserId: r.assigned_user_id,
    assigneeName: r.assignee_name || null,
    dueDate: r.due_date,
    priority: r.priority,
    status: r.status,
    completedAt: r.completed_at,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const SELECT = `
  SELECT t.*, c.name AS company_name, u.name AS assignee_name
  FROM tasks t
  LEFT JOIN contacts c ON c.id = t.contact_id
  LEFT JOIN users u ON u.id = t.assigned_user_id
`;

// GET /api/tasks  — filters: ?status=open|done  ?mine=1  ?assigneeId=  ?contactId=
router.get('/', async (req, res) => {
  try {
    const { organizationId } = await getOrgContext(req.user.userId);
    const conditions = ['t.organisation_id = $1'];
    const params = [organizationId];
    if (req.query.status) { params.push(req.query.status); conditions.push(`t.status = $${params.length}`); }
    if (req.query.mine) { params.push(req.user.userId); conditions.push(`t.assigned_user_id = $${params.length}`); }
    if (req.query.assigneeId) { params.push(req.query.assigneeId); conditions.push(`t.assigned_user_id = $${params.length}`); }
    if (req.query.contactId) { params.push(req.query.contactId); conditions.push(`t.contact_id = $${params.length}`); }

    const result = await query(
      `${SELECT} WHERE ${conditions.join(' AND ')}
       ORDER BY (t.status = 'done'), t.due_date NULLS LAST, t.created_at DESC`,
      params
    );
    res.json(result.rows.map(mapTask));
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  try {
    const { organizationId } = await getOrgContext(req.user.userId);
    const data = taskSchema.parse(req.body);
    const ins = await query(
      `INSERT INTO tasks
         (organisation_id, title, description, contact_id, assigned_user_id, due_date, priority, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [
        organizationId,
        data.title,
        data.description ?? null,
        data.contactId ?? null,
        data.assignedUserId ?? null,
        data.dueDate || null,
        data.priority,
        data.status,
        req.user.userId,
      ]
    );
    const row = await query(`${SELECT} WHERE t.id = $1`, [ins.rows[0].id]);
    res.status(201).json(mapTask(row.rows[0]));
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Invalid task', details: err.errors });
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /api/tasks/:id  — partial update; toggling status sets/clears completed_at
router.put('/:id', async (req, res) => {
  try {
    const { organizationId } = await getOrgContext(req.user.userId);
    const { id } = req.params;
    const check = await query('SELECT status FROM tasks WHERE id = $1 AND organisation_id = $2', [id, organizationId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const data = taskSchema.partial().parse(req.body);
    const present = new Set(Object.keys(req.body));
    const fields = [];
    const values = [];
    let i = 1;
    const set = (col, val) => { fields.push(`${col} = $${i++}`); values.push(val); };

    if (present.has('title')) set('title', data.title);
    if (present.has('description')) set('description', data.description ?? null);
    if (present.has('contactId')) set('contact_id', data.contactId ?? null);
    if (present.has('assignedUserId')) set('assigned_user_id', data.assignedUserId ?? null);
    if (present.has('dueDate')) set('due_date', data.dueDate || null);
    if (present.has('priority')) set('priority', data.priority);
    if (present.has('status')) {
      set('status', data.status);
      fields.push(`completed_at = ${data.status === 'done' ? 'NOW()' : 'NULL'}`);
    }
    fields.push('updated_at = NOW()');

    values.push(id, organizationId);
    await query(`UPDATE tasks SET ${fields.join(', ')} WHERE id = $${i++} AND organisation_id = $${i}`, values);

    const row = await query(`${SELECT} WHERE t.id = $1`, [id]);
    res.json(mapTask(row.rows[0]));
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Invalid task', details: err.errors });
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const { organizationId } = await getOrgContext(req.user.userId);
    const del = await query('DELETE FROM tasks WHERE id = $1 AND organisation_id = $2', [req.params.id, organizationId]);
    if (del.rowCount === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
