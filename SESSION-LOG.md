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
- **Last session:** 2026-04-12 (Session 27)
- **Next priority:** Payments module — Phase 1 (backend only)

---

## Session 27 — 2026-04-12

### Rename Jobs → Projects — Phase 2 (frontend labels only)

#### Scope
Four files audited in full before any changes: `TicketDetailViewTabbed.jsx`, `QuoteForm.jsx`,
`QuoteDetails.jsx`, `IntegratedCalendar.jsx`. Only `TicketDetailViewTabbed.jsx` contained
user-visible "Job" strings. No backend files touched. No logic changes.

#### Audit results

| File | "Job/Jobs" found | User-visible | Changed? |
|---|---|---|---|
| `TicketDetailViewTabbed.jsx` | Line 1539 label, line 1562 tooltip | Yes | **Yes** |
| `QuoteForm.jsx` | None | — | No — skipped |
| `QuoteDetails.jsx` | None | — | No — skipped |
| `IntegratedCalendar.jsx` | None | — | No — skipped |

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

## Session 26 — 2026-04-12

### Rename Jobs → Projects — Phase 1 (frontend labels only)

#### Scope
Labels-only pass. No backend files touched. No logic, route, API path, state field name, or internal identifier changed. All internal `'jobs'` identifiers preserved exactly. Sub-component rule maintained throughout (no structural changes).

#### Modified files
| File | Lines changed | What changed |
|---|---|---|
| `Sidebar.jsx` | CRM_ITEMS array | `label: 'Jobs'` → `label: 'Projects'` (id/view stay `'jobs'`) |
| `JobsList.jsx` | Page title, subtitle, stat label, Create button x2, search placeholder, table column header `Job #` → `Project #`, empty-state texts, footer count | All user-visible "Job/Jobs" → "Project/Projects" |
| `JobDetail.jsx` | Loading text, fetch error string, error-state back button, card headers x2, meta label, Cancel button, status/cancel alert strings | Same |
| `JobForm.jsx` | Loading text, alert strings x2, page title (create + edit + edit-with-number), subtitle, section card header + subtitle, field label, save button labels x2, PUT/POST/catch error strings | Same |
| `CRMCalendar.jsx` | `eventTypes` job entry label, event detail modal header, "View Job" button | `'Job'` → `'Project'` in all three places |
| `InvoiceDetail.jsx` | "Linked Job" section label | → "Linked Project" |
| `InvoicesList.jsx` | "Job" table column header | → "Project" |
| `Dashboard.jsx` | File-header comment only | No visible "Job" text existed; internal view id `'jobs'` unchanged |

#### Must-not-break checklist (verified)
- [x] All `/api/jobs` API paths unchanged
- [x] All `/app/jobs/…` navigate routes unchanged
- [x] All `view: 'jobs'` identifiers unchanged
- [x] `currentView === 'jobs'` in Dashboard unchanged
- [x] `value: 'job'` in CRMCalendar eventTypes unchanged (`_isJob`, `_jobId` fields unchanged)
- [x] Sidebar `id: 'jobs'` and `view: 'jobs'` unchanged (only `label` changed)
- [x] Sub-component rule: no structural changes, all components remain at module level

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
