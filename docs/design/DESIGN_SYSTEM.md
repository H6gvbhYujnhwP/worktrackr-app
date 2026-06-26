# WorkTrackr — Design System Spec (Phase 1)

---

## Colour Tokens

| Token | Hex | Usage |
|---|---|---|
| `color-bg-base` | `#1a1a2e` | Page background, sidebar, all surfaces |
| `color-bg-card` | `#242438` | Raised card panels |
| `color-bg-card-hover` | `#2a2a48` | Card hover state |
| `color-border` | `#2e2e4a` | Card borders, dividers |
| `color-accent` | `#f59e0b` | Primary amber/gold — buttons, avatars, active nav, hero bar |
| `color-accent-dark` | `#d97706` | Amber pressed/hover state |
| `color-accent-glow` | `rgba(245,158,11,0.25)` | Radial glow, focus rings |
| `color-text-primary` | `#ffffff` | Headings, primary labels |
| `color-text-secondary` | `#94a3b8` | Subtext, metadata |
| `color-text-muted` | `#6b7280` | Placeholders, disabled |
| `color-green` | `#10b981` | Active, positive, won, Primary tag |
| `color-red` | `#ef4444` | Overdue, lost, error |
| `color-grey` | `#6b7280` | Suspect/neutral status pill |
| `color-blue` | `#3b82f6` | Prospect status pill |

---

## Signature Flourish — Amber Wriggly Glow

Applied to hero/header areas on the Company Record and key landing pages.

**Layers (bottom to top):**
1. **Radial glow** — `radial-gradient(ellipse 60% 80% at 30% 50%, rgba(245,158,11,0.18) 0%, transparent 70%)` — warm amber bloom from left-centre.
2. **Wriggly filaments** — thin (1–2px) amber/gold SVG paths with `filter: blur(0.5px)` and `opacity: 0.7`, sweeping in from top-left and bottom-right corners. Exported as `wriggly_flourish.png` (transparent PNG) and `wriggly_flourish.svg`.
3. **Gold hairline border** — `border-bottom: 1px solid rgba(245,158,11,0.4)`.
4. **Outer glow** — `box-shadow: 0 4px 32px rgba(245,158,11,0.12)`.

---

## Typography

**Font Family:** Inter (Google Fonts)

| Style | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| Display | 48px | 700 Bold | 56px | Hero company name |
| H1 | 32px | 700 Bold | 40px | Page titles |
| H2 | 24px | 600 Semibold | 32px | Section headers |
| H3 | 18px | 600 Semibold | 28px | Card titles |
| Body | 14px | 400 Regular | 20px | General content |
| Caption | 12px | 400 Regular | 16px | Metadata, timestamps |
| Label | 11px | 500 Medium | 16px | Nav labels, tags (uppercase) |

---

## Spacing Scale

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64px`

Base unit: **4px**

---

## Corner Radii

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 4px | Badges, pills |
| `radius-md` | 8px | Buttons, inputs, small cards |
| `radius-lg` | 12px | Cards, panels |
| `radius-xl` | 16px | Modals, drawers |

---

## Components

### Button — Primary (Solid Amber)
- Background: `#f59e0b` · Text: `#1a1a2e` (dark) · Weight: 600
- Padding: `10px 20px` · Radius: `radius-md`
- Hover: `#d97706` · Focus ring: `0 0 0 3px rgba(245,158,11,0.4)`

### Button — Secondary (Amber Outline)
- Background: transparent · Border: `1px solid #f59e0b` · Text: `#f59e0b`
- Padding: `10px 20px` · Radius: `radius-md`
- Hover: `background rgba(245,158,11,0.08)`

### Input Field
- Background: `#242438` · Border: `1px solid #2e2e4a` · Text: `#ffffff`
- Placeholder: `#6b7280` · Radius: `radius-md` · Padding: `10px 14px`
- Focus: `border-color #f59e0b` + amber focus ring

### Dropdown
- Same surface as input · Trailing chevron icon in `#6b7280`
- Open state: dark card panel, `radius-lg`, items `14px` body

### Card (Dark Raised Panel)
- Background: `#242438` · Border: `1px solid #2e2e4a`
- Radius: `radius-lg` · Padding: `16px` · Shadow: `0 2px 8px rgba(0,0,0,0.3)`

### Contact Card
- Card surface · Left: amber circle avatar (initials, `#f59e0b` bg, `#1a1a2e` text, 40px, `radius-xl`)
- Name: H3 white · Role: Caption muted · Phone + email: Caption with icons
- Optional: green `Primary` tag pill (`#10b981` bg, `radius-sm`, `11px` label)
- Three-dot overflow menu top-right

### Stat Tile
- Card surface · Label: Caption muted · Value: H1 amber · Optional delta: Caption green/red

### Table Row
- Background: transparent · Hover: `rgba(255,255,255,0.03)` · Border-bottom: `1px solid #2e2e4a`
- Padding: `12px 16px`

### Modal
- Overlay: `rgba(0,0,0,0.6)` · Panel: Card surface · Radius: `radius-xl` · Max-width: `560px`

### Toast
- Background: `#242438` · Left accent border: `4px solid` (green/red/amber by type)
- Radius: `radius-md` · Shadow: `0 4px 16px rgba(0,0,0,0.4)` · Auto-dismiss: 4s

### Status Pill
- Suspect: `#6b7280` bg · Prospect: `#3b82f6` bg · Hot Prospect: `#f59e0b` bg · Customer: `#10b981` bg
- All: `radius-sm`, `11px` label, white text

---

## Sidebar States (Desktop)

| State | Width | Content |
|---|---|---|
| Slim Rail (default) | 56px | Amber logo icon + icon-only nav items + avatar |
| Expanded | 220px | Logo text + icon + label nav items + user profile |
| Hidden | 0px | Hamburger button top-left only |

**Transition:** `width 200ms ease-in-out`

---

## Mobile Navigation

- **Bottom Tab Bar:** 5 items — Home, Tickets, Sales (active), Invoices, More
- **Drawer:** Slides up from bottom, 70% screen height, full nav list + user profile + app version

---

## Sales Stages (Status Dropdown)

`Suspect → Prospect → Hot Prospect → Customer`

## Source Options

`Telesales · Door Knocking · E-Shot · Social Media · Website · Referral`

---

## How the Sidebar and Company Record Tie the Screens Together

The **slim icon rail** is the default state across all screens, giving the main content area maximum breathing room. The amber logo icon at the top is the only persistent brand element in the slim state.

On the **Company Record**, the amber hero bar with the wriggly filament flourish is the visual centrepiece — it signals that the company is the hub of the entire CRM. The same amber glow language is reused as the active state indicator in the sidebar, creating a direct visual link between "where you are in the nav" and "the record you are viewing."

The **three-column body** (People → History → Overview) mirrors the three-tab structure used on mobile, so the information hierarchy is identical regardless of device. The full-width "Services & contracts" band at the bottom anchors the record and provides a clear visual separation from the company's relational data above.

On mobile, the bottom tab bar keeps Sales one tap away from anywhere in the app, and the drawer exposes the full navigation without disrupting the content layout.
