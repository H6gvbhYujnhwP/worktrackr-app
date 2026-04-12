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
- **Last session:** 2026-04-12 (Session 23)
- **Next priority:** Invoices module — see ROADMAP.md for full spec

---

## Session 23 — 2026-04-12

### Bug fixes only — 2 confirmed bugs

#### Bug 1 — DictationButton.jsx: Unsupported browser renders null silently

**Root cause:** Line 142 had `if (!SpeechRecognition) return null;` — completely invisible in Firefox/Safari.

**Fix:** Replace the `return null` with a rendered disabled `<button>` that:
- Matches the normal Dictate button visual style (`inline-flex`, border, same padding/font)
- Is `disabled` and `opacity-50 cursor-not-allowed`
- Has `title="Voice dictation requires Google Chrome or Microsoft Edge"` as a visible tooltip on hover
- Updated JSDoc comment on line 18 and the guard comment on line 142 to match

#### Bug 2 — VoiceAssistant.jsx: 60-second auto-stop gives no user feedback

**Root cause:** Line 731 was `maxTimerRef.current = setTimeout(() => stopRecording(), MAX_RECORD_MS);` — no user-facing message when the timer fired.

**Fix:** Expand the callback to call `setError('Time limit reached — recording stopped after 60 seconds.')` before `stopRecording()`. The error banner renders at the top of the panel body for all phases, so the message is visible during the processing phase. It is cleared automatically by `handleRetry` (`setError('')`) and `handleCancel` (`setError('')`).

#### Testing checklist
- [ ] Open DictationButton in Firefox or Safari → disabled greyed-out "Dictate" button is visible (not invisible)
- [ ] Hover over the disabled button → tooltip reads "Voice dictation requires Google Chrome or Microsoft Edge"
- [ ] Open VoiceAssistant in Chrome, start recording, wait 60 seconds → "Time limit reached — recording stopped after 60 seconds." banner appears
- [ ] After 60s auto-stop, banner persists through processing phase
- [ ] Click Retry in review panel → banner clears
- [ ] Click Cancel → banner clears
- [ ] Manual stop (user taps Stop recording before 60s) → no time-limit banner appears

---

## Session 22 — 2026-04-12

### Fix 1 — Edit Job header shows job number (`JobForm.jsx`)

Three targeted changes:
- Added `const [jobNumber, setJobNumber] = useState('');`
- In edit-mode fetch: `setJobNumber(job.jobNumber || '');` after `data.job` received
- Header h1: `isEditMode ? (jobNumber ? \`Edit Job — ${jobNumber}\` : 'Edit Job') : 'Create Job'`

### Fix 2 — Jobs Calendar Integration (`CRMCalendar.jsx`)

No backend changes — uses existing `/api/jobs?limit=500`.

| Change | Detail |
|---|---|
| Added imports | `useNavigate`, `Briefcase`, `ExternalLink` |
| Added `job` type to `eventTypes` | Gold/amber: `bg-[#fef9ee] text-[#b8860b]`, Briefcase icon |
| `jobEvents` state | Fetched on mount, filtered to `scheduledStart && status !== 'cancelled'` |
| `getEventsForDate()` | Now merges CRM events + job events |
| Event detail modal | `_isJob` branch: shows job number, title, date/time, contact, assigned-to, status badge. Footer: Close + "View Job →" (navigates to `/app/jobs/:id`). No edit/delete/mark-done for jobs. |

### Documentation restructure
- `SESSION-LOG.md` — now keeps last 2 sessions only
- `SESSION-ARCHIVE.md` — all sessions prior to last 2 (new file)
- `APP-STATE.md` — new single-page snapshot: module status, bugs, file map, key APIs (new file)
- New session start prompt updated to read all three docs instead of just session log + roadmap

---

## Rules for Claude — must follow every session

1. **Read `SESSION-LOG.md`, `APP-STATE.md`, `ROADMAP.md` in full** before writing anything
2. **Sub-component rule:** Never define `const Foo = () => ...` inside a parent function body — always module-level or plain render helpers. Causes React to remount subtrees and destroys input focus on every keystroke.
3. **State impact explicitly** before touching any file — which other files import or depend on it
4. **Never change function signatures, export shapes, or API response structures** without checking every consumer
5. **Backend snake_case / frontend camelCase:** Always apply a normaliser on all response paths
6. **Zod `.default([])` trap:** Only write fields explicitly present in the request body on PUT routes — Zod defaults can silently overwrite DB values
7. **Delivery rule:** Changed code + SESSION-LOG.md + APP-STATE.md + ROADMAP.md — all together, never separately
8. **AI policy:** `claude-haiku-4-5-20251001` for all server-side reasoning. Whisper `whisper-1` for audio only. No other AI providers.
9. **One phase at a time.** Complete and deliver before starting the next.
10. **No logic changes during styling passes.** Keep UI and logic changes strictly separate.


### Fix 1 — Edit Job header shows job number (`JobForm.jsx`)

Three targeted changes:
- Added `const [jobNumber, setJobNumber] = useState('');`
- In edit-mode fetch: `setJobNumber(job.jobNumber || '');` after `data.job` received
- Header h1: `isEditMode ? (jobNumber ? \`Edit Job — ${jobNumber}\` : 'Edit Job') : 'Create Job'`

### Fix 2 — Jobs Calendar Integration (`CRMCalendar.jsx`)

No backend changes — uses existing `/api/jobs?limit=500`.

| Change | Detail |
|---|---|
| Added imports | `useNavigate`, `Briefcase`, `ExternalLink` |
| Added `job` type to `eventTypes` | Gold/amber: `bg-[#fef9ee] text-[#b8860b]`, Briefcase icon |
| `jobEvents` state | Fetched on mount, filtered to `scheduledStart && status !== 'cancelled'` |
| `getEventsForDate()` | Now merges CRM events + job events |
| Event detail modal | `_isJob` branch: shows job number, title, date/time, contact, assigned-to, status badge. Footer: Close + "View Job →" (navigates to `/app/jobs/:id`). No edit/delete/mark-done for jobs. |

#### Testing checklist
- [ ] Edit job form → header shows "Edit Job — JB-0001"
- [ ] CRM Calendar → scheduled jobs appear as gold blocks on their start date
- [ ] Cancelled jobs and jobs with no scheduled_start do not appear
- [ ] Click a job block → "Scheduled Job" modal (not CRM event modal)
- [ ] Modal: job number, title, date/time, contact, assigned-to, status badge
- [ ] "View Job →" navigates to job detail, modal closes
- [ ] CRM events still work normally — all original actions intact
- [ ] Stats panel still counts CRM events only

### Documentation restructure
- `SESSION-LOG.md` — now keeps last 2 sessions only
- `SESSION-ARCHIVE.md` — all sessions prior to last 2 (new file)
- `APP-STATE.md` — new single-page snapshot: module status, bugs, file map, key APIs (new file)
- New session start prompt updated to read all three docs instead of just session log + roadmap

---

## Session 21 — 2026-04-12

### Jobs Module Phase 3 — Edit Form + Time Entry / Parts Logging UI

#### Files changed
| File | Change |
|---|---|
| `JobForm.jsx` | Extended for edit mode. `useParams()` detects `id` → edit mode. Fetches job, pre-populates all fields via `isoToDatetimeLocal()`. PUTs to `/api/jobs/:id`. Status includes `invoiced` in edit mode. Back button → detail (edit) or list (create). |
| `JobDetail.jsx` | Module-level `AddTimeEntryForm`, `AddPartForm`. `refreshKey` pattern for both sections. Delete with confirm + spinner on each row. |
| `App.jsx` | Added `<Route path="jobs/:id/edit" element={<JobFormWithLayout />} />` |

#### refreshKey pattern (no useCallback)
```js
const [refreshKey, setRefreshKey] = useState(0);
useEffect(() => { /* fetch */ }, [jobId, refreshKey]);
const refresh = () => setRefreshKey(k => k + 1);
```

---

## Rules for Claude — must follow every session

1. **Read `SESSION-LOG.md`, `APP-STATE.md`, `ROADMAP.md` in full** before writing anything
2. **Sub-component rule:** Never define `const Foo = () => ...` inside a parent function body — always module-level or plain render helpers. Causes React to remount subtrees and destroys input focus on every keystroke.
3. **State impact explicitly** before touching any file — which other files import or depend on it
4. **Never change function signatures, export shapes, or API response structures** without checking every consumer
5. **Backend snake_case / frontend camelCase:** Always apply a normaliser on all response paths
6. **Zod `.default([])` trap:** Only write fields explicitly present in the request body on PUT routes — Zod defaults can silently overwrite DB values
7. **Delivery rule:** Changed code + SESSION-LOG.md + APP-STATE.md + ROADMAP.md — all together, never separately
8. **AI policy:** `claude-haiku-4-5-20251001` for all server-side reasoning. Whisper `whisper-1` for audio only. No other AI providers.
9. **One phase at a time.** Complete and deliver before starting the next.
10. **No logic changes during styling passes.** Keep UI and logic changes strictly separate.
