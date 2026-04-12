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
- **Next priority:** Voice Assistant overhaul — full hands-free conversational flow (see ROADMAP.md for full spec)

---

## Session 28 — 2026-04-12

### AI Phase 4 — CRM Next-Action Suggestions

#### Files changed
| File | What changed |
|---|---|
| `web/routes/summaries.js` | Added `POST /api/summaries/crm-event/:id/next-action`. Fetches event from DB (org-verified), resolves contact name via JOIN, accepts supplemental `company`/`contact` strings from body. Calls Claude Haiku. Returns `{ suggestion, actions[] }`. Graceful fallback on JSON parse error. |
| `web/client/src/app/src/components/CRMCalendar.jsx` | Added `Sparkles`, `Ticket`, `FileText`, `CalendarPlus` imports. Two module-level components: `NextActionButton`, `NextActionBox`. Added `nextAction`/`nextActionLoading` state. Extended `markEventDone` to fire next-action endpoint (non-blocking). Added `handleNextAction` for `new_ticket`, `new_quote`, `schedule_followup`. `NextActionBox` rendered below notes in CRM event body. All close/delete paths reset `nextAction`. |

#### Sub-component rule compliance
- `NextActionButton` — module level ✅
- `NextActionBox` — module level ✅

---

### Voice Assistant Analysis (discussed, not yet built)

#### Problem identified
The current `VoiceAssistant.jsx` flow stops dead after TTS speaks the confirmation message — it waits silently for a screen tap. Not hands-free. Two specific bugs found in code:

1. **No voice confirmation loop** — after `speak(confirmation_message)` fires on `ReviewPanel` mount, the mic goes silent. User must tap "Confirm & save" on screen.
2. **CRM calendar missing company/contact** — `buildVoiceIntentPrompt` in `transcribe.js` does not include `company` or `contact` in the `crm_calendar` data schema. These fields are never extracted, never saved. Events created with blank company/contact.

#### Full spec agreed — see ROADMAP.md "Voice Assistant Overhaul" for complete detail.

---

## Session 27 — 2026-04-12

### Rename Jobs → Projects — Phase 2 (frontend labels only)

#### Modified files
| File | Lines changed | What changed |
|---|---|---|
| `TicketDetailViewTabbed.jsx` | 1539, 1562 | `"Job description"` → `"Project description"`; `"Edit job description"` → `"Edit project description"` |

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
