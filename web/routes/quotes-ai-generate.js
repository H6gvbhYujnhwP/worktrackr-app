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
  dest: '/tmp/quote-uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'audio/mpeg', 'audio/wav', 'audio/mp4', 'video/mp4'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(pdf|mp3|wav|mp4)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and audio files (MP3, WAV, MP4) are allowed'));
    }
  }
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Extract text from PDF
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

// Transcribe audio file
async function transcribeAudio(filePath) {
  try {
    const { stdout } = await execAsync(`manus-speech-to-text "${filePath}"`);
    return stdout.trim();
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error('Failed to transcribe audio file');
  }
}

// Fetch context data
async function fetchContext(organizationId, contextSources, ticketId, customerId) {
  const context = {
    ticket: null,
    customer: null,
    similarQuotes: []
  };

  // Fetch ticket information
  if (contextSources.ticket_description && ticketId) {
    const ticketQuery = `
      SELECT 
        t.title,
        t.description,
        t.priority,
        t.status,
        array_agg(
          json_build_object(
            'comment', tu.comment,
            'created_at', tu.created_at
          ) ORDER BY tu.created_at DESC
        ) FILTER (WHERE tu.comment IS NOT NULL) as updates
      FROM tickets t
      LEFT JOIN ticket_updates tu ON tu.ticket_id = t.id
      WHERE t.id = $1 AND t.organisation_id = $2
      GROUP BY t.id
    `;
    const ticketResult = await db.query(ticketQuery, [ticketId, organizationId]);
    if (ticketResult.rows.length > 0) {
      context.ticket = ticketResult.rows[0];
    }
  }

  // Fetch customer information
  if (contextSources.customer_info && customerId) {
    const customerQuery = `
      SELECT name, sector, email, phone, addresses
      FROM contacts
      WHERE id = $1 AND organisation_id = $2
    `;
    const customerResult = await db.query(customerQuery, [customerId, organizationId]);
    if (customerResult.rows.length > 0) {
      context.customer = customerResult.rows[0];
    }
  }

  // Fetch similar quotes
  if (contextSources.similar_quotes && customerId) {
    const similarQuotesQuery = `
      SELECT 
        q.title,
        q.description,
        q.total_amount,
        json_agg(
          json_build_object(
            'description', ql.description,
            'quantity', ql.quantity,
            'unit_price', ql.unit_price,
            'item_type', ql.item_type
          )
        ) as line_items
      FROM quotes q
      LEFT JOIN quote_lines ql ON ql.quote_id = q.id
      WHERE q.customer_id = $1 AND q.organisation_id = $2 AND q.status = 'accepted'
      GROUP BY q.id
      ORDER BY q.created_at DESC
      LIMIT 3
    `;
    const similarResult = await db.query(similarQuotesQuery, [customerId, organizationId]);
    context.similarQuotes = similarResult.rows;
  }

  return context;
}

// Generate AI prompt
function buildAIPrompt(userPrompt, fileContents, context, pricing) {
  let systemPrompt = `You are an expert quote generator for an IT services company. Your task is to analyze the provided information and generate a detailed, accurate quote with line items.

PRICING CONFIGURATION:
- Standard Day Rate: £${pricing.standard_day_rate} (Hourly: £${pricing.standard_hourly_rate})
- Senior Day Rate: £${pricing.senior_day_rate} (Hourly: £${pricing.senior_hourly_rate})
- Junior Day Rate: £${pricing.junior_day_rate} (Hourly: £${pricing.junior_hourly_rate})
- Default Markup on Parts: ${pricing.default_markup_percent}%
- Target Margin: ${pricing.default_margin_percent}%

LINE ITEM TYPES:
1. labour - Time-based work (use hours and hourly_rate)
2. parts - Products and equipment (apply markup)
3. fixed_fee - Flat-rate services
4. recurring - Ongoing monthly or annual costs

OUTPUT FORMAT (JSON only, no markdown):
{
  "title": "Quote title",
  "description": "Brief description of the work",
  "line_items": [
    {
      "description": "Item description",
      "quantity": 1,
      "unit_price": 100.00,
      "item_type": "labour|parts|fixed_fee|recurring",
      "hours": 8 (only for labour),
      "hourly_rate": 85.00 (only for labour),
      "recurrence": "monthly|annual" (only for recurring),
      "tax_rate": 20
    }
  ],
  "terms_conditions": "Standard terms",
  "notes": "Any additional notes for the customer"
}

INSTRUCTIONS:
- Use the pricing configuration above for all calculations
- For labour items, specify hours and hourly_rate
- For parts, apply the markup percentage to cost prices
- Be specific and detailed in descriptions
- Include all necessary items to complete the work
- Group similar items together
- Use realistic quantities and prices`;

  let userMessage = `USER REQUEST:\n${userPrompt}\n\n`;

  if (fileContents.length > 0) {
    userMessage += `UPLOADED FILES CONTENT:\n${fileContents.join('\n\n---\n\n')}\n\n`;
  }

  if (context.ticket) {
    userMessage += `TICKET INFORMATION:\nTitle: ${context.ticket.title}\nDescription: ${context.ticket.description}\nPriority: ${context.ticket.priority}\n\n`;
    if (context.ticket.updates && context.ticket.updates.length > 0) {
      userMessage += `Recent Updates:\n${context.ticket.updates.slice(0, 3).map(u => `- ${u.comment}`).join('\n')}\n\n`;
    }
  }

  if (context.customer) {
    userMessage += `CUSTOMER INFORMATION:\nName: ${context.customer.name}\nSector: ${context.customer.sector || 'Not specified'}\n\n`;
  }

  if (context.similarQuotes.length > 0) {
    userMessage += `SIMILAR PAST QUOTES:\n`;
    context.similarQuotes.forEach((quote, i) => {
      userMessage += `${i + 1}. ${quote.title} (£${quote.total_amount})\n`;
      if (quote.line_items) {
        quote.line_items.slice(0, 3).forEach(item => {
          userMessage += `   - ${item.description} (${item.item_type})\n`;
        });
      }
    });
    userMessage += '\n';
  }

  userMessage += `Generate a detailed quote based on the above information. Return ONLY valid JSON, no markdown formatting.`;

  return { systemPrompt, userMessage };
}

// POST /api/quotes/ai-generate-draft - Generate quote draft using AI
router.post('/ai-generate-draft', upload.array('files', 5), async (req, res) => {
  const uploadedFiles = [];
  
  try {
    const { organizationId } = req.orgContext;
    const { prompt, context_sources, ticket_id, customer_id } = req.body;

    // Parse context sources
    const contextSources = JSON.parse(context_sources || '{}');

    // Fetch pricing configuration
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

    // Process uploaded files
    const fileContents = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        uploadedFiles.push(file.path);
        
        if (file.mimetype === 'application/pdf') {
          const text = await extractPDFText(file.path);
          fileContents.push(`PDF Content:\n${text}`);
        } else if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/mp4') {
          const transcription = await transcribeAudio(file.path);
          fileContents.push(`Audio Transcription:\n${transcription}`);
        }
      }
    }

    // Fetch context
    const context = await fetchContext(organizationId, contextSources, ticket_id, customer_id);

    // Build AI prompt
    const { systemPrompt, userMessage } = buildAIPrompt(prompt, fileContents, context, pricing);

    // Call OpenAI API
    console.log('Calling OpenAI API for quote generation...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('AI Response:', aiResponse);

    // Parse AI response
    let quoteData;
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      quoteData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('AI generated invalid response format');
    }

    // Add metadata
    quoteData.ai_prompt = prompt;
    quoteData.ai_context_used = {
      ticket: !!context.ticket,
      customer: !!context.customer,
      similar_quotes: context.similarQuotes.length,
      files_uploaded: req.files?.length || 0
    };
    quoteData.created_via = 'ai';

    // Clean up uploaded files
    for (const filePath of uploadedFiles) {
      await fs.unlink(filePath).catch(err => console.error('Error deleting file:', err));
    }

    res.json(quoteData);
  } catch (error) {
    console.error('Error generating AI quote draft:', error);
    
    // Clean up uploaded files on error
    for (const filePath of uploadedFiles) {
      await fs.unlink(filePath).catch(err => console.error('Error deleting file:', err));
    }
    
    res.status(500).json({ 
      error: 'Failed to generate quote draft', 
      message: error.message 
    });
  }
});

module.exports = router;
