# WorkTrackr — CRM, Ordering & Commission Roadmap (v2.1)

**Status:** Living document. Phase 0 (IdoYourQuotes integration) is built, deployed and working in production. The quote→order **cost/profit/type pull** is **deployed on the WorkTrackr side** (the IDYQ-repo `worktrackrBridge.ts` change must also be live for it to populate — verify in that repo). **Phases 1–5 are BUILT** (company-centred records + IA regroup; contacts/history/tasks; the full Orders module with approval/purchasing/fulfilment queues; the fully-configurable commission engine + engineer wage progression; IDYQ act-on-quote + recurring Contracts + recurring commission). **Phase 6 (slim) was built** (a simple Deals list + CSV company import) but the **Deals concept has since been reframed as Leads** (see Phase 7). **Phase 7 — Leads — is COMPLETE** (the old "Deals" tab is now a company-centred chase list: the sales stage *Suspect* was renamed *New*; a Leads screen with phone/email/contact columns, sortable headers, stage chips, search, "Mine only" and a first-contact + chase-date column in UK format; an Add-lead quick form; a guided **Convert to customer**; confirmed-delete-to-**archive** with a manager-only Archived view; and a slide-over **Notes panel** with email drag-in). **Phase 8 — sidebar consolidation — is COMPLETE** (the seven Sales items collapsed into a single **Sales** entry with five tabs — Companies/Leads/Quotes/Orders/Contracts; **Approvals** moved to Workspace; the two calendars merged into one **blended Calendar** showing jobs, scheduled tickets, meetings and follow-ups on one month grid with source toggles). NO hardcoded money anywhere (every commission/bonus/threshold/rate is per-org config, zero by default). See §15 (START HERE) and §14.14–§14.18. **Phase 8.1 — Sales UX consolidation (v2.1) is COMPLETE** (one shared `SalesPageLayout` chrome so every Sales tab matches the Leads look; the **Quotes** tab now shows only a quotes list — read-only IdoYourQuotes when connected, the org's native quotes otherwise — with the old CRM stat-cards + inner sub-tabs gone; **Leads** folded onto the shared chrome; the standalone **CRM settings** and **Catalogue** screens stripped to single-section (no mega-page chrome); **Catalogue** menu item hidden when IdoYourQuotes is connected; a sixth **Calendar** tab added to Sales showing the blended calendar pre-scoped to sales activity). See §14.19. Remaining: deferred non-blockers only (IDYQ tag/bridge sync; widen `memberships.role` before role-based home routing; deferred CRM "Customers" tab + ticket→company click-through; Xero/QuickBooks later; optional store-the-original-email-file for the Notes panel).

**Last updated:** 2026-06-23 · **Version history:** v1.0 baseline → v1.1 (menu-consolidation analysis) → v1.2 (revised IA) → v1.3 (IA consolidation) → v1.4 (company-profile services panel) → v1.5 (Phase 5 complete) → v1.6 (Phase 6 design) → v1.7 (Phase 6 slimmed; Deals built) → v1.8 (CSV import built) → v1.9 (docs refreshed for new-session handoff) → **v2.0** (Phase 7 Leads: "Deals"→company-centred Leads chase list, stage *Suspect*→*New*, Add-lead, guided Convert-to-customer, delete→archive, slide-over Notes panel with email drag-in; Phase 8 sidebar consolidation: single tabbed **Sales** entry, **Approvals**→Workspace, one **blended Calendar**) → **v2.1** (Sales UX consolidation: shared `SalesPageLayout` across all Sales tabs; Quotes tab = quotes-list-only, IDYQ-when-connected-else-native; Leads folded onto the shared chrome; CRM settings + Catalogue screens single-section; Catalogue hidden when IDYQ connected; new sixth **Calendar** tab in Sales, sales-scoped)

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

> ⚠️ **Superseded by §4.1.** The grouping below was the Phase-1 plan, written before Orders, Contracts, commission, wage and approvals screens existed. The live menu has since grown past it (see §4.1 for the consolidation plan).

The current flat 15-item menu is being regrouped to follow the flow:

- **Sales** — Prospects, Meetings, Opportunities, Orders (one-off), Contracts (recurring)
- **Delivery** — Tickets, Jobs/Projects, Calendar
- **Finance** — Invoicing & Payments, Commissions
- **Contacts** — companies and people
- **Settings** — Catalogue, Commission rules, Integrations (IdoYourQuotes, Xero/QuickBooks), Users (roles), Billing, Security

### 4.1 Menu consolidation pass (PROPOSED — pending approval, v1.1)
By v1.1 the sidebar had grown to ~24 items across 5 sections with real duplication. Findings from the code:
- **`CRMDashboard.jsx` is a tabbed mega-page** (tabs: Customers / Product Catalog / Quotes / CRM Settings) that the sidebar **Quotes** and **Catalogue** items both deep-link into — so the page's tabs mirror sidebar entries and the same screens are reachable 2–3 ways.
- **Three doors to customer data:** sidebar **Companies** (the Phase-1 `CompanyPipelineList`), sidebar **Contacts** (legacy `ContactManager` people list), and the CRM page's **Customers** tab.
- **Personal items scattered** across four sections: My Tasks (Sales), My wage (Delivery), My commission (Finance), My Notes (Contacts).
- **Pay split awkwardly:** personal pay across Delivery (My wage) + Finance (My commission); pay-admin across Delivery (Engineer wages) + Finance (Commission rules).
- **Two calendars verified distinct (v1.2 code check):** `IntegratedCalendar` (view `calendar`) reads `/api/calendar/events` (ticket scheduling); `CRMCalendar` (view `crm-calendar`) reads `/api/crm-events` (meetings/sales activity). They are correctly separate — keep both; only the CRM Calendar's menu item is mis-placed (sits in Delivery).
- **Notes** as top-level items though company notes belong on the company profile.

**Target IA (≈16 items, one shared customer hub) — section order: Workspace → Delivery → Sales → Finance → Settings:**
- **Workspace** (new, everyone) — My Tasks, **My Pay** (My wage + My commission merged; shows whichever applies), My Notes.
- **Delivery** (above Sales) — Tickets, Projects, **Calendar** (tickets & scheduling — `IntegratedCalendar`, `/api/calendar/events`).
- **Sales** — **Companies** (the one shared customer hub — Delivery's tickets link to the same company record via `tickets.contact_id`; ticket view to gain a click-through to the company profile), Quotes, Orders, Contracts, **CRM Calendar** (meetings/sales activity — `CRMCalendar`, `/api/crm-events`; **moved here from Delivery**), Approvals *(mgr)*.
- **Finance** — Invoices.
- **Settings** *(mgr/admin)* — Catalogue, Commission rules, Engineer wages, CRM settings, Pricing, Integrations, Users, Billing, Security, Email Intake.

The standalone **Contacts** and **Company Notes** menu items are removed (people and notes live on the company; Companies is the primary hub). The CRM page's own **Customers** tab is left intact for now so non-IDYQ orgs keep their existing customer/services screens — it is simply no longer a separate sidebar door.

**CRM page deliberately preserved (v1.3 build):** most orgs do **not** use IdoYourQuotes and rely on the native **Quotes / Catalogue / Quote Templates** that replace it, so the CRM page and all its tabs are left fully intact. Consolidation is done at the **sidebar** instead — single clean entries point into the CRM page: **Quotes** (Sales), **Catalogue** and **CRM settings** (Settings). A `singleSection` switch was added to `CRMDashboard` but is **off by default**, so behaviour is unchanged. Built; see §14.11.

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
5. ✅ **DONE — IDYQ "act on quote" actions + Contracts** (mark won → Contract; recurring profit tracking; recurring commission home).
6. ◑ **DONE then SUPERSEDED — Deals + CSV import** (§16): the slim Deals list was built, but the Deals concept was reframed as **Leads** in Phase 7 (the CSV import remains, now on the Companies tab).
7. ✅ **DONE — Leads** (Phase 7, §14.14): reframe "Deals" as a company-centred chase list (stage *Suspect*→*New*); Leads screen + Add-lead form + guided Convert-to-customer + delete→archive (manager Archived view) + slide-over Notes panel with email drag-in.
8. ✅ **DONE — Sidebar consolidation** (Phase 8, §14.15–§14.18): single tabbed **Sales** entry (Companies/Leads/Quotes/Orders/Contracts); **Approvals**→Workspace; the two calendars merged into one **blended Calendar**.
9. **(Later)** Widen `memberships.role` for role-based home routing; Xero/QuickBooks connector; IDYQ org allow-list before any 3rd-party onboarding; store original email files for the Notes panel.

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
- Phase 5 BATCH 3 built: `ContractsList.jsx` + `ContractForm.jsx` (auto-sorting quote pull, monthly/annual lines, status actions) + nav (Sidebar Contracts in Sales, Dashboard view, AppLayout map) + "New contract" on the company profile. Manager-only pause/cancel via `isManager`. ✅
- IA consolidation (v1.2) — confirmed by user: section order **Workspace → Delivery → Sales → Finance → Settings**; **keep two calendars** (CRM Calendar → Sales, tickets Calendar → Delivery; verified distinct in code); **one shared customer hub** (Companies, shared by Sales + Delivery via `tickets.contact_id`).
- Phase 5 BATCH 4 built: company profile **Services & monthly profit** panel + **Monthly profit** / **Active services** cards now auto-fill from the company's active contracts (`CompanyProfile.jsx`); manual `crm.totalProfit` kept only as a fallback. ✅
- Phase 5 BATCH 5 built + **PHASE 5 COMPLETE**: act-on-quote buttons on the IDYQ quote view (`IdyqIntegration.jsx`) — Create contract / Create order from a quote — plus a new `orders` pull-quote endpoint (`orders.js`). ✅ sidebar regrouped (Workspace/Delivery/Sales/Finance/Settings), **My Pay** merges My wage + My commission, pay-admin (Commission rules, Engineer wages) + Catalogue + CRM settings moved into Settings (manager tier + admin tier), CRM Calendar moved to Sales, Contacts + Company Notes top-level items removed. **CRM page left fully intact** to protect native (non-IDYQ) Quotes/Catalogue/Quote-Templates — consolidation done at sidebar level only. Every menu item verified to resolve to a screen. See §14.11. ✅
- Phase 6 SLIMMED at user request (v1.7): dropped probability/weighting/win-rate/quarter-forecast/auto-convert/linked-quote. Kept a simple deals list (Open/In progress/Won/Lost) with an "open pipeline" total, + a simple CSV company import. **Deals half BUILT** (`deals` table + `deals.js` + DealsList/DealForm + nav); CSV import next. ✅
- Phase 6 (slim) COMPLETE (v1.8): CSV company import built — `POST /api/contacts/import` + `CsvImport.jsx` wizard + Import button on the Companies page (dedupe by name/email). Both halves done. ✅
- **Phase 7 / v2.0 — "Deals" reframed as "Leads":** a lead **is a company** at a non-customer stage (no money on a lead; money appears later at quote/order/contract). Sales stage **Suspect renamed New** (value `new`) everywhere; ladder New → Prospect → Hot prospect → Customer. Leads list is the chase view (company/contact/phone/email/stage/owner/first-contact/next-action/chase-date, UK dates, overdue red, sortable, stage chips, search, Mine-only). ✅
- **Convert to customer is a guided modal** (confirm contacts + account manager + optional address) that **promotes the same company record** (`crm.salesStage='customer'`, `status='active'`) — keeps notes/history, no duplicate. ✅
- **Delete = archive, never erase:** sets `crm.archived=true`; archived leads hidden from everyone; **managers** get an Archived view to Restore or permanently Delete. `GET /api/contacts` excludes archived by default; `?archived=only` is manager-gated. ✅
- **Lead Notes = own store, shown on the profile timeline, never on the calendar:** new `contact_notes` table (kind `note`/`email`); surfaced via `GET /:id/history`; **not** written to `crm_events` (so notes don't pollute the Calendar). Email drag-in logs subject + text only — the original file is **not** stored. ✅
- **Phase 8 / v2.0 — sidebar consolidation (Option A, approved):** the seven Sales items collapse into a single **Sales** entry with five tabs (Companies/Leads/Quotes/Orders/Contracts, via `SalesTabs.jsx`); `AppLayout` maps all five views to the one `sales` item so it stays highlighted. **Approvals moved to Workspace** (manager-only). ✅
- **One blended Calendar (Option B, approved):** the separate "CRM Calendar" item is gone; the single **Calendar** is the CRM month grid extended to also show **scheduled tickets** (from app context) and **work calendar events** (`/api/calendar/events`) as read-only, colour-coded items, with **Sales / Projects / Schedule** toggles. Clicking a ticket opens it; CRM events stay fully editable. Known tradeoff: creating brand-new *standalone* work-calendar entries isn't on this screen (existing ones still show); re-add if used. ✅

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

### 14.10 Phase 5 file map — BATCH 3 (Contracts UI + nav, BUILT)
**No money figure in any field; all values come from the quote (read-only) or are typed in.**
- `web/client/src/app/src/components/ContractsList.jsx` (NEW) — recurring contracts list (teal accent), filters all/draft/active/paused/cancelled, columns Company / Salesperson / Charge·mo / Profit·mo, "active recurring profit £/mo" summary, hosts the form. Mirrors `OrdersList.jsx`.
- `web/client/src/app/src/components/ContractForm.jsx` (NEW) — create/edit a draft, **Pull from IdoYourQuotes** (calls the backend `pull-quote`; saves a draft first if new, then shows "N one-off items started as a separate order"), recurring line table with a monthly/annual interval picker and a per-line **Profit / mo** column (annual ÷ 12), monthly totals, status pill + actions Save / Activate·Resume (all) / Pause·Cancel (manager only, via `isManager` prop; backend also enforces). IDYQ lines read-only.
- `web/client/src/app/src/components/Sidebar.jsx` (EDITED) — **Contracts** item in Sales under Orders (Repeat icon).
- `web/client/src/app/src/components/AppLayout.jsx` (EDITED) — `contracts → 'contracts'` in VIEW_TO_PAGE.
- `web/client/src/app/src/components/Dashboard.jsx` (EDITED) — imports + renders `<ContractsList>`; derives `isManager` from membership role; `contractsInitial` state; passes `onNewContract` to the company profile.
- `web/client/src/app/src/components/CompanyProfile.jsx` (EDITED) — **New contract** button beside New order (Repeat icon), `onNewContract` prop.

### 14.11 IA consolidation file map (BUILT, v1.3)
**Sidebar-level only; the CRM page and all native (non-IDYQ) functionality untouched.**
- `web/client/src/app/src/components/Sidebar.jsx` (EDITED) — sections regrouped to **Workspace → Delivery → Sales → Finance → Settings**. Workspace (My Tasks, **My Pay**, My Notes); Delivery (Tickets, Projects, Calendar); Sales (Companies, Quotes, Orders, Contracts, CRM Calendar, + Approvals when manager); Finance (Invoices); Settings shown to managers/admins — manager tier (Commission rules, Engineer wages, CRM settings) then admin tier (Catalogue, Pricing, Users, Billing, Security, Email Intake). Standalone Contacts + Company Notes items dropped.
- `web/client/src/app/src/components/MyPay.jsx` (NEW) — Workspace "My Pay"; one page with a Commission/Wage toggle, reusing `BonusScreen` + `EngineerWage` unchanged.
- `web/client/src/app/src/components/AppLayout.jsx` (EDITED) — `my-pay` and `crm-settings` added to VIEW_TO_PAGE.
- `web/client/src/app/src/components/Dashboard.jsx` (EDITED) — imports + renders `<MyPay>` (`my-pay`) and the CRM page at its settings tab (`crm-settings`). Legacy `my-commission`/`my-wage` renders left in place (unreachable from nav, harmless).
- `web/client/src/app/src/components/CRMDashboard.jsx` (EDITED) — inert `singleSection` prop (off by default; header/stat-strip/tab-bar wrap so it *can* be hidden later, but isn't now). **No functional change** — IDYQ and native Quotes/Catalogue/Quote-Templates all behave as before.
- Verified: every sidebar item resolves to a Dashboard render and highlights via VIEW_TO_PAGE; no dead links.
- Not done (deliberate): the CRM "Customers" tab and the ticket→company click-through are left for a later careful pass once Companies-hub parity is confirmed.

### 14.12 Phase 5 file map — BATCH 4 (company profile services panel + cards, BUILT)
**Reads only the contract API; no money figure in code.**
- `web/client/src/app/src/components/CompanyProfile.jsx` (EDITED) — loads the company's **active** contracts (`/api/contracts?contactId=&status=active`) and their lines, aggregates them into the **Services & monthly profit** panel (per-service charge / cost / profit, monthly-normalised — annual shown as `/yr ÷12`; "IDYQ" badge on pulled lines; teal total-recurring-per-month row; read-only note). The **Monthly profit** card is now auto-calculated from those active contracts (Decision 7), falling back to the manual `crm.totalProfit` only when there are no active contracts; the **Active services** card shows the active service-line count. Empty + loading states handled.

### 14.13 Phase 5 file map — BATCH 5 (act-on-quote, BUILT — Phase 5 COMPLETE)
- `web/routes/orders.js` (EDITED) — new `POST /:id/pull-quote` (mirrors the contracts pull: adds all of a mirrored quote's lines with cost/profit/type from the mirror, fills the order's company from the quote's linked contact if unset). Draft-only.
- `web/client/src/app/src/components/IdyqIntegration.jsx` (EDITED) — `QuoteRow` (the expandable IDYQ quote) gains an **"Act on this quote"** bar: **Create contract** (POST `/api/contracts` → pull-quote; auto-sorts, spins one-off lines into an order) and **Create order** (POST `/api/orders` → pull-quote; snapshots the whole quote). Inline success/error feedback. Secondary "act on quote" entry (§2.11); primary entries remain the Contracts/Orders pages + the company profile.
- Note: these buttons live in the IDYQ quotes view, shown only when IdoYourQuotes is connected; non-IDYQ orgs use the native flows.

---

### 14.14 Phase 7 file map — Leads (BUILT; replaces Deals)
- `web/migrations/phase7_leads_stage_rename.sql` (NEW) — one-off `UPDATE` migrating any `crm.salesStage='suspect'` → `'new'`.
- `web/routes/contacts.js` (EDITED) — crm Zod `salesStage` enum `suspect`→`new`; new crm fields `firstContact`, `chaseDate`, `nextAction`, `archived`, `archivedAt`; CSV import stage list updated (legacy `suspect` still accepted as an alias); `GET /` excludes archived by default, `?archived=only` is manager-gated.
- `web/client/src/app/src/components/LeadsList.jsx` (NEW) — the chase list: columns, sortable headers, stage chips + counts, search, Mine-only, Import (reuses `CsvImport`), Add-lead; per-row **Notes / Convert / Delete(archive)**; manager **Archived** view (Restore / permanent Delete) via an `isManager` prop.
- `web/client/src/app/src/components/AddLeadModal.jsx` (NEW) — quick "add a company as a lead" form.
- `web/client/src/app/src/components/ConvertToCustomerModal.jsx` (NEW) — guided convert (confirm contacts + account manager + optional address → promote same record to customer).
- `CompanyPipelineList.jsx`, `CompanyProfile.jsx` (EDITED) — STAGES `suspect`→`new` label/key.

### 14.15 Phase 8 file map — tabbed Sales + Approvals move (BUILT)
- `web/client/src/app/src/components/SalesTabs.jsx` (NEW) — the Companies/Leads/Quotes/Orders/Contracts tab bar.
- `web/client/src/app/src/components/Sidebar.jsx` (EDITED) — Sales collapsed to a single `{ view:'companies' }` entry; **Approvals** moved into Workspace (manager-only).
- `web/client/src/app/src/components/AppLayout.jsx` (EDITED) — `companies/leads/quotes/orders/contracts` all map to the one `sales` item (stays highlighted across tabs).
- `web/client/src/app/src/components/Dashboard.jsx` (EDITED) — renders `SalesTabs` above the sales views (hidden when a company profile is open); `Dashboard` is a `forwardRef`.

### 14.16 Phase 8 file map — one blended Calendar (BUILT)
- `web/client/src/app/src/components/CRMCalendar.jsx` (EDITED — now the single Calendar) — added event types `ticket`/`schedule`; pulls `tickets` from `useSimulation()` and `/api/calendar/events`; a `scheduleItems` memo; **Sales / Projects / Schedule** toggle pills; `getEventsForDate` gated by toggles; a shared `openEvent()` (tickets → `onTicketClick`, schedule entries read-only, CRM events → edit modal); title "CRM Calendar"→"Calendar".
- `web/client/src/app/src/components/Sidebar.jsx` (EDITED) — the separate "CRM Calendar" item removed; one **Calendar** in Delivery.
- `web/client/src/app/src/components/Dashboard.jsx` (EDITED) — the `calendar` view now renders the blended `CRMCalendar` (was `IntegratedCalendar`, now unused import).

### 14.17 Phase 8 file map — lead Notes panel (BUILT)
- `web/migrations/phase8_contact_notes.sql` (NEW) — `contact_notes` table (`kind` `note`/`email`, subject, body, created_by, created_at) + indexes.
- `web/routes/contacts.js` (EDITED) — `GET /:id/history` also aggregates `contact_notes` (wrapped in try/catch for pre-migration safety); new `POST /:id/notes`.
- `web/client/src/app/src/components/LeadNotesPanel.jsx` (NEW) — slide-over: timeline (kind→icon, UK dates), add-note box, email drop zone (reads `.eml`/`.txt` text + `Subject:` header, else filename as subject; logs subject + text, no file storage).
- `web/client/src/app/src/components/LeadsList.jsx` (EDITED) — per-row **Notes** icon opens the panel.

### 14.19 Phase 8.1 file map — Sales UX consolidation (v2.1, BUILT)
**Goal: every Sales tab shares one look (the Leads tab) so they can't drift; declutter the Quotes/CRM-settings/Catalogue surfaces. Pure front-end; no SQL; no money figures.**
- `web/client/src/app/src/components/SalesPageLayout.jsx` (NEW) — the single shared chrome for every Sales tab: page wrapper + width, header (title + count subtitle + right-aligned actions), rounded-full filter-pill row, bordered/rounded table shell. Exports building blocks `SalesSearch`, `SalesPrimaryButton` (green `#1D9E75`), `SalesSecondaryButton` (grey; green-toggle when `active`), `SalesAllPill`, `SalesFilterPill` (semantic colour via `pillClass`, amber active-ring, opt-in `capitalize`). `maxWidth` prop (default `max-w-5xl`; Leads passes `max-w-7xl`).
- `CompanyPipelineList.jsx`, `OrdersList.jsx`, `ContractsList.jsx`, `LeadsList.jsx` (EDITED) — re-skinned onto `SalesPageLayout` (green primary button, rounded-full pills with counts, search on every page). All data logic unchanged (verified by diff against the prior versions); Orders/Contracts gained a search box; Contracts keeps its repeat icon, recurring-profit subtitle and footnote.
- `web/client/src/app/src/components/SalesQuotes.jsx` (NEW) — the Quotes tab. `useIdyqConnection()`: **connected →** the read-only IDYQ quotes list (reuses `IdyqQuotesView`, which keeps line-item expand + the act-on-quote actions); **not connected →** the org's native `/api/quotes` in the shared chrome with a "Create quote" button. No stat cards, no inner sub-tabs (the duplicate "Customers" sub-tab is gone from here; Catalog/CRM-settings live under Settings).
- `Dashboard.jsx` (EDITED) — `quotes` view now renders `<SalesQuotes/>` (was `CRMDashboard defaultTab="quotes"`); `crm-settings` and `product-catalog` views now pass `singleSection` to `CRMDashboard` (strips the "Customer Relationship Management" title + 4 stat cards + inner sub-tab bar — only the relevant content shows); added the `sales-calendar` view (renders `CRMCalendar` with `defaultSources={{sales:true,projects:false,schedule:false}}` + ticket click-through) and added `sales-calendar` to `SALES_VIEWS`.
- `SalesTabs.jsx` (EDITED) — sixth tab **Calendar** (`view:'sales-calendar'`); tab-bar width aligned to the list pages (`max-w-5xl`).
- `CRMCalendar.jsx` (EDITED) — new optional `defaultSources` prop initialises the Sales/Projects/Schedule toggles (defaults all-on, so the Delivery blended Calendar is unchanged; the Sales Calendar tab opens sales-only and the user can still toggle the others on — same calendar, same data).
- `AppLayout.jsx` (EDITED) — `sales-calendar → 'sales'` in `VIEW_TO_PAGE` (Sales stays highlighted on the Calendar tab).
- `Sidebar.jsx` (EDITED) — calls `useIdyqConnection()` and filters the **Catalogue** admin item out when connected (kept for non-IDYQ orgs). Fail-safe: if the check errors it treats as not-connected, so Catalogue stays visible. Known minor caveat: the sidebar reads the connection once on load, so after connecting/disconnecting IDYQ mid-session the Catalogue item appears/disappears on the next page refresh.
- `IdyqIntegration.jsx` — **unchanged** (a stray prev-session `export` of `QuoteRow` was discarded; `SalesQuotes` reuses the whole `IdyqQuotesView` instead).
- Validation: all files `esbuild --jsx=automatic` clean; lucide icon names verified; component props unchanged so wiring is limited to the Dashboard/AppLayout/Sidebar edits above. No migration, no SQL.

---

## 15. Current state / START HERE (for a fresh session)

**Build position:** Phases 0–8 plus the **Phase 8.1 Sales UX consolidation (v2.1)** are built. The redesign is complete end-to-end. No phase is in progress; only the deferred non-blockers below remain.

**Repo & mechanics:** WorkTrackr = `worktrackr-app` (this repo), pushed via GitHub Desktop from `C:\repos\worktrackr-app`; Render auto-deploys on push; the `web` service runs `web/migrations/*.sql` **alphabetically on boot** (tracked in `schema_migrations`, skips already-applied) — so **no manual migration step** is needed. A "company" is a `contacts` row `type='company'` (never FK to the dropped `customers` table); CRM data lives in the `contacts.crm` JSONB. IDYQ integration is a read-only pull. Most orgs do NOT use IDYQ — never break the native Quotes/Catalogue/Quote-Templates.

**What "Leads" is (Phase 7 — important, replaces "Deals"):** A lead = a company at a chase stage. The sales-stage ladder is **New → Prospect → Hot prospect → Customer** (the old name *Suspect* was renamed *New* everywhere — value `new`). The Sidebar's old **Deals** item is now **Leads**, a company-centred chase list (`LeadsList.jsx`) showing company / contact / phone / email / stage / owner / **first contact** ("12 May" style) / next action / **chase date** (full UK `DD/MM/YYYY`, overdue in red); with stage chips + counts, search, "Mine only", sortable headers, an **Add lead** quick form (`AddLeadModal.jsx`), a guided **Convert to customer** (`ConvertToCustomerModal.jsx` — confirms contacts, flips `crm.salesStage='customer'`), confirmed **Delete→archive** (sets `crm.archived=true`; hidden from everyone; managers get an **Archived** view to restore or permanently delete), and a slide-over **Notes panel** (`LeadNotesPanel.jsx` — add notes, drag emails in; logged to `contact_notes` and shown in the company profile timeline). No money on a lead. The old `deals` table + `DealsList.jsx`/`DealForm.jsx` are now unused (left in place, harmless).

**What the sidebar looks like now (Phase 8 consolidation, BUILT):**
- **Workspace** — My Tasks, **Approvals** (manager-only, moved here), My Pay, My Notes.
- **Delivery** — Tickets, Projects, **Calendar** (the single blended month calendar — jobs + scheduled tickets + meetings + follow-ups on one grid, with **Sales / Projects / Schedule** toggles).
- **Sales** — a single **Sales** entry that opens a tabbed page: **Companies · Leads · Quotes · Orders · Contracts · Calendar** (tabs via `SalesTabs.jsx`; clicking a row still opens the full company profile). All six share one chrome (`SalesPageLayout.jsx`, the Leads look). Quotes shows only a quotes list (read-only IDYQ when connected, native otherwise). The Calendar tab is the blended month calendar pre-scoped to sales activity (Projects/Schedule toggles still available). **Catalogue** (Settings) is hidden when IdoYourQuotes is connected (it's a read-only IDYQ mirror for connected orgs); it stays for non-IDYQ orgs as their product price-book. The standalone **CRM settings** and **Catalogue** screens render single-section (no CRM mega-page chrome).
- **Finance** — Invoices.
- **Settings** (mgr/admin) — Commission rules, Engineer wages, CRM settings, Catalogue, Pricing, Users, Billing, Security, Email Intake.

**Still pending / future (non-blockers):**
- **IDYQ quote cost/profit/type pull:** WorkTrackr side is deployed. The **IDYQ-repo** file `server/_core/worktrackrBridge.ts` (mapLine emitting `cost_price`/`profit`/`pricing_type`) must also be live in `idoyourquotes-main` for cost/profit to populate; then run a sync.
- **`memberships.role` CHECK widening** — still `('admin','manager','staff')` in `database/schema.sql`; needs `'salesman'`/`'engineer'` added before role-based home routing / a Users role selector. Manager-gating works today off `admin`/`manager`/`owner`/`partner_admin`.
- **Notes panel emails** log the subject + text only; the original email **file is not stored** (no attachment storage wired). Add file storage if needed.
- Deferred **CRM "Customers" tab** cleanup + **ticket→company** click-through; IDYQ **org allow-list** before 3rd-party onboarding; **Xero/QuickBooks** connector.
- Pre-existing clutter (`*.broken`/`*.backup` files in the components folder) — unused, optional to remove.

**Stale docs — do NOT trust:** `docs/ROADMAP.md`, `docs/APP-STATE.md` and `docs/database_schema.md` are pre-redesign (April). Trust **this roadmap (v2.0)** and the **code** over them.

**Working cadence (unchanged):** UX/design first, then build ONE batch per turn; validate every file (`node --check` for JS, `esbuild --jsx=automatic` for JSX, real Postgres-grammar parse for SQL) and check lucide icon names exist; hand over downloadable files with a plain `filename → folder` list flagging replacements; explain in app-flow terms, no jargon. **No hardcoded money** — every commission/bonus/threshold/rate is per-org config, zero by default. Keep this roadmap the single source of truth and bump its version (and filename) by 0.1 on every update.

---

## 16. Phase 6 (SLIMMED per user — v1.7) — Deals + CSV import

> **⚠️ SUPERSEDED in v2.0:** the **Deals** concept below was reframed as **Leads** (Phase 7, §14.14). The `deals` table and `DealsList.jsx`/`DealForm.jsx` still exist but are **unused** (left in place, harmless). The **CSV import** is still live, now reached via the **Import** button on the **Companies** tab. This section is kept for history.

Scope was cut right back at the user's request: keep only the essentials, drop the extras.

**Deals (BUILT, batch 1):** a lightweight deal = company, title, value (£), stage (**Open → In progress → Won → Lost**), expected close date, owner, notes. The Deals page lists them with one headline number — **open pipeline = Σ value of Open + In-progress deals**. That single number is the "forecast". **Dropped:** probability/weighting, weighted forecast, closing-this-quarter, win-rate, kanban board, auto-convert to order/contract, linked-quote value. `value` is user-entered deal data (not a commission figure).
- Files: `web/migrations/phase6_deals_tables.sql` (NEW — `deals` table), `web/routes/deals.js` (NEW — CRUD + stage changes; owner defaults to creator; won/lost stamped), `web/server.js` (mounts `/api/deals`), `web/client/src/app/src/components/DealsList.jsx` + `DealForm.jsx` (NEW), nav wired (Sidebar **Deals** in Sales after Companies, AppLayout map, Dashboard render). Validated (`node --check`, `esbuild --jsx`, real Postgres-grammar parse; menu item resolves).

**CSV import (BUILT, batch 2):** import companies from a spreadsheet — **upload a CSV (or paste)** → **map columns** to fields (auto-guessed by header) → **import**, with duplicates skipped server-side (by name/email). Lives as an **Import** button on the Companies page (no new menu item). Imports name, email, phone, contact person, website, sales stage, notes.
- Files: `web/routes/contacts.js` (EDITED — new `POST /import`: bulk-creates company contacts, dedupes by name/email within the org, returns `{created, skipped, errors}`), `web/client/src/app/src/components/CsvImport.jsx` (NEW — 3-step wizard, in-browser CSV parse, column mapping, result summary), `web/client/src/app/src/components/CompanyPipelineList.jsx` (EDITED — **Import** button + reload after import). Validated (`node --check`, `esbuild --jsx`, real Postgres-grammar parse).

*Status: Phase 6 (slim) COMPLETE — Deals + CSV import both built.*
