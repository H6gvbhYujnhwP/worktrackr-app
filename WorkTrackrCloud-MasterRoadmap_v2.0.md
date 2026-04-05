# WorkTrackr Cloud: Master Development Roadmap v2.0

**Version:** 2.1
**Date:** April 2026 (updated)
**Planning Horizon:** Rolling

---

## AI Policy (confirmed Session 10)
All AI features use **Anthropic Claude** exclusively (`claude-haiku-4-5-20251001` for speed/cost).
Audio transcription uses **OpenAI Whisper** (`whisper-1`) — this is speech-to-text only, not a reasoning model. Whisper is ~$0.006/minute and has no viable Anthropic equivalent. All reasoning over transcripts goes through Claude.
No other AI providers (OpenAI GPT, etc.) are used anywhere in the app.

---

## Completed AI Phases

### ✅ AI Phase 1 — Email Classifier
Real Anthropic Claude call in `email-intake.js`. Classifies inbound emails into ticket categories. Keyword fallback if API key absent. Results stored in `ai_extractions` table.

### ✅ AI Phase 2 — AI Quote Generation
`quotes-ai.js` and `quotes-ai-generate.js` — Claude generates quote line items from a job description or uploaded context files. Accessible from the Quotes tab via "Generate with AI" button. AI-generated quotes show a gold AI badge.

### ✅ AI Phase 3 — Smart Summaries
`summaries.js` — two endpoints:
- `POST /api/summaries/ticket/:id` — summarises ticket thread (title, description, status, comments) into 3–5 sentences. Button in ticket detail right sidebar.
- `POST /api/summaries/quote/:id` — summarises quote for a customer call. Button in Quote Quick Actions panel.

### ❌ AI Phase 4 — CRM Next-Action Suggestions
**Removed.** Decided the feature was thin and didn't earn its complexity.

### ❌ AI Phase 5 — Natural Language Ticket Search
**Removed.** Decided the feature was thin (existing filters solve the problem well enough) and the infrastructure cost (pgvector, embedding jobs) wasn't justified.

---

## Upcoming AI Features

### 🔲 Audio Feature — Two Modes

#### Mode 1: Meeting Audio Upload to Ticket
Upload an audio file (mp3, m4a, wav, mp4, webm) to an existing ticket. Whisper transcribes it; Claude reasons over the transcript and extracts structured notes. User also has the option to paste a Zoom/Teams transcript directly (skips Whisper entirely).

**Lives in:** Ticket detail → Notes tab (no separate page).

**Flow:**
1. User uploads file or pastes transcript text in the Notes tab
2. Whisper transcribes (if audio) → raw text displayed
3. Claude extracts structured items: summary, action items, key details, follow-ups
4. **Mandatory review step** — user confirms, edits, or skips each extracted item
5. On confirm → items saved as structured notes on the ticket
6. Nothing auto-commits without user review

**Implementation notes:**
- Reuse/replace existing `transcribe.js` backend (currently uses OpenAI GPT-4 for extraction — swap to Claude)
- `OPENAI_API_KEY` required only for Whisper audio transcription step
- Extraction reasoning (`extract-ticket` endpoint) → swap to `claude-haiku-4-5-20251001`
- Frontend: new Notes tab in `TicketDetailViewTabbed.jsx`
- DB: new `ticket_notes` table (or extend existing `comments` with a `type` column)

#### Mode 2: Voice Dictation Assistant
Hold-to-record button, max 60 seconds. User speaks naturally; Claude interprets intent and routes to the correct destination automatically.

**Entry points:**
- Floating action button (mobile, visible throughout the app)
- Inside ticket Notes tab
- Inside Create Ticket form

**Context Claude receives:** current screen/location, list of open tickets (titles + IDs), CRM contacts, current user name, current date/time.

**Routes Claude can output:**
- New ticket (+ optional calendar entry)
- Note on existing ticket
- CRM calendar entry
- Ticket calendar entry
- Personal note (private, under My Notes)
- Personal reminder (private, with due date)
- Company shared note (visible to all staff)

**Examples:**
- *"Company A needs a quote for telephone system next March"* → CRM calendar entry for Company A
- *"Create a ticket to clean Agency Ltd toilet next Wednesday 3pm"* → new ticket + calendar entry
- *"Idea to advertise in newspapers"* → personal note
- *"Pay David his wages"* → personal reminder with due date

**Mandatory review step:** same review UI as Mode 1 — Claude proposes the routed item, user confirms/edits/cancels before anything saves.

**Implementation notes:**
- Whisper for audio → Claude for intent classification and field extraction
- Single review component shared between Mode 1 and Mode 2
- Floating action button: new shell-level component, sits above all routes

---

### 🔲 Notes — Two Types

#### Personal Notes & Reminders
Private per user — no other staff member can see them.

**Features:**
- Create, edit, delete notes
- Pin notes to top
- Due dates for reminders — shows as overdue when past
- Mark reminder complete
- Voice dictation (Mode 2) auto-creates entries here when intent is personal
- Shown under **ACCOUNT** section in sidebar, label: **My Notes**

**DB:** new `personal_notes` table (`id`, `user_id`, `organisation_id`, `body`, `due_date`, `pinned`, `completed`, `created_at`, `updated_at`)

#### Company Shared Notes
All staff can read and write. No admin-only restriction on writing. Shown under **MAIN** section in sidebar (daily-use feature), label: **Company Notes**.

**Structure — three levels in one space:**
- **Shared notepad** — general freeform notes any staff member can add to
- **Knowledge base** — reference articles / how-to content
- **Announcements** — admin-pinned, shown at top for all staff

**Features:**
- Any user can create notes and assign a category
- Any user can create new categories
- Filter by category
- Admin users can pin notes as announcements — appear at top for everyone
- Version history — "last edited by X at Y" on every note
- Voice dictation feeds it — admin saying *"staff reminder..."* auto-pins as announcement

**DB:** new `shared_notes` table (`id`, `organisation_id`, `author_id`, `title`, `body`, `category`, `pinned`, `is_announcement`, `created_at`, `updated_at`) + `shared_note_versions` table for history

---

## Core Platform Work (ongoing)

### Jobs Module
- [ ] Finalise jobs DB schema
- [ ] Jobs API (CRUD)
- [ ] Jobs list view + detail page
- [ ] Job creation and edit forms
- [ ] Calendar integration (drag-and-drop scheduling)
- [ ] Quote → Job conversion ("Convert to Job" on accepted quote)

### Invoices Module
- [ ] Invoices API + UI
- [ ] Invoice calculations and payment tracking
- [ ] Job → Invoice conversion ("Create Invoice" on completed job)
- [ ] Invoice PDF generation

### Payments Module
- [ ] Payments API + UI
- [ ] Payment allocation and reporting

### Reporting & Analytics
- [ ] Dashboard analytics widgets
- [ ] Revenue and job completion reporting

---

## Long-term Vision

- [ ] Reviews & Testimonials Module
- [ ] Customer Portal
- [ ] PWA / Google Play Store listing (Trusted Web Activity)
- [ ] Splashtop integration — one-click remote session from ticket detail
- [ ] Mobile App for Technicians
- [ ] Advanced features (multi-language, integrations)

---

## Technical Debt & Improvements

- [ ] Testing: Jest + Playwright + CI/CD pipeline
- [ ] Performance: query optimisation, caching, lazy loading
- [ ] Security: audit, rate limiting, CSRF, 2FA
- [ ] Documentation: API docs, user guides, developer docs

---

## Success Metrics

- API response < 200ms, page load < 2s
- Feature adoption tracked per organisation
- Sprint completion rate > 90%

---

*This is a living document. Updated after each session.*
