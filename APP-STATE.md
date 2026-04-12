# WorkTrackr Cloud — App State Snapshot

**Last updated:** Session 28 — 2026-04-12
**Live URL:** https://worktrackr.cloud
**Stack:** React frontend · Node.js/Express backend · PostgreSQL · Render auto-deploy
**AI:** Anthropic Claude `claude-haiku-4-5-20251001` for all reasoning · OpenAI Whisper `whisper-1` for audio only

---

## Module Status

| Module | Status | Notes |
|---|---|---|
| Auth / Login | ✅ Working | Cookie-based auth, admin audit log |
| Dashboard | ✅ Working | Stat cards, recent activity |
| Tickets | ✅ Working | Option A layout, CustomerStrip, Audio tab, Generate Quote button |
| CRM Contacts | ✅ Working | Full CRUD, snake_case normaliser applied |
| CRM Calendar | ✅ Working | DB-backed, day/week/month views, Jobs integration, AI Next-Action Suggestions (Session 28) |
| Quotes | ✅ Working | Line items redesign, buy/sell/margin, AI generation from ticket, PDF |
| Jobs (Projects) | ✅ Working | List, detail, create, edit — all user-facing labels now say "Project/Projects"; internal ids/routes/API remain `jobs`. Phase 2 complete. |
| Notes (Personal + Company) | ✅ Working | Dictation button, NewTicketFromNote, AddNoteToTicket |
| Voice Assistant | ✅ Working | Floating FAB, 7 intent destinations, mandatory review step |
| Invoices — Backend | ✅ Phase 1 done | DB tables + full CRUD API + PDF endpoint |
| Invoices — Frontend | ✅ Phase 2 done | List view, detail view, route wrappers, JobDetail integration |
| Payments | ❌ Not built | Next priority — Phase 1 (backend only) |

---

## Known Bugs / Outstanding Issues

| # | Module | Description | Severity |
|---|---|---|---|
| — | — | No confirmed open bugs as of Session 28 | — |

---

## Critical Standing Rules (read every session)

1. **Sub-component rule:** Never define `const Foo = () => ...` inside a parent component's function body. Always module-level or plain render helpers. This was the root cause of CRM contacts input focus bug and Dashboard re-render bug.
2. **Backend snake_case / frontend camelCase:** Always apply a normaliser (e.g. `mapJob()`, `mapContact()`, `mapInvoice()`) on all response paths.
3. **Zod `.default([])` data-loss:** Only write fields explicitly present in the request body on PUT routes — don't let Zod defaults silently overwrite DB values.
4. **AI policy:** All server-side AI = `claude-haiku-4-5-20251001` via direct fetch to Anthropic API. Whisper for audio only. No other AI providers.
5. **One phase at a time:** Complete and deliver one phase fully before starting the next.
6. **No logic changes during styling passes:** Keep UI and logic changes in separate commits.

---

## File Map

### Backend (`web/`)

| File | Purpose |
|---|---|
| `server.js` | Express app, route mounts, auth middleware |
| `shared/db.js` | PostgreSQL pool, `query()`, `getOrgContext()` |
| `routes/tickets.js` | Tickets CRUD, contact match, comment types incl. `audio_note` |
| `routes/quotes.js` | Quotes CRUD, line items, PDF generation, AI generate-from-ticket |
| `routes/jobs.js` | Jobs CRUD, time entries, parts — all mounted at `/api/jobs` |
| `routes/invoices.js` | Invoices CRUD, PDF — mounted at `/api/invoices` |
| `routes/crm-events.js` | CRM calendar events CRUD |
| `routes/contacts.js` | CRM contacts CRUD |
| `routes/transcribe.js` | Whisper transcription, Claude extraction, voice intent routing |
| `routes/summaries.js` | Smart summaries (ticket + quote) + CRM next-action suggestions |
| `routes/users.js` | User management |
| `routes/auth.js` | Login, logout, session |
| `migrations/create_invoices.sql` | invoices + invoice_lines tables, generate_invoice_number() |

### Frontend (`web/client/src/app/src/`)

| File | Purpose |
|---|---|
| `App.jsx` | React Router routes — all page-level routes defined here |
| `components/AppLayout.jsx` | Shell: sidebar + header + `<VoiceAssistant />` |
| `components/Sidebar.jsx` | Nav items for all modules (incl. Invoices) |
| `components/Dashboard.jsx` | Inline view switcher (renders list views inside dashboard) |
| `components/TicketDetailViewTabbed.jsx` | Ticket detail — Option A layout, CustomerStrip, tabs, audio, quote gen. "Project description" label. |
| `components/CRMCalendar.jsx` | CRM calendar — 3 views, jobs integration, event CRUD modals, AI next-action suggestions after Mark Done (Session 28). Module-level: `NextActionButton`, `NextActionBox`. |
| `components/QuoteForm.jsx` | Quote create/edit — line items, AI prefill, badge/lock mechanism |
| `components/QuoteDetails.jsx` | Quote detail view — line items table, margin panel, send modal |
| `components/SendQuoteModal.jsx` | Email quote to customer |
| `components/JobsList.jsx` | Jobs list — stat strip, search, status filter, table (labels: "Project") |
| `components/JobDetail.jsx` | Job detail — info card, time entries, parts, status actions, Create Invoice button (labels: "Project") |
| `components/JobForm.jsx` | Job create/edit — all fields, edit mode shows job number in header (labels: "Project") |
| `components/JobDetailWithLayout.jsx` | Route wrapper for job detail |
| `components/JobFormWithLayout.jsx` | Route wrapper for job form |
| `components/InvoicesList.jsx` | Invoices list — stat strip, status filter, search, table |
| `components/InvoiceDetail.jsx` | Invoice detail — lines table, totals, inline edit, status actions, PDF, delete |
| `components/InvoiceDetailWithLayout.jsx` | Route wrapper for invoice detail |
| `components/InvoicesListWithLayout.jsx` | Route wrapper for invoices list |
| `components/PersonalNotes.jsx` | Personal notes — dictation, ticket linking modals |
| `components/CompanyNotes.jsx` | Company/shared notes — same as PersonalNotes |
| `components/VoiceAssistant.jsx` | Floating gold mic FAB — speech → Claude intent → review → save |
| `components/DictationButton.jsx` | Reusable inline mic button (Web Speech API) |
| `components/IntegratedCalendar.jsx` | Ticket scheduling calendar (separate from CRM calendar) |

---

## Key API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/jobs` | List jobs (query: status, contact_id, assigned_to, page, limit) |
| GET | `/api/jobs/:id` | Job detail with time/parts totals |
| POST | `/api/jobs` | Create job |
| PUT | `/api/jobs/:id` | Update job |
| GET/POST/DELETE | `/api/jobs/:id/time-entries` | Time entries for a job |
| GET/POST/DELETE | `/api/jobs/:id/parts` | Parts for a job |
| GET | `/api/invoices` | List invoices (optional ?status= filter) |
| GET | `/api/invoices/:id` | Invoice detail with lines, contact, job |
| POST | `/api/invoices` | Create invoice (optionally from job_id) |
| PUT | `/api/invoices/:id` | Update status/due_date/notes/invoice_number |
| DELETE | `/api/invoices/:id` | Delete invoice |
| GET | `/api/invoices/:id/pdf` | Invoice PDF download |
| GET/POST/PUT/DELETE | `/api/crm-events` | CRM calendar events |
| GET/POST/PUT/DELETE | `/api/quotes` | Quotes |
| POST | `/api/quotes/generate-from-ticket` | AI quote generation |
| GET | `/api/quotes/:id/pdf` | Quote PDF |
| GET/POST/PUT/DELETE | `/api/tickets` | Tickets |
| POST | `/api/tickets/:id/match-contact` | Claude-powered contact match |
| POST | `/api/transcribe/ticket-note` | Whisper + Claude extraction for audio notes |
| POST | `/api/transcribe/voice-intent` | Claude intent routing for voice assistant |
| GET/POST | `/api/summaries/ticket/:id` | Smart summary for ticket |
| POST | `/api/summaries/crm-event/:id/next-action` | AI next-action suggestion after event marked Done |

---

## Navigation Flow

```
Sidebar
├── Dashboard
├── Tickets → TicketDetailViewTabbed (route: /app/tickets/:id)
├── CRM
│   ├── Contacts
│   ├── Quotes → QuoteForm / QuoteDetails (routes: /app/crm/quotes/new, /app/crm/quotes/:id)
│   ├── Projects → JobDetail / JobForm (routes: /app/jobs/:id, /app/jobs/new, /app/jobs/:id/edit)
│   ├── Invoices → InvoicesList / InvoiceDetail (routes: /app/invoices, /app/invoices/:id) ✅ DONE
│   └── CRM Calendar
└── Settings / Users
```
