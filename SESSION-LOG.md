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
- **Last fixes applied:** Notes feature complete — table layout (Option C) applied to both PersonalNotes and CompanyNotes
- **Next priority:** Audio Feature — Mode 1 (meeting audio upload to ticket Notes tab)

---

## AI Policy (confirmed Session 10)
All AI features use **Anthropic Claude** exclusively (`claude-haiku-4-5-20251001`).
Audio transcription uses **OpenAI Whisper** (`whisper-1`) — speech-to-text only, no viable Anthropic equivalent.
The existing `transcribe.js` uses OpenAI GPT-4 for extraction — must be swapped to Claude before Audio feature ships.
No other AI providers.

---

## Session 11 — 2026-04-05

### Stage 1 — Inline Dictation in Notes

**Approach agreed before coding:**
- Audio Feature broken into 3 stages: (1) inline dictation in Notes, (2) Audio tab on tickets (Whisper + Claude), (3) floating dictation assistant (Mode 2)
- Stage 1 uses Web Speech API — browser-native, free, no server
- `DictationButton.jsx` designed as a reusable module so Stage 3 can build on it

**Files created**
| File | Purpose |
|---|---|
| `DictationButton.jsx` | Reusable mic button with live preview box. Web Speech API. `onResult(text)` callback. |

**Files modified**
| File | Change |
|---|---|
| `PersonalNotes.jsx` | Import `DictationButton`. Added below body textarea in `NoteForm`. |
| `CompanyNotes.jsx` | Import `DictationButton`. Added below body textarea in `SharedNoteForm`. |

**DictationButton behaviour**
- Tap once → starts recording, button turns red + pulses, "Listening…" indicator appears
- Live preview box appears below: interim text shown in grey italic as user speaks, committed text in solid black
- Tap again → stops, text appended to note body (`prev + ' ' + text`)
- X button on preview clears the current session without saving
- `onerror` handles `not-allowed` (mic permission denied) with a user-friendly message
- `no-speech` and `aborted` errors silently ignored
- If `window.SpeechRecognition` / `window.webkitSpeechRecognition` unavailable → component returns null
- `lang: 'en-GB'` set

**Next: Stage 2 — Audio tab on tickets (Mode 1)**
- New "Audio" tab in `TicketDetailViewTabbed.jsx`
- Upload audio file OR paste transcript text
- Whisper (`whisper-1`) transcribes audio
- Claude (`claude-haiku-4-5-20251001`) extracts structured notes: summary, action items, key details, follow-ups
- Mandatory review step before saving
- Saves to ticket notes

---



### Part 1 — Roadmap decisions (no code)
- AI Phase 4 and Phase 5 removed
- Audio Feature (two modes) specced and added to roadmap
- Notes feature (Personal + Company) specced and added to roadmap

### Part 2 — Notes Feature (initial build)

#### Files created
| File | Location | Purpose |
|---|---|---|
| `add_notes_tables.sql` | `web/migrations/` | Creates `personal_notes`, `shared_notes`, `shared_note_versions` tables |
| `notes.js` | `web/routes/` | All 7 REST endpoints for both note types |
| `PersonalNotes.jsx` | `web/client/.../components/` | My Notes view |
| `CompanyNotes.jsx` | `web/client/.../components/` | Company Notes view |

#### Files modified
| File | Change |
|---|---|
| `server.js` | 2 lines: notes route registered |
| `Sidebar.jsx` | company-notes + my-notes added to MAIN_ITEMS |
| `AppLayout.jsx` | Both views in PAGE_TITLES + VIEW_TO_PAGE |
| `Dashboard.jsx` | PersonalNotes + CompanyNotes imported + view cases added |

### Part 3 — Notes UI redesign (table layout)

User reviewed the initial card-based design and requested a more compact layout for large note counts. Table view (Option C from three options presented) selected.

**Both components rewritten** — `PersonalNotes.jsx` and `CompanyNotes.jsx` — with the following changes:

- `NoteCard` / `SharedNoteCard` removed — replaced with `NoteRow` / `SharedNoteRow` (module-level table row components)
- Each note is a single compact table row (~36px tall)
- Body text shown as truncated preview inline next to the title (greyed out, hidden on mobile)
- Clicking the edit (pencil) button expands an inline form as a `<tr colSpan>` below that row — no navigation, no modal
- Due date / type badge / category / author visible at a glance as table columns
- Pinned rows get a subtle amber background tint (`bg-[#fffdf5]`)
- `table-fixed` layout prevents column blowout
- All API calls, state management, filter tabs, overdue banner, version history modal, and admin permission logic unchanged

#### API endpoints (unchanged from initial build)
- `GET/POST/PATCH/DELETE /api/notes/personal`
- `GET/POST/PATCH/DELETE /api/notes/shared`
- `GET /api/notes/shared/:id/versions`

#### Testing checklist after deploy
- [ ] My Notes: list renders as a compact table, not cards
- [ ] My Notes: each row shows title + truncated body preview + due date badge
- [ ] My Notes: click pencil icon → form expands inline below that row
- [ ] My Notes: save edit → row updates in place, form collapses
- [ ] My Notes: complete toggle, pin toggle, delete all work from row actions
- [ ] My Notes: overdue banner, filter tabs still work
- [ ] Company Notes: list renders as table with Type / Note / Category / Author columns
- [ ] Company Notes: pinned rows have amber tint
- [ ] Company Notes: edit expands inline, version history modal still opens
- [ ] Company Notes: admin-only pin button visible only to admins
- [ ] 50+ notes scroll comfortably without excessive vertical space

---

## Session 9 — 2025-04-04
AI Phase 3 — Smart Summaries. `summaries.js`, `TicketDetailViewTabbed.jsx`, `QuoteDetails.jsx`.

## Session 8 — 2025-04-04
UI Push 3 — QuoteFormTabs, CreateTicketModal, IntegratedCalendar, BookingCalendar.

## Session 7 — 2025-04-04
Sub-component anti-pattern sweep. CRM contacts save bugs fixed.

## Session 6 — 2025-04-04
Dashboard focus fix. ContactManager modal focus fix. Polling interval removed.

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

---

### Hotfix — Company Notes UX bugs (Session 10, Part 4)

**Root cause of both issues:**
The session endpoint returns `membership.role = 'admin'` for the first org user, so the admin check was working correctly. The type dropdown WAS showing in the form. The user named a note "knowledge 1" but didn't change the type selector from the default "Note" — the small dropdown was easy to overlook.

**Fix 1 — Type selector redesign (CompanyNotes.jsx)**
Replaced the small `<select>` dropdown with a visible three-button pill group (General note / Knowledge base / Announcement), each with an icon. The selected type is highlighted in gold. Impossible to miss or accidentally leave on the wrong value.

**Fix 2 — Tab rename (CompanyNotes.jsx)**
"Notes" tab renamed to "General". "Notes" implied "all notes", but it actually filtered to `note_type = 'note'` (i.e. general notes only). Renaming to "General" makes the distinction clear: All / General / Knowledge / Announcements.

**File changed:** `CompanyNotes.jsx` only. No backend, migration, or other file changes.

**Note for user:** The existing "knowledge 1" note was saved with type "note" and will continue to appear under "General", not "Knowledge". Edit it → change the pill to "Knowledge base" → save to reclassify it.

---

### Hotfix — New note defaults to active tab type (Session 10, Part 5)

**Issue:** Clicking "New note" while on the Knowledge tab opened the form defaulting to "General note" type. Same problem on Announcements tab.

**Fix:** One line in `CompanyNotes.jsx`. The create `<SharedNoteForm>` now receives `initial={{ note_type: filterType === 'all' ? 'note' : filterType }}`. The form already reads `initial?.note_type ?? 'note'` as its starting state, so the pill selector pre-selects the correct type automatically. No backend change.

Behaviour after fix:
- On "All" tab → new note defaults to General note
- On "General" tab → new note defaults to General note  
- On "Knowledge" tab → new note defaults to Knowledge base
- On "Announcements" tab → new note defaults to Announcement
