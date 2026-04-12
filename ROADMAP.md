# WorkTrackr Cloud — Active Roadmap

**Last updated:** Session 27 — 2026-04-12

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
- ✅ **Rename Jobs → Projects Phase 1** — All user-visible labels changed to "Project/Projects" in 8 frontend files; internal ids/routes/API paths remain `jobs` throughout
- ✅ **Rename Jobs → Projects Phase 2** — `TicketDetailViewTabbed.jsx` amber bar label + tooltip updated ("Project description"); `QuoteForm`, `QuoteDetails`, `IntegratedCalendar` audited — no "Job" text found, no changes needed

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

## Next Priority — Payments

Record and allocate payments against invoices.

### Phase 1 — Backend only (next session)
- `payments` DB table: `id`, `organisation_id`, `invoice_id`, `amount`, `payment_date`, `method` (cash/bank/card/other), `reference`, `notes`, `created_at`
- `GET /api/invoices/:id/payments` — list payments for an invoice
- `POST /api/invoices/:id/payments` — record a payment; auto-update invoice `amount_paid`, `balance_due`; set status to `paid` if fully settled, `partially_paid` if not
- `DELETE /api/invoices/:id/payments/:pid` — remove a payment; recalculate `amount_paid`, `balance_due`; revert status if needed
- New files: `web/migrations/create_payments.sql`, `web/routes/payments.js`
- Modified: `web/server.js` (mount payments router at `/api/invoices`)

### Phase 2 — Frontend (after Phase 1 deployed)
- `PaymentsSection` inside `InvoiceDetail` — collapsible, same pattern as TimeEntriesSection in JobDetail
- Shows payment history table, "Record Payment" inline form, running balance / amount outstanding
- Invoice detail header shows "Amount Outstanding" after payments applied

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
