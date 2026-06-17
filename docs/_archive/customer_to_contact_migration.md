# Customer to Contact Migration Report

## Summary
Found **37 references** to "customer" in the frontend code, all in **QuoteForm.jsx**.

The application should use **"contacts"** as the single source of truth, not "customers".

---

## Files Affected

### 1. `/web/client/src/app/src/components/QuoteForm.jsx`

**Total References:** 37

#### State Variables (3):
- Line 18: `const [showCreateCustomer, setShowCreateCustomer] = useState(false);`
- Line 19: `const [customers, setCustomers] = useState([]);`
- Line 34: `const [customerName, setCustomerName] = useState('');`

#### Form Data (2):
- Line 36: `customer_id: '',` (in formData state)
- Line 143: `customer_id: quote.customer_id,` (when loading existing quote)

#### Functions (3):
- Line 58: `const fetchCustomers = async () => {`
- Line 92: `fetchCustomers();`
- Line 269: `const handleSubmit = useCallback(async (sendToCustomer = false) => {`

#### Validation & Logic (8):
- Line 280: `if (!formData.customer_id) {`
- Line 281: `alert('Please select a customer');`
- Line 285: `console.log('✅ Customer ID validation passed:', {`
- Line 286: `customer_id: formData.customer_id,`
- Line 287: `customer_id_type: typeof formData.customer_id,`
- Line 288: `customer_id_length: formData.customer_id?.length`
- Line 323: `status: sendToCustomer ? 'sent' : formData.status`
- Line 325: `customer_id: formData.customer_id,`

#### Error Messages (2):
- Line 358: `if (errorMessage.includes('foreign key constraint') && errorMessage.includes('customer_id')) {`
- Line 359: `errorMessage = 'The selected customer does not exist in the database. Please try selecting a different customer or create a new one.';`

#### UI Labels & Text (11):
- Line 396: `'Fill in the details below to create a quote for your customer'`
- Line 405: `Basic quote details and customer selection`
- Line 412: `<Label htmlFor="customer">Customer *</Label>`
- Line 418: `onClick={() => setShowCreateCustomer(true)}`
- Line 422: `Create New Customer`
- Line 428: `id="customer"`
- Line 432: `title="Cannot change customer after quote creation"`
- Line 439: `<SelectTrigger id="customer">`
- Line 440: `<SelectValue placeholder="Select a customer" />`
- Line 443-444: `{customers.length === 0 ? (<div className="p-2 text-sm text-gray-500">No customers found. Create one first.</div>`
- Line 682: `Notes for staff only (not visible to customer)`

#### Mapping & Iteration (4):
- Line 65: `// Map contacts to customer format for compatibility`
- Line 72: `setCustomers(mappedContacts);`
- Line 446: `customers.map((customer) => (`
- Line 447-448: `<SelectItem key={customer.id} value={customer.id}>{customer.company_name || customer.contact_name || customer.name}`

#### Modal Component (4):
- Line 748: `{/* Quick Add Customer Modal */}`
- Line 749: `<QuickAddCustomerModal`
- Line 750: `isOpen={showCreateCustomer}`
- Line 751: `onClose={() => setShowCreateCustomer(false)}`
- Line 752: `onSave={async (newCustomer) => {`
- Line 753: `// Refresh customers list`
- Line 760: `// Map contacts to customer format for compatibility`
- Line 767: `setCustomers(mappedContacts);`
- Line 768: `// Auto-select the newly created customer`
- Line 769: `if (newCustomer && newCustomer.id) {`
- Line 770: `setFormData({ ...formData, customer_id: newCustomer.id });`
- Line 774: `console.error('Error refreshing customers:', error);`

---

## Required Changes

### Backend (Database Schema)
**CRITICAL:** The database foreign key constraint must be updated:

**Current (WRONG):**
```sql
ALTER TABLE quotes 
ADD CONSTRAINT quotes_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES customers(id);
```

**Should be (CORRECT):**
```sql
ALTER TABLE quotes 
ADD CONSTRAINT quotes_contact_id_fkey 
FOREIGN KEY (contact_id) REFERENCES contacts(id);
```

**Migration Steps:**
1. Drop the old constraint: `ALTER TABLE quotes DROP CONSTRAINT quotes_customer_id_fkey;`
2. Rename column: `ALTER TABLE quotes RENAME COLUMN customer_id TO contact_id;`
3. Add new constraint: `ALTER TABLE quotes ADD CONSTRAINT quotes_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES contacts(id);`

### Frontend Changes

#### 1. **QuoteForm.jsx** - Replace all "customer" with "contact"

**State Variables:**
```javascript
// OLD
const [showCreateCustomer, setShowCreateCustomer] = useState(false);
const [customers, setCustomers] = useState([]);
const [customerName, setCustomerName] = useState('');

// NEW
const [showCreateContact, setShowCreateContact] = useState(false);
const [contacts, setContacts] = useState([]);
const [contactName, setContactName] = useState('');
```

**Form Data:**
```javascript
// OLD
customer_id: '',

// NEW
contact_id: '',
```

**Function Names:**
```javascript
// OLD
const fetchCustomers = async () => {

// NEW
const fetchContacts = async () => {
```

**Validation:**
```javascript
// OLD
if (!formData.customer_id) {
  alert('Please select a customer');
  return;
}

// NEW
if (!formData.contact_id) {
  alert('Please select a contact');
  return;
}
```

**API Payload:**
```javascript
// OLD
customer_id: formData.customer_id,

// NEW
contact_id: formData.contact_id,
```

**UI Labels:**
```javascript
// OLD
<Label htmlFor="customer">Customer *</Label>
<SelectValue placeholder="Select a customer" />
Create New Customer

// NEW
<Label htmlFor="contact">Contact *</Label>
<SelectValue placeholder="Select a contact" />
Create New Contact
```

**Error Messages:**
```javascript
// OLD
if (errorMessage.includes('foreign key constraint') && errorMessage.includes('customer_id')) {
  errorMessage = 'The selected customer does not exist...';
}

// NEW
if (errorMessage.includes('foreign key constraint') && errorMessage.includes('contact_id')) {
  errorMessage = 'The selected contact does not exist...';
}
```

#### 2. **QuickAddCustomerModal.jsx** - Rename to **QuickAddContactModal.jsx**

This component needs to be renamed and updated to use "contact" terminology.

---

## Implementation Plan

### Phase 1: Frontend Changes (Safe - No Database Impact)
1. ✅ Update QuoteForm.jsx to use `contact_id` instead of `customer_id`
2. ✅ Rename all state variables from "customer" to "contact"
3. ✅ Update all UI labels and text
4. ✅ Rename QuickAddCustomerModal to QuickAddContactModal
5. ✅ Update all function names and comments

### Phase 2: Backend Changes (Requires Database Migration)
1. ⚠️ **BACKEND**: Update API endpoint to accept `contact_id` instead of `customer_id`
2. ⚠️ **DATABASE**: Run migration to rename column and update foreign key constraint
3. ⚠️ **BACKEND**: Update all backend code to use `contact_id`

### Phase 3: Testing
1. Test creating new quotes with contact selection
2. Test editing existing quotes
3. Test quick add contact functionality
4. Verify database integrity

---

## Risk Assessment

**HIGH RISK:**
- Database migration (renaming column and constraint)
- Existing quotes in database may have `customer_id` column

**MEDIUM RISK:**
- Backend API changes
- Need to ensure backward compatibility during migration

**LOW RISK:**
- Frontend changes (can be done independently)

---

## Recommendation

**Option 1: Full Migration (Recommended)**
- Update database schema to use `contact_id`
- Update backend API to use `contact_id`
- Update frontend to use `contact_id`
- **Pros:** Clean, consistent, follows single source of truth principle
- **Cons:** Requires database migration and backend changes

**Option 2: Backend Compatibility Layer (Temporary)**
- Keep database as-is temporarily
- Backend accepts both `customer_id` and `contact_id`, maps to same column
- Frontend uses `contact_id`
- **Pros:** Easier to deploy frontend changes first
- **Cons:** Technical debt, confusing for future developers

---

## Next Steps

1. **Immediate:** Update frontend QuoteForm.jsx to use `contact_id`
2. **Backend:** Coordinate with backend developer to update API
3. **Database:** Plan and execute migration during maintenance window
4. **Testing:** Comprehensive testing after each phase

---

**Status:** Ready to implement frontend changes
**Estimated Time:** 30-45 minutes for frontend changes
**Backend Coordination Required:** Yes
