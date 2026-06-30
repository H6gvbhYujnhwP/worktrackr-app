// web/routes/sales-permissions.js
// Per-user Sales access control. Mounted at /api/sales-permissions
// (authenticateToken applied at mount).
//
//   GET /me            — the logged-in user's effective Sales permissions
//                        (what the app uses to show/hide Sales areas).
//   GET /:userId       — a user's effective permissions (admin only; for the
//                        Users → edit screen).
//   PUT /:userId       — set a user's explicit permissions (admin only).
//
// Effective permissions: admins/managers/owner are always unrestricted (full
// access, can't be locked out). For everyone else, an explicit saved row wins;
// with no row we fall back to defaults derived from their role, so existing
// staff keep what they can see today until an admin tightens it.
const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { query, getOrgContext } = require('@worktrackr/shared/db');

// The controllable Sales elements. Keep in sync with the Users-screen toggles
// and (next batch) the server-side enforcement on each Sales route.
const ELEMENTS = ['companies', 'quotes', 'orders', 'calendar', 'figures', 'commission_rules'];

const isAdmin = (ctx) => ctx.type === 'partner_admin' || ctx.role === 'admin';
const isUnrestrictedRole = (role, type) =>
  type === 'partner_admin' || ['admin', 'manager', 'owner'].includes(role);

const allTrue = () => Object.fromEntries(ELEMENTS.map((k) => [k, true]));
const allFalse = () => Object.fromEntries(ELEMENTS.map((k) => [k, false]));

// Defaults when a user has no explicit permissions row yet — mirror current
// behaviour so nobody gains/loses access on rollout:
//   • engineers: delivery-only → no Sales
//   • staff / salesman: the four Sales tabs + figures, but not commission rules
//   • admin/manager/owner: handled separately (always unrestricted)
function defaultPerms(role) {
  if (role === 'engineer') return allFalse();
  return { companies: true, quotes: true, orders: true, calendar: true, figures: true, commission_rules: false };
}

// Normalise a stored/explicit perms object to exactly the known ELEMENTS
// (missing keys → false, unknown keys dropped).
function normalise(perms) {
  const out = {};
  for (const k of ELEMENTS) out[k] = !!(perms && perms[k]);
  return out;
}

async function getRow(organizationId, userId) {
  const r = await query(
    'SELECT perms FROM user_sales_permissions WHERE organisation_id = $1 AND user_id = $2',
    [organizationId, userId]
  );
  return r.rows[0] || null;
}

// Effective permissions for a target user given their role.
async function effectiveFor(organizationId, userId, role, type) {
  if (isUnrestrictedRole(role, type)) return { unrestricted: true, perms: allTrue() };
  const row = await getRow(organizationId, userId);
  const perms = row ? normalise(row.perms) : defaultPerms(role);
  return { unrestricted: false, perms };
}

// ── GET /me ──────────────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const eff = await effectiveFor(ctx.organizationId, req.user.userId, ctx.role, ctx.type);
    res.json({ elements: ELEMENTS, ...eff });
  } catch (err) {
    console.error('Error fetching my sales permissions:', err);
    res.status(500).json({ error: 'Failed to load permissions' });
  }
});

// ── GET /:userId  (admin) ────────────────────────────────────────────────────
router.get('/:userId', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    if (!isAdmin(ctx)) return res.status(403).json({ error: 'Admin access required' });
    const m = await query(
      'SELECT role FROM memberships WHERE organisation_id = $1 AND user_id = $2',
      [ctx.organizationId, req.params.userId]
    );
    if (m.rows.length === 0) return res.status(404).json({ error: 'User not in organisation' });
    const role = m.rows[0].role;
    const eff = await effectiveFor(ctx.organizationId, req.params.userId, role, null);
    res.json({ elements: ELEMENTS, role, ...eff });
  } catch (err) {
    console.error('Error fetching sales permissions:', err);
    res.status(500).json({ error: 'Failed to load permissions' });
  }
});

// ── PUT /:userId  (admin) ────────────────────────────────────────────────────
const putSchema = z.object({
  perms: z.record(z.boolean()),
});

router.put('/:userId', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    if (!isAdmin(ctx)) return res.status(403).json({ error: 'Admin access required' });
    const organizationId = ctx.organizationId;
    const data = putSchema.parse(req.body);

    const m = await query(
      'SELECT role FROM memberships WHERE organisation_id = $1 AND user_id = $2',
      [organizationId, req.params.userId]
    );
    if (m.rows.length === 0) return res.status(404).json({ error: 'User not in organisation' });

    const perms = normalise(data.perms);
    await query(
      `INSERT INTO user_sales_permissions (organisation_id, user_id, perms, updated_at)
       VALUES ($1,$2,$3::jsonb,NOW())
       ON CONFLICT (organisation_id, user_id)
       DO UPDATE SET perms = EXCLUDED.perms, updated_at = NOW()`,
      [organizationId, req.params.userId, JSON.stringify(perms)]
    );
    const eff = await effectiveFor(organizationId, req.params.userId, m.rows[0].role, null);
    res.json({ elements: ELEMENTS, role: m.rows[0].role, ...eff });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Invalid permissions', details: err.errors });
    console.error('Error saving sales permissions:', err);
    res.status(500).json({ error: 'Failed to save permissions' });
  }
});

module.exports = router;
module.exports.ELEMENTS = ELEMENTS;
module.exports.effectiveFor = effectiveFor;
