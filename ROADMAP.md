# WorkTrackr Cloud — Active Roadmap

**Last updated:** Session 9 — 2025-04-04

---

## Completed

### UI Pushes
- ✅ **Push 1** — Shell layer (AppLayout, Sidebar, App.css)
- ✅ **Push 2** — All module screens (Dashboard, Tickets, CRM, Quotes, Users, Settings)
- ✅ **Push 3** — Remaining components (QuoteFormTabs, CreateTicketModal, IntegratedCalendar, BookingCalendar)

### AI Phases
- ✅ **AI Phase 1** — Email intake classifier (Anthropic Claude, keyword fallback)
- ✅ **AI Phase 2** — Generate Quote with AI (ticket → AI draft → review → save with ai_generated flag)
- ✅ **AI Phase 3** — Smart Summaries (Summarise Ticket + Summarise for Customer buttons, inline amber display)

### Core fixes
- ✅ Auth cookie name fix, dangerous public-auth stub replaced, admin audit log fix
- ✅ Ticket Calendar full rewrite (DB-backed, no localStorage)
- ✅ Inline sub-component anti-pattern sweep (all components fixed)
- ✅ CRM contacts snake_case normaliser + Zod data-loss fix

---

## Next — AI Phase 4: CRM Next-Action Suggestions

**What:** After a CRM calendar event is marked Done, Claude reads the event details (type, notes, contact) and suggests the next logical action — e.g. "Send a follow-up quote", "Schedule a review call in 30 days", "Log this in the contact notes". Displayed as a dismissable suggestion card that appears inline after the Done action.

**Files to touch:**
- `CRMCalendar.jsx` — after `handleMarkDone()` succeeds, call `POST /api/summaries/crm-next-action` and show suggestion card inline
- `summaries.js` — add `POST /api/summaries/crm-next-action` endpoint (fetches event + contact history, calls Claude)

**No new files needed beyond `summaries.js` addition.**

---

## Backlog

### AI Phase 5 — Natural Language Ticket Search
Type "network issues at Acme last month" and get relevant tickets back. Requires embedding storage (pgvector or similar) — larger uplift, defer until after Phase 4.

### Jobs Module
Convert accepted quotes to jobs. Assign technicians, track completion.

### Invoicing
Generate invoices from completed jobs. PDF output, email delivery.

### Payments
Record and allocate payments against invoices.

### PWA / Mobile
Trusted Web Activity for Google Play Store listing — defer until after AI phases.

### Splashtop Integration
One-click remote session from ticket detail via Splashtop Business API — defer until after AI phases.

---

## Design system reference (Modern Enterprise)
- White container: `bg-white rounded-xl border border-[#e5e7eb] overflow-hidden`
- Table headers: `text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider bg-[#fafafa]`
- Zebra rows: odd=white, even=`bg-[#fafbfc]`, hover=`bg-[#fef9ee]`
- Gold primary button: `bg-[#d4a017] text-[#111113] hover:bg-[#b8860b]`
- Gold outline button: `border border-[#d4a017] text-[#b8860b] hover:bg-[#fef9ee]`
- Gold focus rings: `focus:ring-[#d4a017]/30 focus:border-[#d4a017]`
- AI accent box: `bg-[#fef9ee] border border-[#d4a017]/30 rounded-xl`
