# WorkTrackr — CRM, Ordering & Commission Roadmap (v1.0)

**Status:** Living document. Phase 0 (IdoYourQuotes integration) is built, deployed and working in production. Phases 1–6 (CRM redesign, ordering, commission, role dashboards) are designed (UX mockups approved in principle) and not yet built.

**Last updated:** 2026-06-17

**Purpose:** Single source of truth for the WorkTrackr sales/CRM redesign and the IdoYourQuotes (IDYQ) integration. Captures everything discussed so the work survives any loss of chat history. Nothing here should be assumed "done" unless it is under "Phase 0 — already built".

---

## 1. Vision & guiding principles

WorkTrackr is becoming a **company-centred CRM + ordering + commission system**, marketed to **all business sectors** (not just IT/MSP). Every design choice must therefore be:

- **Company-centred.** The company/customer record is the centre of the CRM. Contacts, tasks, notes, history, orders, deals and services all link back to the company. (In the current DB a "company" is a `contacts` row of type `company` — the old `customers` table was dropped in the customers→contacts merge.)
- **Pipeline-driven.** Companies move through sales stages: **Suspect → Prospect → Hot Prospect → Customer**. A salesperson can filter to their Hot Prospects and see who to revisit to get a deal over the line. Winning a deal converts it into a proper sale (an Order).
- **Configurable / multi-sector.** Commission rules, the order form's purchasing fields, and per-role screens must be configurable and switch-off-able. Use neutral terms ("Orders", "Contracts") rather than IT-specific language. The Sweetbyte commission scheme is *one configured ruleset*, not hard-coded behaviour.
- **Two delivery branches.** (A) **One-off jobs** = an Order Form created in WorkTrackr (purchasing/margin sheet). (B) **Recurring IT support/services** = Contracts that originate from IDYQ quotes.
- **Role-appropriate visibility.** Sales staff see commission/bonus. Engineers must **never** see per-company deal profit — they see a wage-progression screen instead (see §8).

---

## 2. Phase 0 — IdoYourQuotes (IDYQ) integration — ALREADY BUILT & LIVE

A read-only, server-to-server bridge that lets WorkTrackr pull IDYQ's catalogue and quotes. Built, deployed to both Render apps, and tested end-to-end.

### 2.1 The two apps
- **WorkTrackr** — `worktrackr-app`, domain `worktrackr.cloud`. Node 20 + Express, CommonJS, PostgreSQL via `pg`, npm workspaces (`web` / `worker` / `shared`). React/Vite client. The `web` service auto-runs migrations on startup (`web/run-migrations.js` scans `web/migrations/*.sql`, tracks them in `schema_migrations`, runs alphabetically in transactions). DB helpers in `shared/db.js` (`query`, `transaction`, `getOrgContext`). Multi-tenant by `organisations`; routes use `req.orgContext.organizationId`; cookie auth (`authenticateToken`).
- **IDYQ (IdoYourQuotes)** — `idoyourquotes-main`, app domain `wedoyourquotes.com` (alias `idoyourquotes.com`). TypeScript ESM, Drizzle ORM, Express + tRPC, pnpm, esbuild. **Entry point is `server/_core/index.ts`** (NOT `server/index.ts`, which is a stale duplicate). DB helpers in `server/db.ts`; runtime schema in `drizzle/schema.ts`.

Both repos are owned by GitHub account `H6gvbhYujnhwP`; the user pushes via GitHub Desktop from `C:\repo` on Windows. Render auto-deploys on push.

### 2.2 Design decision
Read-only **PULL** from WorkTrackr → IDYQ. WorkTrackr keeps **mirror tables** (separate from its own native products/quotes). Per-organisation **opt-in** connection. IDYQ remains the single source of truth for quote/catalogue content.

### 2.3 Signing scheme (HMAC) — proven working both directions
- Payload string = `<expiryUnixSeconds>.<nonce>.<METHOD>.<PATH>` where PATH is the path only (NO query string; `SIGN_INCLUDES_QUERY=false`).
- HMAC-SHA256 with the shared secret → lowercase hex.
- Sent as header `X-WT-Signature: <expiry>.<nonce>.<hmac>`, ~90s expiry (IDYQ accepts up to `now + 130s`).
- IDYQ verifies constant-time, checks expiry, returns 403 (invalid) / 400 (missing org).

### 2.4 Per-org scoping
- WorkTrackr sends `X-WT-Org: <idyq-org-slug-or-id>` on every request.
- Stored per WorkTrackr org in `idyq_connection.idyq_org_ref`, set at connect time.
- IDYQ resolves slug or numeric id → org and scopes all data to it.
- **Security follow-up (before onboarding 3rd-party customers):** any secret-holder can currently request any org via the header. Needs an allow-list. (Tracked in §11.)

### 2.5 Environment variables (set in Render, confirmed)
- **WorkTrackr (web + worker):** `WORKTRACKR_BRIDGE_SECRET`, `IDYQ_BASE_URL=https://idoyourquotes.com`. Optional: `IDYQ_BRIDGE_EXPIRY_SECONDS` (default 90), `IDYQ_SYNC_CRON` (default `*/30 * * * *`).
- **IDYQ:** `WORKTRACKR_BRIDGE_SECRET` (same value; kept separate from the pre-existing `STUDIO_BRIDGE_SECRET`). No admin-email var (per-org-header approach is used instead).

### 2.6 IDYQ-side files (deployed)
- `server/_core/worktrackrBridge.ts` (NEW) — `registerWorktrackrBridge(app)`. Verifies `X-WT-Signature`, scopes via `X-WT-Org` → `getOrganizationById/BySlug`. Serves:
  - `GET /api/external/catalogue`
  - `GET /api/external/quotes`
  - `GET /api/external/quotes/:id`
  - Returns `{ products|quotes: [...], page, page_size, total, total_pages, has_more }` and `{ quote: {...} }`. Uses `res.x(); return;` convention (not `return res.x()`) for TS strictness.
- `server/_core/index.ts` (EDITED) — imports and calls `registerWorktrackrBridge(app)` before the tRPC mount.

### 2.7 WorkTrackr-side files (deployed)
- Migrations:
  - `web/migrations/create_idyq_integration_tables.sql` — creates `idyq_connection`, `idyq_products`, `idyq_quotes`, `idyq_quote_lines`, `idyq_sync_state`. `idyq_quotes.linked_contact_id` FK → `contacts` (WorkTrackr-only quote↔contact link). **No `customers` FK** (that was the original deploy-breaking bug; fixed).
  - `web/migrations/idyq_add_org_ref.sql` — adds `idyq_connection.idyq_org_ref`.
  - `web/migrations/idyq_catalogue_fields.sql` — adds `idyq_products.unit`, `cost_price`, `install_hours`, `pricing_type` (ALTER … ADD COLUMN IF NOT EXISTS).
- `shared/idyq/idyqClient.js` — `idyqGet(path, query, opts)` signs requests and sets `X-WT-Org` from `opts.orgRef`. Exports `buildSignatureHeader`, `getConfig`.
- `shared/idyq/idyqSync.js` — `syncCatalogue`, `fetchCatalogueLive` (all pages, raw IDYQ objects, for live read-through), `pullQuotes`, `pullQuoteByNumber`, `syncAllConnectedOrgs`, `getOrgRef`. Idempotent upsert by `(organisation_id, idyq_id)`; quote lines replaced per-quote (IDYQ lines have no stable id).
- `shared/idyq/index.js` — re-exports client + sync.
- `web/routes/idyq.js` — mounted at `/api/idyq`. Endpoints:
  - `GET/POST /connection`, `POST /connection/connect {idyqOrgRef}`, `POST /connection/disconnect`
  - `POST /sync/catalogue`, `POST /sync/quotes`, `POST /pull/quote`
  - `GET /catalogue` — **LIVE read-through** via `fetchCatalogueLive` (always current, incl. deletes), falls back to the mirror if IDYQ is unreachable (returns `live:false, stale:true`).
  - `GET /quotes`, `GET /quotes/:idyqId`, `POST /quotes/:idyqId/link {contactId}`
  - Mappers: `mapProduct` (mirror row), `mapLiveProduct` (live IDYQ shape), `mapQuote`.
- `worker/worker.js` (EDITED) — pg-boss schedule `idyq-sync` every 30 min → `syncAllConnectedOrgs` (keeps the mirror warm as a fallback; the catalogue *display* is live regardless).
- `web/server.js` (EDITED) — mounts `/api/idyq`.
- `web/client/src/app/src/components/IdyqIntegration.jsx` (NEW) — `useIdyqConnection` hook, `IdyqCatalogView` (grouped by category, collapsible, search, Refresh, Expand/Collapse all, live indicator), `IdyqQuotesView` (read-only, expandable line items), `IdyqConnectionPanel` (connect/disconnect/sync, org slug input).
- `web/client/src/app/src/components/CRMDashboard.jsx` (EDITED, 6 splices) — calls the hook; tab labels gain "· IDYQ"; Quote Templates hidden when connected; Catalog & Quotes tabs swap to the IDYQ views when connected; `IdyqConnectionPanel` added to CRM Settings.
- `web/client/src/app/src/components/Sidebar.jsx` (EDITED) — readability fix: inactive nav text `#999`→`#e5e7eb` (hover white); section labels (MAIN/CRM/ACCOUNT) `#555`→`#9ca3af`.

### 2.8 Data-model mapping (IDYQ → WorkTrackr)
**Catalogue items** (`catalogItems`): `id`, `name`, `description`, `category`, `unit`, `defaultRate` → `unit_price` (sell ex-VAT), `costPrice` → `cost_price` (buy-in ex-VAT), `installTimeHrs` → `install_hours`, `pricingType` ('standard'|'monthly') → `pricing_type`, `isActive` (0/1) → `active`. No SKU, no per-item VAT, no currency (hardcoded GBP). Connected catalogue display = **live read-through** (always current).

**Quotes** (`quotes`): `id`, `reference` → `quote_number`, `status`, `total`, `clientName`/`clientEmail` (flat customer; company = `clientName`), `createdAt`/`updatedAt`. No currency (GBP). Line items (`quoteLineItems`): `description`, `quantity` → `qty`, `rate` → `unit_price`, `total` → `line_total`; no product link.

### 2.9 Validation done
All JS `node --check`'d; TS esbuild-transpiled clean. HMAC round-trip + negative tests (tampered path, wrong secret, expired) correct. End-to-end LIVE pull from the WorkTrackr web shell returned the real Sweetbyte catalogue (62 items confirmed in UI). DB tables verified via psql.

### 2.10 IDYQ org slugs (from the DB)
- **Sweetbyte Ltd** = `sweetbyte-ltd-mo5yzrt7` (id 10) — **the live org in use**.
- The Green Agents = `the-green-agents-movpegq1` (id 12).
- Test orgs: `wez-org` (3), `john-org` (4), `wez-and-nic` (13).

### 2.11 "Editable IDYQ" — clarified meaning
The user does **not** want to edit IDYQ quote content from WorkTrackr. "Editable" means: **bring all profit fields across** (sell, buy-in/cost, margin) so WorkTrackr shows each company's services and the **monthly profit** we make — which drives commission/bonus. Beyond data, WorkTrackr should be able to **act on** an IDYQ quote (mark won, convert to Contract/Job, link to a company, set a WorkTrackr-side status) while the quote text stays in IDYQ. (Largely delivered for catalogue/profit; "act on quote" + Contracts is Phase 4.)

---

## 3. Target sales flow (the pipeline)

```
Prospect (telesales — James Edgar)
  → Meeting (notes / phone recording → into IDYQ)
    → Opportunity (linked to Company + sales rep)
      ├── One-off job  → Order Form (items, supplier URL, cost, profit)      [WorkTrackr]
      └── Recurring    → Contract (from IdoYourQuotes quote)                  [IDYQ]
          → Manager approval (approve / order)
            → Purchase / provision
              → Invoice raised (in the customer's accounts system; flagged here)
                → Paid (flagged here)
                  → Commission calculated (engine; only when paid) → manager approve → payroll
```

Two flows, one finance pipeline. The split (one-off purchasing vs recurring contracts) is the core distinction.

---

## 4. Information architecture (new sidebar)

The current flat 15-item menu is being regrouped to follow the flow:

- **Sales** — Prospects, Meetings, Opportunities, Orders (one-off), Contracts (recurring)
- **Delivery** — Tickets, Jobs/Projects, Calendar
- **Finance** — Invoicing & Payments, Commissions
- **Contacts** — companies and people
- **Settings** — Catalogue, Commission rules, Integrations (IdoYourQuotes, Xero/QuickBooks), Users (roles), Billing, Security

---

## 5. Modules & screens

### 5.1 Company-centred CRM
- **Company record:** business name, address, category/status (sales stage), assigned account manager, source, notes, overall activity. Everything links back to it.
- **Sales stages:** Suspect / Prospect / Hot Prospect / Customer — easy to change; lists/dashboards filter by stage.
- **Ownership:** each company has an account manager; managers/admins can reassign and allocate tasks.

### 5.2 Company list / pipeline  (mockup: `crm_company_pipeline_list`)
Filter chips by stage with counts (Suspect/Prospect/Hot Prospect/Customer). Rows show company + stage pill, next action + due (overdue highlighted), monthly value. Search by name/contact/postcode/account manager. This is the salesperson's home — filter to Hot Prospects to see who to revisit.

### 5.3 Company profile  (mockup: `crm_company_profile`)
The hub. Header: name, **changeable status pill**, account manager, source; actions "Mark won" and "New order". Metric cards: monthly profit / active services / open tasks. **"Services & monthly profit"** table (from IDYQ — charge, cost, profit per service + total recurring; read-only, badged "from IdoYourQuotes"). Contacts panel (with decision-maker flag). Recent history timeline.

### 5.4 Contacts, History, Tasks
- **Contacts:** multiple people per company (name, role, email, phone, decision-maker status).
- **History:** audit trail of calls, emails, meetings, notes, order updates, completed tasks, manager comments.
- **Tasks:** title, assigned user, due date, priority, linked company/contact, status. Open + completed both visible; a "my tasks" dashboard rolls them up.

### 5.5 Orders (one-off jobs)
New module — the coral branch. A new order:
- **Always starts blank** (DECISION — no pre-import of existing deals/customers; James starts fresh).
- Picks a Company, then line items with columns: **item, quantity, supplier URL (where we buy it), unit cost, total cost, unit profit, total profit** (auto-calculated).
- Records the salesperson (for commission).
- Status workflow: **Draft → Submitted → Approved → Ordered → Invoiced → Paid**, with explicit invoiced and paid flags.
- Purchasing fields (supplier URL, cost) are **optional** (multi-sector — a consultancy has no "where we buy it").

### 5.6 Approval queue & Purchasing queue
- **Approval queue:** managers/admins approve or reject orders and add comments.
- **Purchasing queue:** purchasing users see approved orders, update fulfilment/purchasing status, and write updates back to the order/company history.

### 5.7 Contracts (recurring)
A won IDYQ quote becomes a **Contract** in WorkTrackr with recurring monthly revenue and recurring cost → recurring profit, tracked while the customer is active. Drives recurring commission.

### 5.8 Deals / forecast summary  (lower priority)
Spreadsheet-style forecast: customer, expected profit, monthly premium/charge, likelihood to close, close date, account manager.

### 5.9 CSV import (lower priority)
Import company/contact/source data; create or update records; avoid duplicate companies (dedupe).

---

## 6. Roles, permissions & role-based dashboards

### 6.1 Roles (added in the team/Users section)
- **Account manager** — owns company records; adds contacts, tasks, history notes; creates draft orders; updates deals.
- **Manager/admin** — views all; reassigns account managers; assigns tasks; approves/rejects orders; reviews dashboards; configures commission rules.
- **Purchasing user** — views approved orders; updates purchasing status; adds purchasing notes/history.
- **Read-only user** — views records and history without editing (optional/later).

### 6.2 Role-based home screens (IMPORTANT visibility rule)
- **Sales staff →** "My commission & bonus" screen (§7.3).
- **Engineers →** "My wage progression" screen (§8). **Engineers must NOT see per-company deal profit** or commission figures.

---

## 7. Commission & bonus engine

### 7.1 Principle
A **configurable** rules engine (multi-sector). The Sweetbyte/TheGreenAgents schedule below is one configured ruleset. The whole module is switch-off-able.

### 7.2 Sweetbyte / TheGreenAgents ruleset (canonical schedule, ex-VAT throughout)
- **One-off sales:** 15% commission on **profit**, where profit = invoiced value − direct third-party delivery costs − a **fixed £350 customer-acquisition cost** per sale.
- **Recurring contracts:** 5% of recurring monthly profit (recurring revenue − direct third-party recurring costs) while employed and while the customer remains active.
- **SafeSurv referral:** 25% of any commission revenue Sweetbyte receives from a SafeSurv opportunity the employee introduced/generated/closed — **only** once the underlying customer invoice is paid in full **and** the corresponding commission has been received by Sweetbyte.
- **Finance agreements (Sweetbyte):** 1% of financed value.
- **Monthly performance bonus:** triggered when **personally-generated turnover exceeds £7,500** within the **25th–25th** commission period → bonus = **25% of total profit** generated in that period.
- All commission/bonuses payable **only after customer invoices are fully settled**, paid via the next payroll run.
- Commission **ceases on termination**.
- Refunded/cancelled/unpaid sales may be **offset against future commission**.
- Company may amend schemes on reasonable notice; company determines calculations acting reasonably and in good faith, final unless a clear error is identified.
- Commission only where the employee was the **effective cause** of the sale/introduction.

### 7.3 Engine rules to bake in (regardless of ruleset)
- **All figures ex-VAT.**
- **Paid-gated:** nothing becomes payable until the order's invoice is flagged **Paid**.
- **Manager-approved:** the engine **calculates a suggestion**; a manager approves each period before payroll. (Required by the "company determines… final unless clear error" clause — not fully automatic payout.)
- **Period = 25th–25th.**
- **Offsets** for refunds/cancellations carry into future periods.
- **Termination** stops accrual.
- **Admin "Commission rules" area:** set % of profit, fixed amounts, recurring %, referral %, finance %, thresholds/bonus %, the acquisition-cost deduction, and per-order/per-contract overrides (fixed amount or custom %).

### 7.4 Bonus screen (sales)  (mockup: `user_commission_bonus_screen`)
Per-user. Always shows the live 25th–25th period:
- Metric cards: **Confirmed (payable — invoices paid)**, **Pending (awaiting settlement)**, **Performance bonus** status (locked/unlocked).
- **Threshold progress bar:** personally-generated turnover toward £7,500 (unlocks the 25% performance bonus).
- **Breakdown** by source (one-off / recurring / finance / referral) with basis, rate, amount, and a paid/pending status pill.
- **Running monthly totals** for previous periods (paid).
- Footnote: calculated automatically, manager-approved before payroll, offsets noted.

---

## 8. Engineer wage-progression scheme (NEW — needs final rules)

Engineers get a **different home screen** from sales. They do **not** see per-company deal profit or commission.

What they see (as described):
- When the company **makes a new deal**, engineers' wages **rise in 6-month stages**.
- Each 6-month stage runs, then the **next 6 months starts again** (rolling).
- They see a **history of wage rises** from previous 6-month periods.

Proposed screen: a "My wage progression" view showing the **current 6-month stage** (progress toward the next rise, expressed without exposing company profit — e.g. as a count/level or an aggregate the business is comfortable showing), the **confirmed/projected rise** at stage end, and a **history list** of previous 6-month stages and the rise applied.

**OPEN QUESTION (must define before building):** the exact formula linking "new deals" to a wage rise. Options to decide: a fixed step per N new deals, per band of new recurring revenue, a fixed £/period, or manager-set per stage. Also: is it per-engineer or team-wide, and what metric is shown to the engineer (since raw profit is off-limits)?

---

## 9. Accounting integration (Xero / QuickBooks) — LATER

Decision: **neither now**, possibly later. WorkTrackr will **not** be the accounts package. For now, **Invoiced** and **Paid** are manual flags a manager ticks on the order. Later: a connector that pushes the order as an invoice and pulls back paid status automatically (commission gating then becomes automatic).

---

## 10. Build order (phased, one at a time)

1. **Menu / IA regroup** + company-centred records with sales stage & account manager.
2. **Contacts, history timeline, tasks** (+ tasks dashboard).
3. **Orders module** — blank order form (+ supplier/cost/profit columns), approval queue, purchasing queue, invoiced/paid flags.
4. **Commission engine** — configurable rules area + calculator (ex-VAT, paid-gated, manager-approved) + **sales bonus screen** + **engineer wage-progression screen**.
5. **IDYQ "act on quote" actions + Contracts** (mark won → Contract; recurring profit tracking).
6. **Deals forecast + CSV import** last.
7. **(Later)** Xero/QuickBooks connector; IDYQ org allow-list before any 3rd-party onboarding.

UX is designed before coding each phase.

---

## 11. Open questions / follow-ups
- Engineer wage-rise **formula** (see §8) — needs definition.
- Order "New order" start: **blank** confirmed. (Recurring still pulls from IDYQ when relevant.)
- Approval chain: single manager approver vs multi-step — to confirm.
- IDYQ **org allow-list** on the bridge before onboarding third-party customers (security).
- Optional: make the **Quotes** tab live read-through too (merging WorkTrackr-side link data) — offered, not yet requested.
- Secret rotation for previously-committed live secrets in `RENDER_SETUP.md` was advised; user chose to defer. (Scrubbed file + hardened `.gitignore` were prepared but not deployed.)

---

## 12. Decisions log
- Integration is **read-only**, server-to-server, mirror tables, per-org opt-in. ✅
- Per-org scoping via `X-WT-Org` header + stored `idyq_org_ref` (replaced an earlier email-env approach). ✅
- Catalogue **display is live read-through** (always current incl. deletes); mirror is fallback. ✅
- Catalogue **grouped by category, collapsible**; categories already flow in the feed (no extra work needed). ✅
- "Editable IDYQ" = **profit fields across + act-on-quote**, not editing quote content. ✅
- Xero/QuickBooks: **later**. ✅
- New **roles** added in the Users section. ✅
- Bonuses **automatic**, per-user bonus screen, **25th–25th** period, running totals; manager-approved, paid-gated, ex-VAT. ✅
- Commission rules must be **configurable** (multi-sector). ✅
- Order form **always starts blank**; no pre-import of existing deals/customers. ✅
- **Engineers see a separate wage-progression screen**, never per-company profit. ✅
- UX mockups approved in principle: pipeline list, company profile, bonus screen. ✅

---

## 13. Mockups produced (rendered in chat — descriptions for the record)
- **`worktrackr_sales_pipeline_flow`** — the §3 flow diagram (two branches → shared finance pipeline).
- **`crm_company_pipeline_list`** — §5.2.
- **`crm_company_profile`** — §5.3.
- **`user_commission_bonus_screen`** — §7.4.
- **To produce next:** the Order Form (+ approval/purchasing queues) and the Engineer wage-progression screen.

---

## 14. Key file map (Phase 0, for maintenance)
- IDYQ: `server/_core/worktrackrBridge.ts`, `server/_core/index.ts`.
- WorkTrackr backend: `web/routes/idyq.js`, `shared/idyq/{idyqClient,idyqSync,index}.js`, `worker/worker.js`, `web/server.js`, migrations `web/migrations/create_idyq_integration_tables.sql`, `idyq_add_org_ref.sql`, `idyq_catalogue_fields.sql`.
- WorkTrackr frontend: `web/client/src/app/src/components/IdyqIntegration.jsx`, `CRMDashboard.jsx`, `Sidebar.jsx`.
- Test (run from WorkTrackr web shell): `node -e 'require("./shared/idyq/idyqClient").idyqGet("/api/external/catalogue",{page:1},{orgRef:"sweetbyte-ltd-mo5yzrt7"}).then(r=>console.log(r.products?.length))'`
