# WorkTrackr Cloud — Active Roadmap

**Last updated:** Session 26 — 2026-04-12

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

### Jobs Module
- ✅ **Jobs Phase 1** — Backend API (jobs, job_time_entries, job_parts tables + all CRUD routes)
- ✅ **Jobs Phase 2** — Frontend UI (list view, detail page, create form, sidebar nav)
- ✅ **Jobs Phase 3** — Edit form (pre-populated, PUT to API) + inline time entry & parts logging (add + delete)
- ✅ **Jobs Phase 4** — Edit Job header shows job number (e.g. "Edit Job — JB-0001")
- ✅ **Jobs Calendar Integration** — Scheduled jobs appear as read-only gold blocks on CRM Calendar
- ✅ **Rename Jobs → Projects Phase 1** — All user-facing labels changed to "Project/Projects"; internal ids/routes/API paths remain `jobs` throughout

### Quote Improvements
- ✅ Quote Line Items Redesign (materials/labour sections, buy/sell price, margin panel, supplier, VAT toggle)
- ✅ AI Quote Generation from Ticket (GenerateQuotePanel, confidence dots, catalogue badge, lock-on-edit)

### Audio / Voice
- ✅ Audio Stage 1 — Inline dictation in Notes (DictationButton, Web Speech API)
- ✅ Audio Stage 2 — Meeting audio upload to ticket thread (Whisper transcription, Claude extraction)
- ✅ Audio Stage 3 — Floating voice assistant (intent routing to 7 destinations, mandatory review)

### Invoices Module
- ✅ **Invoices Phase 1** — Backend only: invoices + invoice_lines DB tables, generate_invoice_number(), full CRUD API (/api/invoices), PDF endpoint.
- ✅ **Invoices Phase 2** — Frontend UI: InvoicesList, InvoiceDetail, route wrappers, Sidebar nav item, App.jsx routes, Dashboard view clause, JobDetail "Create Invoice" button + linked invoice badge.

---

## Rename Jobs → Projects — Phase 1 ✅ Done

All user-visible labels in 8 frontend files updated to say "Project / Projects". Internal identifiers (`jobs` route, `/api/jobs`, `view: 'jobs'`, `jobNumber` field, etc.) are all unchanged. No backend files touched.

**Phase 2 (if needed):** Any remaining screens not covered in Phase 1 — check `IntegratedCalendar.jsx`, `TicketDetailViewTabbed.jsx` (Generate Quote → job link), `QuoteForm.jsx`, `QuoteDetails.jsx` for any "Job" labels that should read "Project".

---

## Next Priority — Payments

Record and allocate payments against invoices.

### Suggested scope
- `payments` DB table: `id`, `organisation_id`, `invoice_id`, `amount`, `payment_date`, `method` (cash/bank/card/other), `reference`, `notes`, `created_at`
- `GET /api/invoices/:id/payments` — list payments for an invoice
- `POST /api/invoices/:id/payments` — record a payment; auto-update invoice status to `paid` if fully settled
- `DELETE /api/invoices/:id/payments/:pid` — remove a payment
- Frontend: `PaymentsSection` inside `InvoiceDetail` (collapsible, same pattern as TimeEntriesSection in JobDetail) — shows payment history, "Record Payment" inline form, running balance
- Invoice detail shows "Amount Outstanding" after payments applied

### Design system reminders
- White container: `bg-white rounded-xl border border-[#e5e7eb] overflow-hidden`
- Table headers: `text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider bg-[#fafafa]`
- Zebra rows: odd=white, even=`bg-[#fafbfc]`, hover=`bg-[#fef9ee]`
- Gold primary button: `bg-[#d4a017] text-[#111113] hover:bg-[#b8860b]`
- Sub-component rule: ALL sub-components at module level, never inside parent function body

---

## Backlog

### AI Phase 4 — CRM Next-Action Suggestions
After a CRM calendar event is marked Done, Claude suggests the next logical action. Files: `CRMCalendar.jsx` + `summaries.js`.

### AI Phase 5 — Natural Language Ticket Search
Type "network issues at Acme last month" → relevant tickets. Requires pgvector — larger uplift.

### PWA / Mobile
Trusted Web Activity for Google Play Store listing.

### Splashtop Integration
One-click remote session from ticket detail via Splashtop Business API.

### idoyourquotes.com Integration
Link quote approval flows from the separate quotes product into WorkTrackr.

---

## Design system reference (Modern Enterprise)
- White container: `bg-white rounded-xl border border-[#e5e7eb] overflow-hidden`
- Table headers: `text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider bg-[#fafafa]`
- Zebra rows: odd=white, even=`bg-[#fafbfc]`, hover=`bg-[#fef9ee]`
- Gold primary button: `bg-[#d4a017] text-[#111113] hover:bg-[#b8860b]`
- Gold outline button: `border border-[#d4a017] text-[#b8860b] hover:bg-[#fef9ee]`
- Gold focus rings: `focus:ring-[#d4a017]/30 focus:border-[#d4a017]`
- AI accent box: `bg-[#fef9ee] border border-[#d4a017]/30 rounded-xl`
