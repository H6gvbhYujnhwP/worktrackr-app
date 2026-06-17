// web/routes/contracts.js
// Phase 5 — Contracts (recurring). The recurring counterpart to orders.js.
// A contract holds a company's ongoing monthly services and feeds the recurring
// commission engine (batch 2). Mounted at /api/contracts (behind auth).
//
// Key behaviour — "act on a quote", auto-sorted (Decision 3):
//   POST /:id/pull-quote reads a mirrored IdoYourQuotes quote's lines and sorts
//   them by each line's own type tag, with no manual work and no page-hopping:
//     • monthly / annual lines  -> added to THIS contract (recurring)
//     • one-off (or untagged)   -> spun into a linked one-off Order automatically
//   so the contract's monthly figures never get inflated by one-time charges.
//
// No money rule is hardcoded here; figures come from the pulled quote (read-only,
// edited in IdoYourQuotes) or from manual lines entered in-app.

const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { query, getOrgContext } = require('@worktrackr/shared/db');

// Manager gating per the roadmap: admin / manager / owner / partner_admin.
const isManager = (ctx) => ctx.type === 'partner_admin' || ['admin', 'manager', 'owner'].includes(ctx.role);
const num = (v) => (v === null || v === undefined ? 0 : Number(v) || 0);

const lineSchema = z.object({
  description: z.string().min(1),
  qty: z.number().default(1),
  unitCost: z.number().default(0),
  unitProfit: z.number().default(0),
  billingInterval: z.enum(['monthly', 'annual']).default('monthly'),
  source: z.enum(['manual', 'idyq']).default('manual'),
  idyqQuoteId: z.string().optional().nullable(),
});
const contractSchema = z.object({
  contactId: z.string().uuid().optional().nullable(),
  salespersonUserId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(lineSchema).optional(),
});

// Normalise a line to a per-month figure: annual ÷ 12, monthly as-is (Decision 2).
const perMonth = (value, interval) => num(value) / (interval === 'annual' ? 12 : 1);

// Decide where a pulled quote line belongs from its type tag. Unknown/blank is
// treated as one-off on purpose — it is the safe default (never invents recurring
// profit/commission before the tag is confirmed flowing from IdoYourQuotes).
function classifyType(t) {
  const s = String(t || '').toLowerCase();
  if (s.includes('month')) return { kind: 'recurring', interval: 'monthly' };
  if (s.includes('annual') || s.includes('year')) return { kind: 'recurring', interval: 'annual' };
  return { kind: 'one_off' };
}

function mapLine(r) {
  const interval = r.billing_interval || 'monthly';
  return {
    id: r.id,
    description: r.description,
    qty: num(r.qty),
    unitCost: num(r.unit_cost),
    unitProfit: num(r.unit_profit),
    billingInterval: interval,
    monthlyCost: perMonth(num(r.unit_cost) * num(r.qty), interval),
    monthlyProfit: perMonth(num(r.unit_profit) * num(r.qty), interval),
    source: r.source,
    idyqQuoteId: r.idyq_quote_id,
    sortOrder: r.sort_order,
  };
}
function mapContract(r) {
  const monthlyCost = num(r.monthly_cost);
  const monthlyProfit = num(r.monthly_profit);
  return {
    id: r.id,
    contactId: r.contact_id,
    companyName: r.company_name || null,
    salespersonUserId: r.salesperson_user_id,
    salespersonName: r.salesperson_name || null,
    status: r.status,
    notes: r.notes || '',
    sourceIdyqQuoteId: r.source_idyq_quote_id || null,
    startedAt: r.started_at,
    cancelledAt: r.cancelled_at,
    totals: { monthlyCost, monthlyProfit, monthlyCharge: monthlyCost + monthlyProfit },
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Aggregate each contract's lines into per-month cost/profit (annual ÷ 12).
const LIST_SELECT = `
  SELECT c.*, co.name AS company_name, sp.name AS salesperson_name,
         COALESCE(l.monthly_cost,0)   AS monthly_cost,
         COALESCE(l.monthly_profit,0) AS monthly_profit
  FROM contracts c
  LEFT JOIN contacts co ON co.id = c.contact_id
  LEFT JOIN users sp ON sp.id = c.salesperson_user_id
  LEFT JOIN (
    SELECT contract_id,
           SUM((unit_cost*qty)   / (CASE WHEN billing_interval = 'annual' THEN 12 ELSE 1 END)) AS monthly_cost,
           SUM((unit_profit*qty) / (CASE WHEN billing_interval = 'annual' THEN 12 ELSE 1 END)) AS monthly_profit
    FROM contract_lines GROUP BY contract_id
  ) l ON l.contract_id = c.id
`;

async function fetchContract(id, orgId) {
  const c = await query(`${LIST_SELECT} WHERE c.id = $1 AND c.organisation_id = $2`, [id, orgId]);
  if (c.rows.length === 0) return null;
  const lines = await query('SELECT * FROM contract_lines WHERE contract_id = $1 ORDER BY sort_order, description', [id]);
  return { ...mapContract(c.rows[0]), lines: lines.rows.map(mapLine) };
}

async function replaceLines(contractId, orgId, lines) {
  await query('DELETE FROM contract_lines WHERE contract_id = $1', [contractId]);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    await query(
      `INSERT INTO contract_lines
         (contract_id, organisation_id, description, qty, unit_cost, unit_profit, billing_interval, source, idyq_quote_id, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [contractId, orgId, l.description, l.qty ?? 1, l.unitCost ?? 0, l.unitProfit ?? 0, l.billingInterval ?? 'monthly', l.source ?? 'manual', l.idyqQuoteId ?? null, i]
    );
  }
}

// GET /api/contracts  — ?status=  ?contactId=  ?mine=1
router.get('/', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const conditions = ['c.organisation_id = $1'];
    const params = [ctx.organizationId];
    if (req.query.status) { params.push(req.query.status); conditions.push(`c.status = $${params.length}`); }
    if (req.query.contactId) { params.push(req.query.contactId); conditions.push(`c.contact_id = $${params.length}`); }
    if (req.query.mine) { params.push(req.user.userId); conditions.push(`c.salesperson_user_id = $${params.length}`); }
    const result = await query(`${LIST_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY c.created_at DESC`, params);
    res.json(result.rows.map(mapContract));
  } catch (err) {
    console.error('Error listing contracts:', err);
    res.status(500).json({ error: 'Failed to list contracts' });
  }
});

// GET /api/contracts/:id
router.get('/:id', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const contract = await fetchContract(req.params.id, ctx.organizationId);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    res.json(contract);
  } catch (err) {
    console.error('Error fetching contract:', err);
    res.status(500).json({ error: 'Failed to fetch contract' });
  }
});

// POST /api/contracts  — create a draft (salesperson defaults to creator)
router.post('/', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const data = contractSchema.parse(req.body);
    const ins = await query(
      `INSERT INTO contracts (organisation_id, contact_id, salesperson_user_id, notes, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [ctx.organizationId, data.contactId ?? null, data.salespersonUserId ?? req.user.userId, data.notes ?? null, req.user.userId]
    );
    const id = ins.rows[0].id;
    if (data.lines && data.lines.length) await replaceLines(id, ctx.organizationId, data.lines);
    res.status(201).json(await fetchContract(id, ctx.organizationId));
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Invalid contract', details: err.errors });
    console.error('Error creating contract:', err);
    res.status(500).json({ error: 'Failed to create contract' });
  }
});

// PUT /api/contracts/:id  — edit header + replace lines (not while cancelled)
router.put('/:id', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const cur = await query('SELECT status FROM contracts WHERE id = $1 AND organisation_id = $2', [req.params.id, ctx.organizationId]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    if (cur.rows[0].status === 'cancelled') return res.status(409).json({ error: 'A cancelled contract cannot be edited' });
    const data = contractSchema.parse(req.body);
    const present = new Set(Object.keys(req.body));
    const fields = []; const values = []; let i = 1;
    const set = (col, val) => { fields.push(`${col} = $${i++}`); values.push(val); };
    if (present.has('contactId')) set('contact_id', data.contactId ?? null);
    if (present.has('salespersonUserId')) set('salesperson_user_id', data.salespersonUserId ?? null);
    if (present.has('notes')) set('notes', data.notes ?? null);
    fields.push('updated_at = NOW()');
    values.push(req.params.id, ctx.organizationId);
    await query(`UPDATE contracts SET ${fields.join(', ')} WHERE id = $${i++} AND organisation_id = $${i}`, values);
    if (present.has('lines') && Array.isArray(data.lines)) await replaceLines(req.params.id, ctx.organizationId, data.lines);
    res.json(await fetchContract(req.params.id, ctx.organizationId));
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Invalid contract', details: err.errors });
    console.error('Error updating contract:', err);
    res.status(500).json({ error: 'Failed to update contract' });
  }
});

// POST /api/contracts/:id/pull-quote { idyqQuoteId }
// Auto-sort a mirrored IdoYourQuotes quote: recurring lines join this contract,
// one-off lines are spun into a linked draft Order. One screen, no manual sorting.
router.post('/:id/pull-quote', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const idyqQuoteId = String(req.body?.idyqQuoteId || '');
    if (!idyqQuoteId) return res.status(400).json({ error: 'idyqQuoteId is required' });

    const cur = await query('SELECT * FROM contracts WHERE id = $1 AND organisation_id = $2', [req.params.id, ctx.organizationId]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    const contract = cur.rows[0];
    if (!['draft', 'active'].includes(contract.status)) {
      return res.status(409).json({ error: 'Lines can only be pulled into a draft or active contract' });
    }

    // The mirrored quote header (for the company link + quote number) and lines.
    const qh = await query('SELECT * FROM idyq_quotes WHERE idyq_id = $1 AND organisation_id = $2', [idyqQuoteId, ctx.organizationId]);
    const quote = qh.rows[0] || null;
    const ql = await query(
      `SELECT l.* FROM idyq_quote_lines l
       JOIN idyq_quotes q ON q.id = l.idyq_quote_id
       WHERE q.idyq_id = $1 AND l.organisation_id = $2 ORDER BY l.sort_order`,
      [idyqQuoteId, ctx.organizationId]
    );
    if (ql.rows.length === 0) return res.status(404).json({ error: 'No mirrored lines for that quote. Sync IdoYourQuotes first.' });

    // Work out per-line cost/profit (read-only, from the quote).
    const priced = ql.rows.map((l) => {
      const qty = num(l.qty) || 1;
      const unitCost = l.cost_price != null ? num(l.cost_price) : 0;
      let unitProfit;
      if (l.line_profit != null) unitProfit = num(l.line_profit) / qty;       // IDYQ's own profit, matched to the penny
      else if (l.unit_price != null) unitProfit = num(l.unit_price) - unitCost; // fall back to sell − cost
      else unitProfit = 0;
      return { description: l.description || 'Item', qty, unitCost, unitProfit, ...classifyType(l.line_type) };
    });
    const recurring = priced.filter((p) => p.kind === 'recurring');
    const oneOff = priced.filter((p) => p.kind === 'one_off');

    // 1) recurring lines -> this contract
    const existing = await query('SELECT COALESCE(MAX(sort_order),-1) AS m FROM contract_lines WHERE contract_id = $1', [req.params.id]);
    let sort = num(existing.rows[0].m) + 1;
    for (const p of recurring) {
      await query(
        `INSERT INTO contract_lines
           (contract_id, organisation_id, description, qty, unit_cost, unit_profit, billing_interval, source, idyq_quote_id, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'idyq',$8,$9)`,
        [req.params.id, ctx.organizationId, p.description, p.qty, p.unitCost, p.unitProfit, p.interval, idyqQuoteId, sort++]
      );
    }

    // Fill the contract's company + source quote if they weren't set yet.
    const fillContact = !contract.contact_id && quote?.linked_contact_id ? quote.linked_contact_id : null;
    if (fillContact || !contract.source_idyq_quote_id) {
      await query(
        `UPDATE contracts SET contact_id = COALESCE($3, contact_id),
                              source_idyq_quote_id = COALESCE(source_idyq_quote_id, $4),
                              updated_at = NOW()
         WHERE id = $1 AND organisation_id = $2`,
        [req.params.id, ctx.organizationId, fillContact, idyqQuoteId]
      );
    }

    // 2) one-off lines -> a linked draft Order (created automatically)
    let linkedOrder = null;
    if (oneOff.length) {
      const targetContact = contract.contact_id || fillContact || null;
      const ordIns = await query(
        `INSERT INTO orders (organisation_id, contact_id, salesperson_user_id, status, notes, created_by)
         VALUES ($1,$2,$3,'draft',$4,$5) RETURNING id`,
        [
          ctx.organizationId, targetContact, contract.salesperson_user_id || req.user.userId,
          `One-off items from IdoYourQuotes quote ${quote?.quote_number || idyqQuoteId} (contract ${req.params.id})`,
          req.user.userId,
        ]
      );
      const orderId = ordIns.rows[0].id;
      let os = 0;
      for (const p of oneOff) {
        await query(
          `INSERT INTO order_lines
             (order_id, organisation_id, description, qty, supplier_url, unit_cost, unit_profit, source, idyq_quote_id, line_type, sort_order)
           VALUES ($1,$2,$3,$4,NULL,$5,$6,'idyq',$7,'one_off',$8)`,
          [orderId, ctx.organizationId, p.description, p.qty, p.unitCost, p.unitProfit, idyqQuoteId, os++]
        );
      }
      linkedOrder = { id: orderId, lineCount: oneOff.length };
    }

    res.json({ ...(await fetchContract(req.params.id, ctx.organizationId)), pulled: { recurring: recurring.length, oneOff: oneOff.length }, linkedOrder });
  } catch (err) {
    console.error('Contract pull-quote error:', err);
    res.status(500).json({ error: 'Failed to pull quote' });
  }
});

// POST /api/contracts/:id/activate  — draft|paused -> active (stamp started_at once)
router.post('/:id/activate', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const cur = await query('SELECT status, started_at FROM contracts WHERE id = $1 AND organisation_id = $2', [req.params.id, ctx.organizationId]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    if (!['draft', 'paused'].includes(cur.rows[0].status)) return res.status(409).json({ error: 'Only a draft or paused contract can be activated' });
    const stampStart = cur.rows[0].started_at ? '' : ', started_at = NOW()';
    await query(`UPDATE contracts SET status = 'active'${stampStart}, updated_at = NOW() WHERE id = $1 AND organisation_id = $2`, [req.params.id, ctx.organizationId]);
    res.json(await fetchContract(req.params.id, ctx.organizationId));
  } catch (err) {
    console.error('Contract activate error:', err);
    res.status(500).json({ error: 'Failed to activate contract' });
  }
});

// POST /api/contracts/:id/pause  — active -> paused  (manager; stops accrual)
router.post('/:id/pause', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    if (!isManager(ctx)) return res.status(403).json({ error: 'Manager access required' });
    const cur = await query('SELECT status FROM contracts WHERE id = $1 AND organisation_id = $2', [req.params.id, ctx.organizationId]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    if (cur.rows[0].status !== 'active') return res.status(409).json({ error: 'Only an active contract can be paused' });
    await query(`UPDATE contracts SET status = 'paused', updated_at = NOW() WHERE id = $1 AND organisation_id = $2`, [req.params.id, ctx.organizationId]);
    res.json(await fetchContract(req.params.id, ctx.organizationId));
  } catch (err) {
    console.error('Contract pause error:', err);
    res.status(500).json({ error: 'Failed to pause contract' });
  }
});

// POST /api/contracts/:id/cancel  — any non-cancelled -> cancelled  (manager)
router.post('/:id/cancel', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    if (!isManager(ctx)) return res.status(403).json({ error: 'Manager access required' });
    const cur = await query('SELECT status FROM contracts WHERE id = $1 AND organisation_id = $2', [req.params.id, ctx.organizationId]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    if (cur.rows[0].status === 'cancelled') return res.status(409).json({ error: 'Contract is already cancelled' });
    await query(`UPDATE contracts SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW() WHERE id = $1 AND organisation_id = $2`, [req.params.id, ctx.organizationId]);
    res.json(await fetchContract(req.params.id, ctx.organizationId));
  } catch (err) {
    console.error('Contract cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel contract' });
  }
});

// DELETE /api/contracts/:id  (draft only)
router.delete('/:id', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const cur = await query('SELECT status FROM contracts WHERE id = $1 AND organisation_id = $2', [req.params.id, ctx.organizationId]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    if (cur.rows[0].status !== 'draft') return res.status(409).json({ error: 'Only a draft contract can be deleted' });
    await query('DELETE FROM contracts WHERE id = $1 AND organisation_id = $2', [req.params.id, ctx.organizationId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting contract:', err);
    res.status(500).json({ error: 'Failed to delete contract' });
  }
});

module.exports = router;
