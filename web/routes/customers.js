const express = require('express');
const { z } = require('zod');
const { query } = require('@worktrackr/shared/db');

const router = express.Router();

// Validation schemas
const createCustomerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address_line1: z.string().max(255).optional().nullable(),
  address_line2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postcode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).default('United Kingdom'),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  custom_fields: z.record(z.any()).optional().nullable()
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address_line1: z.string().max(255).optional().nullable(),
  address_line2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postcode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  custom_fields: z.record(z.any()).optional().nullable(),
  is_active: z.boolean().optional()
});

// -------------------- ROUTES --------------------

// Get all customers for organization
router.get('/', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { search, is_active, page = 1, limit = 50 } = req.query;
    
    let whereClause = 'WHERE organisation_id = $1';
    const params = [organizationId];
    let paramCount = 1;

    if (search) {
      whereClause += ` AND (name ILIKE $${++paramCount} OR email ILIKE $${paramCount} OR phone ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (is_active !== undefined) {
      whereClause += ` AND is_active = $${++paramCount}`;
      params.push(is_active === 'true');
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const customersResult = await query(`
      SELECT c.*,
             (SELECT COUNT(*) FROM quotes WHERE customer_id = c.id) as quote_count,
             (SELECT COUNT(*) FROM jobs WHERE customer_id = c.id) as job_count,
             (SELECT COUNT(*) FROM invoices WHERE customer_id = c.id) as invoice_count,
             (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE customer_id = c.id AND status = 'paid') as total_revenue
      FROM customers c
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `, [...params, limit, offset]);

    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM customers
      ${whereClause}
    `, params);

    res.json({
      customers: customersResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get single customer by ID
router.get('/:id', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;

    const customerResult = await query(`
      SELECT c.*,
             (SELECT COUNT(*) FROM quotes WHERE customer_id = c.id) as quote_count,
             (SELECT COUNT(*) FROM jobs WHERE customer_id = c.id) as job_count,
             (SELECT COUNT(*) FROM invoices WHERE customer_id = c.id) as invoice_count,
             (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE customer_id = c.id AND status = 'paid') as total_revenue,
             (SELECT COALESCE(SUM(total_amount - paid_amount), 0) FROM invoices WHERE customer_id = c.id AND status != 'paid') as outstanding_balance
      FROM customers c
      WHERE c.id = $1 AND c.organisation_id = $2
    `, [id, organizationId]);

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get contacts for this customer
    const contactsResult = await query(`
      SELECT * FROM contacts
      WHERE customer_id = $1
      ORDER BY is_primary DESC, created_at ASC
    `, [id]);

    // Get recent quotes
    const quotesResult = await query(`
      SELECT id, quote_number, total_amount, status, created_at
      FROM quotes
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [id]);

    // Get recent jobs
    const jobsResult = await query(`
      SELECT id, job_number, title, status, scheduled_start, created_at
      FROM jobs
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [id]);

    // Get recent invoices
    const invoicesResult = await query(`
      SELECT id, invoice_number, total_amount, paid_amount, status, due_date, created_at
      FROM invoices
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [id]);

    res.json({
      customer: customerResult.rows[0],
      contacts: contactsResult.rows,
      recent_quotes: quotesResult.rows,
      recent_jobs: jobsResult.rows,
      recent_invoices: invoicesResult.rows
    });

  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create new customer
router.post('/', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const validatedData = createCustomerSchema.parse(req.body);

    const result = await query(`
      INSERT INTO customers (
        organisation_id, name, email, phone,
        address_line1, address_line2, city, postcode, country,
        notes, tags, custom_fields
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      organizationId,
      validatedData.name,
      validatedData.email,
      validatedData.phone,
      validatedData.address_line1,
      validatedData.address_line2,
      validatedData.city,
      validatedData.postcode,
      validatedData.country,
      validatedData.notes,
      validatedData.tags ? JSON.stringify(validatedData.tags) : null,
      validatedData.custom_fields ? JSON.stringify(validatedData.custom_fields) : null
    ]);

    res.status(201).json(result.rows[0]);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;
    const validatedData = updateCustomerSchema.parse(req.body);

    // Build dynamic UPDATE query
    const updates = [];
    const values = [id, organizationId];
    let paramCount = 2;

    if (validatedData.name !== undefined) {
      updates.push(`name = $${++paramCount}`);
      values.push(validatedData.name);
    }
    if (validatedData.email !== undefined) {
      updates.push(`email = $${++paramCount}`);
      values.push(validatedData.email);
    }
    if (validatedData.phone !== undefined) {
      updates.push(`phone = $${++paramCount}`);
      values.push(validatedData.phone);
    }
    if (validatedData.address_line1 !== undefined) {
      updates.push(`address_line1 = $${++paramCount}`);
      values.push(validatedData.address_line1);
    }
    if (validatedData.address_line2 !== undefined) {
      updates.push(`address_line2 = $${++paramCount}`);
      values.push(validatedData.address_line2);
    }
    if (validatedData.city !== undefined) {
      updates.push(`city = $${++paramCount}`);
      values.push(validatedData.city);
    }
    if (validatedData.postcode !== undefined) {
      updates.push(`postcode = $${++paramCount}`);
      values.push(validatedData.postcode);
    }
    if (validatedData.country !== undefined) {
      updates.push(`country = $${++paramCount}`);
      values.push(validatedData.country);
    }
    if (validatedData.notes !== undefined) {
      updates.push(`notes = $${++paramCount}`);
      values.push(validatedData.notes);
    }
    if (validatedData.tags !== undefined) {
      updates.push(`tags = $${++paramCount}`);
      values.push(validatedData.tags ? JSON.stringify(validatedData.tags) : null);
    }
    if (validatedData.custom_fields !== undefined) {
      updates.push(`custom_fields = $${++paramCount}`);
      values.push(validatedData.custom_fields ? JSON.stringify(validatedData.custom_fields) : null);
    }
    if (validatedData.is_active !== undefined) {
      updates.push(`is_active = $${++paramCount}`);
      values.push(validatedData.is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await query(`
      UPDATE customers
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $1 AND organisation_id = $2
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;

    // Soft delete by setting is_active to false
    const result = await query(`
      UPDATE customers
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND organisation_id = $2
      RETURNING *
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted successfully', customer: result.rows[0] });

  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// Get customer statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;

    // Verify customer belongs to organization
    const customerCheck = await query(`
      SELECT id FROM customers WHERE id = $1 AND organisation_id = $2
    `, [id, organizationId]);

    if (customerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get comprehensive statistics
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM quotes WHERE customer_id = $1) as total_quotes,
        (SELECT COUNT(*) FROM quotes WHERE customer_id = $1 AND status = 'accepted') as accepted_quotes,
        (SELECT COUNT(*) FROM jobs WHERE customer_id = $1) as total_jobs,
        (SELECT COUNT(*) FROM jobs WHERE customer_id = $1 AND status = 'completed') as completed_jobs,
        (SELECT COUNT(*) FROM invoices WHERE customer_id = $1) as total_invoices,
        (SELECT COUNT(*) FROM invoices WHERE customer_id = $1 AND status = 'paid') as paid_invoices,
        (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE customer_id = $1) as total_invoiced,
        (SELECT COALESCE(SUM(paid_amount), 0) FROM invoices WHERE customer_id = $1) as total_paid,
        (SELECT COALESCE(SUM(total_amount - paid_amount), 0) FROM invoices WHERE customer_id = $1 AND status != 'paid') as outstanding_balance,
        (SELECT COUNT(*) FROM reviews WHERE customer_id = $1) as total_reviews,
        (SELECT AVG(rating) FROM reviews WHERE customer_id = $1) as average_rating
    `, [id]);

    res.json(stats.rows[0]);

  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({ error: 'Failed to fetch customer statistics' });
  }
});

module.exports = router;

