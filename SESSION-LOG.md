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
- **Last session:** 2026-04-12 (Session 24)
- **Next priority:** Invoices module — Phase 2 (frontend UI) — see ROADMAP.md

---

## Session 24 — 2026-04-12

### Invoices Module — Phase 1 (backend only)

#### New files
| File | Purpose |
|---|---|
| `web/migrations/create_invoices.sql` | Creates `invoices` + `invoice_lines` tables, `generate_invoice_number()` function. Adds FK from `jobs.converted_to_invoice_id → invoices` and `invoices.job_id → jobs` (both wrapped in `DO $$ IF EXISTS` guards for fresh-DB safety). |
| `web/routes/invoices.js` | Full CRUD + PDF for invoices. See API contract below. |

#### Modified files
| File | Change |
|---|---|
| `web/server.js` | Lines 193–196: added `// Invoices`, `require('./routes/invoices')`, `app.use('/api/invoices', authenticateToken, invoicesRoutes)` — inserted between Jobs and AI Summaries sections. |

#### API contract (Phase 2 must know this exactly)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/invoices` | `{ invoices: [...] }` — optional `?status=` filter. Each row includes `contact_name`, `job_number`, `job_title`. |
| GET | `/api/invoices/:id` | `{ invoice: { ...cols, contact_name, contact_email, contact_phone, job_number, job_title, lines: [...] } }` |
| POST | `/api/invoices` | Body: `{ job_id?, contact_id?, issue_date?, due_date?, notes? }`. Returns `{ invoice: fullInvoice }`. When `job_id` supplied: copies `job_parts` and `job_time_entries` as lines, sets `jobs.converted_to_invoice_id`. |
| PUT | `/api/invoices/:id` | Accepts only: `status`, `due_date`, `notes`, `invoice_number`. Returns `{ invoice: fullInvoice }`. |
| DELETE | `/api/invoices/:id` | Nulls `jobs.converted_to_invoice_id` first, then deletes. Returns `{ message, invoice }`. |
| GET | `/api/invoices/:id/pdf` | Streams PDF attachment. Filename: `invoice-INV-XXXX.pdf`. |

#### DB tables
- `invoices`: `id`, `organisation_id`, `job_id`, `contact_id`, `invoice_number` (INV-0001 format), `status` (draft/sent/paid/overdue), `issue_date`, `due_date`, `subtotal`, `vat_total`, `total`, `notes`, `created_at`, `updated_at`
- `invoice_lines`: `id`, `invoice_id`, `description`, `quantity`, `unit_price`, `line_total`, `vat_applicable` (bool, default true), `sort_order`, `created_at`

#### Testing checklist
- [ ] Deploy → migration runs, `invoices` and `invoice_lines` tables created
- [ ] `GET /api/invoices` returns `{ invoices: [] }` for empty org
- [ ] `POST /api/invoices` with a valid `job_id` → invoice created, lines copied from parts+time_entries, `jobs.converted_to_invoice_id` set
- [ ] `POST /api/invoices` without `job_id` → blank invoice created
- [ ] `GET /api/invoices/:id` returns invoice with `lines` array
- [ ] `PUT /api/invoices/:id` with `{ status: "sent" }` → status updated, other fields unchanged
- [ ] `PUT /api/invoices/:id` with invalid status → 400 error
- [ ] `DELETE /api/invoices/:id` → job's `converted_to_invoice_id` nulled, invoice removed
- [ ] `GET /api/invoices/:id/pdf` → PDF downloads with invoice number, contact, line items, totals

---

## Session 23 — 2026-04-12

### Bug fixes only — 2 confirmed bugs

#### Bug 1 — DictationButton.jsx: Unsupported browser renders null silently

**Root cause:** Line 142 had `if (!SpeechRecognition) return null;` — completely invisible in Firefox/Safari.

**Fix:** Replace the `return null` with a rendered disabled `<button>` that:
- Matches the normal Dictate button visual style (`inline-flex`, border, same padding/font)
- Is `disabled` and `opacity-50 cursor-not-allowed`
- Has `title="Voice dictation requires Google Chrome or Microsoft Edge"` as a visible tooltip on hover

#### Bug 2 — VoiceAssistant.jsx: 60-second auto-stop gives no user feedback

**Root cause:** Line 731 was `maxTimerRef.current = setTimeout(() => stopRecording(), MAX_RECORD_MS);` — no user-facing message when the timer fired.

**Fix:** Expand the callback to call `setError('Time limit reached — recording stopped after 60 seconds.')` before `stopRecording()`.

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
