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
- **The roadmap** — `docs/WorkTrackr_CRM_Ordering_Commission_Roadmap_v4.0.md` (always read the highest version). Start with **§15 (status banner)** and **§17 (UI redesign + build log)**.
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

## Next task
**Tickets — the last Delivery piece, and the biggest/most critical screen in the app. Give it a whole turn.** The Tickets *list* is **woven into `Dashboard.jsx`** (inline stat cards + tab pills + the table container, ~lines 238–395) on top of `TicketsTableView.jsx` (254). The *detail* is `TicketDetailViewTabbed.jsx` (~1,900 lines). Supporting modals: `CreateTicketModal.jsx` (605), `TicketDetailModal.jsx` (194), `AssignTicketsModal.jsx`, `TicketFieldCustomizer.jsx`, `TicketCard.jsx` (104). Approach: (1) inventory every flow and verify endpoints first; (2) reskin in place via the **scripted colour-token swap** (the same method used for `JobDetail` + `CRMCalendar` — keeps logic byte-for-byte); (3) the inline Dashboard tickets block needs its light classes swapped too, plus full-bleed added for `tickets`; (4) **do not** combine with anything else. After Tickets, Delivery is done. Then **Finance** (batch_d: Invoices), **Settings** (batch_e), **Account** (batch_f), plus the **sidebar 3-state + mobile**. **Keep Manus's design — don't redesign.** Per the standing rules: inventory first, verify flows, reskin-in-place (logic verbatim), validate, hand over with filename→folder + DELETE list, bump roadmap +0.1.

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
