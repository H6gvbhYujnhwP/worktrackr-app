# WorkTrackr Cloud — Roadmap & Backlog

_Last updated: 2025-04-01 (Session 1)_

---

## Security backlog (fix before adding new features)

- [ ] **Harden cron secret** — make `CRON_SECRET` env var required at startup; throw if missing rather than falling back to a predictable default string (`web/routes/cron.js`)
- [ ] **Remove MFA/reset token console logging** — MFA codes and password reset tokens are logged to `console.log` in dev mode; on a production server without SMTP this leaks sensitive data to Render logs (`web/routes/auth.js`)
- [ ] **Admin panel URL** — `/admin87476463` is hardcoded in source and now publicly visible. Move admin route protection to server-side middleware rather than relying on an obscure URL

---

## Calendar fixes — DO THESE NEXT, one at a time, test each before moving on

> Both calendars are completely separate and must stay that way.
> Ticket Calendar uses the `calendar_events` DB table via `/api/calendar/events`.
> CRM Calendar uses the `crm_events` DB table via `/api/crm-events`.
> They must never share data, state, or API calls.

---

### CALENDAR 1 — Ticket Calendar (`BookingCalendar.jsx`) — DO FIRST

**Status:** BROKEN — not production ready

**Root causes (all found in Session 1 audit):**

- [ ] Uses localStorage instead of the database. Component reads/writes ticketBookings and tickets from localStorage. Data lost on browser clear, invisible on other devices. Backend /api/calendar/events already exists and works — it is simply never called.

- [ ] "Create Booking" form does nothing. Submit button calls setShowBookingForm(false) only. No save logic. Events are silently discarded.

- [ ] Hardcoded 2024 sample data always injected. Four fake bookings (Sarah Johnson, Mike Thompson, Emma Wilson, David Brown) merged into every render. Cannot be deleted.

- [ ] Ticket-to-Calendar bridge uses localStorage. App.jsx writes ticket scheduled dates to localStorage('ticketBookings'). Must be replaced: when a ticket has a scheduled_date, write directly to calendar_events via /api/calendar/events.

- [ ] Two overlapping ticket calendar components exist: BookingCalendar.jsx and IntegratedCalendar.jsx. IntegratedCalendar does correctly call /api/calendar/events. After rewrite, remove or merge the unused one.

- [ ] No day view. Only week and month exist.

- [ ] Month view cells do not open day detail on click.

**Files to change:**
- web/client/src/app/src/components/BookingCalendar.jsx — full rewrite
- web/client/src/app/src/App.jsx — remove localStorage bridge (createBookingFromTicket, updateBookingFromTicket, initializeBookingSync)
- web/client/src/app/src/components/IntegratedCalendar.jsx — assess then merge or remove

**Backend:** web/routes/calendar.js — already correct, no changes needed
**DB table:** calendar_events — schema already exists and is correct

**What a working Ticket Calendar must do:**
1. Load all events from /api/calendar/events on mount
2. Create events via POST to /api/calendar/events — form must actually save
3. Edit events via PUT to /api/calendar/events/:id
4. Delete events via DELETE to /api/calendar/events/:id
5. Show events correctly in day, week, and month views
6. When a ticket has a scheduled_date set or changed, automatically create/update a calendar_events record via the API (not localStorage)
7. Clicking a calendar entry opens the linked ticket or event detail
8. Zero hardcoded sample data

---

### CALENDAR 2 — CRM Calendar (`CRMCalendar.jsx`) — DO SECOND

**Status:** BROKEN — events appear to save but timestamps are null so they never appear on any calendar view

**Root causes (all found in Session 1 audit):**

- [ ] Event type case mismatch — #1 reason events do not save. Frontend sends PascalCase: 'Call', 'Meeting', 'FollowUp', 'Renewal'. Backend Zod only accepts lowercase: 'call', 'meeting', 'follow_up', 'renewal'. Every create/edit fails silently with 400. User sees nothing wrong.

- [ ] Field name mismatch (startAt vs start_at) — #2 reason events never appear. Frontend sends camelCase startAt/endAt. Backend expects snake_case start_at/end_at. Timestamps stored as null. getEventsForDate() can never match null to a date string.

- [ ] sendMeetingInvitations() is called but never defined. Throws ReferenceError and crashes scheduled meeting creation entirely.

- [ ] "Mark Done" button does nothing. No onClick handler wired up.

- [ ] Hardcoded mock users throughout. getAvailableUsers() and getUsersWithEmailEnabled() return fake arrays. Must use real org members from the API.

- [ ] getCustomerLocations() returns five fake hardcoded company addresses. Must use real contacts from /api/contacts.

- [ ] 10-second polling loop runs unconditionally forever. Replace with fetch-on-mount plus re-fetch only after create/edit/delete.

**Files to change:**
- web/client/src/app/src/components/CRMCalendar.jsx — full rewrite

**Backend:** web/routes/crm-events.js — already correct, no changes needed
**DB table:** crm_events — schema already exists and is correct

**What a working CRM Calendar must do:**
1. Load all CRM events from /api/crm-events on mount only
2. Create events via POST with correct snake_case fields and lowercase type values
3. Edit events via PUT to /api/crm-events/:id
4. Delete events via DELETE to /api/crm-events/:id
5. Mark Done updates status to 'done' via PUT
6. Show events correctly in day, week, and month views
7. Assigned users list from real org members API
8. Contacts list from real /api/contacts API
9. Zero hardcoded mock data, zero polling, zero undefined function calls

---

## Technical debt (do after calendars are fixed)

- [ ] Replace mock user data — App.jsx initialises user state from mockData.js; useUserLimits reads local state for seat-limit enforcement instead of real API data
- [ ] Delete broken/backup files:
  - CreateTicketModal.jsx.broken
  - CreateTicketModal_broken.jsx
  - CRMDashboard.jsx.broken
  - TicketDesigner.jsx.broken
  - TicketDetailModal.jsx.broken
  - TicketFieldCustomizer_broken.jsx
  - BillingQueueManager.jsx.backup
  - XeroIntegration.jsx.backup
- [ ] Consolidate duplicate component trees — shadcn UI duplicated across two locations
- [ ] Consolidate quotes routes — 7 separate files all mounted at /api/quotes

---

## Feature roadmap

### Phase 1 — Complete core platform (immediate)
- [ ] Quotes module — finish Send Email, Generate PDF, Status Changes in QuoteForm.jsx
- [ ] Quote filtering and search
- [ ] "My Tickets" queue — verify filter works correctly for assigned users

### Phase 2 — Jobs module (1-2 months)
- [ ] Jobs database schema
- [ ] Jobs API endpoints (CRUD)
- [ ] Jobs list view and detail page
- [ ] Job creation and edit forms
- [ ] Calendar integration — drag-and-drop job scheduling
- [ ] Quote-to-Job conversion

### Phase 3 — Invoices and Payments (3-4 months)
- [ ] Invoices module — API and UI
- [ ] Invoice calculations and line items
- [ ] Job-to-Invoice conversion
- [ ] Payments module
- [ ] Payment reporting

### Phase 4 — Analytics and Reporting (4-5 months)
- [ ] Dashboard analytics widgets
- [ ] Revenue reporting
- [ ] Job completion reporting
- [ ] Seat usage and billing analytics for admins

### Phase 5 — Long term (5-6 months)
- [ ] Reviews and Testimonials module
- [ ] Customer Portal
- [ ] Mobile app for technicians
- [ ] Xero integration
- [ ] Multi-language support

---

## Infrastructure and testing
- [ ] Set up Jest unit tests
- [ ] Set up Playwright E2E tests (config exists, not yet in CI)
- [ ] Add rate limiting per-user (currently global only)
- [ ] Add CSRF protection
- [ ] Database query performance audit
- [ ] Caching layer for frequently read data

---

## UI Redesign — Concept 3 "Modern Enterprise"

### Push 1 — DONE (Session 3, 2025-04-02)
Shell layer complete:
- [x] App.css — new colour tokens, gold accent, dark sidebar vars, removed legacy hacks
- [x] Sidebar.jsx — flat nav, dark background, section headers, no nesting
- [x] AppLayout.jsx — no double wrapper, dark mobile header, clean top bar, tablet collapse
- [x] playwright.yml — disabled CI emails

### Push 2 — TODO (next session, after Push 1 tested on Render)

Apply new design patterns to all module screens. Test Push 1 first before starting Push 2.

Order to follow (lowest risk first):

- [x] `TicketDetailViewTabbedWrapped.jsx` — remove extra white card wrapper (pass-through only)
- [x] `Dashboard.jsx` — replace big stat cards with compact inline stats row; remove legacy hidden header
- [x] `TicketsTableView.jsx` — new table container with toolbar, zebra rows, priority bars, mobile card conversion
- [x] `TicketDetailViewTabbed.jsx` — single container, underline tabs, label-value rows
- [ ] `ContactManager.jsx` — same table pattern as tickets
- [ ] `CRMDashboard.jsx` — table pattern for product catalog
- [ ] `QuotesList.jsx` — table pattern
- [ ] `QuoteDetails.jsx` — single container detail pattern
- [ ] `QuoteForm.jsx` / `QuoteFormTabs.jsx` — section headers, no nested card wrappers
- [ ] `CreateTicketModal.jsx`, `AssignTicketsModal.jsx`, `SendQuoteModal.jsx` — modal header/body/footer pattern with gold primary button
- [ ] `UserManagementImproved.jsx`, `SecuritySettings.jsx`, `EmailIntakeSettings.jsx` — settings page pattern
- [ ] `IntegratedCalendar.jsx`, `CRMCalendar.jsx` — wrap in `bg-white rounded-xl border border-[#e5e7eb]`

**Design rules for Push 2 (must follow for every component):**
- Single white container: `bg-white rounded-xl border border-[#e5e7eb] overflow-hidden`
- Table headers: `text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider bg-[#fafafa]`
- Table rows: `text-[13px]`, zebra even rows `#fafbfc`, hover `#fef9ee`
- Status badges: small pills, muted semantic colours (see badge map in ROADMAP)
- Priority bars: 3px vertical coloured bar (red/amber/blue/green)
- Buttons: gold primary `bg-[#d4a017] text-[#111113]`, secondary `border border-[#e5e7eb]`
- Inputs: `border border-[#e5e7eb] rounded-lg focus:ring-[#d4a017]/30 focus:border-[#d4a017]`
- No nested `<Card>` wrappers inside already-white containers
- No `bg-gray-100` backgrounds inside content areas

---

## AI Feature Roadmap

_Added: Session 5, 2025-04-03_

### What already exists (do not rebuild)
- `ai_generated` flag and `ai_context` field on quotes table
- `ai_extractions` table — structured data pulled from unstructured input with audit trail
- Transcript infrastructure in schema — tables exist, tied to tickets
- Ticket ↔ Quote linkage — AI can operate across the full job lifecycle
- Email intake webhook — fires correctly, AI classification stub exists in route but needs real Claude call
- `ai_generated` versioning + parent quotes — editable AI output, not locked

### AI Phase 1 — Email Intake Intelligence (DO FIRST)
**Status:** Backend webhook fires. AI classification is a stub. Needs real Claude call.

- [ ] Replace stub classification in `web/routes/email-intake.js` with Claude API call
- [ ] Extract from incoming email: title, description, priority, category, contact, issue type
- [ ] Populate `ai_extractions` table with what was extracted and confidence per field
- [ ] Store `ai_context` on created ticket so staff can see why AI chose what it chose
- [ ] Confidence indicator visible on ticket — "AI created this, review suggested fields"
- [ ] Test: send email to intake address → structured ticket appears with AI fields populated

**Why first:** Infrastructure already exists. Real Claude call is ~1 day of work. Immediately visible value.

---

### AI Phase 2 — AI Quote Generation from Ticket
**Status:** Schema ready (`ai_generated`, `ai_context`, parent quote versioning). UI not built.

- [ ] "Generate Quote" button inside ticket detail view (Quotes tab)
- [ ] Claude prompt receives: ticket title, description, notes, sector, org's product catalog
- [ ] Returns structured JSON: line items (labour + materials), descriptions, suggested prices
- [ ] User lands on pre-filled QuoteForm — fully editable, never locked
- [ ] `ai_generated = true` and `ai_context` stored on the quote
- [ ] Sector-aware prompting: Electrical / Facilities / IT / General — prompt varies by sector
- [ ] "Improve this quote" button on existing draft quotes — rewrites wording, flags missing items

**Why second:** `ai_generated` flag exists but nobody can trigger it from the UI. This surfaces the biggest existing asset.

---

### AI Phase 3 — Smart Summaries
**Status:** Not started. Low effort, high visible impact.

- [ ] Ticket detail view — "Summarise" button above notes/comments thread
- [ ] Returns 2–3 sentence plain-English summary of what's happened and current status
- [ ] Quote detail view — "Customer summary" button generates clean customer-facing paragraph
- [ ] Staff handover summary — "What does the next person need to know?" format
- [ ] Summary stored in `ai_extractions` with timestamp so it can be regenerated

---

### AI Phase 4 — Next Best Action Suggestions
**Status:** Not started. Suggestions only — no auto-actions ever.

- [ ] Inside ticket detail: "Suggest next step" button
- [ ] Claude reads ticket history, status, age, SLA, and returns 1–3 suggestions:
  - "Request customer approval — last update was 5 days ago"
  - "Schedule site visit — issue type typically requires on-site diagnosis"
  - "Send quote — notes indicate scope has been agreed"
  - "Escalate — SLA breach in 4 hours"
- [ ] Suggestions shown as dismissible chips — user clicks to act or ignores
- [ ] No suggestion ever executes automatically

---

### AI Phase 5 — Auto-Categorisation on Ticket Create
**Status:** Not started. Removes admin friction.

- [ ] On ticket create/save, Claude reads title + description
- [ ] Returns suggested: category, priority, SLA risk flag, job type
- [ ] Shown as "AI suggested" badges next to the fields — user can accept or override
- [ ] Feeds `ai_extractions` table for audit

---

### AI Phase 6 — Knowledge Recall (Later)
**Status:** Not started. Becomes valuable after 6+ months of ticket history.

- [ ] "Have we seen this before?" button on ticket detail
- [ ] Vector search or keyword search over closed tickets with similar descriptions
- [ ] Returns: similar past tickets, how they were resolved, any quotes generated
- [ ] Link directly to the past ticket for full context

---

### AI Phase 7 — Workflow Builder Assistance (Advanced, Later)
**Status:** Not started. Workflow builder not yet built.

- [ ] Inside workflow builder: natural language input field
- [ ] "Describe what you want to happen" → AI suggests trigger + conditions + actions
- [ ] User reviews and confirms before workflow is saved
- [ ] Never creates or activates a workflow without explicit user confirmation

---

### What NOT to build
- Generic "Ask AI anything" chat interface — not relevant to this market
- Chatbot UI for the sake of it
- Any AI feature that executes actions without user confirmation
- Replacing human decisions — AI suggests, human decides, always

---

## Audio Intelligence & Dictation

_Added: Session 5, 2025-04-03_

### Overview
Two distinct features. Both use OpenAI Whisper for speech-to-text (~$0.006/minute, negligible at normal usage). Both produce drafts for user review — nothing is auto-committed.

---

### Feature 1 — Meeting Audio Upload to Ticket Notes

**What it does:**
User uploads an audio or video file to an existing ticket. AI transcribes it with Whisper, then reasons over the transcript and adds structured notes to that ticket.

**Where it lives:** Inside the ticket Notes tab — a file upload button alongside the text note input. No separate page.

**Supported formats:** mp3, m4a, wav, mp4, m4v (Whisper accepts all)

**Also supported:** Pasted text from Zoom/Teams transcript exports (plain text, no Whisper needed — skip straight to AI reasoning)

**What AI extracts and proposes (shown as draft for user review):**
- Structured notes summary
- Action items mentioned in the meeting
- Any dates or deadlines mentioned → proposed calendar entries
- Any scope of work discussed → flag for quote generation
- Any other tickets referenced

**Review step is mandatory:** User sees all proposed items with the source quote from the transcript. Confirm / edit / skip per item. Nothing saves until user clicks "Apply."

**Implementation:**
- [ ] File upload UI in ticket Notes tab (mp3/m4a/wav/mp4/txt)
- [ ] Whisper API call with uploaded file → raw transcript stored in `transcripts` table linked to ticket
- [ ] Claude reasoning prompt over transcript — returns structured JSON of extracted items
- [ ] Review panel UI — per-item confirm/edit/skip
- [ ] Apply confirmed items to ticket notes, calendar, quote flags
- [ ] Source transcript stored for audit — user can always see what the AI read

---

### Feature 2 — Voice Dictation Assistant

**What it does:**
User holds a mic button and speaks naturally. AI interprets what they said and routes it to the right place automatically. Works from anywhere in the app.

**Entry points:**
1. Floating action button (mobile) — available from any screen
2. Inside a ticket Notes tab — context-aware, AI knows which ticket the user is in
3. Inside Create Ticket form — voice fills the form

**Maximum dictation length:** 60 seconds per recording

**What the AI understands and routes:**

| User says | AI creates |
|---|---|
| "Company A needs a quote for telephone system next March" | CRM calendar entry (follow-up: quote discussion) |
| "Create a ticket to clean Agency Ltd toilet next Wednesday at 3pm" | New ticket + ticket calendar entry at that date/time |
| "Assign the Agency Ltd cleaning ticket to David" | Ticket assignment update |
| "Idea for moving the company forward — advertise in newspapers" | Personal note for that user |
| "Remind me to pay David his wages on Friday" | Personal reminder for that user with due date |
| "Staff reminder — all site visits need two-person sign-off from next month" | Company shared note (pinned if user is admin) |
| "Add a note to the open Acme Corp ticket — spoke to their FM today, visit confirmed" | Note on existing ticket matched by company name |

**Review step:** Same as Feature 1 — user sees what AI extracted and where it will go, confirms before anything saves.

**Implementation:**
- [ ] Browser MediaRecorder API — hold to record, release to process
- [ ] Visual recording indicator (waveform or pulsing dot)
- [ ] Whisper API call → raw transcript
- [ ] Claude routing prompt — receives transcript + context (current view, open tickets for this user's org, existing CRM contacts, current user ID)
- [ ] Returns structured JSON: array of proposed actions with type, destination, content, confidence
- [ ] Review panel — same component as Feature 1
- [ ] Apply confirmed actions

**Context the AI receives to make smart routing decisions:**
- Current user and their role
- Which screen the user is on (ticket detail, create ticket, CRM, dashboard)
- If on a ticket detail — the ticket ID, title, company
- List of open tickets for the org (title + company + ID) — so "add a note to the Acme ticket" resolves correctly
- List of CRM contacts (name + company) — for routing to CRM calendar
- Current date and time — for resolving "next Wednesday", "next March", "Friday"

---

### Sidebar placement
- No dedicated sidebar entry for audio/dictation
- Feature 1 lives inside tickets
- Feature 2 entry points: floating button + contextual buttons
- All created items land in their natural homes (tickets, calendars, notes)

---

## Personal Notes & Reminders

_Added: Session 5, 2025-04-03_

### Overview
Private per user. Nobody else in the org can see personal notes. Voice dictation can create entries here automatically. Accessible from the sidebar under ACCOUNT.

### Data model needed
- [ ] `personal_notes` table: `id, user_id, content, is_reminder, due_date, is_pinned, is_complete, created_at, updated_at`

### Features
- [ ] Simple list view — most recent first, pinned at top
- [ ] Quick add: type a note or use voice dictation
- [ ] Pin important notes to top
- [ ] Mark reminders with a due date — appear highlighted when due date is today or past
- [ ] Mark complete (for reminders) — moves to completed section
- [ ] Edit and delete
- [ ] Search across personal notes
- [ ] Voice dictation auto-creates entries here when intent is personal ("reminder", "idea", "note to self")

### Sidebar placement
Under ACCOUNT section, below Security. Label: **My Notes**

---

## Company Shared Notes

_Added: Session 5, 2025-04-03_

### Overview
Shared across the entire organisation. All staff can read and write. Three levels of content in one space: collaborative notepad, knowledge base, and company noticeboard. Accessible from the sidebar under ACCOUNT or as a top-level MAIN item (TBD — decide when building).

### Data model needed
- [ ] `company_notes` table: `id, organisation_id, author_user_id, title, content, category, is_pinned, is_announcement, created_at, updated_at`
- [ ] `company_note_versions` table: `id, note_id, user_id, content, edited_at` — version history so edits can be reviewed

### Three levels in one UI

**Level 1 — Shared notepad (default)**
- Any staff member creates, edits, reads notes
- No categories required — freeform
- Collaborative: last edit wins (show "last edited by X at Y" on every note)

**Level 2 — Knowledge base**
- Notes can be assigned a category (Staff create categories freely)
- Examples: Suppliers, Pricing, Procedures, Contacts, Templates
- Filter/browse by category
- Search across all notes

**Level 3 — Announcements / Noticeboard**
- Admin users can pin notes to the top as announcements
- Pinned announcements show with a distinct visual treatment
- All staff see pinned announcements first when they open Company Notes
- Non-admin staff cannot pin — they can only write regular notes

### Features
- [ ] Full list view with pinned announcements at top
- [ ] Rich text editing (bold, bullets, headings minimum)
- [ ] Categories — any user can create, filter by category
- [ ] Pin as announcement — admin only
- [ ] Version history — "edited by X at Y, click to see previous version"
- [ ] Search across all company notes
- [ ] Voice dictation creates company notes — if user is admin and says "staff reminder..." it auto-pins
- [ ] AI can reference company notes as context when generating quotes or suggesting next actions (later phase)

### Sidebar placement
Top-level item under MAIN section, below Calendar. Label: **Company Notes**
Icon: FileText or BookOpen

> Decision confirmed Session 5: MAIN section, not ACCOUNT. It is a daily-use feature, not a settings page.
