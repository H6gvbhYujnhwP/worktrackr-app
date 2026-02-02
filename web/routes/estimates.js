const express = require('express');
const router = express.Router();
const { z } = require('zod');
const db = require('../../shared/db');

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createEstimateSchema = z.object({
  quote_id: z.string().uuid(),
  tender_context_id: z.string().uuid().optional(),
  summary: z.string().optional(),
  assumptions: z.string().optional(),
  risks: z.string().optional(),
  exclusions: z.string().optional(),
  target_margin_percent: z.number().min(0).max(100).optional()
});

const updateEstimateSchema = z.object({
  summary: z.string().optional(),
  assumptions: z.string().optional(),
  risks: z.string().optional(),
  exclusions: z.string().optional(),
  target_margin_percent: z.number().min(0).max(100).optional(),
  status: z.enum(['draft', 'in_progress', 'ready', 'transferred']).optional()
});

const createEstimateItemSchema = z.object({
  description: z.string().min(1),
  category: z.enum(['labour', 'materials', 'equipment', 'subcontract', 'overhead', 'other']).optional(),
  quantity: z.number().optional(),
  unit: z.string().max(50).optional(),
  unit_cost: z.number().optional(),
  total_cost: z.number().optional(),
  hours: z.number().optional(),
  hourly_rate: z.number().optional(),
  source: z.enum(['manual', 'ai_suggested', 'imported', 'calculated']).optional(),
  source_reference: z.string().optional(),
  confidence_status: z.enum(['confirmed', 'needs_review', 'unknown']).optional(),
  notes: z.string().optional(),
  calculation_notes: z.string().optional(),
  section: z.string().max(100).optional(),
  sort_order: z.number().int().optional()
});

const updateEstimateItemSchema = createEstimateItemSchema.partial();

const bulkCreateItemsSchema = z.object({
  items: z.array(createEstimateItemSchema).min(1)
});

// ============================================================================
// INTERNAL ESTIMATE ROUTES
// ============================================================================

// GET /api/estimates/:quoteId - Get internal estimate for a quote
router.get('/:quoteId', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const organizationId = req.orgContext.organizationId;

    const result = await db.query(`
      SELECT ie.*,
        (SELECT COUNT(*) FROM estimate_items WHERE internal_estimate_id = ie.id) as item_count,
        (SELECT COUNT(*) FROM estimate_items WHERE internal_estimate_id = ie.id AND confidence_status = 'needs_review') as unconfirmed_count
      FROM internal_estimates ie
      WHERE ie.quote_id = $1 AND ie.organisation_id = $2
    `, [quoteId, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Internal estimate not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching internal estimate:', error);
    res.status(500).json({ error: 'Failed to fetch internal estimate' });
  }
});

// POST /api/estimates - Create internal estimate for a quote
router.post('/', async (req, res) => {
  try {
    const organizationId = req.orgContext.organizationId;
    const userId = req.user.userId;
    const validatedData = createEstimateSchema.parse(req.body);

    // Verify quote belongs to this organisation
    const quoteCheck = await db.query(
      'SELECT id FROM quotes WHERE id = $1 AND organisation_id = $2',
      [validatedData.quote_id, organizationId]
    );

    if (quoteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Check if estimate already exists
    const existingCheck = await db.query(
      'SELECT id FROM internal_estimates WHERE quote_id = $1',
      [validatedData.quote_id]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Internal estimate already exists for this quote',
        existing_id: existingCheck.rows[0].id
      });
    }

    const result = await db.query(`
      INSERT INTO internal_estimates (
        organisation_id, quote_id, tender_context_id, summary, assumptions,
        risks, exclusions, target_margin_percent, created_by, last_edited_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
      RETURNING *
    `, [
      organizationId,
      validatedData.quote_id,
      validatedData.tender_context_id,
      validatedData.summary,
      validatedData.assumptions,
      validatedData.risks,
      validatedData.exclusions,
      validatedData.target_margin_percent,
      userId
    ]);

    console.log('Internal estimate created:', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating internal estimate:', error);
    res.status(500).json({ error: 'Failed to create internal estimate' });
  }
});

// PUT /api/estimates/:id - Update internal estimate
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgContext.organizationId;
    const userId = req.user.userId;
    const validatedData = updateEstimateSchema.parse(req.body);

    const result = await db.query(`
      UPDATE internal_estimates
      SET 
        summary = COALESCE($1, summary),
        assumptions = COALESCE($2, assumptions),
        risks = COALESCE($3, risks),
        exclusions = COALESCE($4, exclusions),
        target_margin_percent = COALESCE($5, target_margin_percent),
        status = COALESCE($6, status),
        last_edited_by = $7,
        updated_at = NOW()
      WHERE id = $8 AND organisation_id = $9
      RETURNING *
    `, [
      validatedData.summary,
      validatedData.assumptions,
      validatedData.risks,
      validatedData.exclusions,
      validatedData.target_margin_percent,
      validatedData.status,
      userId,
      id,
      organizationId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Internal estimate not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating internal estimate:', error);
    res.status(500).json({ error: 'Failed to update internal estimate' });
  }
});

// ============================================================================
// ESTIMATE ITEMS ROUTES
// ============================================================================

// GET /api/estimates/:estimateId/items - Get all items for an estimate
router.get('/:estimateId/items', async (req, res) => {
  try {
    const { estimateId } = req.params;
    const organizationId = req.orgContext.organizationId;
    const { category, status, section } = req.query;

    // Verify estimate belongs to this organisation
    const estimateCheck = await db.query(`
      SELECT ie.id FROM internal_estimates ie
      WHERE ie.id = $1 AND ie.organisation_id = $2
    `, [estimateId, organizationId]);

    if (estimateCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Internal estimate not found' });
    }

    let query = `
      SELECT ei.*,
        u.name as created_by_name
      FROM estimate_items ei
      LEFT JOIN users u ON ei.created_by = u.id
      WHERE ei.internal_estimate_id = $1
    `;
    const params = [estimateId];
    let paramCount = 1;

    if (category) {
      paramCount++;
      query += ` AND ei.category = $${paramCount}`;
      params.push(category);
    }

    if (status) {
      paramCount++;
      query += ` AND ei.confidence_status = $${paramCount}`;
      params.push(status);
    }

    if (section) {
      paramCount++;
      query += ` AND ei.section = $${paramCount}`;
      params.push(section);
    }

    query += ' ORDER BY ei.section NULLS LAST, ei.sort_order, ei.created_at';

    const result = await db.query(query, params);

    // Group by section for easier UI rendering
    const sections = {};
    result.rows.forEach(item => {
      const sectionName = item.section || 'Unsectioned';
      if (!sections[sectionName]) {
        sections[sectionName] = [];
      }
      sections[sectionName].push(item);
    });

    // Calculate summary stats
    const stats = {
      total_items: result.rows.length,
      total_cost: result.rows.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0),
      total_hours: result.rows.reduce((sum, item) => sum + parseFloat(item.hours || 0), 0),
      unconfirmed_count: result.rows.filter(item => item.confidence_status !== 'confirmed').length,
      by_category: {}
    };

    result.rows.forEach(item => {
      const cat = item.category || 'other';
      if (!stats.by_category[cat]) {
        stats.by_category[cat] = { count: 0, total_cost: 0 };
      }
      stats.by_category[cat].count++;
      stats.by_category[cat].total_cost += parseFloat(item.total_cost || 0);
    });

    res.json({
      items: result.rows,
      sections,
      stats
    });
  } catch (error) {
    console.error('Error fetching estimate items:', error);
    res.status(500).json({ error: 'Failed to fetch estimate items' });
  }
});

// POST /api/estimates/:estimateId/items - Create a single item
router.post('/:estimateId/items', async (req, res) => {
  try {
    const { estimateId } = req.params;
    const organizationId = req.orgContext.organizationId;
    const userId = req.user.userId;
    const validatedData = createEstimateItemSchema.parse(req.body);

    // Verify estimate belongs to this organisation
    const estimateCheck = await db.query(`
      SELECT ie.id FROM internal_estimates ie
      WHERE ie.id = $1 AND ie.organisation_id = $2
    `, [estimateId, organizationId]);

    if (estimateCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Internal estimate not found' });
    }

    // Calculate total_cost if not provided
    let totalCost = validatedData.total_cost;
    if (!totalCost && validatedData.quantity && validatedData.unit_cost) {
      totalCost = validatedData.quantity * validatedData.unit_cost;
    }
    if (!totalCost && validatedData.hours && validatedData.hourly_rate) {
      totalCost = validatedData.hours * validatedData.hourly_rate;
    }

    const result = await db.query(`
      INSERT INTO estimate_items (
        internal_estimate_id, description, category, quantity, unit, unit_cost,
        total_cost, hours, hourly_rate, source, source_reference, 
        confidence_status, notes, calculation_notes, section, sort_order, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      estimateId,
      validatedData.description,
      validatedData.category || 'other',
      validatedData.quantity,
      validatedData.unit,
      validatedData.unit_cost,
      totalCost,
      validatedData.hours,
      validatedData.hourly_rate,
      validatedData.source || 'manual',
      validatedData.source_reference,
      validatedData.confidence_status || 'needs_review',
      validatedData.notes,
      validatedData.calculation_notes,
      validatedData.section,
      validatedData.sort_order || 0,
      userId
    ]);

    console.log('Estimate item created:', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating estimate item:', error);
    res.status(500).json({ error: 'Failed to create estimate item' });
  }
});

// POST /api/estimates/:estimateId/items/bulk - Create multiple items (for AI suggestions)
router.post('/:estimateId/items/bulk', async (req, res) => {
  try {
    const { estimateId } = req.params;
    const organizationId = req.orgContext.organizationId;
    const userId = req.user.userId;
    const validatedData = bulkCreateItemsSchema.parse(req.body);

    // Verify estimate belongs to this organisation
    const estimateCheck = await db.query(`
      SELECT ie.id FROM internal_estimates ie
      WHERE ie.id = $1 AND ie.organisation_id = $2
    `, [estimateId, organizationId]);

    if (estimateCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Internal estimate not found' });
    }

    const client = await db.pool.connect();
    const results = [];

    try {
      await client.query('BEGIN');

      for (const item of validatedData.items) {
        // Calculate total_cost if not provided
        let totalCost = item.total_cost;
        if (!totalCost && item.quantity && item.unit_cost) {
          totalCost = item.quantity * item.unit_cost;
        }
        if (!totalCost && item.hours && item.hourly_rate) {
          totalCost = item.hours * item.hourly_rate;
        }

        const result = await client.query(`
          INSERT INTO estimate_items (
            internal_estimate_id, description, category, quantity, unit, unit_cost,
            total_cost, hours, hourly_rate, source, source_reference, 
            confidence_status, notes, calculation_notes, section, sort_order, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING *
        `, [
          estimateId,
          item.description,
          item.category || 'other',
          item.quantity,
          item.unit,
          item.unit_cost,
          totalCost,
          item.hours,
          item.hourly_rate,
          item.source || 'ai_suggested',
          item.source_reference,
          item.confidence_status || 'needs_review',
          item.notes,
          item.calculation_notes,
          item.section,
          item.sort_order || 0,
          userId
        ]);

        results.push(result.rows[0]);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    console.log(`Bulk created ${results.length} estimate items`);
    res.status(201).json({
      created: results,
      created_count: results.length
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error bulk creating estimate items:', error);
    res.status(500).json({ error: 'Failed to create estimate items' });
  }
});

// PUT /api/estimates/items/:id - Update an item
router.put('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgContext.organizationId;
    const validatedData = updateEstimateItemSchema.parse(req.body);

    // Calculate total_cost if quantity/unit_cost changed
    let totalCost = validatedData.total_cost;
    if (validatedData.quantity !== undefined || validatedData.unit_cost !== undefined) {
      // Will be recalculated by trigger if both are set
    }

    const result = await db.query(`
      UPDATE estimate_items ei
      SET 
        description = COALESCE($1, ei.description),
        category = COALESCE($2, ei.category),
        quantity = COALESCE($3, ei.quantity),
        unit = COALESCE($4, ei.unit),
        unit_cost = COALESCE($5, ei.unit_cost),
        total_cost = COALESCE($6, ei.total_cost),
        hours = COALESCE($7, ei.hours),
        hourly_rate = COALESCE($8, ei.hourly_rate),
        confidence_status = COALESCE($9, ei.confidence_status),
        notes = COALESCE($10, ei.notes),
        calculation_notes = COALESCE($11, ei.calculation_notes),
        section = COALESCE($12, ei.section),
        sort_order = COALESCE($13, ei.sort_order),
        updated_at = NOW()
      FROM internal_estimates ie
      WHERE ei.id = $14 
        AND ei.internal_estimate_id = ie.id 
        AND ie.organisation_id = $15
      RETURNING ei.*
    `, [
      validatedData.description,
      validatedData.category,
      validatedData.quantity,
      validatedData.unit,
      validatedData.unit_cost,
      totalCost,
      validatedData.hours,
      validatedData.hourly_rate,
      validatedData.confidence_status,
      validatedData.notes,
      validatedData.calculation_notes,
      validatedData.section,
      validatedData.sort_order,
      id,
      organizationId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating estimate item:', error);
    res.status(500).json({ error: 'Failed to update estimate item' });
  }
});

// POST /api/estimates/items/:id/confirm - Confirm an item
router.post('/items/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgContext.organizationId;

    const result = await db.query(`
      UPDATE estimate_items ei
      SET 
        confidence_status = 'confirmed',
        updated_at = NOW()
      FROM internal_estimates ie
      WHERE ei.id = $1 
        AND ei.internal_estimate_id = ie.id 
        AND ie.organisation_id = $2
      RETURNING ei.*
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate item not found' });
    }

    console.log('Estimate item confirmed:', id);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error confirming estimate item:', error);
    res.status(500).json({ error: 'Failed to confirm estimate item' });
  }
});

// DELETE /api/estimates/items/:id - Delete an item
router.delete('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgContext.organizationId;

    const result = await db.query(`
      DELETE FROM estimate_items ei
      USING internal_estimates ie
      WHERE ei.id = $1 
        AND ei.internal_estimate_id = ie.id 
        AND ie.organisation_id = $2
      RETURNING ei.id
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate item not found' });
    }

    res.json({ message: 'Estimate item deleted', id });
  } catch (error) {
    console.error('Error deleting estimate item:', error);
    res.status(500).json({ error: 'Failed to delete estimate item' });
  }
});

module.exports = router;
