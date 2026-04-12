# WorkTrackr Cloud: Master Development Roadmap v2.0

**Version:** 2.6
**Date:** April 2026 (updated Session 18)

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

### ✅ COMPLETE — AI Quote Top-up from Notes (Session 17)

"Top up from notes" button appears on every quote card in the Quotes tab of a ticket. Sends only notes added *after* the quote's `created_at` to Claude, returns new suggested items, appended to the existing quote.

**Backend:** `POST /api/quotes/topup-from-ticket` (added to `web/routes/quotes-from-ticket.js`). Accepts `{ ticket_id, since_date }`. Filters comments to only those after `since_date`. Focused "new notes only" prompt — Claude told not to re-suggest anything already likely on the quote. Returns identical `{ line_items }` shape as the generate endpoint.

**Review panel** (`TopUpPanel` — module-level in `TicketDetailViewTabbed.jsx`):
- Blue-accented variant of `GenerateQuotePanel` (reuses `ReviewItemRow`, `ConfidenceDot`)
- Header shows quote number; loading text shows "Scanning notes added since [date]"
- If no new notes exist → empty state with Close button, no footer
- User removes/restores items before confirming
- "Add to quote" writes approved items to `sessionStorage('worktrackr_ai_topup_items')` then navigates to `/app/crm/quotes/{quoteId}`

**QuotesTab.jsx:** Accepts `onTopUp(quoteId, quoteNumber, sinceDate)` prop. Each existing quote card gains a "Top up from notes" button in a footer row (click-propagation stopped so card navigation doesn't fire).

**QuoteForm.jsx (edit mode):** On mount, after loading existing line items, checks `sessionStorage('worktrackr_ai_topup_items')`. If present: parses, clears key, maps items with `ai_generated: true` / `catalogue_sourced` flags, appends to existing rows. Existing rows untouched. New rows carry gold AI badge + existing clear-on-edit lock mechanism.

---

### ✅ COMPLETE — Notes Enhancements (Session 13 Part 2, confirmed Session 18)

Both Personal Notes and Company Notes have "Create ticket from note" (`NewTicketFromNoteModal`) and "Add to existing ticket" (`AddNoteToTicketModal`) — module-level components, fully wired.

### ✅ COMPLETE — Quote Events on Ticket Thread (Session 18)

Quote lifecycle events now auto-post to the linked ticket's thread.

**Events:** created (blue), sent (purple), accepted (green), declined (red).

**Backend:** `postQuoteEventToThread` helper in `web/routes/quotes.js`. Non-blocking — failures logged but never surface. Hooked into: CREATE, PUT status→sent, accept, decline. Body format: `[event] Quote QT-xxx … · £xxx`.

**Frontend:** `quote_event` branch in `ThreadEntry` (`TicketDetailViewTabbed.jsx`). Parses `[event]` prefix, renders coloured `DollarSign` icon circle + message + timestamp. No DB migration needed — `comment_type` is varchar.

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
- [x] Finalise DB schema
- [x] Jobs API (CRUD + time-entries + parts sub-resources)
- [x] Jobs list view + detail page
- [x] Job creation form
- [x] Job edit form
- [x] Time entry logging UI (add entries from detail page)
- [x] Parts logging UI (add parts from detail page)
- [ ] Calendar integration
- [x] Quote → Job conversion (handler was already written; table now exists)

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
