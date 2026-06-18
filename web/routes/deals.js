// web/routes/deals.js
// Phase 6 (slim) — Deals / opportunities. A deal is one potential sale on a
// company. Lightweight CRUD + stage changes; the "forecast" is just the sum of
// open deal values (computed by the list consumer). Mounted at /api/deals.
const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { query, getOrgContext } = require('@worktrackr/shared/db');

const num = (v) => (v === null || v === undefined ? 0 : Number(v) || 0);
const STAGES = ['open', 'in_progress', 'won', 'lost'];

const dealSchema = z.object({
  contactId: z.string().uuid().optional().nullable(),
  title: z.string().min(1),
  value: z.number().default(0),
  stage: z.enum(['open', 'in_progress', 'won', 'lost']).default('open'),
  expectedCloseDate: z.string().optional().nullable(),
  ownerUserId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const mapDeal = (r) => ({
  id: r.id,
  contactId: r.contact_id,
  companyName: r.company_name || null,
  title: r.title,
  value: num(r.value),
  stage: r.stage,
  expectedCloseDate: r.expected_close_date,
  ownerUserId: r.owner_user_id,
  ownerName: r.owner_name || null,
  notes: r.notes || '',
  wonAt: r.won_at,
  lostAt: r.lost_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const SELECT = `
  SELECT d.*, co.name AS company_name, ow.name AS owner_name
  FROM deals d
  LEFT JOIN contacts co ON co.id = d.contact_id
  LEFT JOIN users ow ON ow.id = d.owner_user_id
`;

async function fetchDeal(id, orgId) {
  const r = await query(`${SELECT} WHERE d.id = $1 AND d.organisation_id = $2`, [id, orgId]);
  return r.rows.length ? mapDeal(r.rows[0]) : null;
}

// GET /api/deals  — ?stage=  ?contactId=  ?mine=1
router.get('/', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const conds = ['d.organisation_id = $1'];
    const params = [ctx.organizationId];
    if (req.query.stage && STAGES.includes(req.query.stage)) { params.push(req.query.stage); conds.push(`d.stage = $${params.length}`); }
    if (req.query.contactId) { params.push(req.query.contactId); conds.push(`d.contact_id = $${params.length}`); }
    if (req.query.mine) { params.push(req.user.userId); conds.push(`d.owner_user_id = $${params.length}`); }
    const r = await query(`${SELECT} WHERE ${conds.join(' AND ')} ORDER BY d.created_at DESC`, params);
    res.json(r.rows.map(mapDeal));
  } catch (e) { console.error('list deals', e); res.status(500).json({ error: 'Failed to list deals' }); }
});

// GET /api/deals/:id
router.get('/:id', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const deal = await fetchDeal(req.params.id, ctx.organizationId);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    res.json(deal);
  } catch (e) { console.error('get deal', e); res.status(500).json({ error: 'Failed to fetch deal' }); }
});

// POST /api/deals  — owner defaults to creator
router.post('/', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const d = dealSchema.parse(req.body);
    const stamp = d.stage === 'won' ? ', won_at = NOW()' : d.stage === 'lost' ? ', lost_at = NOW()' : '';
    const ins = await query(
      `INSERT INTO deals (organisation_id, contact_id, title, value, stage, expected_close_date, owner_user_id, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [ctx.organizationId, d.contactId ?? null, d.title, d.value ?? 0, d.stage, d.expectedCloseDate || null, d.ownerUserId ?? req.user.userId, d.notes ?? null, req.user.userId]
    );
    if (stamp) await query(`UPDATE deals SET updated_at = NOW()${stamp} WHERE id = $1`, [ins.rows[0].id]);
    res.status(201).json(await fetchDeal(ins.rows[0].id, ctx.organizationId));
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Invalid deal', details: e.errors });
    console.error('create deal', e); res.status(500).json({ error: 'Failed to create deal' });
  }
});

// PUT /api/deals/:id  — edit (stamps won_at/lost_at when stage moves there)
router.put('/:id', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const cur = await query('SELECT stage FROM deals WHERE id = $1 AND organisation_id = $2', [req.params.id, ctx.organizationId]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Deal not found' });
    const d = dealSchema.parse(req.body);
    const present = new Set(Object.keys(req.body));
    const fields = []; const values = []; let i = 1;
    const set = (col, val) => { fields.push(`${col} = $${i++}`); values.push(val); };
    if (present.has('contactId')) set('contact_id', d.contactId ?? null);
    if (present.has('title')) set('title', d.title);
    if (present.has('value')) set('value', d.value ?? 0);
    if (present.has('expectedCloseDate')) set('expected_close_date', d.expectedCloseDate || null);
    if (present.has('ownerUserId')) set('owner_user_id', d.ownerUserId ?? null);
    if (present.has('notes')) set('notes', d.notes ?? null);
    if (present.has('stage')) {
      set('stage', d.stage);
      if (d.stage === 'won' && cur.rows[0].stage !== 'won') fields.push('won_at = NOW()');
      if (d.stage === 'lost' && cur.rows[0].stage !== 'lost') fields.push('lost_at = NOW()');
    }
    fields.push('updated_at = NOW()');
    values.push(req.params.id, ctx.organizationId);
    await query(`UPDATE deals SET ${fields.join(', ')} WHERE id = $${i++} AND organisation_id = $${i}`, values);
    res.json(await fetchDeal(req.params.id, ctx.organizationId));
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Invalid deal', details: e.errors });
    console.error('update deal', e); res.status(500).json({ error: 'Failed to update deal' });
  }
});

// DELETE /api/deals/:id
router.delete('/:id', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const r = await query('DELETE FROM deals WHERE id = $1 AND organisation_id = $2 RETURNING id', [req.params.id, ctx.organizationId]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Deal not found' });
    res.json({ success: true });
  } catch (e) { console.error('delete deal', e); res.status(500).json({ error: 'Failed to delete deal' }); }
});

module.exports = router;
