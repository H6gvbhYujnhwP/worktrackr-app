# WorkTrackr Cloud: Master Development Roadmap v2.0

**Version:** 2.3
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
- **✦ Generate quote button** — in compose tab row top-right, navigates to Quotes tab. Wired ready for AI quote generation flow.

## Upcoming — Quote Line Items Redesign

Complete rebuild of the quote line item editor.

**Two sections:** Materials & parts / Labour & other charges.

**Per line item fields:**
- Description (free text)
- Supplier / source (free text)
- Type (dropdown: material / labour / expense / subcontractor)
- Quantity
- Buy price £ — cost to business
- Sell price £ — charged to customer. Turns red if below buy price
- Line total (sell × qty, auto-calculated)
- Profit ((sell − buy) × qty, auto-calculated)
- VAT toggle per line — defaults to Ex VAT. Flip to +VAT adds 20% to that line's VAT contribution

**Footer totals (all live):** Total buy-in · Subtotal ex VAT · VAT total · Total inc VAT · Total profit + margin %

VAT rate fixed at 20% for now. Per-line rate (e.g. 5% domestic energy) deferred to a future session.

---

## Upcoming — AI Quote Generation from Ticket

"✦ Generate quote" button in ticket detail reads everything on the ticket and pre-fills a new quote with suggested line items.

**Inputs Claude reads:**
- Ticket title and description
- All thread notes and internal comments
- Audio meeting note extractions (structured Stage 2 output)
- Scheduled duration and sector
- Product catalogue — Claude attempts to match mentioned items to catalogue entries and pulls in buy/sell prices and supplier. If no catalogue match, description is pre-filled and pricing left blank for the user

**Flow:**
1. Click "Generate quote"
2. Claude extracts suggested line items
3. Mandatory review panel — each item shown with its source (e.g. "from internal note 4 Apr") and a confidence indicator. User can remove items before the quote opens
4. Confirm → quote form opens pre-filled

**Line item lock mechanism:**
- Every AI-generated row carries a visible **"AI"** badge
- Every row where buy price, sell price, or supplier was pulled from the product catalogue carries a separate visible **"Catalogue"** badge
- A row can carry both badges simultaneously (AI suggested the item AND catalogue supplied the pricing)
- User edits any field on a row → both badges disappear, row becomes `locked: true` permanently
- Locked rows are never modified by any future AI action, including regeneration
- Deleted rows are gone — never restored by AI
- Manually added rows are never AI-touched

**"Top up from notes" option:**
- After a quote has been generated, if new notes are added to the ticket a "Top up" option appears
- Top up only suggests new items — never touches existing rows (locked or unlocked)
- Same review panel before anything is added

**AI flagging:**
- Items Claude is uncertain about are flagged inline in the review panel, e.g. "Switch mentioned but model unclear — description left blank"
- Flagged items appear but are highlighted so the user knows to review them before confirming

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
- "Create quote" from inside the ticket thread
- Quote events (created, sent, approved, declined) post automatically to thread
- Status auto-advances on customer approval
- Pings assigned engineer and manager

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
