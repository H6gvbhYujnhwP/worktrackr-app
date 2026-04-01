# WorkTrackr Cloud — Session Log

---

## Current State
- **Last session:** 2025-04-01 (Session 1)
- **Live URL:** https://worktrackr.cloud
- **Admin panel:** https://worktrackr.cloud/admin87476463/dashboard
- **Deploy platform:** Render (auto-deploys on GitHub push)
- **Last fixes applied:** See Session 1 below
- **Known broken:** Nothing critical remaining after Session 1 fixes
- **Next priority:** See ROADMAP.md

---

## Rules for Claude — must follow every session

### Before making any code change, Claude must:
1. **Read the file being changed in full** — never edit from memory or assumptions
2. **Identify every other file that imports or depends on the file being changed** — routes, middleware, frontend components, hooks, services
3. **Trace the full flow** — understand what calls this code, what this code calls, and what the user-facing impact is end to end
4. **State the impact explicitly** before producing the fixed file, e.g.:
   > "Changing X in adminUsers.js will affect: the admin dashboard UI in UserDetailPage.jsx, the audit log table in the DB, and the logAdminAction helper in adminAuth.js. I have checked all three and this change does not break them."
5. **Never change function signatures, export shapes, or API response structures** without checking every consumer of that interface first
6. **If a fix in one file requires a matching change in another file**, produce both files in the same session — never leave the codebase in a half-fixed state

### The goal is: every pushed commit leaves the app fully working with no regressions

---

## How to start a new session

1. Upload the GitHub repo zip (exclude `node_modules`, `dist`, `.git`)
2. Upload this SESSION-LOG.md and ROADMAP.md
3. Paste this prompt:

> "You are continuing development of WorkTrackr Cloud. Read the repo zip, SESSION-LOG.md, and ROADMAP.md before doing anything. The session log tells you what has already been fixed, the rules you must follow, and what to work on next. The live site is https://worktrackr.cloud. We work by: you produce fixed files, I download them and copy into my local repo at C:\repos\worktrackr-app, then push via GitHub Desktop so Render auto-deploys. Before making any change, state which other files and flows are affected."

---

## Session 1 — 2025-04-01

### Codebase review performed
Full audit of all 34 route files, frontend components, middleware, and schema.

### Critical fixes applied

#### Fix 1 — `web/routes/adminUsers.js`
**Problem:** `logAdminAction()` was called with swapped arguments in both delete endpoints. The function signature is `(actorId, action, targetId, targetType, meta)` but soft-delete and hard-delete were passing `'user'` as the targetId and the UUID as the targetType. This corrupted all deletion audit log entries.

**Also fixed in same file:**
- Added `transaction` to the db import (was only importing `query`)
- Wrapped the hard-delete endpoint in a `transaction()` call so partial deletions cannot occur if the server crashes mid-operation
- Fixed column reference: `assigned_to` → `assignee_id` to match actual schema
- Removed a broken comment fragment (`GET /api/admin/users/export\n * Expo/**`) that was a leftover merge artifact
- Fixed CSV export row mapping (was referencing `row.status` which doesn't exist on raw DB rows)

**File changed:** `web/routes/adminUsers.js`

---

#### Fix 2 — `web/routes/auth.js`
**Problem:** The trial signup route (`POST /api/auth/signup/trial`) set a cookie named `'token'` while every other auth path and the `authenticateToken` middleware all use `'auth_token'`. Users who signed up via trial were immediately treated as unauthenticated.

**Fix:** Changed `res.cookie('token', ...)` to `res.cookie('auth_token', ...)` on line 978.

**File changed:** `web/routes/auth.js`

---

#### Fix 3 — `web/routes/public-auth.js`
**Problem:** This route was a dangerous leftover from early scaffolding. It:
- Stored users in a JavaScript `Map()` (lost on every server restart)
- Stored passwords as raw plaintext strings (no bcrypt)
- Had no try/catch error handling
- Was live and reachable at `/api/public-auth/register` and `/api/public-auth/login`

**Fix:** Replaced the entire file with a safe stub that returns HTTP 410 Gone on all three routes, with a message directing users to the real auth endpoints.

**File changed:** `web/routes/public-auth.js`

---

### Issues identified but NOT yet fixed (see ROADMAP.md)

| Priority | Issue | File |
|----------|-------|------|
| High | Admin panel URL (`/admin87476463`) is hardcoded in source — security through obscurity only | `web/client/src/main.jsx` |
| High | MFA codes and password reset tokens logged to console in dev mode | `web/routes/auth.js` |
| High | `CRON_SECRET` falls back to predictable default string if env var not set | `web/routes/cron.js` |
| Medium | Mock user data drives seat-limit enforcement on frontend | `web/client/src/app/src/App.jsx`, `useUserLimits.js` |
| Medium | 8 broken/backup component files committed to repo | `web/client/src/app/src/components/` |
| Medium | Two parallel duplicate component trees with shadcn UI copied twice | `web/client/src/` vs `web/client/src/app/src/` |
| Low | Quotes module split across 7 route files — hard to maintain | `web/routes/quotes*.js` |
| Low | `CRMCalendar.jsx` and `CRMDashboard.jsx` are ~1,600 lines each | `web/client/src/app/src/components/` |

---

### Credentials rotated this session
- ⚠️ Production admin password was found in plaintext in `WorkTrackr Cloud - Master Admin System.md`
- **Action required:** Rotate the admin password at https://worktrackr.cloud/admin87476463 if not already done

---

## Session 2 — 2025-04-01 (continuation)

### Work completed: Ticket Calendar rewrite

#### Files changed

**1. `web/client/src/app/src/components/IntegratedCalendar.jsx` — full rewrite**

This is the component actually mounted in the app (rendered in `Dashboard.jsx` at line 654). `BookingCalendar.jsx` is never mounted anywhere and was left untouched.

What was fixed:
- Removed all localStorage reads/writes. All events now load from and save to `/api/calendar/events`
- Create event form now actually saves via POST to the API
- Edit event saves via PUT to `/api/calendar/events/:id`
- Delete event calls DELETE to `/api/calendar/events/:id`
- Ticket scheduled_dates now appear on the calendar automatically — computed from the tickets already in React state (no localStorage bridge, no polling)
- Day view: fully implemented with hourly slots, click any slot to create event
- Week view: fully implemented with Mon–Sun columns, hourly rows
- Month view: fully implemented, clicking a day opens day view for that date
- Event detail modal: shows full event info, links back to ticket for ticket-sourced events
- Events colour-coded: teal = calendar event, purple = scheduled ticket, blue = work
- Upcoming events sidebar
- No hardcoded sample data anywhere
- No polling — loads once on mount, re-fetches after each create/edit/delete

Props preserved (no breaking change to Dashboard.jsx): `currentUser`, `onTicketClick`, `timezone` (timezone prop accepted but not needed — dates handled in local time)

**2. `web/client/src/app/src/App.jsx` — localStorage bridge removed**

Removed:
- `import('./utils/initializeBookingSync.js')` useEffect
- `createBookingFromTicket()` function and its call in `createTicket()`
- `updateBookingFromTicket()` function and its call in `updateTicket()`

Everything else in App.jsx is identical. All other ticket operations, auth, routing, context providers are unchanged.

Files NOT changed (intentionally):
- `web/routes/calendar.js` — already correct
- `web/client/src/app/src/components/BookingCalendar.jsx` — never mounted, left for cleanup in backlog
- `web/client/src/app/src/utils/initializeBookingSync.js` — now dead code, left for cleanup in backlog
- `web/client/src/app/src/utils/ticketToBookingConverter.js` — now dead code, left for cleanup in backlog
- `web/client/src/app/src/components/Dashboard.jsx` — no changes needed, import and props unchanged

#### How to test after deploying
1. Open the app and navigate to Ticket Calendar
2. Confirm no fake 2024 bookings appear
3. Click "Add event" — fill in title, date, time — confirm it appears on the calendar after saving
4. Switch between Day, Week, and Month views — confirm the event appears in all three
5. Click an event — confirm the detail modal opens
6. Edit the event — confirm changes persist after page reload
7. Delete the event — confirm it disappears
8. Create a ticket with a scheduled date — confirm it appears on the calendar as a purple entry
9. Click the purple ticket entry — confirm "Open ticket" button navigates to the ticket

#### Next: CRM Calendar
Once Ticket Calendar is confirmed working on Render, start Session 3 with the CRM Calendar rewrite.
