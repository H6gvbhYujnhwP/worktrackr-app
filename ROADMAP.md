# WorkTrackr Cloud — Active Roadmap

**Last updated:** Session 24 — 2026-04-12

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

### Quote Improvements
- ✅ Quote Line Items Redesign (materials/labour sections, buy/sell price, margin panel, supplier, VAT toggle)
- ✅ AI Quote Generation from Ticket (GenerateQuotePanel, confidence dots, catalogue badge, lock-on-edit)

### Audio / Voice
- ✅ Audio Stage 1 — Inline dictation in Notes (DictationButton, Web Speech API)
- ✅ Audio Stage 2 — Meeting audio upload to ticket thread (Whisper transcription, Claude extraction)
- ✅ Audio Stage 3 — Floating voice assistant (intent routing to 7 destinations, mandatory review)

### Invoices Module
- ✅ **Invoices Phase 1** — Backend only: `invoices` + `invoice_lines` DB tables, `generate_invoice_number()`, full CRUD API (`/api/invoices`), PDF endpoint. See SESSION-LOG.md Session 24 for full API contract.

---

## Next Priority — Invoices Phase 2 (Frontend UI)

### API contract (from Phase 1 — do not re-read backend, use this)

| Method | Path | Response shape |
|---|---|---|
| GET | `/api/invoices` | `{ invoices: [...] }` — each row has `id`, `invoice_number`, `status`, `issue_date`, `due_date`, `subtotal`, `vat_total`, `total`, `notes`, `contact_name`, `job_number`, `job_title`, `created_at` |
| GET | `/api/invoices/:id` | `{ invoice: { ...allCols, contact_name, contact_email, contact_phone, job_number, job_title, lines: [{ id, description, quantity, unit_price, line_total, vat_applicable, sort_order }] } }` |
| POST | `/api/invoices` | Body: `{ job_id?, contact_id?, issue_date?, due_date?, notes? }` → `{ invoice: fullInvoice }` |
| PUT | `/api/invoices/:id` | Body (any subset): `{ status?, due_date?, notes?, invoice_number? }` → `{ invoice: fullInvoice }` |
| DELETE | `/api/invoices/:id` | `{ message, invoice: { id, invoice_number } }` |
| GET | `/api/invoices/:id/pdf` | Binary PDF stream |

Invoice number format: `INV-0001`, `INV-0002`, etc.
Status values: `draft` · `sent` · `paid` · `overdue`

### Files to create / modify

#### New files
| File | What it does |
|---|---|
| `web/client/src/app/src/components/InvoicesList.jsx` | List view. Stat strip (total count, draft/sent/paid/overdue counts, total value). Status filter tabs. Table with columns: Invoice #, Contact, Job, Issue Date, Due Date, Total, Status. Row click → navigate to detail. Gold "New Invoice" button (opens create flow). |
| `web/client/src/app/src/components/InvoiceDetail.jsx` | Detail view. Header: invoice number + status badge + "Download PDF" button. Info cards: contact, job reference, dates. Lines table: Description, Qty, Unit Price, VAT, Line Total. Totals panel: subtotal / VAT / total. Status action buttons: mark Sent / mark Paid / mark Overdue (context-sensitive). Edit fields: due_date, notes (inline PUT). Delete button with confirm. |
| `web/client/src/app/src/components/InvoiceDetailWithLayout.jsx` | Route wrapper: wraps `<InvoiceDetail />` with `<AppLayout />`. Same pattern as `JobDetailWithLayout.jsx`. |

#### Modified files
| File | What to change |
|---|---|
| `web/client/src/app/src/components/JobDetail.jsx` | (1) When job status is `completed` or `invoiced` AND `converted_to_invoice_id` is null: show gold "Create Invoice" button that POSTs to `/api/invoices` with the job id, then navigates to the new invoice detail. (2) When `converted_to_invoice_id` is set: show a read-only amber link "Invoice: INV-XXXX →" that navigates to `/app/invoices/:id`. |
| `web/client/src/app/src/components/Sidebar.jsx` | Add "Invoices" nav item in the CRM section, below Jobs. Icon: `Receipt` from lucide-react. Route: `/app/invoices`. |
| `web/client/src/app/src/App.jsx` | Add two routes inside the authenticated shell: `<Route path="invoices" element={<InvoicesListWithLayout />} />` and `<Route path="invoices/:id" element={<InvoiceDetailWithLayout />} />`. Also create `InvoicesListWithLayout` wrapper (same pattern as JobDetailWithLayout). |
| `web/client/src/app/src/components/Dashboard.jsx` | Add `invoices` to the view switcher so the Dashboard can render InvoicesList inline. Same pattern as existing jobs/quotes view clauses. |

### mapInvoice() normaliser (must be written in each new component)

Backend returns snake_case. Write a `mapInvoice()` function at the top of each file that uses invoice data:

```js
function mapInvoice(raw) {
  if (!raw) return null;
  return {
    id:                  raw.id,
    invoiceNumber:       raw.invoice_number,
    status:              raw.status,
    issueDate:           raw.issue_date,
    dueDate:             raw.due_date,
    subtotal:            parseFloat(raw.subtotal || 0),
    vatTotal:            parseFloat(raw.vat_total || 0),
    total:               parseFloat(raw.total || 0),
    notes:               raw.notes || '',
    contactName:         raw.contact_name || '',
    contactEmail:        raw.contact_email || '',
    contactPhone:        raw.contact_phone || '',
    jobNumber:           raw.job_number || '',
    jobTitle:            raw.job_title || '',
    jobId:               raw.job_id || null,
    contactId:           raw.contact_id || null,
    createdAt:           raw.created_at,
    updatedAt:           raw.updated_at,
    lines:               (raw.lines || []).map(mapInvoiceLine),
  };
}

function mapInvoiceLine(raw) {
  return {
    id:            raw.id,
    description:   raw.description,
    quantity:      parseFloat(raw.quantity || 0),
    unitPrice:     parseFloat(raw.unit_price || 0),
    lineTotal:     parseFloat(raw.line_total || 0),
    vatApplicable: raw.vat_applicable !== false,
    sortOrder:     raw.sort_order || 0,
  };
}
```

Apply `mapInvoice()` to **every** response path: list items, detail fetch, POST response, PUT response.

### Design system reminders
- White container: `bg-white rounded-xl border border-[#e5e7eb] overflow-hidden`
- Table headers: `text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider bg-[#fafafa]`
- Zebra rows: odd = white, even = `bg-[#fafbfc]`, hover = `bg-[#fef9ee]`
- Gold primary button: `bg-[#d4a017] text-[#111113] hover:bg-[#b8860b]`
- Gold outline button: `border border-[#d4a017] text-[#b8860b] hover:bg-[#fef9ee]`
- Gold focus rings: `focus:ring-[#d4a017]/30 focus:border-[#d4a017]`
- AI accent / info box: `bg-[#fef9ee] border border-[#d4a017]/30 rounded-xl`
- Status badge colours: draft = grey, sent = blue, paid = green, overdue = red

### Sub-component rule reminder
**NEVER define `const Foo = () => ...` inside a parent component's function body.**
Always define sub-components at **module level** (outside the parent function) or convert to plain render-helper functions. This was the root cause of the CRM contacts input focus bug and Dashboard re-render bug. A React component defined inline is seen as a new type on every render → unmount/remount → destroyed input state.

### Checklist — must not break
- [ ] `JobDetail.jsx` must still work for jobs with no invoice (no `converted_to_invoice_id`) — the new button/link is purely additive and conditional
- [ ] `Sidebar.jsx` existing nav items (Dashboard, Tickets, Contacts, Quotes, Jobs, Calendar, etc.) must be untouched — only add one new item
- [ ] `App.jsx` existing routes must be untouched — only append new routes
- [ ] `Dashboard.jsx` existing view clauses must be untouched — only add the invoices clause

### Delivery instruction
Deliver all changed + new files **plus** updated `SESSION-LOG.md`, `APP-STATE.md`, and `ROADMAP.md` together in **one batch** with full repo-relative destination paths for every file (e.g. `web/client/src/app/src/components/InvoicesList.jsx`). Never deliver code without the three doc files.

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
