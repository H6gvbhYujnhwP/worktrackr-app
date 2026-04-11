const express = require('express');
const router = express.Router();
const { z } = require('zod');
const PDFDocument = require('pdfkit');
const db = require('../../shared/db');

// Validation schemas
const createQuoteSchema = z.object({
  contact_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  valid_until: z.string().optional(), // ISO date string
  discount_amount: z.number().min(0).optional(),
  discount_percent: z.number().min(0).max(100).optional(),
  terms_conditions: z.string().optional(),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
  ticket_id: z.string().uuid().optional(),
  ai_generated: z.boolean().optional(),
  ai_context: z.any().optional(),
  line_items: z.array(z.object({
    product_id: z.string().uuid().optional(),
    description: z.string().min(1),
    quantity: z.number().min(0.01),
    unit_price: z.number().min(0),
    discount_percent: z.number().min(0).max(100).optional(),
    tax_rate: z.number().min(0).max(100).optional(),
    sort_order: z.number().int().optional(),
    item_type: z.enum(['labour', 'parts', 'fixed_fee', 'recurring', 'material', 'expense', 'subcontractor']).optional(),
    buy_cost: z.number().min(0).optional(),
    supplier: z.string().optional(),
    unit: z.string().optional(),
    line_notes: z.string().optional(),
    hours: z.number().min(0).optional(),
    hourly_rate: z.number().min(0).optional(),
    recurrence: z.enum(['monthly', 'annual']).optional()
  })).min(1)
});

const updateQuoteSchema = z.object({
  contact_id: z.string().uuid().optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'declined', 'expired']).optional(),
  valid_until: z.string().optional(),
  discount_amount: z.number().min(0).optional(),
  discount_percent: z.number().min(0).max(100).optional(),
  terms_conditions: z.string().optional(),
  notes: z.string().optional(),
  internal_notes: z.string().optional()
});

const updateLineItemsSchema = z.object({
  line_items: z.array(z.object({
    id: z.string().uuid().optional(), // If provided, update existing; if not, create new
    product_id: z.string().uuid().optional(),
    description: z.string().min(1),
    quantity: z.number().min(0.01),
    unit_price: z.number().min(0),
    discount_percent: z.number().min(0).max(100).optional(),
    tax_rate: z.number().min(0).max(100).optional(),
    sort_order: z.number().int().optional(),
    item_type: z.enum(['labour', 'parts', 'fixed_fee', 'recurring', 'material', 'expense', 'subcontractor']).optional(),
    buy_cost: z.number().min(0).optional(),
    supplier: z.string().optional(),
    unit: z.string().optional(),
    line_notes: z.string().optional(),
    hours: z.number().min(0).optional(),
    hourly_rate: z.number().min(0).optional(),
    recurrence: z.enum(['monthly', 'annual']).optional(),
    _delete: z.boolean().optional() // Flag to delete this line item
  })).min(1)
});

// Helper function to calculate line total
function calculateLineTotal(quantity, unitPrice, discountPercent = 0, taxRate = 20) {
  const subtotal = quantity * unitPrice;
  const discountAmount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (taxRate / 100);
  return afterDiscount + taxAmount;
}

// Helper function to calculate quote totals
function calculateQuoteTotals(lineItems, quoteDiscountAmount = 0, quoteDiscountPercent = 0) {
  const subtotal = lineItems.reduce((sum, item) => {
    const lineSubtotal = item.quantity * item.unit_price;
    const lineDiscount = lineSubtotal * ((item.discount_percent || 0) / 100);
    return sum + (lineSubtotal - lineDiscount);
  }, 0);

  let discountAmount = quoteDiscountAmount;
  if (quoteDiscountPercent > 0) {
    discountAmount = subtotal * (quoteDiscountPercent / 100);
  }

  const afterDiscount = subtotal - discountAmount;

  const taxAmount = lineItems.reduce((sum, item) => {
    const lineSubtotal = item.quantity * item.unit_price;
    const lineDiscount = lineSubtotal * ((item.discount_percent || 0) / 100);
    const lineAfterDiscount = lineSubtotal - lineDiscount;
    const lineTax = lineAfterDiscount * ((item.tax_rate != null ? item.tax_rate : 20) / 100);
    return sum + lineTax;
  }, 0);

  const totalAmount = afterDiscount + taxAmount;

  return {
    subtotal: subtotal.toFixed(2),
    discount_amount: discountAmount.toFixed(2),
    tax_amount: taxAmount.toFixed(2),
    total_amount: totalAmount.toFixed(2)
  };
}

// GET /api/quotes - List all quotes
router.get('/', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status; // Filter by status
    const customerId = req.query.contact_id; // Filter by customer

    let query = `
      SELECT 
        q.*,
        c.name as customer_name,
        c.primary_contact as contact_name,
        (SELECT COUNT(*) FROM quote_lines WHERE quote_id = q.id) as line_item_count,
        u.name as created_by_name
      FROM quotes q
      LEFT JOIN contacts c ON q.contact_id = c.id
      LEFT JOIN users u ON q.created_by = u.id
      WHERE q.organisation_id = $1
    `;

    const params = [organizationId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND q.status = $${paramCount}`;
      params.push(status);
    }

    if (customerId) {
      paramCount++;
      query += ` AND q.contact_id = $${paramCount}`;
      params.push(customerId);
    }

    query += ` ORDER BY q.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM quotes WHERE organisation_id = $1';
    const countParams = [organizationId];
    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }
    if (customerId) {
      countQuery += ` AND contact_id = $${countParams.length + 1}`;
      countParams.push(customerId);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      quotes: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// GET /api/quotes/stats - Get quote statistics
router.get('/stats', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;

    const statsQuery = `
      SELECT 
        COUNT(*) as total_quotes,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count,
        COUNT(*) FILTER (WHERE status = 'declined') as declined_count,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
        COALESCE(SUM(total_amount), 0) as total_value,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'accepted'), 0) as accepted_value,
        COALESCE(AVG(total_amount), 0) as average_value
      FROM quotes
      WHERE organisation_id = $1
    `;

    const result = await db.query(statsQuery, [organizationId]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching quote stats:', error);
    res.status(500).json({ error: 'Failed to fetch quote statistics' });
  }
});

// GET /api/quotes/:id - Get single quote with line items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.orgContext;

    // Check if id is a UUID or quote number (format: QT-YYYY-NNNN)
    const isQuoteNumber = /^QT-\d{4}-\d{4}$/.test(id);
    console.log('🔍 Quote lookup - ID:', id, 'Is quote number:', isQuoteNumber, 'Column:', isQuoteNumber ? 'quote_number' : 'id');

    // Get quote details
    const quoteQuery = `
      SELECT 
        q.*,
        c.name as customer_name,
        c.primary_contact as contact_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.addresses as customer_address,
        u.name as created_by_name
      FROM quotes q
      LEFT JOIN contacts c ON q.contact_id = c.id
      LEFT JOIN users u ON q.created_by = u.id
      WHERE ${isQuoteNumber ? 'q.quote_number' : 'q.id'} = $1 AND q.organisation_id = $2
    `;

    const quoteResult = await db.query(quoteQuery, [id, organizationId]);

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const quote = quoteResult.rows[0];

    // Get line items
    const lineItemsQuery = `
      SELECT 
        ql.*,
        p.name as product_name,
        p.type as product_type
      FROM quote_lines ql
      LEFT JOIN products p ON ql.product_id = p.id
      WHERE ql.quote_id = $1
      ORDER BY ql.sort_order, ql.created_at
    `;

    const lineItemsResult = await db.query(lineItemsQuery, [quote.id]);

    quote.line_items = lineItemsResult.rows;

    res.json(quote);
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// POST /api/quotes - Create new quote
router.post('/', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { userId } = req.user;

    // Validate input
    const validatedData = createQuoteSchema.parse(req.body);

    // Start transaction
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Generate quote number
      const quoteNumberResult = await client.query(
        "SELECT generate_quote_number($1) as quote_number",
        [organizationId]
      );
      const quoteNumber = quoteNumberResult.rows[0].quote_number;

      // Calculate totals
      const totals = calculateQuoteTotals(
        validatedData.line_items,
        validatedData.discount_amount || 0,
        validatedData.discount_percent || 0
      );

      // Insert quote
      const quoteQuery = `
        INSERT INTO quotes (
          organisation_id, contact_id, quote_number, title, description,
          subtotal, discount_amount, discount_percent, tax_amount, total_amount,
          valid_until, terms_conditions, notes, internal_notes,
          ticket_id, ai_generated, ai_context, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `;

      const quoteValues = [
        organizationId,
        validatedData.contact_id,
        quoteNumber,
        validatedData.title,
        validatedData.description || null,
        totals.subtotal,
        validatedData.discount_amount || 0,
        validatedData.discount_percent || 0,
        totals.tax_amount,
        totals.total_amount,
        validatedData.valid_until || null,
        validatedData.terms_conditions || null,
        validatedData.notes || null,
        validatedData.internal_notes || null,
        validatedData.ticket_id || null,
        validatedData.ai_generated || false,
        validatedData.ai_context ? JSON.stringify(validatedData.ai_context) : null,
        userId
      ];

      const quoteResult = await client.query(quoteQuery, quoteValues);
      const quote = quoteResult.rows[0];

      // Insert line items
      for (let i = 0; i < validatedData.line_items.length; i++) {
        const item = validatedData.line_items[i];
        const lineTotal = calculateLineTotal(
          item.quantity,
          item.unit_price,
          item.discount_percent || 0,
          item.tax_rate || 20
        );

        const lineItemQuery = `
          INSERT INTO quote_lines (
            quote_id, product_id, description, quantity, unit_price,
            discount_percent, tax_rate, line_total, sort_order,
            item_type, hours, hourly_rate, recurrence, buy_cost, supplier, unit, line_notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING *
        `;

        const lineItemValues = [
          quote.id,
          item.product_id || null,
          item.description,
          item.quantity,
          item.unit_price,
          item.discount_percent || 0,
          item.tax_rate || 20,
          lineTotal,
          item.sort_order || i,
          item.item_type || 'parts',
          item.hours || null,
          item.hourly_rate || null,
          item.recurrence || null,
          item.buy_cost || 0,
          item.supplier || null,
          item.unit || null,
          item.line_notes || null
        ];

        await client.query(lineItemQuery, lineItemValues);
      }

      await client.query('COMMIT');

      // Fetch complete quote with line items
      const completeQuoteQuery = `
        SELECT 
          q.*,
          c.company_name as customer_name,
          json_agg(
            json_build_object(
              'id', ql.id,
              'product_id', ql.product_id,
              'description', ql.description,
              'quantity', ql.quantity,
              'unit_price', ql.unit_price,
              'discount_percent', ql.discount_percent,
              'tax_rate', ql.tax_rate,
              'line_total', ql.line_total,
              'sort_order', ql.sort_order
            ) ORDER BY ql.sort_order
          ) as line_items
        FROM quotes q
        LEFT JOIN contacts c ON q.contact_id = c.id
        LEFT JOIN quote_lines ql ON ql.quote_id = q.id
        WHERE q.id = $1
        GROUP BY q.id, c.company_name
      `;

      const completeResult = await client.query(completeQuoteQuery, [quote.id]);

      res.status(201).json(completeResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating quote:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create quote', message: error.message });
  }
});

// PUT /api/quotes/:id - Update quote (without line items)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.orgContext;

    // Validate input
    const validatedData = updateQuoteSchema.parse(req.body);

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(validatedData).forEach(key => {
      if (validatedData[key] !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(validatedData[key]);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id, organizationId);

    const query = `
      UPDATE quotes
      SET ${updates.join(', ')}
      WHERE id = $${paramCount} AND organisation_id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating quote:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

// PUT /api/quotes/:id/line-items - Update quote line items
router.put('/:id/line-items', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.orgContext;

    // Validate input
    const validatedData = updateLineItemsSchema.parse(req.body);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Verify quote exists and belongs to organization
      const quoteCheck = await client.query(
        'SELECT id, discount_amount, discount_percent FROM quotes WHERE id = $1 AND organisation_id = $2',
        [id, organizationId]
      );

      if (quoteCheck.rows.length === 0) {
        throw new Error('Quote not found');
      }

      const quote = quoteCheck.rows[0];

      // Process line items
      for (let i = 0; i < validatedData.line_items.length; i++) {
        const item = validatedData.line_items[i];

        if (item._delete && item.id) {
          // Delete line item
          await client.query('DELETE FROM quote_lines WHERE id = $1 AND quote_id = $2', [item.id, id]);
        } else if (item.id) {
          // Update existing line item
          const lineTotal = calculateLineTotal(
            item.quantity,
            item.unit_price,
            item.discount_percent || 0,
            item.tax_rate || 20
          );

          await client.query(
            `UPDATE quote_lines 
             SET product_id = $1, description = $2, quantity = $3, unit_price = $4,
                 discount_percent = $5, tax_rate = $6, line_total = $7, sort_order = $8,
                 buy_cost = $9, supplier = $10, unit = $11, line_notes = $12
             WHERE id = $13 AND quote_id = $14`,
            [
              item.product_id || null,
              item.description,
              item.quantity,
              item.unit_price,
              item.discount_percent || 0,
              item.tax_rate || 20,
              lineTotal,
              item.sort_order || i,
              item.buy_cost || 0,
              item.supplier || null,
              item.unit || null,
              item.line_notes || null,
              item.id,
              id
            ]
          );
        } else {
          // Insert new line item
          const lineTotal = calculateLineTotal(
            item.quantity,
            item.unit_price,
            item.discount_percent || 0,
            item.tax_rate || 20
          );

          await client.query(
            `INSERT INTO quote_lines (
              quote_id, product_id, description, quantity, unit_price,
              discount_percent, tax_rate, line_total, sort_order, buy_cost, supplier, unit, line_notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              id,
              item.product_id || null,
              item.description,
              item.quantity,
              item.unit_price,
              item.discount_percent || 0,
              item.tax_rate || 20,
              lineTotal,
              item.sort_order || i,
              item.buy_cost || 0,
              item.supplier || null,
              item.unit || null,
              item.line_notes || null
            ]
          );
        }
      }

      // Recalculate quote totals
      const lineItemsResult = await client.query(
        'SELECT * FROM quote_lines WHERE quote_id = $1',
        [id]
      );

      const totals = calculateQuoteTotals(
        lineItemsResult.rows,
        quote.discount_amount,
        quote.discount_percent
      );

      // Update quote totals
      await client.query(
        `UPDATE quotes 
         SET subtotal = $1, tax_amount = $2, total_amount = $3, updated_at = NOW()
         WHERE id = $4`,
        [totals.subtotal, totals.tax_amount, totals.total_amount, id]
      );

      await client.query('COMMIT');

      // Fetch updated quote with line items
      const updatedQuoteQuery = `
        SELECT 
          q.*,
          json_agg(
            json_build_object(
              'id', ql.id,
              'product_id', ql.product_id,
              'description', ql.description,
              'quantity', ql.quantity,
              'unit_price', ql.unit_price,
              'discount_percent', ql.discount_percent,
              'tax_rate', ql.tax_rate,
              'line_total', ql.line_total,
              'sort_order', ql.sort_order
            ) ORDER BY ql.sort_order
          ) as line_items
        FROM quotes q
        LEFT JOIN quote_lines ql ON ql.quote_id = q.id
        WHERE q.id = $1
        GROUP BY q.id
      `;

      const result = await client.query(updatedQuoteQuery, [id]);

      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating quote line items:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update quote line items' });
  }
});

// DELETE /api/quotes/:id - Delete quote
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.orgContext;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete line items first (foreign key constraint)
      await client.query('DELETE FROM quote_lines WHERE quote_id = $1', [id]);

      // Delete quote
      const result = await client.query(
        'DELETE FROM quotes WHERE id = $1 AND organisation_id = $2 RETURNING *',
        [id, organizationId]
      );

      if (result.rows.length === 0) {
        throw new Error('Quote not found');
      }

      await client.query('COMMIT');

      res.json({ message: 'Quote deleted successfully', quote: result.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting quote:', error);
    res.status(500).json({ error: 'Failed to delete quote' });
  }
});

module.exports = router;



// POST /api/quotes/:id/accept - Accept quote (customer action)
router.post('/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.orgContext;
    const { userId } = req.user;

    const { accepted_by_name, accepted_by_email, signature, ip_address } = req.body;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Update quote status
      const quoteResult = await client.query(
        `UPDATE quotes 
         SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND organisation_id = $2 AND status IN ('sent', 'draft')
         RETURNING *`,
        [id, organizationId]
      );

      if (quoteResult.rows.length === 0) {
        throw new Error('Quote not found or cannot be accepted');
      }

      // Record acceptance details
      await client.query(
        `INSERT INTO quote_acceptance (
          quote_id, accepted_by_name, accepted_by_email, signature, 
          ip_address, accepted_by_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          accepted_by_name || null,
          accepted_by_email || null,
          signature || null,
          ip_address || null,
          userId || null
        ]
      );

      await client.query('COMMIT');

      res.json({ message: 'Quote accepted successfully', quote: quoteResult.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error accepting quote:', error);
    res.status(500).json({ error: 'Failed to accept quote' });
  }
});

// POST /api/quotes/:id/decline - Decline quote (customer action)
router.post('/:id/decline', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.orgContext;

    const { reason } = req.body;

    const result = await db.query(
      `UPDATE quotes 
       SET status = 'declined', declined_at = NOW(), decline_reason = $3, updated_at = NOW()
       WHERE id = $1 AND organisation_id = $2 AND status IN ('sent', 'draft')
       RETURNING *`,
      [id, organizationId, reason || null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found or cannot be declined' });
    }

    res.json({ message: 'Quote declined', quote: result.rows[0] });
  } catch (error) {
    console.error('Error declining quote:', error);
    res.status(500).json({ error: 'Failed to decline quote' });
  }
});

// POST /api/quotes/:id/convert-to-job - Convert accepted quote to job
router.post('/:id/convert-to-job', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.orgContext;
    const { userId } = req.user;

    const { scheduled_start, scheduled_end, assigned_to, notes } = req.body;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Get quote details
      const quoteResult = await client.query(
        `SELECT * FROM quotes 
         WHERE id = $1 AND organisation_id = $2 AND status = 'accepted'`,
        [id, organizationId]
      );

      if (quoteResult.rows.length === 0) {
        throw new Error('Quote not found or not accepted');
      }

      const quote = quoteResult.rows[0];

      // Generate job number
      const jobNumberResult = await client.query(
        "SELECT generate_job_number($1) as job_number",
        [organizationId]
      );
      const jobNumber = jobNumberResult.rows[0].job_number;

      // Create job
      const jobResult = await client.query(
        `INSERT INTO jobs (
          organisation_id, contact_id, quote_id, job_number, title, description,
          status, scheduled_start, scheduled_end, assigned_to, created_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          organizationId,
          quote.contact_id,
          id,
          jobNumber,
          quote.title,
          quote.description,
          'scheduled',
          scheduled_start || null,
          scheduled_end || null,
          assigned_to || null,
          userId,
          notes || null
        ]
      );

      const job = jobResult.rows[0];

      // Update quote to mark as converted
      await client.query(
        'UPDATE quotes SET converted_to_job_id = $1, updated_at = NOW() WHERE id = $2',
        [job.id, id]
      );

      await client.query('COMMIT');

      res.json({ message: 'Quote converted to job successfully', job });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error converting quote to job:', error);
    res.status(500).json({ error: 'Failed to convert quote to job' });
  }
});

// POST /api/quotes/:id/duplicate - Duplicate quote
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.orgContext;
    const { userId } = req.user;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Get original quote
      const quoteResult = await client.query(
        'SELECT * FROM quotes WHERE id = $1 AND organisation_id = $2',
        [id, organizationId]
      );

      if (quoteResult.rows.length === 0) {
        throw new Error('Quote not found');
      }

      const originalQuote = quoteResult.rows[0];

      // Generate new quote number
      const quoteNumberResult = await client.query(
        "SELECT generate_quote_number($1) as quote_number",
        [organizationId]
      );
      const quoteNumber = quoteNumberResult.rows[0].quote_number;

      // Create new quote
      const newQuoteResult = await client.query(
        `INSERT INTO quotes (
          organisation_id, contact_id, quote_number, title, description,
          subtotal, discount_amount, discount_percent, tax_amount, total_amount,
          valid_until, terms_conditions, notes, internal_notes, created_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'draft')
        RETURNING *`,
        [
          organizationId,
          originalQuote.contact_id,
          quoteNumber,
          originalQuote.title + ' (Copy)',
          originalQuote.description,
          originalQuote.subtotal,
          originalQuote.discount_amount,
          originalQuote.discount_percent,
          originalQuote.tax_amount,
          originalQuote.total_amount,
          originalQuote.valid_until,
          originalQuote.terms_conditions,
          originalQuote.notes,
          originalQuote.internal_notes,
          userId
        ]
      );

      const newQuote = newQuoteResult.rows[0];

      // Copy line items
      const lineItemsResult = await client.query(
        'SELECT * FROM quote_lines WHERE quote_id = $1 ORDER BY sort_order',
        [id]
      );

      for (const item of lineItemsResult.rows) {
        await client.query(
          `INSERT INTO quote_lines (
            quote_id, product_id, description, quantity, unit_price,
            discount_percent, tax_rate, line_total, sort_order, buy_cost, supplier, unit, line_notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            newQuote.id,
            item.product_id,
            item.description,
            item.quantity,
            item.unit_price,
            item.discount_percent,
            item.tax_rate,
            item.line_total,
            item.sort_order,
            item.buy_cost || 0,
            item.supplier || null,
            item.unit || null,
            item.line_notes || null
          ]
        );
      }

      await client.query('COMMIT');

      res.json({ message: 'Quote duplicated successfully', quote: newQuote });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error duplicating quote:', error);
    res.status(500).json({ error: 'Failed to duplicate quote' });
  }
});

// GET /api/quotes/:id/pdf - Generate and download quote PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    console.log('🎯 PDF Generation Started');
    const { id } = req.params;
    const { organizationId } = req.orgContext;
    console.log('📋 Quote ID:', id, 'Org ID:', organizationId);

    // Check if id is a UUID or quote number (format: QT-YYYY-NNNN)
    const isQuoteNumber = /^QT-\d{4}-\d{4}$/.test(id);

    // Fetch quote with all details
    const quoteQuery = `
      SELECT 
        q.*,
        c.company_name,
        c.contact_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address,
        u.name as created_by_name
      FROM quotes q
      LEFT JOIN contacts c ON q.contact_id = c.id
      LEFT JOIN users u ON q.created_by = u.id
      WHERE ${isQuoteNumber ? 'q.quote_number' : 'q.id'} = $1 AND q.organisation_id = $2
    `;
    
    const quoteResult = await db.query(quoteQuery, [id, organizationId]);
    console.log('✅ Quote query executed, rows:', quoteResult.rows.length);
    
    if (quoteResult.rows.length === 0) {
      console.log('❌ Quote not found');
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    const quote = quoteResult.rows[0];
    console.log('📄 Quote data retrieved:', quote.quote_number);

    // Fetch line items
    const lineItemsQuery = `
      SELECT * FROM quote_lines
      WHERE quote_id = $1
      ORDER BY sort_order, created_at
    `;
    
    const lineItemsResult = await db.query(lineItemsQuery, [quote.id]);
    const lineItems = lineItemsResult.rows;
    console.log('📦 Line items retrieved:', lineItems.length);

    // Create PDF document
    console.log('🎨 Creating PDF document...');
    const doc = new PDFDocument({ margin: 50 });
    console.log('✅ PDFDocument created');

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=quote-${quote.quote_number}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add company header
    doc.fontSize(24).text('WorkTrackr Cloud', { align: 'left' });
    doc.fontSize(10).text('Custom Workflows. Zero Hassle.', { align: 'left' });
    doc.moveDown();

    // Add quote title
    doc.fontSize(20).text('QUOTATION', { align: 'center' });
    doc.moveDown();

    // Add quote details in two columns
    const leftColumn = 50;
    const rightColumn = 350;
    let yPosition = doc.y;

    // Left column - Customer details
    doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', leftColumn, yPosition);
    doc.font('Helvetica').fontSize(10);
    doc.text(quote.company_name || 'N/A', leftColumn, yPosition + 15);
    if (quote.contact_name) doc.text(quote.contact_name, leftColumn);
    if (quote.customer_email) doc.text(quote.customer_email, leftColumn);
    if (quote.customer_phone) doc.text(quote.customer_phone, leftColumn);
    if (quote.customer_address) doc.text(quote.customer_address, leftColumn, undefined, { width: 250 });

    // Right column - Quote details
    doc.fontSize(10).font('Helvetica-Bold').text('Quote Number:', rightColumn, yPosition);
    doc.font('Helvetica').text(quote.quote_number, rightColumn + 100, yPosition);
    
    doc.font('Helvetica-Bold').text('Quote Date:', rightColumn, yPosition + 15);
    doc.font('Helvetica').text(formatDate(quote.created_at), rightColumn + 100, yPosition + 15);
    
    doc.font('Helvetica-Bold').text('Valid Until:', rightColumn, yPosition + 30);
    doc.font('Helvetica').text(formatDate(quote.valid_until), rightColumn + 100, yPosition + 30);
    
    doc.font('Helvetica-Bold').text('Status:', rightColumn, yPosition + 45);
    doc.font('Helvetica').text(capitalizeFirst(quote.status), rightColumn + 100, yPosition + 45);

    doc.moveDown(3);

    // Add quote title if exists
    if (quote.title) {
      doc.fontSize(14).font('Helvetica-Bold').text(quote.title);
      doc.moveDown(0.5);
    }

    // Add description if exists
    if (quote.description) {
      doc.fontSize(10).font('Helvetica').text(quote.description);
      doc.moveDown();
    }

    doc.moveDown();

    // Add line items table
    const tableTop = doc.y;
    const descX  = 50;
    const unitX  = 310;
    const qtyX   = 355;
    const priceX = 390;
    const totalX = 460;
    const pageW  = 545;

    // Table header
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Description', descX, tableTop, { width: 255 });
    doc.text('Unit',  unitX,  tableTop, { width: 40 });
    doc.text('Qty',   qtyX,   tableTop, { width: 30, align: 'right' });
    doc.text('Price', priceX, tableTop, { width: 65, align: 'right' });
    doc.text('Total', totalX, tableTop, { width: 80, align: 'right' });

    // Header underline
    doc.moveTo(descX, tableTop + 14).lineTo(pageW, tableTop + 14).lineWidth(0.5).stroke();

    // Table rows
    let yPos = tableTop + 22;
    doc.font('Helvetica').fontSize(9);

    lineItems.forEach((item) => {
      const qty      = parseFloat(item.quantity) || 0;
      const price    = parseFloat(item.unit_price) || 0;
      const disc     = parseFloat(item.discount_percent || 0);
      const itemTotal = qty * price * (1 - disc / 100);
      const displayPrice = disc > 0
        ? `£${price.toFixed(2)}\n(-${disc}%)`
        : `£${price.toFixed(2)}`;

      // Check for new page
      if (yPos > 680) {
        doc.addPage();
        yPos = 50;
      }

      const descText = item.description || '';
      const descHeight = doc.heightOfString(descText, { width: 255 });
      const rowHeight = Math.max(descHeight, 14) + 4;

      doc.text(descText, descX, yPos, { width: 255 });
      doc.text(item.unit || '',  unitX, yPos, { width: 40 });
      doc.text(qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2), qtyX, yPos, { width: 30, align: 'right' });
      doc.text(displayPrice, priceX, yPos, { width: 65, align: 'right' });
      doc.text(`£${itemTotal.toFixed(2)}`, totalX, yPos, { width: 80, align: 'right' });

      yPos += rowHeight;

      // Line notes (italic, indented)
      if (item.line_notes) {
        doc.font('Helvetica-Oblique').fontSize(8)
           .text(item.line_notes, descX + 10, yPos, { width: 480, color: '#666666' });
        yPos += doc.heightOfString(item.line_notes, { width: 480 }) + 4;
        doc.font('Helvetica').fontSize(9);
      }

      yPos += 4;
    });

    // Divider before totals
    doc.moveTo(priceX, yPos).lineTo(pageW, yPos).lineWidth(0.5).stroke();
    yPos += 8;

    // Calculate totals correctly (ex-VAT subtotal, VAT only on enabled lines)
    const subtotal = lineItems.reduce((sum, item) => {
      const qty   = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const disc  = parseFloat(item.discount_percent || 0);
      return sum + qty * price * (1 - disc / 100);
    }, 0);

    const vatAmount = lineItems.reduce((sum, item) => {
      const qty     = parseFloat(item.quantity) || 0;
      const price   = parseFloat(item.unit_price) || 0;
      const disc    = parseFloat(item.discount_percent || 0);
      const lineNet = qty * price * (1 - disc / 100);
      const taxRate = item.tax_rate != null ? parseFloat(item.tax_rate) : 20;
      return sum + lineNet * (taxRate / 100);
    }, 0);

    const totalIncVat = subtotal + vatAmount;

    // Totals block (right-aligned)
    const labelX  = 350;
    const valueX  = 460;
    const totWidth = 80;

    doc.font('Helvetica').fontSize(9);
    doc.text('Subtotal ex VAT:', labelX, yPos, { width: 105 });
    doc.text(`£${subtotal.toFixed(2)}`,      valueX, yPos, { width: totWidth, align: 'right' });
    yPos += 16;

    doc.text('VAT (20%):', labelX, yPos, { width: 105 });
    doc.text(`£${vatAmount.toFixed(2)}`,     valueX, yPos, { width: totWidth, align: 'right' });
    yPos += 16;

    doc.moveTo(labelX, yPos).lineTo(pageW, yPos).lineWidth(0.5).stroke();
    yPos += 6;

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('Total inc VAT:', labelX, yPos, { width: 105 });
    doc.text(`£${totalIncVat.toFixed(2)}`, valueX, yPos, { width: totWidth, align: 'right' });
    yPos += 20;

    // Add terms and conditions
    if (quote.terms_conditions) {
      yPos += 40;
      if (yPos > 650) {
        doc.addPage();
        yPos = 50;
      }
      doc.fontSize(12).font('Helvetica-Bold').text('Terms & Conditions', 50, yPos);
      yPos += 15;
      doc.fontSize(9).font('Helvetica').text(quote.terms_conditions, 50, yPos, { width: 500 });
    }

    // Add footer
    doc.fontSize(8).text(
      `Generated on ${new Date().toLocaleDateString('en-GB')} | WorkTrackr Cloud`,
      50,
      750,
      { align: 'center', width: 500 }
    );

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('❌❌❌ PDF Generation Error ❌❌❌');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // If headers not sent yet, send error response
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to generate PDF',
        details: error.message,
        type: error.name
      });
    }
  }
});

// Helper functions for PDF generation
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

