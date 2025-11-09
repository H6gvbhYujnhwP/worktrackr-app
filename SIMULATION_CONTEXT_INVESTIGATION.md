# Simulation Context Investigation - Status Dropdown Issue

**Date:** November 9, 2025  
**Issue:** Status dropdown changes don't persist, but priority dropdown changes do

---

## ✅ What I've Checked

### 1. App.jsx Simulation Context
**File:** `/web/client/src/app/src/App.jsx`  
**Function:** `bulkUpdateTickets` (lines 210-221)

```javascript
const bulkUpdateTickets = async (ticketIds, updates) => {
  console.log('🔧 bulkUpdateTickets called:', { ticketIds, updates, updatesType: typeof updates, updatesKeys: Object.keys(updates) });
  try {
    await TicketsAPI.bulkUpdate(ticketIds, updates);
    // Refresh tickets list
    const { tickets: serverTickets } = await TicketsAPI.list();
    setTickets(serverTickets || []);
  } catch (e) {
    console.error('[bulkUpdateTickets] API error', e);
    throw e;
  }
};
```

**Finding:** ✅ NO BLOCKING LOGIC - Function looks correct and should work for both status and priority

---

### 2. TicketsTableView.jsx Handlers
**File:** `/web/client/src/app/src/components/TicketsTableView.jsx`

**handleUpdateTicketStatus** (lines 151-165):
```javascript
const handleUpdateTicketStatus = async (ticketId, status) => {
  console.log('🎯 handleUpdateTicketStatus called!', { ticketId, status, loading });
  setLoading(true);
  try {
    console.log('📤 Calling bulkUpdateTickets with:', [ticketId], { status });
    await bulkUpdateTickets([ticketId], { status });
    console.log('✅ Status update successful');
  } catch (error) {
    console.error('❌ Failed to update status:', error);
    alert(`Failed to update status: ${error.response?.data?.error || error.message}`);
  } finally {
    setLoading(false);
  }
};
```

**handleUpdateTicketPriority** (lines 167-178):
```javascript
const handleUpdateTicketPriority = async (ticketId, newPriority) => {
  setLoading(true);
  try {
    await bulkUpdateTickets([ticketId], { priority: newPriority });
  } catch (error) {
    console.error('Failed to update priority:', error);
    alert(`Failed to update priority: ${error.response?.data?.error || error.message}`);
  } finally {
    setLoading(false);
  }
};
```

**Finding:** ✅ IDENTICAL STRUCTURE - Both handlers use the same pattern and call bulkUpdateTickets

---

### 3. Dropdown Rendering
**Status Dropdown** (lines 425-451):
```jsx
<select
  ref={(el) => {
    if (el) {
      statusSelectRefs.current.set(ticket.id, el);
    }
  }}
  value={ticket.status || 'open'}
  onChange={(e) => {
    console.log('🔥 onChange fired for status!', e.target.value);
    handleUpdateTicketStatus(ticket.id, e.target.value);
  }}
  onInput={(e) => {
    console.log('🔥 onInput fired for status!', e.target.value);
  }}
  onClick={(e) => {
    console.log('🔥 onClick fired for status!', e.target.value);
  }}
  disabled={loading}
  className={`w-full px-3 py-1.5 text-sm rounded-md border cursor-pointer ${
    STATUS_COLORS[ticket.status || 'open']
  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
>
  <option value="open">Open</option>
  <option value="pending">Pending</option>
  <option value="closed">Closed</option>
  <option value="resolved">Resolved</option>
</select>
```

**Finding:** ✅ PROPERLY CONFIGURED - onChange, onInput, and onClick all attached with debug logging

---

## ❌ What's NOT Working

### Test Results
1. Changed status from "Open" to "Pending"
2. UI updated visually ✅
3. **ZERO console logs** ❌
4. No API call made ❌
5. Change doesn't persist after refresh ❌

### Console Output
```
(nothing - no logs at all)
```

**Expected:**
```
🔥 onChange fired for status! pending
🎯 handleUpdateTicketStatus called! { ticketId: '...', status: 'pending', loading: false }
📤 Calling bulkUpdateTickets with: ['...'] { status: 'pending' }
🔧 bulkUpdateTickets called: { ticketIds: [...], updates: { status: 'pending' } }
✅ Status update successful
```

---

## 🤔 Theories

### Theory #1: Event Handler Not Attached (UNLIKELY)
- Code shows onChange IS attached
- Added onClick and onInput as backups
- Still no logs

### Theory #2: React Re-rendering Issue (POSSIBLE)
- Component might be re-rendering and removing handlers
- But priority dropdown works fine

### Theory #3: Browser Select Element Issue (POSSIBLE)
- Some browsers handle select onChange differently
- But this would affect priority too

### Theory #4: CSS/Z-Index Blocking Clicks (POSSIBLE)
- Something might be overlaying the dropdown
- Preventing events from reaching it

### Theory #5: Loading State Race Condition (UNLIKELY)
- `loading` state is shared between all handlers
- If stuck as `true`, dropdowns would be disabled
- But UI shows they're not disabled (can click them)

### Theory #6: Hidden Error Swallowing Events (POSSIBLE)
- JavaScript error occurring before handler runs
- Error being caught and not logged
- Need to check browser console for errors

---

## 🔧 Next Steps

### Step 1: Check Browser Console for Errors
Open browser dev tools and look for:
- JavaScript errors
- React warnings
- Network errors

### Step 2: Add Error Boundaries
Wrap the select element in an error boundary to catch any React errors

### Step 3: Test with Direct DOM Manipulation
Use browser console to manually trigger change event:
```javascript
const select = document.querySelector('select[value="open"]');
select.value = 'pending';
select.dispatchEvent(new Event('change', { bubbles: true }));
```

### Step 4: Compare Priority vs Status Dropdowns
- Check if they're in different table cells
- Check if CSS is different
- Check if there's any wrapper element difference

### Step 5: Simplify the Handler
Remove all the debug logging and just call the API directly:
```javascript
onChange={(e) => bulkUpdateTickets([ticket.id], { status: e.target.value })}
```

---

## 🎯 Current Hypothesis

**Most Likely Cause:** There's a React rendering issue or event bubbling problem specific to the status dropdown column that's preventing the onChange event from reaching the handler.

**Evidence:**
- Priority dropdown works (different column)
- Status dropdown UI updates (React state changes)
- But handler never called (no logs)

**Next Action:** Need to test if the issue is specific to the status column or if it's a general problem with all dropdowns in that position.
