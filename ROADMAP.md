# WorkTrackr Cloud — Active Roadmap

**Last updated:** Session 28 — 2026-04-12

---

## Completed

### UI Pushes
- ✅ **Push 1** — Shell layer (AppLayout, Sidebar, App.css)
- ✅ **Push 2** — All module screens (Dashboard, Tickets, CRM, Quotes, Users, Settings)
- ✅ **Push 3** — Remaining components (QuoteFormTabs, CreateTicketModal, IntegratedCalendar, BookingCalendar)

### AI Phases
- ✅ **AI Phase 1** — Email intake classifier
- ✅ **AI Phase 2** — Generate Quote with AI (ticket → AI draft → review → save)
- ✅ **AI Phase 3** — Smart Summaries (ticket + quote, inline amber display)
- ✅ **AI Phase 4** — CRM Next-Action Suggestions (amber box after Mark Done, 2 quick-action buttons, dismiss)

### Core fixes
- ✅ Auth cookie fix, dangerous public-auth stub replaced, admin audit log fix
- ✅ Ticket Calendar full rewrite (DB-backed)
- ✅ Inline sub-component anti-pattern sweep
- ✅ CRM contacts snake_case normaliser + Zod data-loss fix

### Jobs Module
- ✅ Jobs Phase 1–4 + Calendar Integration
- ✅ Rename Jobs → Projects Phase 1 & 2 (labels only, internals unchanged)

### Quote Improvements
- ✅ Quote Line Items Redesign
- ✅ AI Quote Generation from Ticket

### Audio / Voice
- ✅ Audio Stage 1 — Inline dictation in Notes
- ✅ Audio Stage 2 — Meeting audio upload to ticket thread
- ✅ Audio Stage 3 — Floating voice assistant (intent routing, mandatory review)

### Invoices Module
- ✅ Invoices Phase 1 — Backend (DB tables, CRUD API, PDF)
- ✅ Invoices Phase 2 — Frontend (list, detail, route wrappers, sidebar, JobDetail integration)

---

## Next Priority — Voice Assistant Overhaul

**Goal:** Fully hands-free operation. User should be able to drive or work on-site and complete any action entirely by voice — no screen interaction required.

**Files to change:**
- `web/routes/transcribe.js` — update `buildVoiceIntentPrompt()` and response schema
- `web/client/src/app/src/components/VoiceAssistant.jsx` — full conversation loop

---

### Phase 1 — Fix CRM calendar data extraction (quick fix, do first)

**Problem:** `company` and `contact` are not in the `crm_calendar` data schema in `buildVoiceIntentPrompt()`. They are never extracted by Claude, never passed to `saveIntent()`, never sent to `/api/crm-events`. CRM events are created with blank company and contact fields.

**Fix:**
- In `buildVoiceIntentPrompt()`: add `"company": "free text company name"` and `"contact": "free text contact name"` to the `crm_calendar` data schema
- In `saveIntent()` for `crm_calendar`: pass `company` and `contact` in the POST body
- In `CrmCalendarFields` component: add Company and Contact text inputs so user can see/edit them in the review panel

---

### Phase 2 — Voice confirmation loop (core hands-free fix)

**Problem:** After TTS speaks the confirmation message, the mic goes completely silent. The app waits indefinitely for a screen tap on "Confirm & save". Not hands-free.

**What to build:**

New phase: `voice_confirm` — inserted between `review` and `saving`.

After TTS speaks `confirmation_message`, automatically open a short Web Speech recognition window (8 seconds).

Listen only for:
- **Affirmatives:** "yes", "yeah", "yep", "confirm", "do it", "correct", "ok", "go ahead", "save", "save it"
- **Negatives:** "no", "cancel", "stop", "don't", "nope", "retry", "try again", "back"

Behaviour:
- Affirmative detected → auto-call `handleConfirm(result.data)` → saves → TTS "Done." → panel closes
- Negative detected → `handleRetry()` → back to idle → TTS "Cancelled."
- Timeout (nothing heard in 8s) → silently fall through to review panel (tap-to-confirm available as always)

UI during voice_confirm phase:
- Small pulsing amber indicator: *"Listening for yes or no…"* with countdown
- "Confirm & save" tap button always visible as fallback throughout
- "Hear again" button to re-speak the confirmation message

New state variable: `confirmListening` (bool) — true during the 8s window.

---

### Phase 3 — Clarification rounds (conversational gap-filling)

**Problem:** When Claude can't extract a required field, the review form just shows a blank input. The user has to look at the screen to see what's missing and type/tap it in. Not hands-free.

**What to build:**

Claude returns a new response shape when fields are missing:

```json
{
  "intent": "crm_calendar",
  "confidence": 0.85,
  "clarification_needed": true,
  "missing_fields": ["company"],
  "question": "Who does Mr A work for?",
  "data": { "title": "Meeting with Mr A", "type": "meeting", "start_at": "...", "end_at": "..." },
  "confirmation_message": ""
}
```

New phase: `clarifying` — sits between `processing` and `review`.

Flow:
1. Claude returns `clarification_needed: true` with a `question`
2. TTS speaks the question
3. Mic auto-opens for 10 seconds to capture the answer
4. Answer is appended to a `conversationHistory` array
5. Re-submitted to `/api/transcribe/voice-intent` with full history
6. Claude fills in the gap and either asks another question or moves to confirmation
7. Maximum 3 clarification rounds before falling back to review panel

New state: `conversationHistory: []` — array of `{ role: 'user'|'assistant', content: string }` pairs.

Backend changes to `buildVoiceIntentPrompt()`:
- Accept optional `conversationHistory` array
- Include prior exchanges in the prompt so Claude has context across rounds
- Return `clarification_needed`, `missing_fields`, `question` in JSON schema
- `question` must be a short spoken sentence (under 15 words)

Required fields per intent (Claude must ask if missing):
- `crm_calendar`: date/time (required), title (required), type (required) — company/contact optional but ask if not mentioned
- `new_ticket`: title (required), priority (ask if not stated)
- `ticket_note`: ticket_id (required if not currently viewing a ticket), body (required)
- `personal_reminder`: title (required), due_date (required — always ask "when?")
- `personal_note`: title + body (required)
- `company_note`: title + body (required), note_type (ask "knowledge base or general note?")
- `ticket_calendar`: title (required), eventDate (required), startTime (required)

---

### Phase 4 — Smart auto-save (skip review entirely for complete commands)

**When:** `confidence >= 0.9` AND `clarification_needed === false` AND all required fields populated.

**Flow:** Skip `review` phase entirely. Go directly to `saving`.
TTS speaks confirmation message AND saves simultaneously (or speaks then saves in ~500ms).
TTS confirms: *"Done — meeting created."*

This is the fully hands-free path — speak one clear command, hear it done, no interaction required.

A future settings toggle could let users turn auto-save on/off. For now, always on for high-confidence complete commands.

---

### Phase 5 — Compound intents (do two things from one command)

**Example:** *"Add a note to the Acme ticket and block out an hour in the calendar for it"*

Claude returns `intents: ["ticket_note", "ticket_calendar"]` with data for each.

Process each in sequence, single voice confirm covers both:
*"Adding a note to the Acme ticket and blocking out an hour today at 2pm. Confirm?"*

Both save on "yes". Both success messages spoken: *"Note added and calendar blocked."*

---

### Complete example flows after all phases built

**"Create a calendar entry for tomorrow at 10am for a meeting with Mr A with ABC Ltd"**
- Claude extracts: all fields present, confidence 0.95
- Phase 4 path: TTS speaks confirmation → auto-saves → "Done."

**"Schedule something with Acme Corp"**
- Missing: type, date/time, contact
- Phase 3: "What type — call, meeting, or follow-up?" → "A call"
- "When?" → "Next Thursday at 3pm"
- "Who are you speaking to?" → "Sarah the IT manager"
- TTS confirms → voice "yes" → saves

**"Remind me to call John"**
- Missing: when
- "When do you want to be reminded?" → "Tomorrow morning"
- TTS confirms → voice "yes" → saves

**"Urgent ticket — Acme server is completely down"**
- All fields present, high confidence
- Auto-saves immediately, TTS "Done."

**"Add a note saying the issue is resolved"** (while viewing a ticket)
- ticket_id from `window.__worktrackr_current_ticket` — no question needed
- TTS confirms → voice "yes" → saves

---

## Backlog (after voice overhaul)

### Payments Module
- **Phase 1 (backend):** `payments` table, `GET/POST/DELETE /api/invoices/:id/payments`, auto-update invoice `amount_paid`/`balance_due`/status
- **Phase 2 (frontend):** `PaymentsSection` in `InvoiceDetail` — payment history, inline form, running balance

### PWA / Mobile
Trusted Web Activity for Google Play Store.

### Splashtop Integration
One-click remote session from ticket detail via Splashtop Business API.

### idoyourquotes.com Integration
Link quote approval flows from the separate quotes product.

---

## Design system reference (Modern Enterprise)
- White container: `bg-white rounded-xl border border-[#e5e7eb] overflow-hidden`
- Table headers: `text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider bg-[#fafafa]`
- Zebra rows: odd=white, even=`bg-[#fafbfc]`, hover=`bg-[#fef9ee]`
- Gold primary button: `bg-[#d4a017] text-[#111113] hover:bg-[#b8860b]`
- Gold outline button: `border border-[#d4a017] text-[#b8860b] hover:bg-[#fef9ee]`
- Gold focus rings: `focus:ring-[#d4a017]/30 focus:border-[#d4a017]`
- AI accent box: `bg-[#fef9ee] border border-[#d4a017]/30 rounded-xl`
- Sub-component rule: ALL sub-components at module level, never inside parent function body
