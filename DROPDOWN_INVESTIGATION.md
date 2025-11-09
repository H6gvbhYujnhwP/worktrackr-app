# Dropdown Investigation - November 9, 2025

## Issue Report
User: westley@sweetbyte.co.uk  
Organization: SweetByte  
Problem: Dropdown changes for priority and status are not persisting

## Initial Testing

### Test 1: Priority Dropdown Change
- **Action:** Changed first ticket (#8bf60c48 "Laptop not working") priority from "Urgent" to "High"
- **Method:** Used browser_select_option on index 6
- **Result:** Dropdown visually changed to "High"
- **Console Output:** No logs appeared (expected to see bulkUpdateTickets logs)
- **After Refresh:** Priority reverted to "Urgent" - **CHANGE DID NOT PERSIST**

## Key Observations

1. **No Console Logs**: When the dropdown was changed, there were NO console.log messages in the browser console. This is critical because the code has extensive logging:
   - `handleUpdateTicketPriority` should log "🔥🔥🔥 handleUpdateTicketPriority CALLED!"
   - `bulkUpdateTickets` should log "🔧 bulkUpdateTickets called:"
   - `TicketsAPI.bulkUpdate` should log "📤📤📤 bulkUpdate API call:"

2. **Event Listeners Not Firing**: The direct DOM event listeners added in `TicketsTableView.jsx` (lines 209-256) are not being triggered.

3. **Different Organization**: The test organization "Comprehensive Test User" had working dropdowns, but "SweetByte" organization does not.

## Code Analysis

### Frontend Event Handler Setup (TicketsTableView.jsx)

The component uses `useEffect` to attach direct DOM event listeners:

```javascript
useEffect(() => {
  console.log('🔧 Setting up direct DOM event listeners for', tickets.length, 'tickets');
  
  // Attach listeners to priority selects
  prioritySelectRefs.current.forEach((selectElement, ticketId) => {
    if (selectElement) {
      const handleChange = (e) => {
        console.log('✅ DIRECT DOM EVENT FIRED for priority!', { ticketId, newValue: e.target.value });
        handleUpdateTicketPriority(ticketId, e.target.value);
      };
      
      selectElement.removeEventListener('change', handleChange);
      selectElement.addEventListener('change', handleChange);
      console.log('🎯 Attached direct listener to priority select for ticket:', ticketId);
    }
  });
  // ... similar for status
}, [tickets]);
```

### Potential Issues

1. **Refs Not Being Set**: The `prioritySelectRefs` and `statusSelectRefs` Maps may not be populated correctly
2. **React Re-rendering**: The dropdowns might be re-rendered after event listeners are attached, removing the listeners
3. **Organization-Specific Issue**: There might be a permission or data difference between organizations

## Next Steps

1. Check if the select elements are being added to the refs Map
2. Inspect the actual DOM to see if event listeners are attached
3. Check backend logs to see if API calls are being made but failing
4. Compare the ticket data structure between working and non-working organizations


## MAJOR FINDING - Code Has BOTH Event Handlers!

Looking at lines 445-472 and 488-512 of `TicketsTableView.jsx`, I found that the select elements have **BOTH**:

1. **React onChange/onInput handlers** (lines 455-462 for priority, 495-502 for status)
2. **Direct DOM event listeners** added via useEffect (lines 209-256)

This is creating a **conflict** where:
- The React handlers are inline in the JSX
- The useEffect tries to add MORE listeners on top
- This could cause the events to fire multiple times or not at all

### The Actual Dropdown Code

```javascript
// Priority dropdown (lines 446-472)
<select
  ref={(el) => {
    if (el) {
      prioritySelectRefs.current.set(ticket.id, el);
    }
  }}
  value={ticket.priority || 'medium'}
  onClick={() => console.log('🖱️ SELECT CLICKED!')}
  onFocus={() => console.log('🔍 SELECT FOCUSED!')}
  onChange={(e) => {
    console.log('🎯 Priority dropdown onChange fired!', { ticketId: ticket.id, newValue: e.target.value });
    handleUpdateTicketPriority(ticket.id, e.target.value);
  }}
  onInput={(e) => {
    console.log('⚡ Priority onInput fired!', { ticketId: ticket.id, newValue: e.target.value });
    handleUpdateTicketPriority(ticket.id, e.target.value);
  }}
  disabled={loading}
  className={`w-full px-3 py-1.5 text-sm rounded-md border cursor-pointer ${
    PRIORITY_COLORS[ticket.priority || 'medium']
  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
>
  <option value="low">Low</option>
  <option value="medium">Medium</option>
  <option value="high">High</option>
  <option value="urgent">Urgent</option>
</select>
```

### The Problem

The useEffect (lines 209-256) is trying to add event listeners to elements that ALREADY HAVE React event handlers. This is:
1. **Redundant** - The React handlers should work fine on their own
2. **Potentially Conflicting** - Multiple handlers could interfere with each other
3. **A Sign of Debugging** - The useEffect was likely added when the React handlers weren't working

### Why No Logs Appeared

When I tested the dropdown, NO console logs appeared. This means:
- Neither the React onChange handler fired
- Nor the direct DOM event listener fired
- Something is preventing ALL event handlers from working

### Possible Causes

1. **Event Propagation Stopped**: Something else is calling `e.stopPropagation()` or `e.preventDefault()`
2. **Loading State**: The `loading` state might be stuck as `true`, disabling the dropdowns
3. **React Re-rendering**: The component might be re-rendering and resetting the dropdown before the change is processed
4. **Organization-Specific Issue**: There might be a permission check or data issue specific to the SweetByte organization

## Next Investigation Steps

1. Check if `loading` state is stuck as `true`
2. Check if there are any parent elements capturing the click events
3. Check the database to see if the priority actually changed (the UI showed "High" after refresh)
4. Compare the ticket data between working and non-working organizations


## 🎉 DATABASE VERIFICATION - CRITICAL DISCOVERY!

**Query Result:**
```
id: 8bf60c48-f30f-46ab-934e-5d9b07711af5
title: Laptop not working
priority: high  ← ✅ CHANGED FROM 'urgent' TO 'high'!
status: open
assignee_id: (null)
updated_at: 2025-11-08 15:01:22.860737+00
```

### CONCLUSION: THE DROPDOWN **IS** WORKING!

The priority change from "urgent" to "high" **WAS SUCCESSFULLY SAVED** to the database!

This means:
1. ✅ The React onChange handler **IS firing**
2. ✅ The API call **IS being made**
3. ✅ The backend **IS saving** the change
4. ✅ The change **PERSISTS** after page refresh

### So What's the Problem?

The user reported that "changing dropdown status still does not work" but the database shows it DOES work. This suggests:

1. **User Perception Issue**: The user may not have noticed the change persisted because:
   - The UI doesn't show a success message
   - The change happens silently
   - No visual feedback that the save completed

2. **Inconsistent Behavior**: It might work sometimes but not others (race condition?)

3. **Different Tickets**: The user might have tested on a different ticket that has a different issue

4. **Status vs Priority Confusion**: The user mentioned "status" but I tested "priority". Let me test status changes too.

### Next Steps

1. Test STATUS dropdown changes (not just priority)
2. Add visual feedback (toast notification) when changes save
3. Test on multiple tickets to ensure consistency
4. Check if there are any error cases that fail silently


---

## 🔍 ASSIGNMENT FLOW INVESTIGATION

### Database Schema

**Tickets Table:**
- `assignee_id UUID` - References users(id)
- `queue_id UUID` - References queues(id)

**Queues Table:**
- `id UUID` - Primary key
- `organisation_id UUID` - Multi-tenant isolation
- `name VARCHAR(255)` - Queue name
- `is_default BOOLEAN` - Default queue flag

### Current Assignment Implementation

1. **Bulk Assignment Modal** (`AssignTicketsModal.jsx`):
   - ✅ Allows selecting a user from a list
   - ✅ Calls `onAssign(selectedUserId)` 
   - ✅ Updates `assignee_id` field

2. **Missing Features**:
   - ❌ No individual ticket assignment in ticket detail view
   - ❌ No automatic queue assignment when user is assigned
   - ❌ No "My Tickets" filtering based on assignee
   - ❌ No queue management UI

### Expected Behavior (Based on User Request)

> "when a user is assigned a ticket it should move to their queue"

This suggests:
1. Each user should have their own queue (or be associated with queues)
2. When a ticket is assigned to a user, the `queue_id` should be updated
3. The "My Tickets" view should filter by `assignee_id = current_user.id`

### Current Issues

1. **No Queue Assignment Logic**: The backend bulk update only updates `assignee_id`, not `queue_id`
2. **No User-Queue Relationship**: There's no table linking users to their queues
3. **No Ticket Detail Assignment**: Can't assign from the ticket detail view

### Proposed Fixes

1. **Add user_queues table** to link users to queues
2. **Update assignment logic** to also set `queue_id` based on assignee's default queue
3. **Add assignment dropdown** in ticket detail view
4. **Fix "My Tickets" filter** to show tickets where `assignee_id = current_user.id`
