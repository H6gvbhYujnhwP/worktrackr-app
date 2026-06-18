const express = require('express');
const router = express.Router();
const { query, getOrgContext } = require('@worktrackr/shared/db');

const isManager = (ctx) => ctx.type === 'partner_admin' || ['admin', 'manager', 'owner'].includes(ctx.role);
const num = (v) => (v === null || v === undefined ? 0 : Number(v) || 0);
const isoDate = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

// Neutral defaults — NOTHING about any organisation's scheme is baked in here.
// Every rate/amount/threshold is whatever the org typed into Commission rules.
// With nothing configured the engine computes nothing (all zero / disabled).
const DEFAULTS = {
  enabled: false,
  oneOffRate: 0,         // % of profit (after the deduction below)
  deductionPerSale: 0,   // £ internal cost subtracted before commission on a standard sale
  financeRate: 0,        // % of order value for 'finance' category
  referralRate: 0,       // % of profit for 'referral' category
  recurringRate: 0,      // % of a contract's monthly profit (recurring Contracts)
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

/* ───────────────────────── one-off orders ───────────────────────── */

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

const orderRow = (o, cfg, status) => {
  const s = suggestion(o, cfg);
  return { key: `order:${o.id}`, orderId: o.id, contractId: null, company: o.company_name || 'No company', category: s.category, basis: s.basis, rate: s.rate, amount: amountOf(o, cfg), overridden: !!o.has_override, status };
};

/* ───────────────────────── recurring contracts ───────────────────────── */
// A contract earns recurring commission for a period if it is (or was) live then:
// it has been activated, its start is on/before the period end, and it wasn't
// cancelled before the period began. Draft/paused contracts do not earn (pause
// stops accrual; pause history isn't tracked, so a manager can use the per-period
// manual £ override to correct any edge month). The basis is the contract's clear
// monthly profit (annual lines ÷ 12); the rate is whatever the org set.

async function userContracts(orgId, userId) {
  const r = await query(
    `SELECT c.id, c.status, c.started_at, c.cancelled_at,
            co.name AS company_name,
            COALESCE(l.monthly_profit,0) AS monthly_profit,
            COALESCE(l.monthly_charge,0) AS monthly_charge
       FROM contracts c
       LEFT JOIN contacts co ON co.id = c.contact_id
       LEFT JOIN (
         SELECT contract_id,
                SUM((unit_profit*qty)            / (CASE WHEN billing_interval = 'annual' THEN 12 ELSE 1 END)) AS monthly_profit,
                SUM(((unit_cost+unit_profit)*qty) / (CASE WHEN billing_interval = 'annual' THEN 12 ELSE 1 END)) AS monthly_charge
         FROM contract_lines GROUP BY contract_id
       ) l ON l.contract_id = c.id
      WHERE c.organisation_id = $1 AND c.salesperson_user_id = $2`,
    [orgId, userId]
  );
  return r.rows;
}

// Manager manual-£ overrides for a user's contracts, keyed contractId|periodStart.
async function contractOverrides(orgId, userId) {
  const r = await query(
    `SELECT ov.contract_id, ov.period_start, ov.manual_amount
       FROM contract_commission_overrides ov
       JOIN contracts c ON c.id = ov.contract_id
      WHERE ov.organisation_id = $1 AND c.salesperson_user_id = $2`,
    [orgId, userId]
  );
  const map = {};
  for (const row of r.rows) map[`${row.contract_id}|${isoDate(row.period_start)}`] = num(row.manual_amount);
  return map;
}

function contractEarnsInPeriod(c, b) {
  if (!c.started_at) return false;
  if (c.status === 'draft' || c.status === 'paused') return false;
  if (new Date(c.started_at).getTime() >= b.end.getTime()) return false;
  if (c.cancelled_at && new Date(c.cancelled_at).getTime() < b.start.getTime()) return false;
  return true;
}

function contractAmount(c, cfg, b, overrides) {
  const key = `${c.id}|${isoDate(b.start)}`;
  if (overrides[key] !== undefined) return overrides[key];
  return num(c.monthly_profit) * (num(cfg.recurringRate) / 100);
}

const contractRow = (c, cfg, b, overrides) => ({
  key: `contract:${c.id}`,
  orderId: null,
  contractId: c.id,
  company: c.company_name || 'No company',
  category: 'recurring',
  basis: num(c.monthly_profit),
  rate: num(cfg.recurringRate),
  amount: contractAmount(c, cfg, b, overrides),
  overridden: overrides[`${c.id}|${isoDate(b.start)}`] !== undefined,
  status: 'active',
});

/* ───────────────────────── period totals ───────────────────────── */

// Confirmed (payable) for a period = paid one-off orders + live contracts.
function periodConfirmedTotal(orders, contracts, cfg, b, overrides) {
  const oneOff = orders.filter((o) => o.status === 'paid' && inPeriod(o.paid_at, b)).reduce((s, o) => s + amountOf(o, cfg), 0);
  const recurring = contracts.filter((c) => contractEarnsInPeriod(c, b)).reduce((s, c) => s + contractAmount(c, cfg, b, overrides), 0);
  return oneOff + recurring;
}

// Full bonus-screen payload for one user + period offset.
async function computeForUser(orgId, userId, offset) {
  const cfg = await loadConfig(orgId);
  const b = periodBounds(cfg.periodStartDay, offset);
  const orders = await userOrders(orgId, userId);
  const contracts = await userContracts(orgId, userId);
  const overrides = await contractOverrides(orgId, userId);

  const paidInPeriod = orders.filter((o) => o.status === 'paid' && inPeriod(o.paid_at, b));
  const pendingNow = offset === 0 ? orders.filter((o) => ['submitted', 'approved', 'ordered', 'invoiced'].includes(o.status)) : [];
  const liveContracts = contracts.filter((c) => contractEarnsInPeriod(c, b));

  const confirmed = paidInPeriod.reduce((s, o) => s + amountOf(o, cfg), 0)
                  + liveContracts.reduce((s, c) => s + contractAmount(c, cfg, b, overrides), 0);
  const pending = pendingNow.reduce((s, o) => s + amountOf(o, cfg), 0);

  // Threshold turnover + bonus profit both include the period's recurring figures.
  const paidTurnover = paidInPeriod.reduce((s, o) => s + num(o.total_cost) + num(o.total_profit), 0)
                     + liveContracts.reduce((s, c) => s + num(c.monthly_charge), 0);
  const paidProfit = paidInPeriod.reduce((s, o) => s + num(o.total_profit), 0)
                   + liveContracts.reduce((s, c) => s + num(c.monthly_profit), 0);
  const unlocked = cfg.thresholdTurnover > 0 && paidTurnover > cfg.thresholdTurnover;
  const bonus = unlocked ? paidProfit * (cfg.bonusRate / 100) : 0;

  const breakdown = [
    ...paidInPeriod.map((o) => orderRow(o, cfg, 'paid')),
    ...liveContracts.map((c) => contractRow(c, cfg, b, overrides)),
    ...pendingNow.map((o) => orderRow(o, cfg, 'pending')),
  ];

  const history = [];
  for (let k = 1; k <= 3; k++) {
    const hb = periodBounds(cfg.periodStartDay, offset - k);
    history.push({ label: periodLabel(hb), paid: periodConfirmedTotal(orders, contracts, cfg, hb, overrides) });
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

/* ───────────────────────── API ───────────────────────── */

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
    // Salespeople who have either orders or contracts.
    const people = await query(
      `SELECT DISTINCT uid, name FROM (
         SELECT o.salesperson_user_id AS uid, u.name FROM orders o JOIN users u ON u.id = o.salesperson_user_id
           WHERE o.organisation_id = $1 AND o.salesperson_user_id IS NOT NULL
         UNION
         SELECT c.salesperson_user_id AS uid, u.name FROM contracts c JOIN users u ON u.id = c.salesperson_user_id
           WHERE c.organisation_id = $1 AND c.salesperson_user_id IS NOT NULL
       ) z ORDER BY name`,
      [ctx.organizationId]
    );
    const rows = [];
    for (const p of people.rows) {
      const orders = await userOrders(ctx.organizationId, p.uid);
      const contracts = await userContracts(ctx.organizationId, p.uid);
      const overrides = await contractOverrides(ctx.organizationId, p.uid);
      const lock = await query('SELECT 1 FROM commission_period_locks WHERE organisation_id = $1 AND salesperson_user_id = $2 AND period_start = $3', [ctx.organizationId, p.uid, b.start.toISOString().slice(0, 10)]);
      rows.push({ userId: p.uid, name: p.name, confirmed: periodConfirmedTotal(orders, contracts, cfg, b, overrides), approved: lock.rows.length > 0 });
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

// PUT /api/commission/override/:orderId  (manager) { amount, note }  — manual £ for one order
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

// PUT /api/commission/contract-override/:contractId  (manager) { amount, note, offset }
// Manual £ for one contract's recurring commission in one period.
router.put('/contract-override/:contractId', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    if (!isManager(ctx)) return res.status(403).json({ error: 'Manager access required' });
    const chk = await query('SELECT 1 FROM contracts WHERE id = $1 AND organisation_id = $2', [req.params.contractId, ctx.organizationId]);
    if (chk.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    const cfg = await loadConfig(ctx.organizationId);
    const b = periodBounds(cfg.periodStartDay, parseInt(req.body?.offset, 10) || 0);
    const periodStart = b.start.toISOString().slice(0, 10);
    await query(
      `INSERT INTO contract_commission_overrides (contract_id, organisation_id, period_start, manual_amount, note, set_by, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (contract_id, period_start) DO UPDATE SET manual_amount = EXCLUDED.manual_amount, note = EXCLUDED.note, set_by = EXCLUDED.set_by, updated_at = NOW()`,
      [req.params.contractId, ctx.organizationId, periodStart, num(req.body?.amount), req.body?.note ?? null, req.user.userId]
    );
    res.json({ success: true, periodStart });
  } catch (e) { console.error('commission contract override', e); res.status(500).json({ error: 'Failed to set contract override' }); }
});

module.exports = router;
