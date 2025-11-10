# Complete Status Change Flow Trace

**Goal:** Trace every step from clicking the status dropdown to saving in the database

---

## Frontend Flow

### Step 1: User clicks status dropdown
**File:** `web/client/src/app/src/components/TicketsTableView.jsx`  
**Line:** ~430

```jsx
<select
  value={ticket.status}
  onChange={(e) => {
    console.log('🔥 onChange fired for status!', e.target.value);
    handleUpdateTicketStatus(ticket.id, e.target.value);
  }}
  onInput={(e) => {
    console.log('⚡ onInput fired for status!', e.target.value);
    handleUpdateTicketStatus(ticket.id, e.target.value);
  }}
>
```

**Expected:** onChange or onInput should fire

---

### Step 2: handleUpdateTicketStatus is called
**File:** `web/client/src/app/src/components/TicketsTableView.jsx`  
**Line:** ~151

```javascript
const handleUpdateTicketStatus = async (ticketId, newStatus) => {
  console.log('🎯 handleUpdateTicketStatus ENTRY', { ticketId, newStatus });
  console.log('📊 Current loading state:', loading);
  console.log('📦 bulkUpdateTickets exists?', typeof bulkUpdateTickets);
  
  try {
    setLoading(true);
    console.log('📤 About to call bulkUpdateTickets...');
    await bulkUpdateTickets([ticketId], { status: newStatus });
    console.log('✅ bulkUpdateTickets completed successfully');
    await refreshTickets();
    console.log('🔄 refreshTickets completed');
  } catch (error) {
    console.error('❌ Error in handleUpdateTicketStatus:', error);
  } finally {
    setLoading(false);
  }
};
```

**Expected:** Should see console logs for each step

---

### Step 3: bulkUpdateTickets is called (from context)
**File:** `web/client/src/app/src/App.jsx`  
**Line:** ~210

```javascript
const bulkUpdateTickets = async (ids, updates) => {
  try {
    await TicketsAPI.bulkUpdate(ids, updates);
    await fetchTickets();
  } catch (error) {
    console.error('Failed to bulk update tickets:', error);
    throw error;
  }
};
```

**Expected:** Should call TicketsAPI.bulkUpdate

---

### Step 4: API call is made
**File:** `web/client/src/app/api.ts`  
**Line:** ~XX (need to check)

```typescript
async bulkUpdate(ids: string[], updates: any) {
  const response = await fetch('/api/tickets/bulk', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, updates })
  });
  return response.json();
}
```

**Expected:** Should make PUT request to `/api/tickets/bulk`

---

## Backend Flow

### Step 5: Backend receives request
**File:** `web/routes/tickets.js`  
**Line:** 207

```javascript
router.put('/bulk', async (req, res) => {
  try {
    if (!req.orgContext) {
      return res.status(400).json({ error: 'Organization context missing' });
    }
    
    const { organizationId } = req.orgContext;
    const { ids, updates } = req.body;

    // Validation
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'updates object is required' });
    }

    // Build SET clause
    const setClauses = [];
    const values = [];
    let paramCount = 1;

    if (updates.priority) {
      setClauses.push(`priority = $${paramCount++}`);
      values.push(updates.priority);
    }

    if (updates.status) {
      setClauses.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }

    setClauses.push('updated_at = NOW()');

    if (setClauses.length === 1) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add organization ID and ticket IDs
    values.push(organizationId);
    const orgIdParam = paramCount++;
    values.push(ids);
    const idsParam = paramCount;

    const updateQuery = `
      UPDATE tickets
      SET ${setClauses.join(', ')}
      WHERE organisation_id = $${orgIdParam}
        AND id = ANY($${idsParam}::uuid[])
    `;

    const result = await query(updateQuery, values);
    res.json({ updated: result.rowCount, success: true });

  } catch (error) {
    console.error('Bulk update error:', error.message);
    res.status(500).json({ error: 'Failed to bulk update tickets' });
  }
});
```

**Expected:** Should execute SQL UPDATE query

---

### Step 6: Database update
**Query:**
```sql
UPDATE tickets
SET status = $1, updated_at = NOW()
WHERE organisation_id = $2
  AND id = ANY($3::uuid[])
```

**Expected:** Should update the ticket's status in the database

---

## What We Know

### ✅ Working (Priority Dropdown)
- onChange fires ✅
- handleUpdateTicketPriority called ✅
- bulkUpdateTickets called ✅
- API request made ✅
- Database updated ✅
- Change persists after refresh ✅

### ❌ Not Working (Status Dropdown)
- onChange fires? ❓ (NO CONSOLE LOGS!)
- handleUpdateTicketStatus called? ❓
- bulkUpdateTickets called? ❓
- API request made? ❌ (NOT IN RENDER LOGS!)
- Database updated? ❌
- Change persists after refresh? ❌

---

## The Mystery

**Why does priority work but status doesn't when the code is IDENTICAL?**

Possible explanations:
1. **React is not calling onChange for status dropdown** (but why?)
2. **Something is preventing the event from bubbling** (but what?)
3. **The dropdown element is being replaced/re-rendered** before onChange fires
4. **There's a race condition** with loading state
5. **The status dropdown is disabled** when we try to change it

---

## Next Investigation Steps

1. ✅ Check if AI routing is blocking status changes (NO - confirmed clean)
2. ⏭️ Add alert() to onChange to see if it fires AT ALL
3. ⏭️ Check browser DevTools Network tab during status change
4. ⏭️ Compare DOM elements between priority and status dropdowns
5. ⏭️ Test if the issue is specific to certain status values (Closed vs Pending)
