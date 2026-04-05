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
- **Last session:** 2026-04-05 (Session 10)
- **Live URL:** https://worktrackr.cloud
- **Deploy platform:** Render (auto-deploys on GitHub push)
- **Last fixes applied:** Notes feature complete — Personal Notes (My Notes) and Company Shared Notes
- **Next priority:** Audio Feature — Mode 1 (meeting audio upload to ticket Notes tab)

---

## AI Policy (confirmed Session 10)
All AI features use **Anthropic Claude** exclusively (`claude-haiku-4-5-20251001`).
Audio transcription uses **OpenAI Whisper** (`whisper-1`) — speech-to-text only, no viable Anthropic equivalent.
The existing `transcribe.js` uses OpenAI GPT-4 for extraction — must be swapped to Claude before Audio feature ships.
No other AI providers.

---

## Session 10 — 2026-04-05

### Part 1 — Roadmap decisions (no code)
- AI Phase 4 (CRM Next-Action Suggestions) removed
- AI Phase 5 (Natural Language Ticket Search) removed
- Audio Feature (two modes) specced and added to roadmap
- Notes feature (Personal + Company) specced and added to roadmap

### Part 2 — Notes Feature (complete)

#### Files created

| File | Location | Purpose |
|---|---|---|
| `add_notes_tables.sql` | `web/migrations/` | Creates `personal_notes`, `shared_notes`, `shared_note_versions` tables |
| `notes.js` | `web/routes/` | All 7 REST endpoints for both note types |
| `PersonalNotes.jsx` | `web/client/.../components/` | My Notes — CRUD, pin, due dates, complete toggle, filter tabs |
| `CompanyNotes.jsx` | `web/client/.../components/` | Company Notes — CRUD, types, categories, pin (admin), version history |

#### Files modified

| File | Change |
|---|---|
| `server.js` | 2 lines: require notes route + app.use('/api/notes') |
| `Sidebar.jsx` | `company-notes` and `my-notes` added to MAIN_ITEMS; StickyNote + BookOpen imported |
| `AppLayout.jsx` | Both views added to PAGE_TITLES and VIEW_TO_PAGE |
| `Dashboard.jsx` | PersonalNotes + CompanyNotes imported; two currentView render cases added |

#### API endpoints
- `GET/POST/PATCH/DELETE /api/notes/personal` — personal notes CRUD (ownership enforced)
- `GET/POST/PATCH/DELETE /api/notes/shared` — shared notes CRUD (admin can delete any, pin, announce)
- `GET /api/notes/shared/:id/versions` — version history

#### Key behaviours
- `req.orgContext.role` used for admin checks (not `membership.role`)
- Version snapshot saved automatically on shared note edit if title or body changed
- Non-admins cannot set note_type=announcement or pin=true (silently overridden server-side)
- Pinned announcements float to top in Company Notes view
- Overdue reminder banner in My Notes when any due date is past

#### Testing checklist
- [ ] Sidebar shows Company Notes + My Notes for all users (not just admins)
- [ ] My Notes: create / edit / delete / pin / complete / due date all work
- [ ] Overdue banner appears when reminder is past due
- [ ] Company Notes: regular user sees type dropdown defaulting to Note only
- [ ] Company Notes: admin sees Announcement type + pin checkbox
- [ ] Pinned announcement floats to top with gold border
- [ ] Edit any shared note → version history button → modal shows previous versions
- [ ] Category filter dropdown populates after first categorised note
- [ ] Regular user delete button hidden on other users' notes

---

## Session 9 — 2025-04-04

### AI Phase 3 — Smart Summaries
`summaries.js` new route. Summarise Ticket button in ticket sidebar. Summarise for Customer button in Quote Quick Actions. Both use claude-haiku.

### AI Phase 2 — Generate Quote with AI
`quotes-ai.js`, `quotes-ai-generate.js` swapped to Anthropic. `QuotesTab.jsx`, `QuoteFormTabs.jsx`, `QuoteForm.jsx` updated.

---

## Session 8 — 2025-04-04
UI Push 3 — QuoteFormTabs, CreateTicketModal, IntegratedCalendar, BookingCalendar.

## Session 7 — 2025-04-04
Sub-component anti-pattern sweep. CRM contacts save bugs fixed.

## Session 6 — 2025-04-04
Dashboard TicketsView focus fix. ContactManager modal focus fix. Polling interval removed.

## Session 5 — 2025-04-03
UI Push 2 complete. AI Phase 1 — Anthropic email classifier.

## Sessions 1–4 — 2025-04-01 to 2025-04-02
Auth, calendar rewrite, UI Pushes 1–2, bulk ops hotfix.

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
