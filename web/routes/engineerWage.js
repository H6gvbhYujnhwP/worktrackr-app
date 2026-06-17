const express = require('express');
const router = express.Router();
const { query, getOrgContext } = require('@worktrackr/shared/db');

const isManager = (ctx) => ctx.type === 'partner_admin' || ['admin', 'manager', 'owner'].includes(ctx.role);
const num = (v) => (v === null || v === undefined ? 0 : Number(v) || 0);

const DEFAULTS = { stageMonths: 0, dealCountTarget: 0 };
async function loadSettings(orgId) {
  const r = await query('SELECT config FROM engineer_wage_settings WHERE organisation_id = $1', [orgId]);
  return { ...DEFAULTS, ...(r.rows[0]?.config || {}) };
}

function mapRecord(r) {
  return {
    id: r.id,
    engineerUserId: r.engineer_user_id,
    engineerName: r.engineer_name || null,
    stageNo: r.stage_no,
    startedAt: r.started_at,
    currentRate: num(r.current_rate),
    dealsDelivered: r.deals_delivered,
    dealTarget: r.deal_target,
    riseAmount: num(r.rise_amount),
    newRate: num(r.new_rate),
    status: r.status,
    note: r.note || '',
    confirmedAt: r.confirmed_at,
  };
}

// GET /settings  (read by both screens)
router.get('/settings', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    res.json({ config: await loadSettings(ctx.organizationId), canEdit: isManager(ctx) });
  } catch (e) { console.error('eng wage settings get', e); res.status(500).json({ error: 'Failed to load settings' }); }
});

// PUT /settings  (manager)
router.put('/settings', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    if (!isManager(ctx)) return res.status(403).json({ error: 'Manager access required' });
    const incoming = req.body?.config || {};
    const clean = {
      stageMonths: Math.max(0, parseInt(incoming.stageMonths, 10) || 0),
      dealCountTarget: Math.max(0, parseInt(incoming.dealCountTarget, 10) || 0),
    };
    await query(
      `INSERT INTO engineer_wage_settings (organisation_id, config, updated_by, updated_at)
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT (organisation_id) DO UPDATE SET config = EXCLUDED.config, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [ctx.organizationId, JSON.stringify(clean), req.user.userId]
    );
    res.json({ config: clean });
  } catch (e) { console.error('eng wage settings put', e); res.status(500).json({ error: 'Failed to save settings' }); }
});

// GET /candidates  (manager) — org members for the engineer picker
router.get('/candidates', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    if (!isManager(ctx)) return res.status(403).json({ error: 'Manager access required' });
    const r = await query(
      `SELECT u.id, u.name FROM users u JOIN memberships m ON m.user_id = u.id
       WHERE m.organisation_id = $1 ORDER BY u.name`,
      [ctx.organizationId]
    );
    res.json({ users: r.rows });
  } catch (e) { console.error('eng wage candidates', e); res.status(500).json({ error: 'Failed to load users' }); }
});

// GET /me — the logged-in user's current stage + history (read-only, no profit)
router.get('/me', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const cfg = await loadSettings(ctx.organizationId);
    const rows = await query(
      `SELECT * FROM engineer_wage_records WHERE organisation_id = $1 AND engineer_user_id = $2 ORDER BY stage_no DESC`,
      [ctx.organizationId, req.user.userId]
    );
    const current = rows.rows.find((r) => r.status === 'in_progress') || null;
    const history = rows.rows.filter((r) => r.status === 'confirmed').map(mapRecord);
    res.json({ config: cfg, current: current ? mapRecord(current) : null, history });
  } catch (e) { console.error('eng wage me', e); res.status(500).json({ error: 'Failed to load wage' }); }
});

// GET /  (manager) — every engineer's current stage
router.get('/', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    if (!isManager(ctx)) return res.status(403).json({ error: 'Manager access required' });
    const cfg = await loadSettings(ctx.organizationId);
    const rows = await query(
      `SELECT r.*, u.name AS engineer_name FROM engineer_wage_records r
       JOIN users u ON u.id = r.engineer_user_id
       WHERE r.organisation_id = $1 ORDER BY u.name, r.stage_no DESC`,
      [ctx.organizationId]
    );
    res.json({ config: cfg, records: rows.rows.map(mapRecord) });
  } catch (e) { console.error('eng wage list', e); res.status(500).json({ error: 'Failed to load records' }); }
});

// POST /  (manager) — start a stage for an engineer
router.post('/', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    if (!isManager(ctx)) return res.status(403).json({ error: 'Manager access required' });
    const b = req.body || {};
    if (!b.engineerUserId) return res.status(400).json({ error: 'engineerUserId required' });
    const cfg = await loadSettings(ctx.organizationId);
    const last = await query('SELECT COALESCE(MAX(stage_no),0) AS m FROM engineer_wage_records WHERE organisation_id = $1 AND engineer_user_id = $2', [ctx.organizationId, b.engineerUserId]);
    const stageNo = (last.rows[0].m || 0) + 1;
    const ins = await query(
      `INSERT INTO engineer_wage_records
         (organisation_id, engineer_user_id, stage_no, started_at, current_rate, deal_target)
       VALUES ($1,$2,$3,COALESCE($4, CURRENT_DATE),$5,$6) RETURNING *`,
      [ctx.organizationId, b.engineerUserId, stageNo, b.startedAt || null, num(b.currentRate), b.dealTarget != null ? parseInt(b.dealTarget, 10) : cfg.dealCountTarget]
    );
    res.status(201).json(mapRecord(ins.rows[0]));
  } catch (e) { console.error('eng wage create', e); res.status(500).json({ error: 'Failed to start stage' }); }
});

// PUT /:id  (manager) — update the manual fields
router.put('/:id', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    if (!isManager(ctx)) return res.status(403).json({ error: 'Manager access required' });
    const b = req.body || {};
    const present = new Set(Object.keys(b));
    const fields = []; const values = []; let i = 1;
    const set = (col, val) => { fields.push(`${col} = $${i++}`); values.push(val); };
    if (present.has('dealsDelivered')) set('deals_delivered', Math.max(0, parseInt(b.dealsDelivered, 10) || 0));
    if (present.has('dealTarget')) set('deal_target', Math.max(0, parseInt(b.dealTarget, 10) || 0));
    if (present.has('currentRate')) set('current_rate', num(b.currentRate));
    if (present.has('riseAmount')) set('rise_amount', num(b.riseAmount));
    if (present.has('newRate')) set('new_rate', num(b.newRate));
    if (present.has('note')) set('note', b.note ?? null);
    if (present.has('startedAt')) set('started_at', b.startedAt || null);
    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    values.push(req.params.id, ctx.organizationId);
    const upd = await query(`UPDATE engineer_wage_records SET ${fields.join(', ')} WHERE id = $${i++} AND organisation_id = $${i} RETURNING *`, values);
    if (upd.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(mapRecord(upd.rows[0]));
  } catch (e) { console.error('eng wage update', e); res.status(500).json({ error: 'Failed to update record' }); }
});

// POST /:id/confirm  (manager) — confirm the rise for this stage
router.post('/:id/confirm', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    if (!isManager(ctx)) return res.status(403).json({ error: 'Manager access required' });
    const upd = await query(
      `UPDATE engineer_wage_records SET status = 'confirmed', confirmed_by = $1, confirmed_at = NOW()
       WHERE id = $2 AND organisation_id = $3 RETURNING *`,
      [req.user.userId, req.params.id, ctx.organizationId]
    );
    if (upd.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(mapRecord(upd.rows[0]));
  } catch (e) { console.error('eng wage confirm', e); res.status(500).json({ error: 'Failed to confirm' }); }
});

// DELETE /:id  (manager)
router.delete('/:id', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    if (!isManager(ctx)) return res.status(403).json({ error: 'Manager access required' });
    await query('DELETE FROM engineer_wage_records WHERE id = $1 AND organisation_id = $2', [req.params.id, ctx.organizationId]);
    res.json({ success: true });
  } catch (e) { console.error('eng wage delete', e); res.status(500).json({ error: 'Failed to delete' }); }
});

module.exports = router;
