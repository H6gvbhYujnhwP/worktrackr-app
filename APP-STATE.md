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
| CRM Calendar | ✅ Working | DB-backed, day/week/month views, Jobs integration, AI Next-Action Suggestions |
| Quotes | ✅ Working | Line items redesign, buy/sell/margin, AI generation from ticket, PDF |
| Jobs (Projects) | ✅ Working | All user-facing labels say "Project/Projects"; internal ids/routes/API remain `jobs` |
| Notes (Personal + Company) | ✅ Working | Dictation button, NewTicketFromNote, AddNoteToTicket |
| Voice Assistant | ⚠️ Partial | Floating FAB works, intent routing works, BUT: no voice confirmation loop (requires screen tap), CRM calendar missing company/contact extraction. Full overhaul scoped — see ROADMAP.md |
| Invoices — Backend | ✅ Phase 1 done | DB tables + full CRUD API + PDF endpoint |
| Invoices — Frontend | ✅ Phase 2 done | List view, detail view, route wrappers, JobDetail integration |
| Payments | ❌ Not built | Backlog — after voice overhaul |

---

## Known Bugs / Outstanding Issues

| # | Module | Description | Severity |
|---|---|---|---|
| 1 | Voice Assistant | No voice confirmation loop — after TTS speaks, mic goes silent, requires screen tap to confirm. Not hands-free. | High |
| 2 | Voice Assistant | `crm_calendar` intent: `company` and `contact` not in Claude prompt schema, not extracted, not saved to API. CRM events created with blank company/contact. | High |

---

## Critical Standing Rules (read every session)

1. **Sub-component rule:** Never define `const Foo = () => ...` inside a parent component's function body. Always module-level or plain render helpers. Root cause of CRM contacts input focus bug and Dashboard re-render bug.
2. **Backend snake_case / frontend camelCase:** Always apply a normaliser (e.g. `mapJob()`, `mapContact()`, `mapInvoice()`) on all response paths.
3. **Zod `.default([])` data-loss:** Only write fields explicitly present in the request body on PUT routes.
4. **AI policy:** All server-side AI = `claude-haiku-4-5-20251001` via direct fetch to Anthropic API. Whisper for audio only. No other AI providers.
5. **One phase at a time:** Complete and deliver one phase fully before starting the next.
6. **No logic changes during styling passes.**

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
| `routes/transcribe.js` | Whisper transcription, Claude extraction, voice intent routing. `buildVoiceIntentPrompt()` at line ~270. **Needs update: add company/contact to crm_calendar schema, add clarification_needed/missing_fields/question to response shape.** |
| `routes/summaries.js` | Smart summaries (ticket + quote) + CRM next-action suggestions |
| `routes/users.js` | User management |
| `routes/auth.js` | Login, logout, session |
| `migrations/create_invoices.sql` | invoices + invoice_lines tables, generate_invoice_number() |

### Frontend (`web/client/src/app/src/`)

| File | Purpose |
|---|---|
| `App.jsx` | React Router routes |
| `components/AppLayout.jsx` | Shell: sidebar + header + `<VoiceAssistant />` |
| `components/Sidebar.jsx` | Nav items for all modules |
| `components/Dashboard.jsx` | Inline view switcher |
| `components/TicketDetailViewTabbed.jsx` | Ticket detail — Option A layout, CustomerStrip, tabs, audio, quote gen |
| `components/CRMCalendar.jsx` | CRM calendar — 3 views, jobs integration, AI next-action suggestions. Module-level: `NextActionButton`, `NextActionBox` |
| `components/VoiceAssistant.jsx` | Floating gold mic FAB. **Needs full overhaul** — see ROADMAP.md. Key sections: `saveIntent()` (saves per intent), `ReviewPanel` (shows after processing), `CrmCalendarFields` (missing company/contact fields), `buildVoiceIntentPrompt` in transcribe.js (missing company/contact in crm_calendar schema). |
| `components/QuoteForm.jsx` | Quote create/edit — line items, AI prefill, badge/lock |
| `components/QuoteDetails.jsx` | Quote detail — line items table, margin panel, send modal |
| `components/JobsList.jsx` | Jobs list (labels: "Project") |
| `components/JobDetail.jsx` | Job detail (labels: "Project") |
| `components/JobForm.jsx` | Job create/edit (labels: "Project") |
| `components/JobDetailWithLayout.jsx` | Route wrapper |
| `components/JobFormWithLayout.jsx` | Route wrapper |
| `components/InvoicesList.jsx` | Invoices list |
| `components/InvoiceDetail.jsx` | Invoice detail |
| `components/InvoiceDetailWithLayout.jsx` | Route wrapper |
| `components/InvoicesListWithLayout.jsx` | Route wrapper |
| `components/PersonalNotes.jsx` | Personal notes — dictation, ticket linking |
| `components/CompanyNotes.jsx` | Company/shared notes |
| `components/DictationButton.jsx` | Reusable inline mic button (Web Speech API) |
| `components/IntegratedCalendar.jsx` | Ticket scheduling calendar |

---

## Key API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/jobs` | List jobs |
| GET/POST/PUT/DELETE | `/api/jobs/:id` | Job CRUD |
| GET/POST/DELETE | `/api/jobs/:id/time-entries` | Time entries |
| GET/POST/DELETE | `/api/jobs/:id/parts` | Parts |
| GET/POST/PUT/DELETE | `/api/invoices` | Invoices |
| GET | `/api/invoices/:id/pdf` | Invoice PDF |
| GET/POST/PUT/DELETE | `/api/crm-events` | CRM calendar events |
| GET/POST/PUT/DELETE | `/api/quotes` | Quotes |
| POST | `/api/quotes/generate-from-ticket` | AI quote generation |
| GET | `/api/quotes/:id/pdf` | Quote PDF |
| GET/POST/PUT/DELETE | `/api/tickets` | Tickets |
| POST | `/api/tickets/:id/match-contact` | Claude contact match |
| POST | `/api/transcribe/ticket-note` | Whisper + Claude extraction |
| POST | `/api/transcribe/voice-intent` | Claude intent routing for voice assistant |
| GET/POST | `/api/summaries/ticket/:id` | Smart summary for ticket |
| POST | `/api/summaries/crm-event/:id/next-action` | AI next-action after event marked Done |

---

## Navigation Flow

```
Sidebar
├── Dashboard
├── Tickets → TicketDetailViewTabbed (route: /app/tickets/:id)
├── CRM
│   ├── Contacts
│   ├── Quotes → QuoteForm / QuoteDetails
│   ├── Projects → JobDetail / JobForm
│   ├── Invoices → InvoicesList / InvoiceDetail ✅
│   └── CRM Calendar
└── Settings / Users
```
