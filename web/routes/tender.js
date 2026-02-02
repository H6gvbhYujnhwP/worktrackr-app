const express = require('express');
const router = express.Router();
const { z } = require('zod');
const db = require('../../shared/db');

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createTenderContextSchema = z.object({
  quote_id: z.string().uuid(),
  name: z.string().max(255).optional(),
  description: z.string().optional(),
  client_name: z.string().max(255).optional(),
  tender_reference: z.string().max(100).optional(),
  submission_deadline: z.string().optional() // ISO date string
});

const updateTenderContextSchema = z.object({
  name: z.string().max(255).optional(),
  description: z.string().optional(),
  client_name: z.string().max(255).optional(),
  tender_reference: z.string().max(100).optional(),
  submission_deadline: z.string().optional()
});

const createTenderSymbolSchema = z.object({
  symbol_or_term: z.string().min(1).max(100),
  interpreted_meaning: z.string().min(1),
  category: z.enum(['symbol', 'abbreviation', 'term', 'legend', 'note']).optional(),
  source_file_id: z.string().uuid().optional(),
  source_location: z.string().optional(),
  notes: z.string().optional(),
  confidence_status: z.enum(['confirmed', 'needs_review', 'unknown']).optional(),
  suggested_by: z.enum(['ai', 'manual']).optional()
});

const updateTenderSymbolSchema = z.object({
  interpreted_meaning: z.string().min(1).optional(),
  category: z.enum(['symbol', 'abbreviation', 'term', 'legend', 'note']).optional(),
  notes: z.string().optional(),
  confidence_status: z.enum(['confirmed', 'needs_review', 'unknown']).optional()
});

const bulkCreateSymbolsSchema = z.object({
  symbols: z.array(createTenderSymbolSchema).min(1)
});

// ============================================================================
// TENDER CONTEXT ROUTES
// ============================================================================

// GET /api/tender/context/:quoteId - Get tender context for a quote
router.get('/context/:quoteId', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const organizationId = req.orgContext.organizationId;

    const result = await db.query(`
      SELECT tc.*, 
        (SELECT COUNT(*) FROM tender_files WHERE tender_context_id = tc.id) as file_count,
        (SELECT COUNT(*) FROM tender_symbols WHERE tender_context_id = tc.id) as symbol_count,
        (SELECT COUNT(*) FROM tender_symbols WHERE tender_context_id = tc.id AND confidence_status = 'needs_review') as unconfirmed_count
      FROM tender_contexts tc
      WHERE tc.quote_id = $1 AND tc.organisation_id = $2
    `, [quoteId, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tender context not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching tender context:', error);
    res.status(500).json({ error: 'Failed to fetch tender context' });
  }
});

// POST /api/tender/context - Create tender context for a quote
router.post('/context', async (req, res) => {
  try {
    const organizationId = req.orgContext.organizationId;
    const userId = req.user.userId;
    const validatedData = createTenderContextSchema.parse(req.body);

    // Verify quote belongs to this organisation
    const quoteCheck = await db.query(
      'SELECT id FROM quotes WHERE id = $1 AND organisation_id = $2',
      [validatedData.quote_id, organizationId]
    );

    if (quoteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Check if tender context already exists
    const existingCheck = await db.query(
      'SELECT id FROM tender_contexts WHERE quote_id = $1',
      [validatedData.quote_id]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Tender context already exists for this quote',
        existing_id: existingCheck.rows[0].id
      });
    }

    const result = await db.query(`
      INSERT INTO tender_contexts (
        organisation_id, quote_id, name, description, client_name, 
        tender_reference, submission_deadline, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      organizationId,
      validatedData.quote_id,
      validatedData.name,
      validatedData.description,
      validatedData.client_name,
      validatedData.tender_reference,
      validatedData.submission_deadline,
      userId
    ]);

    console.log('Tender context created:', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating tender context:', error);
    res.status(500).json({ error: 'Failed to create tender context' });
  }
});

// PUT /api/tender/context/:id - Update tender context
router.put('/context/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgContext.organizationId;
    const validatedData = updateTenderContextSchema.parse(req.body);

    const result = await db.query(`
      UPDATE tender_contexts
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        client_name = COALESCE($3, client_name),
        tender_reference = COALESCE($4, tender_reference),
        submission_deadline = COALESCE($5, submission_deadline),
        updated_at = NOW()
      WHERE id = $6 AND organisation_id = $7
      RETURNING *
    `, [
      validatedData.name,
      validatedData.description,
      validatedData.client_name,
      validatedData.tender_reference,
      validatedData.submission_deadline,
      id,
      organizationId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tender context not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating tender context:', error);
    res.status(500).json({ error: 'Failed to update tender context' });
  }
});

// ============================================================================
// TENDER SYMBOLS ROUTES
// ============================================================================

// GET /api/tender/:contextId/symbols - Get all symbols for a tender
router.get('/:contextId/symbols', async (req, res) => {
  try {
    const { contextId } = req.params;
    const organizationId = req.orgContext.organizationId;
    const { status, category } = req.query;

    // Verify tender context belongs to this organisation
    const contextCheck = await db.query(`
      SELECT tc.id FROM tender_contexts tc
      WHERE tc.id = $1 AND tc.organisation_id = $2
    `, [contextId, organizationId]);

    if (contextCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tender context not found' });
    }

    let query = `
      SELECT ts.*, 
        tf.file_name as source_file_name,
        u.name as approved_by_name
      FROM tender_symbols ts
      LEFT JOIN tender_files tf ON ts.source_file_id = tf.id
      LEFT JOIN users u ON ts.approved_by_user_id = u.id
      WHERE ts.tender_context_id = $1
    `;
    const params = [contextId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND ts.confidence_status = $${paramCount}`;
      params.push(status);
    }

    if (category) {
      paramCount++;
      query += ` AND ts.category = $${paramCount}`;
      params.push(category);
    }

    query += ' ORDER BY ts.confidence_status DESC, ts.created_at';

    const result = await db.query(query, params);

    // Group by confidence status for easier UI rendering
    const grouped = {
      needs_review: result.rows.filter(s => s.confidence_status === 'needs_review'),
      unknown: result.rows.filter(s => s.confidence_status === 'unknown'),
      confirmed: result.rows.filter(s => s.confidence_status === 'confirmed')
    };

    res.json({
      symbols: result.rows,
      grouped,
      total: result.rows.length,
      unconfirmed_count: grouped.needs_review.length + grouped.unknown.length
    });
  } catch (error) {
    console.error('Error fetching tender symbols:', error);
    res.status(500).json({ error: 'Failed to fetch tender symbols' });
  }
});

// POST /api/tender/:contextId/symbols - Create a single symbol
router.post('/:contextId/symbols', async (req, res) => {
  try {
    const { contextId } = req.params;
    const organizationId = req.orgContext.organizationId;
    const userId = req.user.userId;
    const validatedData = createTenderSymbolSchema.parse(req.body);

    // Verify tender context belongs to this organisation
    const contextCheck = await db.query(`
      SELECT tc.id FROM tender_contexts tc
      WHERE tc.id = $1 AND tc.organisation_id = $2
    `, [contextId, organizationId]);

    if (contextCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tender context not found' });
    }

    const result = await db.query(`
      INSERT INTO tender_symbols (
        tender_context_id, symbol_or_term, interpreted_meaning, category,
        source_file_id, source_location, notes, confidence_status, 
        suggested_by, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      contextId,
      validatedData.symbol_or_term,
      validatedData.interpreted_meaning,
      validatedData.category || 'term',
      validatedData.source_file_id,
      validatedData.source_location,
      validatedData.notes,
      validatedData.confidence_status || 'needs_review',
      validatedData.suggested_by || 'manual',
      userId
    ]);

    console.log('Tender symbol created:', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Symbol already exists for this tender' });
    }
    console.error('Error creating tender symbol:', error);
    res.status(500).json({ error: 'Failed to create tender symbol' });
  }
});

// POST /api/tender/:contextId/symbols/bulk - Create multiple symbols (for AI suggestions)
router.post('/:contextId/symbols/bulk', async (req, res) => {
  try {
    const { contextId } = req.params;
    const organizationId = req.orgContext.organizationId;
    const userId = req.user.userId;
    const validatedData = bulkCreateSymbolsSchema.parse(req.body);

    // Verify tender context belongs to this organisation
    const contextCheck = await db.query(`
      SELECT tc.id FROM tender_contexts tc
      WHERE tc.id = $1 AND tc.organisation_id = $2
    `, [contextId, organizationId]);

    if (contextCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tender context not found' });
    }

    const client = await db.pool.connect();
    const results = [];
    const errors = [];

    try {
      await client.query('BEGIN');

      for (const symbol of validatedData.symbols) {
        try {
          const result = await client.query(`
            INSERT INTO tender_symbols (
              tender_context_id, symbol_or_term, interpreted_meaning, category,
              source_file_id, source_location, notes, confidence_status, 
              suggested_by, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (tender_context_id, symbol_or_term) DO NOTHING
            RETURNING *
          `, [
            contextId,
            symbol.symbol_or_term,
            symbol.interpreted_meaning,
            symbol.category || 'term',
            symbol.source_file_id,
            symbol.source_location,
            symbol.notes,
            symbol.confidence_status || 'needs_review',
            symbol.suggested_by || 'ai',
            userId
          ]);

          if (result.rows.length > 0) {
            results.push(result.rows[0]);
          }
        } catch (err) {
          errors.push({ symbol: symbol.symbol_or_term, error: err.message });
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    console.log(`Bulk created ${results.length} symbols for tender ${contextId}`);
    res.status(201).json({
      created: results,
      created_count: results.length,
      skipped_count: validatedData.symbols.length - results.length,
      errors
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error bulk creating tender symbols:', error);
    res.status(500).json({ error: 'Failed to create tender symbols' });
  }
});

// PUT /api/tender/symbols/:id - Update a symbol
router.put('/symbols/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgContext.organizationId;
    const validatedData = updateTenderSymbolSchema.parse(req.body);

    const result = await db.query(`
      UPDATE tender_symbols ts
      SET 
        interpreted_meaning = COALESCE($1, ts.interpreted_meaning),
        category = COALESCE($2, ts.category),
        notes = COALESCE($3, ts.notes),
        confidence_status = COALESCE($4, ts.confidence_status),
        updated_at = NOW()
      FROM tender_contexts tc
      WHERE ts.id = $5 
        AND ts.tender_context_id = tc.id 
        AND tc.organisation_id = $6
      RETURNING ts.*
    `, [
      validatedData.interpreted_meaning,
      validatedData.category,
      validatedData.notes,
      validatedData.confidence_status,
      id,
      organizationId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Symbol not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating tender symbol:', error);
    res.status(500).json({ error: 'Failed to update tender symbol' });
  }
});

// POST /api/tender/symbols/:id/confirm - Confirm a symbol interpretation
router.post('/symbols/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgContext.organizationId;
    const userId = req.user.userId;
    const { interpreted_meaning } = req.body; // Optional override

    const result = await db.query(`
      UPDATE tender_symbols ts
      SET 
        confidence_status = 'confirmed',
        interpreted_meaning = COALESCE($1, ts.interpreted_meaning),
        approved_by_user_id = $2,
        approved_at = NOW(),
        updated_at = NOW()
      FROM tender_contexts tc
      WHERE ts.id = $3 
        AND ts.tender_context_id = tc.id 
        AND tc.organisation_id = $4
      RETURNING ts.*
    `, [interpreted_meaning, userId, id, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Symbol not found' });
    }

    console.log('Symbol confirmed:', id);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error confirming tender symbol:', error);
    res.status(500).json({ error: 'Failed to confirm symbol' });
  }
});

// POST /api/tender/:contextId/symbols/confirm-all - Confirm all symbols
router.post('/:contextId/symbols/confirm-all', async (req, res) => {
  try {
    const { contextId } = req.params;
    const organizationId = req.orgContext.organizationId;
    const userId = req.user.userId;

    const result = await db.query(`
      UPDATE tender_symbols ts
      SET 
        confidence_status = 'confirmed',
        approved_by_user_id = $1,
        approved_at = NOW(),
        updated_at = NOW()
      FROM tender_contexts tc
      WHERE ts.tender_context_id = $2 
        AND ts.tender_context_id = tc.id 
        AND tc.organisation_id = $3
        AND ts.confidence_status != 'confirmed'
      RETURNING ts.id
    `, [userId, contextId, organizationId]);

    console.log(`Confirmed ${result.rows.length} symbols for tender ${contextId}`);
    res.json({
      confirmed_count: result.rows.length,
      message: `${result.rows.length} symbols confirmed`
    });
  } catch (error) {
    console.error('Error confirming all symbols:', error);
    res.status(500).json({ error: 'Failed to confirm symbols' });
  }
});

// DELETE /api/tender/symbols/:id - Delete a symbol
router.delete('/symbols/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgContext.organizationId;

    const result = await db.query(`
      DELETE FROM tender_symbols ts
      USING tender_contexts tc
      WHERE ts.id = $1 
        AND ts.tender_context_id = tc.id 
        AND tc.organisation_id = $2
      RETURNING ts.id
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Symbol not found' });
    }

    res.json({ message: 'Symbol deleted', id });
  } catch (error) {
    console.error('Error deleting tender symbol:', error);
    res.status(500).json({ error: 'Failed to delete symbol' });
  }
});

module.exports = router;
