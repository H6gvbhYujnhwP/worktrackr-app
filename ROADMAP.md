# WorkTrackr Cloud — Active Roadmap

**Last updated:** Session 9 — 2025-04-04

---

## Completed

### UI Pushes
- ✅ **Push 1** — Shell layer (AppLayout, Sidebar, App.css — dark sidebar, gold accent, Modern Enterprise)
- ✅ **Push 2** — All module screens (Dashboard, Tickets, Ticket Detail, CRM, Quotes, User Management, Settings)
- ✅ **Push 3** — Remaining components (QuoteFormTabs, CreateTicketModal, IntegratedCalendar, BookingCalendar)

### AI Phases
- ✅ **AI Phase 1** — Email intake classifier (real Anthropic Claude call, `claude-haiku-4-5-20251001`, keyword fallback)
- ✅ **AI Phase 2** — Generate Quote with AI (OpenAI → Anthropic swap; Generate with AI button in Quotes tab; full flow ticket → AI draft → review → save with `ai_generated` flag)

### Core fixes (Sessions 1–7)
- ✅ Auth cookie name fix (trial signup broken)
- ✅ Dangerous in-memory public auth stub replaced
- ✅ Admin audit log args fix + transaction wrap
- ✅ Ticket Calendar full rewrite (localStorage removed, DB-backed)
- ✅ Inline sub-component anti-pattern sweep (all components fixed)
- ✅ CRM contacts snake_case → camelCase normaliser
- ✅ contactPersons Zod-default data-loss bug fixed

---

## Next — AI Phase 3: Smart Summaries

**What:** A "Summarise" button in the ticket detail sidebar and in quote detail. Clicking it calls Claude, which reads the ticket thread (all updates/comments) or quote line items, and returns a clean human-readable summary shown inline. Results stored in `ai_extractions`.

**Files to touch:**
- `web/routes/summaries.js` — new file, `POST /api/summaries/ticket/:id` and `POST /api/summaries/quote/:id`
- `web/server.js` — one line to mount summaries route
- `TicketDetailViewTabbed.jsx` — Summarise button in metadata sidebar, summary shown inline
- `QuoteDetails.jsx` — Customer Summary button in Quick Actions, summary shown inline

**No logic changes to existing save flows.**

---

## Backlog (after AI phases)

### AI Phase 4 — CRM Next-Action Suggestions
After a CRM calendar event is marked Done, Claude suggests the next logical action (follow-up call, send quote, schedule visit). Shown as a dismissable suggestion card.

### AI Phase 5 — Natural Language Ticket Search
Replace text search with semantic search — type "network issues last month" and get relevant tickets back. Requires embedding storage (pgvector or similar).

### Jobs Module
Full job scheduling and tracking — convert accepted quotes to jobs, assign technicians, track completion.

### Invoicing
Generate invoices from completed jobs, PDF output, email delivery.

### Payments
Record and allocate payments against invoices.

### PWA / Mobile
Trusted Web Activity for Google Play Store listing — deferred until after AI phases.

### Splashtop Integration
One-click remote session from ticket detail via Splashtop Business API — deferred until after AI phases.

---

## Design system reference (Modern Enterprise)
- White container: `bg-white rounded-xl border border-[#e5e7eb] overflow-hidden`
- Table headers: `text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider bg-[#fafafa]`
- Zebra rows: odd=white, even=`bg-[#fafbfc]`, hover=`bg-[#fef9ee]`
- Gold primary button: `bg-[#d4a017] text-[#111113] hover:bg-[#b8860b]`
- Gold outline button: `border border-[#d4a017] text-[#b8860b] hover:bg-[#fef9ee]`
- Gold focus rings: `focus:ring-[#d4a017]/30 focus:border-[#d4a017]`
- Section labels: `text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]`
