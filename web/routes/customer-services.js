const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { query, getOrgContext } = require('@worktrackr/shared/db');

// Validation schemas
const customerServiceSchema = z.object({
  contact_id: z.string().uuid(),
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  custom_price: z.number().min(0).optional().nullable(),
  renewal_date: z.string().optional().nullable(), // ISO 8601 date
  renewal_frequency: z.enum(['monthly', 'quarterly', 'annually', 'none']).optional().nullable(),
  auto_renew: z.boolean().default(false),
  notes: z.string().optional().nullable()
});

// GET /api/customer-services - Get all customer services for the organization
router.get('/', async (req, res) => {
  try {
    const orgContext = await getOrgContext(req.user.userId);
    const organizationId = orgContext.organizationId;
    const { contact_id } = req.query;

    let whereClause = 'WHERE cs.organisation_id = $1';
    const params = [organizationId];
    let paramCount = 1;

    if (contact_id) {
      whereClause += ` AND cs.contact_id = $${++paramCount}`;
      params.push(contact_id);
    }

    const result = await query(
      `SELECT 
        cs.*,
        c.name as contact_name,
        p.name as product_name,
        p.unit as product_unit,
        p.client_price as product_default_price
       FROM customer_services cs
       LEFT JOIN contacts c ON cs.contact_id = c.id
       LEFT JOIN products p ON cs.product_id = p.id
       ${whereClause}
       ORDER BY c.name, p.name`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customer services:', error);
    res.status(500).json({ error: 'Failed to fetch customer services' });
  }
});

// GET /api/customer-services/contact/:contactId - Get services for a specific contact
router.get('/contact/:contactId', async (req, res) => {
  try {
    const orgContext = await getOrgContext(req.user.userId);
    const organizationId = orgContext.organizationId;
    const { contactId } = req.params;

    const result = await query(
      `SELECT 
        cs.*,
        p.name as product_name,
        p.unit as product_unit,
        p.client_price as product_default_price,
        p.our_cost as product_cost
       FROM customer_services cs
       LEFT JOIN products p ON cs.product_id = p.id
       WHERE cs.contact_id = $1 AND cs.organisation_id = $2
       ORDER BY p.name`,
      [contactId, organizationId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customer services:', error);
    res.status(500).json({ error: 'Failed to fetch customer services' });
  }
});

// GET /api/customer-services/:id - Get a single customer service
router.get('/:id', async (req, res) => {
  try {
    const orgContext = await getOrgContext(req.user.userId);
    const organizationId = orgContext.organizationId;
    const { id } = req.params;

    const result = await query(
      `SELECT 
        cs.*,
        c.name as contact_name,
        p.name as product_name,
        p.unit as product_unit,
        p.client_price as product_default_price,
        p.our_cost as product_cost
       FROM customer_services cs
       LEFT JOIN contacts c ON cs.contact_id = c.id
       LEFT JOIN products p ON cs.product_id = p.id
       WHERE cs.id = $1 AND cs.organisation_id = $2`,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer service not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching customer service:', error);
    res.status(500).json({ error: 'Failed to fetch customer service' });
  }
});

// POST /api/customer-services - Assign a service to a contact
router.post('/', async (req, res) => {
  try {
    const orgContext = await getOrgContext(req.user.userId);
    const organizationId = orgContext.organizationId;

    const validatedData = customerServiceSchema.parse(req.body);

    const result = await query(
      `INSERT INTO customer_services (
        organisation_id,
        contact_id,
        product_id,
        quantity,
        custom_price,
        renewal_date,
        renewal_frequency,
        auto_renew,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        organizationId,
        validatedData.contact_id,
        validatedData.product_id,
        validatedData.quantity,
        validatedData.custom_price,
        validatedData.renewal_date,
        validatedData.renewal_frequency,
        validatedData.auto_renew,
        validatedData.notes
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'This service is already assigned to this contact' });
    }
    console.error('Error creating customer service:', error);
    res.status(500).json({ error: 'Failed to create customer service' });
  }
});

// PUT /api/customer-services/:id - Update a customer service
router.put('/:id', async (req, res) => {
  try {
    const orgContext = await getOrgContext(req.user.userId);
    const organizationId = orgContext.organizationId;
    const { id } = req.params;

    const validatedData = customerServiceSchema.partial().parse(req.body);

    // Build dynamic update query
    const updates = [];
    const params = [id, organizationId];
    let paramCount = 2;

    Object.entries(validatedData).forEach(([key, value]) => {
      updates.push(`${key} = $${++paramCount}`);
      params.push(value);
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);

    const result = await query(
      `UPDATE customer_services 
       SET ${updates.join(', ')}
       WHERE id = $1 AND organisation_id = $2
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer service not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating customer service:', error);
    res.status(500).json({ error: 'Failed to update customer service' });
  }
});

// DELETE /api/customer-services/:id - Remove a service from a contact
router.delete('/:id', async (req, res) => {
  try {
    const orgContext = await getOrgContext(req.user.userId);
    const organizationId = orgContext.organizationId;
    const { id } = req.params;

    const result = await query(
      `DELETE FROM customer_services 
       WHERE id = $1 AND organisation_id = $2
       RETURNING id`,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer service not found' });
    }

    res.json({ message: 'Customer service removed successfully' });
  } catch (error) {
    console.error('Error deleting customer service:', error);
    res.status(500).json({ error: 'Failed to delete customer service' });
  }
});

module.exports = router;
