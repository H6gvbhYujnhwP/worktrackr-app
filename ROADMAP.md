# WorkTrackr Cloud — Active Roadmap

**Last updated:** Session 22 — 2026-04-12

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
- ✅ **Jobs Calendar Integration** — Scheduled jobs appear as read-only gold blocks on CRM Calendar; clicking opens job summary modal with "View Job →" navigation

### Quote Improvements
- ✅ Quote Line Items Redesign (materials/labour sections, buy/sell price, margin panel, supplier, VAT toggle)
- ✅ AI Quote Generation from Ticket (GenerateQuotePanel, confidence dots, catalogue badge, lock-on-edit)

### Audio / Voice
- ✅ Audio Stage 1 — Inline dictation in Notes (DictationButton, Web Speech API)
- ✅ Audio Stage 2 — Meeting audio upload to ticket thread (Whisper transcription, Claude extraction)
- ✅ Audio Stage 3 — Floating voice assistant (intent routing to 7 destinations, mandatory review)

---

## Next Priority — Invoices Module

**What:** Generate an invoice from a completed or invoiced job. PDF output, email delivery.

**Proposed scope:**
- `POST /api/invoices` — create invoice from job (copies job title, contact, line items from parts + time entries)
- `GET /api/invoices` — list with status filter (draft, sent, paid, overdue)
- `GET /api/invoices/:id` — detail view
- `PUT /api/invoices/:id` — update (status, due date, reference)
- `GET /api/invoices/:id/pdf` — PDF generation
- Frontend: InvoicesList, InvoiceDetail, "Create Invoice" button on Job detail when status = completed/invoiced
- Job detail: show linked invoice number when invoice exists

**DB:** New `invoices` table + `invoice_lines` table (mirrors quote_lines structure). `jobs.converted_to_invoice_id` FK already exists in schema.

**Files to create/touch:**
- `web/routes/invoices.js` (new)
- `web/migrations/create_invoices.sql` (new)
- `web/client/.../InvoicesList.jsx` (new)
- `web/client/.../InvoiceDetail.jsx` (new)
- `web/client/.../InvoiceDetailWithLayout.jsx` (new)
- `web/client/.../JobDetail.jsx` (add "Create Invoice" button + invoice link)
- `web/client/.../Sidebar.jsx` (add Invoices nav item)
- `web/client/.../Dashboard.jsx` (add invoices view clause)
- `web/client/.../App.jsx` (add invoice routes)
- `web/server.js` (mount invoices route)

---

## Backlog

### AI Phase 4 — CRM Next-Action Suggestions
After a CRM calendar event is marked Done, Claude suggests the next logical action. Files: `CRMCalendar.jsx` + `summaries.js`.

### AI Phase 5 — Natural Language Ticket Search
Type "network issues at Acme last month" → relevant tickets. Requires pgvector — larger uplift.

### Payments
Record and allocate payments against invoices.

### PWA / Mobile
Trusted Web Activity for Google Play Store listing — defer until after Invoices.

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
