const express = require('express');
const router = express.Router();
const { z } = require('zod');
const db = require('../../shared/db');
const OpenAI = require('openai');

// Lazy-load OpenAI client to avoid startup errors if API key not set
let openai = null;
function getOpenAIClient() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

// Validation schemas
const generateAIQuoteSchema = z.object({
  ticket_id: z.string().uuid(),
  transcript: z.string().optional(),
  template_id: z.string().uuid().optional()
});

const createRevisionSchema = z.object({
  changes_description: z.string().optional()
});

// Helper: Generate AI prompt for quote
function generateQuotePrompt(ticket, customer, products, transcript = null) {
  const productsText = products.map(p => 
    `- ${p.name}: £${p.client_price} per ${p.unit}${p.description ? ` (${p.description})` : ''}`
  ).join('\n');

  return `You are a professional quote writer for ${customer.sector || 'IT services'}.

TICKET DETAILS:
- Title: ${ticket.title}
- Description: ${ticket.description || 'N/A'}
- Category: ${ticket.category || 'N/A'}
- Priority: ${ticket.priority || 'medium'}
${ticket.scheduled_date ? `- Scheduled: ${ticket.scheduled_date}` : ''}

CUSTOMER CONTEXT:
- Company: ${customer.company_name || customer.name}
- Sector: ${customer.sector || 'General'}
${customer.notes ? `- Notes: ${customer.notes}` : ''}

${transcript ? `MEETING TRANSCRIPT:\n${transcript}\n` : ''}

AVAILABLE PRODUCTS/SERVICES:
${productsText || 'No products available'}

TASK:
Generate a professional quote with:
1. Line items (labour, parts, or fixed fees)
2. Quantities and unit prices in GBP (£)
3. Exclusions (what's NOT included)
4. Terms and conditions
5. Validity period (30 days default)

Be specific, professional, and conservative with pricing. Include realistic labour estimates.

Return ONLY valid JSON in this exact format:
{
  "title": "Quote for [Service Name]",
  "description": "Brief description of the work",
  "line_items": [
    {
      "type": "labour",
      "description": "Detailed description of work",
      "quantity": 2,
      "unit": "hours",
      "unit_price": 75.00
    }
  ],
  "exclusions": ["Item not included", "Another exclusion"],
  "terms_conditions": "Payment terms and conditions",
  "valid_days": 30,
  "notes": "Additional context for the user reviewing this quote"
}`;
}

// POST /api/quotes/generate-ai - Generate quote using AI
router.post('/generate-ai', async (req, res) => {
  try {
    const { ticket_id, transcript, template_id } = generateAIQuoteSchema.parse(req.body);
    const orgId = req.orgContext.organizationId;

    console.log('[AI Quote] Generating quote for ticket:', ticket_id);

    // 1. Fetch ticket details
    const ticketResult = await db.query(
      `SELECT t.*, c.company_name, c.name as contact_name, c.sector, c.notes as customer_notes
       FROM tickets t
       LEFT JOIN contacts c ON t.contact_id = c.id
       WHERE t.id = $1 AND t.organisation_id = $2`,
      [ticket_id, orgId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];
    const customer = {
      company_name: ticket.company_name,
      name: ticket.contact_name,
      sector: ticket.sector,
      notes: ticket.customer_notes
    };

    // 2. Fetch products/services catalog
    const productsResult = await db.query(
      `SELECT name, description, client_price, unit, type
       FROM products
       WHERE organisation_id = $1 AND is_active = true
       ORDER BY name
       LIMIT 50`,
      [orgId]
    );

    const products = productsResult.rows;

    // 3. If template_id provided, fetch template
    let templateContext = null;
    if (template_id) {
      const templateResult = await db.query(
        `SELECT * FROM quote_templates WHERE id = $1 AND organisation_id = $2`,
        [template_id, orgId]
      );
      if (templateResult.rows.length > 0) {
        templateContext = templateResult.rows[0];
      }
    }

    // 4. Generate prompt
    const prompt = generateQuotePrompt(ticket, customer, products, transcript);

    console.log('[AI Quote] Calling OpenAI API...');

    // 5. Call OpenAI API
    const openaiClient = getOpenAIClient();
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { 
          role: 'system', 
          content: 'You are a professional quote writer. Always respond with valid JSON only, no markdown or explanations.' 
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('[AI Quote] Raw AI response:', aiResponse);

    let draft;
    try {
      draft = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('[AI Quote] Failed to parse AI response:', parseError);
      return res.status(500).json({ 
        error: 'Failed to parse AI response', 
        raw_response: aiResponse 
      });
    }

    // 6. Validate and enhance draft
    if (!draft.line_items || !Array.isArray(draft.line_items)) {
      return res.status(500).json({ error: 'AI did not generate valid line items' });
    }

    // Add buy_cost as null (manager can fill in later)
    draft.line_items = draft.line_items.map(item => ({
      ...item,
      buy_cost: null,
      tax_rate: 20.00 // UK VAT default
    }));

    // 7. Return draft with context
    const aiContext = {
      model: 'gpt-4-turbo',
      generated_at: new Date().toISOString(),
      sources: ['ticket', 'customer', 'products'],
      ticket_id,
      template_id: template_id || null,
      transcript_provided: !!transcript,
      tokens_used: completion.usage.total_tokens
    };

    if (transcript) {
      aiContext.sources.push('transcript');
    }

    console.log('[AI Quote] Successfully generated draft');

    res.json({
      success: true,
      draft,
      ai_context: aiContext,
      customer: {
        id: ticket.contact_id,
        name: customer.company_name || customer.name
      }
    });

  } catch (error) {
    console.error('[AI Quote] Error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    
    if (error.code === 'insufficient_quota') {
      return res.status(503).json({ error: 'AI service temporarily unavailable' });
    }

    res.status(500).json({ 
      error: 'Failed to generate quote', 
      message: error.message 
    });
  }
});

// POST /api/quotes/:id/create-revision - Create new version of quote
router.post('/:id/create-revision', async (req, res) => {
  try {
    const { id } = req.params;
    const { changes_description } = createRevisionSchema.parse(req.body);
    const orgId = req.orgContext.organizationId;
    const userId = req.user.userId;

    console.log('[Quote Revision] Creating revision for quote:', id);

    // 1. Get original quote
    const originalResult = await db.query(
      `SELECT * FROM quotes WHERE id = $1 AND organisation_id = $2`,
      [id, orgId]
    );

    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const original = originalResult.rows[0];

    // 2. Get original line items
    const lineItemsResult = await db.query(
      `SELECT * FROM quote_lines WHERE quote_id = $1 ORDER BY sort_order`,
      [id]
    );

    const lineItems = lineItemsResult.rows;

    // 3. Create new quote (revision)
    await db.transaction(async (client) => {
      // Mark original as superseded
      await client.query(
        `UPDATE quotes SET status = 'superseded', updated_at = NOW() WHERE id = $1`,
        [id]
      );

      // Generate new quote number with version suffix
      const newVersion = (original.version || 1) + 1;
      const newQuoteNumber = `${original.quote_number.split('-v')[0]}-v${newVersion}`;

      // Create new quote
      const newQuoteResult = await client.query(
        `INSERT INTO quotes (
          organisation_id, customer_id, quote_number, title, description,
          status, subtotal, discount_amount, discount_percent, tax_amount, total_amount,
          valid_until, terms_conditions, notes, internal_notes,
          version, parent_quote_id, ticket_id, ai_generated, ai_context,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          'draft', $6, $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17, $18, $19,
          $20
        ) RETURNING *`,
        [
          orgId, original.customer_id, newQuoteNumber, original.title, original.description,
          original.subtotal, original.discount_amount, original.discount_percent, 
          original.tax_amount, original.total_amount,
          original.valid_until, original.terms_conditions, 
          changes_description || original.notes, original.internal_notes,
          newVersion, id, original.ticket_id, original.ai_generated, original.ai_context,
          userId
        ]
      );

      const newQuote = newQuoteResult.rows[0];

      // Copy line items
      for (const item of lineItems) {
        await client.query(
          `INSERT INTO quote_lines (
            quote_id, product_id, description, quantity, unit_price,
            discount_percent, tax_rate, line_total, sort_order,
            type, buy_cost, unit
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            newQuote.id, item.product_id, item.description, item.quantity, item.unit_price,
            item.discount_percent, item.tax_rate, item.line_total, item.sort_order,
            item.type, item.buy_cost, item.unit
          ]
        );
      }

      // Return new quote with line items
      const newLineItemsResult = await client.query(
        `SELECT * FROM quote_lines WHERE quote_id = $1 ORDER BY sort_order`,
        [newQuote.id]
      );

      res.json({
        success: true,
        quote: newQuote,
        line_items: newLineItemsResult.rows,
        previous_version_id: id
      });
    });

    console.log('[Quote Revision] Successfully created revision');

  } catch (error) {
    console.error('[Quote Revision] Error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }

    res.status(500).json({ 
      error: 'Failed to create revision', 
      message: error.message 
    });
  }
});

// GET /api/quotes/:id/versions - Get version history
router.get('/:id/versions', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.orgContext.organizationId;

    // Find root quote (original version)
    const rootResult = await db.query(
      `WITH RECURSIVE version_tree AS (
        SELECT id, parent_quote_id, version, quote_number, status, created_at, updated_at
        FROM quotes
        WHERE id = $1 AND organisation_id = $2
        
        UNION ALL
        
        SELECT q.id, q.parent_quote_id, q.version, q.quote_number, q.status, q.created_at, q.updated_at
        FROM quotes q
        INNER JOIN version_tree vt ON q.parent_quote_id = vt.id
      )
      SELECT * FROM version_tree ORDER BY version ASC`,
      [id, orgId]
    );

    if (rootResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    res.json({
      versions: rootResult.rows,
      current_version: rootResult.rows[rootResult.rows.length - 1]
    });

  } catch (error) {
    console.error('[Quote Versions] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch versions', 
      message: error.message 
    });
  }
});

module.exports = router;
