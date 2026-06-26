# WorkTrackr — full frontend visual redesign (Concept 3 "Relationship Hub", dark, glowing hero on every page)

You are redesigning the **visual layer** of an existing, working web app called **WorkTrackr**. I am giving you the full repository as a zip. When you're done, either hand the zip back to me or push straight to the connected GitHub repo (I'll tell you which). **The app must still build and every existing feature must still work** — this is a reskin, not a rebuild.

Read this whole brief before you start. The last section (HARD RULES) is the most important — a previous redesign pass looked good but quietly deleted features and invented data that the backend doesn't have. Do not repeat that.

---

## 1. What the app is

WorkTrackr is a CRM + field-service + ordering/commission tool for a small business. The main areas are:

- **Workspace** — My Tasks, Approvals, My Pay, My Notes
- **Delivery** — Tickets, Projects, Calendar
- **Sales** — Companies (pipeline), Quotes, Orders, Leads, Contracts
- **Finance** — Invoices
- **Settings** — Users, Commission rules, Engineer wages, CRM settings, Catalogue, Pricing, Billing, Security, Email Intake
- **Account** — Login, Subscription/paywall

The primary user is **not technical**, so the UI must stay clear and usable — the wow factor must not come at the cost of readability.

## 2. Tech stack and where the code is

- **Frontend:** React + Vite, in `web/client/src/app/src/`. Components in `web/client/src/app/src/components/`. Routing in `web/client/src/app/src/App.jsx`.
- **Styling:** Tailwind CSS **v4** (uses arbitrary values like `bg-[#242438]`). Icons: **lucide-react** (`lucide-react@0.510.0` — only use icon names that exist in that version).
- **Design tokens already exist** in `web/client/src/app/src/App.css` as CSS variables, prefixed `--wt-*`. Use these, don't invent a new palette:
  - `--wt-bg-base: #1a1a2e` (page background, full-bleed dark)
  - `--wt-bg-card: #242438` (cards/panels)
  - `--wt-bg-card-hover: #2a2a48`
  - `--wt-border: #2e2e4a`
  - `--wt-accent: #f59e0b` (amber) · `--wt-accent-dark: #d97706`
  - `--wt-text-primary: #ffffff` · `--wt-text-secondary: #94a3b8` · `--wt-text-muted: #6b7280`
  - status colours: green `#10b981`, red `#ef4444`, blue `#3b82f6`
  - `--wt-radius-lg: 12px`
- **Backend:** Node/Express + PostgreSQL. Auth is **cookie-based** — every fetch already uses `credentials: 'include'`. Do not change how auth or data loading works.
- **Build check:** `npm run build` (from the client app) must pass with no errors and no broken imports before you hand back.

## 3. The design to apply

Use **Concept 3 — "Relationship Hub"**, the fully dark theme. The full spec and per-screen mockups are already in the repo under **`docs/design/`**:

- `docs/design/DESIGN_SYSTEM.md` — the token + component spec
- `docs/design/REDESIGN_HANDOVER.md` — the design intent
- `docs/design/BATCH_KEY.md` — which mockup folder maps to which screens
- `docs/design/batch_a` … `batch_f` — desktop + mobile PNGs for every screen
- `docs/design/assets/` — foundation pieces (design system, sidebar states, the company record, the "flourish" light-streak graphic)

The single most important reference is the **"Concept 3 — Relationship Hub — Detailed Component Breakdown"** layout (the company-record hero with the glowing amber header). That glowing header is the look I want **on the top bar of every page**.

### 3a. THE HERO HEADER — put this on every page (top priority)

Every page must open with the glowing hero header bar shown in that breakdown. A working reference implementation already exists in the repo: **`web/client/src/app/src/components/PageHero.jsx`** (used today only on the company record and add-company pages). **Promote it into a shared header used by every page**, and make the glow match the mockup. Spec:

- Full-width dark panel, rounded ~14px, on the `#1a1a2e` base.
- **Deep inner amber glow:** a strong radial glow (peak ~`rgba(245,158,11,0.40)`) concentrated on the left behind the icon, a softer second glow on the right, over a subtle vertical base — it should read as a warm amber glow, not a faint tint.
- **Lit amber outline that looks like it's shining:** a ~1px amber border (`rgba(245,158,11,0.45)`), an outer warm bloom shadow, a **bright highlight along the top edge** (inset), and an inner glow (inset). The current `PageHero.jsx` already does this — match or slightly exceed it.
- **Flourish:** the wriggly light-streak graphic sweeping in from each top corner (mirrored). Asset is at `web/client/src/app/src/assets/wriggly_flourish.webp` (and `.svg`). Keep it bright (~0.7 opacity).
- **Left side:** an icon or avatar in an amber-outlined rounded square (or an amber initials circle for a company), then the page/record **title**, then a **status pill** where relevant.
- **Meta row:** small labelled fields where relevant (on the company record: Status, Source, Account Manager — each with a small icon).
- **Right side:** the page's action buttons — amber-outline "ghost" buttons for secondary actions and one solid amber primary button (dark text on amber for contrast).

**This is intentional and overrides your own flat list-header mockups.** Your batch mockups draw plain headers on the list/table pages (Companies, Tasks, Projects, Calendar, etc.); I want the glowing hero header on **all** of them instead — list pages, detail pages, settings pages, everything. Adapt the hero's content per page (title, a fitting icon, any relevant meta, and that page's real action buttons), but the glowing treatment is constant.

### 3b. Everything else goes fully dark

Apply the Concept-3 dark theme to the whole app to match the mockups: `#1a1a2e` page background edge-to-edge, `#242438` cards with `#2e2e4a` borders, white primary text, `#94a3b8` secondary text, amber accents and amber primary buttons (always with dark `#1a1a2e` text on amber for contrast). Darken every table, modal, dropdown, form control, and the sidebar. No light/white panels should remain anywhere.

## 4. Pages to cover (every one gets the hero header + dark theme)

- **Workspace:** My Tasks, Approvals, My Pay (+ Bonus / Engineer wage views), My Notes
- **Delivery:** Tickets (list + detail + the create/assign/detail modals), Projects (list + detail), Calendar
- **Sales:** Companies pipeline, Company record, Add company, Quotes, Orders, Leads, Contracts
- **Finance:** Invoices (list + detail)
- **Settings:** Users, Commission rules, Engineer wages, CRM settings, Catalogue, Pricing, Billing, Security, Email Intake
- **Account:** Login, Subscription/paywall
- **Chrome:** the left sidebar (with its collapsed/expanded states) and full mobile responsiveness

## 5. HARD RULES — do not break these

1. **Change presentation only.** Markup and styling can change. Do **not** change data fetching, API calls, request/response handling, state logic, form submission, or routing behaviour. Keep every `fetch(...)` URL, HTTP method, request body shape, and field name exactly as-is, and keep `credentials: 'include'`.
2. **Preserve every feature.** Every button, link, tab, filter, search box, sort control, dropdown, modal, inline edit, bulk action, and form that exists today must still exist and still work after the reskin. If you restyle a screen, re-verify each of its actions still fires the same endpoint. Do not drop anything to make a screen look cleaner.
3. **Never hardcode money.** Every figure (£) must come from the API or config exactly as it does now. Do not type in example amounts. (£ is the only currency.)
4. **Respect role gating.** Some users are engineers and must **never** see commission, profit, or pay-rate data. Keep all existing role checks; do not expose gated data by moving it into a prettier component.
5. **Do not invent data the backend doesn't have.** The mockups contain illustrative numbers and sections that the real database does not provide. Render the real fields only; if a mockup shows a field that doesn't exist, omit it rather than fake it (see §6 for the specific traps).
6. **Keep it building.** React + Vite + Tailwind v4 + lucide-react@0.510. Only use lucide icon names that exist in that version. `npm run build` must pass.

## 6. Where the mockups diverge from the real data (read carefully)

These are the exact places the previous pass went wrong. Style to the look, but use only the real data/behaviour described:

- **Projects list:** the data has **no "progress %"** field and only a **single** assignee per project (`assignedToName`), not a stack of people. Do **not** render progress bars or multi-avatar stacks. Show the real status, the single assignee, and the scheduled date.
- **Project detail:** the real screen is a **field-service job** — it has Overview, **time entries** (add/delete), **parts/materials** (add/delete), a status workflow, **convert-to-invoice**, edit, and delete. It is **not** the Tasks/Team/Milestones/Files project-management view your mockup draws. Keep the real field-service features; do not replace them with tasks/team/milestones/files.
- **My Pay:** there is **no** payslip-PDF / year-to-date / next-payment backend. Keep the real commission/wage views and the role gating. Don't add payslip download, YTD, or scheduled-payment widgets that have nothing behind them.
- **Approvals:** the real screen is an **order approval workflow** (submitted → approved → ordered → invoiced → paid), **not** expense/leave/quote approvals. Keep the real order actions.
- **My Notes:** the real screen has **reminders, "create ticket from note", "add note to ticket", and voice dictation**, and notes are **plain** (no categories, no rich-text editor). Keep all of those features; don't build a two-pane categorised rich-text notes app.
- **My Tasks:** a task's status is **open or done only**. Derive "Done / Overdue / To-do" from that — there is no real "in progress" state, so don't add one.
- **Companies:** a company is a `contacts` row with `type='company'`, and its CRM fields live in a single JSON object. Updating a company **replaces that whole object**, so any save must include all existing fields, not just the changed one. The status value `new` displays as **"Suspect"**.

If you're ever about to add a number, a chart, a percentage, a file list, or a section that you can't trace to a real API field, **don't** — leave it out and it can be added later as a backend change.

## 7. Reuse what's there

- Start from `web/client/src/app/src/components/PageHero.jsx` for the hero (it already has the glow CSS, the flourish, the icon/title/status/meta/actions structure, and ready-made hero buttons). Make it the shared page header.
- Use the `--wt-*` tokens in `App.css`. If you add new shared styles, add them there.
- Many screens currently render inside `Dashboard.jsx` via a view switch and use a "full-bleed" flag to go edge-to-edge dark — keep that working (or improve it) so dark screens fill the width with no leftover light padding.

## 8. Deliverable

- Apply the redesign across the whole app per the above.
- Make sure `npm run build` passes cleanly.
- Then **either** hand back the updated zip **or** push to the connected GitHub repo (I will confirm which I want).
- Include a short list of which files you changed, and call out anything you intentionally left out (e.g. a mockup element you couldn't back with real data, per §6).

## 9. Acceptance checklist (please self-check before handing back)

- [ ] Every page opens with the glowing amber hero header (deep inner glow + lit shining outline + flourish), including list/table/settings pages.
- [ ] The whole app is dark (no white/light panels, tables, modals, dropdowns, or sidebar remain).
- [ ] Every pre-existing button, filter, search, sort, tab, modal, inline edit, and form still works and still hits the same endpoint.
- [ ] No hardcoded money; all £ figures still come from the API.
- [ ] Engineer role still can't see commission/profit/pay-rate data.
- [ ] No invented data: no fake progress bars, payslips, milestones, team lists, or categories (per §6).
- [ ] Amber primary buttons use dark text for contrast.
- [ ] `npm run build` passes; no broken imports; only real lucide-react@0.510 icon names used.

Thank you — make it look incredible, but keep every working part working.
