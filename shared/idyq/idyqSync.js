/**
 * IdoYourQuotes (IDYQ) sync logic.
 *
 * Pulls IDYQ's catalogue and quotes into WorkTrackr's read-only mirror tables
 * (idyq_products, idyq_quotes, idyq_quote_lines). Upserts by IDYQ's own id, so
 * re-pulling is idempotent. Supports incremental pulls via a stored ?since cursor.
 *
 * Used by BOTH:
 *   - web/routes/idyq.js   (on-demand: "Sync now", pull a single quote)
 *   - worker/worker.js     (scheduled periodic sync)
 *
 * ── WHERE THE DATA LANDS (field mapping) ──
 *   IDYQ product { id, sku, name, description, unit_price, currency, category,
 *                  active, updated_at }
 *     -> idyq_products.{ idyq_id, sku, name, description, unit_price, currency,
 *                        category, active, source_updated_at }  (+ raw, synced_at)
 *
 *   IDYQ quote   { id, quote_number, status, currency, total,
 *                  customer:{name,email,company}, line_items:[...],
 *                  created_at, updated_at }
 *     -> idyq_quotes.{ idyq_id, quote_number, status, currency, total,
 *                      customer_name, customer_email, customer_company,
 *                      source_created_at, source_updated_at }  (+ raw, synced_at)
 *   IDYQ line    { product_id, sku, description, qty, unit_price, line_total }
 *     -> idyq_quote_lines.{ idyq_product_id, sku, description, qty, unit_price,
 *                           line_total }  (sort_order = position in array)
 *
 * ── ASSUMPTIONS TO CONFIRM ON THE IDYQ SIDE (change extractItems/hasMore below) ──
 *   - List responses are paginated by ?page= (1-based).
 *   - The item array is under top-level key "products" / "quotes" (we also accept
 *     "data"/"results" or a bare array).
 *   - Pagination metadata is one of: has_more, next_page, total_pages. If NONE is
 *     present we stop after page 1 (safe: no infinite loop) — confirm the real
 *     envelope and we lock this down.
 *   - ?since= filters on updated_at (ISO-8601 UTC).
 */

const { query, transaction } = require('../db');
const { idyqGet } = require('./idyqClient');

const MAX_PAGES = 200; // safety cap against runaway pagination

// ---- envelope helpers (tolerant until IDYQ shape is confirmed) --------------

function extractItems(resp, key) {
  if (Array.isArray(resp)) return resp;
  if (resp && Array.isArray(resp[key])) return resp[key];
  if (resp && Array.isArray(resp.data)) return resp.data;
  if (resp && Array.isArray(resp.results)) return resp.results;
  return [];
}

function hasMore(resp, page) {
  if (!resp || Array.isArray(resp)) return false;
  if (typeof resp.has_more === 'boolean') return resp.has_more;
  if (resp.next_page) return true;
  if (resp.total_pages != null) return Number(page) < Number(resp.total_pages);
  return false; // unknown envelope -> stop (corrected once shape confirmed)
}

function maxIso(a, b) {
  if (!a) return b;
  if (!b) return a;
  return new Date(a) > new Date(b) ? a : b;
}

// ---- sync state (incremental cursor) ----------------------------------------

async function getCursor(organisationId, resource) {
  const r = await query(
    'SELECT last_cursor FROM idyq_sync_state WHERE organisation_id = $1 AND resource = $2',
    [organisationId, resource]
  );
  return r.rows[0]?.last_cursor || null;
}

async function setSyncState(organisationId, resource, { cursor, status, error }) {
  await query(
    `INSERT INTO idyq_sync_state (organisation_id, resource, last_cursor, last_run_at, last_status, last_error)
     VALUES ($1, $2, $3, NOW(), $4, $5)
     ON CONFLICT (organisation_id, resource) DO UPDATE SET
       last_cursor = COALESCE(EXCLUDED.last_cursor, idyq_sync_state.last_cursor),
       last_run_at = NOW(),
       last_status = EXCLUDED.last_status,
       last_error  = EXCLUDED.last_error`,
    [organisationId, resource, cursor || null, status, error || null]
  );
}

// ---- catalogue --------------------------------------------------------------

async function upsertProduct(organisationId, p) {
  await query(
    `INSERT INTO idyq_products
       (organisation_id, idyq_id, sku, name, description, unit_price, currency,
        category, active, source_updated_at, raw, synced_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb, NOW())
     ON CONFLICT (organisation_id, idyq_id) DO UPDATE SET
       sku = EXCLUDED.sku, name = EXCLUDED.name, description = EXCLUDED.description,
       unit_price = EXCLUDED.unit_price, currency = EXCLUDED.currency,
       category = EXCLUDED.category, active = EXCLUDED.active,
       source_updated_at = EXCLUDED.source_updated_at, raw = EXCLUDED.raw,
       synced_at = NOW()`,
    [
      organisationId,
      String(p.id),
      p.sku ?? null,
      p.name ?? null,
      p.description ?? null,
      p.unit_price ?? null,
      p.currency ?? null,
      p.category ?? null,
      typeof p.active === 'boolean' ? p.active : null,
      p.updated_at ?? null,
      JSON.stringify(p),
    ]
  );
}

/**
 * Sync the IDYQ catalogue into idyq_products.
 * @param {object} opts
 * @param {string} opts.organisationId
 * @param {string} [opts.since] ISO timestamp override; otherwise the stored cursor is used
 */
async function syncCatalogue({ organisationId, since } = {}) {
  if (!organisationId) throw new Error('organisationId is required');
  const effectiveSince = since !== undefined ? since : await getCursor(organisationId, 'catalogue');
  let page = 1;
  let count = 0;
  let cursor = effectiveSince || null;

  try {
    while (page <= MAX_PAGES) {
      const resp = await idyqGet('/api/external/catalogue', { since: effectiveSince, page });
      const items = extractItems(resp, 'products');
      for (const p of items) {
        await upsertProduct(organisationId, p);
        cursor = maxIso(cursor, p.updated_at);
        count++;
      }
      if (!hasMore(resp, page)) break;
      page++;
    }
    await setSyncState(organisationId, 'catalogue', { cursor, status: 'ok', error: null });
    await query(
      'UPDATE idyq_connection SET last_catalogue_sync_at = NOW(), updated_at = NOW() WHERE organisation_id = $1',
      [organisationId]
    );
    return { resource: 'catalogue', count, cursor };
  } catch (err) {
    await setSyncState(organisationId, 'catalogue', { cursor: null, status: 'error', error: err.message });
    throw err;
  }
}

// ---- quotes -----------------------------------------------------------------

async function upsertQuote(organisationId, q) {
  const customer = q.customer || {};
  await transaction(async (client) => {
    const res = await client.query(
      `INSERT INTO idyq_quotes
         (organisation_id, idyq_id, quote_number, status, currency, total,
          customer_name, customer_email, customer_company,
          source_created_at, source_updated_at, raw, synced_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb, NOW())
       ON CONFLICT (organisation_id, idyq_id) DO UPDATE SET
         quote_number = EXCLUDED.quote_number, status = EXCLUDED.status,
         currency = EXCLUDED.currency, total = EXCLUDED.total,
         customer_name = EXCLUDED.customer_name, customer_email = EXCLUDED.customer_email,
         customer_company = EXCLUDED.customer_company,
         source_created_at = EXCLUDED.source_created_at,
         source_updated_at = EXCLUDED.source_updated_at,
         raw = EXCLUDED.raw, synced_at = NOW()
       RETURNING id`,
      [
        organisationId,
        String(q.id),
        q.quote_number ?? null,
        q.status ?? null,
        q.currency ?? null,
        q.total ?? null,
        customer.name ?? null,
        customer.email ?? null,
        customer.company ?? null,
        q.created_at ?? null,
        q.updated_at ?? null,
        JSON.stringify(q),
      ]
    );
    const quoteRowId = res.rows[0].id;

    // Replace line items (IDYQ lines have no stable id -> replace whole set).
    await client.query('DELETE FROM idyq_quote_lines WHERE idyq_quote_id = $1', [quoteRowId]);
    const lines = Array.isArray(q.line_items) ? q.line_items : [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      await client.query(
        `INSERT INTO idyq_quote_lines
           (idyq_quote_id, organisation_id, idyq_product_id, sku, description,
            qty, unit_price, line_total, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          quoteRowId,
          organisationId,
          l.product_id != null ? String(l.product_id) : null,
          l.sku ?? null,
          l.description ?? null,
          l.qty ?? null,
          l.unit_price ?? null,
          l.line_total ?? null,
          i,
        ]
      );
    }
    return quoteRowId;
  });
}

/**
 * Pull IDYQ quotes into idyq_quotes / idyq_quote_lines.
 * @param {object} opts
 * @param {string} opts.organisationId
 * @param {string} [opts.since] ISO override; otherwise stored cursor
 * @param {string} [opts.status] optional status filter passed to IDYQ
 */
async function pullQuotes({ organisationId, since, status } = {}) {
  if (!organisationId) throw new Error('organisationId is required');
  const effectiveSince = since !== undefined ? since : await getCursor(organisationId, 'quotes');
  let page = 1;
  let count = 0;
  let cursor = effectiveSince || null;

  try {
    while (page <= MAX_PAGES) {
      const resp = await idyqGet('/api/external/quotes', { since: effectiveSince, status, page });
      const items = extractItems(resp, 'quotes');
      for (const q of items) {
        await upsertQuote(organisationId, q);
        cursor = maxIso(cursor, q.updated_at);
        count++;
      }
      if (!hasMore(resp, page)) break;
      page++;
    }
    await setSyncState(organisationId, 'quotes', { cursor, status: 'ok', error: null });
    await query(
      'UPDATE idyq_connection SET last_quotes_sync_at = NOW(), updated_at = NOW() WHERE organisation_id = $1',
      [organisationId]
    );
    return { resource: 'quotes', count, cursor };
  } catch (err) {
    await setSyncState(organisationId, 'quotes', { cursor: null, status: 'error', error: err.message });
    throw err;
  }
}

/**
 * On-demand pull of a single quote by its IDYQ quote_number.
 * If we already know the IDYQ id (from a previous sync) we fetch it directly via
 * GET /api/external/quotes/:id. Otherwise we scan quote pages to find the number,
 * upserting as we go (idempotent), and return the match.
 *
 * NOTE: the single-quote endpoint is /:id (IDYQ id). If IDYQ also accepts a
 * quote_number there, or adds a ?quote_number= filter, this can be simplified.
 */
async function pullQuoteByNumber({ organisationId, quoteNumber } = {}) {
  if (!organisationId || !quoteNumber) throw new Error('organisationId and quoteNumber are required');

  // 1) Do we already know the IDYQ id for this number?
  const known = await query(
    'SELECT idyq_id FROM idyq_quotes WHERE organisation_id = $1 AND quote_number = $2',
    [organisationId, quoteNumber]
  );
  if (known.rows[0]?.idyq_id) {
    const full = await idyqGet(`/api/external/quotes/${encodeURIComponent(known.rows[0].idyq_id)}`);
    const quote = full && full.quote ? full.quote : full; // accept {quote:{...}} or bare {...}
    await upsertQuote(organisationId, quote);
    return { found: true, quoteNumber, via: 'id' };
  }

  // 2) Otherwise scan list pages for the matching number.
  let page = 1;
  while (page <= MAX_PAGES) {
    const resp = await idyqGet('/api/external/quotes', { page });
    const items = extractItems(resp, 'quotes');
    let match = null;
    for (const q of items) {
      await upsertQuote(organisationId, q); // idempotent; warms the mirror
      if (String(q.quote_number) === String(quoteNumber)) match = q;
    }
    if (match) return { found: true, quoteNumber, via: 'scan' };
    if (!hasMore(resp, page)) break;
    page++;
  }
  return { found: false, quoteNumber };
}

// ---- run for all connected orgs (used by the scheduled worker) --------------

async function syncAllConnectedOrgs() {
  const orgs = await query('SELECT organisation_id FROM idyq_connection WHERE enabled = TRUE');
  const results = [];
  for (const row of orgs.rows) {
    const orgId = row.organisation_id;
    try {
      const cat = await syncCatalogue({ organisationId: orgId });
      const qts = await pullQuotes({ organisationId: orgId });
      results.push({ organisationId: orgId, ok: true, catalogue: cat.count, quotes: qts.count });
    } catch (err) {
      results.push({ organisationId: orgId, ok: false, error: err.message });
    }
  }
  return results;
}

module.exports = {
  syncCatalogue,
  pullQuotes,
  pullQuoteByNumber,
  syncAllConnectedOrgs,
  // exported for reuse/testing
  upsertProduct,
  upsertQuote,
  getCursor,
};
