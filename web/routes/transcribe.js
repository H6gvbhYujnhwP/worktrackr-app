const express = require('express');
const router = express.Router();
const multer = require('multer');
const { z } = require('zod');
const db = require('../../shared/db');
const OpenAI = require('openai');
const fs = require('fs');

// ─── OpenAI client (Whisper only — speech-to-text, no viable Anthropic equivalent) ──
let openai = null;
function getOpenAIClient() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

// ─── Anthropic Claude helper (all AI reasoning) ───────────────────────────────
async function callClaude(systemPrompt, userContent) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }
  const data = await response.json();
  return data.content?.[0]?.text || '';
}

// ─── Multer config ─────────────────────────────────────────────────────────────
const upload = multer({
  dest: '/tmp/uploads/',
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok =
      ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/webm', 'audio/ogg',
       'video/mp4', 'video/webm'].includes(file.mimetype) ||
      /\.(mp3|wav|m4a|webm|ogg|mp4)$/i.test(file.originalname);
    ok ? cb(null, true) : cb(new Error('Invalid file type. Supported: MP3, WAV, M4A, WEBM, OGG, MP4'));
  },
});

// ─── Schemas ───────────────────────────────────────────────────────────────────
const extractTicketSchema = z.object({
  transcript_id:   z.string().uuid().optional(),
  transcript_text: z.string().min(10),
});

// ─── Prompt helpers ───────────────────────────────────────────────────────────
function meetingNoteExtractionPrompt(transcript) {
  return `You are extracting structured meeting notes from a transcript.

TRANSCRIPT:
${transcript}

Return ONLY valid JSON — no markdown, no explanations:
{
  "summary":      "2-3 sentence overview of what was discussed",
  "action_items": ["action item with owner if mentioned"],
  "key_details":  ["important technical or factual detail"],
  "follow_ups":   ["thing that needs to happen next"],
  "decisions":    ["decision made during the meeting"]
}

Rules: If a section has no content return []. Be concise — one sentence max per bullet.`;
}

function ticketExtractionPrompt(transcript) {
  return `You are analyzing a customer service call or meeting transcript.

TRANSCRIPT:
${transcript}

Return ONLY valid JSON:
{
  "title":                "Brief descriptive title (max 100 chars)",
  "description":          "Detailed description of the issue or request",
  "category":             "One of: IT Support, Maintenance, Installation, Consultation, Emergency, Other",
  "priority":             "One of: low, medium, high, urgent",
  "customer_name":        "Customer or company name if mentioned, else null",
  "contact_email":        "Email address if mentioned, else null",
  "contact_phone":        "Phone number if mentioned, else null",
  "scheduled_date":       "ISO date (YYYY-MM-DD) if specific date mentioned, else null",
  "estimated_duration":   "Duration in minutes if discussed, else null",
  "key_requirements":     ["requirement 1"],
  "parts_needed":         ["part 1"],
  "budget_mentioned":     "Amount in GBP if discussed, else null",
  "urgency_indicators":   ["reason 1"],
  "follow_up_actions":    ["action 1"],
  "confidence_score":     0.85
}`;
}

// ─── Format extraction as readable note body ──────────────────────────────────
function formatAudioNote(extraction, filename) {
  const lines = ['\uD83C\uDF99\uFE0F Meeting Note' + (filename ? ' \u2014 ' + filename : '')];
  lines.push('', '**Summary**', extraction.summary || '(none)');
  if (extraction.action_items?.length) {
    lines.push('', '**Action Items**');
    extraction.action_items.forEach(i => lines.push('\u2022 ' + i));
  }
  if (extraction.key_details?.length) {
    lines.push('', '**Key Details**');
    extraction.key_details.forEach(i => lines.push('\u2022 ' + i));
  }
  if (extraction.decisions?.length) {
    lines.push('', '**Decisions**');
    extraction.decisions.forEach(i => lines.push('\u2022 ' + i));
  }
  if (extraction.follow_ups?.length) {
    lines.push('', '**Follow-ups**');
    extraction.follow_ups.forEach(i => lines.push('\u2022 ' + i));
  }
  return lines.join('\n');
}

// ─── POST /api/transcribe/ticket-note ─────────────────────────────────────────
router.post('/ticket-note', upload.single('audio'), async (req, res) => {
  let tempFilePath = null;
  try {
    let transcriptText = req.body.transcript_text || '';
    const filename     = req.file ? req.file.originalname : null;

    if (req.file) {
      tempFilePath = req.file.path;
      console.log('[TicketNote] Transcribing:', filename, 'size:', req.file.size);
      const openaiClient = getOpenAIClient();
      const transcription = await openaiClient.audio.transcriptions.create({
        file:            fs.createReadStream(tempFilePath),
        model:           'whisper-1',
        language:        'en',
        response_format: 'text',
      });
      transcriptText = transcription;
      console.log('[TicketNote] Whisper done, chars:', transcriptText.length);
    }

    if (!transcriptText || transcriptText.trim().length < 10) {
      return res.status(400).json({ error: 'No usable transcript. Upload an audio file or paste a transcript.' });
    }

    console.log('[TicketNote] Extracting with Claude…');
    const raw = await callClaude(
      'You extract structured meeting notes from transcripts. Always respond with valid JSON only.',
      meetingNoteExtractionPrompt(transcriptText.trim()),
    );

    let extraction;
    try {
      extraction = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      console.error('[TicketNote] Claude JSON parse failed, raw:', raw);
      extraction = { summary: raw.slice(0, 500), action_items: [], key_details: [], follow_ups: [], decisions: [] };
    }

    if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

    res.json({
      success:        true,
      transcript:     transcriptText.trim(),
      extraction,
      formatted_body: formatAudioNote(extraction, filename),
      filename,
    });
  } catch (error) {
    console.error('[TicketNote] Error:', error);
    if (tempFilePath && fs.existsSync(tempFilePath)) { try { fs.unlinkSync(tempFilePath); } catch {} }
    if (error.code === 'insufficient_quota') return res.status(503).json({ error: 'Transcription service temporarily unavailable.' });
    res.status(500).json({ error: 'Failed to process audio note.', message: error.message });
  }
});

// ─── POST /api/transcribe/audio ───────────────────────────────────────────────
router.post('/audio', upload.single('audio'), async (req, res) => {
  let tempFilePath = null;
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
    const audioFile = req.file;
    tempFilePath = audioFile.path;
    const orgId  = req.orgContext.organizationId;
    const userId = req.user.userId;
    console.log('[Transcribe] Processing:', audioFile.originalname, 'size:', audioFile.size);

    const openaiClient = getOpenAIClient();
    const transcription = await openaiClient.audio.transcriptions.create({
      file:     fs.createReadStream(tempFilePath),
      model:    'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    const result = await db.query(
      `INSERT INTO transcripts (organisation_id, user_id, filename, duration, text, segments, language)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [orgId, userId, audioFile.originalname, Math.round(transcription.duration),
       transcription.text, JSON.stringify(transcription.segments || []), transcription.language || 'en'],
    );
    fs.unlinkSync(tempFilePath);
    const transcript = result.rows[0];
    res.json({ success: true, transcript_id: transcript.id, text: transcript.text,
               duration: transcript.duration, segments: transcription.segments || [], language: transcript.language });
  } catch (error) {
    console.error('[Transcribe] Error:', error);
    if (tempFilePath && fs.existsSync(tempFilePath)) { try { fs.unlinkSync(tempFilePath); } catch {} }
    if (error.code === 'insufficient_quota') return res.status(503).json({ error: 'Transcription service temporarily unavailable' });
    res.status(500).json({ error: 'Failed to transcribe audio', message: error.message });
  }
});

// ─── POST /api/transcribe/extract-ticket (Claude) ─────────────────────────────
router.post('/extract-ticket', async (req, res) => {
  try {
    const { transcript_id, transcript_text } = extractTicketSchema.parse(req.body);
    const orgId = req.orgContext.organizationId;
    let transcriptText = transcript_text;
    if (transcript_id) {
      const r = await db.query(`SELECT text FROM transcripts WHERE id = $1 AND organisation_id = $2`, [transcript_id, orgId]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Transcript not found' });
      transcriptText = r.rows[0].text;
    }
    const raw = await callClaude(
      'You are a ticket extraction assistant. Always respond with valid JSON only.',
      ticketExtractionPrompt(transcriptText),
    );
    let extracted;
    try { extracted = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
    catch { return res.status(500).json({ error: 'Failed to parse AI response', raw_response: raw }); }

    let matched_contact_id = null, matched_contact = null;
    if (extracted.customer_name || extracted.contact_email) {
      const cr = await db.query(
        `SELECT id, company_name, name, email, phone FROM contacts
         WHERE organisation_id = $1 AND (company_name ILIKE $2 OR name ILIKE $2 OR email ILIKE $3) LIMIT 1`,
        [orgId, `%${extracted.customer_name || ''}%`, `%${extracted.contact_email || ''}%`],
      );
      if (cr.rows.length > 0) { matched_contact = cr.rows[0]; matched_contact_id = matched_contact.id; }
    }
    if (transcript_id) {
      await db.query(
        `INSERT INTO ai_extractions (organisation_id, transcript_id, model, extraction_type, extracted_data, confidence_score)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orgId, transcript_id, 'claude-haiku-4-5-20251001', 'ticket', JSON.stringify(extracted), extracted.confidence_score || 0.5],
      );
    }
    res.json({ success: true, extracted_data: extracted, matched_contact_id, matched_contact, transcript_id: transcript_id || null, ready_for_review: true });
  } catch (error) {
    console.error('[Extract Ticket] Error:', error);
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Invalid request', details: error.errors });
    res.status(500).json({ error: 'Failed to extract ticket data', message: error.message });
  }
});

// ─── Voice intent prompt ──────────────────────────────────────────────────────
// Phase 1: company/contact added to crm_calendar schema
// Phase 3: conversationHistory param, clarification_needed/missing_fields/question in response
// Phase 5: compound intent shape
function buildVoiceIntentPrompt(transcript, context, conversationHistory) {
  const history = Array.isArray(conversationHistory) ? conversationHistory : [];

  let historySection = '';
  if (history.length > 0) {
    historySection = '\n\nCONVERSATION SO FAR:\n';
    for (const entry of history) {
      historySection += (entry.role === 'user' ? 'USER' : 'ASSISTANT') + ': ' + entry.content + '\n';
    }
    historySection += '\nThe user has now responded. Use the full conversation above to fill in previously missing fields. Do NOT ask again for anything already given in the conversation.';
  }

  const userLine = history.length > 0
    ? 'LATEST USER RESPONSE: "' + transcript + '"'
    : 'USER SAID: "' + transcript + '"';

  return `You are an AI assistant embedded in WorkTrackr, a field service management and CRM platform.
A user has spoken a voice command. Determine their intent and extract the relevant data.

${userLine}

CONTEXT:
${context}${historySection}

AVAILABLE INTENTS:
- ticket_note       -> Add a note/comment to an existing ticket
- new_ticket        -> Create a brand-new support ticket
- personal_note     -> Save a private note to My Notes
- personal_reminder -> Save a private note with a due date/reminder
- company_note      -> Share a note with the whole team (Company Notes)
- crm_calendar      -> Schedule a CRM event (call, meeting, follow-up)
- ticket_calendar   -> Book a calendar entry for a job/ticket
- compound          -> User wants to do TWO distinct things at once
- unknown           -> Cannot determine intent

REQUIRED FIELDS — if any required field is missing, set clarification_needed: true and ask:
- crm_calendar:       date/time (required), title (required), type (required); company/contact optional but ask once if unmentioned
- new_ticket:         title (required), priority (ask if not stated)
- ticket_note:        ticket_id (required unless currently viewing a ticket per context), body (required)
- personal_reminder:  title (required), due_date (ALWAYS ask "when?" if not provided)
- personal_note:      title (required), body (required)
- company_note:       title (required), body (required), note_type (ask "knowledge base, general, or announcement?" if missing)
- ticket_calendar:    title (required), eventDate (required), startTime (required)

CLARIFICATION RULES:
- Set clarification_needed: true only if a REQUIRED field is missing
- question must be a short spoken sentence, under 15 words
- Do NOT re-ask for anything already provided in the conversation history above
- After 3 rounds, make your best guess and proceed without asking further

Return ONLY valid JSON — no markdown, no explanation:
{
  "intent": "ticket_note",
  "confidence": 0.92,
  "clarification_needed": false,
  "missing_fields": [],
  "question": null,
  "ticket_id": "uuid-of-ticket-or-null",
  "confirmation_message": "Short spoken summary e.g. Adding a note to the VPN ticket saying the router is replaced. Confirm?",
  "compound_items": null,
  "data": {
    "for ticket_note":       { "ticket_id": "uuid", "body": "note text", "comment_type": "internal" },
    "for new_ticket":        { "title": "brief title", "description": "full description", "priority": "low|medium|high|urgent" },
    "for personal_note":     { "title": "note title", "body": "note body" },
    "for personal_reminder": { "title": "reminder title", "body": "details", "due_date": "ISO 8601 datetime or null" },
    "for company_note":      { "title": "title", "body": "body", "note_type": "note|knowledge|announcement" },
    "for crm_calendar":      { "title": "event title", "type": "call|meeting|follow_up|other", "start_at": "ISO 8601", "end_at": "ISO 8601", "notes": "optional notes", "company": "company name or null", "contact": "contact person name or null" },
    "for ticket_calendar":   { "title": "event title", "eventDate": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM", "description": "optional" }
  }
}

For COMPOUND intents (two distinct actions):
{
  "intent": "compound",
  "confidence": 0.88,
  "clarification_needed": false,
  "missing_fields": [],
  "question": null,
  "ticket_id": null,
  "confirmation_message": "Adding a note to the Acme ticket and scheduling a call tomorrow at 2pm. Confirm?",
  "compound_items": [
    { "intent": "ticket_note", "data": { "ticket_id": "uuid", "body": "note text", "comment_type": "internal" } },
    { "intent": "crm_calendar", "data": { "title": "Call with Acme", "type": "call", "start_at": "ISO 8601", "end_at": "ISO 8601", "company": null, "contact": null } }
  ],
  "data": {}
}

Rules:
- Only include data fields relevant to the chosen intent
- If no ticket identifiable for ticket_note, set ticket_id to null
- Due dates in ISO 8601; infer from "tomorrow", "next Monday" relative to today's date in context
- Default to 1-hour duration for CRM/calendar if end time not mentioned
- confidence is 0.0-1.0; use "unknown" if below 0.5
- confirmation_message must be a natural spoken sentence under 25 words`;
}

// ─── POST /api/transcribe/voice-intent ────────────────────────────────────────
router.post('/voice-intent', async (req, res) => {
  try {
    const { transcript, context, conversationHistory } = req.body;
    if (!transcript || transcript.trim().length < 2) {
      return res.status(400).json({ error: 'No transcript provided' });
    }

    const history = Array.isArray(conversationHistory) ? conversationHistory : [];

    const contextStr = [
      context.currentView    ? 'Current screen: ' + context.currentView : '',
      context.userName       ? 'Current user: ' + context.userName : '',
      context.dateTime       ? 'Date/time: ' + context.dateTime : '',
      context.currentTicketId ? 'Currently viewing ticket ID: ' + context.currentTicketId : '',
      context.openTickets?.length
        ? 'Recent open tickets:\n' + context.openTickets.map(t => '  - ID: ' + t.id + ' | #' + (t.ref || t.id.slice(0,8)) + ' "' + t.title + '" (' + t.status + ')').join('\n')
        : 'No open tickets loaded',
    ].filter(Boolean).join('\n');

    console.log('[VoiceIntent] Transcript:', transcript.slice(0, 100), '| History rounds:', history.length);

    const raw = await callClaude(
      'You are a voice intent router for a field service CRM application. Always respond with valid JSON only.',
      buildVoiceIntentPrompt(transcript.trim(), contextStr, history),
    );

    let result;
    try {
      result = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      console.error('[VoiceIntent] Parse failed, raw:', raw);
      result = {
        intent: 'unknown',
        confidence: 0,
        clarification_needed: false,
        missing_fields: [],
        question: null,
        ticket_id: null,
        confirmation_message: "I couldn't understand that — please try again.",
        compound_items: null,
        data: {},
      };
    }

    console.log('[VoiceIntent] Intent:', result.intent, '| Confidence:', result.confidence, '| Clarify:', result.clarification_needed);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[VoiceIntent] Error:', error);
    res.status(500).json({ error: 'Failed to process voice command', message: error.message });
  }
});

// ─── GET /api/transcribe/:id ──────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId  = req.orgContext.organizationId;
    const result = await db.query(
      `SELECT t.*, u.email as created_by_email FROM transcripts t LEFT JOIN users u ON t.user_id = u.id WHERE t.id = $1 AND t.organisation_id = $2`,
      [id, orgId],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Transcript not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transcript', message: error.message });
  }
});

// ─── GET /api/transcribe ──────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const orgId = req.orgContext.organizationId;
    const { ticket_id, limit = 50, offset = 0 } = req.query;
    let query = `SELECT t.*, u.email as created_by_email FROM transcripts t LEFT JOIN users u ON t.user_id = u.id WHERE t.organisation_id = $1`;
    const params = [orgId]; let pi = 2;
    if (ticket_id) { query += ' AND t.ticket_id = $' + pi++; params.push(ticket_id); }
    query += ' ORDER BY t.created_at DESC LIMIT $' + pi + ' OFFSET $' + (pi + 1);
    params.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, params);
    res.json({ transcripts: result.rows, total: result.rows.length, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transcripts', message: error.message });
  }
});

module.exports = router;
