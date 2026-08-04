// web/routes/saved-searches.js
// Shared, named filter combinations for the Sales → Companies list.
// Mounted at /api/saved-searches (authenticateToken applied at mount).
//
//   GET    /?scope=companies  — every saved search for the caller's organisation
//   POST   /                  — create, or overwrite one that already has that name
//   DELETE /:id               — remove one
//
// Sharing boundary: the ORGANISATION. There is no separate "sales team" grouping
// in WorkTrackr, and engineers can't reach the Sales section at all, so the
// organisation is the natural (and only) boundary.
//
// Permissions, as agreed with the owner:
//   - anyone in the organisation may CREATE a saved search
//   - only its CREATOR, or a manager/admin/owner, may DELETE it, so a colleague
//     can't wipe someone else's shared list
//
// No money figures are stored or returned here, so nothing in this file needs
// role-gating for commission/profit/pay.
const express = require('express');
const { z } = require('zod');
const { query, getOrgContext } = require('@worktrackr/shared/db');

const router = express.Router();

// Mirrors isUnrestrictedRole() in routes/sales-permissions.js — kept consistent
// so "manager" means the same thing everywhere.
const isManagerish = (ctx) =>
  ctx?.type === 'partner_admin' || ['admin', 'manager', 'owner'].includes(ctx?.role);

const MAX_NAME = 60;
const MAX_SUMMARY = 300;

const saveSchema = z.object({
  scope: z.string().min(1).max(40).optional(),
  name: z.string().trim().min(1, 'Please give this search a name').max(MAX_NAME),
  // Schemaless on purpose: the screen owns the filter shape, and it rebuilds
  // whatever it reads against its CURRENT groups, so an old saved search can
  // never break the page. Kept to a plain object to avoid storing junk.
  filters: z.record(z.any()).default({}),
  summary: z.string().max(MAX_SUMMARY).optional().default(''),
});

function mapRow(row) {
  return {
    id: row.id,
    scope: row.scope,
    name: row.name,
    filters: row.filters || {},
    summary: row.summary || '',
    createdBy: row.created_by,
    createdByName: row.created_by_name || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── list ────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const organizationId = ctx.organizationId;
    if (!organizationId) return res.json({ savedSearches: [] });

    const scope = String(req.query.scope || 'companies');
    const result = await query(
      `SELECT s.*, u.name AS created_by_name
         FROM saved_searches s
         LEFT JOIN users u ON u.id = s.created_by
        WHERE s.organisation_id = $1 AND s.scope = $2
        ORDER BY s.name ASC`,
      [organizationId, scope]
    );
    res.json({ savedSearches: result.rows.map(mapRow) });
  } catch (e) {
    console.error('[saved-searches] list failed', e);
    res.status(500).json({ error: 'Could not load saved searches' });
  }
});

// ── create / overwrite ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const parsed = saveSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message || 'Invalid input';
      return res.status(400).json({ error: msg });
    }
    const { name, filters, summary } = parsed.data;
    const scope = parsed.data.scope || 'companies';

    const ctx = await getOrgContext(req.user.userId);
    const organizationId = ctx.organizationId;
    if (!organizationId) return res.status(400).json({ error: 'No organisation' });

    // Refuse to save an empty search — it would just be "show everything" under
    // a name, which is confusing in a shared list.
    const hasAnything = Object.values(filters || {}).some((v) =>
      Array.isArray(v) ? v.length > 0 : String(v || '').trim() !== ''
    );
    if (!hasAnything) {
      return res.status(400).json({ error: 'Add at least one filter before saving' });
    }

    // Same name (case-insensitively) overwrites, rather than erroring or
    // creating a near-duplicate. The unique index backs this up.
    const result = await query(
      `INSERT INTO saved_searches (organisation_id, scope, name, filters, summary, created_by)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       ON CONFLICT (organisation_id, scope, lower(name))
       DO UPDATE SET filters = EXCLUDED.filters,
                     summary = EXCLUDED.summary,
                     name    = EXCLUDED.name,
                     updated_at = NOW()
       RETURNING *`,
      [organizationId, scope, name, JSON.stringify(filters || {}), summary || '', req.user.userId]
    );

    const row = result.rows[0];
    const withName = await query(
      'SELECT s.*, u.name AS created_by_name FROM saved_searches s LEFT JOIN users u ON u.id = s.created_by WHERE s.id = $1',
      [row.id]
    );
    res.json({ savedSearch: mapRow(withName.rows[0] || row) });
  } catch (e) {
    console.error('[saved-searches] save failed', e);
    res.status(500).json({ error: 'Could not save this search' });
  }
});

// ── delete ──────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const organizationId = ctx.organizationId;
    if (!organizationId) return res.status(400).json({ error: 'No organisation' });

    const found = await query(
      'SELECT created_by FROM saved_searches WHERE id = $1 AND organisation_id = $2',
      [req.params.id, organizationId]
    );
    if (found.rows.length === 0) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    const isOwner = String(found.rows[0].created_by || '') === String(req.user.userId);
    if (!isOwner && !isManagerish(ctx)) {
      return res.status(403).json({ error: 'Only the person who saved this, or a manager, can delete it' });
    }

    await query('DELETE FROM saved_searches WHERE id = $1 AND organisation_id = $2', [
      req.params.id,
      organizationId,
    ]);
    res.json({ ok: true });
  } catch (e) {
    console.error('[saved-searches] delete failed', e);
    res.status(500).json({ error: 'Could not delete this search' });
  }
});

module.exports = router;
