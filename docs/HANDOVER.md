# WorkTrackr — Handover (read me first)

**Last updated: end of the v4.2 session — the frontend redesign has been handed to Manus AI.**

This file is the quick orientation for anyone (or any AI assistant) picking up work on WorkTrackr. The full detail lives in the roadmap; this is the map.

---

## 🚦 DIRECTION CHANGE (v4.2) — READ THIS FIRST
The owner has handed the **entire frontend visual redesign to Manus AI**. The page-by-page dark reskin done here (v3.1–v4.1) is **superseded** — Manus will redo the visual layer across the whole app in one pass, with the glowing Concept-3 hero header on the **top bar of every page**.

- **The brief given to Manus is `docs/MANUS_FRONTEND_REDESIGN_PROMPT.md`.** The owner gives Manus the repo zip; Manus returns the redesigned frontend as a zip **or** pushes to GitHub.
- **Your job when the redesign comes back = integrate + verify it all still works**, NOT more reskinning:
  1. Get the code (returned zip, or pull Manus's GitHub branch); work from a clean copy.
  2. **`npm run build` must pass clean** — no broken imports, only real `lucide-react@0.510` icons.
  3. **Every feature + flow preserved** — use the parity-inventory + flow-verification rules below and the roadmap **§17 build log** (it lists each screen's real features + real endpoints). Confirm each button/filter/search/sort/tab/modal/form still hits the **same endpoint, same field shape**, `credentials:'include'`.
  4. **Guardrails held:** no hardcoded money; role-gating intact (engineers never see commission/profit); **no invented data** (re-check the divergences in "Don't invent data" below).
  5. **Report to the owner in plain app-flow terms**; fix or flag anything broken.
  6. **THEN run `cleanup-design-reference.ps1`** (repo root) to delete the **~124 MB of Manus reference images** in `docs/design/`. It's scoped to `docs/design/` and never touches the live in-app asset `web/client/src/app/src/assets/wriggly_flourish.*`. **Run it only AFTER Manus is done** (Manus needs those images). Then commit the deletion so the repo shrinks.

**Don't invent data (the divergences to verify):** Projects cards have no progress % and a single assignee; Project detail is a **field-service job** (time entries + parts + convert-to-invoice), not tasks/team/milestones/files; My Pay has no payslip/YTD/next-payment backend; Approvals is the **order** workflow, not expense/leave/quote; My Notes is plain with reminders + ticket-integration + dictation (no categories/rich-text); My Tasks status is **open/done only**; **`PUT /api/contacts/:id` replaces the whole `crm` object**; stage `new` displays as **"Suspect"**.

---

## What WorkTrackr is
A CRM / ordering / commission app.
- **Backend:** Node/Express (CommonJS) + PostgreSQL (`pg`).
- **Frontend:** React + Vite, at `web/client/src/app/src/`.
- **Hosting:** Render (Starter). **Auto-deploys** when the owner pushes from **GitHub Desktop** at `C:\repos\worktrackr-app`. Live at **worktrackr.cloud**.

## Who you're working with
The **owner is non-technical**. Explain everything in **plain, app-flow language — no code jargon**. Describe what a change does for the user, not how the code works.

## Source of truth
- **The roadmap** — `docs/WorkTrackr_CRM_Ordering_Commission_Roadmap_v4.2.md` (always read the highest version). Start with **§15 (status banner — has the Manus-pivot START HERE block)** and **§17 (UI redesign + build log)**.
- **The Manus brief** — `docs/MANUS_FRONTEND_REDESIGN_PROMPT.md` (the redesign instructions handed to Manus).
- **The UI redesign** was designed by **Manus AI**. Design assets + token sheet are in **`docs/design/`** (`REDESIGN_HANDOVER.md`, `DESIGN_SYSTEM.md`, `BATCH_KEY.md`, and per-screen PNGs) — these PNGs are the ~124 MB the cleanup script removes once Manus is done.
- ⚠️ **Stale — do NOT trust:** `docs/ROADMAP.md`, `docs/APP-STATE.md`, `docs/database_schema.md` (April snapshots, superseded by the roadmap).

## How we work (follow exactly)
1. **One batch per turn**, and only after the owner says **"go"**. Discuss/confirm the plan before building.
2. Work from a **clean extraction of the latest repo zip**. **Verify against the real code** — don't assume from these docs.
3. **Validate every file** before handing it over: JSX compiles, a bundle check passes, lucide icon names exist, and any API endpoints/fields you rely on actually exist in the routes.
4. Hand over **downloadable files** with a clear **filename → folder** list (flag which ones replace existing), plus a separate **DELETE** list.
5. **Bump the roadmap by +0.1** for every change and keep §15 + §17 current.
6. **No hardcoded money** — everything is £ and comes from real data.
7. **Dark redesign is page-by-page.** Do **not** flip the whole app dark at once — it would break the screens not yet rebuilt. A `fullBleed` flag (Dashboard → AppLayout) makes a dark page go edge-to-edge; extend its condition as more dark pages land.
8. **Build to Manus's design exactly — do NOT redesign.**
9. **Never lose existing functionality.** Before rebuilding a screen, read the OLD version and write a **feature inventory** (every button, menu, filter, field + the action behind each); the new screen must re-tick the whole list before hand-over, and the list goes in the build log. (A prior session dropped features — this is the guard against it.)
10. **Go faster by GROUP, not by cramming.** Work a whole shared-frame group per turn (e.g. all of Sales together) rather than one screen — that also flips shared chrome once with no half-dark states. Re-skin in place where a screen only needs colours (you can't lose a feature you didn't remove). Do **not** attempt the whole app in one turn; the per-group parity check is exactly what gets sacrificed.
11. **Every feature must WORK, not just appear.** The redesign is also a chance to catch broken flows — some existing flows are known to be broken. For every screen touched: confirm each button/action hits a real, mounted endpoint with matching field names and response shape (check `web/server.js` mounts + the route file). If a flow looks broken, FIX it or flag it explicitly in the hand-over and build log — never leave a dead/broken control in place silently. When reskinning, preserve the working request/response logic verbatim and change only styling, so a colour change can't break behaviour.

## The redesign in one line
Whole app moving to a **dark, full-width "Relationship Hub"** look. The **company is the centre of everything**: Leads folded into the company; contracts/services shown on the company record.

## Built & deployed so far (v3.1 → v3.5)
- **v3.1** — Foundation: dark tokens (`--wt-*` in `App.css`), Inter font, optimized flourish asset, reusable **`PageHero`** (dark gradient hero box + bilateral flourish).
- **v3.2** — **Company record** rebuilt dark/full-width (PageHero + People / History & notes / Overview columns + Services & contracts band; notepad "Save note"; "Add calendar reminder"; editable Source; "New" relabelled **Suspect**, value still `new`).
- **v3.3** — **Add company** full-page form (fixed the previously dead button; Dashboard wires it).
- **v3.4** — Dark pages now **full-screen** (no light gutter); **Leads + Contracts tabs removed** (Sales tabs = Companies · Quotes · Orders · Calendar).
- **v3.5** — Company record gaps filled: company **telephone / email / website** shown + editable in the People box; dated **Next action** (note + chase date, **overdue in red**) with a **Book in calendar** button (saves to `crm.nextAction`/`crm.chaseDate`; posts a `follow_up` to `/api/crm-events`).
- **v3.6** — **Sales group went dark together.** Companies list rebuilt to Manus's design (**Pipeline** kanban + **List** table with telephone/email/contact/next-action+chase-date/monthly value; List/Pipeline toggle, search, All-sources filter, working ⋯ menu, Add company, **CSV Import preserved**). Quotes + Orders **dark-reskinned in place** (data/actions/filters/columns identical — colours only). Shared frame (`SalesPageLayout`/`SalesTabs`) got an **opt-in `dark` flag** so the three flip once while **Leads + Contracts stay light**; Dashboard raises full-bleed for companies/quotes/orders. Built from a **parity inventory** of each old screen (zero feature loss).
- **v3.7** — **Workspace group started: My Tasks · Approvals · My Pay went dark.** My Tasks rebuilt to Manus's dark table (time tabs, status dropdown that keeps the Completed view, derived Status column, assignee avatars, overdue group, all-caught-up empty state) with the add-task form + tick-to-complete preserved. Approvals (`OrderQueues`) reskinned to Manus's dark card style **over the real order workflow** (Approval/Purchasing/Fulfilment + comment + all actions kept; the expense/leave/quote mockup illustration was NOT invented). My Pay dark-reskinned over its **role-gated** commission (`BonusScreen`) + wage (`EngineerWage`) content; Manus's payslip/YTD/next-payment extras deferred (need backend). **My Notes deferred** (see Next task).
- **v3.8** — **My Notes went dark; Workspace group complete.** `PersonalNotes` dark-reskinned **in place with all logic byte-for-byte** (notes list, tabs, overdue banner, complete/pin, inline edit, delete, create-ticket-from-note, add-note-to-ticket, voice dictation all kept). `DictationButton` got an opt-in `dark` prop (CompanyNotes stays light). Also locked in the standing rule: **every feature must actually work** (flows verified against real endpoints; fix/flag broken ones).
- **v3.9** — **Delivery group started: Projects (list + detail) went dark.** `JobsList` rebuilt to Manus's dark **card grid** (real data — no faked progress/assignee-stacks); search, six-status filter (tabs + dropdown), sort, stat strip, create/open all kept. `JobDetail` **dark-reskinned in place** (logic byte-for-byte) — kept the real field-service features (time entries, parts, status workflow, convert-to-invoice, edit, delete) rather than Manus's Tasks/Team/Milestones/Files view. `JobDetailWithLayout` + Dashboard wired for full-bleed.
- **v4.0** — **Delivery Calendar went dark; Sales Calendar tab seam closed.** `CRMCalendar` dark-reskinned in place via scripted token swap (logic byte-for-byte; all 11 flows intact; 6 shadcn Selects given dark overrides). Dashboard wires full-bleed for the calendar views and makes the Sales **Calendar** tab bar dark — **the Sales group is now fully dark end-to-end.**

- **v4.1** — **Company hero glow turned up.** `PageHero` box styling upgraded to match Manus's render — a lit amber outline (rim + outer bloom + bright top edge + inner glow) and a deeper inner gradient. Affects the company record + add-company pages only. The glowing hero is still company-record-only (Manus's choice); extending it to list headers is an opt-in flair decision.

## Next task
**Wait for Manus's redesigned frontend, then INTEGRATE + VERIFY it (see the DIRECTION CHANGE banner at the top).** In short: get Manus's code → `npm run build` clean → verify every feature/flow still works against the same endpoints (use the §17 build log as the checklist of what each screen really does) → confirm the guardrails held (no hardcoded money, role-gating, no invented data) → report to the owner in plain terms and fix/flag anything broken → **then run `cleanup-design-reference.ps1`** to strip the ~124 MB of reference images from `docs/design/`.

Useful while verifying: the v3.6–v4.1 components this project produced (dark Sales, Workspace, Projects, Calendar, `PageHero`) are catalogued in §17 — even if Manus replaces them, they document the *real* features + endpoints each screen must still have. If Manus's output is missing a feature or invents data, that's the thing to flag.

**Reskin work is paused** — don't continue the page-by-page dark reskap; Manus owns the visual layer now. The remaining screens the old plan listed (Tickets, Finance, Settings, Account, sidebar 3-state + mobile) are Manus's to do. If the owner later wants to drop Manus and resume in-house, the old plan resumes from **Tickets** (list woven into `Dashboard.jsx` + `TicketsTableView` + `TicketDetailViewTabbed` + the ticket modals).

## (previous next task — superseded by the Manus handoff in v4.2)
Tickets, then Finance / Settings / Account / sidebar — was the page-by-page plan; now Manus's job.

## (previous next task — done in v4.0)
Delivery: Calendar — done (CRMCalendar dark in place; Sales Calendar tab now dark too).

## (previous next task — done in v3.9)
Delivery: Projects (list + detail) — done (list rebuilt to the card grid; detail reskinned in place).

## (previous next task — done in v3.8)
Finish Workspace by doing **My Notes** — done (dark reskin in place, all features kept).

## (previous next task — done in v3.6)
Built the **Companies LIST** to Manus's design as drawn:
- The **pipeline / kanban view** (Suspect / Prospect / Hot Prospect / Customer columns of cards — each card: company name, owner avatar+name, coloured source pill, activity time, ⋯ menu; with a **List/Pipeline toggle**, **Search**, **All-sources filter**, and **Add company**).
- **Plus a List view (table)** carrying **telephone, email, contact, next action + chase date (overdue red), monthly value**.
- **Keep Manus's design — do not redesign.** The Companies list shares `SalesPageLayout` / `SalesTabs` with Quotes/Orders, so plan the dark-chrome migration so that shared frame flips once.

## Deferred (not blocking the redesign)
- Deploy the **v2.8 billing** batch: set `ADMIN_API_KEY` first, then confirm the Stripe webhook.
- Fix two same-class org-id bugs (`web/routes/email-intake.js`, `web/routes/quotes-from-ticket.js`) and the `web/shared/stripeSeats.js` column.
- AppVersion footer **freshness check** (footer is hardcoded).
- **Untrack** `web/client/dist` once Render builds are confirmed.
- Remaining redesign screens: Quotes/Orders, Workspace, Delivery, Finance, Settings, Account; the **sidebar 3-state** (slim rail → expandable → hideable; mobile bottom bar); mobile layouts.
