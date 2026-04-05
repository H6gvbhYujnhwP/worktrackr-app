# WorkTrackr Cloud: Master Development Roadmap v2.0

**Version:** 2.1
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

## Upcoming — Audio Feature

### ✅ Stage 1 — Inline Dictation in Notes (COMPLETE)
`DictationButton.jsx` component added to both `PersonalNotes.jsx` and `CompanyNotes.jsx`.
- Web Speech API (browser-native, free, no server)
- Tap to start / tap to stop
- Live preview box with interim text as user speaks
- Final text appended to note body on stop
- Graceful fallback — renders nothing if browser unsupported
- `lang: en-GB`

### Mode 1: Meeting Audio Upload to Ticket
Upload audio (mp3, m4a, wav, webm) to an existing ticket OR paste Zoom/Teams transcript text. Whisper transcribes; Claude extracts structured notes. Mandatory review step before anything saves. Lives in ticket Notes tab.

**Implementation notes:**
- Reuse `transcribe.js` — swap GPT-4 extraction to `claude-haiku-4-5-20251001`
- Needs `OPENAI_API_KEY` on Render for Whisper step only
- New Notes tab in `TicketDetailViewTabbed.jsx`
- New DB table `ticket_notes` or extend comments with `type` column

### Mode 2: Voice Dictation Assistant
Hold-to-record, max 60s. Claude interprets intent and routes automatically. Mandatory review before commit.

**Entry points:** floating action button (everywhere), ticket Notes tab, Create Ticket form.

**Context Claude receives:** current screen, open tickets, CRM contacts, current user, date/time.

**Routes:** new ticket, note on ticket, CRM calendar entry, ticket calendar entry, personal note, personal reminder, company shared note.

**Examples:**
- "Company A needs a quote for telephone system next March" → CRM calendar
- "Create a ticket to clean Agency Ltd toilet next Wednesday 3pm" → ticket + calendar
- "Idea to advertise in newspapers" → personal note
- "Pay David his wages" → personal reminder

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
- [ ] Job → Invoice conversion

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

---

## Technical Debt

- [ ] Testing: Jest + Playwright + CI/CD
- [ ] Performance: query optimisation, caching, lazy loading
- [ ] Security: audit, rate limiting, CSRF, 2FA

---

*Living document — updated after each session.*
