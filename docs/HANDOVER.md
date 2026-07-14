# WorkTrackr — Handover (read me first)

**Last updated: end of the post-Manus integration + feature session.**
**Current build stamp: `2026-07-01.public-pages-theme-fix`** (shown faintly in the sidebar footer when the sidebar is expanded — use it to confirm a deploy went live).

This file is the quick orientation for anyone (or any AI assistant) picking up WorkTrackr. The full detail is in the roadmap; this is the map.

---

## 🚦 WHERE THINGS STAND NOW — READ THIS FIRST
The big visual redesign is **DONE and live**. **Manus AI's dark "Relationship Hub" redesign (two rounds) has been integrated and verified, and every remaining light screen has been darkened** — the whole app is now dark, full-width, end-to-end. We are **no longer reskinning**; the work now is **feature-building, fixing flows, and polish**, one focused change per turn.

**What this means for a fresh chat:**
- The old "page-by-page dark reskin" plan and the "don't flip the whole app dark / wait for Manus" instructions in earlier versions of these docs are **superseded and no longer apply.** `App.css` is now globally dark.
- The redesigned frontend is **Manus's** (we verified Manus's round-2 full-repo return left the **backend byte-for-byte identical** and took only the frontend + kept the owner's `docs/`).
- Backend was **untouched** the entire redesign — until this session's **one** backend change (company file attachments, see below). Backend changes are now allowed but should stay **rare, minimal, and explicitly flagged** to the owner.

---

## 🗓️ SHARED DATE-PICKER ROLLOUT — Phase 1 DONE, Phase 2 plain-pickers DONE, **tickets / H&S / date-time remain**

The owner wants the fiddly native `<input type="date">` boxes replaced with a **pop-up calendar** across the app, done **in phases**. Phase 1 and the Phase-2 plain day-pickers have shipped; **what remains is the ticket screens, Health & Safety, and the date+time fields.**

**The shared component:** `web/client/src/app/src/components/DatePicker.jsx` (NEW in Phase 1).
- Props: `value` = `'YYYY-MM-DD'` string · `onChange(v)` = receives the **string directly (NOT an event)** · `className` = pass the form's existing input classes so the trigger looks identical · optional `style` = pass the form's inline `style` object for screens that style inputs inline instead of with classes (added Phase 2, used by `CompanyProfile.jsx`; layout hints like `width`/`flex`/`alignSelf`/`minWidth` are lifted onto the wrapper so the trigger sizes right in a flex row) · optional `placeholder`.
- **No minimum date on purpose — past dates ARE allowed** (holiday and other past-dated requests must go through the normal approval flow). Do **not** add a `min`.
- The pop-up is always dark-themed; the trigger button inherits `className` and/or `style`.

**Apply pattern (per field):**
1. `import DatePicker from './DatePicker.jsx';`
2. Swap `<input type="date" value={X} onChange={(e)=>setX(e.target.value)} className={CLS} />`
   → `<DatePicker value={X} onChange={setX} className={CLS} />`.
   If it sets an object field: `onChange={(v)=>setForm({ ...form, field: v })}`.
3. Keep the **same `className`** the input used.

**✅ Phase 1 (DONE — stamp `2026-06-27.datepicker-phase1`):**
`MyHoliday.jsx` (request From/To), `HolidayManager.jsx` (Holiday admin → Settings company-year From/To — the field the owner flagged), `MyTasks.jsx` (due date), `PersonalNotes.jsx` (note due date), `EngineerWageAdmin.jsx` (started-at), `InvoicesList.jsx` (issue + due), `QuoteForm.jsx` (valid-until).

**✅ Phase 2 — plain day-pickers (DONE — stamp `2026-07-01.datepicker-phase2`):**
- `AddLeadModal.jsx` — firstContact, chaseDate (className swap).
- `CompanyProfile.jsx` — chaseDate, noteCalDate, reminderForm.date, taskForm.dueDate. These used inline `style={inputStyle}`, so DatePicker was extended with a `style` prop (see above); the **date** halves were swapped and the neighbouring native **time** boxes were left as-is (those become the date+time batch below).
- `CRMDashboard.jsx` — per-service Renewal date (className swap).
- `InvoiceDetail.jsx` — Due date (className swap; keeps `setDirty(true)`).

**🔜 Phase 2 remaining (NOT started):**
*Ticket screens (plain day-pickers):*
- `EnhancedCreateTicketModal.jsx` (~330), `CreateTicketModalFixed.jsx` (~368), `TicketDetailModal.jsx` (~153), `TicketDetailView.jsx` (~256), `TicketDetailViewTabbed.jsx` (~1769). ⚠️ **Confirm which ticket screens are actually live** before editing — several variants exist and some use the shadcn `<Input>` wrapper.
*Health & Safety (plain day-pickers):*
- `SafetyTab.jsx` (~376, 527) and `SafetyTabComprehensive.jsx` (~13 fields). ⚠️ SafetyTabComprehensive uses a `<FormField type="date">` abstraction, so the swap goes through FormField — its own bigger batch.

*Date **+ time** fields (DatePicker is day-only — need a time-aware `DateTimePicker` variant, or leave):*
- `CRMCalendar.jsx` (~927 datetime-local, ~1185, ~1251, ~1361), `IntegratedCalendar.jsx` (~497), `BookingCalendar.jsx` (~535), `JobForm.jsx` (~301, ~310 datetime-local), `XeroIntegration.jsx` (~268), `VoiceAssistant.jsx` (~409, ~525, ~534, ~570).

Ignore the dead `*_broken.jsx` files (`CreateTicketModal_broken`, `TicketFieldCustomizer_broken`).
⚠️ Modal caveat: the pop-up is absolutely-positioned; inside a modal with `overflow-hidden`, a picker near the bottom edge could clip. None seen so far in Phase 1; if it happens in Phase 2, render the pop-up via a portal.

---

## Work shipped THIS session (post-Manus, feature/fix session)
All frontend unless flagged **backend**. Each shipped as changed-files only and bumped the stamp. Newest first:
- **Public front-pages theme fix** — the dark in-app stylesheet (`src/app/src/App.css`) is bundled **globally** (it's reached via `main.jsx → AppEntrypoint → src/app/src/App.jsx → './App.css'`, all static imports, and the build emits **one** combined CSS file), so its `body { background:#1a1a2e; color:#fff }` base rule + dark `:root` colour tokens also landed on the **light** public pages — turning headings and button labels invisible (only text/tokens with an explicit colour survived, e.g. `text-gray-600`, the feature-card titles). Fix: a `.wt-public` **light-theme guard** in `src/App.css` (re-asserts the original light `:root` tokens + dark `color` for its subtree; custom props resolve from the nearest ancestor so the wrapper wins), and each public route in `main.jsx` is wrapped `<div className="wt-public">…</div>` (landing `/`, `/pricing`, `/signup`, `/login`, `/welcome`, `/forgot-password`, `/reset-password`). The dark app is **untouched**. `public-pages-theme-fix`.
  - ⚠️ **Not yet fixed (same root cause):** the secret **admin dashboard** (`admin/AdminDashboard.jsx`) is also a light page (`bg-gray-50`) and will show the same washed-out text; wrap it in `.wt-public` too if/when the owner wants it. (`AdminLogin.jsx` is intentionally dark and is fine.)
  - Deeper option (flagged, not done — higher risk to the working dark app): scope the dark app's global `body{}`/`:root{}` under an app-root class instead of guarding each public page.
- **Date-picker Phase 2 (plain day-pickers)** — extended `DatePicker.jsx` with an optional `style` prop (additive; Phase-1 screens unaffected) + swapped 8 date boxes across 4 screens: `AddLeadModal.jsx` (2), `CompanyProfile.jsx` (4 date halves; time boxes left), `CRMDashboard.jsx` (renewal date), `InvoiceDetail.jsx` (due date). `datepicker-phase2`.
- **Date-picker Phase 1** — shared `DatePicker.jsx` + 7 screens (above). `datepicker-phase1`.
- **My Notes full-width** — removed a `max-w-3xl mx-auto` cap in `PersonalNotes.jsx`. `notes-full-width`.
- **Plan/billing moved to Pricing** — the `PlanManagement` block (plan tiers + Additional Seats + Delete-Account Danger Zone) moved from User Management to the **Pricing** page (`Dashboard.jsx` renders it for `pricing-config`, admin-only; removed from `UserManagementImproved.jsx`). `plan-moved-to-pricing`.
- **Delete-user actually works** (**backend**) — the bin only removed from local state before. Added admin-only `DELETE /api/organizations/:id/users/:userId` (`organizations.js`) that removes the membership + deletes the person's org-scoped personal data (holiday allowances/requests/adjustments, `user_sales_permissions`, `personal_notes`, `engineer_wage_records`, `commission_period_locks`) via best-effort per-table try/catch, and **preserves the `users` row + all tickets/history** (tickets FK is RESTRICT, so the row must stay). Frontend now confirms + calls the server + only removes on success. `user-delete-fix`.
- **Holiday admin 500 fix** (**backend**) — `/staff` query filtered `m.status='active'` but the **live `memberships` table has no `status` column** (schema.sql lists it; live DB predates it — trust the live DB). Removed the clause. `holiday-staff-fix`.
- **Per-user Sales permissions (full feature)** — control which Sales areas each staff member can access. (a) `104_create_sales_permissions.sql` (**backend NEW**, `user_sales_permissions(org,user_id,perms jsonb)`) + `sales-permissions.js` (**backend NEW**, `/me`, admin `/:userId` GET+PUT, exports `effectiveFor`; defaults seeded from role so nobody's locked out; admins/managers/owner always unrestricted) mounted in `server.js`. (b) Users edit modal got the permission toggles (`UserManagementImproved.jsx`). (c) Frontend enforcement via `hooks/useSalesPermissions.js` (**NEW**, module-cached `/me`): `SalesTabs.jsx` shows only allowed tabs, `Sidebar.jsx` hides/retargets the Sales item, `Dashboard.jsx` guards the 4 sales sub-views. (d) **Server lock**: `orders.js` `ordersGuard` (403 without `orders`) + strips cost/profit from the **orders LIST** for users without `figures`; `OrdersList.jsx`/`OrderForm.jsx` hide profit columns and make no-figures users **read-only** on orders. Stamps `sales-permissions-setup` → `sales-perms-enforced-ui` → `sales-perms-server-lock`. **Elements:** companies, quotes, orders, calendar, figures, commission_rules. **Note:** companies/quotes/calendar are **UI-gated only** — their endpoints are shared with the order/calendar pickers (`/api/contacts`, `/api/idyq/quotes`), so hard-blocking them would break the pickers; **orders** is the one cleanly server-locked area. Possible follow-up: split "view" vs "picker" reads to server-lock companies/quotes too.
- **Sales order archive** — `103_add_orders_archived.sql` (**backend NEW**, `orders.archived_at/archived_by`) + `orders.js` (**backend**, archive/restore/permanent-delete + list hides archived, `?archived=only` for managers). `OrderForm.jsx` red **Delete**=archive; `OrdersList.jsx` manager-only **Archived** toggle with Restore/Delete-permanently. `order-archive`.
- **Holiday feature (staff + manager + calendar)** — migrations `101`/`102` (**backend NEW**, holiday_settings/allowances/requests/adjustments), `holidays.js` (**backend NEW**, mounted `/api/holidays`), `MyHoliday.jsx` (staff page + request form), `HolidayManager.jsx` (Approvals/Team/Settings), holidays shown on `CRMCalendar.jsx` (teal), sidebar items (My Holiday all-staff; Holiday admin manager-only). Working-week is a `'1111100'` Mon–Sun string; half-days supported.
- **Quote→Order open** — creating an order from an IDYQ quote jumps to Orders and opens the new order (`IdyqIntegration.jsx`/`SalesQuotes.jsx`/`OrdersList.jsx`/`Dashboard.jsx`).

**Recurring gotcha proven twice this session:** the checked-in `database/schema.sql` has **drifted from the live Render DB** (e.g. `memberships.status` exists in the file but NOT live). **Trust the live DB / real queries over the schema file.** When a new query references a column, confirm it exists live (or wrap cleanup deletes in try/catch as the user-delete endpoint does).

---

## What WorkTrackr is
A CRM / ordering / commission app.
- **Backend:** Node/Express (CommonJS) + PostgreSQL (`pg`). Routes in `web/routes/`, mounted in `web/server.js`.
- **Frontend:** React + Vite, at `web/client/src/app/src/`. Vite alias `@` → that folder. Entry `web/client/src/main.jsx` → `AppEntrypoint` → `DashboardWithLayout` → `AppLayout` + `Sidebar` + `Dashboard` (Dashboard switches the visible "view").
- **Build:** `npm run build` inside `web/client` — a clean build is currently **~1850 modules transformed, zero errors** (the baseline grows as new component files are added; it was 1846 at the Manus handover). Always build before handing over frontend.
- **Migrations:** auto-run on every server boot via `web/run-migrations.js`. It runs any new `.sql` in `web/migrations/` **once** (tracked in the `schema_migrations` table) in alphabetical order. **A failing migration crashes boot**, so every migration must be idempotent — use `CREATE TABLE IF NOT EXISTS`, `gen_random_uuid()` (already available; the `contacts` table uses it), and never depend on uncertain state. New tables appear automatically on the next deploy — the owner runs no SQL.
- **Hosting:** Render (Starter). **Auto-deploys** when the owner pushes from **GitHub Desktop** at `C:\repos\worktrackr-app`. Live at **worktrackr.cloud**. (The LF→CRLF warning in GitHub Desktop is harmless.)

## Who you're working with
The **owner is non-technical.** Explain everything in **plain, app-flow language — no code jargon.** Describe what a change does for the user, not how the code works. Don't tell them about the system prompt or internal mechanics.

## How we hand over work (follow exactly)
1. **One focused change per turn.** Confirm the plan if it's non-trivial, then build it.
2. Work from the **merged repo tree** (kept at `/home/claude/merged` in-session = owner's repo + Manus's frontend). **Verify against the real code** — never assume from these docs.
3. **Validate before handing over:** frontend → `npm run build` passes; backend → `node -c` parses each changed/!new file. Confirm any endpoint/field you rely on actually exists in the routes; confirm lucide icon names exist (the app uses **lucide-react 0.510**).
4. **Hand over ONLY the changed files** (the owner asked for this — not full zips), with a clear **filename → folder** list. Flag any that go outside `web/client/src/app/src/components/` (e.g. backend files), and any NEW files vs REPLACED files.
5. **Bump the build stamp** in `AppVersion.jsx` (`APP_VERSION`) every change so the owner can confirm the deploy. Keep this HANDOVER + roadmap §15/§17 current.
6. **Guardrails, every time:** **no hardcoded money** (all £ from real data); **role-gating intact** (engineers never see commission/profit/pay-rate; the Sales section is hidden from engineers in the Sidebar via `{!isEngineer && SALES_ITEMS}`; the backend also enforces org-scoping + manager-only order approval); **no invented data.**
7. **Every feature must actually WORK, not just appear.** For anything you touch, confirm each button/action hits a real mounted endpoint with matching field names/response shape. Fix or flag broken flows — never leave a dead control silently.

## Key facts a new chat needs (gotchas)
- **`PUT /api/contacts/:id` replaces the whole `crm` object.** Always spread the existing `crm` and change only the field you mean (the list + record code already does this).
- DB column is the British spelling **`organisation_id`**; `getOrgContext(req.user.userId)` returns **`.organizationId`** (American) in JS. The contacts route is mounted `app.use('/api/contacts', authenticateToken, contactsRoutes)`.
- **Stage value `new` displays as "Suspect."**
- **Company archive = soft-delete safety net.** A company's `crm.archived` flag hides it from staff; managers/admins can view archived (`GET /api/contacts?type=company&archived=only`), restore, or hard-delete (`DELETE /api/contacts/:id`). Used by the company record's **Delete** button and the Companies list's **Archived** view.
- **The Sales "Calendar" tab is `CRMCalendar`** (rendered with `defaultSources={{sales:true,projects:false,schedule:false}}`). CRM events created from a company (notes-to-calendar, reminders, next-action booking) POST to `/api/crm-events` and show here; the calendar now matches events to a day by **local** date.
- Known real-but-imperfect bits (NOT yet fixed): there's **no one-click native-quote→order** (orders pull from IDYQ only); "Schedule work" from a quote uses a crude `prompt()` for user-ID + date.

## Source of truth
- **The roadmap** — `docs/WorkTrackr_CRM_Ordering_Commission_Roadmap_v4.2.md`. Read **§15 (current state / START HERE)** and **§17 (UI + build log)**. §17.6's build log catalogues, screen by screen, the *real* features + *real* endpoints each screen uses.
- ⚠️ **Stale — do NOT trust:** `docs/ROADMAP.md`, `docs/APP-STATE.md`, `docs/database_schema.md` (old April snapshots). The Manus design assets in `docs/design/` are reference only.

---

## Built this session (after the Manus integration)
All frontend unless marked. Each shipped as changed-files only, each bumped the build stamp.

**Redesign finish-off**
- **Manus rounds 1 & 2 integrated + verified** (build clean; all data calls/endpoints/role-gating/handlers identical to the originals; correct dark variants wired). Took only Manus's frontend; kept the owner's backend + `docs/`.
- **All leftover light screens darkened** using Manus's exact token map (OrderForm, ContractForm, WorkflowBuilder, AI quote screens, CSV import, calendars, billing/Xero, plan/quote managers, and the deprecated **Leads/Contracts** list family — those two are darkened but **unreachable** from nav since their tabs were removed).

**Sidebar + chrome**
- Scrollbars widened (6→12px). Sidebar colour fixed from near-black to the navy `#1a1a2e` / borders `#2e2e4a`.
- **3-state collapsible sidebar built** (it never existed): desktop **rail (64px, default) / expanded (240px) / hidden (0, with a floating restore button)**, remembered via `localStorage` `wt_sidebar_mode`; mobile keeps the drawer.

**Company record (`CompanyProfile.jsx`)**
- Notes timeline shows a **precise date+time stamp** ("Today 14:32" / "27 Jun 2026 14:32", full datetime on hover).
- **Note → calendar** (optional, with a **time** field) and **Add calendar reminder** / **Set next action booking** — all calendar entries are now **timed** (date + time, 1-hour window), not fixed all-day 9am.
- **Delete company → archive** (soft-delete safety net) button in the hero; returns to the list.
- **File attachments** — a **visible** drag-and-drop / click-to-browse zone with an optional note per file, plus download + delete. **Stores files durably (see backend below).** Replaced the old invisible email-text drop.

**Companies list (`CompanyPipelineList.jsx`)**
- **Remembers list vs pipeline view** between visits (`localStorage` `wt_companies_view`).
- Per-company **Delete** (archive) in the card "⋯" menu; managers/admins get an **Archived** view with **Restore** + **Delete permanently**.

**Calendar (`CRMCalendar.jsx`)**
- Fixed entries not showing: events now match a calendar day by **local** date (was UTC), and note-to-calendar surfaces errors instead of swallowing them.

**Version stamp**
- Moved the "Build …" stamp **out of the page content and into the persistent sidebar footer** (expanded only, dimmed) — it was flashing during menu navigation because it sat at the bottom of content that briefly empties on view-switch.

**⚙️ FIRST BACKEND CHANGE — company file attachments (durable storage)**
The app had **no durable file storage** (every existing upload went to ephemeral `/tmp`; the `attachments` table only held an unused URL). To make company files actually stick, files are stored **in Postgres** (no external service needed; survives Render deploys), capped at **10 MB** each.
- `web/migrations/100_create_contact_attachments.sql` (**NEW**) — `contact_attachments` table (bytea `data`, contact FK, org-scoped, filename/mime/size/note/uploader/created_at). Auto-creates on deploy.
- `web/routes/contact-attachments.js` (**NEW**) — multer memoryStorage; list (metadata) / upload / download (streams bytea) / delete; all org-scoped, verifies contact ownership. Mounted at `/api/contacts`.
- `web/server.js` (**EDITED**, +2 lines) — `require` + `app.use('/api/contacts', authenticateToken, contactAttachmentsRoutes)`.
- Future option (flagged to owner, not urgent): if lots of large files get uploaded, move to external object storage (S3 / R2 / Cloudinary) instead of Postgres bytea.

---

## Open / pending (not blocking)
- **`cleanup-design-reference.ps1`** — strips the ~124 MB of Manus reference images in `docs/design/`. (Note: the script is in **`docs/`**, not the repo root as older docs said.) Run when ready; unconfirmed whether the owner has run it. Manus no longer needs the images, so it's safe.
- The two sales-flow gaps above (native-quote→order; prompt-based "schedule work") remain open if the owner wants them improved.
- Deprecated **Leads/Contracts** list views are darkened but unreachable (tabs removed) — leave unless the owner wants them gone for good.

## How to test the recent backend feature after deploy
Open a company → drag a PDF onto the attachments box (or click to browse) → **hard-refresh** → confirm it's still listed and downloads. The new table is created automatically on the first boot after the push.
