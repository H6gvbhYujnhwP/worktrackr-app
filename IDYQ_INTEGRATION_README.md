# IdoYourQuotes (IDYQ) Integration — WorkTrackr side

Read-only, server-to-server pull of IDYQ's **catalogue** and **quotes** into
WorkTrackr. Per-account opt-in: OFF by default, turned on with a "Connect
IdoYourQuotes" switch. When ON, the Product Catalog and Quotes tabs become
read-only windows fed from IDYQ; WorkTrackr's own catalogue/quote editing is
switched off and Quote Templates is hidden (frontend phase). Nothing is ever
written back to IDYQ.

## What was added (backend phase)

- `web/migrations/create_idyq_integration_tables.sql` — mirror tables, the
  connection toggle, the incremental cursor, and the WorkTrackr-only link layer.
  Runs automatically on next deploy (web server runs pending migrations on start).
- `shared/idyq/idyqClient.js` — signs every request (HMAC) and calls IDYQ.
- `shared/idyq/idyqSync.js` — catalogue sync + quotes pull, idempotent upserts,
  pagination, incremental `?since` cursor.
- `shared/idyq/index.js` — re-exports the above.
- `web/routes/idyq.js` — mounted at `/api/idyq`: connection toggle, on-demand
  sync, read endpoints the tabs render, and quote→contact linking.
- `worker/worker.js` — a scheduled `idyq-sync` job (every 30 min by default).

## Environment variables (set on BOTH the web service and the worker service)

| Var | Notes |
|---|---|
| `WORKTRACKR_BRIDGE_SECRET` | long random hex; the SAME value on IDYQ; DIFFERENT from Studio's `IDYQ_BRIDGE_SECRET`; never committed |
| `IDYQ_BASE_URL` | defaults to `https://idoyourquotes.com` |
| `IDYQ_BRIDGE_EXPIRY_SECONDS` | optional, default `90` (60–120s window) |
| `IDYQ_SYNC_CRON` | optional, default `*/30 * * * *` |

Generate the secret (Windows terminal):
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## How it behaves

- **Connect** (CRM Settings → Connect IdoYourQuotes): flips the switch on for that
  account and does a first sync so the tabs aren't empty.
- **Scheduled sync** (worker): every 30 min, pulls only what changed since last time
  for every connected account.
- **On-demand**: "Sync now" for catalogue/quotes, or pull a single quote by number.
- **Idempotent**: re-pulling the same data just updates the existing rows
  (keyed on IDYQ's own id). Quote line items are replaced as a set per quote.

## Where the data lands

| IDYQ | WorkTrackr table |
|---|---|
| product | `idyq_products` |
| quote (header + flattened customer) | `idyq_quotes` |
| quote line items | `idyq_quote_lines` |
| (WorkTrackr-only) quote ↔ contact/customer link | `idyq_quotes.linked_contact_id` / `linked_customer_id` |

These are SEPARATE from native `products` / `quotes` so there's no collision and
disconnecting never touches WorkTrackr's own data.

## Endpoints (all under /api/idyq, auth required)

- `GET  /connection` — status for the settings screen
- `POST /connection/connect` / `POST /connection/disconnect`
- `POST /sync/catalogue` — sync now
- `POST /sync/quotes` — sync now (body: `{ since?, status? }`)
- `POST /pull/quote` — by number (body: `{ quote_number }`)
- `GET  /catalogue` — read-only product list for the Catalog tab
- `GET  /quotes` — read-only quote list for the Quotes tab
- `GET  /quotes/:idyqId` — one quote + line items
- `POST /quotes/:idyqId/link` — link a quote to a contact/customer

## TWO THINGS TO CONFIRM (then a one-line change each)

1. **IDYQ list response shape.** The code tolerantly reads items from
   `products`/`quotes`/`data`/`results` or a bare array, and detects more pages via
   `has_more` / `next_page` / `total_pages`. If IDYQ uses none of those, it stops
   after page 1 (safe). Send one real sample reply and we lock it down in
   `idyqSync.js` (`extractItems` / `hasMore`).
2. **Studio's signing details.** We sign `"<expiry>.<nonce>.GET.<path>"` with the
   path ONLY (no query string), lowercase hex, 90s expiry. If Studio signs the
   path **including** the query string, set `SIGN_INCLUDES_QUERY = true` in
   `idyqClient.js`. Confirm the expiry window too.

## Still to do (frontend phase)

Wire the CRM page so that when `GET /api/idyq/connection` reports `enabled: true`:
the Product Catalog and Quotes tabs render from `/api/idyq/...` in read-only mode
(no add/edit/delete), Quote Templates is hidden, and a "Connect/Disconnect" control
plus "Sync now" lives in CRM Settings. (Needs a read of the CRM component first.)
