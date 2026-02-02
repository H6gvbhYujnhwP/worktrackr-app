const express = require('express');
const router = express.Router();
const multer = require('multer');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');
const db = require('../../shared/db');
const pdf = require('pdf-parse');

const execAsync = promisify(exec);

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/tender-uploads/',
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for tender documents
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'audio/mpeg', 'audio/wav', 'audio/mp4', 'video/mp4', 'audio/m4a',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg', 'image/png', 'image/tiff'
    ];
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.match(/\.(pdf|mp3|wav|mp4|m4a|docx|doc|jpg|jpeg|png|tiff)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function extractPDFText(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

async function transcribeAudio(filePath) {
  try {
    const { stdout } = await execAsync(`manus-speech-to-text "${filePath}"`);
    return stdout.trim();
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error('Failed to transcribe audio file');
  }
}

// ============================================================================
// AI PROMPT BUILDERS
// ============================================================================

function buildSymbolExtractionPrompt(fileContents, existingSymbols) {
  const systemPrompt = `You are an expert at analyzing tender documents and technical specifications. Your task is to identify ALL symbols, abbreviations, terms, and legends that need interpretation.

IMPORTANT: These interpretations are TENDER-SPECIFIC. The same symbol may mean different things in different tenders.

OUTPUT FORMAT (JSON only, no markdown):
{
  "symbols": [
    {
      "symbol_or_term": "The symbol/abbreviation/term exactly as it appears",
      "interpreted_meaning": "Your best interpretation of what it means in THIS context",
      "category": "symbol|abbreviation|term|legend|note",
      "source_location": "Page/section where found",
      "confidence": "high|medium|low"
    }
  ],
  "document_summary": "Brief summary of what this tender/document is about",
  "key_requirements": ["List of key requirements identified"],
  "scope_of_work": "Description of the overall scope"
}

EXISTING SYMBOLS (already identified, don't repeat unless you have a better interpretation):
${existingSymbols.length > 0 ? existingSymbols.map(s => `- ${s.symbol_or_term}: ${s.interpreted_meaning}`).join('\n') : 'None yet'}

INSTRUCTIONS:
1. Look for drawing symbols, abbreviations, technical terms
2. Identify any legends or keys in the documents
3. Note measurement units and their context
4. Flag any ambiguous terms that need human clarification
5. For low confidence items, explain why in the interpretation`;

  const userMessage = `Analyze the following tender documents and extract all symbols, abbreviations, and terms that need interpretation:\n\n${fileContents.join('\n\n---\n\n')}`;

  return { systemPrompt, userMessage };
}

function buildEstimateGenerationPrompt(fileContents, confirmedSymbols, pricing, context) {
  const systemPrompt = `You are an expert estimator for a service business. Your task is to analyze tender documents and generate a detailed INTERNAL ESTIMATE with all costs, labour hours, and materials.

This is the PRIVATE THINKING SPACE - include all your workings, assumptions, and risk factors. This will NOT be shown to the customer.

PRICING CONFIGURATION:
- Standard Day Rate: £${pricing.standard_day_rate} (Hourly: £${pricing.standard_hourly_rate})
- Senior Day Rate: £${pricing.senior_day_rate} (Hourly: £${pricing.senior_hourly_rate})
- Junior Day Rate: £${pricing.junior_day_rate} (Hourly: £${pricing.junior_hourly_rate})
- Default Markup on Parts: ${pricing.default_markup_percent}%
- Target Margin: ${pricing.default_margin_percent}%

CONFIRMED SYMBOL INTERPRETATIONS (use these exact meanings):
${confirmedSymbols.map(s => `- ${s.symbol_or_term}: ${s.interpreted_meaning}`).join('\n')}

OUTPUT FORMAT (JSON only, no markdown):
{
  "summary": "Overall summary of the estimate",
  "assumptions": "Key assumptions made",
  "risks": "Identified risks and contingencies",
  "exclusions": "What is NOT included",
  "items": [
    {
      "description": "Detailed description of work item",
      "category": "labour|materials|equipment|subcontract|overhead|other",
      "quantity": 1,
      "unit": "hours|days|each|sqm|linear_m|kg|etc",
      "unit_cost": 85.00,
      "total_cost": 85.00,
      "hours": 8 (for labour items),
      "hourly_rate": 85.00 (for labour items),
      "section": "Section name for grouping",
      "calculation_notes": "How you calculated this",
      "confidence": "high|medium|low"
    }
  ],
  "totals": {
    "labour_hours": 0,
    "labour_cost": 0,
    "materials_cost": 0,
    "other_costs": 0,
    "subtotal": 0,
    "recommended_margin_percent": 25,
    "recommended_sell_price": 0
  }
}

INSTRUCTIONS:
1. Break down ALL work into detailed line items
2. Include labour, materials, equipment, subcontractors
3. Add contingency for risks
4. Group items into logical sections
5. Show your calculations in calculation_notes
6. Flag low confidence items that need human review
7. Be thorough - this is internal, not customer-facing`;

  let userMessage = `Generate a detailed internal estimate for the following tender:\n\n`;
  
  if (context.tender_name) {
    userMessage += `TENDER: ${context.tender_name}\n`;
  }
  if (context.client_name) {
    userMessage += `CLIENT: ${context.client_name}\n`;
  }
  
  userMessage += `\nDOCUMENT CONTENTS:\n${fileContents.join('\n\n---\n\n')}`;

  return { systemPrompt, userMessage };
}

// ============================================================================
// ROUTES
// ============================================================================

// POST /api/quotes/tender/analyze - Analyze tender documents and extract symbols
router.post('/tender/analyze', upload.array('files', 10), async (req, res) => {
  const uploadedFiles = [];
  
  try {
    const { organizationId } = req.orgContext;
    const userId = req.user.userId;
    const { quote_id, tender_name, client_name, tender_reference } = req.body;

    if (!quote_id) {
      return res.status(400).json({ error: 'quote_id is required' });
    }

    // Verify quote belongs to this organisation
    const quoteCheck = await db.query(
      'SELECT id FROM quotes WHERE id = $1 AND organisation_id = $2',
      [quote_id, organizationId]
    );
    if (quoteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Create or get tender context
    let tenderContextId;
    const existingContext = await db.query(
      'SELECT id FROM tender_contexts WHERE quote_id = $1',
      [quote_id]
    );

    if (existingContext.rows.length > 0) {
      tenderContextId = existingContext.rows[0].id;
      // Update context info
      await db.query(`
        UPDATE tender_contexts 
        SET name = COALESCE($1, name), 
            client_name = COALESCE($2, client_name),
            tender_reference = COALESCE($3, tender_reference),
            updated_at = NOW()
        WHERE id = $4
      `, [tender_name, client_name, tender_reference, tenderContextId]);
    } else {
      const newContext = await db.query(`
        INSERT INTO tender_contexts (organisation_id, quote_id, name, client_name, tender_reference, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [organizationId, quote_id, tender_name, client_name, tender_reference, userId]);
      tenderContextId = newContext.rows[0].id;
    }

    // Process uploaded files
    const fileContents = [];
    const fileRecords = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        uploadedFiles.push(file.path);
        let extractedText = '';
        
        if (file.mimetype === 'application/pdf') {
          extractedText = await extractPDFText(file.path);
          fileContents.push(`[${file.originalname}]\n${extractedText}`);
        } else if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/mp4') {
          extractedText = await transcribeAudio(file.path);
          fileContents.push(`[${file.originalname} - Transcription]\n${extractedText}`);
        }

        // Save file record
        const fileRecord = await db.query(`
          INSERT INTO tender_files (tender_context_id, file_name, file_path, file_size, mime_type, ai_extracted_text, processing_status, uploaded_by)
          VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7)
          RETURNING id
        `, [tenderContextId, file.originalname, file.path, file.size, file.mimetype, extractedText, userId]);
        
        fileRecords.push({ id: fileRecord.rows[0].id, name: file.originalname });
      }
    }

    if (fileContents.length === 0) {
      return res.status(400).json({ error: 'No processable files uploaded' });
    }

    // Get existing symbols
    const existingSymbols = await db.query(
      'SELECT symbol_or_term, interpreted_meaning FROM tender_symbols WHERE tender_context_id = $1',
      [tenderContextId]
    );

    // Build AI prompt for symbol extraction
    const { systemPrompt, userMessage } = buildSymbolExtractionPrompt(fileContents, existingSymbols.rows);

    // Call OpenAI API
    console.log('Calling OpenAI API for tender analysis...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('AI Tender Analysis Response received');

    // Parse AI response
    let analysisData;
    try {
      const cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('AI generated invalid response format');
    }

    // Save extracted symbols
    const savedSymbols = [];
    if (analysisData.symbols && analysisData.symbols.length > 0) {
      for (const symbol of analysisData.symbols) {
        try {
          const result = await db.query(`
            INSERT INTO tender_symbols (
              tender_context_id, symbol_or_term, interpreted_meaning, category,
              confidence_status, suggested_by, created_by
            ) VALUES ($1, $2, $3, $4, $5, 'ai', $6)
            ON CONFLICT (tender_context_id, symbol_or_term) DO UPDATE
            SET interpreted_meaning = EXCLUDED.interpreted_meaning,
                updated_at = NOW()
            RETURNING *
          `, [
            tenderContextId,
            symbol.symbol_or_term,
            symbol.interpreted_meaning,
            symbol.category || 'term',
            symbol.confidence === 'high' ? 'needs_review' : 'unknown',
            userId
          ]);
          savedSymbols.push(result.rows[0]);
        } catch (err) {
          console.error('Error saving symbol:', err);
        }
      }
    }

    // Clean up uploaded files
    for (const filePath of uploadedFiles) {
      await fs.unlink(filePath).catch(err => console.error('Error deleting file:', err));
    }

    res.json({
      tender_context_id: tenderContextId,
      files_processed: fileRecords,
      symbols_extracted: savedSymbols.length,
      symbols: savedSymbols,
      document_summary: analysisData.document_summary,
      key_requirements: analysisData.key_requirements,
      scope_of_work: analysisData.scope_of_work,
      needs_review_count: savedSymbols.filter(s => s.confidence_status !== 'confirmed').length
    });

  } catch (error) {
    console.error('Error analyzing tender:', error);
    
    for (const filePath of uploadedFiles) {
      await fs.unlink(filePath).catch(err => console.error('Error deleting file:', err));
    }
    
    res.status(500).json({ 
      error: 'Failed to analyze tender', 
      message: error.message 
    });
  }
});

// POST /api/quotes/tender/generate-estimate - Generate internal estimate from confirmed symbols
router.post('/tender/generate-estimate', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const userId = req.user.userId;
    const { quote_id, tender_context_id } = req.body;

    if (!quote_id || !tender_context_id) {
      return res.status(400).json({ error: 'quote_id and tender_context_id are required' });
    }

    // Verify tender context belongs to this organisation
    const contextCheck = await db.query(`
      SELECT tc.*, q.contact_id
      FROM tender_contexts tc
      JOIN quotes q ON tc.quote_id = q.id
      WHERE tc.id = $1 AND tc.organisation_id = $2
    `, [tender_context_id, organizationId]);

    if (contextCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tender context not found' });
    }

    const tenderContext = contextCheck.rows[0];

    // Check for unconfirmed symbols
    const unconfirmedCheck = await db.query(`
      SELECT COUNT(*) as count FROM tender_symbols 
      WHERE tender_context_id = $1 AND confidence_status != 'confirmed'
    `, [tender_context_id]);

    if (parseInt(unconfirmedCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Please confirm all symbols before generating estimate',
        unconfirmed_count: parseInt(unconfirmedCheck.rows[0].count)
      });
    }

    // Get confirmed symbols
    const symbolsResult = await db.query(
      'SELECT symbol_or_term, interpreted_meaning FROM tender_symbols WHERE tender_context_id = $1',
      [tender_context_id]
    );

    // Get file contents
    const filesResult = await db.query(
      'SELECT file_name, ai_extracted_text FROM tender_files WHERE tender_context_id = $1',
      [tender_context_id]
    );
    const fileContents = filesResult.rows.map(f => `[${f.file_name}]\n${f.ai_extracted_text}`);

    // Get pricing configuration
    const pricingResult = await db.query(
      'SELECT * FROM organisation_pricing WHERE organisation_id = $1',
      [organizationId]
    );
    const pricing = pricingResult.rows[0] || {
      standard_day_rate: 680,
      senior_day_rate: 850,
      junior_day_rate: 510,
      standard_hourly_rate: 85,
      senior_hourly_rate: 106.25,
      junior_hourly_rate: 63.75,
      default_markup_percent: 30,
      default_margin_percent: 25
    };

    // Build AI prompt for estimate generation
    const { systemPrompt, userMessage } = buildEstimateGenerationPrompt(
      fileContents,
      symbolsResult.rows,
      pricing,
      { tender_name: tenderContext.name, client_name: tenderContext.client_name }
    );

    // Call OpenAI API
    console.log('Calling OpenAI API for estimate generation...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.4,
      max_tokens: 6000
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('AI Estimate Response received');

    // Parse AI response
    let estimateData;
    try {
      const cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      estimateData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('AI generated invalid response format');
    }

    // Create internal estimate
    const estimateResult = await db.query(`
      INSERT INTO internal_estimates (
        organisation_id, quote_id, tender_context_id, summary, assumptions,
        risks, exclusions, target_margin_percent, created_by, last_edited_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
      ON CONFLICT (quote_id) DO UPDATE
      SET summary = EXCLUDED.summary,
          assumptions = EXCLUDED.assumptions,
          risks = EXCLUDED.risks,
          exclusions = EXCLUDED.exclusions,
          target_margin_percent = EXCLUDED.target_margin_percent,
          last_edited_by = EXCLUDED.last_edited_by,
          status = 'in_progress',
          updated_at = NOW()
      RETURNING *
    `, [
      organizationId,
      quote_id,
      tender_context_id,
      estimateData.summary,
      estimateData.assumptions,
      estimateData.risks,
      estimateData.exclusions,
      estimateData.totals?.recommended_margin_percent || pricing.default_margin_percent,
      userId
    ]);

    const internalEstimateId = estimateResult.rows[0].id;

    // Clear existing items and add new ones
    await db.query('DELETE FROM estimate_items WHERE internal_estimate_id = $1', [internalEstimateId]);

    const savedItems = [];
    if (estimateData.items && estimateData.items.length > 0) {
      for (const item of estimateData.items) {
        const itemResult = await db.query(`
          INSERT INTO estimate_items (
            internal_estimate_id, description, category, quantity, unit, unit_cost,
            total_cost, hours, hourly_rate, source, confidence_status,
            calculation_notes, section, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ai_suggested', $10, $11, $12, $13)
          RETURNING *
        `, [
          internalEstimateId,
          item.description,
          item.category || 'other',
          item.quantity,
          item.unit,
          item.unit_cost,
          item.total_cost,
          item.hours,
          item.hourly_rate,
          item.confidence === 'high' ? 'needs_review' : 'unknown',
          item.calculation_notes,
          item.section,
          userId
        ]);
        savedItems.push(itemResult.rows[0]);
      }
    }

    res.json({
      internal_estimate_id: internalEstimateId,
      estimate: estimateResult.rows[0],
      items_created: savedItems.length,
      items: savedItems,
      totals: estimateData.totals,
      needs_review_count: savedItems.filter(i => i.confidence_status !== 'confirmed').length
    });

  } catch (error) {
    console.error('Error generating estimate:', error);
    res.status(500).json({ 
      error: 'Failed to generate estimate', 
      message: error.message 
    });
  }
});

// POST /api/quotes/tender/transfer-to-quote - Transfer confirmed estimate items to quote lines
router.post('/tender/transfer-to-quote', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const userId = req.user.userId;
    const { quote_id, internal_estimate_id } = req.body;

    if (!quote_id || !internal_estimate_id) {
      return res.status(400).json({ error: 'quote_id and internal_estimate_id are required' });
    }

    // Verify estimate belongs to this organisation and quote
    const estimateCheck = await db.query(`
      SELECT ie.* FROM internal_estimates ie
      WHERE ie.id = $1 AND ie.quote_id = $2 AND ie.organisation_id = $3
    `, [internal_estimate_id, quote_id, organizationId]);

    if (estimateCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Internal estimate not found' });
    }

    // Check for unconfirmed items
    const unconfirmedCheck = await db.query(`
      SELECT COUNT(*) as count FROM estimate_items 
      WHERE internal_estimate_id = $1 AND confidence_status != 'confirmed'
    `, [internal_estimate_id]);

    if (parseInt(unconfirmedCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Please confirm all estimate items before transferring to quote',
        unconfirmed_count: parseInt(unconfirmedCheck.rows[0].count)
      });
    }

    // Get confirmed estimate items
    const itemsResult = await db.query(`
      SELECT * FROM estimate_items 
      WHERE internal_estimate_id = $1 AND confidence_status = 'confirmed'
      ORDER BY section NULLS LAST, sort_order
    `, [internal_estimate_id]);

    // Create quote sections and lines
    const sectionMap = {};
    const createdLines = [];

    for (const item of itemsResult.rows) {
      const sectionName = item.section || 'General';
      
      // Create section if needed
      if (!sectionMap[sectionName]) {
        const sectionResult = await db.query(`
          INSERT INTO quote_sections (quote_id, name, source_section, sort_order)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
          RETURNING id
        `, [quote_id, sectionName, item.section, Object.keys(sectionMap).length]);
        
        if (sectionResult.rows.length > 0) {
          sectionMap[sectionName] = sectionResult.rows[0].id;
        } else {
          // Section already exists, get its ID
          const existingSection = await db.query(
            'SELECT id FROM quote_sections WHERE quote_id = $1 AND name = $2',
            [quote_id, sectionName]
          );
          sectionMap[sectionName] = existingSection.rows[0]?.id;
        }
      }

      // Create quote line
      const lineResult = await db.query(`
        INSERT INTO quote_lines (
          quote_id, section_id, description, quantity, unit, rate,
          source, origin_type, origin_id, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, 'from_estimate', 'estimate_item', $7, $8)
        RETURNING *
      `, [
        quote_id,
        sectionMap[sectionName],
        item.description,
        item.quantity || item.hours || 1,
        item.unit || 'each',
        item.unit_cost || item.hourly_rate || item.total_cost,
        item.id,
        item.sort_order
      ]);

      createdLines.push(lineResult.rows[0]);
    }

    // Update estimate status
    await db.query(`
      UPDATE internal_estimates 
      SET status = 'transferred', updated_at = NOW()
      WHERE id = $1
    `, [internal_estimate_id]);

    // Recalculate quote totals
    await db.query(`
      UPDATE quotes 
      SET subtotal = (
        SELECT COALESCE(SUM(quantity * rate), 0) FROM quote_lines WHERE quote_id = $1
      ),
      updated_at = NOW()
      WHERE id = $1
    `, [quote_id]);

    res.json({
      success: true,
      sections_created: Object.keys(sectionMap).length,
      lines_created: createdLines.length,
      lines: createdLines
    });

  } catch (error) {
    console.error('Error transferring estimate to quote:', error);
    res.status(500).json({ 
      error: 'Failed to transfer estimate to quote', 
      message: error.message 
    });
  }
});

module.exports = router;
