# WorkTrackr — Handover (read me first)

**Last updated: end of the post-Manus integration + feature session.**
**Current deployed build stamp: `2026-06-27.version-stamp-quiet`** (shown faintly in the sidebar footer when the sidebar is expanded — use it to confirm a deploy went live).

This file is the quick orientation for anyone (or any AI assistant) picking up WorkTrackr. The full detail is in the roadmap; this is the map.

---

## 🚦 WHERE THINGS STAND NOW — READ THIS FIRST
The big visual redesign is **DONE and live**. **Manus AI's dark "Relationship Hub" redesign (two rounds) has been integrated and verified, and every remaining light screen has been darkened** — the whole app is now dark, full-width, end-to-end. We are **no longer reskinning**; the work now is **feature-building, fixing flows, and polish**, one focused change per turn.

**What this means for a fresh chat:**
- The old "page-by-page dark reskin" plan and the "don't flip the whole app dark / wait for Manus" instructions in earlier versions of these docs are **superseded and no longer apply.** `App.css` is now globally dark.
- The redesigned frontend is **Manus's** (we verified Manus's round-2 full-repo return left the **backend byte-for-byte identical** and took only the frontend + kept the owner's `docs/`).
- Backend was **untouched** the entire redesign — until this session's **one** backend change (company file attachments, see below). Backend changes are now allowed but should stay **rare, minimal, and explicitly flagged** to the owner.

---

## What WorkTrackr is
A CRM / ordering / commission app.
- **Backend:** Node/Express (CommonJS) + PostgreSQL (`pg`). Routes in `web/routes/`, mounted in `web/server.js`.
- **Frontend:** React + Vite, at `web/client/src/app/src/`. Vite alias `@` → that folder. Entry `web/client/src/main.jsx` → `AppEntrypoint` → `DashboardWithLayout` → `AppLayout` + `Sidebar` + `Dashboard` (Dashboard switches the visible "view").
- **Build:** `npm run build` inside `web/client` — a clean build is **"1846 modules transformed, zero errors."** Always build before handing over frontend.
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
