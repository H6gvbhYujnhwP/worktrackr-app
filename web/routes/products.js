const express = require('express');
const { z } = require('zod');
const { query } = require('@worktrackr/shared/db');

const router = express.Router();

// Validation schemas - matching production column names
const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  type: z.string().max(50).optional().nullable(), // Production uses 'type' not 'category'
  unit: z.string().max(50).default('service'), // Production uses 'unit' not 'unit_type'
  our_cost: z.number().min(0).optional().nullable(), // Production uses 'our_cost' not 'cost_price'
  client_price: z.number().min(0), // Production uses 'client_price' not 'sell_price'
  tax_rate: z.number().min(0).max(100).default(20), // UK VAT default
  default_quantity: z.number().min(0).default(1)
});

const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  type: z.string().max(50).optional().nullable(),
  unit: z.string().max(50).optional(),
  our_cost: z.number().min(0).optional().nullable(),
  client_price: z.number().min(0).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  default_quantity: z.number().min(0).optional(),
  is_active: z.boolean().optional()
});

// -------------------- ROUTES --------------------

// Get all products for organization
router.get('/', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { search, type, is_active, page = 1, limit = 50 } = req.query;
    
    let whereClause = 'WHERE organisation_id = $1';
    const params = [organizationId];
    let paramCount = 1;

    if (search) {
      whereClause += ` AND (name ILIKE $${++paramCount} OR description ILIKE $${paramCount} OR sku ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (type) {
      whereClause += ` AND type = $${++paramCount}`;
      params.push(type);
    }

    if (is_active !== undefined) {
      whereClause += ` AND is_active = $${++paramCount}`;
      params.push(is_active === 'true');
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const productsResult = await query(`
      SELECT p.*,
             (p.client_price - COALESCE(p.our_cost, 0)) as margin,
             CASE 
               WHEN p.our_cost > 0 THEN ((p.client_price - p.our_cost) / p.our_cost * 100)
               ELSE 0
             END as margin_percentage,
             (SELECT COUNT(*) FROM quote_lines WHERE product_id = p.id) as times_quoted,
             (SELECT COUNT(*) FROM invoice_lines WHERE product_id = p.id) as times_invoiced
      FROM products p
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `, [...params, limit, offset]);

    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM products
      ${whereClause}
    `, params);

    res.json({
      products: productsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;

    const productResult = await query(`
      SELECT p.*,
             (p.client_price - COALESCE(p.our_cost, 0)) as margin,
             CASE 
               WHEN p.our_cost > 0 THEN ((p.client_price - p.our_cost) / p.our_cost * 100)
               ELSE 0
             END as margin_percentage,
             (SELECT COUNT(*) FROM quote_lines WHERE product_id = p.id) as times_quoted,
             (SELECT COUNT(*) FROM invoice_lines WHERE product_id = p.id) as times_invoiced,
             (SELECT COALESCE(SUM(quantity), 0) FROM invoice_lines WHERE product_id = p.id) as total_quantity_sold,
             (SELECT COALESCE(SUM(total), 0) FROM invoice_lines WHERE product_id = p.id) as total_revenue
      FROM products p
      WHERE p.id = $1 AND p.organisation_id = $2
    `, [id, organizationId]);

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get recent quotes using this product
    const recentQuotesResult = await query(`
      SELECT q.id, q.quote_number, q.total_amount, q.status, q.created_at,
             c.company_name as customer_name
      FROM quote_lines ql
      JOIN quotes q ON ql.quote_id = q.id
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE ql.product_id = $1
      ORDER BY q.created_at DESC
      LIMIT 5
    `, [id]);

    // Get recent invoices using this product
    const recentInvoicesResult = await query(`
      SELECT i.id, i.invoice_number, i.total_amount, i.status, i.created_at,
             c.company_name as customer_name
      FROM invoice_lines il
      JOIN invoices i ON il.invoice_id = i.id
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE il.product_id = $1
      ORDER BY i.created_at DESC
      LIMIT 5
    `, [id]);

    res.json({
      product: productResult.rows[0],
      recent_quotes: recentQuotesResult.rows,
      recent_invoices: recentInvoicesResult.rows
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create new product
router.post('/', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { userId } = req.user;
    const validatedData = createProductSchema.parse(req.body);

    const result = await query(`
      INSERT INTO products (
        organisation_id, name, description, sku, type,
        unit, our_cost, client_price, tax_rate, default_quantity,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      organizationId,
      validatedData.name,
      validatedData.description,
      validatedData.sku,
      validatedData.type,
      validatedData.unit,
      validatedData.our_cost,
      validatedData.client_price,
      validatedData.tax_rate,
      validatedData.default_quantity,
      userId
    ]);

    res.status(201).json(result.rows[0]);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;
    const validatedData = updateProductSchema.parse(req.body);

    // Build dynamic UPDATE query
    const updates = [];
    const values = [id, organizationId];
    let paramCount = 2;

    if (validatedData.name !== undefined) {
      updates.push(`name = $${++paramCount}`);
      values.push(validatedData.name);
    }
    if (validatedData.description !== undefined) {
      updates.push(`description = $${++paramCount}`);
      values.push(validatedData.description);
    }
    if (validatedData.sku !== undefined) {
      updates.push(`sku = $${++paramCount}`);
      values.push(validatedData.sku);
    }
    if (validatedData.type !== undefined) {
      updates.push(`type = $${++paramCount}`);
      values.push(validatedData.type);
    }
    if (validatedData.unit !== undefined) {
      updates.push(`unit = $${++paramCount}`);
      values.push(validatedData.unit);
    }
    if (validatedData.our_cost !== undefined) {
      updates.push(`our_cost = $${++paramCount}`);
      values.push(validatedData.our_cost);
    }
    if (validatedData.client_price !== undefined) {
      updates.push(`client_price = $${++paramCount}`);
      values.push(validatedData.client_price);
    }
    if (validatedData.tax_rate !== undefined) {
      updates.push(`tax_rate = $${++paramCount}`);
      values.push(validatedData.tax_rate);
    }
    if (validatedData.default_quantity !== undefined) {
      updates.push(`default_quantity = $${++paramCount}`);
      values.push(validatedData.default_quantity);
    }
    if (validatedData.is_active !== undefined) {
      updates.push(`is_active = $${++paramCount}`);
      values.push(validatedData.is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await query(`
      UPDATE products
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $1 AND organisation_id = $2
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;

    // Check if product is used in any quotes or invoices
    const usageCheck = await query(`
      SELECT
        (SELECT COUNT(*) FROM quote_lines WHERE product_id = $1) as quote_count,
        (SELECT COUNT(*) FROM invoice_lines WHERE product_id = $1) as invoice_count
    `, [id]);

    const { quote_count, invoice_count } = usageCheck.rows[0];
    
    if (parseInt(quote_count) > 0 || parseInt(invoice_count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete product that is used in quotes or invoices',
        details: {
          quotes: parseInt(quote_count),
          invoices: parseInt(invoice_count)
        }
      });
    }

    // Soft delete by setting is_active to false
    const result = await query(`
      UPDATE products
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND organisation_id = $2
      RETURNING *
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully', product: result.rows[0] });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get product types (categories)
router.get('/meta/types', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;

    const typesResult = await query(`
      SELECT DISTINCT type, COUNT(*) as product_count
      FROM products
      WHERE organisation_id = $1 AND type IS NOT NULL AND is_active = true
      GROUP BY type
      ORDER BY type ASC
    `, [organizationId]);

    res.json({
      types: typesResult.rows
    });

  } catch (error) {
    console.error('Get types error:', error);
    res.status(500).json({ error: 'Failed to fetch product types' });
  }
});

// Get product statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;

    // Verify product belongs to organization
    const productCheck = await query(`
      SELECT id FROM products WHERE id = $1 AND organisation_id = $2
    `, [id, organizationId]);

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get comprehensive statistics
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM quote_lines WHERE product_id = $1) as times_quoted,
        (SELECT COALESCE(SUM(quantity), 0) FROM quote_lines WHERE product_id = $1) as total_quoted_quantity,
        (SELECT COUNT(*) FROM invoice_lines WHERE product_id = $1) as times_invoiced,
        (SELECT COALESCE(SUM(quantity), 0) FROM invoice_lines WHERE product_id = $1) as total_sold_quantity,
        (SELECT COALESCE(SUM(total), 0) FROM invoice_lines WHERE product_id = $1) as total_revenue,
        (SELECT COALESCE(AVG(unit_price), 0) FROM invoice_lines WHERE product_id = $1) as average_sell_price
    `, [id]);

    res.json(stats.rows[0]);

  } catch (error) {
    console.error('Get product stats error:', error);
    res.status(500).json({ error: 'Failed to fetch product statistics' });
  }
});

// Bulk import products (CSV)
router.post('/bulk-import', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { userId } = req.user;
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Products array is required' });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const product of products) {
      try {
        const validatedData = createProductSchema.parse(product);
        
        await query(`
          INSERT INTO products (
            organisation_id, name, description, sku, type,
            unit, our_cost, client_price, tax_rate, default_quantity,
            created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          organizationId,
          validatedData.name,
          validatedData.description,
          validatedData.sku,
          validatedData.type,
          validatedData.unit,
          validatedData.our_cost,
          validatedData.client_price,
          validatedData.tax_rate,
          validatedData.default_quantity,
          userId
        ]);

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          product: product.name || 'Unknown',
          error: error.message
        });
      }
    }

    res.json(results);

  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Failed to import products' });
  }
});

module.exports = router;

