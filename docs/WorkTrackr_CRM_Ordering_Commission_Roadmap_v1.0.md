# WorkTrackr — CRM, Ordering & Commission Roadmap (v1.0)

**Status:** Living document. Phase 0 (IdoYourQuotes integration) is built, deployed and working in production. All nine UX mockups are produced, approved and folded into the single canonical mockup file. The quote→order **cost/profit/type pull** is **deployed on the WorkTrackr side** (the IDYQ-repo `worktrackrBridge.ts` change must also be live for it to populate — verify in that repo). **Phases 1, 2, 3 and 4 are BUILT** (company-centred records + IA regroup; contacts/history/tasks; the full Orders module with approval/purchasing/fulfilment queues; the fully-configurable commission engine + engineer wage progression). **Phase 5 is in progress** (IDYQ act-on-quote + recurring Contracts): UX signed off, decisions locked, and **batches 1–2 are built** — contracts backend foundation + recurring commission wired into the engine (reading only the org-entered recurring rate). All example commission figures have been scrubbed from this document. See §14.8–§14.9 and §15. Phase 6 not yet built.

**Last updated:** 2026-06-17

**Purpose:** Single source of truth for the WorkTrackr sales/CRM redesign and the IdoYourQuotes (IDYQ) integration. Captures everything discussed so the work survives any loss of chat history. Nothing here should be assumed "done" unless it is under "Phase 0 — already built".

---

## 1. Vision & guiding principles

WorkTrackr is becoming a **company-centred CRM + ordering + commission system**, marketed to **all business sectors** (not just IT/MSP). Every design choice must therefore be:

- **Company-centred.** The company/customer record is the centre of the CRM. Contacts, tasks, notes, history, orders, deals and services all link back to the company. (In the current DB a "company" is a `contacts` row of type `company` — the old `customers` table was dropped in the customers→contacts merge.)
- **Pipeline-driven.** Companies move through sales stages: **Suspect → Prospect → Hot Prospect → Customer**. A salesperson can filter to their Hot Prospects and see who to revisit to get a deal over the line. Winning a deal converts it into a proper sale (an Order).
- **🚫 NO HARDCODED MONEY RULES — NON-NEGOTIABLE.** This is a **production, multi-tenant app for many organisations**. **No** commission rate, bonus rate, profit-share, deduction/internal-cost, threshold, period boundary, or any other money figure is ever written into code. Every such value is **per-organisation configuration**, entered by that org in an admin area and stored in the database. The app ships **neutral** (everything zero/disabled); an org that hasn't configured a scheme gets zeros, never someone else's numbers. Any specific schedule an organisation uses is **only an example it types in**, and must **never** appear as a default, constant, or fallback in code. Reviewers: a literal rate/amount in a `.js`/`.sql` file is a bug.
- **Configurable / multi-sector.** Commission rules, the order form's purchasing fields, and per-role screens must be configurable and switch-off-able. Use neutral terms ("Orders", "Contracts") rather than IT-specific language. Any organisation's commission scheme is *one configured ruleset typed in by that org*, not hard-coded behaviour.
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
- **Pull from IdoYourQuotes (DECISION):** an order can pull one or several IDYQ quotes; each pulled line brings its **buy-in cost, profit and type (one-off/annual) straight from that quote**, read-only in WorkTrackr. Margins are changed by editing the quote in IDYQ (the single source of truth, where the customer quote lives) and re-pulling — WorkTrackr never writes back. Manually-added lines are costed in WorkTrackr (editable). The pulled type sets the commission basis (one-off vs recurring), each at the org's own configured rate. This is distinct from a recurring **Contract** (§5.7): pulling a quote into an order is a one-off snapshot; a Contract tracks ongoing monthly profit.
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

### 6.1 Roles (DECISION — toggle in the Users section)
Four roles, selected per member in the Users screen. Mapped onto the existing `memberships.role` so current users don't break — the live `CHECK (role IN ('admin','manager','staff'))` is widened to add `salesman` and `engineer`:
- **Global Admin** (`admin`) — everything: all records, approvals, commission rules, Users, Billing, Security.
- **Manager** (`manager`) — all dashboards, approval & purchasing queues, approves/rejects orders, configures commission rules and sets manual bonus/wage figures. **Not** Billing/Security/Users (Global-Admin-only).
- **Salesman** (`salesman`, NEW) — owns company records; adds contacts, tasks, history; creates draft orders; sees the "My commission & bonus" screen.
- **Engineer** (`engineer`, NEW) — delivery + the "My wage progression" screen. **Never** sees per-company profit or commission.
- (No separate purchasing role for now — Managers/Global Admins work the purchasing queue. Read-only can be added later.)

### 6.2 Role-based home screens (IMPORTANT visibility rule)
- **Salesman →** "My commission & bonus" screen (§7.3).
- **Engineer →** "My wage progression" screen (§8). **Engineers must NOT see per-company deal profit** or commission figures.

---

## 7. Commission & bonus engine

### 7.1 Principle
A **fully configurable** rules engine (multi-sector, multi-tenant). **NOTHING is hardcoded** (see §1 — non-negotiable). The app ships **neutral**: every rate, deduction, threshold, bonus % and the period boundary default to **zero / disabled**, so an org with no scheme configured gets **zeros**, never another org's numbers. Each organisation enters its **own** ruleset in the admin **Commission rules** area; the engine applies only what that org stored in `commission_settings.config`. The whole module is switch-off-able (`enabled` flag). The rule types in §7.2 carry **no figures**; whatever an org types in is its own, and no rate or amount ever appears as a code default, constant or fallback.

**Phase-4 scope decisions (locked this build):**
- **Recurring commission deferred to Phase 5** — recurring commission belongs to Contracts, which don't exist yet. The `recurringRate` config field exists but is unused until Phase 5.
- **Finance & referral handled now** via a per-order **commission category** (`standard` / `finance` / `referral`) chosen on the order form; the engine applies the org's configured `financeRate` / `referralRate`. `standard` uses `oneOffRate` on `(profit − deductionPerSale)`.
- **Internal cost-before-profit (`deductionPerSale`)** is a **per-org configurable £**, not a fixed amount. Applied per standard order, floored at zero.
- **Roles skipped this phase** — no `memberships.role` widening, no role selector. The two screens are reachable from the **Finance** menu (My commission) and admin area (Commission rules); role-based home routing is deferred (§14.5 migration still pending for that).

### 7.2 The kinds of rule an org can configure (no figures — every value is entered by the org)
> ⚠️ No rate, amount or threshold is shown here or stored in code. The list below is only the **types** of rule the Commission rules area supports; each organisation enters its own values (all blank/zero until they do).
- **One-off sales:** a rate the org sets, applied to **profit** (= invoiced value − direct third-party delivery costs − the org's configured internal cost per sale).
- **Recurring contracts:** a rate the org sets, applied to recurring monthly profit while employed and the customer remains active.
- **Referral:** a rate the org sets, applied to commission revenue from a referred opportunity — paid-gated.
- **Finance agreements:** a rate the org sets, applied to financed value.
- **Performance bonus:** when personally-generated turnover exceeds the org's configured threshold within the period → the org's configured bonus rate applied to total profit generated that period.
- Payable only after invoices fully settled; ceases on termination; refunds/cancellations offset future commission; employer determines calculations in good faith; commission only where the employee was the effective cause.

### 7.3 Engine rules (apply to whatever ruleset an org configures)
- **All figures ex-VAT.**
- **Paid-gated:** nothing becomes payable until the order's invoice is flagged **Paid**.
- **Manager-approved:** the engine **calculates a suggestion**; a manager approves each period before payroll (per-period lock).
- **Period boundary is configurable** (`periodStartDay`, 1–28). The period boundary is whatever day-of-month the org enters into config — not a constant.
- **Manual £ override per order** (`commission_overrides`) always wins over the computed suggestion.
- **Offsets / termination:** offsets for refunds/cancellations and termination handling are future enhancements; not in the v1 engine.
- **Admin "Commission rules" area:** the org sets `oneOffRate`, `deductionPerSale`, `financeRate`, `referralRate`, `recurringRate`, `thresholdTurnover`, `bonusRate`, `periodStartDay`, and the `enabled` switch. All blank/zero by default.

### 7.4 Bonus screen (sales)  (mockup: `user_commission_bonus_screen`)
Per-user. Always shows the live 25th–25th period:
- Metric cards: **Confirmed (payable — invoices paid)**, **Pending (awaiting settlement)**, **Performance bonus** status (locked/unlocked).
- **Threshold progress bar:** personally-generated turnover toward the org's configured threshold (unlocks the performance bonus).
- **Breakdown** by source (one-off / recurring / finance / referral) with basis, rate, amount, and a paid/pending status pill.
- **Running monthly totals** for previous periods (paid).
- Footnote: calculated automatically, manager-approved before payroll, offsets noted.

---

## 8. Engineer wage-progression scheme (DECIDED · BUILT in Phase 4 — see §14.7)

Engineers get a **different home screen** from sales. They do **not** see per-company deal profit or commission.

**Rules (locked):**
- **Per-engineer** (not team-wide).
- Wage rises in **rolling 6-month stages**, triggered by a **count of delivered/new deals** in the stage — a neutral metric that exposes no profit.
- The **£ rise is a manual field a manager sets/confirms** per stage (consistent with the "manual £ field on every bonus" rule). The engine doesn't auto-pay a rise; a manager enters and confirms it.
- The engineer sees: current rate, deals delivered this stage, a progress bar to the next review point, the projected/confirmed rise, and a **history** of previous stages and the rise applied. Company profit/commission never appear.
- Mockup: `engineer_wage_progression` (in the Phase-2 mockups file).

**OPEN QUESTION — RESOLVED:** deal-count-triggered, manager-set £ rise, per-engineer, neutral count shown (no profit). See rules above.

---

## 9. Accounting integration (Xero / QuickBooks) — LATER

Decision: **neither now**, possibly later. WorkTrackr will **not** be the accounts package. For now, **Invoiced** and **Paid** are manual flags a manager ticks on the order. Later: a connector that pushes the order as an invoice and pulls back paid status automatically (commission gating then becomes automatic).

---

## 10. Build order (phased, one at a time)

1. ✅ **DONE — Menu / IA regroup** + company-centred records with sales stage & account manager.
2. ✅ **DONE — Contacts, history timeline, tasks** (+ tasks dashboard).
3. ✅ **DONE — Orders module** — blank order form (+ supplier/cost/profit columns, IDYQ quote pull), approval queue, purchasing queue, fulfilment (invoiced/paid) flags.
4. ✅ **DONE — Commission engine** — fully-configurable rules area (per-org, nothing hardcoded) + live calculator (ex-VAT, paid-gated, manager-approved) + **sales bonus screen** + **engineer wage-progression screen**.
5. **NEXT — IDYQ "act on quote" actions + Contracts** (mark won → Contract; recurring profit tracking; recurring commission gets its home here).
6. **Deals forecast + CSV import** last.
7. **(Later)** Xero/QuickBooks connector; IDYQ org allow-list before any 3rd-party onboarding.

UX is designed before coding each phase.

---

## 11. Open questions / follow-ups
- Engineer wage-rise **formula** — **RESOLVED** (§8): deal-count, manager-set £, per-engineer.
- Order "New order" start: **blank** confirmed. (Recurring still pulls from IDYQ when relevant.)
- Approval chain: **RESOLVED — single manager approver for v1.** Approvals stored in their own per-order table so a chain can be added later without rework.
- Quote→order **cost/profit/type pull**: **BUILT on both apps** (see §14.1), ready to deploy; consumed at Phase 3.
- IDYQ **org allow-list** on the bridge before onboarding third-party customers (security). Still open.
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
- UX mockups approved: pipeline list, company profile, bonus screen, sales flow, order form, approval/purchasing queues, engineer wage progression. ✅
- **Roles = Global Admin / Manager / Salesman / Engineer**, toggled per member in Users (replaces the earlier account-manager/purchasing/read-only set). ✅
- **Single manager approver** for order approval (v1); chain deferrable. ✅
- **Engineer wage**: per-engineer, deal-count-triggered, manager-set £ rise, neutral count shown, no profit. ✅
- **Every bonus/wage figure has a manual £ field** a manager sets; engine only suggests. ✅
- Orders can **pull IDYQ quotes**, bringing buy-in cost/profit/type per line, read-only (edited in IDYQ). Distinct from recurring Contracts. ✅
- Quote→order pull **built on both apps** (bridge + WorkTrackr migration/sync/mapper), deploy-ready. ✅
- Phase 1 started: contacts `crm.salesStage` (Suspect/Prospect/Hot Prospect/Customer) + company/stage filters. ✅
- Phase 1 complete: IA regroup (Sales/Delivery/Finance/Contacts/Settings), company pipeline list + company profile hub. ✅
- Phase 2 complete: `tasks` table + API, My-Tasks dashboard, editable company contacts, per-company tasks, history timeline (CRM events + completed tasks). ✅
- Phase 3 complete: Orders module — `orders`/`order_lines`/`order_approvals` tables + API, order form (manual lines + IDYQ pull, cost+profit economics), orders list, "New order" from company profile, manager Approval/Purchasing/Fulfilment queues, full Draft→Submitted→Approved→Ordered→Invoiced→Paid lifecycle (paid-gating ready for commission). ✅
- **NO HARDCODED MONEY RULES (non-negotiable, §1):** no commission/bonus/share/deduction/threshold/period figure is ever in code. All per-org config in `commission_settings`; app ships neutral (zeros/disabled). Any specific schedule is example-only. ✅
- Phase 4 scope: recurring **deferred to Phase 5** (needs Contracts); finance/referral via per-order **commission_category** + configured rates; internal cost-before-profit is a **per-org configurable £** (not a fixed amount); **roles skipped** this phase (screens reachable from Finance menu; no role-constraint widening). ✅
- Phase 4 engine: configurable `periodStartDay` (default 1; the start day is config, not code), manual £ override per order wins over suggestion, manager per-period lock, computed live from paid orders. ✅
- Phase 4 COMPLETE: commission backend + admin **Commission rules** + **My commission** bonus screen + per-order commission category; engineer wage backend + **My wage** (engineer, read-only, no profit) + **Engineer wages** (manager) + per-org scheme settings. All per-org configurable; zero hardcoded money. ✅
- Phase 5 decisions LOCKED: recurring commission **automatic while a contract is active** (no per-month toggle; gate = active + existing per-period manager approval); basis = **clear monthly profit**, annual ÷ 12; **mid-period start = full month**; recurring charge **counts toward the bonus threshold**; **mixed quotes auto-sort by line type** (monthly/annual → contract, one-off/untagged → auto-created linked Order, one screen); **new Contracts page** in Sales + "New contract" on the company; company **Monthly profit auto-calculated** from active contracts. ✅
- Phase 5 BATCH 1 built: `contracts`/`contract_lines`/`contract_commission_overrides` tables + `contracts.js` (incl. auto-sorting `pull-quote`) + `idyq.js` `mapLine` fix + `/api/contracts` mount. ✅
- Phase 5 BATCH 2 built: recurring commission wired into `commission.js` (active contracts → Confirmed + breakdown + threshold + bonus base + history; per-contract per-period manual £; rate read only from the org's `recurringRate`, 0 by default), `BonusScreen.jsx` + `CommissionRules.jsx` updated (recurring field enabled). **All example commission figures removed from the docs and mockups** per the no-example-numbers rule — §7.2 now lists rule types only. ✅

---

## 13. Mockups produced

**Saved in the repo:** `docs/mockups/ux-design-mockups.html` is now the **single canonical file** holding all nine approved screens (1 sales-pipeline flow, 2 company pipeline list, 3 company profile, 4 sales commission &amp; bonus, 5 order form, 6 approval &amp; purchasing queues, 7 engineer wage progression, 8 My Tasks dashboard, 9 enriched company profile). It is self-contained and browser-openable with a CSS shim; a fresh Claude chat can re-render any screen. (The earlier split files `ux-design-mockups-phase2.html` and `ux-design-mockups-phase2-tasks-history.html` are now superseded by the canonical file.)

- **`worktrackr_sales_pipeline_flow`** — the §3 flow diagram (two branches → shared finance pipeline).
- **`crm_company_pipeline_list`** — §5.2.
- **`crm_company_profile`** — §5.3.
- **`user_commission_bonus_screen`** — §7.4.
- **`order_form`** — §5.5 (incl. IDYQ quote pull, read-only cost/profit).
- **`approval_purchasing_queues`** — §5.6 (single approver).
- **`engineer_wage_progression`** — §8 (per-engineer, manual rise field).

---

## 14. Key file map (Phase 0, for maintenance)
- IDYQ: `server/_core/worktrackrBridge.ts`, `server/_core/index.ts`.
- WorkTrackr backend: `web/routes/idyq.js`, `shared/idyq/{idyqClient,idyqSync,index}.js`, `worker/worker.js`, `web/server.js`, migrations `web/migrations/create_idyq_integration_tables.sql`, `idyq_add_org_ref.sql`, `idyq_catalogue_fields.sql`.
- WorkTrackr frontend: `web/client/src/app/src/components/IdyqIntegration.jsx`, `CRMDashboard.jsx`, `Sidebar.jsx`.
- Test (run from WorkTrackr web shell): `node -e 'require("./shared/idyq/idyqClient").idyqGet("/api/external/catalogue",{page:1},{orgRef:"sweetbyte-ltd-mo5yzrt7"}).then(r=>console.log(r.products?.length))'`

### 14.1 Quote→order cost/profit/type pull (BUILT, deploy-ready; used at Phase 3)
Verified gap: the bridge previously emitted quote lines sell-only (`product_id, sku, description, qty, unit_price, line_total`) — IDYQ's per-line **buy-in cost** (`quote_line_items.cost_price`) and **type** (`pricing_type`, e.g. `one_off`/`annual`) never crossed; profit is derived in IDYQ's UI (`total − cost×qty`), not stored.
- **IDYQ** `server/_core/worktrackrBridge.ts` — `mapLine` now also emits `cost_price`, `profit` (computed `total − cost×qty`, to match the quote to the penny), `pricing_type`.
- **WorkTrackr** `web/migrations/idyq_quote_line_cost_fields.sql` (NEW) — adds `cost_price`, `line_profit`, `line_type` to `idyq_quote_lines` (idempotent; sorts after `create_idyq_integration_tables.sql`).
- **WorkTrackr** `shared/idyq/idyqSync.js` — quote-line insert stores the three new fields.
- **WorkTrackr** `web/routes/idyq.js` — `mapLine` exposes `buyInCost`, `profit`, `type`.
- Deploy order: IDYQ first, then WorkTrackr. Verify: re-run the quote-203 line fetch; the line should carry `cost_price`/`profit`/`pricing_type`. All additive/read-only; no behaviour change until the order form consumes it.

### 14.2 Phase 1 progress
- `web/routes/contacts.js` — `crm.salesStage` enum (suspect/prospect/hot_prospect/customer) added (separate from `crm.status`); account manager = `crm.assignedTo`; list endpoint takes `?type=` and `?stage=` filters. No migration (rides the `crm` JSONB).

### 14.3 Phase 2 file map (BUILT)
- `web/migrations/create_tasks_table.sql` (NEW) — `tasks` (title, status open/done + `completed_at`, priority, due_date, `contact_id`, assignee/creator, org-scoped).
- `web/routes/tasks.js` (NEW) — CRUD + filters `?mine`, `?status`, `?contactId`; setting status `done` stamps `completed_at`.
- `web/routes/contacts.js` — added `GET /:id/history` (aggregates `crm_events` + completed `tasks`, newest first; two-segment path, no clash with `/:id`).
- `web/server.js` — mounts `/api/tasks`.
- Frontend (`web/client/src/app/src/components/`): `MyTasks.jsx` (NEW dashboard, top of Sales), `CompanyProfile.jsx` (enriched: editable `contactPersons` with decision-maker flag, per-company tasks, history timeline), plus `Sidebar.jsx`/`AppLayout.jsx`/`Dashboard.jsx` nav for **My Tasks** (`my-tasks`).

### 14.4 Phase 3 file map (BUILT) — Orders module
- `web/migrations/create_orders_tables.sql` (NEW) — `orders` (status enum draft→submitted→approved/rejected→ordered→invoiced→paid, `invoiced_at`/`paid_at`, `contact_id`, `salesperson_user_id`), `order_lines` (description, qty, supplier_url, `unit_cost`, `unit_profit`, source manual|idyq, `idyq_quote_id`, `line_type`), `order_approvals` (single approver now, chain-ready).
- `web/routes/orders.js` (NEW) — list (`?status`/`?contactId`/`?mine`/`?queue=approval|purchasing`), get, create, PUT (header + replace lines, draft/rejected only), `/submit`, `/approve`, `/reject`, `/purchase`, `/invoice`, `/pay` (manager-gated via `getOrgContext().role`), `/pull-quote` (appends mirrored IDYQ quote lines with cost/profit/type), delete (draft only).
- `web/server.js` — mounts `/api/orders`.
- Frontend (`web/client/src/app/src/components/`): `OrderForm.jsx` (NEW; company picker, status stepper, manual+IDYQ lines, cost/profit totals, save draft/submit), `OrdersList.jsx` (NEW; list + status filters, hosts the form), `OrderQueues.jsx` (NEW; manager Approval/Purchasing/Fulfilment queues). Wiring in `Dashboard.jsx` (`orders` + `order-queues` views, New-order hop from profile), `Sidebar.jsx` (Orders item; **Approvals** item shown only when `isManager`), `AppLayout.jsx` + `DashboardWithLayout.jsx` (thread `isManager`).
- Economics: a line's sell = `unit_cost + unit_profit`; IDYQ lines are read-only (edited on the quote in IDYQ). `total_profit` on a **paid** order is the figure Phase 4 commission will read.
- Dependency: the order form's IDYQ pull shows real cost/profit only once §14.1's four "pull" files are deployed and a sync has run; the manual path works regardless.

### 14.5 memberships.role CHECK — STILL OUTSTANDING (needed for role-based home routing, not for Phase 4)
`database/schema.sql` still has `CHECK (role IN ('admin','manager','staff'))`. The new **Salesman** and **Engineer** roles need an `ALTER ... DROP CONSTRAINT / ADD CONSTRAINT` migration widening this to include `'salesman'` and `'engineer'` **before** the roles toggle UI is built. Manager-gating in Phase 3 keys off `admin`/`manager`/`partner_admin`, so it works today; Salesman/Engineer home screens (Phase 4) need the constraint widened first.

### 14.6 Phase 4 file map — commission engine (BUILT)
**Principle enforced: zero hardcoded money values (see §1, §7.1).** App ships neutral; each org configures its own scheme.
- `web/migrations/phase4_commission_tables.sql` (NEW) — `commission_settings` (per-org `config` JSONB, neutral defaults), `commission_overrides` (manual £ per order, the per-order override field), `commission_period_locks` (manager per-period approval); `ALTER orders ADD commission_category`. Filename `phase4_` sorts after `create_orders_tables.sql`.
- `web/routes/commission.js` (NEW) — inline engine + API. `DEFAULTS` are all 0/false (no scheme baked in). Config shape: `enabled, oneOffRate, deductionPerSale, financeRate, referralRate, recurringRate, thresholdTurnover, bonusRate, periodStartDay`. Endpoints: `GET/PUT /settings` (PUT manager-only), `GET /me?offset=` (bonus screen: confirmed/pending/bonus/threshold/breakdown/history, paid-gated), `GET /period?offset=` + `POST /period/approve` (manager), `PUT /override/:orderId` (manager). Period math = `periodStartDay`-based 1-month windows, year-cross safe; verified (25th→25th, Dec→Jan).
- `web/server.js` — mounts `/api/commission`.
- **Front-end (BUILT):** `CommissionRules.jsx` (admin: org enters its own numbers; blank by default; manager-gated), `BonusScreen.jsx` (per-user "My commission", reads `/me`: confirmed/pending/bonus/threshold/breakdown/history), commission-category selector on `OrderForm.jsx` (orders API persists `commission_category`), nav wired in `Sidebar.jsx`/`AppLayout.jsx`/`Dashboard.jsx` (My commission in Finance for all; Commission rules manager-only). Engineer wage front-end is in §14.7.

### 14.7 Phase 4 file map — engineer wage progression (BUILT)
**Same no-hardcode rule (§1).** Org sets stage length + deal-count target; every £ is a manager-entered field; engineers never see profit.
- `web/migrations/phase4_engineer_wage_tables.sql` (NEW) — `engineer_wage_settings` (per-org `config` JSONB: `stageMonths`, `dealCountTarget`; neutral defaults) and `engineer_wage_records` (per engineer per stage: `current_rate`, `deals_delivered` (neutral count), `deal_target`, `rise_amount`, `new_rate` — all manual £/int; `status` in_progress|confirmed; stage history). Filename `phase4_` sorts after `create_orders_tables.sql`.
- `web/routes/engineerWage.js` (NEW) — `GET/PUT /settings` (PUT manager), `GET /candidates` (manager; org members for the picker), `GET /me` (engineer's current stage + history, read-only), `GET /` (manager; all engineers), `POST /` (start a stage), `PUT /:id` (manual fields), `POST /:id/confirm`, `DELETE /:id`. Manager-gated via role.
- `web/server.js` — mounts `/api/engineer-wage`.
- Frontend (`web/client/src/app/src/components/`): `EngineerWage.jsx` (NEW; "My wage", engineer read-only — current rate, neutral deal count vs target, review date, manager-set rise, history; never profit), `EngineerWageAdmin.jsx` (NEW; manager — scheme settings, start a stage, enter count, set/confirm £ rise). Nav: **My wage** in Delivery (all users), **Engineer wages** manager-only in Delivery; views wired in `Dashboard.jsx`, `AppLayout.jsx`, `Sidebar.jsx`.

### 14.8 Phase 5 file map — BATCH 1 (contracts backend foundation, BUILT)
**Same no-hardcode rule (§1): no money figure in code; contract figures come from the pulled quote (read-only) or manual in-app entry.**
- `web/migrations/phase5_contracts_tables.sql` (NEW) — `contracts` (status draft/active/paused/cancelled, `source_idyq_quote_id`, `started_at`/`cancelled_at`, `salesperson_user_id`), `contract_lines` (recurring only; `unit_cost`/`unit_profit` at the line's own `billing_interval` monthly|annual, `source` manual|idyq), `contract_commission_overrides` (manager manual £ per contract per period — used by batch 2). Filename `phase5_` sorts after orders + idyq migrations. Validated against the real Postgres grammar.
- `web/routes/contracts.js` (NEW) — list (`?status`/`?contactId`/`?mine`), get, create, PUT (header + replace lines, not while cancelled), **`/:id/pull-quote`** (auto-sorts a mirrored quote: monthly/annual lines → this contract; one-off/untagged → a linked draft Order created automatically — one action), `/:id/activate` (draft|paused→active, stamps `started_at` once), `/:id/pause` (manager), `/:id/cancel` (manager), delete (draft only). Per-month figures normalise annual ÷ 12 in SQL. Manager-gating = admin/manager/owner/partner_admin.
- `web/routes/idyq.js` (EDITED) — `mapLine` now exposes `buyInCost`/`profit`/`type` from the mirror, so the order form's IDYQ pull shows real cost/profit + type and the contract pull can sort by type. (Small additive fix flagged in design; the order-form pull previously came across cost £0/no type.)
- `web/server.js` (EDITED) — mounts `/api/contracts` (after `/api/orders`).
- Dependency: the type-based sort needs the IDYQ-side `pricing_type`/`line_type` tag live + a sync (verify `worktrackrBridge.ts` in `idoyourquotes-main`). Untagged lines default to one-off (safe — never invents recurring profit).

### 14.9 Phase 5 file map — BATCH 2 (recurring commission wiring, BUILT)
**Reads only the org-entered recurring rate; no figure in code (rate defaults to 0).**
- `web/routes/commission.js` (EDITED — full rewrite preserving the one-off engine) — adds recurring: `userContracts` (per-month profit/charge, annual ÷ 12 in SQL), `contractOverrides`, `contractEarnsInPeriod` (active + start/cancel dates; draft/paused don't earn), `contractAmount` (monthly profit × the org's `recurringRate`, or a manager manual £), `contractRow` (breakdown row, `category:'recurring'`). `computeForUser` now folds active contracts into Confirmed, the breakdown, the bonus threshold turnover **and** the bonus profit base (Decision 5), and into the 3-period history. `/period` now lists salespeople from orders **or** contracts. New endpoint `PUT /contract-override/:contractId {amount,note,offset}` (manager) — manual £ per contract per period. Every breakdown row now carries a unique `key`.
- `web/client/src/app/src/components/BonusScreen.jsx` (EDITED) — keys breakdown rows by the new `key` (recurring rows have no order id), header "Order" → "Source", footnote mentions active contracts. Recurring rows render via the pre-existing `recurring` category.
- `web/client/src/app/src/components/CommissionRules.jsx` (EDITED) — the **Recurring rate** field is now enabled (was disabled pending Phase 5); help text is neutral; the example day-of-month was removed from the period-start help. (No example values anywhere; fields load from saved config, zero by default.)
- **Docs scrub (this batch):** every example commission figure removed from the roadmap (§1, §5.5, §7.1, §7.2, §7.3, §7.4, build order, decisions log) and from `docs/mockups/ux-design-mockups-phase5.html` (rates/amounts/threshold shown as "—", read from config). §7.2 now lists rule *types* only, no numbers.

---

## 15. Current state / START HERE (for a fresh session)

**Build position:** Phases 0–4 are built. **Phase 5 is next** (IDYQ act-on-quote + recurring Contracts).

**Repo:** WorkTrackr = `worktrackr-app` (this repo), pushed via GitHub Desktop from `C:\repos\worktrackr-app`; Render auto-deploys; `web` runs `web/migrations/*.sql` alphabetically on boot. A "company" is a `contacts` row `type='company'` (never FK to the dropped `customers` table). IDYQ integration is read-only pull.

**Verified against the user's uploaded repo (post-Phase-4):** every delivered route, migration, component, `server.js`, the roadmap and the canonical mockup are present, in the right folders, and current — EXCEPT the two items below.

**⚠ Two repo fixes (status after the Phase-5 batch-1 zip check):**
1. **`phase4_engineer_wage_tables.sql`** is now correctly present in **`web/migrations/`** (tables will be created). An identical orphan copy still sits in `web/client/src/app/src/components/` — **delete that one copy** (a local file deletion; nothing to redeploy).
2. **Orphan `web/routes/idyq.routes.js`** — RESOLVED. It no longer exists anywhere; the live file is `idyq.js`.

**Deploy/verify notes:**
- **IDYQ quote cost/profit/type pull:** WorkTrackr side is deployed (`idyq_quote_line_cost_fields.sql`, `idyq.js`, `shared/idyq/idyqSync.js` all present). The **IDYQ-repo** file `server/_core/worktrackrBridge.ts` (mapLine emitting `cost_price`/`profit`/`pricing_type`) must also be live in the *other* repo (`idoyourquotes-main`) for cost/profit to actually populate; then run a sync. Until then, pulled order lines carry sell price with zero cost.
- **Pre-existing clutter (not from this work):** several `*.broken`/`*.backup` files exist in the components folder; unused by the build, optional to remove.

**Still pending / future:**
- **`memberships.role` CHECK widening (§14.5)** — needed before *role-based home routing* (Salesman→commission, Engineer→wage as landing pages) and any Users role selector. Phase 4 deliberately skipped roles; the screens are reachable from the menu (My commission / My wage; manager-only Commission rules / Engineer wages / Approvals). Manager-gating works today off `admin`/`manager`/`owner`/`partner_admin`.
- IDYQ **org allow-list** on the bridge before onboarding third-party customers (security).
- Xero/QuickBooks connector (later).

**Phase 5 scope when ready:** "act on quote" from a mirrored IDYQ quote → create a recurring **Contract** (new tables: contracts + contract_lines, recurring monthly profit); surface recurring profit on the company profile's "Services & monthly profit" panel; wire **recurring** commission (the `recurringRate` config field already exists in `commission_settings`) into the existing commission engine, paid-gated like one-off. Design UX first per the working cadence.

**Phase 5 — UX signed off + decisions LOCKED (2026-06-17):**
- **Recurring commission is automatic** — while a contract is `active` it earns recurring commission each period; no per-month "collected" toggle. The gate is contract status `active` + the existing manager per-period approval (WorkTrackr is not the accounts package, so there is no per-month paid flag — "active customer" is the gate, matching §7.2). Recurring basis = **clear monthly profit** (annual lines ÷ 12).
- **Mid-period start = full month** (no pro-rating in v1).
- **Recurring monthly charge counts toward the bonus threshold.**
- **Mixed quotes auto-sort by each line's own type tag** (Decision 3): monthly/annual lines → the contract; one-off (or untagged, safe default) lines → a linked draft **Order**, created automatically in the same action. One screen, no manual splitting, no separate pages. *(Depends on the IDYQ-side `pricing_type`/`line_type` tag actually flowing — see the bridge verify note above + the batch-1 `mapLine` fix.)*
- **New Contracts page** under Sales (list + form, quote-driven) + "New contract" on the company profile; an "act on quote" button on the IDYQ quote view is a later batch.
- **Company "Monthly profit" is auto-calculated** from the company's active contracts (manual `crm.totalProfit` retained as an optional override).

**Phase 5 — BATCHES 1–2 BUILT (2026-06-17):** batch 1 = contracts backend foundation (§14.8); batch 2 = recurring commission wired into the engine reading only the org-entered recurring rate (§14.9). All example commission figures scrubbed from the docs. Validated (`node --check`, `esbuild --jsx`, real Postgres-grammar parse). Remaining batches: 3 Contracts list + form + nav → 4 company-profile services panel + cards → 5 act-on-quote button + final roadmap pass.

**Working cadence (unchanged):** UX/design per phase first, then build ONE phase at a time, ONE batch per turn, each file validated (`node --check` for JS, `esbuild --jsx=automatic` for JSX) and handed over as a downloadable file with a short `filename → folder` list (no jargon). Keep this roadmap updated as the single source of truth.
