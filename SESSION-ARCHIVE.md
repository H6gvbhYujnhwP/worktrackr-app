# WorkTrackr Cloud — Session Archive

> This file contains sessions older than the last 2. It is **not** read at the start of normal sessions.
> Only read this file when debugging a historical issue or tracing when a specific change was made.

---

## Session 20 — Jobs Module Phase 2 — UI (List View + Detail Page + Create Form)

#### Files changed
| File | Change |
|---|---|
| `web/client/.../Sidebar.jsx` | Added `Briefcase` icon. Added Jobs nav item to CRM_ITEMS. |
| `web/client/.../AppLayout.jsx` | Added `jobs: 'jobs'` to VIEW_TO_PAGE map. |
| `web/client/.../Dashboard.jsx` | Imported `JobsList`. Added render clause. |
| `web/client/.../App.jsx` | Added routes `jobs/new` and `jobs/:id`. |

#### Files created
| File | Purpose |
|---|---|
| `JobsList.jsx` | Jobs list — stat strip, search, status filter, table |
| `JobDetail.jsx` | Job detail — 2+1 layout, time entries, parts, status actions |
| `JobForm.jsx` | Create job form |
| `JobDetailWithLayout.jsx` | Route wrapper |
| `JobFormWithLayout.jsx` | Route wrapper |

---

## Session 19 — AI Quote Generation from Ticket

#### Files changed
| File | Change |
|---|---|
| `web/routes/quotes.js` | `POST /api/quotes/generate-from-ticket` — Claude reads ticket thread, returns structured line items |
| `web/client/.../TicketDetailViewTabbed.jsx` | `GenerateQuotePanel` slide-in, `ReviewItemRow`, `ConfidenceDot` — all module-level |
| `web/client/.../QuoteForm.jsx` | `sessionStorage` prefill reader, AI badge, Catalogue badge, lock-on-edit mechanism |

#### Architecture — Line item lock mechanism
- `ai_generated: true` rows → gold AI badge (Sparkles icon)
- `catalogue_sourced: true` rows → blue Catalogue badge (Tag icon)
- Any user edit to any field → both badges cleared, `locked: true` set permanently
- `locked`, `ai_generated`, `catalogue_sourced` are stripped before API submission

---

## Session 15 — Quote Line Items Redesign + 6 Completions

#### Files changed
| File | Change |
|---|---|
| `QuoteForm.jsx` | Full line items rewrite. Unit, discount, line notes, margin panel. All sub-components module-level. |
| `QuoteDetails.jsx` | Full rewrite. LineItemsTable, MarginPanel, footer totals. |
| `SendQuoteModal.jsx` | Auto-generated email body, copy buttons. |
| `routes/quotes.js` | `unit`, `line_notes`, `buy_cost`, `supplier` in Zod + SQL. VAT-on-zero bug fixed. PDF overhauled. |
| `migrations/add_quote_lines_supplier.sql` | Adds `supplier` to `quote_lines` |
| `migrations/add_quote_lines_notes.sql` | Adds `line_notes` to `quote_lines` |

---

## Session 14 — Ticket Redesign Option A

#### Files changed
| File | Change |
|---|---|
| `routes/tickets.js` | `contact_id` added to schema; GET `/:id` JOINs contacts; new `POST /:id/match-contact` |
| `TicketDetailViewTabbed.jsx` | Full rewrite — Option A layout: CustomerStrip (4 UI states), ContactPickerModal, compose tabs pinned above thread, ✦ Generate quote button |

#### Architecture — CustomerStrip states
1. Loading
2. Amber hint bar (no contact matched)
3. Matched contact with AI badge
4. Ghost link button

---

## Session 13 — Audio Stage 3 + Notes Enhancements

#### Files created/modified
| File | Change |
|---|---|
| `VoiceAssistant.jsx` | Floating gold mic FAB, Web Speech API 60s limit, Claude intent → 7 destinations, mandatory review, browser speechSynthesis confirmation |
| `routes/transcribe.js` | Added `POST /voice-intent` endpoint |
| `AppLayout.jsx` | Import + render `<VoiceAssistant />` |
| `TicketDetailViewTabbed.jsx` | `useEffect` sets/clears `window.__worktrackr_current_ticket` global |
| `PersonalNotes.jsx` | `NewTicketFromNoteModal`, `AddNoteToTicketModal` (module-level) |
| `CompanyNotes.jsx` | Same additions |

---

## Session 12 — Audio Stage 2 — Meeting Audio Upload to Ticket Thread

#### Files changed
| File | Change |
|---|---|
| `routes/transcribe.js` | New `POST /ticket-note` endpoint; `/extract-ticket` swapped from GPT-4 to Claude |
| `routes/tickets.js` | `audio_note` added to `comment_type` enum |
| `TicketDetailViewTabbed.jsx` | Audio tab, `AudioComposePanel` state machine, `AudioNoteEntry` purple-badged cards — all module-level |

---

## Session 11 — Audio Stage 1 — Inline Dictation in Notes

#### Files created/modified
| File | Change |
|---|---|
| `DictationButton.jsx` | Reusable mic button. Web Speech API `lang: en-GB`. `onResult(text)` callback. Live preview box. |
| `PersonalNotes.jsx` | DictationButton added below body textarea in NoteForm |
| `CompanyNotes.jsx` | DictationButton added below body textarea in SharedNoteForm |

---

## Sessions 1–10 — Foundation

| Session | Work Done |
|---|---|
| 1–3 | UI shell: AppLayout, Sidebar, App.css, all module screens |
| 4–5 | AI Phase 1: email intake classifier (Claude, keyword fallback) |
| 6 | Auth cookie fix, public-auth stub replaced, admin audit log fix |
| 7 | AI Phase 2: Generate Quote with AI (ticket → AI draft → review → save) |
| 8 | AI Phase 3: Smart Summaries (Summarise Ticket + Summarise for Customer) |
| 9 | Ticket Calendar full rewrite (DB-backed), inline sub-component anti-pattern sweep |
| 10 | CRM contacts snake_case normaliser + Zod data-loss fix on PUT routes |
