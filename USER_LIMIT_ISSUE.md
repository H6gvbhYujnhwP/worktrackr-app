# User Limit Issue - Still Showing "Limit Reached"

## Current Status
- Database has been successfully updated: Westley's org is now on Pro plan with 10 included seats
- Frontend still shows "1 of 1 users" and "Limit Reached"
- Add User button is still disabled

## Database Verification
```bash
curl -X POST https://worktrackr.cloud/api/admin/update-plan \
  -H "Content-Type: application/json" \
  -d '{"email": "westley@sweetbyte.co.uk", "plan": "pro", "adminKey": "worktrackr-admin-2025"}'
  
Response:
{"success":true,"message":"Organization updated to pro plan","organization":{"id":"2eac4549-a8ea-4bfa-a2e8-263429b55c01","name":"SweetByte Ltd","plan":"pro","includedSeats":10}}
```

## Problem
The frontend `useUserLimits` hook is reading from the organisation data, but it's not picking up the updated `included_seats` value.

## Possible Causes
1. The API endpoint that fetches organisation data isn't returning the `included_seats` field
2. The frontend is caching the old organisation data
3. The `useUserLimits` hook is looking at the wrong field

## Next Steps
1. Check what the `/api/billing/subscription` endpoint returns
2. Verify the organisation data includes `included_seats`
3. Update the frontend to correctly read the `included_seats` field
