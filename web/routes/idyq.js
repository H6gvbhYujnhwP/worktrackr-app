/**
 * IdoYourQuotes (IDYQ) integration routes.
 * Mounted at /api/idyq (behind authenticateToken).
 *
 * Connection model: per-organisation on/off switch ("Connect IdoYourQuotes" in
 * CRM Settings). When OFF (the default), WorkTrackr behaves exactly as before.
 * When ON, the frontend swaps the Product Catalog + Quotes tabs to read-only
 * windows fed by the read endpoints here, hides Quote Templates, and turns off
 * WorkTrackr's own catalogue/quote editing.
 *
 * Read-only: nothing here ever writes back to IDYQ. The only writes are the
 * connection toggle and the WorkTrackr-only "link" between a quote and a contact.
 */

const express = require('express');
const { z } = require('zod');
const { query } = require('@worktrackr/shared/db');
const { syncCatalogue, fetchCatalogueLive, pullQuotes, pullQuoteByNumber } = require('@worktrackr/shared/idyq');

const router = express.Router();

// --- helpers ----------------------------------------------------------------

// Soft admin gate. TODO: tighten to your exact owner/admin role names once confirmed.
function isAdmin(orgContext) {
  if (!orgContext) return false;
  if (orgContext.type === 'partner_admin') return true;
  const role = (orgContext.role || '').toLowerCase();
  return ['owner', 'admin'].includes(role) || role === ''; // role unknown -> allow for now
}

async function getConnection(organisationId) {
  const r = await query('SELECT * FROM idyq_connection WHERE organisation_id = $1', [organisationId]);
  return r.rows[0] || null;
}

function requireEnabled(conn, res) {
  if (!conn || !conn.enabled) {
    res.status(409).json({ error: 'IdoYourQuotes is not connected for this organisation' });
    return false;
  }
  return true;
}

const mapProduct = (r) => ({
  id: r.id,
  idyqId: r.idyq_id,
  sku: r.sku,
  name: r.name,
  description: r.description,
  unit: r.unit,
  unitPrice: r.unit_price,
  costPrice: r.cost_price,
  installHours: r.install_hours,
  pricingType: r.pricing_type,
  currency: r.currency,
  category: r.category,
  active: r.active,
  sourceUpdatedAt: r.source_updated_at,
  syncedAt: r.synced_at,
});

// Map a LIVE IDYQ catalogue item (IDYQ's own shape) to the frontend shape.
const mapLiveProduct = (p) => ({
  id: p.id,
  idyqId: String(p.id),
  sku: p.sku ?? null,
  name: p.name,
  description: p.description ?? null,
  unit: p.unit ?? null,
  unitPrice: p.unit_price ?? null,
  costPrice: p.cost_price ?? null,
  installHours: p.install_hours ?? null,
  pricingType: p.pricing_type ?? null,
  currency: p.currency ?? 'GBP',
  category: p.category ?? null,
  active: p.active,
  sourceUpdatedAt: p.updated_at ?? null,
});

const mapQuote = (r) => ({
  id: r.id,
  idyqId: r.idyq_id,
  quoteNumber: r.quote_number,
  status: r.status,
  currency: r.currency,
  total: r.total,
  customer: { name: r.customer_name, email: r.customer_email, company: r.customer_company },
  sourceCreatedAt: r.source_created_at,
  sourceUpdatedAt: r.source_updated_at,
  syncedAt: r.synced_at,
  linkedContactId: r.linked_contact_id,
});

const mapLine = (r) => ({
  id: r.id,
  idyqProductId: r.idyq_product_id,
  sku: r.sku,
  description: r.description,
  qty: r.qty,
  unitPrice: r.unit_price,
  lineTotal: r.line_total,
  sortOrder: r.sort_order,
});

// --- connection (toggle + status) -------------------------------------------

// GET /api/idyq/connection  -> status for the CRM Settings screen
router.get('/connection', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const conn = await getConnection(organizationId);
    const state = await query(
      'SELECT resource, last_run_at, last_status, last_error, last_cursor FROM idyq_sync_state WHERE organisation_id = $1',
      [organizationId]
    );
    res.json({
      enabled: !!conn?.enabled,
      idyqOrgRef: conn?.idyq_org_ref || null,
      connectedAt: conn?.connected_at || null,
      lastCatalogueSyncAt: conn?.last_catalogue_sync_at || null,
      lastQuotesSyncAt: conn?.last_quotes_sync_at || null,
      syncState: state.rows,
    });
  } catch (err) {
    console.error('idyq/connection error:', err);
    res.status(500).json({ error: 'Failed to load IDYQ connection status' });
  }
});

// POST /api/idyq/connection/connect  -> turn it on (+ best-effort first sync)
router.post('/connection/connect', async (req, res) => {
  try {
    if (!isAdmin(req.orgContext)) return res.status(403).json({ error: 'Admins only' });
    const { organizationId } = req.orgContext;
    const userId = req.user?.userId || null;

    // Which IDYQ org to read from (slug or numeric id), entered at connect time.
    const schema = z.object({ idyqOrgRef: z.string().min(1) });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'idyqOrgRef is required (your IDYQ org slug or id)' });
    }
    const { idyqOrgRef } = parsed.data;

    await query(
      `INSERT INTO idyq_connection (organisation_id, enabled, idyq_org_ref, connected_at, connected_by, updated_at)
       VALUES ($1, TRUE, $3, NOW(), $2, NOW())
       ON CONFLICT (organisation_id) DO UPDATE SET
         enabled = TRUE, idyq_org_ref = $3, connected_at = NOW(), connected_by = $2, updated_at = NOW()`,
      [organizationId, userId, idyqOrgRef]
    );

    // First sync so the tabs aren't empty. Best-effort: report but don't fail connect.
    let firstSync = null;
    try {
      const cat = await syncCatalogue({ organisationId: organizationId });
      const qts = await pullQuotes({ organisationId: organizationId });
      firstSync = { catalogue: cat.count, quotes: qts.count };
    } catch (syncErr) {
      firstSync = { error: syncErr.message };
    }

    res.json({ enabled: true, firstSync });
  } catch (err) {
    console.error('idyq/connect error:', err);
    res.status(500).json({ error: 'Failed to connect IdoYourQuotes' });
  }
});

// POST /api/idyq/connection/disconnect  -> turn it off (keeps mirrored data)
router.post('/connection/disconnect', async (req, res) => {
  try {
    if (!isAdmin(req.orgContext)) return res.status(403).json({ error: 'Admins only' });
    const { organizationId } = req.orgContext;
    await query(
      `INSERT INTO idyq_connection (organisation_id, enabled, updated_at)
       VALUES ($1, FALSE, NOW())
       ON CONFLICT (organisation_id) DO UPDATE SET enabled = FALSE, updated_at = NOW()`,
      [organizationId]
    );
    res.json({ enabled: false });
  } catch (err) {
    console.error('idyq/disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect IdoYourQuotes' });
  }
});

// --- on-demand sync ----------------------------------------------------------

// POST /api/idyq/sync/catalogue
router.post('/sync/catalogue', async (req, res) => {
  try {
    if (!isAdmin(req.orgContext)) return res.status(403).json({ error: 'Admins only' });
    const { organizationId } = req.orgContext;
    const conn = await getConnection(organizationId);
    if (!requireEnabled(conn, res)) return;
    const result = await syncCatalogue({ organisationId: organizationId });
    res.json(result);
  } catch (err) {
    console.error('idyq/sync/catalogue error:', err);
    res.status(502).json({ error: 'Catalogue sync failed', details: err.message });
  }
});

// POST /api/idyq/sync/quotes   body: { since?, status? }
router.post('/sync/quotes', async (req, res) => {
  try {
    if (!isAdmin(req.orgContext)) return res.status(403).json({ error: 'Admins only' });
    const { organizationId } = req.orgContext;
    const conn = await getConnection(organizationId);
    if (!requireEnabled(conn, res)) return;
    const schema = z.object({ since: z.string().optional(), status: z.string().optional() });
    const { since, status } = schema.parse(req.body || {});
    const result = await pullQuotes({ organisationId: organizationId, since, status });
    res.json(result);
  } catch (err) {
    console.error('idyq/sync/quotes error:', err);
    res.status(502).json({ error: 'Quotes sync failed', details: err.message });
  }
});

// POST /api/idyq/pull/quote   body: { quote_number }
router.post('/pull/quote', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const conn = await getConnection(organizationId);
    if (!requireEnabled(conn, res)) return;
    const schema = z.object({ quote_number: z.string().min(1) });
    const { quote_number } = schema.parse(req.body || {});
    const result = await pullQuoteByNumber({ organisationId: organizationId, quoteNumber: quote_number });
    if (!result.found) return res.status(404).json({ error: 'Quote not found in IdoYourQuotes', quoteNumber: quote_number });
    res.json(result);
  } catch (err) {
    console.error('idyq/pull/quote error:', err);
    res.status(502).json({ error: 'Quote pull failed', details: err.message });
  }
});

// --- read the mirror (what the read-only tabs render) ------------------------

// GET /api/idyq/catalogue  -> LIVE from IDYQ (always current), mirror as fallback
router.get('/catalogue', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const conn = await getConnection(organizationId);
    if (!requireEnabled(conn, res)) return;

    // Live read-through: adds/edits/deletes in IDYQ show immediately.
    try {
      const items = await fetchCatalogueLive({ organisationId: organizationId });
      const products = items.map(mapLiveProduct);
      return res.json({ products, total: products.length, readOnly: true, live: true });
    } catch (liveErr) {
      console.warn('idyq/catalogue live fetch failed, falling back to stored copy:', liveErr.message);
      const rows = await query(
        'SELECT * FROM idyq_products WHERE organisation_id = $1 ORDER BY name NULLS LAST',
        [organizationId]
      );
      return res.json({
        products: rows.rows.map(mapProduct),
        total: rows.rows.length,
        readOnly: true,
        live: false,
        stale: true,
      });
    }
  } catch (err) {
    console.error('idyq/catalogue error:', err);
    res.status(500).json({ error: 'Failed to load IDYQ catalogue' });
  }
});

// GET /api/idyq/quotes?search=&status=&page=&limit=
router.get('/quotes', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const conn = await getConnection(organizationId);
    if (!requireEnabled(conn, res)) return;
    const { search, status, page = 1, limit = 50 } = req.query;

    let where = 'WHERE organisation_id = $1';
    const params = [organizationId];
    let n = 1;
    if (status) {
      where += ` AND status = $${++n}`;
      params.push(status);
    }
    if (search) {
      where += ` AND (quote_number ILIKE $${++n} OR customer_name ILIKE $${n} OR customer_company ILIKE $${n})`;
      params.push(`%${search}%`);
    }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const rows = await query(
      `SELECT * FROM idyq_quotes ${where} ORDER BY source_updated_at DESC NULLS LAST LIMIT $${++n} OFFSET $${++n}`,
      [...params, parseInt(limit), offset]
    );
    const total = await query(`SELECT COUNT(*)::int AS c FROM idyq_quotes ${where}`, params);
    res.json({ quotes: rows.rows.map(mapQuote), total: total.rows[0].c, readOnly: true });
  } catch (err) {
    console.error('idyq/quotes error:', err);
    res.status(500).json({ error: 'Failed to load IDYQ quotes' });
  }
});

// GET /api/idyq/quotes/:idyqId  -> one quote + its line items + link info
router.get('/quotes/:idyqId', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const conn = await getConnection(organizationId);
    if (!requireEnabled(conn, res)) return;
    const q = await query(
      'SELECT * FROM idyq_quotes WHERE organisation_id = $1 AND idyq_id = $2',
      [organizationId, req.params.idyqId]
    );
    if (q.rows.length === 0) return res.status(404).json({ error: 'Quote not found' });
    const lines = await query(
      'SELECT * FROM idyq_quote_lines WHERE idyq_quote_id = $1 ORDER BY sort_order',
      [q.rows[0].id]
    );
    res.json({ quote: mapQuote(q.rows[0]), lineItems: lines.rows.map(mapLine), readOnly: true });
  } catch (err) {
    console.error('idyq/quotes/:id error:', err);
    res.status(500).json({ error: 'Failed to load IDYQ quote' });
  }
});

// --- link layer (WorkTrackr-only: tie a quote to a contact/customer) ---------

// POST /api/idyq/quotes/:idyqId/link   body: { contactId }  (null to unlink)
router.post('/quotes/:idyqId/link', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const conn = await getConnection(organizationId);
    if (!requireEnabled(conn, res)) return;
    const schema = z.object({
      contactId: z.string().uuid().nullable().optional(),
    });
    const body = schema.parse(req.body || {});
    if (!('contactId' in body)) return res.status(400).json({ error: 'Nothing to link' });

    const r = await query(
      `UPDATE idyq_quotes SET linked_contact_id = $3
       WHERE organisation_id = $1 AND idyq_id = $2 RETURNING *`,
      [organizationId, req.params.idyqId, body.contactId ?? null]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Quote not found' });
    res.json({ quote: mapQuote(r.rows[0]) });
  } catch (err) {
    console.error('idyq/quotes/:id/link error:', err);
    res.status(500).json({ error: 'Failed to link quote' });
  }
});

module.exports = router;
