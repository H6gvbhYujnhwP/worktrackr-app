const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { query, getOrgContext } = require('@worktrackr/shared/db');

// Validation schemas
const contactSchema = z.object({
  type: z.enum(['company', 'individual']).default('company'),
  name: z.string().min(1, 'Name is required'),
  displayName: z.string().optional(),
  primaryContact: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  addresses: z.array(z.any()).default([]),
  accounting: z.object({
    xeroContactId: z.string().optional().nullable(),
    quickbooksContactId: z.string().optional().nullable(),
    taxNumber: z.string().optional(),
    paymentTerms: z.string().optional(),
    currency: z.string().default('GBP'),
    accountCode: z.string().optional(),
    creditLimit: z.number().optional().default(0),
    discountRate: z.number().optional().default(0)
  }).optional().default({}),
  crm: z.object({
    status: z.enum(['active', 'inactive', 'at_risk', 'prospect', 'archived']).default('prospect'),
    lastActivity: z.string().optional().nullable(),
    nextCRMEvent: z.string().optional().nullable(),
    renewalsCount: z.number().optional().default(0),
    openOppsCount: z.number().optional().default(0),
    totalProfit: z.number().optional().default(0),
    assignedTo: z.string().optional().nullable(),
    source: z.string().optional(),
    industry: z.string().optional(),
    companySize: z.string().optional()
  }).optional().default({}),
  contactPersons: z.array(z.any()).default([]),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  customFields: z.object({}).optional().default({})
});

// GET /api/contacts - Get all contacts for the organization
router.get('/', async (req, res) => {
  try {
    const orgContext = await getOrgContext(req.user.id);
    const organizationId = orgContext.organizationId;

    const result = await query(
      `SELECT * FROM contacts WHERE organisation_id = $1 ORDER BY created_at DESC`,
      [organizationId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// GET /api/contacts/:id - Get a single contact
router.get('/:id', async (req, res) => {
  try {
    const orgContext = await getOrgContext(req.user.id);
    const organizationId = orgContext.organizationId;
    const { id } = req.params;

    const result = await query(
      `SELECT * FROM contacts WHERE id = $1 AND organisation_id = $2`,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// POST /api/contacts - Create a new contact
router.post('/', async (req, res) => {
  try {
    const orgContext = await getOrgContext(req.user.id);
    const organizationId = orgContext.organizationId;

    const validatedData = contactSchema.parse(req.body);

    const result = await query(
      `INSERT INTO contacts (
        organisation_id, "type", name, display_name, primary_contact, email, phone, website,
        addresses, accounting, crm, contact_persons, tags, notes, custom_fields, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        organizationId,
        validatedData.type,
        validatedData.name,
        validatedData.displayName || validatedData.name,
        validatedData.primaryContact || '',
        validatedData.email || '',
        validatedData.phone || '',
        validatedData.website || '',
        JSON.stringify(validatedData.addresses),
        JSON.stringify(validatedData.accounting),
        JSON.stringify(validatedData.crm),
        JSON.stringify(validatedData.contactPersons),
        validatedData.tags,
        validatedData.notes || '',
        JSON.stringify(validatedData.customFields),
        req.user.id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating contact:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// PUT /api/contacts/:id - Update a contact
router.put('/:id', async (req, res) => {
  try {
    const orgContext = await getOrgContext(req.user.id);
    const organizationId = orgContext.organizationId;
    const { id } = req.params;

    // Verify contact exists and belongs to organization
    const checkResult = await query(
      `SELECT id FROM contacts WHERE id = $1 AND organisation_id = $2`,
      [id, organizationId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const validatedData = contactSchema.partial().parse(req.body);

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (validatedData.type !== undefined) {
      updateFields.push(`"type" = $${paramIndex++}`);
      updateValues.push(validatedData.type);
    }
    if (validatedData.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(validatedData.name);
    }
    if (validatedData.displayName !== undefined) {
      updateFields.push(`display_name = $${paramIndex++}`);
      updateValues.push(validatedData.displayName);
    }
    if (validatedData.primaryContact !== undefined) {
      updateFields.push(`primary_contact = $${paramIndex++}`);
      updateValues.push(validatedData.primaryContact);
    }
    if (validatedData.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(validatedData.email);
    }
    if (validatedData.phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`);
      updateValues.push(validatedData.phone);
    }
    if (validatedData.website !== undefined) {
      updateFields.push(`website = $${paramIndex++}`);
      updateValues.push(validatedData.website);
    }
    if (validatedData.addresses !== undefined) {
      updateFields.push(`addresses = $${paramIndex++}`);
      updateValues.push(JSON.stringify(validatedData.addresses));
    }
    if (validatedData.accounting !== undefined) {
      updateFields.push(`accounting = $${paramIndex++}`);
      updateValues.push(JSON.stringify(validatedData.accounting));
    }
    if (validatedData.crm !== undefined) {
      updateFields.push(`crm = $${paramIndex++}`);
      updateValues.push(JSON.stringify(validatedData.crm));
    }
    if (validatedData.contactPersons !== undefined) {
      updateFields.push(`contact_persons = $${paramIndex++}`);
      updateValues.push(JSON.stringify(validatedData.contactPersons));
    }
    if (validatedData.tags !== undefined) {
      updateFields.push(`tags = $${paramIndex++}`);
      updateValues.push(validatedData.tags);
    }
    if (validatedData.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      updateValues.push(validatedData.notes);
    }
    if (validatedData.customFields !== undefined) {
      updateFields.push(`custom_fields = $${paramIndex++}`);
      updateValues.push(JSON.stringify(validatedData.customFields));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(id, organizationId);

    const result = await query(
      `UPDATE contacts SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex++} AND organisation_id = $${paramIndex++}
       RETURNING *`,
      updateValues
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating contact:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// DELETE /api/contacts/:id - Delete a contact
router.delete('/:id', async (req, res) => {
  try {
    const orgContext = await getOrgContext(req.user.id);
    const organizationId = orgContext.organizationId;
    const { id } = req.params;

    const result = await query(
      `DELETE FROM contacts WHERE id = $1 AND organisation_id = $2 RETURNING id`,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// GET /api/contacts/statistics - Get contact statistics
router.get('/statistics', async (req, res) => {
  try {
    const orgContext = await getOrgContext(req.user.id);
    const organizationId = orgContext.organizationId;

    const result = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE (crm->>'status')::text = 'active') as active,
        COUNT(*) FILTER (WHERE (crm->>'status')::text = 'prospect') as prospects,
        COUNT(*) FILTER (WHERE (crm->>'status')::text = 'at_risk') as at_risk,
        COUNT(*) FILTER (WHERE "type" = 'company') as companies,
        COUNT(*) FILTER (WHERE "type" = 'individual') as individuals,
        COALESCE(SUM((crm->>'totalProfit')::numeric), 0) as total_profit,
        COALESCE(SUM((crm->>'renewalsCount')::numeric), 0) as total_renewals,
        COALESCE(SUM((crm->>'openOppsCount')::numeric), 0) as total_opportunities
       FROM contacts WHERE organisation_id = $1`,
      [organizationId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching contact statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
