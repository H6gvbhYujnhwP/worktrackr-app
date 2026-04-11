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
- **Last session:** 2026-04-11 (Session 15)
- **Live URL:** https://worktrackr.cloud
- **Deploy platform:** Render (auto-deploys on GitHub push)
- **Last fixes applied:** Quote Line Items Redesign + 6 completions (unit, discount, line notes, margin panel, PDF overhaul, email copy-paste)
- **Next priority:** AI Quote Generation from Ticket (full flow with review panel)

---

## AI Policy (confirmed Session 10)
All AI features use **Anthropic Claude** exclusively (`claude-haiku-4-5-20251001`).
Audio transcription uses **OpenAI Whisper** (`whisper-1`) — speech-to-text only, no viable Anthropic equivalent.
The existing `transcribe.js` uses OpenAI GPT-4 for extraction — must be swapped to Claude before Audio feature ships.
No other AI providers.

---

## Session 11 — 2026-04-05

### Stage 1 — Inline Dictation in Notes

**Approach agreed before coding:**
- Audio Feature broken into 3 stages: (1) inline dictation in Notes, (2) Audio tab on tickets (Whisper + Claude), (3) floating dictation assistant (Mode 2)
- Stage 1 uses Web Speech API — browser-native, free, no server
- `DictationButton.jsx` designed as a reusable module so Stage 3 can build on it

**Files created**
| File | Purpose |
|---|---|
| `DictationButton.jsx` | Reusable mic button with live preview box. Web Speech API. `onResult(text)` callback. |

**Files modified**
| File | Change |
|---|---|
| `PersonalNotes.jsx` | Import `DictationButton`. Added below body textarea in `NoteForm`. |
| `CompanyNotes.jsx` | Import `DictationButton`. Added below body textarea in `SharedNoteForm`. |

**DictationButton behaviour**
- Tap once → starts recording, button turns red + pulses, "Listening…" indicator appears
- Live preview box appears below: interim text shown in grey italic as user speaks, committed text in solid black
- Tap again → stops, text appended to note body (`prev + ' ' + text`)
- X button on preview clears the current session without saving
- `onerror` handles `not-allowed` (mic permission denied) with a user-friendly message
- `no-speech` and `aborted` errors silently ignored
- If `window.SpeechRecognition` / `window.webkitSpeechRecognition` unavailable → component returns null
- `lang: 'en-GB'` set

**Next: Stage 2 — Audio tab on tickets (Mode 1)**
- New "Audio" tab in `TicketDetailViewTabbed.jsx`
- Upload audio file OR paste transcript text
- Whisper (`whisper-1`) transcribes audio
- Claude (`claude-haiku-4-5-20251001`) extracts structured notes: summary, action items, key details, follow-ups
- Mandatory review step before saving
- Saves to ticket notes

---



### Part 1 — Roadmap decisions (no code)
- AI Phase 4 and Phase 5 removed
- Audio Feature (two modes) specced and added to roadmap
- Notes feature (Personal + Company) specced and added to roadmap

### Part 2 — Notes Feature (initial build)

#### Files created
| File | Location | Purpose |
|---|---|---|
| `add_notes_tables.sql` | `web/migrations/` | Creates `personal_notes`, `shared_notes`, `shared_note_versions` tables |
| `notes.js` | `web/routes/` | All 7 REST endpoints for both note types |
| `PersonalNotes.jsx` | `web/client/.../components/` | My Notes view |
| `CompanyNotes.jsx` | `web/client/.../components/` | Company Notes view |

#### Files modified
| File | Change |
|---|---|
| `server.js` | 2 lines: notes route registered |
| `Sidebar.jsx` | company-notes + my-notes added to MAIN_ITEMS |
| `AppLayout.jsx` | Both views in PAGE_TITLES + VIEW_TO_PAGE |
| `Dashboard.jsx` | PersonalNotes + CompanyNotes imported + view cases added |

### Part 3 — Notes UI redesign (table layout)

User reviewed the initial card-based design and requested a more compact layout for large note counts. Table view (Option C from three options presented) selected.

**Both components rewritten** — `PersonalNotes.jsx` and `CompanyNotes.jsx` — with the following changes:

- `NoteCard` / `SharedNoteCard` removed — replaced with `NoteRow` / `SharedNoteRow` (module-level table row components)
- Each note is a single compact table row (~36px tall)
- Body text shown as truncated preview inline next to the title (greyed out, hidden on mobile)
- Clicking the edit (pencil) button expands an inline form as a `<tr colSpan>` below that row — no navigation, no modal
- Due date / type badge / category / author visible at a glance as table columns
- Pinned rows get a subtle amber background tint (`bg-[#fffdf5]`)
- `table-fixed` layout prevents column blowout
- All API calls, state management, filter tabs, overdue banner, version history modal, and admin permission logic unchanged

#### API endpoints (unchanged from initial build)
- `GET/POST/PATCH/DELETE /api/notes/personal`
- `GET/POST/PATCH/DELETE /api/notes/shared`
- `GET /api/notes/shared/:id/versions`

#### Testing checklist after deploy
- [ ] My Notes: list renders as a compact table, not cards
- [ ] My Notes: each row shows title + truncated body preview + due date badge
- [ ] My Notes: click pencil icon → form expands inline below that row
- [ ] My Notes: save edit → row updates in place, form collapses
- [ ] My Notes: complete toggle, pin toggle, delete all work from row actions
- [ ] My Notes: overdue banner, filter tabs still work
- [ ] Company Notes: list renders as table with Type / Note / Category / Author columns
- [ ] Company Notes: pinned rows have amber tint
- [ ] Company Notes: edit expands inline, version history modal still opens
- [ ] Company Notes: admin-only pin button visible only to admins
- [ ] 50+ notes scroll comfortably without excessive vertical space

---

---

## Session 12 — 2026-04-05

### Audio Stage 2 — Meeting Audio Upload to Ticket Thread

**Approach:**
- New "Audio" compose tab added to the ticket conversation thread (4th tab alongside Update / Internal note / Request approval)
- Two input modes: upload audio file (drag-and-drop or browse) OR paste transcript text
- Backend: new `POST /api/transcribe/ticket-note` endpoint — Whisper for audio, Claude for extraction
- Mandatory review step before posting — user sees extracted sections before committing
- Posts to thread as `comment_type: 'audio_note'` — rendered as a distinct purple card

**Files changed**

| File | Change |
|---|---|
| `web/routes/transcribe.js` | New `POST /ticket-note` endpoint; `/extract-ticket` swapped from GPT-4 to Claude (AI policy compliance) |
| `web/routes/tickets.js` | `audio_note` added to `comment_type` enum |
| `web/client/.../TicketDetailViewTabbed.jsx` | Audio tab, `AudioComposePanel`, `AudioNoteEntry` — all module-level |

**Backend — `POST /api/transcribe/ticket-note`**
- Accepts multipart FormData: optional `audio` file (mp3/m4a/wav/webm, ≤25 MB) OR `transcript_text` field
- If audio present → Whisper (`whisper-1`, response_format: text)
- Either way → Claude (`claude-haiku-4-5-20251001`) extracts: summary, action_items, key_details, decisions, follow_ups as JSON
- If Claude JSON parse fails → graceful fallback (raw text as summary, empty arrays)
- Returns `{ transcript, extraction, formatted_body, filename }`
- `formatted_body` is the pre-formatted text that gets stored in `comments.body`

**Frontend — AudioComposePanel (module-level)**
- State machine: `idle` → `processing` → `review`
- Idle: mode toggle (Upload / Paste), file drag-and-drop zone with validation, or textarea
- Processing: spinner with context-appropriate message
- Review: extracted sections in labelled cards, collapsible full transcript, "Post meeting note" button (purple)
- On post: calls `POST /api/tickets/:id/comments` with `comment_type: 'audio_note'`, calls `onPost(comment)` to append to thread, resets to idle

**Frontend — AudioNoteEntry (module-level)**
- Renders `audio_note` thread entries as a purple/indigo card
- Parses the stored `formatted_body` text into sections (Summary, Action Items, Key Details, Decisions, Follow-ups)
- Each section has colour-coded label
- Collapsible "Show full transcript" section at the bottom
- "Meeting note" badge (purple, mic icon) in the thread header

**Sub-component rule — confirmed compliant:**
- `ThreadEntry` — module-level ✓
- `AudioNoteEntry` — module-level ✓  
- `AudioComposePanel` — module-level ✓
- `DateDivider` — module-level ✓

**No migration needed** — `audio_note` is a new enum value on the existing `comment_type` column (VARCHAR, no constraint at DB level). The Zod schema on the server is the only gatekeeper.

**Testing checklist after deploy**
- [ ] Click "Audio" tab in ticket compose area — upload/paste modes appear
- [ ] Upload mode: drag-and-drop an MP3 — filename and size shown, X to remove
- [ ] Upload mode: non-audio file rejected with error message
- [ ] File >25 MB rejected with error message
- [ ] Click "Transcribe & extract" — spinner shows, both Whisper and Claude called
- [ ] Review screen: Summary, Action Items, Key Details, Decisions, Follow-ups shown (empty sections hidden)
- [ ] "Show full transcript" expands the raw transcript
- [ ] "Start over" resets to upload screen
- [ ] "Post meeting note" — purple card appears in thread immediately
- [ ] Audio note card: purple badge "Meeting note", sections rendered correctly
- [ ] "Show full transcript" toggle works in thread card
- [ ] Paste mode: paste text, click "Extract notes" — no Whisper call, Claude only
- [ ] Existing Update / Internal note / Request approval tabs unaffected
- [ ] `extract-ticket` endpoint now uses Claude (check Render logs for `[Extract Ticket] Calling Claude…`)

**Next priority:** Audio Stage 3 — Voice Dictation Assistant (Mode 2): floating hold-to-record button, Claude routes intent, mandatory review, TTS confirmation loop.

## Session 13 — 2026-04-05

### Audio Stage 3 — Voice Dictation Assistant (Mode 2)

**Approach:**
- Floating gold mic FAB rendered globally inside `AppLayout`, visible on every screen
- Tap to open panel → tap to record (Web Speech API, max 60s auto-stop) → Claude routes intent → mandatory review with TTS confirmation → save to correct API
- `window.__worktrackr_current_ticket` global signal set/cleared by `TicketDetailViewTabbed` so the assistant knows which ticket is open

**Files created**
| File | Purpose |
|---|---|
| `web/client/.../VoiceAssistant.jsx` | Floating voice dictation assistant — all sub-components at module level |

**Files modified**
| File | Change |
|---|---|
| `web/routes/transcribe.js` | Added `POST /voice-intent` endpoint — Claude intent routing with context |
| `web/client/.../AppLayout.jsx` | Import + render `<VoiceAssistant currentView user />` at layout level |
| `web/client/.../TicketDetailViewTabbed.jsx` | `useEffect` sets/clears `window.__worktrackr_current_ticket` |

**Backend — `POST /api/transcribe/voice-intent`**
- Accepts: `{ transcript, context: { currentView, userName, dateTime, currentTicketId, openTickets[] } }`
- Builds a rich context string, sends to Claude (`claude-haiku-4-5-20251001`)
- Returns: `{ intent, confidence, ticket_id, confirmation_message, data }`
- Intents: `ticket_note | new_ticket | personal_note | personal_reminder | company_note | crm_calendar | ticket_calendar | unknown`
- Graceful fallback if JSON parse fails → `intent: 'unknown'`

**Frontend — VoiceAssistant (module-level architecture)**

All sub-components are module-level (sub-component rule ✓):
- `RecordingPanel` — live waveform timer, elapsed arc, live transcript preview
- `ProcessingPanel` — Claude spinner
- `ReviewPanel` — intent badge, editable fields, TTS confirm, save/retry/cancel
- `SuccessToast` — brief success flash
- Field components: `TicketNoteFields`, `NewTicketFields`, `PersonalNoteFields`, `CompanyNoteFields`, `CrmCalendarFields`, `TicketCalendarFields`
- `IntentBadge` — coloured badge per intent type
- `FieldLabel` — shared label style

**State machine:**
`idle → recording → processing → review → saving → success → idle`

**TTS confirmation loop:**
- `ReviewPanel` calls `speak(confirmation_message)` on mount (browser-native `speechSynthesis`, `en-GB`)
- "🔊 Hear again" button re-speaks on demand
- `stopSpeaking()` called on cancel, retry, and success

**Context sent to Claude:**
- Current screen name
- Current user name
- Date/time (formatted, BST-aware)
- Current ticket ID (from `window.__worktrackr_current_ticket` if on ticket detail)
- Up to 15 recent open tickets (id, title, status)

**Save routing:**
| Intent | API call |
|---|---|
| `ticket_note` | `POST /api/tickets/:id/comments` |
| `new_ticket` | `POST /api/tickets` |
| `personal_note` | `POST /api/notes/personal` |
| `personal_reminder` | `POST /api/notes/personal` (with due_date) |
| `company_note` | `POST /api/notes/shared` |
| `crm_calendar` | `POST /api/crm-events` |
| `ticket_calendar` | `POST /api/calendar` |

**Testing checklist after deploy**
- [ ] Gold mic FAB appears bottom-right on all screens
- [ ] FAB hidden on unsupported browsers (non-Chrome/Edge) — VoiceAssistant renders null
- [ ] Tap FAB → panel slides open, idle state shown with examples
- [ ] Tap "Start recording" → timer arc counts up, live transcript preview updates
- [ ] Speak "Add a note to the printer ticket saying the router has been replaced"
- [ ] Tap "Stop recording" → "Understanding your request…" spinner shows
- [ ] Review panel: intent badge shows "Note on ticket", confirmation_message shown
- [ ] Browser speaks the confirmation message automatically (Chrome)
- [ ] "🔊 Hear again" button re-speaks
- [ ] Ticket selector pre-populated with matched ticket
- [ ] Note text field pre-populated with extracted body
- [ ] Edit a field → change persists on confirm
- [ ] "Confirm & save" → saving spinner → success tick, panel auto-closes
- [ ] Comment appears in ticket thread immediately (on refresh)
- [ ] "Try again" from review → back to idle
- [ ] Cancel at any stage → panel closes cleanly
- [ ] "Create an urgent ticket for the server room overheating"
- [ ] Review: new_ticket intent, title + description + priority=urgent pre-filled
- [ ] "Remind me to call John Smith next Friday"
- [ ] Review: personal_reminder intent, due_date pre-filled to next Friday
- [ ] "Share a knowledge base note about the new VPN setup procedure"
- [ ] Review: company_note intent, note_type=knowledge
- [ ] Viewing a ticket → say "add a note to this ticket" → ticket_id pre-filled
- [ ] Render logs: `[VoiceIntent] Intent: ticket_note confidence: 0.9`

**Sub-component rule — confirmed compliant:**
All components (`RecordingPanel`, `ProcessingPanel`, `ReviewPanel`, etc.) defined at module level ✓

**Next priority:** Jobs Module (DB schema, API, list view, detail page, job creation)


AI Phase 3 — Smart Summaries. `summaries.js`, `TicketDetailViewTabbed.jsx`, `QuoteDetails.jsx`.

## Session 8 — 2025-04-04
UI Push 3 — QuoteFormTabs, CreateTicketModal, IntegratedCalendar, BookingCalendar.

## Session 7 — 2025-04-04
Sub-component anti-pattern sweep. CRM contacts save bugs fixed.

## Session 6 — 2025-04-04
Dashboard focus fix. ContactManager modal focus fix. Polling interval removed.

## Session 5 — 2025-04-03
UI Push 2 complete. AI Phase 1 — Anthropic email classifier.

## Sessions 1–4 — 2025-04-01 to 2025-04-02
Auth, calendar rewrite, UI Pushes 1–2, bulk ops hotfix.

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

---

### Hotfix — Company Notes UX bugs (Session 10, Part 4)

**Root cause of both issues:**
The session endpoint returns `membership.role = 'admin'` for the first org user, so the admin check was working correctly. The type dropdown WAS showing in the form. The user named a note "knowledge 1" but didn't change the type selector from the default "Note" — the small dropdown was easy to overlook.

**Fix 1 — Type selector redesign (CompanyNotes.jsx)**
Replaced the small `<select>` dropdown with a visible three-button pill group (General note / Knowledge base / Announcement), each with an icon. The selected type is highlighted in gold. Impossible to miss or accidentally leave on the wrong value.

**Fix 2 — Tab rename (CompanyNotes.jsx)**
"Notes" tab renamed to "General". "Notes" implied "all notes", but it actually filtered to `note_type = 'note'` (i.e. general notes only). Renaming to "General" makes the distinction clear: All / General / Knowledge / Announcements.

**File changed:** `CompanyNotes.jsx` only. No backend, migration, or other file changes.

**Note for user:** The existing "knowledge 1" note was saved with type "note" and will continue to appear under "General", not "Knowledge". Edit it → change the pill to "Knowledge base" → save to reclassify it.

---

### Hotfix — New note defaults to active tab type (Session 10, Part 5)

**Issue:** Clicking "New note" while on the Knowledge tab opened the form defaulting to "General note" type. Same problem on Announcements tab.

**Fix:** One line in `CompanyNotes.jsx`. The create `<SharedNoteForm>` now receives `initial={{ note_type: filterType === 'all' ? 'note' : filterType }}`. The form already reads `initial?.note_type ?? 'note'` as its starting state, so the pill selector pre-selects the correct type automatically. No backend change.

Behaviour after fix:
- On "All" tab → new note defaults to General note
- On "General" tab → new note defaults to General note  
- On "Knowledge" tab → new note defaults to Knowledge base
- On "Announcements" tab → new note defaults to Announcement

---

## Session 11 — Stage 2 — Ticket Redesign Option B

### Files changed
| File | Change |
|---|---|
| `web/migrations/add_comment_type.sql` | New migration — adds `comment_type VARCHAR(30)` to `comments` table (`update` / `internal` / `system` / `approval_request`) |
| `web/routes/tickets.js` | `commentSchema` updated to accept `comment_type`. `INSERT` updated to store it. `RETURNING` clause now includes `author_name` and `author_email` via subquery so the new comment can be appended to the thread without a refetch. |
| `web/client/src/app/src/components/TicketDetailViewTabbed.jsx` | Full rewrite — Option B layout |

### What changed in TicketDetailViewTabbed
- **Removed:** 6-tab layout (Details, Scheduling, Safety, Quotes, Comments, Attachments)
- **Added:** Job description amber strip — always pinned at top, editable inline with pencil icon, shows "edited" badge when modified but not yet saved
- **Added:** Conversation thread — fetches comments from `GET /api/tickets/:id` on mount, grouped by date with dividers, auto-scrolls to latest
- **Added:** `ThreadEntry` (module-level) — renders 4 distinct styles: system event (slim row), approval request (amber card with Approve/Decline buttons), internal note (amber-tinted, "Internal" badge), standard update (white card)
- **Added:** Compose area — 3 tabs: Update / Internal note / Request approval. Background tints change per tab. Ctrl+Enter to post. Posts to `POST /api/tickets/:id/comments` with `comment_type`.
- **Added:** 3-button view toggle below job strip: Conversation / Quotes / Safety — Quotes and Safety load their existing sub-components (`QuotesTab`, `SafetyTab`)
- **Added:** Right sidebar — Workflow stage tracker (5 stages, current derived from ticket status), Details (priority/status/sector/scheduled date/duration), Assignee, Metadata, Actions (Save + Summarise)
- **Preserved exactly:** all `updateTicket()` call shape, all form state & `onChange` handlers, `handleSummarise()`, SafetyTab, QuotesTab, `onBack` prop, `useSimulation()` usage
- **Removed:** `alert()` on save (replaced by silent state update + error display)
- **Sub-component rule:** `ThreadEntry` and `DateDivider` defined at module level

### Deploy steps
1. Run migration: `web/migrations/add_comment_type.sql` against production DB
2. Deploy code (Render auto-deploys on push)

### Testing checklist
- [ ] Open a ticket — job description strip shows amber, description visible
- [ ] Click pencil → textarea opens, edit text, "edited" badge appears, pencil closes on click
- [ ] Save changes → "edited" badge disappears, form fields reflect saved state
- [ ] Conversation tab loads with spinner then shows empty state or existing comments
- [ ] Post an Update → appears in thread immediately with correct author name
- [ ] Post an Internal note → amber-tinted bubble, "Internal" badge visible
- [ ] Post a Request approval → yellow card with Approve/Decline buttons
- [ ] Switch to Quotes tab → QuotesTab renders
- [ ] Switch to Safety tab → SafetyTab renders
- [ ] Right sidebar: workflow dots reflect current ticket status
- [ ] Right sidebar: priority/status/sector selects update form on change
- [ ] Save changes button saves all sidebar form fields correctly
- [ ] Summarise ticket button still works, summary appears below button
- [ ] Back button returns to ticket list

### Next priority
Audio Stage 2 — "Audio" compose option in the ticket thread. Upload audio OR paste transcript → Whisper → Claude extraction → review screen → posts one combined note to thread.

## Session 13 — Part 2 — Notes Enhancements

### Files modified
| File | Change |
|---|---|
| `web/client/.../PersonalNotes.jsx` | Added `NewTicketFromNoteModal`, `AddNoteToTicketModal` (module-level). Two new ghost buttons on every `NoteRow`. Modal state in `PersonalNotes`. |
| `web/client/.../CompanyNotes.jsx` | Same additions. Two new ghost buttons on every `SharedNoteRow`. Modal state in `CompanyNotes`. |

### New module-level components (both files)
- `NewTicketFromNoteModal` — shows editable title pre-filled from note, note body shown as read-only description preview. POSTs to `POST /api/tickets` with `{ title, description: note.body, priority: 'medium' }`. Success state shows ticket reference. Sub-component rule ✓
- `AddNoteToTicketModal` — fetches open tickets via `GET /api/tickets?limit=50`, searchable list, selected ticket highlighted gold. POSTs note content to `POST /api/tickets/:id/comments` with `comment_type: 'internal'`. If note has a title, body is posted as `**Title**\n\nBody`. Success state shown before close. Sub-component rule ✓

### New row actions
Both `NoteRow` (PersonalNotes) and `SharedNoteRow` (CompanyNotes) gain two new ghost buttons in the actions cell:
- `TicketIcon` button — opens `NewTicketFromNoteModal`
- `CornerUpRight` button — opens `AddNoteToTicketModal`
Actions column widened from `w-24`/`w-28` to `w-32`/`w-36` to fit the extra buttons.

### No backend changes required
Both actions use existing endpoints: `POST /api/tickets` and `POST /api/tickets/:id/comments`. No migrations. No new routes.

### Testing checklist after deploy
- [ ] My Notes: two new icon buttons visible on each row (ticket icon + corner arrow)
- [ ] My Notes: click ticket icon → modal opens with note title pre-filled as ticket title
- [ ] My Notes: edit title in modal before confirming
- [ ] My Notes: confirm → ticket created, success screen shows reference
- [ ] My Notes: click corner arrow → ticket picker modal opens, tickets load
- [ ] My Notes: type in search → list filters in real time
- [ ] My Notes: select ticket (gold highlight) → "Add to ticket" button enables
- [ ] My Notes: confirm → success screen, comment posted as internal note
- [ ] My Notes: open ticket in ticket view → internal note appears in thread with note title bolded
- [ ] Company Notes: same flow works for shared notes
- [ ] Company Notes: any staff member can use both actions (not admin-only)
- [ ] No regression to existing note actions (pin, edit, delete, version history)

### Sub-component rule — confirmed compliant
All new components defined at module level ✓

### Next session priorities (superseded — see Session 14 below)

---

## Session 15 — 2026-04-11

### Quote Line Items Redesign

**Files changed**
| File | Change |
|---|---|
| `web/client/.../QuoteForm.jsx` | Full rewrite of line items section. All other sections (Quote Information, Terms & Conditions, Internal Notes, action buttons) unchanged. |
| `web/routes/quotes.js` | (1) `item_type` enum expanded to include `material`, `expense`, `subcontractor` in both `createQuoteSchema` and `updateLineItemsSchema`. (2) `buy_cost` and `supplier` added to both Zod schemas. (3) All 4 INSERT/UPDATE SQL statements updated to persist `buy_cost` and `supplier` (create, update, new item during edit, duplicate-quote copy). |
| `web/migrations/add_quote_lines_supplier.sql` | New migration — adds `supplier VARCHAR(255)` to `quote_lines` (`buy_cost` already existed from `enhance_quotes_for_ai_v2.sql`). |

**New module-level components in QuoteForm.jsx (sub-component rule ✓)**
- `VatPill` — Ex / +VAT pill toggle per line
- `LineItemRow` — single table row with all 9 visible fields
- `SectionHeaderRow` — section divider with icon, item count, "Add" button
- `EmptySectionRow` — placeholder row when section has no items
- `QuoteTotals` — live footer totals block

**New line item state shape**
```js
{
  product_id: null,
  description: '',
  supplier: '',           // new
  item_type: 'material',  // was 'parts'; now: material/labour/expense/subcontractor
  quantity: 1,
  buy_price: 0,           // new (maps to DB column buy_cost)
  unit_price: 0,          // sell price (unchanged in DB/API)
  vat_enabled: false,     // new (maps to tax_rate: 0 or 20 on submit)
  discount_percent: 0,
}
```

**Two-section layout**
- Materials & parts — items where `item_type === 'material'` (or legacy `'parts'`)
- Labour & other charges — items where `item_type !== 'material'`
- Section is derived from `item_type`; "Add material" defaults to `material`, "Add charge" defaults to `labour`
- Changing the type dropdown moves the row between sections on next render

**Table columns** (responsive — some hidden on small/medium screens)
`Description · Supplier (sm+) · Type (md+) · Qty · Buy£ (lg+) · Sell£ · Total · Profit (lg+) · VAT (sm+) · Del`

**Sell price red rule:** cell text turns red if `unit_price > 0 && unit_price < buy_price`

**VAT logic:** `vat_enabled: true` → `tax_rate: 20` sent to API. `vat_enabled: false` → `tax_rate: 0`. VAT total in footer = sum of vat-enabled lines × 20%.

**Footer totals**
- "Total buy-in" row hidden until at least one line has a buy price > 0
- "Profit" row: green background if ≥ 0, red if negative
- Margin % shown in brackets

**Edit mode loading** — `buy_cost` from DB mapped to `buy_price` on client; `tax_rate > 0` mapped to `vat_enabled: true`

**Deploy steps**
1. Run migration: `web/migrations/add_quote_lines_supplier.sql` against production DB
2. Push code — Render auto-deploys

**Testing checklist after deploy**
- [ ] Create new quote: Materials section shows with "Add material" button, Labour section shows with "Add charge" button
- [ ] Click "Add material" → new row appears in Materials section with type=Material
- [ ] Click "Add charge" → new row appears in Labour section with type=Labour
- [ ] Type in Description field → text stays, no focus loss
- [ ] Fill Supplier, change Type dropdown → row stays in correct section
- [ ] Enter Qty and Sell price → Total auto-updates
- [ ] Enter Buy price → Profit column updates; margin % appears in footer
- [ ] Set Sell price below Buy price → sell price cell turns red
- [ ] Click "Ex" VAT pill → flips to "+VAT" (gold), VAT total in footer increases
- [ ] Click "+VAT" → reverts to "Ex", VAT total decreases
- [ ] Footer: Total buy-in appears once any buy price entered
- [ ] Footer: Subtotal ex VAT, VAT total, Total inc VAT all correct
- [ ] Footer: Profit row green/red correctly
- [ ] Delete row (hover → trash appears) → row removed; minimum 1 row enforced
- [ ] Changing type to "Labour" on a Materials row → row moves to Labour section
- [ ] Load Template → items populate, template terms apply
- [ ] Save as Draft → quote saved, redirect to QuoteDetails
- [ ] Edit existing quote → buy_price, supplier, vat_enabled all load from DB correctly
- [ ] No regressions in Quote Information, Terms, Internal Notes, or action buttons

### Next session priorities
1. AI Quote Generation from Ticket — full flow with review panel
2. Audio Mode 2 (floating voice assistant) — must not be forgotten

### Quote Completions — 6 improvements (same session)

**Files changed**
| File | Change |
|---|---|
| `web/client/.../QuoteForm.jsx` | Added: `unit` (datalist: hrs/days/ea/m/m²/m³/kg/set/lot/pack/visit), `discount_percent` (Disc% column), `line_notes` (expandable amber sub-row, toggled by 🗒 sticky-note icon — gold if notes present). `calcLineTotal` and `calcLineProfit` now account for discount. `newItem()` and all load/save paths updated. Sub-component rule: `LineItemRows` returns Fragment (data row + optional notes sub-row). |
| `web/client/.../QuoteDetails.jsx` | Full rewrite. New module-level `LineItemsTable` — grouped by Materials/Labour, shows unit, discount%, VAT badge, line notes in italic sub-row. New module-level `MarginPanel` — collapsible "Internal — Margin Analysis" section: per-line revenue/cost/profit/margin%, total row with overall margin. Footer totals now show Subtotal ex VAT / VAT (20%) / Total inc VAT (computed client-side from line items). Fixed: contact name fallback chain, duplicate now copies all new fields. |
| `web/client/.../SendQuoteModal.jsx` | Auto-generates professional email body from quote data on mount. Body is fully editable textarea. Two copy buttons (banner + label). "Copy to Clipboard" gold button — flashes green "Copied!". "Send via SMTP" button — attempts `/api/quotes/:id/send` with clear error if SMTP not configured. Subject pre-filled from quote number + title. |
| `web/routes/quotes.js` | (1) `unit` and `line_notes` added to Zod schemas. (2) All 4 INSERT/UPDATE SQL statements updated. (3) **VAT-on-zero bug fixed** — `(item.tax_rate || 20)` → `(item.tax_rate != null ? item.tax_rate : 20)` in `calculateQuoteTotals`. (4) PDF overhauled: new column layout (Description/Unit/Qty/Price/Total), line notes shown italic below each item, discount shown as "-x%" on price, totals now show Subtotal ex VAT / VAT (20%) / Total inc VAT. |
| `web/migrations/add_quote_lines_notes.sql` | New — adds `line_notes TEXT` to `quote_lines`. |

**Pending DB migration (run in Render shell)**
```bash
node -e "const db = require('./shared/db'); db.query('ALTER TABLE quote_lines ADD COLUMN IF NOT EXISTS line_notes TEXT').then(()=>{console.log('Done');process.exit(0)}).catch(e=>{console.error(e);process.exit(1)})"
```

**Testing checklist after deploy**
- [ ] Line items form: Unit column visible (sm+), type "hrs" → saved to DB
- [ ] Disc% column visible (md+), enter 10 → line total reduces, footer updates
- [ ] Click sticky-note icon → amber sub-row expands with textarea
- [ ] Enter line notes → icon turns gold
- [ ] Save quote → unit, discount, line_notes all persisted
- [ ] Edit quote → all three fields load back correctly
- [ ] QuoteDetails: Materials & parts / Labour sections shown
- [ ] QuoteDetails: unit shown in Unit column, discount shown as "-10%"
- [ ] QuoteDetails: +VAT badge on VAT-enabled lines
- [ ] QuoteDetails: line notes shown in italic below item row
- [ ] QuoteDetails: footer shows Subtotal ex VAT / VAT / Total inc VAT (not old Subtotal/Tax/Total)
- [ ] QuoteDetails: Margin Analysis section collapsed by default
- [ ] Margin Analysis: click to expand → per-line revenue, cost, profit, margin%
- [ ] Margin Analysis: total row shows overall margin%
- [ ] Margin Analysis: if no buy costs entered, profit column shows —
- [ ] Send modal: opens with professional email body pre-filled
- [ ] Send modal: body includes quote ref, title, all items grouped, totals
- [ ] Send modal: "Copy Email" button in banner copies text, flashes green
- [ ] Send modal: "Copy to Clipboard" footer button also works
- [ ] PDF: Unit column present, notes below item in italics, totals show ex-VAT/VAT/inc-VAT

---

## Session 14 — Ticket Redesign Option A

### Files changed
| File | Change |
|---|---|
| `web/routes/tickets.js` | (1) `contact_id` added to `updateTicketSchema`. (2) GET `/:id` now JOINs `contacts` table — returns `contact_name`, `contact_email`, `contact_phone`, `contact_person`, `contact_type` alongside ticket data. (3) New `POST /:id/match-contact` endpoint — calls Claude to scan ticket title + description against org's contacts list, returns `{ matched_contact_id, contact_data, mentioned_name, confidence }`. Graceful fallback if `ANTHROPIC_API_KEY` absent. |
| `web/client/.../TicketDetailViewTabbed.jsx` | Full rewrite — Option A layout |

### What changed in TicketDetailViewTabbed

**1. Customer / contact strip**
- Persistent bar directly below title bar — appears on every ticket
- Four UI states (all module-level `CustomerStrip` component):
  - **loading** — subtle spinner + "Searching for matching customer…" while AI runs
  - **matched** — business name, contact person, phone (tel: link), email (mailto: link). Green "✦ AI matched" badge if auto-matched by Claude. "Change" + unlink (×) buttons
  - **hint** — amber bar: "[Name] mentioned — not in your database." with "Add customer" button and dismiss ×. Shown when Claude detects a name but finds no match in the CRM
  - **none / empty** — ghost dashed "Link customer / contact" button

**AI matching behaviour**
- Triggers once per ticket open when `contact_id` is null
- Calls `POST /api/tickets/:id/match-contact` (server-side Claude call — API key never exposed to client)
- Confident match (`confidence: 'high'`) → auto-links, saves `contact_id` to DB silently via `PUT /api/tickets/:id`, shows green badge
- Name detected but no CRM match (`confidence: 'low'`) → amber hint bar
- No name (`confidence: 'none'`) or API key absent → ghost link button

**Contact picker modal** (`ContactPickerModal` — module-level)
- Opens from "Link customer", "Add customer", or "Change" buttons
- Fetches `/api/contacts`, searchable by name/email
- Selected row highlighted gold with checkmark
- Confirms → calls `PUT /api/tickets/:id` with `contact_id`, updates strip immediately

**2. Compose area moved to top**
- Compose tabs (Update / Internal note / Request approval / Audio) now appear directly below the job description strip, ABOVE the conversation thread
- Thread scroll area sits below the view toggle (Conversation / Quotes / Safety)
- Empty state updated: "No updates yet — post the first one **above**"

**3. ✦ Generate quote button**
- Sits in the top-right of the compose tab row (gold background, Sparkles icon)
- Currently navigates to the Quotes tab — wired up ready for AI Quote Generation flow (next roadmap item)
- Sub-component rule ✓ — all new components at module level

### No migration required
`contact_id UUID REFERENCES contacts(id)` column already present from `add_ticket_extended_fields.sql`. No new DB changes needed.

### Sub-component rule — confirmed compliant
`ContactPickerModal`, `CustomerStrip`, `ThreadEntry`, `AudioNoteEntry`, `AudioComposePanel`, `DateDivider` — all module-level ✓

### Testing checklist after deploy
- [ ] Open a ticket with no linked contact → strip shows "Link customer / contact" ghost button (or AI hint/match)
- [ ] If ticket title/description mentions a CRM contact name → strip briefly shows "Searching…" then snaps to matched state with green "AI matched" badge
- [ ] If name mentioned but not in CRM → amber hint bar with "Add customer" button and dismiss
- [ ] Click "Link customer" → picker modal opens, search works, select a contact → strip populates
- [ ] Linked contact: business name, person, phone (tel:), email (mailto:) all show
- [ ] "Change" button reopens picker; × unlinks and clears strip
- [ ] Contact linkage persists on page reload (saved to DB)
- [ ] Compose area is now at the top: Update / Internal note / Request approval / Audio tabs below job strip
- [ ] Thread appears below the Conversation / Quotes / Safety toggle
- [ ] "✦ Generate quote" button visible in compose tab row → click switches to Quotes tab
- [ ] All existing compose/post/audio/summarise/save behaviour unchanged
- [ ] Back button, sidebar selects, workflow dots all work as before

### Next session priorities
1. Quote Line Items Redesign — full rebuild of line item editor (two sections, buy/sell price, VAT toggle, profit calc)
2. AI Quote Generation from Ticket — full flow with review panel
3. Audio Mode 2 (floating voice assistant) — must not be forgotten

---

### Hotfix — Remove broken top bar (search + New X button)

**Issue:** The desktop top bar (`TopBar` component in `AppLayout.jsx`) contained two non-functional elements:
- A search bar with a ⌘K badge — purely decorative, no command palette wired, clicking did nothing
- A "New Ticket / New Contact / New Event" etc. button — called `onNavigate(sameViewYoureAlreadyOn)`, i.e. completely broken

**Fix:** `TopBar` component removed entirely from `AppLayout.jsx`. Also cleaned up all dead code that only existed to support it: `PAGE_TITLES`, `PRIMARY_ACTIONS`, `pageTitle` variable, and the `Bell`, `Search`, `Plus` lucide imports.

**Layout:** `<main>` already had `md:pt-0` so desktop content fills the full height immediately with no gap. Mobile header (`MobileHeader`) and its `pt-14` on mobile are untouched.

**File changed:** `AppLayout.jsx` only. No other files affected — `TopBar` was self-contained.
