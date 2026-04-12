# WorkTrackr Cloud — Session Log

---

## Delivery rule (added Session 9)
**Every time a phase or burst of work is completed, Claude must deliver:**
1. All changed code files
2. An updated SESSION-LOG.md
3. An updated ROADMAP.md

All three are delivered together in the same download batch. Never deliver session-log/roadmap without the code, and never deliver code without updating these docs.

---

## New session start prompt
Paste this at the start of every new chat session:

> "You are continuing development of WorkTrackr Cloud, a SaaS field service and CRM platform. The live site is https://worktrackr.cloud. We work by: you produce fixed files, I download them and copy into my local repo at `C:\repos\worktrackr-app`, then push via GitHub Desktop so Render auto-deploys. Before doing anything, read the uploaded repo zip and SESSION-LOG.md in full. The session log tells you what has already been fixed, the rules you must follow, and what to work on next. **After each phase is complete, always deliver code files + SESSION-LOG.md + ROADMAP.md together in one batch.** Before making any change, read the file in full, state which other files and flows are affected, and confirm the fix before producing output."

---

## Current State
- **Last session:** 2026-04-11 (Session 20)
- **Live URL:** https://worktrackr.cloud
- **Deploy platform:** Render (auto-deploys on GitHub push)
- **Last fixes applied:** Jobs Module Phase 2 — UI (list view + detail page + create form)
- **Next priority:** Jobs Module Phase 3 — Edit form + time entry / parts logging UI

---

## Session 20 — 2026-04-11

### Jobs Module Phase 2 — UI (List View + Detail Page + Create Form)

**Impact analysis confirmed before any code was written.**

#### Files changed
| File | Change |
|---|---|
| `web/client/.../Sidebar.jsx` | Added `Briefcase` to lucide imports. Added `{ id: 'jobs', label: 'Jobs', icon: Briefcase, view: 'jobs' }` to `CRM_ITEMS` (between Quotes and CRM Calendar). |
| `web/client/.../AppLayout.jsx` | Added `jobs: 'jobs'` to `VIEW_TO_PAGE` map. |
| `web/client/.../Dashboard.jsx` | Imported `JobsList`. Added `{currentView === 'jobs' && <JobsList />}` render clause. |
| `web/client/.../App.jsx` | Imported `JobDetailWithLayout` and `JobFormWithLayout`. Added routes `jobs/new` and `jobs/:id`. |

#### Files created
| File | Purpose |
|---|---|
| `web/client/.../JobsList.jsx` | Jobs list view — stat strip, search, status filter, sortable table, amber hover rows, gold job number. Matches QuotesList pattern exactly. |
| `web/client/.../JobDetail.jsx` | Job detail — 2+1 column layout, job info card, collapsible TimeEntriesSection, collapsible PartsSection, status change sidebar, back navigation. All sub-components at module level. |
| `web/client/.../JobForm.jsx` | Create job form — title, description, status picker, contact select, user select, scheduled start/end (datetime-local), internal notes. Validates required fields. POSTs to `/api/jobs`. Navigates to detail on success. |
| `web/client/.../JobDetailWithLayout.jsx` | Route wrapper — passes `currentView="jobs"` to AppLayout so sidebar stays highlighted. |
| `web/client/.../JobFormWithLayout.jsx` | Route wrapper — same pattern as JobDetailWithLayout. |

#### Navigation flow
- Sidebar "Jobs" item (CRM section) → `view: 'jobs'` → Dashboard renders `<JobsList />` inline
- Row click → `navigate('/app/jobs/:id')` → `JobDetailWithLayout` (dedicated route)
- "Create Job" button → `navigate('/app/jobs/new')` → `JobFormWithLayout` (dedicated route)
- Back buttons → `navigate('/app/dashboard', { state: { view: 'jobs' } })` → returns to list

#### Design system compliance
- White container `border-[#e5e7eb]`, table headers `text-[11px] uppercase tracking-wider bg-[#fafafa]`
- Zebra rows with amber hover `#fef9ee`
- Gold primary buttons `bg-[#d4a017]`
- Gold focus rings `focus:ring-[#d4a017]/30 focus:border-[#d4a017]`
- Status badges: scheduled=blue, in_progress=amber, on_hold=grey, completed=green, invoiced=purple, cancelled=red

#### Sub-component rule ✓
- `StatusBadge`, `TimeEntriesSection`, `PartsSection` all defined at module level in `JobDetail.jsx`
- `StatusBadge` also at module level in `JobsList.jsx`
- No component definitions inside parent function bodies anywhere

#### Testing checklist after deploy
- [ ] Sidebar CRM section shows "Jobs" with briefcase icon
- [ ] Clicking Jobs → jobs list renders with stat strip and table
- [ ] "Create Job" button → form opens at `/app/jobs/new`
- [ ] Form: title required (shows error on empty submit)
- [ ] Form: contact dropdown populated from `/api/contacts`
- [ ] Form: assigned to dropdown populated from `/api/users`
- [ ] Form: scheduled start/end datetime pickers work
- [ ] Submit creates job → navigates to `/app/jobs/:id`
- [ ] Job detail shows all fields, status badge, back button
- [ ] Time entries section loads (empty state if none)
- [ ] Parts section loads (empty state if none)
- [ ] Status change buttons update badge live
- [ ] "Cancel Job" button requires confirm click, then soft-cancels
- [ ] Cancelled/invoiced jobs shown with correct badge colour
- [ ] Back button from detail → returns to jobs list
- [ ] Jobs sidebar item stays highlighted on detail and form pages
- [ ] Tablet/mobile layout looks correct (stacked columns)



## Session 18 — 2026-04-11
## Session 19 — 2026-04-11

### Jobs Module Phase 1 — Schema, Migration, and API

**Schema confirmed before any code was written.**

#### Files changed
| File | Change |
|---|---|
| `web/migrations/create_jobs_table.sql` | **NEW** — creates `jobs`, `job_time_entries`, `job_parts` tables + `generate_job_number()` function + adds `converted_to_job_id` to `quotes`. All statements idempotent. |
| `web/routes/jobs.js` | **NEW** — full Jobs CRUD + time-entries + parts sub-resources (11 endpoints). |
| `web/server.js` | 2 lines: `require` + `app.use` for `jobs.js` at `/api/jobs`. |

#### Architecture
- Migration named `create_jobs_table.sql` — sorts after `create_crm_events_table.sql`, before `create_products_table.sql`; safe alphabetical ordering.
- `generate_job_number()` uses `CREATE OR REPLACE` — idempotent; counts existing job rows per org, zero-pads to 4 digits, prefixes `JB-`.
- `converted_to_invoice_id` stored as plain `UUID` (no FK) — FK will be added when the invoices table migration runs.
- `quotes.converted_to_job_id` added via `DO $$ BEGIN ... IF NOT EXISTS` guard — the existing `convert-to-job` handler in `quotes.js` required this column but it was never in any migration.
- All sub-resources (time-entries, parts) verify job → org ownership before touching child rows.
- Status auto-timestamps: `actual_start` set automatically when status → `in_progress`; `actual_end` set when status → `completed` (only if not already set).
- Soft-delete: DELETE sets `status = cancelled`; invoiced jobs cannot be cancelled.
- All DB column → camelCase mapping in `mapJob`, `mapTimeEntry`, `mapPart` helpers.

#### API surface
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/jobs` | List jobs (filters: status, contact_id, assigned_to, page, limit) |
| GET | `/api/jobs/:id` | Single job with time + parts totals |
| POST | `/api/jobs` | Create job manually |
| PUT | `/api/jobs/:id` | Update job |
| DELETE | `/api/jobs/:id` | Soft-cancel |
| POST | `/api/jobs/:id/time-entries` | Log time |
| GET | `/api/jobs/:id/time-entries` | List time entries + total minutes |
| DELETE | `/api/jobs/:id/time-entries/:entryId` | Remove time entry |
| POST | `/api/jobs/:id/parts` | Add part |
| GET | `/api/jobs/:id/parts` | List parts + totalCost + totalValue |
| DELETE | `/api/jobs/:id/parts/:partId` | Remove part |

#### No UI changes this session
Phase 1 is backend-only. The existing `POST /api/quotes/:id/convert-to-job` in `quotes.js` will function correctly against the real table.

#### Hotfixes applied during verification
- `generate_job_number` existed with different return type — added `DROP FUNCTION IF EXISTS` before CREATE
- Pre-existing `jobs` table had fewer columns — added `fix_jobs_missing_columns.sql` migration
- `users` table uses `name` not `full_name` — fixed all JOIN aliases in `jobs.js`

#### Verified
- [x] Migration recorded in schema_migrations
- [x] jobs, job_time_entries, job_parts tables exist
- [x] quotes.converted_to_job_id column exists
- [x] generate_job_number function exists
- [x] GET /api/jobs returns empty list correctly



### Quote Events on Ticket Thread

**State impact analysis confirmed before any code was written.**

#### Notes Enhancements — already done
On inspection, `NewTicketFromNoteModal` and `AddNoteToTicketModal` were fully implemented in both `PersonalNotes.jsx` and `CompanyNotes.jsx` in Session 13 Part 2. No changes required.

#### Files changed
| File | Change |
|---|---|
| `web/routes/quotes.js` | Added `postQuoteEventToThread(ticketId, event, quoteNumber, totalAmount, userId)` helper (non-blocking, errors logged but never surface). Hooked into: (1) CREATE — after COMMIT when `ticket_id` is set; (2) PUT `/:id` — when `validatedData.status === 'sent'`; (3) `POST /:id/accept` — after COMMIT; (4) `POST /:id/decline` — after update succeeds. |
| `web/client/.../TicketDetailViewTabbed.jsx` | Added `quote_event` branch in `ThreadEntry`. Parses `[event]` prefix from body to determine colour: blue = created, purple = sent, green = accepted, red = declined. Displays `DollarSign` icon in a coloured circle + formatted message + timestamp. |

#### Architecture
- `comment_type = 'quote_event'` inserted directly via `db.query` — bypasses Zod enum in `tickets.js` (intentional, internal-only type)
- Body format: `[created|sent|accepted|declined] Quote QT-001 … · £xxx`
- Frontend strips the `[event]` prefix before displaying
- `postQuoteEventToThread` is fire-and-forget after the main DB operation completes — a failure never breaks the quote flow
- No DB migration needed — `comment_type` is a varchar, not a DB-level enum

#### Testing checklist after deploy
- [ ] Create a quote linked to a ticket → ticket thread shows blue "Quote QT-xxx created · £xxx" event row
- [ ] Mark quote status as Sent (via PUT) → thread shows purple "Quote QT-xxx sent to customer · £xxx"
- [ ] Accept a quote → thread shows green "Quote QT-xxx accepted by customer · £xxx"
- [ ] Decline a quote → thread shows red "Quote QT-xxx declined by customer · £xxx"
- [ ] Quote with no `ticket_id` → no thread post, no error
- [ ] Render logs: `[QuoteEvent] Posted 'created' to thread for ticket <id>`
- [ ] Quote action failure does NOT affect quote save (event failure is silent to user)



## Session 17 — 2026-04-11

### AI Quote Top-up from Notes

**State impact analysis confirmed before any code was written.**

#### Files changed
| File | Change |
|---|---|
| `web/routes/quotes-from-ticket.js` | Added `POST /topup-from-ticket`. Accepts `{ ticket_id, since_date }`. Filters comments to `created_at > since_date`. Calls Claude with focused "new notes only" prompt. Returns same `{ line_items }` shape as generate endpoint. No server.js change needed — already mounted at `/api/quotes`. |
| `web/client/.../TicketDetailViewTabbed.jsx` | Added `TopUpPanel` module-level component (blue-accented variant of `GenerateQuotePanel`, reuses `ReviewItemRow`/`ConfidenceDot`). Added `topUpTarget` state. Wired `onTopUp` prop to `<QuotesTab>`. Renders `<TopUpPanel>` when `topUpTarget` is set. |
| `web/client/.../QuotesTab.jsx` | Accepts `onTopUp` prop. Each quote card gains a "Top up from notes" button in a bordered footer row. `e.stopPropagation()` prevents card navigation from firing. Calls `onTopUp(quote.id, quote.quote_number, quote.created_at)`. |
| `web/client/.../QuoteForm.jsx` | Edit-mode fetch `.then()`: after mapping existing line items, checks `sessionStorage('worktrackr_ai_topup_items')`. If present: parses, clears key, maps with `ai_generated: true` / `catalogue_sourced` / `locked: false`, appends to existing rows. Existing rows untouched. |

#### Architecture
- `TopUpPanel` opens from `TicketDetailViewTabbed` (not `QuotesTab`) so `ReviewItemRow`/`ConfidenceDot` are not duplicated
- `QuotesTab` is purely a signal emitter via `onTopUp` — no panel logic inside it
- On confirm: `sessionStorage('worktrackr_ai_topup_items')` written, navigate to `/app/crm/quotes/{quoteId}`
- `QuoteForm` edit mode detects + clears the key on mount — seamless append
- Appended rows carry gold AI badge + existing clear-on-edit badge logic applies identically
- Sub-component rule ✓ — `TopUpPanel` is module-level

#### Testing checklist after deploy
- [ ] Open ticket with an existing quote → Quotes tab shows "Top up from notes" button on each quote card
- [ ] Button click opens blue top-up panel (does NOT navigate to quote)
- [ ] Card click still navigates to quote view (stopPropagation working)
- [ ] Panel header shows quote number
- [ ] Loading text: "Scanning notes added since [DD Mon YYYY]"
- [ ] Ticket with no new notes since quote created → "No new items found…" + Close button only
- [ ] Ticket with new notes → items listed with confidence dots/flags
- [ ] Remove/restore items works as expected
- [ ] "Add to quote" → navigates to quote edit page
- [ ] Quote edit page loads existing line items + new AI rows appended at bottom
- [ ] Appended rows have gold AI badge; editing description clears badge
- [ ] Existing rows have no badges and are unaffected
- [ ] Render logs: `[TopUpFromTicket] Calling Claude for ticket X, N new note(s) since DD Mon YYYY`
- [ ] `[QuoteForm] Appended N top-up item(s) from AI panel` in browser console



## AI Policy (confirmed Session 10)
All AI features use **Anthropic Claude** exclusively (`claude-haiku-4-5-20251001`).
Audio transcription uses **OpenAI Whisper** (`whisper-1`) — speech-to-text only, no viable Anthropic equivalent.
The existing `transcribe.js` uses OpenAI GPT-4 for extraction — must be swapped to Claude before Audio feature ships.
No other AI providers.

---

## Session 16 — 2026-04-11

### AI Quote Generation from Ticket — Phases 1, 2, 3

**State impact analysis confirmed before any code was written.**

#### Files changed
| File | Change |
|---|---|
| `web/routes/quotes-from-ticket.js` | **NEW** — `POST /api/quotes/generate-from-ticket`. Reads ticket, all thread comments (labelled by type/date/author), org product catalogue. Calls Claude (`claude-haiku-4-5-20251001`) with structured prompt. Returns `{ line_items: [...] }` with `description`, `item_type`, `quantity`, `unit`, `unit_price`, `buy_cost`, `supplier`, `product_id`, `confidence` (high/medium/low), `source` (human-readable label), `flagged` (bool), `flag_reason` (string), `catalogue_sourced` (bool). |
| `web/server.js` | 2 lines: `require` + `app.use` for `quotes-from-ticket` route at `/api/quotes`. |
| `web/client/.../TicketDetailViewTabbed.jsx` | Added `Tag`, `AlertTriangle` to imports. Added 3 new module-level components: `ConfidenceDot`, `ReviewItemRow`, `GenerateQuotePanel`. Added `showQuotePanel` state. `handleGenerateQuote` now opens `GenerateQuotePanel` instead of switching to Quotes tab. Panel rendered in JSX alongside `ContactPickerModal`. |
| `web/client/.../QuoteFormTabs.jsx` | Added `useEffect` import. On mount: reads `sessionStorage.worktrackr_ai_quote_prefill`, if present parses it, sets `aiDraftData`, clears the key, and sets `activeTab = 'manual'` — bypasses the AI Generator tab and goes straight to the pre-filled quote form. |
| `web/client/.../QuoteForm.jsx` | Added `Sparkles`, `Tag` imports. `newItem()` gains `ai_generated: false`, `catalogue_sourced: false`, `locked: false`. `LineItemRows` (module-level) shows gold AI badge (Sparkles) and blue Catalogue badge (Tag) in Description cell when flags are set. `updateLineItem` clears both badges + sets `locked: true` on any user edit of a real field. `initialData` loading effect carries through `ai_generated`, `catalogue_sourced`, `locked` from prefill data. `handleSubmit` strips all three badge/lock fields before API call (frontend-only). |

#### Architecture — `GenerateQuotePanel`
- Module-level. Mounts → immediately calls `POST /api/quotes/generate-from-ticket`.
- Three states: `loading` (spinner + "Reading ticket…"), `review` (item list), `error` (retry button).
- Review state: each item shown as `ReviewItemRow` with `ConfidenceDot` (green/amber/red), type badge, qty/unit/price summary, `source` label in italic grey, amber flag banner if `flagged: true`.
- Items with `catalogue_sourced: true` show a blue "Catalogue" badge.
- User can remove items (strikethrough + restore link). Removed items excluded from prefill.
- "Confirm & open quote" writes approved items to `sessionStorage('worktrackr_ai_quote_prefill')` then navigates to `/app/crm/quotes/new?ticket_id=...`.
- Backdrop click closes panel.
- Sub-component rule ✓ — `ConfidenceDot`, `ReviewItemRow`, `GenerateQuotePanel` all module-level.

#### Architecture — Line item lock mechanism
- `ai_generated: true` rows → gold **AI** badge (Sparkles icon) shown above description input.
- `catalogue_sourced: true` rows → blue **Catalogue** badge (Tag icon) shown above description input.
- A row can carry both simultaneously.
- Any user edit to: description, supplier, type, qty, unit, buy price, sell price, discount, VAT, or line notes → both badges cleared, `locked: true` permanently set.
- `_showNotes` toggle does **not** clear badges (it's a UI-only field, not data).
- Manually added rows (via "Add material" / "Add charge") never get badges — `newItem()` defaults to `false`.
- `locked`, `ai_generated`, `catalogue_sourced` are never sent to the API (`handleSubmit` strips them).

#### No DB migration required
All badge/lock state is frontend-only. The backend returns `catalogue_sourced` and `ai_generated` flags in the generate endpoint response; they are never persisted.

#### Testing checklist after deploy
- [ ] Open a ticket with thread notes → click "✦ Generate quote" button in compose area
- [ ] Panel slides in from right — spinner shows "Reading ticket and generating suggestions…"
- [ ] After ~2–5s: list of suggested items appears
- [ ] Each item shows: description, type badge, qty/unit/price, source label (e.g. "from internal note 3 Apr")
- [ ] High confidence items: green dot. Medium: amber. Low: red.
- [ ] Flagged items: amber border + banner with flag_reason
- [ ] Catalogue-matched items: blue "Catalogue" badge
- [ ] Click X on an item → it strikes through with "Restore" link
- [ ] Click "Restore" → item comes back
- [ ] Footer shows correct item count as items are removed
- [ ] Click "Confirm & open quote" → navigates to `/app/crm/quotes/new?ticket_id=...`
- [ ] Quote form opens with pre-filled line items
- [ ] AI-generated items show gold "AI" badge above description
- [ ] Catalogue items show blue "Catalogue" badge
- [ ] Items with both flags show both badges
- [ ] Edit the description on an AI row → both badges disappear immediately
- [ ] Supplier, qty, price, VAT toggle edits all clear badges on badged rows
- [ ] Manually added items (Add material / Add charge) never get badges
- [ ] Save as Draft → quote saves correctly, no badge/lock fields in API payload
- [ ] Render logs: `[GenerateFromTicket] Calling Claude for ticket <id>` then `[GenerateFromTicket] Returning N items`
- [ ] Ticket with no thread notes / sparse description → panel shows "No items could be extracted" message
- [ ] ANTHROPIC_API_KEY absent → error panel with "Try again" (graceful failure)
- [ ] Backdrop click → panel closes without navigating

---

## Session 11 — 2026-04-05

### Stage 1 — Inline Dictation in Notes

**Files created**
| File | Purpose |
|---|---|
| `DictationButton.jsx` | Reusable mic button with live preview box. Web Speech API. `onResult(text)` callback. |

**Files modified**
| File | Change |
|---|---|
| `PersonalNotes.jsx` | Import `DictationButton`. Added below body textarea in `NoteForm`. |
| `CompanyNotes.jsx` | Import `DictationButton`. Added below body textarea in `SharedNoteForm`. |

---

## Session 12 — 2026-04-05

### Audio Stage 2 — Meeting Audio Upload to Ticket Thread

**Files changed**
| File | Change |
|---|---|
| `web/routes/transcribe.js` | New `POST /ticket-note` endpoint; `/extract-ticket` swapped from GPT-4 to Claude |
| `web/routes/tickets.js` | `audio_note` added to `comment_type` enum |
| `web/client/.../TicketDetailViewTabbed.jsx` | Audio tab, `AudioComposePanel`, `AudioNoteEntry` — all module-level |

---

## Session 13 — 2026-04-05

### Audio Stage 3 — Voice Dictation Assistant (Mode 2)

**Files created**
| File | Purpose |
|---|---|
| `web/client/.../VoiceAssistant.jsx` | Floating voice dictation assistant — all sub-components at module level |

**Files modified**
| File | Change |
|---|---|
| `web/routes/transcribe.js` | Added `POST /voice-intent` endpoint |
| `web/client/.../AppLayout.jsx` | Import + render `<VoiceAssistant />` at layout level |
| `web/client/.../TicketDetailViewTabbed.jsx` | `useEffect` sets/clears `window.__worktrackr_current_ticket` |

---

## Session 13 — Part 2 — Notes Enhancements

**Files modified**
| File | Change |
|---|---|
| `web/client/.../PersonalNotes.jsx` | Added `NewTicketFromNoteModal`, `AddNoteToTicketModal` (module-level) |
| `web/client/.../CompanyNotes.jsx` | Same additions |

---

## Session 14 — Ticket Redesign Option A

**Files changed**
| File | Change |
|---|---|
| `web/routes/tickets.js` | `contact_id` added to schema; GET `/:id` JOINs contacts; new `POST /:id/match-contact` |
| `web/client/.../TicketDetailViewTabbed.jsx` | Full rewrite — Option A layout with customer strip, compose at top, ✦ Generate quote button |

---

## Session 15 — 2026-04-11

### Quote Line Items Redesign + 6 Completions

**Files changed**
| File | Change |
|---|---|
| `web/client/.../QuoteForm.jsx` | Full line items rewrite. Unit, discount, line notes, margin panel. All sub-components module-level. |
| `web/client/.../QuoteDetails.jsx` | Full rewrite. `LineItemsTable`, `MarginPanel`, footer totals. |
| `web/client/.../SendQuoteModal.jsx` | Auto-generated email body, copy buttons. |
| `web/routes/quotes.js` | `unit`, `line_notes`, `buy_cost`, `supplier` in Zod schemas + SQL. VAT-on-zero bug fixed. PDF overhauled. |
| `web/migrations/add_quote_lines_supplier.sql` | Adds `supplier` to `quote_lines` |
| `web/migrations/add_quote_lines_notes.sql` | Adds `line_notes` to `quote_lines` |

---

## Rules for Claude — must follow every session

1. **Read every file being changed in full** before writing anything
2. **State impact explicitly** — which other files import or depend on the changed file
3. **Never change function signatures, export shapes, or API response structures** without checking every consumer
4. **Produce both files** if a fix in one requires a matching change in another
5. **Sub-component rule:** Never define `const Foo = () => ...` inside a parent function body. Use inline JSX variables, plain render functions, or module-level components.
6. **Delivery rule:** After each phase, deliver all changed code files + SESSION-LOG.md + ROADMAP.md together in one batch.
7. **AI policy:** All AI reasoning uses Anthropic Claude (`claude-haiku-4-5-20251001`). Whisper (`whisper-1`) for audio only. No other AI providers.

### Goal: every pushed commit leaves the app fully working with no regressions.
