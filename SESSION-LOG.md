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
- **Last session:** 2026-04-11 (Session 16)
- **Live URL:** https://worktrackr.cloud
- **Deploy platform:** Render (auto-deploys on GitHub push)
- **Last fixes applied:** AI Quote Generation from Ticket — all three phases complete
- **Next priority:** "Top up from notes" option (Phase 4 of AI quote flow) OR Jobs Module

---

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
