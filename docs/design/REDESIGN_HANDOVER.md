# WorkTrackr — UI Redesign Handover & Design Reference (v1.0)

**Status as of 26 Jun 2026:** Design COMPLETE (produced by Manus AI). **Build NOT started.**
This file exists so any future session or person can take over cold. It pairs with the
roadmap (`WorkTrackr_CRM_Ordering_Commission_Roadmap_v3.0.md`), which stays the single
source of truth for app logic and current code state. Read the roadmap's §15 START HERE
and §17 (UI redesign) first, then this file for the design detail.

---

## 1. The short version

We are doing a complete visual redesign of the whole WorkTrackr app. The look was
designed by **Manus AI** and signed off by the owner. Claude builds to **this** spec
exactly — not to Claude's own preview styling. Nothing has been coded yet; this is a
design package + plan.

---

## 2. Decisions locked in this redesign

- **Direction:** Concept 3 "Relationship Hub" — full-width, immersive, relationship-first.
- **Theme:** fully **dark** throughout (previously: dark sidebar + light/white pages).
- **The company is the hub of everything:**
  - The **Leads** tab is **removed** — lead info (stage, owner, next action, chase date)
    now lives inside the company record.
  - The **Contracts** tab is **removed** — services & contracts are shown on the company
    record as a full-width band.
- **Sidebar (the "full-width" decision):** a **slim icon rail by default**, expands to
  full labels on hover/toggle, and can be **fully hidden** for a 100% full-width view.
  On mobile it becomes a bottom tab bar + a slide-up drawer.
- **Stage rename:** "New" → **Suspect**. Stage ladder: **Suspect → Prospect → Hot prospect → Customer**.
- **Source options:** Telesales, Door knocking, E-shot, Social media, Website, Referral.
- **Currency: £ only.** Every figure is per-org config, **zero by default** — no hardcoded money.
- **Role-aware nav:** engineers see the **Delivery** group only — no Sales, no Finance,
  no profit figures anywhere.
- **Add company** opens a **full-page** form (not a pop-up).

---

## 3. Design tokens (transcribed from `DESIGN_SYSTEM.pdf` so they live in plain text)

### Colours
| Token | Hex | Usage |
|---|---|---|
| bg-base | `#1a1a2e` | Page background, sidebar, all surfaces |
| bg-card | `#242438` | Raised card panels |
| bg-card-hover | `#2a2a48` | Card hover state |
| border | `#2e2e4a` | Card borders, dividers |
| accent | `#f59e0b` | Primary amber/gold — buttons, avatars, active nav, hero bar |
| accent-dark | `#d97706` | Amber pressed/hover state |
| accent-glow | `rgba(245,158,11,0.25)` | Radial glow, focus rings |
| text-primary | `#ffffff` | Headings, primary labels |
| text-secondary | `#94a3b8` | Subtext, metadata |
| text-muted | `#6b7280` | Placeholders, disabled |
| green | `#10b981` | Active / positive / won / "Primary" contact tag |
| red | `#ef4444` | Overdue / lost / error |
| grey | `#6b7280` | Suspect / neutral status pill |
| blue | `#3b82f6` | Prospect status pill |

### Typography — font family **Inter** (Google Fonts)
| Style | Size | Weight | Line height | Usage |
|---|---|---|---|---|
| Display | 48 | 700 | 56 | Hero company name |
| H1 | 32 | 700 | 40 | Page titles |
| H2 | 24 | 600 | 32 | Section headers |
| H3 | 18 | 600 | 28 | Card titles |
| Body | 14 | 400 | 20 | General content |
| Caption | 12 | 400 | 16 | Metadata, timestamps |
| Label | 11 | 500 | 16 | Nav labels, tags (UPPERCASE) |

### Spacing scale (base unit 4px)
`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`

### Corner radii
`sm 4px` (badges/pills) · `md 8px` (buttons/inputs/small cards) · `lg 12px` (cards/panels) · `xl 16px` (modals/drawers)

### Status pill colours
Suspect `#6b7280` · Prospect `#3b82f6` · Hot prospect `#f59e0b` · Customer `#10b981` — all radius-sm, 11px label, white text.

### Sidebar widths
Slim rail (default) `56px` · Expanded `220px` · Hidden `0px` · transition `width 200ms ease-in-out`.

### Signature hero flourish
Bilateral amber "wriggly" light filaments sweeping in from **all four corners** (the
approved refinement — not the single diagonal sweep). Layers: radial amber glow
`radial-gradient(ellipse 60% 80% at 30% 50%, rgba(245,158,11,0.18) 0%, transparent 70%)`
+ the filament asset (blur ~0.5px, opacity ~0.7) + gold hairline `border-bottom: 1px solid rgba(245,158,11,0.4)`
+ outer glow `box-shadow: 0 4px 32px rgba(245,158,11,0.12)`. Asset files in
`assets/flourish/` (`wriggly_flourish.png` + `wriggly_flourish.svg`). Note: the PNG is a
verified transparent image (~76% transparent) and is a single diagonal streak + central
orb; for the bilateral framing, mirror/crop the glowing ends at build time, or use the
Manus v2 bilateral export if supplied.

### Ready-to-use CSS variables (for when we build)
```css
:root {
  --color-bg-base: #1a1a2e;
  --color-bg-card: #242438;
  --color-bg-card-hover: #2a2a48;
  --color-border: #2e2e4a;
  --color-accent: #f59e0b;
  --color-accent-dark: #d97706;
  --color-accent-glow: rgba(245,158,11,0.25);
  --color-text-primary: #ffffff;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #6b7280;
  --color-green: #10b981;
  --color-red: #ef4444;
  --color-grey: #6b7280;
  --color-blue: #3b82f6;
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px;
  --font-sans: "Inter", system-ui, sans-serif;
}
```

---

## 4. Screen inventory (Manus Phase 1 + Phase 2 = 51 assets)

- **Foundation:** design system, sidebar (slim / expanded / hidden), flourish SVG,
  company record desktop + mobile (v2 with bilateral flourish).
- **Workspace:** My Tasks · Approvals · My Pay · My Notes (desktop + mobile).
- **Delivery:** Tickets list + detail · Projects list + detail · Calendar (desktop + mobile).
- **Sales:** Companies pipeline · Quotes · Orders list + detail · Add company form (desktop + mobile). *(Company record already in Foundation.)*
- **Finance:** Invoices list + detail (desktop + mobile).
- **Settings (mgr/admin):** Users · Commission rules · Engineer wages · CRM settings · Catalogue · Pricing · Billing · Security · Email Intake (composite desktop sheets + mobile).
- **Account:** Login · Subscription paywall (desktop + mobile).

---

## 5. Company record layout (the flagship page)

- **Hero top bar** (dark, amber radial glow + bilateral wriggly flourish, gold hairline):
  company icon, company name, Status pill, Source, Account manager, and buttons
  **Edit · More · Add activity**.
- **Body — three columns:**
  1. **People** — contact cards (initials avatar, name, role, green "Primary" tag, phone, email) + Add person.
  2. **History & notes** — notepad ("Log a call, note or meeting…") + **Save note** + **Add calendar reminder** + a vertical activity timeline.
  3. **Overview** — stat tiles **Monthly profit · Active services · Open tasks** + a Tasks list.
- **Full-width band underneath:** **Services & contracts** (every service/product + monthly value).
- **Mobile:** columns stack in the order **People → History → Overview → Services**.

---

## 6. Asset map — where the image files go in the repo

See `assets/README.md` for the full file checklist. Top level:
```
docs/design/
  REDESIGN_HANDOVER.md      (this file)
  DESIGN_SYSTEM.pdf         (the Manus spec)
  assets/
    README.md               (file checklist + naming convention)
    flourish/               wriggly_flourish.png, wriggly_flourish.svg
    foundation/             design system, sidebar states, company record desktop+mobile
    workspace/  delivery/  sales/  finance/  settings/  account/
```
When we build, the live flourish asset gets **copied** into the app
(`web/client/src/app/src/assets/`) — the `docs/design/` copy stays as the reference.

---

## 7. Build order (only once the owner gives the go-ahead — ONE batch per turn)

1. **Foundation:** design tokens (CSS variables) + Inter font + flourish asset into the
   app + the new dark theme shell + the sidebar (slim / expanded / hidden + mobile).
2. **Company record** (desktop + mobile) — the hub. Fold in lead fields + services band.
3. **Sales:** Companies pipeline list · Add company (full page) · Quotes · Orders.
   Remove the Leads tab; remove the Contracts tab (now on the record).
4. **Workspace · Delivery · Finance · Settings · Account** screens.

Each batch: validate every file (`node --check`, `esbuild --jsx=automatic`, real
Postgres-grammar parse for SQL), check lucide icon names, hand over with a plain
`filename → folder` list + a separate DELETE list, explain in plain app-flow terms.

---

## 8. Open CODE items carried over (from the v2.9 verification session — re-confirm before acting)

- **v2.8 billing batch is present in the repo but NOT deployed/confirmed live.** Before
  deploy: set `ADMIN_API_KEY` in Render; deploy via "Deploy latest commit" (the
  `phase10` migration runs on boot); confirm the Stripe webhook endpoint (real ones are
  `/webhooks/stripe` and `/api/auth/stripe/webhook` — `/api/webhooks` does NOT exist).
- **Two same-class bugs queued (small batch):** `email-intake.js` settings always 401
  (reads `req.orgContext.organisationId` — wrong spelling — AND has no `authenticateToken`
  on its mount); `quotes-from-ticket.js` runs with no org (reads the org id off
  `req.user`/the JWT, which only carries `{userId,email}`). Correct key is
  `req.orgContext.organizationId`.
- **`stripeSeats.js`** queries `memberships.status` and uses `m.organization_id` (American
  spelling, unlike the rest of the code) — fails soft (returns 0). The roadmap's earlier
  "nothing queries `memberships.status`" note was inaccurate.
- **AppVersion freshness test still un-run** (footer still `2025-11-08.FIXED`). Bump the
  string, deploy, confirm the footer changes before trusting any deploy lands.
- **Committed `web/client/dist` is incomplete** (its `index.html` points at main JS/CSS
  files that aren't present). Untrack with `git rm -r --cached web/client/dist` once
  Render builds are confirmed reliable.

---

## 9. How we work (cadence — unchanged)

Design/discuss before building · ONE batch per turn · work from a clean extraction of the
repo zip · validate every file · hand over downloadable files with a plain
`filename → folder` list flagging replacements + a separate DELETE list · explain in
plain app-flow terms (owner is non-technical) · **no hardcoded money** · bump the roadmap
version + filename by 0.1 on every change and keep §15 current.
