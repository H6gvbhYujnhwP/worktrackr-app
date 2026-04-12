# WorkTrackr Cloud — Session Log

> **Scope:** Last 2 sessions only. Older history is in `SESSION-ARCHIVE.md`.
> Claude reads `SESSION-LOG.md` + `APP-STATE.md` + `ROADMAP.md` at the start of every session.
> `SESSION-ARCHIVE.md` is only read when debugging a historical issue.

---

## Delivery rule
**Every time a phase or burst of work is completed, Claude must deliver:**
1. All changed code files
2. Updated `SESSION-LOG.md` (keep last 2 sessions; move older entries to `SESSION-ARCHIVE.md`)
3. Updated `APP-STATE.md` (module statuses, known bugs, file map)
4. Updated `ROADMAP.md`

All four delivered together in the same download batch. Never one without the others.

---

## New session start prompt
Paste this at the start of every new chat session:

> "You are continuing development of WorkTrackr Cloud, a SaaS field service and CRM platform. The live site is https://worktrackr.cloud. We work by: you produce fixed files, I download them and copy into my local repo at `C:\repos\worktrackr-app`, then push via GitHub Desktop so Render auto-deploys. Before doing anything, read the uploaded repo zip then read `SESSION-LOG.md`, `APP-STATE.md`, and `ROADMAP.md` in full. These three files tell you the current state, rules, and what to work on next. After each phase is complete, always deliver code files + SESSION-LOG.md + APP-STATE.md + ROADMAP.md together in one batch."

---

## Current State
- **Last session:** 2026-04-12 (Session 28)
- **Next priority:** Payments module — Phase 1 (backend only)

---

## Session 28 — 2026-04-12

### AI Phase 4 — CRM Next-Action Suggestions

#### Scope
After a CRM event is marked Done, Claude Haiku analyses the event context and suggests the next logical action. The suggestion appears as an amber AI box inside the event detail modal, directly below the event notes. Two contextual quick-action buttons navigate to the relevant form. Advisory only — never blocking. Suggestion can be dismissed.

#### Files changed

| File | What changed |
|---|---|
| `web/routes/summaries.js` | Added `POST /api/summaries/crm-event/:id/next-action`. Fetches event from DB (org-verified), resolves contact name via JOIN, accepts supplemental `company`/`contact` strings from body (not persisted in DB). Calls Claude Haiku with event type, title, contact, company, notes context. Returns `{ suggestion, actions[] }`. JSON parse error falls back gracefully rather than 500. |
| `web/client/src/app/src/components/CRMCalendar.jsx` | Added `Sparkles`, `Ticket`, `FileText`, `CalendarPlus` lucide imports. Added two **module-level** components: `NextActionButton` and `NextActionBox` (sub-component rule enforced). Added `nextAction` and `nextActionLoading` state. Extended `markEventDone` to fire the next-action endpoint (non-blocking, silent-fail). Added `handleNextAction` for three action types: `new_ticket` → navigate with React Router state, `new_quote` → navigate with state, `schedule_followup` → opens existing Schedule Meeting modal pre-filled. `NextActionBox` rendered inside CRM event body (below notes). All modal close/delete paths now also call `setNextAction(null)`. |

#### Sub-component rule compliance (verified)
- `NextActionButton` — defined at module level ✅
- `NextActionBox` — defined at module level ✅
- No new components defined inside `CRMCalendar` function body ✅

#### Action type routing
| Type | Destination |
|---|---|
| `new_ticket` | `navigate('/app/tickets/new', { state: { prefillContact, prefillCompany } })` |
| `new_quote` | `navigate('/app/crm/quotes/new', { state: { prefillContact, prefillCompany } })` |
| `schedule_followup` | Opens existing `showScheduleMeetingModal` pre-filled via `scheduleFromEvent()` |
| `none` | Filtered out — no button rendered |

#### Note on company/contact fields
`crm_events` DB table has no `company` or `contact` text columns (Zod schema silently drops them on create). The endpoint accepts them from the POST body as supplemental context. DB-joined `contact_name` (via `contacts` table) takes priority if available.

---

## Session 27 — 2026-04-12

### Rename Jobs → Projects — Phase 2 (frontend labels only)

#### Scope
Four files audited in full before any changes: `TicketDetailViewTabbed.jsx`, `QuoteForm.jsx`,
`QuoteDetails.jsx`, `IntegratedCalendar.jsx`. Only `TicketDetailViewTabbed.jsx` contained
user-visible "Job" strings. No backend files touched. No logic changes.

#### Modified files

| File | Lines changed | What changed |
|---|---|---|
| `TicketDetailViewTabbed.jsx` | 1539, 1562 | `"Job description"` → `"Project description"` (amber pinned bar label); `"Edit job description"` → `"Edit project description"` (button title tooltip) |

#### Must-not-break checklist (verified)
- [x] All `/api/jobs` API paths unchanged
- [x] All `/app/jobs/…` navigate routes unchanged
- [x] All `job_id`, `jobId`, `jobNumber`, `job_number` field references unchanged
- [x] JSX comment on line 1534 (`{/* Job description — always pinned */}`) left as-is (not user-visible)
- [x] Sub-component rule: no structural changes made

---

## Rules for Claude — must follow every session

1. **Read `SESSION-LOG.md`, `APP-STATE.md`, `ROADMAP.md` in full** before writing anything
2. **Sub-component rule:** Never define `const Foo = () => ...` inside a parent function body — always module-level or plain render helpers.
3. **State impact explicitly** before touching any file
4. **Never change function signatures, export shapes, or API response structures** without checking every consumer
5. **Backend snake_case / frontend camelCase:** Always apply a normaliser on all response paths
6. **Zod `.default([])` trap:** Only write fields explicitly present in the request body on PUT routes
7. **Delivery rule:** Changed code + SESSION-LOG.md + APP-STATE.md + ROADMAP.md — all together, never separately
8. **AI policy:** `claude-haiku-4-5-20251001` for all server-side reasoning. Whisper `whisper-1` for audio only.
9. **One phase at a time.** Complete and deliver before starting the next.
10. **No logic changes during styling passes.**
