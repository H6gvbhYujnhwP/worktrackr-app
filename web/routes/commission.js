const express = require('express');
const router = express.Router();
const { query, getOrgContext } = require('@worktrackr/shared/db');

const isManager = (ctx) => ctx.type === 'partner_admin' || ['admin', 'manager', 'owner'].includes(ctx.role);
const num = (v) => (v === null || v === undefined ? 0 : Number(v) || 0);

// Neutral defaults — NOTHING about any organisation's scheme is baked in here.
const DEFAULTS = {
  enabled: false,
  oneOffRate: 0,         // % of profit (after the deduction below)
  deductionPerSale: 0,   // £ internal cost subtracted before commission on a standard sale
  financeRate: 0,        // % of order value for 'finance' category
  referralRate: 0,       // % of profit for 'referral' category
  recurringRate: 0,      // % — Contracts (Phase 5); unused until then
  thresholdTurnover: 0,  // £ paid turnover in a period to unlock the bonus (0 = no bonus)
  bonusRate: 0,          // % of period paid profit when threshold met
  periodStartDay: 1,     // day of month the commission period starts (1-28)
};

async function loadConfig(orgId) {
  const r = await query('SELECT config FROM commission_settings WHERE organisation_id = $1', [orgId]);
  const cfg = { ...DEFAULTS, ...(r.rows[0]?.config || {}) };
  cfg.periodStartDay = Math.min(28, Math.max(1, parseInt(cfg.periodStartDay, 10) || 1));
  return cfg;
}

// [start, end) for the commission period, offset months from the current one.
function periodBounds(startDay, offset = 0, ref = new Date()) {
  const day = ref.getUTCDate();
  let y = ref.getUTCFullYear();
  let m = ref.getUTCMonth();
  if (day < startDay) m -= 1;       // we're still in the period that began last month
  m += offset;
  const start = new Date(Date.UTC(y, m, startDay));
  const end = new Date(Date.UTC(y, m + 1, startDay));
  return { start, end };
}
const fmt = (d) => `${d.getUTCDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]}`;
const periodLabel = (b) => `${fmt(b.start)} – ${fmt(b.end)}`;
const inPeriod = (iso, b) => { if (!iso) return false; const t = new Date(iso).getTime(); return t >= b.start.getTime() && t < b.end.getTime(); };

function suggestion(o, cfg) {
  const profit = num(o.total_profit);
  const value = num(o.total_cost) + num(o.total_profit);
  const category = o.commission_category || 'standard';
  let basis = 0, rate = 0;
  if (category === 'finance') { basis = value; rate = cfg.financeRate; }
  else if (category === 'referral') { basis = profit; rate = cfg.referralRate; }
  else { basis = Math.max(profit - cfg.deductionPerSale, 0); rate = cfg.oneOffRate; }
  return { category, basis, rate, suggested: basis * (rate / 100) };
}
const amountOf = (o, cfg) => (o.has_override ? num(o.manual_amount) : suggestion(o, cfg).suggested);

async function userOrders(orgId, userId) {
  const r = await query(
    `SELECT o.id, o.status, o.paid_at, o.created_at, o.commission_category,
            c.name AS company_name,
            COALESCE(l.tc,0) AS total_cost, COALESCE(l.tp,0) AS total_profit,
            ov.manual_amount, (ov.id IS NOT NULL) AS has_override
       FROM orders o
       LEFT JOIN contacts c ON c.id = o.contact_id
       LEFT JOIN (SELECT order_id, SUM(unit_cost*qty) tc, SUM(unit_profit*qty) tp FROM order_lines GROUP BY order_id) l ON l.order_id = o.id
       LEFT JOIN commission_overrides ov ON ov.order_id = o.id
      WHERE o.organisation_id = $1 AND o.salesperson_user_id = $2`,
    [orgId, userId]
  );
  return r.rows;
}

function periodConfirmedTotal(orders, cfg, b) {
  return orders.filter((o) => o.status === 'paid' && inPeriod(o.paid_at, b)).reduce((s, o) => s + amountOf(o, cfg), 0);
}

// Full bonus-screen payload for one user + period offset.
async function computeForUser(orgId, userId, offset) {
  const cfg = await loadConfig(orgId);
  const b = periodBounds(cfg.periodStartDay, offset);
  const orders = await userOrders(orgId, userId);

  const paidInPeriod = orders.filter((o) => o.status === 'paid' && inPeriod(o.paid_at, b));
  const pendingNow = offset === 0 ? orders.filter((o) => ['submitted', 'approved', 'ordered', 'invoiced'].includes(o.status)) : [];

  const confirmed = paidInPeriod.reduce((s, o) => s + amountOf(o, cfg), 0);
  const pending = pendingNow.reduce((s, o) => s + amountOf(o, cfg), 0);

  const paidTurnover = paidInPeriod.reduce((s, o) => s + num(o.total_cost) + num(o.total_profit), 0);
  const paidProfit = paidInPeriod.reduce((s, o) => s + num(o.total_profit), 0);
  const unlocked = cfg.thresholdTurnover > 0 && paidTurnover > cfg.thresholdTurnover;
  const bonus = unlocked ? paidProfit * (cfg.bonusRate / 100) : 0;

  const row = (o, status) => {
    const s = suggestion(o, cfg);
    return { orderId: o.id, company: o.company_name || 'No company', category: s.category, basis: s.basis, rate: s.rate, amount: amountOf(o, cfg), overridden: !!o.has_override, status };
  };
  const breakdown = [...paidInPeriod.map((o) => row(o, 'paid')), ...pendingNow.map((o) => row(o, 'pending'))];

  const history = [];
  for (let k = 1; k <= 3; k++) {
    const hb = periodBounds(cfg.periodStartDay, offset - k);
    history.push({ label: periodLabel(hb), paid: periodConfirmedTotal(orders, cfg, hb) });
  }

  const lock = await query(
    'SELECT approved_at FROM commission_period_locks WHERE organisation_id = $1 AND salesperson_user_id = $2 AND period_start = $3',
    [orgId, userId, b.start.toISOString().slice(0, 10)]
  );

  return {
    enabled: cfg.enabled,
    period: { start: b.start.toISOString().slice(0, 10), end: b.end.toISOString().slice(0, 10), label: periodLabel(b), offset },
    cards: { confirmed, pending, bonus: { unlocked, amount: bonus, turnover: paidTurnover, threshold: cfg.thresholdTurnover, bonusRate: cfg.bonusRate } },
    breakdown,
    history,
    approved: lock.rows.length > 0,
    approvedAt: lock.rows[0]?.approved_at || null,
  };
}

// GET /api/commission/settings  (read by screens; neutral defaults if unset)
router.get('/settings', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    res.json({ config: await loadConfig(ctx.organizationId), canEdit: isManager(ctx) });
  } catch (e) { console.error('commission settings get', e); res.status(500).json({ error: 'Failed to load settings' }); }
});

// PUT /api/commission/settings  (manager/admin) — save the org's own ruleset
router.put('/settings', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    if (!isManager(ctx)) return res.status(403).json({ error: 'Manager access required' });
    const incoming = req.body?.config || {};
    const clean = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS)) {
      if (k === 'enabled') clean[k] = !!incoming[k];
      else if (incoming[k] !== undefined && incoming[k] !== '') clean[k] = Number(incoming[k]) || 0;
    }
    clean.periodStartDay = Math.min(28, Math.max(1, parseInt(clean.periodStartDay, 10) || 1));
    await query(
      `INSERT INTO commission_settings (organisation_id, config, updated_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (organisation_id) DO UPDATE SET config = EXCLUDED.config, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [ctx.organizationId, JSON.stringify(clean), req.user.userId]
    );
    res.json({ config: clean });
  } catch (e) { console.error('commission settings put', e); res.status(500).json({ error: 'Failed to save settings' }); }
});

// GET /api/commission/me?offset=0  — the logged-in user's bonus screen
router.get('/me', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const offset = parseInt(req.query.offset, 10) || 0;
    res.json(await computeForUser(ctx.organizationId, req.user.userId, offset));
  } catch (e) { console.error('commission me', e); res.status(500).json({ error: 'Failed to compute commission' }); }
});

// GET /api/commission/period?offset=0  (manager) — every salesperson's period total + lock state
router.get('/period', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    if (!isManager(ctx)) return res.status(403).json({ error: 'Manager access required' });
    const offset = parseInt(req.query.offset, 10) || 0;
    const cfg = await loadConfig(ctx.organizationId);
    const b = periodBounds(cfg.periodStartDay, offset);
    const people = await query(
      `SELECT DISTINCT o.salesperson_user_id AS uid, u.name FROM orders o
       JOIN users u ON u.id = o.salesperson_user_id WHERE o.organisation_id = $1 AND o.salesperson_user_id IS NOT NULL`,
      [ctx.organizationId]
    );
    const rows = [];
    for (const p of people.rows) {
      const orders = await userOrders(ctx.organizationId, p.uid);
      const lock = await query('SELECT 1 FROM commission_period_locks WHERE organisation_id = $1 AND salesperson_user_id = $2 AND period_start = $3', [ctx.organizationId, p.uid, b.start.toISOString().slice(0, 10)]);
      rows.push({ userId: p.uid, name: p.name, confirmed: periodConfirmedTotal(orders, cfg, b), approved: lock.rows.length > 0 });
    }
    res.json({ period: { start: b.start.toISOString().slice(0, 10), label: periodLabel(b), offset }, people: rows });
  } catch (e) { console.error('commission period', e); res.status(500).json({ error: 'Failed to load period' }); }
});

// POST /api/commission/period/approve  (manager) { salespersonUserId, offset }
router.post('/period/approve', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    if (!isManager(ctx)) return res.status(403).json({ error: 'Manager access required' });
    const cfg = await loadConfig(ctx.organizationId);
    const b = periodBounds(cfg.periodStartDay, parseInt(req.body?.offset, 10) || 0);
    const periodStart = b.start.toISOString().slice(0, 10);
    await query(
      `INSERT INTO commission_period_locks (organisation_id, salesperson_user_id, period_start, approved_by)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (organisation_id, salesperson_user_id, period_start) DO UPDATE SET approved_by = EXCLUDED.approved_by, approved_at = NOW()`,
      [ctx.organizationId, req.body?.salespersonUserId, periodStart, req.user.userId]
    );
    res.json({ success: true, periodStart });
  } catch (e) { console.error('commission approve', e); res.status(500).json({ error: 'Failed to approve' }); }
});

// PUT /api/commission/override/:orderId  (manager) { amount, note }
router.put('/override/:orderId', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    if (!isManager(ctx)) return res.status(403).json({ error: 'Manager access required' });
    await query(
      `INSERT INTO commission_overrides (order_id, organisation_id, manual_amount, note, set_by, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (order_id) DO UPDATE SET manual_amount = EXCLUDED.manual_amount, note = EXCLUDED.note, set_by = EXCLUDED.set_by, updated_at = NOW()`,
      [req.params.orderId, ctx.organizationId, num(req.body?.amount), req.body?.note ?? null, req.user.userId]
    );
    res.json({ success: true });
  } catch (e) { console.error('commission override', e); res.status(500).json({ error: 'Failed to set override' }); }
});

module.exports = router;
