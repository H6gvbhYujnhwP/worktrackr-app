// web/routes/contact-attachments.js
// Durable file attachments for a company/contact record. Files are stored in
// Postgres (BYTEA) so they survive deploys — no external object storage needed.
// Mounted at /api/contacts, so paths are /api/contacts/:id/attachments[...].
// Every query is scoped to the caller's organisation (multi-tenant safe).

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { query, getOrgContext } = require('@worktrackr/shared/db');

// Keep the file in memory, then store its bytes in the DB. 10 MB cap.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// GET /api/contacts/:id/attachments — list (metadata only, never the bytes)
router.get('/:id/attachments', async (req, res) => {
  try {
    const { organizationId } = await getOrgContext(req.user.userId);
    const r = await query(
      `SELECT a.id, a.filename, a.mime_type, a.size_bytes, a.note, a.created_at,
              u.name AS uploader_name
         FROM contact_attachments a
         LEFT JOIN users u ON u.id = a.uploader_id
        WHERE a.contact_id = $1 AND a.organisation_id = $2
        ORDER BY a.created_at DESC`,
      [req.params.id, organizationId]
    );
    res.json(r.rows);
  } catch (error) {
    console.error('Error listing attachments:', error);
    res.status(500).json({ error: 'Failed to load attachments' });
  }
});

// POST /api/contacts/:id/attachments — upload one file (+ optional note)
router.post('/:id/attachments', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const { organizationId } = await getOrgContext(req.user.userId);

    // Make sure the company belongs to this organisation before storing.
    const owns = await query(
      'SELECT id FROM contacts WHERE id = $1 AND organisation_id = $2',
      [req.params.id, organizationId]
    );
    if (owns.rows.length === 0) return res.status(404).json({ error: 'Company not found' });

    const note = req.body && req.body.note ? String(req.body.note).slice(0, 2000) : null;
    const r = await query(
      `INSERT INTO contact_attachments
         (contact_id, organisation_id, uploader_id, filename, mime_type, size_bytes, note, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, filename, mime_type, size_bytes, note, created_at`,
      [
        req.params.id,
        organizationId,
        req.user.userId,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        note,
        req.file.buffer,
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// GET /api/contacts/:id/attachments/:attId/download — stream the file back
router.get('/:id/attachments/:attId/download', async (req, res) => {
  try {
    const { organizationId } = await getOrgContext(req.user.userId);
    const r = await query(
      `SELECT filename, mime_type, data
         FROM contact_attachments
        WHERE id = $1 AND contact_id = $2 AND organisation_id = $3`,
      [req.params.attId, req.params.id, organizationId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const f = r.rows[0];
    const safeName = String(f.filename || 'file').replace(/"/g, '');
    res.setHeader('Content-Type', f.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.send(f.data);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// DELETE /api/contacts/:id/attachments/:attId
router.delete('/:id/attachments/:attId', async (req, res) => {
  try {
    const { organizationId } = await getOrgContext(req.user.userId);
    const r = await query(
      `DELETE FROM contact_attachments
        WHERE id = $1 AND contact_id = $2 AND organisation_id = $3
        RETURNING id`,
      [req.params.attId, req.params.id, organizationId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: r.rows[0].id });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
