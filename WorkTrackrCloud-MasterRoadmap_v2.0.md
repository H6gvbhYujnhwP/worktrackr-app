# WorkTrackr Cloud: Master Development Roadmap v2.0

**Version:** 2.4
**Date:** April 2026 (updated Session 16)

---

## AI Policy
All AI reasoning uses **Anthropic Claude** (`claude-haiku-4-5-20251001`).
Audio transcription uses **OpenAI Whisper** (`whisper-1`) — speech-to-text only, no Anthropic equivalent.
No other AI providers.

---

## Completed

### ✅ AI Phase 1 — Email Classifier
Real Anthropic Claude call in `email-intake.js`. Keyword fallback if API key absent.

### ✅ AI Phase 2 — AI Quote Generation (original)
`quotes-ai.js`, `quotes-ai-generate.js` — Claude generates quote line items. Gold AI badge on AI-generated quotes.

### ✅ AI Phase 3 — Smart Summaries
`summaries.js` — Summarise Ticket button (ticket sidebar) + Summarise for Customer button (quote Quick Actions).

### ✅ Notes Feature — Personal + Company
- **My Notes** (`my-notes`) — private per user. Pin, due dates (reminders), complete toggle, filter tabs. Sidebar: MAIN section.
- **Company Notes** (`company-notes`) — all staff read/write. Three types: note / knowledge / announcement. Categories, admin pin, version history. Sidebar: MAIN section.

### ✅ Audio Stage 1 — Inline Dictation in Notes (COMPLETE)
`DictationButton.jsx` — Web Speech API, live preview, en-GB. Added to PersonalNotes and CompanyNotes.

### ✅ Audio Stage 2 — Meeting Audio Upload to Ticket (COMPLETE)
Upload audio or paste transcript → Whisper → Claude extraction → mandatory review → posts to ticket thread as structured audio note entry.

### ✅ Audio Stage 3 — Voice Dictation Assistant / Mode 2 (COMPLETE)
Floating gold mic FAB, global. Web Speech API, max 60s. Claude routes intent to: ticket note, new ticket, personal note, personal reminder, company note, CRM calendar, ticket calendar. Mandatory review + browser TTS confirmation loop.

### ❌ AI Phase 4 — CRM Next-Action Suggestions — REMOVED (too thin)
### ❌ AI Phase 5 — Natural Language Ticket Search — REMOVED (too thin)

---

### ✅ Ticket Redesign Option A (COMPLETE)
Full rewrite of `TicketDetailViewTabbed.jsx`:
- **Customer / contact strip** — persistent bar below title bar. Four states: loading (AI scanning), matched (business name + contact + phone + email + optional "AI matched" badge), hint (amber bar when name detected but not in CRM), empty (ghost link button). Contact picker modal — searchable, gold selection. Contact linkage persisted to DB via `contact_id` on tickets table.
- **AI customer matching** — `POST /api/tickets/:id/match-contact` calls Claude on ticket open when no contact is linked. Confident match auto-populates with green badge. Ambiguous name → amber prompt. No match → ghost button. Fully server-side (API key never exposed).
- **Compose area at top** — Update / Internal note / Request approval / Audio tabs now sit above the conversation thread (below job strip), not below it.
- **✦ Generate quote button** — in compose tab row top-right. Now opens AI review panel (see below).

### ✅ COMPLETE — Quote Line Items Redesign
Complete rebuild of the quote line item editor.

**Two sections:** Materials & parts / Labour & other charges — each with its own "Add" button.

**Per line item fields:** Description, Supplier, Type, Qty, Buy £, Sell £, Line total, Profit, VAT toggle per line.

**Footer totals (all live):** Total buy-in, Subtotal ex VAT, VAT total (20%), Total inc VAT, Total profit + margin %.

### ✅ COMPLETE — AI Quote Generation from Ticket (Session 16)

"✦ Generate quote" button in ticket detail reads everything on the ticket and pre-fills a new quote with AI-suggested line items.

**Backend:** `POST /api/quotes/generate-from-ticket` (`web/routes/quotes-from-ticket.js`). Reads ticket title/description/sector/duration, all thread comments (labelled by type, date, author), and the org's active product catalogue. Calls Claude (`claude-haiku-4-5-20251001`). Returns structured line items with `confidence`, `source`, `flagged`, `flag_reason`, `catalogue_sourced` fields.

**Review panel** (`GenerateQuotePanel` — module-level in `TicketDetailViewTabbed.jsx`):
- Slide-in from right, full-height overlay
- Confidence dot per item: green = high, amber = medium, red = low
- Flagged items highlighted amber with `flag_reason` banner
- Catalogue-matched items carry blue "Catalogue" badge
- User can remove items before confirming (strikethrough + restore)
- "Confirm & open quote" writes to `sessionStorage('worktrackr_ai_quote_prefill')` then navigates to `/app/crm/quotes/new?ticket_id=...`

**Bridge:** `QuoteFormTabs.jsx` reads sessionStorage on mount, sets `aiDraftData`, clears the key, skips AI Generator tab → lands directly on pre-filled manual form.

**Line item lock mechanism** (in `QuoteForm.jsx`):
- AI-generated rows: gold **AI** badge (Sparkles icon) above Description field
- Catalogue-sourced rows: blue **Catalogue** badge (Tag icon)
- A row can carry both badges simultaneously
- Any user edit to a real field → both badges cleared, `locked: true` permanently set
- Manually added rows never receive badges
- `ai_generated`, `catalogue_sourced`, `locked` are frontend-only — never sent to the API

---

## Upcoming — "Top up from notes"

After a quote has already been generated from a ticket, if new notes are added to the ticket, a "Top up" button should appear on the quote.

- Sends only the new notes (those added after the quote was created) to Claude
- Returns new suggested items only — never touches existing rows
- Same review panel as the initial generation
- Locked rows are never touched by top-up
- Implementation: needs a `quote_generated_at` timestamp on the quote, plus a "Top up" button in the QuotesTab when a quote already exists for the ticket

---

## Upcoming — Notes Enhancements

Both Personal Notes and Company Notes gain two new row actions:

**"Create ticket from note"**
- Opens Create Ticket modal with note title → ticket title, note body → ticket description pre-filled
- User reviews and confirms
- Once ticket created, a link to it appears on the note

**"Add to existing ticket"**
- Opens a searchable picker of open tickets
- Note body is posted to that ticket's thread as an internal note (with note title and timestamp)
- Available to any staff member on company notes; note owner only on personal notes

---

## Upcoming — Full Ticket-to-Invoice Workflow

**Vision:** Ticket → Quote → Customer approval → Work → Completion → Invoice — all in one place, no re-entry.

**Quote integration inside ticket**
- Quote events (created, sent, approved, declined) post automatically to thread
- Status auto-advances on customer approval

**Work logging**
- Time and parts logged against ticket from within the thread
- Variation quotes raised if scope changes

**Invoice generation from ticket**
- "Generate invoice" button appears when job is marked complete
- Pre-populated from: approved quote line items, variations, time logged, parts used
- Thread is the full audit trail

---

## Future Integration — idoyourquotes.com

A separate application (idoyourquotes.com) handles quote creation and customer approval. Future bi-directional webhook integration:
- WorkTrackr fires job/ticket to idoyourquotes.com as a quote request
- Customer approves on idoyourquotes.com
- Approved quote + pricing returned to WorkTrackr via webhook, posted to ticket thread
- Invoice generation pulls from returned data

**Priority:** deferred until ticket workflow redesign and invoice module complete.

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
