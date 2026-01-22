const express = require('express');
const router = express.Router();
const multer = require('multer');
const { z } = require('zod');
const db = require('../../shared/db');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/uploads/',
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit (Whisper API limit)
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 
      'audio/webm', 'audio/ogg', 'video/mp4', 'video/webm'
    ];
    
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|m4a|webm|ogg|mp4)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported: MP3, WAV, M4A, WEBM, OGG, MP4'));
    }
  }
});

// Validation schemas
const extractTicketSchema = z.object({
  transcript_id: z.string().uuid().optional(),
  transcript_text: z.string().min(10)
});

// Helper: Generate prompt for ticket extraction
function generateTicketExtractionPrompt(transcript) {
  return `You are analyzing a customer service call or meeting transcript.

TRANSCRIPT:
${transcript}

TASK:
Extract structured ticket information from this conversation.

Return ONLY valid JSON in this exact format:
{
  "title": "Brief descriptive title (max 100 chars)",
  "description": "Detailed description of the issue or request",
  "category": "One of: IT Support, Maintenance, Installation, Consultation, Emergency, Other",
  "priority": "One of: low, medium, high, urgent",
  "customer_name": "Customer or company name if mentioned, else null",
  "contact_email": "Email address if mentioned, else null",
  "contact_phone": "Phone number if mentioned, else null",
  "scheduled_date": "ISO date (YYYY-MM-DD) if specific date mentioned, else null",
  "estimated_duration": "Duration in minutes if discussed, else null",
  "key_requirements": ["requirement 1", "requirement 2"],
  "parts_needed": ["part 1", "part 2"],
  "budget_mentioned": "Amount in GBP if discussed (e.g., 500.00), else null",
  "urgency_indicators": ["reason 1", "reason 2"],
  "follow_up_actions": ["action 1", "action 2"],
  "confidence_score": 0.85
}

IMPORTANT:
- Be conservative - if information isn't clearly stated, use null or empty array
- confidence_score should be 0.0-1.0 based on how clear the information is
- Extract only what is explicitly mentioned
- For dates, use ISO format (YYYY-MM-DD)
- For budget, extract number only (no currency symbols)`;
}

// POST /api/transcribe/audio - Transcribe audio file
router.post('/audio', upload.single('audio'), async (req, res) => {
  let tempFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const audioFile = req.file;
    tempFilePath = audioFile.path;
    const orgId = req.orgContext.organizationId;
    const userId = req.user.userId;

    console.log('[Transcribe] Processing file:', audioFile.originalname, 'Size:', audioFile.size);

    // Validate file size
    if (audioFile.size > 25 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large. Maximum size is 25MB.' });
    }

    // Transcribe with Whisper
    console.log('[Transcribe] Calling Whisper API...');
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment']
    });

    console.log('[Transcribe] Transcription complete. Duration:', transcription.duration, 'seconds');

    // Store transcription in database
    const result = await db.query(
      `INSERT INTO transcripts (
        organisation_id, user_id, filename, duration, text, segments, language
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        orgId,
        userId,
        audioFile.originalname,
        Math.round(transcription.duration),
        transcription.text,
        JSON.stringify(transcription.segments || []),
        transcription.language || 'en'
      ]
    );

    const transcript = result.rows[0];

    // Clean up temp file
    fs.unlinkSync(tempFilePath);

    console.log('[Transcribe] Saved transcript:', transcript.id);

    res.json({
      success: true,
      transcript_id: transcript.id,
      text: transcript.text,
      duration: transcript.duration,
      segments: transcription.segments || [],
      language: transcript.language
    });

  } catch (error) {
    console.error('[Transcribe] Error:', error);

    // Clean up temp file on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error('[Transcribe] Failed to clean up temp file:', cleanupError);
      }
    }

    if (error.code === 'insufficient_quota') {
      return res.status(503).json({ error: 'Transcription service temporarily unavailable' });
    }

    res.status(500).json({ 
      error: 'Failed to transcribe audio', 
      message: error.message 
    });
  }
});

// POST /api/transcribe/extract-ticket - Extract ticket data from transcript
router.post('/extract-ticket', async (req, res) => {
  try {
    const { transcript_id, transcript_text } = extractTicketSchema.parse(req.body);
    const orgId = req.orgContext.organizationId;

    console.log('[Extract Ticket] Processing transcript...');

    // If transcript_id provided, fetch from database
    let transcriptText = transcript_text;
    if (transcript_id) {
      const transcriptResult = await db.query(
        `SELECT text FROM transcripts WHERE id = $1 AND organisation_id = $2`,
        [transcript_id, orgId]
      );

      if (transcriptResult.rows.length === 0) {
        return res.status(404).json({ error: 'Transcript not found' });
      }

      transcriptText = transcriptResult.rows[0].text;
    }

    // Generate prompt
    const prompt = generateTicketExtractionPrompt(transcriptText);

    console.log('[Extract Ticket] Calling OpenAI API...');

    // Call GPT-4 for extraction
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { 
          role: 'system', 
          content: 'You are a ticket extraction assistant. Always respond with valid JSON only, no markdown or explanations.' 
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent extraction
      max_tokens: 1500
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('[Extract Ticket] Raw AI response:', aiResponse);

    let extracted;
    try {
      extracted = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('[Extract Ticket] Failed to parse AI response:', parseError);
      return res.status(500).json({ 
        error: 'Failed to parse AI response', 
        raw_response: aiResponse 
      });
    }

    // Try to match customer if name or email provided
    let matched_contact_id = null;
    let matched_contact = null;

    if (extracted.customer_name || extracted.contact_email) {
      const contactQuery = `
        SELECT id, company_name, name, email, phone
        FROM contacts
        WHERE organisation_id = $1
        AND (
          company_name ILIKE $2
          OR name ILIKE $2
          OR email ILIKE $3
        )
        LIMIT 1
      `;

      const contactResult = await db.query(contactQuery, [
        orgId,
        `%${extracted.customer_name || ''}%`,
        `%${extracted.contact_email || ''}%`
      ]);

      if (contactResult.rows.length > 0) {
        matched_contact = contactResult.rows[0];
        matched_contact_id = matched_contact.id;
        console.log('[Extract Ticket] Matched contact:', matched_contact_id);
      }
    }

    // Store extraction in audit table
    if (transcript_id) {
      await db.query(
        `INSERT INTO ai_extractions (
          organisation_id, transcript_id, model, extraction_type,
          extracted_data, confidence_score
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          orgId,
          transcript_id,
          'gpt-4-turbo',
          'ticket',
          JSON.stringify(extracted),
          extracted.confidence_score || 0.5
        ]
      );
    }

    console.log('[Extract Ticket] Successfully extracted ticket data');

    res.json({
      success: true,
      extracted_data: extracted,
      matched_contact_id,
      matched_contact,
      transcript_id: transcript_id || null,
      ready_for_review: true
    });

  } catch (error) {
    console.error('[Extract Ticket] Error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }

    if (error.code === 'insufficient_quota') {
      return res.status(503).json({ error: 'AI service temporarily unavailable' });
    }

    res.status(500).json({ 
      error: 'Failed to extract ticket data', 
      message: error.message 
    });
  }
});

// GET /api/transcribe/:id - Get transcript by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.orgContext.organizationId;

    const result = await db.query(
      `SELECT t.*, u.email as created_by_email
       FROM transcripts t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = $1 AND t.organisation_id = $2`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('[Transcribe] Get error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transcript', 
      message: error.message 
    });
  }
});

// GET /api/transcribe - List transcripts
router.get('/', async (req, res) => {
  try {
    const orgId = req.orgContext.organizationId;
    const { ticket_id, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT t.*, u.email as created_by_email
      FROM transcripts t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.organisation_id = $1
    `;
    const params = [orgId];
    let paramIndex = 2;

    if (ticket_id) {
      query += ` AND t.ticket_id = $${paramIndex}`;
      params.push(ticket_id);
      paramIndex++;
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    res.json({
      transcripts: result.rows,
      total: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('[Transcribe] List error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transcripts', 
      message: error.message 
    });
  }
});

module.exports = router;
