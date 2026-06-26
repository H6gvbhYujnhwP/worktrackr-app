# WorkTrackr — Handover (read me first)

**Last updated: end of the v3.5 redesign session.**

This file is the quick orientation for anyone (or any AI assistant) picking up work on WorkTrackr. The full detail lives in the roadmap; this is the map.

---

## What WorkTrackr is
A CRM / ordering / commission app.
- **Backend:** Node/Express (CommonJS) + PostgreSQL (`pg`).
- **Frontend:** React + Vite, at `web/client/src/app/src/`.
- **Hosting:** Render (Starter). **Auto-deploys** when the owner pushes from **GitHub Desktop** at `C:\repos\worktrackr-app`. Live at **worktrackr.cloud**.

## Who you're working with
The **owner is non-technical**. Explain everything in **plain, app-flow language — no code jargon**. Describe what a change does for the user, not how the code works.

## Source of truth
- **The roadmap** — `docs/WorkTrackr_CRM_Ordering_Commission_Roadmap_v3.7.md` (always read the highest version). Start with **§15 (status banner)** and **§17 (UI redesign + build log)**.
- **The UI redesign** was designed by **Manus AI**. Design assets + token sheet are in **`docs/design/`** (`REDESIGN_HANDOVER.md`, `DESIGN_SYSTEM.md`, `BATCH_KEY.md`, and per-screen PNGs).
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

## Next task
**Finish the Workspace group: My Notes (`PersonalNotes.jsx`).** This one needs a **decision first**, because Manus's My Notes (two-pane editor with **categories, rich-text formatting, search**) clashes with the real screen, which instead has **due-date reminders + overdue banner, complete toggle, pin, create-ticket-from-note, add-note-to-ticket, and voice dictation** — none of Manus's category/rich-text features exist in the data model. Building it as drawn would **delete real features** (the exact thing we must not do). Options: (a) **reskin-in-place** — keep every existing feature, apply the dark theme, borrow Manus's two-pane look only where it doesn't cost features; or (b) add backend (note categories + rich-text storage) first, then build closer to the drawing. Recommend (a) now, (b) later. After My Notes: **Delivery** (batch_b: Tickets, Projects, Calendar — the Calendar dark pass also lets the Sales *Calendar* tab go dark), then **Finance** (batch_d), **Settings** (batch_e), **Account** (batch_f), plus the **sidebar 3-state + mobile**. **Keep Manus's design — don't redesign.** Inventory each old screen first, build, validate, hand over with a filename→folder + DELETE list, bump the roadmap +0.1.

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
