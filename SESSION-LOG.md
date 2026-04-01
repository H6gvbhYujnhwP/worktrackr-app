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

## How to start a new session

1. Upload the GitHub repo zip (exclude `node_modules`, `dist`, `.git`)
2. Upload this SESSION-LOG.md and ROADMAP.md
3. Paste this prompt:

> "You are continuing development of WorkTrackr Cloud. Read the repo zip and SESSION-LOG.md before doing anything. The session log tells you what has already been fixed and what to work on next. The live site is https://worktrackr.cloud. We work by: you produce fixed files, I download them and copy into my local repo at C:\repos\worktrackr-app, then push via GitHub Desktop so Render auto-deploys."

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
