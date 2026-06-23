const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { query, getOrgContext } = require('@worktrackr/shared/db');
const { pullQuoteById } = require('@worktrackr/shared/idyq');

const isManager = (ctx) => ctx.type === 'partner_admin' || ['admin', 'manager'].includes(ctx.role);

const lineSchema = z.object({
  description: z.string().min(1),
  qty: z.number().default(1),
  supplierUrl: z.string().optional().nullable(),
  unitCost: z.number().default(0),
  unitProfit: z.number().default(0),
  source: z.enum(['manual', 'idyq']).default('manual'),
  idyqQuoteId: z.string().optional().nullable(),
  lineType: z.string().optional().nullable(),
});
const orderSchema = z.object({
  contactId: z.string().uuid().optional().nullable(),
  salespersonUserId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  commissionCategory: z.enum(['standard', 'finance', 'referral']).optional().nullable(),
  lines: z.array(lineSchema).optional(),
});

const num = (v) => (v === null || v === undefined ? 0 : Number(v) || 0);

function mapLine(r) {
  const totalCost = num(r.unit_cost) * num(r.qty);
  const totalProfit = num(r.unit_profit) * num(r.qty);
  return {
    id: r.id,
    description: r.description,
    qty: num(r.qty),
    supplierUrl: r.supplier_url || '',
    unitCost: num(r.unit_cost),
    unitProfit: num(r.unit_profit),
    totalCost,
    totalProfit,
    source: r.source,
    idyqQuoteId: r.idyq_quote_id,
    lineType: r.line_type,
    sortOrder: r.sort_order,
  };
}
function mapOrder(r) {
  const cost = num(r.total_cost);
  const profit = num(r.total_profit);
  return {
    id: r.id,
    contactId: r.contact_id,
    companyName: r.company_name || null,
    salespersonUserId: r.salesperson_user_id,
    salespersonName: r.salesperson_name || null,
    status: r.status,
    notes: r.notes || '',
    commissionCategory: r.commission_category || 'standard',
    invoicedAt: r.invoiced_at,
    paidAt: r.paid_at,
    totals: { cost, profit, value: cost + profit },
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const LIST_SELECT = `
  SELECT o.*, c.name AS company_name, sp.name AS salesperson_name,
         COALESCE(l.total_cost,0) AS total_cost, COALESCE(l.total_profit,0) AS total_profit
  FROM orders o
  LEFT JOIN contacts c ON c.id = o.contact_id
  LEFT JOIN users sp ON sp.id = o.salesperson_user_id
  LEFT JOIN (
    SELECT order_id, SUM(unit_cost*qty) AS total_cost, SUM(unit_profit*qty) AS total_profit
    FROM order_lines GROUP BY order_id
  ) l ON l.order_id = o.id
`;

async function fetchOrder(id, orgId) {
  const o = await query(`${LIST_SELECT} WHERE o.id = $1 AND o.organisation_id = $2`, [id, orgId]);
  if (o.rows.length === 0) return null;
  const lines = await query('SELECT * FROM order_lines WHERE order_id = $1 ORDER BY sort_order, description', [id]);
  const appr = await query(
    `SELECT a.*, u.name AS approver_name FROM order_approvals a
     LEFT JOIN users u ON u.id = a.approver_user_id WHERE a.order_id = $1 ORDER BY a.created_at DESC`,
    [id]
  );
  return {
    ...mapOrder(o.rows[0]),
    lines: lines.rows.map(mapLine),
    approvals: appr.rows.map((a) => ({ id: a.id, decision: a.decision, comment: a.comment, approverName: a.approver_name, at: a.created_at })),
  };
}

async function replaceLines(orderId, orgId, lines) {
  await query('DELETE FROM order_lines WHERE order_id = $1', [orderId]);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    await query(
      `INSERT INTO order_lines
         (order_id, organisation_id, description, qty, supplier_url, unit_cost, unit_profit, source, idyq_quote_id, line_type, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [orderId, orgId, l.description, l.qty ?? 1, l.supplierUrl ?? null, l.unitCost ?? 0, l.unitProfit ?? 0, l.source ?? 'manual', l.idyqQuoteId ?? null, l.lineType ?? null, i]
    );
  }
}

// GET /api/orders  — ?status=  ?contactId=  ?mine=1  ?queue=approval|purchasing
router.get('/', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const conditions = ['o.organisation_id = $1'];
    const params = [ctx.organizationId];
    if (req.query.status) { params.push(req.query.status); conditions.push(`o.status = $${params.length}`); }
    if (req.query.contactId) { params.push(req.query.contactId); conditions.push(`o.contact_id = $${params.length}`); }
    if (req.query.mine) { params.push(req.user.userId); conditions.push(`o.salesperson_user_id = $${params.length}`); }
    if (req.query.queue === 'approval') conditions.push(`o.status = 'submitted'`);
    if (req.query.queue === 'purchasing') conditions.push(`o.status = 'approved'`);

    const result = await query(`${LIST_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY o.created_at DESC`, params);
    res.json(result.rows.map(mapOrder));
  } catch (err) {
    console.error('Error listing orders:', err);
    res.status(500).json({ error: 'Failed to list orders' });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const order = await fetchOrder(req.params.id, ctx.organizationId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST /api/orders  — create a draft (salesperson defaults to creator)
router.post('/', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const data = orderSchema.parse(req.body);
    const ins = await query(
      `INSERT INTO orders (organisation_id, contact_id, salesperson_user_id, notes, commission_category, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [ctx.organizationId, data.contactId ?? null, data.salespersonUserId ?? req.user.userId, data.notes ?? null, data.commissionCategory ?? null, req.user.userId]
    );
    const id = ins.rows[0].id;
    if (data.lines && data.lines.length) await replaceLines(id, ctx.organizationId, data.lines);
    res.status(201).json(await fetchOrder(id, ctx.organizationId));
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Invalid order', details: err.errors });
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PUT /api/orders/:id  — edit header + replace lines (draft/rejected only)
router.put('/:id', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const cur = await query('SELECT status FROM orders WHERE id = $1 AND organisation_id = $2', [req.params.id, ctx.organizationId]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (!['draft', 'rejected'].includes(cur.rows[0].status)) {
      return res.status(409).json({ error: 'Order can only be edited while it is a draft' });
    }
    const data = orderSchema.parse(req.body);
    const present = new Set(Object.keys(req.body));
    const fields = []; const values = []; let i = 1;
    const set = (col, val) => { fields.push(`${col} = $${i++}`); values.push(val); };
    if (present.has('contactId')) set('contact_id', data.contactId ?? null);
    if (present.has('salespersonUserId')) set('salesperson_user_id', data.salespersonUserId ?? null);
    if (present.has('notes')) set('notes', data.notes ?? null);
    if (present.has('commissionCategory')) set('commission_category', data.commissionCategory ?? null);
    fields.push('updated_at = NOW()');
    values.push(req.params.id, ctx.organizationId);
    await query(`UPDATE orders SET ${fields.join(', ')} WHERE id = $${i++} AND organisation_id = $${i}`, values);
    if (present.has('lines') && Array.isArray(data.lines)) await replaceLines(req.params.id, ctx.organizationId, data.lines);
    res.json(await fetchOrder(req.params.id, ctx.organizationId));
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Invalid order', details: err.errors });
    console.error('Error updating order:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// helper: a guarded status transition
function transition({ from, to, managerOnly = false, stamp = null }) {
  return async (req, res) => {
    try {
      const ctx = await getOrgContext(req.user.userId);
      if (managerOnly && !isManager(ctx)) return res.status(403).json({ error: 'Manager approval required' });
      const cur = await query('SELECT status FROM orders WHERE id = $1 AND organisation_id = $2', [req.params.id, ctx.organizationId]);
      if (cur.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
      const fromList = Array.isArray(from) ? from : [from];
      if (!fromList.includes(cur.rows[0].status)) {
        return res.status(409).json({ error: `Order must be ${fromList.join(' or ')} (it is ${cur.rows[0].status})` });
      }
      const extra = stamp ? `, ${stamp} = NOW()` : '';
      await query(`UPDATE orders SET status = $1${extra}, updated_at = NOW() WHERE id = $2 AND organisation_id = $3`,
        [to, req.params.id, ctx.organizationId]);
      res.json(await fetchOrder(req.params.id, ctx.organizationId));
    } catch (err) {
      console.error('Order transition error:', err);
      res.status(500).json({ error: 'Failed to update order status' });
    }
  };
}

router.post('/:id/submit',   transition({ from: ['draft', 'rejected'], to: 'submitted' }));
router.post('/:id/purchase', transition({ from: 'approved', to: 'ordered', managerOnly: true }));
router.post('/:id/invoice',  transition({ from: ['ordered', 'approved'], to: 'invoiced', managerOnly: true, stamp: 'invoiced_at' }));
router.post('/:id/pay',      transition({ from: 'invoiced', to: 'paid', managerOnly: true, stamp: 'paid_at' }));

// POST /api/orders/:id/approve  { comment }  — manager only, single approver
router.post('/:id/approve', async (req, res) => {
  await decide(req, res, 'approved', 'approved');
});
router.post('/:id/reject', async (req, res) => {
  await decide(req, res, 'rejected', 'rejected');
});
async function decide(req, res, decision, newStatus) {
  try {
    const ctx = await getOrgContext(req.user.userId);
    if (!isManager(ctx)) return res.status(403).json({ error: 'Manager approval required' });
    const cur = await query('SELECT status FROM orders WHERE id = $1 AND organisation_id = $2', [req.params.id, ctx.organizationId]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (cur.rows[0].status !== 'submitted') return res.status(409).json({ error: 'Only submitted orders can be approved or rejected' });
    await query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND organisation_id = $3', [newStatus, req.params.id, ctx.organizationId]);
    await query(
      `INSERT INTO order_approvals (order_id, organisation_id, approver_user_id, decision, comment)
       VALUES ($1,$2,$3,$4,$5)`,
      [req.params.id, ctx.organizationId, req.user.userId, decision, req.body?.comment ?? null]
    );
    res.json(await fetchOrder(req.params.id, ctx.organizationId));
  } catch (err) {
    console.error('Order decision error:', err);
    res.status(500).json({ error: 'Failed to record decision' });
  }
}

// POST /api/orders/:id/pull-quote { idyqQuoteId }  — append an IDYQ quote's lines
router.post('/:id/pull-quote', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const idyqQuoteId = String(req.body?.idyqQuoteId || '');
    if (!idyqQuoteId) return res.status(400).json({ error: 'idyqQuoteId is required' });

    const order = await query('SELECT status FROM orders WHERE id = $1 AND organisation_id = $2', [req.params.id, ctx.organizationId]);
    if (order.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (!['draft', 'rejected'].includes(order.rows[0].status)) return res.status(409).json({ error: 'Lines can only be pulled into a draft' });

    // Refresh this quote from IdoYourQuotes first so the pull is always current
    // (no waiting for the 30-min sweep / no manual "Sync quotes"). Best-effort:
    // if IDYQ is unreachable we fall back to the existing mirror below.
    try {
      await pullQuoteById({ organisationId: ctx.organizationId, idyqId: idyqQuoteId });
    } catch (e) {
      console.warn('[orders pull-quote] live refresh failed, using mirror:', e.message);
    }

    // Read the mirrored IDYQ quote lines (cost/profit/type added by the bridge pull).
    const q = await query(
      `SELECT ql.* FROM idyq_quote_lines ql
       JOIN idyq_quotes qq ON qq.id = ql.idyq_quote_id
       WHERE qq.idyq_id = $1 AND ql.organisation_id = $2 ORDER BY ql.sort_order`,
      [idyqQuoteId, ctx.organizationId]
    );
    if (q.rows.length === 0) return res.status(404).json({ error: 'No mirrored lines for that quote. Sync IdoYourQuotes first.' });

    const existing = await query('SELECT COALESCE(MAX(sort_order),-1) AS m FROM order_lines WHERE order_id = $1', [req.params.id]);
    let sort = num(existing.rows[0].m) + 1;
    for (const l of q.rows) {
      const qty = num(l.qty) || 1;
      const unitCost = l.cost_price != null ? num(l.cost_price) : 0;
      let unitProfit;
      if (l.line_profit != null) unitProfit = num(l.line_profit) / qty;            // IDYQ's own profit, matched to the penny
      else if (l.unit_price != null) unitProfit = num(l.unit_price) - unitCost;     // fall back to sell − cost
      else unitProfit = 0;
      await query(
        `INSERT INTO order_lines
           (order_id, organisation_id, description, qty, supplier_url, unit_cost, unit_profit, source, idyq_quote_id, line_type, sort_order)
         VALUES ($1,$2,$3,$4,NULL,$5,$6,'idyq',$7,$8,$9)`,
        [req.params.id, ctx.organizationId, l.description || 'Item', qty, unitCost, unitProfit, idyqQuoteId, l.line_type ?? null, sort++]
      );
    }
    res.json(await fetchOrder(req.params.id, ctx.organizationId));
  } catch (err) {
    console.error('Order pull-quote error:', err);
    res.status(500).json({ error: 'Failed to pull quote' });
  }
});

// DELETE /api/orders/:id  (draft/rejected only)
router.delete('/:id', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const cur = await query('SELECT status FROM orders WHERE id = $1 AND organisation_id = $2', [req.params.id, ctx.organizationId]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (!['draft', 'rejected'].includes(cur.rows[0].status)) return res.status(409).json({ error: 'Only drafts can be deleted' });
    await query('DELETE FROM orders WHERE id = $1 AND organisation_id = $2', [req.params.id, ctx.organizationId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting order:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// POST /api/orders/:id/pull-quote { idyqQuoteId }
// Snapshot a mirrored IdoYourQuotes quote into this draft order: adds all of the
// quote's lines (cost/profit/type from the mirror, read-only) and fills the
// company from the quote's linked contact if the order doesn't have one yet.
router.post('/:id/pull-quote', async (req, res) => {
  try {
    const ctx = await getOrgContext(req.user.userId);
    const idyqQuoteId = String(req.body?.idyqQuoteId || '');
    if (!idyqQuoteId) return res.status(400).json({ error: 'idyqQuoteId is required' });

    const cur = await query('SELECT * FROM orders WHERE id = $1 AND organisation_id = $2', [req.params.id, ctx.organizationId]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = cur.rows[0];
    if (!['draft', 'rejected'].includes(order.status)) return res.status(409).json({ error: 'Lines can only be pulled into a draft order' });

    const qh = await query('SELECT * FROM idyq_quotes WHERE idyq_id = $1 AND organisation_id = $2', [idyqQuoteId, ctx.organizationId]);
    const quote = qh.rows[0] || null;
    const ql = await query(
      `SELECT l.* FROM idyq_quote_lines l
       JOIN idyq_quotes q ON q.id = l.idyq_quote_id
       WHERE q.idyq_id = $1 AND l.organisation_id = $2 ORDER BY l.sort_order`,
      [idyqQuoteId, ctx.organizationId]
    );
    if (ql.rows.length === 0) return res.status(404).json({ error: 'No mirrored lines for that quote. Sync IdoYourQuotes first.' });

    const existing = await query('SELECT COALESCE(MAX(sort_order),-1) AS m FROM order_lines WHERE order_id = $1', [req.params.id]);
    let sort = num(existing.rows[0].m) + 1;
    for (const l of ql.rows) {
      const qty = num(l.qty) || 1;
      const unitCost = l.cost_price != null ? num(l.cost_price) : 0;
      let unitProfit;
      if (l.line_profit != null) unitProfit = num(l.line_profit) / qty;
      else if (l.unit_price != null) unitProfit = num(l.unit_price) - unitCost;
      else unitProfit = 0;
      await query(
        `INSERT INTO order_lines
           (order_id, organisation_id, description, qty, supplier_url, unit_cost, unit_profit, source, idyq_quote_id, line_type, sort_order)
         VALUES ($1,$2,$3,$4,NULL,$5,$6,'idyq',$7,$8,$9)`,
        [req.params.id, ctx.organizationId, l.description || 'Item', qty, unitCost, unitProfit, idyqQuoteId, l.line_type || null, sort++]
      );
    }
    if (!order.contact_id && quote?.linked_contact_id) {
      await query('UPDATE orders SET contact_id = $3, updated_at = NOW() WHERE id = $1 AND organisation_id = $2', [req.params.id, ctx.organizationId, quote.linked_contact_id]);
    }
    res.json({ ...(await fetchOrder(req.params.id, ctx.organizationId)), pulled: ql.rows.length });
  } catch (err) {
    console.error('Order pull-quote error:', err);
    res.status(500).json({ error: 'Failed to pull quote' });
  }
});

module.exports = router;
