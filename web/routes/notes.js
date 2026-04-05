// web/routes/notes.js
// Personal Notes (private per user) and Company Shared Notes (all org staff)

const express = require('express');
const router = express.Router();
const { z } = require('zod');
const db = require('../../shared/db');

// ── Validation schemas ──────────────────────────────────────────────────────

const personalNoteSchema = z.object({
  title:    z.string().max(500).optional().default(''),
  body:     z.string().optional().default(''),
  pinned:   z.boolean().optional().default(false),
  due_date: z.string().datetime().nullable().optional(),
  completed: z.boolean().optional(),
});

const sharedNoteSchema = z.object({
  title:     z.string().max(500).optional().default(''),
  body:      z.string().optional().default(''),
  category:  z.string().max(255).nullable().optional(),
  note_type: z.enum(['note', 'knowledge', 'announcement']).optional().default('note'),
  pinned:    z.boolean().optional().default(false),
});

// ═══════════════════════════════════════════════════════════════════════════
// PERSONAL NOTES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/notes/personal — list current user's notes
router.get('/personal', async (req, res) => {
  try {
    const { userId } = req.user;
    const { organizationId } = req.orgContext;

    const result = await db.query(
      `SELECT * FROM personal_notes
       WHERE user_id = $1 AND organisation_id = $2
       ORDER BY pinned DESC, due_date ASC NULLS LAST, created_at DESC`,
      [userId, organizationId]
    );

    res.json({ notes: result.rows });
  } catch (err) {
    console.error('[Notes] GET personal error:', err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// POST /api/notes/personal — create personal note
router.post('/personal', async (req, res) => {
  try {
    const { userId } = req.user;
    const { organizationId } = req.orgContext;
    const data = personalNoteSchema.parse(req.body);

    const result = await db.query(
      `INSERT INTO personal_notes
         (user_id, organisation_id, title, body, pinned, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, organizationId, data.title, data.body, data.pinned, data.due_date ?? null]
    );

    res.status(201).json({ note: result.rows[0] });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Invalid data', details: err.errors });
    console.error('[Notes] POST personal error:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PATCH /api/notes/personal/:id — update personal note
router.patch('/personal/:id', async (req, res) => {
  try {
    const { userId } = req.user;
    const { organizationId } = req.orgContext;
    const { id } = req.params;

    // Ownership check
    const existing = await db.query(
      'SELECT id FROM personal_notes WHERE id = $1 AND user_id = $2 AND organisation_id = $3',
      [id, userId, organizationId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Note not found' });

    const data = personalNoteSchema.partial().parse(req.body);

    // Build SET clause dynamically from provided keys only
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.title     !== undefined) { fields.push(`title = $${idx++}`);      values.push(data.title); }
    if (data.body      !== undefined) { fields.push(`body = $${idx++}`);       values.push(data.body); }
    if (data.pinned    !== undefined) { fields.push(`pinned = $${idx++}`);     values.push(data.pinned); }
    if (data.due_date  !== undefined) { fields.push(`due_date = $${idx++}`);   values.push(data.due_date ?? null); }
    if (data.completed !== undefined) {
      fields.push(`completed = $${idx++}`);      values.push(data.completed);
      fields.push(`completed_at = $${idx++}`);   values.push(data.completed ? new Date().toISOString() : null);
    }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE personal_notes SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    res.json({ note: result.rows[0] });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Invalid data', details: err.errors });
    console.error('[Notes] PATCH personal error:', err);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// DELETE /api/notes/personal/:id
router.delete('/personal/:id', async (req, res) => {
  try {
    const { userId } = req.user;
    const { organizationId } = req.orgContext;
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM personal_notes WHERE id = $1 AND user_id = $2 AND organisation_id = $3 RETURNING id',
      [id, userId, organizationId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });

    res.json({ deleted: id });
  } catch (err) {
    console.error('[Notes] DELETE personal error:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SHARED NOTES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/notes/shared — list all shared notes for the org
router.get('/shared', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { category, note_type } = req.query;

    let where = 'WHERE sn.organisation_id = $1';
    const params = [organizationId];
    let p = 2;

    if (category)  { where += ` AND sn.category = $${p++}`;   params.push(category); }
    if (note_type) { where += ` AND sn.note_type = $${p++}`;  params.push(note_type); }

    const result = await db.query(
      `SELECT sn.*,
              u.name  AS author_name,
              u2.name AS last_edited_by_name
       FROM shared_notes sn
       JOIN users u  ON sn.author_id = u.id
       LEFT JOIN users u2 ON sn.last_edited_by = u2.id
       ${where}
       ORDER BY sn.pinned DESC, sn.note_type = 'announcement' DESC, sn.updated_at DESC`,
      params
    );

    // Return distinct categories for filter UI
    const catResult = await db.query(
      `SELECT DISTINCT category FROM shared_notes
       WHERE organisation_id = $1 AND category IS NOT NULL
       ORDER BY category`,
      [organizationId]
    );

    res.json({
      notes: result.rows,
      categories: catResult.rows.map(r => r.category),
    });
  } catch (err) {
    console.error('[Notes] GET shared error:', err);
    res.status(500).json({ error: 'Failed to fetch shared notes' });
  }
});

// POST /api/notes/shared — create shared note
router.post('/shared', async (req, res) => {
  try {
    const { userId } = req.user;
    const { organizationId } = req.orgContext;
    
    const data = sharedNoteSchema.parse(req.body);

    // Only admins/owners can post announcements or pin
    const { role } = req.orgContext; const isAdmin = role === 'admin' || role === 'owner';
    const noteType = (data.note_type === 'announcement' && !isAdmin) ? 'note' : data.note_type;
    const pinned   = data.pinned && isAdmin ? true : false;

    const result = await db.query(
      `INSERT INTO shared_notes
         (organisation_id, author_id, last_edited_by, title, body, category, note_type, pinned)
       VALUES ($1, $2, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [organizationId, userId, data.title, data.body, data.category ?? null, noteType, pinned]
    );

    // Fetch with author name
    const full = await db.query(
      `SELECT sn.*, u.name AS author_name, u.name AS last_edited_by_name
       FROM shared_notes sn JOIN users u ON sn.author_id = u.id
       WHERE sn.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ note: full.rows[0] });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Invalid data', details: err.errors });
    console.error('[Notes] POST shared error:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PATCH /api/notes/shared/:id — update shared note (saves version history)
router.patch('/shared/:id', async (req, res) => {
  try {
    const { userId } = req.user;
    const { organizationId } = req.orgContext;
    const { id } = req.params;
    const { role } = req.orgContext; const isAdmin = role === 'admin' || role === 'owner';

    const existing = await db.query(
      'SELECT * FROM shared_notes WHERE id = $1 AND organisation_id = $2',
      [id, organizationId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Note not found' });

    const current = existing.rows[0];
    const data = sharedNoteSchema.partial().parse(req.body);

    // Save version snapshot before update (if body or title changed)
    const bodyChanging  = data.body  !== undefined && data.body  !== current.body;
    const titleChanging = data.title !== undefined && data.title !== current.title;
    if (bodyChanging || titleChanging) {
      await db.query(
        `INSERT INTO shared_note_versions (note_id, edited_by, title, body)
         VALUES ($1, $2, $3, $4)`,
        [id, userId, current.title, current.body]
      );
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (data.title     !== undefined) { fields.push(`title = $${idx++}`);      values.push(data.title); }
    if (data.body      !== undefined) { fields.push(`body = $${idx++}`);       values.push(data.body); }
    if (data.category  !== undefined) { fields.push(`category = $${idx++}`);   values.push(data.category ?? null); }
    if (data.note_type !== undefined) {
      const t = (data.note_type === 'announcement' && !isAdmin) ? 'note' : data.note_type;
      fields.push(`note_type = $${idx++}`);
      values.push(t);
    }
    if (data.pinned !== undefined) {
      fields.push(`pinned = $${idx++}`);
      values.push(isAdmin ? data.pinned : current.pinned);
    }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    fields.push(`last_edited_by = $${idx++}`, `updated_at = NOW()`);
    values.push(userId, id);

    const result = await db.query(
      `UPDATE shared_notes SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    const full = await db.query(
      `SELECT sn.*, u.name AS author_name, u2.name AS last_edited_by_name
       FROM shared_notes sn
       JOIN users u ON sn.author_id = u.id
       LEFT JOIN users u2 ON sn.last_edited_by = u2.id
       WHERE sn.id = $1`,
      [result.rows[0].id]
    );

    res.json({ note: full.rows[0] });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Invalid data', details: err.errors });
    console.error('[Notes] PATCH shared error:', err);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// DELETE /api/notes/shared/:id — own notes; admins can delete any
router.delete('/shared/:id', async (req, res) => {
  try {
    const { userId } = req.user;
    const { organizationId } = req.orgContext;
    const { id } = req.params;
    const { role } = req.orgContext; const isAdmin = role === 'admin' || role === 'owner';

    const existing = await db.query(
      'SELECT author_id FROM shared_notes WHERE id = $1 AND organisation_id = $2',
      [id, organizationId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    if (!isAdmin && existing.rows[0].author_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own notes' });
    }

    await db.query('DELETE FROM shared_notes WHERE id = $1', [id]);
    res.json({ deleted: id });
  } catch (err) {
    console.error('[Notes] DELETE shared error:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// GET /api/notes/shared/:id/versions — version history
router.get('/shared/:id/versions', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;

    // Verify note belongs to this org
    const noteCheck = await db.query(
      'SELECT id FROM shared_notes WHERE id = $1 AND organisation_id = $2',
      [id, organizationId]
    );
    if (noteCheck.rows.length === 0) return res.status(404).json({ error: 'Note not found' });

    const result = await db.query(
      `SELECT v.*, u.name AS edited_by_name
       FROM shared_note_versions v
       JOIN users u ON v.edited_by = u.id
       WHERE v.note_id = $1
       ORDER BY v.edited_at DESC`,
      [id]
    );

    res.json({ versions: result.rows });
  } catch (err) {
    console.error('[Notes] GET versions error:', err);
    res.status(500).json({ error: 'Failed to fetch version history' });
  }
});

module.exports = router;
