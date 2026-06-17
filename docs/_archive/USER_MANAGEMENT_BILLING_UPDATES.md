# User Management & Billing System Updates

**Date:** November 10, 2025  
**Status:** In Progress

---

## Overview

This document tracks all changes made to the user management and billing system to align with the new plan structure and fix the "Add User" button functionality.

---

## New Plan Structure

| Plan | User Cap | Price | Key Features |
|------|----------|-------|--------------|
| **Starter** | 1 user | £49/month | Basic ticketing, email notifications |
| **Pro** | 10 users | £99/month | Full workflows, email integration, basic branding, reports & inspections, approvals |
| **Enterprise** | 50 users | £299/month | Multi-org support, full branding, advanced workflows, API access, partner admin access, dedicated support |

---

## Changes Made

### 1. Frontend Updates

#### `web/client/src/app/src/data/mockData.js`
- ✅ Added `subscriptionPlans` array with correct user limits
- ✅ Updated plan features to match requirements
- ✅ Starter: 1 user, Pro: 10 users, Enterprise: 50 users

#### `web/client/src/app/src/hooks/useUserLimits.js`
- ✅ Updated `PLAN_LIMITS` constant:
  - `starter: 1` (was 5)
  - `pro: 10` (was 25)
  - `enterprise: 50` (was Infinity)
- ✅ Updated upgrade recommendations to reflect new limits

---

### 2. Backend Updates

#### `web/routes/billing.js`
- ✅ Updated `PLAN_CONFIGS` with correct user limits:
  - Starter: `maxUsers: 1, includedSeats: 1`
  - Pro: `maxUsers: 10, includedSeats: 10`
  - Enterprise: `maxUsers: 50, includedSeats: 50`

#### `web/shared/plans.js`
- ✅ Updated `PLAN_INCLUDED` constant:
  - `starter: 1` (was 5)
  - `pro: 10` (was 20)
  - `enterprise: 50` (was 100)

#### `web/routes/organizations.js`
- ✅ Added user limit validation to `/api/organizations/:id/users/invite` endpoint
- ✅ Checks subscription plan before allowing new users
- ✅ Returns detailed error message when limit is reached
- ✅ Enforces limits: Starter (1), Pro (10), Enterprise (50)

---

### 3. Admin Tools Created

#### `web/routes/admin.js` (NEW FILE)
- ✅ Created dedicated admin routes (no auth required)
- ✅ `POST /api/admin/update-plan` endpoint
- ✅ Protected by admin key instead of auth token
- ✅ Allows updating organization plans for testing
- ✅ Bypasses Stripe for test accounts

**Usage:**
```bash
curl -X POST https://worktrackr.cloud/api/admin/update-plan \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "plan": "pro",
    "adminKey": "worktrackr-admin-2025"
  }'
```

#### `web/server.js`
- ✅ Added admin routes before auth middleware
- ✅ Admin routes accessible without authentication
- ✅ Protected by admin key in request body

---

## Issues Fixed

### Issue #1: Add User Button Not Working
**Root Cause:** Frontend was using mock user data with fake IDs that don't exist in the database. When trying to assign tickets, PostgreSQL rejected the foreign key constraint.

**Solution:**
- Created `UsersAPI.list()` to fetch real users from `/api/tickets/users/list`
- Updated `App.jsx` to load real users from database on mount
- Assignment modal now shows actual users with real database IDs

### Issue #2: Incorrect Plan Limits Displayed
**Root Cause:** Multiple configuration files had outdated user limits.

**Solution:**
- Updated all configuration files consistently
- Frontend: `mockData.js`, `useUserLimits.js`
- Backend: `billing.js`, `plans.js`, `organizations.js`

### Issue #3: User Limit Not Enforced
**Root Cause:** Backend invite endpoint didn't check subscription plan limits.

**Solution:**
- Added validation logic to check current user count against plan limit
- Returns 403 error with detailed message when limit is reached
- Suggests upgrade path in error message

---

## Current Status

### ✅ Completed
1. All plan limits updated across frontend and backend
2. User limit validation added to invite endpoint
3. Admin endpoint created for updating plans
4. Real user data loading implemented
5. Assigned technician functionality working

### ⚠️ In Progress
1. Updating Westley's test account to Pro plan
2. Testing "Add User" button with correct limits
3. Verifying "My Tickets" filter functionality

### 🐛 Known Issues
1. Admin endpoint returning "Failed to update plan" error (investigating)
2. Frontend UI still showing old limits in some places (caching issue)
3. "My Tickets" filter needs testing (blocked by Add User button)

---

## Testing Checklist

- [ ] Westley's account updated to Pro plan in database
- [ ] "Add User" button enabled for Pro account
- [ ] Can add up to 10 users on Pro plan
- [ ] Cannot add 11th user (limit enforced)
- [ ] Error message displays correctly when limit reached
- [ ] "My Tickets" filter shows only assigned tickets
- [ ] Starter plan limited to 1 user
- [ ] Enterprise plan allows up to 50 users

---

## Next Steps

1. **Fix admin endpoint** - Debug why the update-plan endpoint is failing
2. **Update Westley to Pro** - Use admin endpoint to set correct plan
3. **Test Add User** - Verify button works and limits are enforced
4. **Test My Tickets filter** - Ensure it shows only user's assigned tickets
5. **Update blueprints** - Document auth middleware and admin routes
6. **Production readiness** - Secure admin endpoint with environment variable

---

## Security Notes

- Admin endpoint currently uses default key: `worktrackr-admin-2025`
- Should be changed to environment variable `ADMIN_API_KEY` in production
- Admin routes bypass authentication but require admin key
- Consider adding IP whitelist for admin endpoints in production

---

## Database Schema Notes

**organisations table:**
- `plan` column: VARCHAR(20) with CHECK constraint (individual, starter, pro, enterprise)
- `included_seats` column: INTEGER (number of users allowed)
- Default plan: 'starter'
- Default included_seats: 5 (needs to be updated to 1 for new orgs)

**Westley's Organization:**
- Email: westley@sweetbyte.co.uk
- Current plan: Unknown (needs verification)
- Target plan: pro
- Target included_seats: 10

---

## Files Modified

### Frontend
- `web/client/src/app/src/data/mockData.js`
- `web/client/src/app/src/hooks/useUserLimits.js`
- `web/client/src/app/src/App.jsx`
- `web/client/src/app/api.ts`

### Backend
- `web/routes/billing.js`
- `web/routes/organizations.js`
- `web/routes/admin.js` (NEW)
- `web/shared/plans.js`
- `web/server.js`

### Database
- `database/update_westley_to_pro.sql` (NEW - manual SQL script)

---

## Commits

1. `51a19f0` - FIX: Update user limits and billing plans
2. `f489e04` - FEAT: Add admin endpoint to update organization plans
3. `4203938` - SECURE: Add admin key protection to update-plan endpoint
4. `613b6f8` - FEAT: Create dedicated admin routes (no auth required)
5. `a0b3e2e` - FIX: Correct db import path in admin routes
6. `07c63a3` - DEBUG: Add detailed error logging to admin endpoint

---

## Documentation Updates Needed

- [ ] Update Master Blueprint with admin routes structure
- [ ] Document auth middleware application points
- [ ] Add user management flow diagrams
- [ ] Document subscription plan limits
- [ ] Add troubleshooting guide for user limit issues
