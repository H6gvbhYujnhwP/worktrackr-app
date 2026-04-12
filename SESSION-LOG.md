# WorkTrackr Cloud — Session Log

> **Scope:** Last 2 sessions only. Older history is in `SESSION-ARCHIVE.md`.
> Claude reads `SESSION-LOG.md` + `APP-STATE.md` + `ROADMAP.md` at the start of every session.
> `SESSION-ARCHIVE.md` is only read when debugging a historical issue.

---

## Delivery rule
**Every time a phase or burst of work is completed, Claude must deliver:**
1. All changed code files
2. Updated `SESSION-LOG.md` (keep last 2 sessions; move older entries to `SESSION-ARCHIVE.md`)
3. Updated `APP-STATE.md` (module statuses, known bugs, file map)
4. Updated `ROADMAP.md`

All four delivered together in the same download batch. Never one without the others.

---

## New session start prompt
Paste this at the start of every new chat session:

> "You are continuing development of WorkTrackr Cloud, a SaaS field service and CRM platform. The live site is https://worktrackr.cloud. We work by: you produce fixed files, I download them and copy into my local repo at `C:\repos\worktrackr-app`, then push via GitHub Desktop so Render auto-deploys. Before doing anything, read the uploaded repo zip then read `SESSION-LOG.md`, `APP-STATE.md`, and `ROADMAP.md` in full. These three files tell you the current state, rules, and what to work on next. After each phase is complete, always deliver code files + SESSION-LOG.md + APP-STATE.md + ROADMAP.md together in one batch."

---

## Current State
- **Last session:** 2026-04-12 (Session 26)
- **Next priority:** Rename Jobs → Projects — Phase 2 (if needed); otherwise Payments module

---

## Session 26 — 2026-04-12

### Rename Jobs → Projects — Phase 1 (frontend labels only)

#### Scope
Labels-only pass. No backend files touched. No logic, route, API path, state field name, or internal identifier changed. All internal `'jobs'` identifiers preserved exactly. Sub-component rule maintained throughout (no structural changes).

#### Modified files
| File | Lines changed | What changed |
|---|---|---|
| `Sidebar.jsx` | CRM_ITEMS array | `label: 'Jobs'` → `label: 'Projects'` (id/view stay `'jobs'`) |
| `JobsList.jsx` | Page title, subtitle, stat label, Create button ×2, search placeholder, table column header `Job #` → `Project #`, empty-state texts, footer count | All user-visible "Job/Jobs" → "Project/Projects" |
| `JobDetail.jsx` | Loading text, fetch error string, error-state back button, card headers ×2, meta label, Cancel button, status/cancel alert strings | Same |
| `JobForm.jsx` | Loading text, alert strings ×2, page title (create + edit + edit-with-number), subtitle, section card header + subtitle, field label, save button labels ×2, PUT/POST/catch error strings | Same |
| `CRMCalendar.jsx` | `eventTypes` job entry label, event detail modal header, "View Job" button | `'Job'` → `'Project'` in all three places |
| `InvoiceDetail.jsx` | "Linked Job" section label | → "Linked Project" |
| `InvoicesList.jsx` | "Job" table column header | → "Project" |
| `Dashboard.jsx` | File-header comment only | No visible "Job" text existed; internal view id `'jobs'` unchanged |

#### Must-not-break checklist (verified)
- [x] All `/api/jobs` API paths unchanged
- [x] All `/app/jobs/…` navigate routes unchanged
- [x] All `view: 'jobs'` identifiers unchanged
- [x] `currentView === 'jobs'` in Dashboard unchanged
- [x] `value: 'job'` in CRMCalendar eventTypes unchanged (`_isJob`, `_jobId` fields unchanged)
- [x] Sidebar `id: 'jobs'` and `view: 'jobs'` unchanged (only `label` changed)
- [x] Sub-component rule: no structural changes, all components remain at module level

---

## Session 25 — 2026-04-12

### Invoices Module — Phase 2 (Frontend UI)

#### New files
| File | Purpose |
|---|---|
| `web/client/src/app/src/components/InvoicesList.jsx` | List view. Stat strip (counts per status). Status filter tabs + search. Table: Invoice #, Contact, Job, Issue Date, Due Date, Total, Status. Row click → detail. Gold "New Invoice" button → NewInvoiceModal (issue_date, due_date, notes) → POST /api/invoices → navigate to detail. |
| `web/client/src/app/src/components/InvoiceDetail.jsx` | Detail view. Header: invoice number + StatusBadge + context-sensitive status action buttons + Download PDF + Delete. Info cards: contact, linked job, dates. Lines table: description, qty, unit price, VAT badge, line total. Totals panel: subtotal / VAT / total. Right sidebar: meta, inline edit for due_date + notes (dirty-flag Save), status actions. |
| `web/client/src/app/src/components/InvoiceDetailWithLayout.jsx` | Route wrapper for InvoiceDetail. currentView="invoices". Pattern: JobDetailWithLayout. |
| `web/client/src/app/src/components/InvoicesListWithLayout.jsx` | Route wrapper for InvoicesList. currentView="invoices". Pattern: QuotesListWithLayout. |

#### Modified files
| File | Lines changed | What changed |
|---|---|---|
| `web/client/src/app/src/components/JobDetail.jsx` | Import; state; useEffect; handler; header buttons | Added FileText lucide import. Added creatingInvoice + linkedInvoice state. Added secondary useEffect to fetch invoice number when job.convertedToInvoiceId is set (silent fail). Added handleCreateInvoice (POST /api/invoices with job_id, navigate to detail). Header button group: if convertedToInvoiceId → amber "Invoice: INV-XXXX →" link; else if status is completed or invoiced → gold "Create Invoice" button. |
| `web/client/src/app/src/components/Sidebar.jsx` | Import line; CRM_ITEMS array | Added Receipt to lucide imports. Added invoices entry after jobs in CRM_ITEMS. |
| `web/client/src/app/src/App.jsx` | Imports; Routes | Added InvoiceDetailWithLayout + InvoicesListWithLayout imports. Added /invoices and /invoices/:id routes after jobs routes. |
| `web/client/src/app/src/components/Dashboard.jsx` | Import; view switcher | Added InvoicesList import. Added invoices view clause after jobs clause. |

#### Design decisions
- mapInvoice() / mapInvoiceLine() at module level in both list and detail (per roadmap spec)
- Status transitions: draft→sent; sent→paid|overdue; overdue→paid|sent; paid→no actions
- "New Invoice" creates blank invoice (no contact/job) — detail view used for all edits
- All sub-components (NewInvoiceModal, StatusBadge, StatPill) defined at module level — sub-component rule followed
- Sidebar nav → Dashboard view:invoices → InvoicesList inline (same pattern as Jobs)
- Direct URL /app/invoices also works via InvoicesListWithLayout route

#### Testing checklist
- [ ] Sidebar shows "Invoices" below Jobs in CRM section
- [ ] Clicking Invoices renders list view with stat strip
- [ ] "New Invoice" modal creates blank invoice, navigates to detail
- [ ] Invoice detail loads with lines table, totals, contact/job info
- [ ] Download PDF streams and downloads file
- [ ] Status action buttons change status and update badge
- [ ] Inline edit (due_date, notes) shows Save when dirty, saves on click
- [ ] Delete requires confirmation, then returns to list
- [ ] Completed/invoiced job shows gold "Create Invoice" button
- [ ] Clicking it POSTs, navigates to new invoice detail
- [ ] After conversion, job detail shows amber "Invoice: INV-XXXX →" link
- [ ] Jobs without completed/invoiced status show no invoice button (no regression)

---

## Session 24 — 2026-04-12

### Invoices Module — Phase 1 (backend only)

#### New files
| File | Purpose |
|---|---|
| `web/migrations/create_invoices.sql` | Creates invoices + invoice_lines tables, generate_invoice_number() function. |
| `web/routes/invoices.js` | Full CRUD + PDF for invoices. |

#### Modified files
| File | Change |
|---|---|
| `web/server.js` | Lines 193–196: added invoices route mount between Jobs and AI Summaries. |

#### API contract
| Method | Path | Notes |
|---|---|---|
| GET | `/api/invoices` | `{ invoices: [...] }` optional ?status= filter. Each row: contact_name, job_number, job_title. |
| GET | `/api/invoices/:id` | `{ invoice: { ...cols, contact_name, contact_email, contact_phone, job_number, job_title, lines: [...] } }` |
| POST | `/api/invoices` | Body: { job_id?, contact_id?, issue_date?, due_date?, notes? }. Returns { invoice: fullInvoice }. |
| PUT | `/api/invoices/:id` | Accepts: status, due_date, notes, invoice_number. Returns { invoice: fullInvoice }. |
| DELETE | `/api/invoices/:id` | Nulls jobs.converted_to_invoice_id, deletes invoice. |
| GET | `/api/invoices/:id/pdf` | Streams PDF. |

---

## Rules for Claude — must follow every session

1. **Read `SESSION-LOG.md`, `APP-STATE.md`, `ROADMAP.md` in full** before writing anything
2. **Sub-component rule:** Never define `const Foo = () => ...` inside a parent function body — always module-level or plain render helpers.
3. **State impact explicitly** before touching any file
4. **Never change function signatures, export shapes, or API response structures** without checking every consumer
5. **Backend snake_case / frontend camelCase:** Always apply a normaliser on all response paths
6. **Zod `.default([])` trap:** Only write fields explicitly present in the request body on PUT routes
7. **Delivery rule:** Changed code + SESSION-LOG.md + APP-STATE.md + ROADMAP.md — all together, never separately
8. **AI policy:** `claude-haiku-4-5-20251001` for all server-side reasoning. Whisper `whisper-1` for audio only.
9. **One phase at a time.** Complete and deliver before starting the next.
10. **No logic changes during styling passes.**
