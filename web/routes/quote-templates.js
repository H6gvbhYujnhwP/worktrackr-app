const express = require('express');
const router = express.Router();
const { z } = require('zod');
const db = require('../../shared/db');

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  sector: z.string().max(100).optional(),
  description: z.string().optional(),
  default_line_items: z.array(z.object({
    type: z.enum(['labour', 'parts', 'fixed_fee']),
    description: z.string(),
    quantity: z.number().min(0),
    unit: z.string(),
    sell_price: z.number().min(0)
  })),
  exclusions: z.array(z.string()).optional(),
  terms_and_conditions: z.string().optional()
});

const updateTemplateSchema = createTemplateSchema.partial();

// GET /api/quote-templates - List all templates
router.get('/', async (req, res) => {
  try {
    const orgId = req.orgContext.organizationId;
    const { sector, is_active } = req.query;

    let query = `
      SELECT qt.*, u.email as created_by_email
      FROM quote_templates qt
      LEFT JOIN users u ON qt.created_by = u.id
      WHERE qt.organisation_id = $1
    `;
    const params = [orgId];
    let paramIndex = 2;

    if (sector) {
      query += ` AND qt.sector = $${paramIndex}`;
      params.push(sector);
      paramIndex++;
    }

    if (is_active !== undefined) {
      query += ` AND qt.is_active = $${paramIndex}`;
      params.push(is_active === 'true');
      paramIndex++;
    }

    query += ` ORDER BY qt.name ASC`;

    const result = await db.query(query, params);

    res.json({
      templates: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('[Quote Templates] List error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch templates', 
      message: error.message 
    });
  }
});

// GET /api/quote-templates/sectors - Get unique sectors
router.get('/sectors', async (req, res) => {
  try {
    const orgId = req.orgContext.organizationId;

    const result = await db.query(
      `SELECT DISTINCT sector 
       FROM quote_templates 
       WHERE organisation_id = $1 AND sector IS NOT NULL
       ORDER BY sector ASC`,
      [orgId]
    );

    res.json({
      sectors: result.rows.map(r => r.sector)
    });

  } catch (error) {
    console.error('[Quote Templates] Sectors error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sectors', 
      message: error.message 
    });
  }
});

// GET /api/quote-templates/:id - Get single template
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.orgContext.organizationId;

    const result = await db.query(
      `SELECT qt.*, u.email as created_by_email
       FROM quote_templates qt
       LEFT JOIN users u ON qt.created_by = u.id
       WHERE qt.id = $1 AND qt.organisation_id = $2`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('[Quote Templates] Get error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch template', 
      message: error.message 
    });
  }
});

// POST /api/quote-templates - Create new template
router.post('/', async (req, res) => {
  try {
    const data = createTemplateSchema.parse(req.body);
    const orgId = req.orgContext.organizationId;
    const userId = req.user.userId;

    const result = await db.query(
      `INSERT INTO quote_templates (
        organisation_id, name, sector, description,
        default_line_items, exclusions, terms_and_conditions,
        is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
      RETURNING *`,
      [
        orgId,
        data.name,
        data.sector || null,
        data.description || null,
        JSON.stringify(data.default_line_items),
        data.exclusions || [],
        data.terms_and_conditions || null,
        userId
      ]
    );

    console.log('[Quote Templates] Created template:', result.rows[0].id);

    res.status(201).json({
      success: true,
      template: result.rows[0]
    });

  } catch (error) {
    console.error('[Quote Templates] Create error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }

    res.status(500).json({ 
      error: 'Failed to create template', 
      message: error.message 
    });
  }
});

// PUT /api/quote-templates/:id - Update template
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = updateTemplateSchema.parse(req.body);
    const orgId = req.orgContext.organizationId;

    // Check if template exists
    const checkResult = await db.query(
      `SELECT id FROM quote_templates WHERE id = $1 AND organisation_id = $2`,
      [id, orgId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Build update query dynamically
    const updates = [];
    const params = [id, orgId];
    let paramIndex = 3;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(data.name);
      paramIndex++;
    }

    if (data.sector !== undefined) {
      updates.push(`sector = $${paramIndex}`);
      params.push(data.sector);
      paramIndex++;
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(data.description);
      paramIndex++;
    }

    if (data.default_line_items !== undefined) {
      updates.push(`default_line_items = $${paramIndex}`);
      params.push(JSON.stringify(data.default_line_items));
      paramIndex++;
    }

    if (data.exclusions !== undefined) {
      updates.push(`exclusions = $${paramIndex}`);
      params.push(data.exclusions);
      paramIndex++;
    }

    if (data.terms_and_conditions !== undefined) {
      updates.push(`terms_and_conditions = $${paramIndex}`);
      params.push(data.terms_and_conditions);
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);

    const query = `
      UPDATE quote_templates 
      SET ${updates.join(', ')}
      WHERE id = $1 AND organisation_id = $2
      RETURNING *
    `;

    const result = await db.query(query, params);

    console.log('[Quote Templates] Updated template:', id);

    res.json({
      success: true,
      template: result.rows[0]
    });

  } catch (error) {
    console.error('[Quote Templates] Update error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }

    res.status(500).json({ 
      error: 'Failed to update template', 
      message: error.message 
    });
  }
});

// DELETE /api/quote-templates/:id - Delete template (soft delete by setting is_active = false)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.orgContext.organizationId;

    const result = await db.query(
      `UPDATE quote_templates 
       SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND organisation_id = $2
       RETURNING id`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    console.log('[Quote Templates] Deleted template:', id);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('[Quote Templates] Delete error:', error);
    res.status(500).json({ 
      error: 'Failed to delete template', 
      message: error.message 
    });
  }
});

// POST /api/quote-templates/:id/activate - Reactivate template
router.post('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.orgContext.organizationId;

    const result = await db.query(
      `UPDATE quote_templates 
       SET is_active = true, updated_at = NOW()
       WHERE id = $1 AND organisation_id = $2
       RETURNING *`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    console.log('[Quote Templates] Activated template:', id);

    res.json({
      success: true,
      template: result.rows[0]
    });

  } catch (error) {
    console.error('[Quote Templates] Activate error:', error);
    res.status(500).json({ 
      error: 'Failed to activate template', 
      message: error.message 
    });
  }
});

module.exports = router;
