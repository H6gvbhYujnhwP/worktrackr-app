# WorkTrackr Cloud: Master Development Roadmap v2.0

**Version:** 2.2
**Date:** April 2026 (updated)

---

## AI Policy
All AI reasoning uses **Anthropic Claude** (`claude-haiku-4-5-20251001`).
Audio transcription uses **OpenAI Whisper** (`whisper-1`) — speech-to-text only, no Anthropic equivalent.
No other AI providers.

---

## Completed

### ✅ AI Phase 1 — Email Classifier
Real Anthropic Claude call in `email-intake.js`. Keyword fallback if API key absent.

### ✅ AI Phase 2 — AI Quote Generation
`quotes-ai.js`, `quotes-ai-generate.js` — Claude generates quote line items. Gold AI badge on AI-generated quotes.

### ✅ AI Phase 3 — Smart Summaries
`summaries.js` — Summarise Ticket button (ticket sidebar) + Summarise for Customer button (quote Quick Actions).

### ✅ Notes Feature — Personal + Company
- **My Notes** (`my-notes`) — private per user. Pin, due dates (reminders), complete toggle, filter tabs. Sidebar: MAIN section.
- **Company Notes** (`company-notes`) — all staff read/write. Three types: note / knowledge / announcement. Categories, admin pin, version history. Sidebar: MAIN section.

### ❌ AI Phase 4 — CRM Next-Action Suggestions — REMOVED (too thin)
### ❌ AI Phase 5 — Natural Language Ticket Search — REMOVED (too thin, infrastructure cost not justified)

---

## In Progress

### ✅ Ticket Redesign — Option B (COMPLETE — deployed) (conversation-first)

The current ticket view has disconnected tab-based sections and wastes horizontal space. Agreed redesign direction:

**Layout changes:**
- Full-width layout — no wasted whitespace either side
- Job description pinned at top as an always-visible amber strip. Editable inline with an "edited" marker shown when modified
- Tabs removed from the main body — replaced with a single continuous conversation/activity thread below the job description
- Right sidebar: workflow stage tracker, metadata, assignment, action buttons
- Compose area at bottom with tabs: Update / Internal note / Request approval / Audio

**Conversation thread:**
- All updates, notes, file uploads, system events, and approval requests appear inline in chronological order
- Each entry shows avatar, name, timestamp
- Staff can attach images and documents to any update
- System events (status changes, quote sent, approval received) post automatically as thread entries
- Internal notes visually distinct from team-visible updates

**Workflow stages (right sidebar):**
1. Ticket created
2. Assigned to engineer
3. In progress
4. Manager approval (if required)
5. Resolved & closed

**Approval pings:**
- When a ticket is passed between stages or approval is requested, a ping goes to all relevant org users
- Approval requests appear inline in the thread as highlighted cards with Approve / Request changes buttons

**Files and images:**
- Each thread entry can include file attachments and images
- Attachments displayed as pills below the message body

---

## Upcoming — Full Ticket-to-Invoice Workflow

### Vision
WorkTrackr is a full workflow platform. A job should flow end-to-end without leaving the app:

**Ticket → Quote → Customer approval → Work → Completion → Invoice**

Every step is recorded in the ticket's conversation thread. The invoice is pre-populated automatically from all approved quotes and logged work on that ticket — no re-entry.

### Stages to build (future phases, post ticket redesign)

**Quote integration inside ticket**
- "Create quote" initiated from inside the ticket thread
- Quote events (created, sent, approved, declined) post automatically to the ticket thread
- Status auto-advances when customer approves (e.g. → "Quote accepted")
- Pings assigned engineer and manager on approval

**Work logging**
- Time and parts logged against a ticket from within the thread
- Variation quotes raised if scope changes (same send/approve flow)

**Invoice generation from ticket**
- Once job marked complete, "Generate invoice" button appears
- Invoice pre-populated with: original quote line items, approved variations, time logged, parts used
- Conversation thread serves as the full audit trail

---

## Future Integration — idoyourquotes.com

**Owner note (April 2026):** A separate application, idoyourquotes.com, already exists and handles quote creation, pricing, and customer approval flows. A future integration between WorkTrackr and idoyourquotes.com would allow:

- WorkTrackr to fire a job/ticket across to idoyourquotes.com as a quote request (webhook or API call)
- Customer approval handled on idoyourquotes.com
- Approved quote and pricing data returned to WorkTrackr via webhook, posted automatically to the ticket thread
- Invoice generation in WorkTrackr pulls from the returned approved quote data

**This avoids rebuilding the full quote/approval flow natively in WorkTrackr** and instead leverages the existing idoyourquotes.com platform. The integration point is a bi-directional webhook: WorkTrackr sends the job, idoyourquotes.com sends back the result.

**Design considerations when ready to build:**
- Auth: shared secret or OAuth between the two apps
- Payload: job description, contact details, line items (if pre-populated), ticket ID for return reference
- Return payload: approved quote lines, total, customer signature/acceptance timestamp, quote PDF URL
- WorkTrackr stores the returned data and marks the ticket as "Quote approved externally"
- Both apps remain independently functional — integration is additive, not dependent

**Priority:** deferred until ticket workflow redesign and core invoice module are complete. Flag for its own design session before implementation.

---

## Upcoming — Audio Feature

### ✅ Stage 1 — Inline Dictation in Notes (COMPLETE)
`DictationButton.jsx` component added to both `PersonalNotes.jsx` and `CompanyNotes.jsx`.
- Web Speech API (browser-native, free, no server)
- Tap to start / tap to stop
- Live preview box with interim text as user speaks
- Final text appended to note body on stop
- Graceful fallback — renders nothing if browser unsupported
- `lang: en-GB`

### ✅ Stage 2 — Meeting Audio Upload to Ticket (COMPLETE)
Upload audio (mp3, m4a, wav, webm) to an existing ticket OR paste Zoom/Teams transcript text. Whisper transcribes; Claude extracts structured notes. Mandatory review step before anything saves. Posts result into the ticket conversation thread.

**Implementation notes:**
- Reuse `transcribe.js` — swap GPT-4 extraction to `claude-haiku-4-5-20251001`
- Needs `OPENAI_API_KEY` on Render for Whisper step only
- Audio compose tab in the new ticket thread layout
- Extracted notes post to the ticket thread as a single structured entry

### Stage 3 — Voice Dictation Assistant (Mode 2)
Hold-to-record, max 60s. Claude interprets intent and routes automatically. Mandatory review before commit.

**Entry points:** floating action button (everywhere), ticket thread compose, Create Ticket form.

**Context Claude receives:** current screen, open tickets, CRM contacts, current user, date/time.

**Routes:** new ticket, note on ticket, CRM calendar entry, ticket calendar entry, personal note, personal reminder, company shared note.

**TTS confirmation loop (planned for this stage):**
- After Claude extracts intent, the app speaks back a summary: "I'll create a note on this ticket saying X — is that right?"
- User says yes → saves. User says no → continues dictation to correct.
- Uses browser-native `speechSynthesis` (free, no server).

---

## Core Platform Work

### Jobs Module
- [ ] Finalise DB schema
- [ ] Jobs API (CRUD)
- [ ] Jobs list view + detail page
- [ ] Job creation and edit forms
- [ ] Calendar integration
- [ ] Quote → Job conversion

### Invoices Module
- [ ] Invoices API + UI
- [ ] Invoice PDF generation
- [ ] Job → Invoice conversion from ticket thread

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
- [ ] idoyourquotes.com integration (see section above)

---

## Technical Debt

- [ ] Testing: Jest + Playwright + CI/CD
- [ ] Performance: query optimisation, caching, lazy loading
- [ ] Security: audit, rate limiting, CSRF, 2FA

---

*Living document — updated after each session.*
