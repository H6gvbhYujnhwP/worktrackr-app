# User Management & Billing - Current Status

**Date:** November 10, 2025  
**Last Updated:** 3:25 PM GMT

---

## 🎯 **GOAL**

Update WorkTrackr user management system to support the new plan structure:
- **Starter:** 1 user (£49/month)
- **Pro:** 10 users (£99/month)
- **Enterprise:** 50 users (£299/month)

Fix the "Add User" button which was disabled even for Pro accounts.

---

## ✅ **COMPLETED FIXES**

### 1. Database Migration
- ✅ Created migration script to add `plan`, `included_seats`, `active_user_count` columns
- ✅ Ran migration successfully via `/api/migrations/run` endpoint
- ✅ Verified columns exist in production database

### 2. Backend Updates
- ✅ Updated `web/shared/plans.js` with correct user limits (Starter: 1, Pro: 10, Enterprise: 50)
- ✅ Updated `web/routes/billing.js` PLAN_CONFIGS with correct limits
- ✅ Updated `web/routes/organizations.js` user invitation endpoint to use `plan` and `included_seats` columns
- ✅ Created admin endpoint `/api/admin/update-plan` to update organization plans
- ✅ Updated Westley's organization to Pro plan (10 users) via admin endpoint

### 3. Frontend Updates
- ✅ Updated `web/client/src/app/src/data/mockData.js` with correct subscription plans
- ✅ Updated `web/client/src/app/src/hooks/useUserLimits.js` with correct plan limits
- ✅ Updated upgrade recommendations in useUserLimits hook

### 4. API Endpoints
- ✅ `/api/billing/subscription` endpoint updated to read from `plan` and `included_seats` columns
- ✅ `/api/admin/update-plan` endpoint created for manual plan updates
- ✅ `/api/migrations/run` endpoint created for database migrations

---

## ❌ **CURRENT ISSUE**

**Problem:** The "Add User" button still shows "(Limit Reached)" even though:
1. ✅ Database has correct plan: `pro` with `included_seats: 10`
2. ✅ Backend `/api/billing/subscription` endpoint returns correct data
3. ✅ Backend user invitation endpoint checks correct columns

**Root Cause:** The frontend `useUserLimits` hook is fetching from `/api/billing/subscription`, but the UI is not reflecting the correct data.

**Possible Causes:**
1. Frontend state is cached and not refreshing
2. The `useUserLimits` hook is not being triggered to refetch
3. The organization context is not being updated with new plan data
4. Browser cache is serving old JavaScript bundle

---

## 🔍 **DEBUGGING STEPS TAKEN**

1. ✅ Verified database migration successful
2. ✅ Verified Westley's organization updated to Pro plan in database
3. ✅ Verified backend endpoints return correct data
4. ✅ Refreshed browser page multiple times
5. ⏳ Need to verify what `/api/billing/subscription` actually returns in browser

---

## 📋 **NEXT STEPS**

### Option 1: Force Frontend Refresh
- Clear browser cache completely
- Hard refresh (Ctrl+Shift+R)
- Check if new build is deployed

### Option 2: Debug Frontend State
- Check what `useUserLimits` hook is actually receiving
- Verify `subscriptionData` state in the hook
- Check if `users` array length is correct

### Option 3: Check Organization Context
- Verify the organization context includes `plan` and `included_seats`
- Check if `useAuth()` hook is providing correct membership data

### Option 4: Bypass useUserLimits Hook
- Temporarily hardcode the limits in the component
- Test if the issue is with the hook or the API

---

## 📊 **VERIFIED DATABASE STATE**

```sql
-- Westley's Organization
SELECT id, name, plan, included_seats 
FROM organisations 
WHERE name = 'SweetByte Ltd';

-- Result:
-- id: 2eac4549-a8ea-4bfa-a2e8-263429b55c01
-- name: SweetByte Ltd
-- plan: pro
-- included_seats: 10
```

---

## 🔧 **ADMIN ENDPOINTS FOR TESTING**

### Update Organization Plan
```bash
curl -X POST https://worktrackr.cloud/api/admin/update-plan \
  -H "Content-Type: application/json" \
  -d '{
    "email": "westley@sweetbyte.co.uk",
    "plan": "pro",
    "adminKey": "worktrackr-admin-2025"
  }'
```

### Run Database Migration
```bash
curl -X POST https://worktrackr.cloud/api/migrations/run \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "worktrackr-admin-2025"}'
```

---

## 📝 **CODE REFERENCES**

### Frontend
- **useUserLimits Hook:** `/web/client/src/app/src/hooks/useUserLimits.js`
- **User Management Component:** `/web/client/src/app/src/components/UserManagementImproved.jsx`
- **Subscription Plans Data:** `/web/client/src/app/src/data/mockData.js`

### Backend
- **Billing Routes:** `/web/routes/billing.js`
- **Organization Routes:** `/web/routes/organizations.js`
- **Admin Routes:** `/web/routes/admin.js`
- **Plans Configuration:** `/web/shared/plans.js`

### Database
- **Schema:** `/database/schema.sql`
- **Migration:** `/database/migrations/001_add_plan_columns.sql`

---

## 🚀 **DEPLOYMENT STATUS**

- **Last Commit:** `65f6580` - "FIX: Use plan and included_seats columns in user invitation"
- **Deployment:** Complete (as of 3:24 PM GMT)
- **Build:** 2025-11-08.FIXED

---

## 💡 **RECOMMENDATIONS**

1. **Immediate:** Check if the frontend build includes the latest changes
2. **Short-term:** Add better logging to `useUserLimits` hook to debug state
3. **Long-term:** Implement proper cache invalidation for subscription data
4. **Future:** Add admin UI for managing organization plans instead of using curl

---

## 📞 **USER FEEDBACK**

From Westley:
> "when trying to add users to westley@sweetbyte.co.uk account add user button does not work so i cannot test this"

**Status:** Still investigating. Backend is correct, frontend state issue suspected.
