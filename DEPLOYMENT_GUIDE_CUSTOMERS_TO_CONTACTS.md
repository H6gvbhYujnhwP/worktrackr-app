# 🚨 BREAKING CHANGE: Customer to Contact Migration

## Executive Summary

This deployment removes the `customers` table and consolidates all customer/contact data into a single `contacts` table. This fixes the foreign key constraint error when saving quotes and establishes contacts as the single source of truth.

---

## ✅ What Was Fixed

### 1. **Quote Title Field Placement**
- **Before:** Quote Title field was isolated on the right side, difficult to find
- **After:** Quote Title is now in a 2-column grid layout alongside Contact field (left side)
- **Layout:** `Contact | Quote Title` on desktop, stacked on mobile

### 2. **Database Foreign Key Error**
- **Error:** `insert or update on table "quotes" violates foreign key constraint "quotes_customer_id_fkey"`
- **Root Cause:** Frontend was fetching from `/api/contacts` but sending `customer_id` to backend, which expected a `customers` table
- **Solution:** Migrated entire system to use `contacts` table only

---

## 📦 Changes Included

### Frontend Changes (QuoteForm.jsx)

| Before | After |
|--------|-------|
| `customer_id` | `contact_id` |
| `customers` state | `contacts` state |
| `customerName` | `contactName` |
| `showCreateCustomer` | `showCreateContact` |
| "Customer *" label | "Contact *" label |
| "Select a customer" | "Select a contact" |
| `QuickAddCustomerModal` | `QuickAddContactModal` |

**Files Modified:**
- `/web/client/src/app/src/components/QuoteForm.jsx`
- `/web/client/src/app/src/components/QuickAddContactModal.jsx` (new)

### Database Changes (Migration Script)

**File:** `/database/migrations/007_migrate_customers_to_contacts.sql`

**What it does:**
1. ✅ Creates backup tables (`customers_backup`, `contacts_backup`)
2. ✅ Adds customer fields to contacts table (company_name, address, city, etc.)
3. ✅ Migrates all customer data to contacts table
4. ✅ Updates foreign keys in: `quotes`, `jobs`, `invoices`, `payments`
5. ✅ Renames `customer_id` columns to `contact_id`
6. ✅ Drops the `customers` table
7. ✅ Adds indexes for performance
8. ✅ Includes rollback instructions

---

## 🚀 Deployment Steps

### Step 1: Backup Database (CRITICAL!)

```bash
# Create full database backup
pg_dump -U postgres worktrackr > /tmp/worktrackr_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup was created
ls -lh /tmp/worktrackr_backup_*.sql
```

### Step 2: Run Database Migration

```bash
# Connect to your database
psql -U postgres -d worktrackr

# Run the migration
\i /path/to/database/migrations/007_migrate_customers_to_contacts.sql

# Verify migration success
SELECT COUNT(*) FROM contacts;
SELECT COUNT(*) FROM quotes WHERE contact_id IS NOT NULL;

# Check for orphaned records (should return 0)
SELECT COUNT(*) FROM quotes WHERE contact_id NOT IN (SELECT id FROM contacts);
```

### Step 3: Update Backend API

**Required Backend Changes:**

1. **Update API endpoints to accept `contact_id`:**
   ```javascript
   // OLD
   const { customer_id, title, description, ... } = req.body;
   
   // NEW
   const { contact_id, title, description, ... } = req.body;
   ```

2. **Update database queries:**
   ```sql
   -- OLD
   INSERT INTO quotes (customer_id, ...) VALUES ($1, ...);
   
   -- NEW
   INSERT INTO quotes (contact_id, ...) VALUES ($1, ...);
   ```

3. **Update response objects:**
   ```javascript
   // OLD
   customer_id: quote.customer_id,
   customer_name: quote.customer_name
   
   // NEW
   contact_id: quote.contact_id,
   contact_name: quote.contact_name
   ```

**Files to Update (Backend):**
- Quote creation API endpoint
- Quote update API endpoint
- Job creation API endpoint
- Invoice creation API endpoint
- Payment creation API endpoint

### Step 4: Deploy Frontend

```bash
# The frontend changes are already committed
cd /home/ubuntu/worktrackr-app

# Push to GitHub (requires authentication)
git push origin master:main

# Render.com will automatically deploy the changes
```

### Step 5: Verification

After deployment, test the following:

1. **Create a new quote:**
   - Navigate to `/app/crm/quotes/new`
   - Select a contact
   - Fill in Quote Title (should be on left side, next to Contact)
   - Add line items
   - Click "Save as Draft"
   - ✅ Should save successfully without foreign key error

2. **Edit an existing quote:**
   - Open an existing quote
   - Verify contact name displays correctly
   - Make changes and save
   - ✅ Should update successfully

3. **Create a quote from a ticket:**
   - Open a ticket
   - Click "Create Quote"
   - ✅ Should pre-fill contact from ticket

4. **Check database integrity:**
   ```sql
   -- All quotes should have valid contact_id
   SELECT COUNT(*) FROM quotes WHERE contact_id NOT IN (SELECT id FROM contacts);
   -- Should return 0
   
   -- All contacts should be active
   SELECT COUNT(*) FROM contacts WHERE is_active = TRUE;
   ```

---

## 🔄 Rollback Plan

If something goes wrong:

### Option 1: Restore from Backup

```bash
# Drop current database
dropdb -U postgres worktrackr

# Restore from backup
createdb -U postgres worktrackr
psql -U postgres -d worktrackr < /tmp/worktrackr_backup_YYYYMMDD_HHMMSS.sql
```

### Option 2: Use Migration Backup Tables

```sql
-- Restore customers table
CREATE TABLE customers AS SELECT * FROM customers_backup;

-- Restore contacts table
DROP TABLE contacts;
CREATE TABLE contacts AS SELECT * FROM contacts_backup;

-- Re-add foreign key constraints
ALTER TABLE quotes ADD CONSTRAINT quotes_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES customers(id);
```

### Option 3: Revert Frontend Changes

```bash
cd /home/ubuntu/worktrackr-app
git revert HEAD
git push origin master:main
```

---

## 📊 Migration Impact

### Tables Affected

| Table | Change | Impact |
|-------|--------|--------|
| `customers` | **DELETED** | All data migrated to `contacts` |
| `contacts` | **MODIFIED** | Now standalone, added customer fields |
| `quotes` | **MODIFIED** | `customer_id` → `contact_id` |
| `jobs` | **MODIFIED** | `customer_id` → `contact_id` |
| `invoices` | **MODIFIED** | `customer_id` → `contact_id` |
| `payments` | **MODIFIED** | `customer_id` → `contact_id` |

### Data Preservation

✅ **All customer data is preserved** - migrated to contacts table  
✅ **All quotes, jobs, invoices, payments remain linked** - foreign keys updated  
✅ **No data loss** - backup tables created  
✅ **Backward compatibility** - frontend supports both `contact_id` and `customer_id` during transition

---

## ⚠️ Important Notes

1. **This is a BREAKING CHANGE** - backend MUST be updated before frontend deployment
2. **Database migration is IRREVERSIBLE** (without restore) - backup first!
3. **Downtime required** - coordinate deployment window
4. **Test in staging first** - do not deploy directly to production
5. **Monitor logs** - watch for errors after deployment

---

## 🐛 Troubleshooting

### Error: "The selected contact does not exist in the database"

**Cause:** Contact was deleted or contact_id is invalid  
**Solution:** 
```sql
-- Find orphaned quotes
SELECT id, contact_id FROM quotes WHERE contact_id NOT IN (SELECT id FROM contacts);

-- Fix by updating to valid contact
UPDATE quotes SET contact_id = '<valid_contact_id>' WHERE id = '<quote_id>';
```

### Error: "Cannot read property 'id' of undefined"

**Cause:** Frontend trying to access customer object that no longer exists  
**Solution:** Clear browser cache and hard refresh (Ctrl+Shift+R)

### Error: "column 'customer_id' does not exist"

**Cause:** Backend still using old column name  
**Solution:** Update backend code to use `contact_id`

---

## 📞 Support

If you encounter issues:

1. Check the error logs in browser console
2. Check backend API logs
3. Verify database migration completed successfully
4. Restore from backup if necessary

---

## ✅ Deployment Checklist

- [ ] Database backup created and verified
- [ ] Migration script reviewed
- [ ] Backend code updated to use `contact_id`
- [ ] Staging environment tested
- [ ] Migration script executed on production
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] Quote creation tested
- [ ] Quote editing tested
- [ ] Job creation tested
- [ ] Invoice creation tested
- [ ] Database integrity verified
- [ ] No errors in logs
- [ ] Backup tables can be dropped (after 7 days)

---

**Deployment Date:** 2026-01-23  
**Migration Version:** 007  
**Estimated Downtime:** 5-10 minutes  
**Risk Level:** HIGH (breaking change)  
**Reversibility:** Medium (requires backup restore)
