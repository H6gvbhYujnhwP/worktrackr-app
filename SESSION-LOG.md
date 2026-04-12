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
- **Last session:** 2026-04-12 (Session 29)
- **Next priority:** Payments module — or Quote Line Items Redesign (see ROADMAP.md backlog)

---

## Session 29 — 2026-04-12

### Voice Assistant Overhaul — All 5 Phases

#### Files changed
| File | What changed |
|---|---|
| `web/routes/transcribe.js` | Phase 1: `company`/`contact` added to `crm_calendar` schema in `buildVoiceIntentPrompt`. Phase 3: added `conversationHistory` param (3rd arg), `CONVERSATION SO FAR` block injected into prompt, `clarification_needed`/`missing_fields`/`question` added to response schema, required-fields-per-intent documented in prompt. Phase 5: compound intent shape and instructions added to prompt. POST handler: extracts `conversationHistory` from body, passes to `buildVoiceIntentPrompt`, logs round count. |
| `web/client/src/app/src/components/VoiceAssistant.jsx` | Full overhaul — 5 phases. See breakdown below. |

#### VoiceAssistant.jsx breakdown

**Phase 1 — CRM calendar fix (Bug #2 resolved):**
- `CrmCalendarFields`: added Company + Contact text inputs (2-column grid, optional)
- `saveIntent()` crm_calendar case: now passes `company` and `contact` in POST body

**Phase 2 — Voice confirmation loop (Bug #1 resolved):**
- New phase `voice_confirm` between `review` and `saving`
- `beginConfirmRecognition()`: opens 8s Web Speech window; listens for affirmatives/negatives
  - Affirmative → auto-calls `handleConfirm` with current editData/editItems
  - Negative → `handleRetry` + speaks "Cancelled."
  - Timeout/ambiguous → falls to review panel (tap still available)
- `VoiceConfirmIndicator`: amber pulsing dot + countdown + "Hear again" button (module-level ✅)
- `speak()` updated with `onEnd` callback param (double-fire guarded with `fired` flag + length-based fallback)
- `editData` lifted out of `ReviewPanel` to `VoiceAssistant` level — ReviewPanel now receives `editData`/`onEditData` as props
- `onReviewTtsEnd` callback: transitions review → voice_confirm after TTS fires
- `handleHearAgain`: stops current confirm rec, re-speaks, restarts 8s window

**Phase 3 — Clarification rounds:**
- New phase `clarifying` between `processing` and `review`
- `ClarifyingPanel`: amber question box, 10s arc countdown, live answer preview, "Skip and fill in manually" link (module-level ✅)
- `startClarifyMic(history, round)`: 10s Web Speech; on result appends to history, re-calls `submitTranscript`; on no-speech falls to review; hard-stop at 10s
- `conversationHistory` state (array of `{role, content}` pairs)
- `clarifyRound` state (max 3); beyond 3 Claude proceeds with best guess per prompt instruction
- `submitTranscript` updated: accepts `(transcript, history, round)` — injects history into POST body

**Phase 4 — Smart auto-save:**
- `REQUIRED_FIELDS` constant: maps intent → required field names
- `shouldAutoSave(result)`: returns true when `confidence >= 0.9` AND `clarification_needed === false` AND all required fields present; returns false for compound/unknown
- Auto-save path in `submitTranscript`: skips review entirely, speaks confirmation + saves simultaneously, speaks "Done!", success panel closes after 2.2s; falls to review if save fails

**Phase 5 — Compound intents:**
- `editItems` state: array of `{intent, data}` for compound results
- `CompoundReviewPanel`: stacked sections per item, each with IntentBadge header + editable fields; single confirm saves both (module-level ✅)
- `handleConfirm` handles compound: iterates `editItems`, saves each via `saveIntent`, joins success messages with ` & `
- Voice confirm works identically for compound: affirmative reads from `editItemsRef.current` when intent is compound

#### Stale-closure guard refs (all updated inline each render)
`resultRef`, `editDataRef`, `editItemsRef`, `handleConfirmRef`, `handleRetryRef`, `startVoiceConfirmRef`, `submitTranscriptRef`, `startClarifyMicRef`, `stopRecordingRef`

#### Sub-component rule compliance
All 20 functions in VoiceAssistant.jsx defined at module level (before line 790). Zero sub-components inside VoiceAssistant's function body. ✅

#### Phase state machine
`idle` → `recording` → `processing` → [`clarifying` (×max 3)] → [`voice_confirm` → `saving`] OR [auto-save: `saving` directly] → `success`

---

## Session 28 — 2026-04-12

### AI Phase 4 — CRM Next-Action Suggestions

#### Files changed
| File | What changed |
|---|---|
| `web/routes/summaries.js` | Added `POST /api/summaries/crm-event/:id/next-action`. Fetches event from DB (org-verified), resolves contact name via JOIN, accepts supplemental `company`/`contact` strings from body. Calls Claude Haiku. Returns `{ suggestion, actions[] }`. Graceful fallback on JSON parse error. |
| `web/client/src/app/src/components/CRMCalendar.jsx` | Added `Sparkles`, `Ticket`, `FileText`, `CalendarPlus` imports. Two module-level components: `NextActionButton`, `NextActionBox`. Added `nextAction`/`nextActionLoading` state. Extended `markEventDone` to fire next-action endpoint (non-blocking). Added `handleNextAction` for `new_ticket`, `new_quote`, `schedule_followup`. `NextActionBox` rendered below notes in CRM event body. All close/delete paths reset `nextAction`. |

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
