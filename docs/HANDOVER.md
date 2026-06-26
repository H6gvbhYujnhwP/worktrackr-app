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
- **The roadmap** — `docs/WorkTrackr_CRM_Ordering_Commission_Roadmap_v3.5.md` (always read the highest version). Start with **§15 (status banner)** and **§17 (UI redesign + build log)**.
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

## The redesign in one line
Whole app moving to a **dark, full-width "Relationship Hub"** look. The **company is the centre of everything**: Leads folded into the company; contracts/services shown on the company record.

## Built & deployed so far (v3.1 → v3.5)
- **v3.1** — Foundation: dark tokens (`--wt-*` in `App.css`), Inter font, optimized flourish asset, reusable **`PageHero`** (dark gradient hero box + bilateral flourish).
- **v3.2** — **Company record** rebuilt dark/full-width (PageHero + People / History & notes / Overview columns + Services & contracts band; notepad "Save note"; "Add calendar reminder"; editable Source; "New" relabelled **Suspect**, value still `new`).
- **v3.3** — **Add company** full-page form (fixed the previously dead button; Dashboard wires it).
- **v3.4** — Dark pages now **full-screen** (no light gutter); **Leads + Contracts tabs removed** (Sales tabs = Companies · Quotes · Orders · Calendar).
- **v3.5** — Company record gaps filled: company **telephone / email / website** shown + editable in the People box; dated **Next action** (note + chase date, **overdue in red**) with a **Book in calendar** button (saves to `crm.nextAction`/`crm.chaseDate`; posts a `follow_up` to `/api/crm-events`).

## Next task
Build the **Companies LIST** to **Manus's design as drawn**:
- The **pipeline / kanban view** (Suspect / Prospect / Hot Prospect / Customer columns of cards — each card: company name, owner avatar+name, coloured source pill, activity time, ⋯ menu; with a **List/Pipeline toggle**, **Search**, **All-sources filter**, and **Add company**).
- **Plus a List view (table)** carrying **telephone, email, contact, next action + chase date (overdue red), monthly value**.
- **Keep Manus's design — do not redesign.** The Companies list shares `SalesPageLayout` / `SalesTabs` with Quotes/Orders, so plan the dark-chrome migration so that shared frame flips once.

## Deferred (not blocking the redesign)
- Deploy the **v2.8 billing** batch: set `ADMIN_API_KEY` first, then confirm the Stripe webhook.
- Fix two same-class org-id bugs (`web/routes/email-intake.js`, `web/routes/quotes-from-ticket.js`) and the `web/shared/stripeSeats.js` column.
- AppVersion footer **freshness check** (footer is hardcoded).
- **Untrack** `web/client/dist` once Render builds are confirmed.
- Remaining redesign screens: Quotes/Orders, Workspace, Delivery, Finance, Settings, Account; the **sidebar 3-state** (slim rail → expandable → hideable; mobile bottom bar); mobile layouts.
