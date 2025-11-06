const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');

// Helper: Generate unique inbound identifier from email
function generateInboundIdentifier(email) {
  const [localPart, domain] = email.split('@');
  const sanitized = domain.replace(/\./g, '-');
  const random = crypto.randomBytes(4).toString('hex');
  return `${sanitized}-${random}`;
}

// Helper: Generate ticket number
async function generateTicketNumber(organisationId) {
  const year = new Date().getFullYear();
  const result = await db.query(
    'SELECT COUNT(*) as count FROM tickets WHERE organisation_id = $1 AND EXTRACT(YEAR FROM created_at) = $2',
    [organisationId, year]
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `TKT-${year}-${String(count).padStart(4, '0')}`;
}

// Helper: Generate quote number
async function generateQuoteNumber(organisationId) {
  const year = new Date().getFullYear();
  const result = await db.query(
    'SELECT COUNT(*) as count FROM quotes WHERE organisation_id = $1 AND EXTRACT(YEAR FROM created_at) = $2',
    [organisationId, year]
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `QT-${year}-${String(count).padStart(4, '0')}`;
}

// Helper: Classify email with AI (placeholder - will implement with OpenAI)
async function classifyEmailWithAI(subject, body) {
  // For now, simple keyword-based classification
  const text = `${subject} ${body}`.toLowerCase();
  
  let intent = 'inquiry';
  let confidence = 0.5;
  let urgency = 'medium';
  
  // Detect ticket keywords
  if (text.includes('urgent') || text.includes('emergency') || text.includes('broken') || 
      text.includes('not working') || text.includes('help') || text.includes('problem')) {
    intent = 'ticket';
    confidence = 0.85;
    urgency = text.includes('urgent') || text.includes('emergency') ? 'urgent' : 'high';
  }
  
  // Detect quote keywords
  if (text.includes('quote') || text.includes('estimate') || text.includes('price') || 
      text.includes('cost') || text.includes('how much')) {
    intent = 'quote';
    confidence = 0.85;
    urgency = 'medium';
  }
  
  return {
    intent,
    confidence,
    urgency,
    entities: {
      customer_name: null,
      company: null,
      services: [],
      budget: null
    },
    reasoning: `Keyword-based classification (AI integration pending)`
  };
}

// Helper: Create ticket from email
async function createTicket(organisationId, aiResult, fromEmail, subject, body) {
  const ticketNumber = await generateTicketNumber(organisationId);
  
  const result = await db.query(
    `INSERT INTO tickets (
      organisation_id, ticket_number, title, description, status, priority, source, created_at
    ) VALUES ($1, $2, $3, $4, 'open', $5, 'email', NOW()) RETURNING *`,
    [organisationId, ticketNumber, subject, body, aiResult.urgency]
  );
  
  return result.rows[0];
}

// Helper: Create quote from email
async function createQuote(organisationId, aiResult, fromEmail, subject, body) {
  const quoteNumber = await generateQuoteNumber(organisationId);
  
  const result = await db.query(
    `INSERT INTO quotes (
      organisation_id, quote_number, title, status, internal_notes, created_at
    ) VALUES ($1, $2, $3, 'draft', $4, NOW()) RETURNING *`,
    [organisationId, quoteNumber, subject, `Auto-created from email (${fromEmail}):\n\n${body}`]
  );
  
  return result.rows[0];
}

// ============================================================================
// PUBLIC WEBHOOK ENDPOINT (Called by Resend)
// ============================================================================

router.post('/webhook', async (req, res) => {
  try {
    console.log('📧 Email intake webhook received:', {
      from: req.body.from,
      to: req.body.to,
      subject: req.body.subject
    });

    // Extract email data
    const { from, to, subject, text, html } = req.body;
    const body = text || html || '';

    // For testing, we'll use a simple mapping: extract domain from 'to' address
    // In production, Resend will include an inbound_identifier
    const toDomain = to.split('@')[1];
    
    // Find organization by email domain or inbound identifier
    const channelResult = await db.query(
      `SELECT * FROM email_intake_channels 
       WHERE (email_address = $1 OR inbound_identifier LIKE $2) 
       AND is_active = TRUE`,
      [to, `%${toDomain}%`]
    );

    if (channelResult.rows.length === 0) {
      console.log('❌ No active email channel found for:', to);
      return res.status(404).json({ error: 'Email channel not found or not active' });
    }

    const channel = channelResult.rows[0];
    console.log('✅ Found channel:', channel.email_address, 'for org:', channel.organisation_id);

    // Process with AI
    const startTime = Date.now();
    const aiResult = await classifyEmailWithAI(subject, body);
    const processingTime = Date.now() - startTime;

    console.log('🤖 AI Classification:', {
      intent: aiResult.intent,
      confidence: aiResult.confidence,
      urgency: aiResult.urgency
    });

    // Determine action
    let action, workItemId, workItemType, reference;
    let requiresReview = false;

    if (aiResult.confidence >= channel.confidence_threshold && !channel.require_human_review) {
      // Auto-create based on intent
      if (aiResult.intent === 'ticket') {
        const ticket = await createTicket(channel.organisation_id, aiResult, from, subject, body);
        action = 'created_ticket';
        workItemId = ticket.id;
        workItemType = 'ticket';
        reference = ticket.ticket_number;
        console.log('✅ Created ticket:', reference);
      } else if (aiResult.intent === 'quote') {
        const quote = await createQuote(channel.organisation_id, aiResult, from, subject, body);
        action = 'created_quote';
        workItemId = quote.id;
        workItemType = 'quote';
        reference = quote.quote_number;
        console.log('✅ Created quote:', reference);
      } else {
        action = 'flagged_for_review';
        requiresReview = true;
        console.log('⚠️  Flagged for review (intent: inquiry)');
      }
    } else {
      // Flag for review
      action = 'flagged_for_review';
      requiresReview = true;
      console.log('⚠️  Flagged for review (low confidence or review required)');
    }

    // Log the email intake
    await db.query(
      `INSERT INTO email_intake_logs (
        organisation_id, channel_id, from_address, to_address, subject, body_text,
        ai_intent, ai_confidence, ai_extracted_entities, ai_model, ai_processing_time_ms,
        action_taken, work_item_id, work_item_type, requires_review, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())`,
      [
        channel.organisation_id, channel.id, from, to, subject, body,
        aiResult.intent, aiResult.confidence, JSON.stringify(aiResult.entities),
        'keyword-based', processingTime, action, workItemId, workItemType, requiresReview
      ]
    );

    // Update channel last_email_received_at
    await db.query(
      'UPDATE email_intake_channels SET last_email_received_at = NOW() WHERE id = $1',
      [channel.id]
    );

    console.log('✅ Email intake complete');

    res.json({
      success: true,
      action,
      reference: reference || null,
      requires_review: requiresReview
    });

  } catch (error) {
    console.error('❌ Email intake error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ============================================================================
// AUTHENTICATED ENDPOINTS (Settings & Management)
// ============================================================================

// Get email intake settings
router.get('/settings', async (req, res) => {
  try {
    const orgId = req.orgContext.organisationId;

    const result = await db.query(
      'SELECT * FROM email_intake_channels WHERE organisation_id = $1',
      [orgId]
    );

    if (result.rows.length === 0) {
      return res.json({ channel: null });
    }

    const channel = result.rows[0];

    // Generate DNS records
    const dnsRecords = {
      mx: {
        type: 'MX',
        host: '@',
        value: 'inbound-smtp.resend.com',
        priority: 10,
        ttl: 3600
      },
      spf: {
        type: 'TXT',
        host: '@',
        value: 'v=spf1 include:resend.com ~all',
        ttl: 3600
      },
      dkim1: {
        type: 'TXT',
        host: 'resend._domainkey',
        value: channel.dkim_public_key_1 || 'Pending setup',
        ttl: 3600
      },
      dkim2: {
        type: 'TXT',
        host: 'resend2._domainkey',
        value: channel.dkim_public_key_2 || 'Pending setup',
        ttl: 3600
      }
    };

    res.json({
      channel: {
        id: channel.id,
        email_address: channel.email_address,
        inbound_identifier: channel.inbound_identifier,
        mx_verified: channel.mx_verified,
        spf_verified: channel.spf_verified,
        dkim_verified: channel.dkim_verified,
        is_active: channel.is_active,
        auto_create_mode: channel.auto_create_mode,
        require_human_review: channel.require_human_review,
        confidence_threshold: parseFloat(channel.confidence_threshold),
        last_email_received_at: channel.last_email_received_at,
        verified_at: channel.verified_at
      },
      dns_records: dnsRecords
    });

  } catch (error) {
    console.error('Error fetching email intake settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update email intake settings
router.post('/settings', async (req, res) => {
  try {
    const orgId = req.orgContext.organisationId;
    const { email_address, auto_create_mode, require_human_review, confidence_threshold } = req.body;

    if (!email_address) {
      return res.status(400).json({ error: 'email_address is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email_address)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    // Check if channel already exists
    const existing = await db.query(
      'SELECT * FROM email_intake_channels WHERE organisation_id = $1',
      [orgId]
    );

    let channel;

    if (existing.rows.length > 0) {
      // Update existing
      const result = await db.query(
        `UPDATE email_intake_channels 
         SET email_address = $1, auto_create_mode = $2, require_human_review = $3, 
             confidence_threshold = $4, updated_at = NOW()
         WHERE organisation_id = $5
         RETURNING *`,
        [email_address, auto_create_mode || 'ai_decide', 
         require_human_review !== undefined ? require_human_review : true,
         confidence_threshold || 0.70, orgId]
      );
      channel = result.rows[0];
    } else {
      // Create new
      const inboundIdentifier = generateInboundIdentifier(email_address);
      
      const result = await db.query(
        `INSERT INTO email_intake_channels (
          organisation_id, email_address, inbound_identifier, auto_create_mode,
          require_human_review, confidence_threshold, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
        [orgId, email_address, inboundIdentifier, auto_create_mode || 'ai_decide',
         require_human_review !== undefined ? require_human_review : true,
         confidence_threshold || 0.70]
      );
      channel = result.rows[0];
    }

    // Generate DNS records
    const dnsRecords = {
      mx: {
        type: 'MX',
        host: '@',
        value: 'inbound-smtp.resend.com',
        priority: 10
      },
      spf: {
        type: 'TXT',
        host: '@',
        value: 'v=spf1 include:resend.com ~all'
      },
      dkim1: {
        type: 'TXT',
        host: 'resend._domainkey',
        value: channel.dkim_public_key_1 || 'Setup pending - will be generated after DNS verification'
      }
    };

    res.json({
      success: true,
      channel: {
        id: channel.id,
        email_address: channel.email_address,
        inbound_identifier: channel.inbound_identifier,
        auto_create_mode: channel.auto_create_mode,
        require_human_review: channel.require_human_review,
        confidence_threshold: parseFloat(channel.confidence_threshold)
      },
      dns_records: dnsRecords,
      message: 'Email intake configured. Please add DNS records to activate.'
    });

  } catch (error) {
    console.error('Error saving email intake settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Activate email intake (mark as active)
router.post('/activate', async (req, res) => {
  try {
    const orgId = req.orgContext.organisationId;

    await db.query(
      `UPDATE email_intake_channels 
       SET is_active = TRUE, verified_at = NOW(), mx_verified = TRUE, spf_verified = TRUE, dkim_verified = TRUE
       WHERE organisation_id = $1`,
      [orgId]
    );

    res.json({ success: true, message: 'Email intake activated' });

  } catch (error) {
    console.error('Error activating email intake:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get activity log
router.get('/activity', async (req, res) => {
  try {
    const orgId = req.orgContext.organisationId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT * FROM email_intake_logs 
       WHERE organisation_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [orgId, limit, offset]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM email_intake_logs WHERE organisation_id = $1',
      [orgId]
    );

    const total = parseInt(countResult.rows[0].total);
    const pages = Math.ceil(total / limit);

    res.json({
      logs: result.rows.map(log => ({
        id: log.id,
        from_address: log.from_address,
        to_address: log.to_address,
        subject: log.subject,
        ai_intent: log.ai_intent,
        ai_confidence: parseFloat(log.ai_confidence),
        action_taken: log.action_taken,
        work_item_id: log.work_item_id,
        work_item_type: log.work_item_type,
        requires_review: log.requires_review,
        created_at: log.created_at
      })),
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });

  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
