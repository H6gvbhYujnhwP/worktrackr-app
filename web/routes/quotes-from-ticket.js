// web/routes/quotes-from-ticket.js
// POST /api/quotes/generate-from-ticket
// Reads ticket + thread + audio extractions + product catalogue,
// calls Claude, returns structured suggested line items for review.

const express = require('express');
const router  = express.Router();
const db      = require('../../shared/db');

async function callClaude(systemPrompt, userMessage) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

// POST /api/quotes/generate-from-ticket
router.post('/generate-from-ticket', async (req, res) => {
  const { ticket_id } = req.body;
  const orgId = req.user?.organisationId || req.user?.organizationId;

  if (!ticket_id) {
    return res.status(400).json({ error: 'ticket_id is required' });
  }

  try {
    // ── 1. Load ticket ────────────────────────────────────────────────────
    const ticketResult = await db.query(
      `SELECT id, title, description, sector, status,
              scheduled_date, scheduled_duration_mins
       FROM tickets
       WHERE id = $1 AND organisation_id = $2`,
      [ticket_id, orgId]
    );
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    const ticket = ticketResult.rows[0];

    // ── 2. Load thread comments ───────────────────────────────────────────
    const commentsResult = await db.query(
      `SELECT c.body, c.comment_type, c.created_at,
              u.name as author_name
       FROM comments c
       LEFT JOIN users u ON c.author_id = u.id
       WHERE c.ticket_id = $1
       ORDER BY c.created_at ASC`,
      [ticket_id]
    );
    const comments = commentsResult.rows;

    // ── 3. Load product catalogue ─────────────────────────────────────────
    const productsResult = await db.query(
      `SELECT id, name, description, type, our_cost, client_price, unit
       FROM products
       WHERE organisation_id = $1 AND is_active = TRUE
       ORDER BY name ASC
       LIMIT 200`,
      [orgId]
    );
    const catalogue = productsResult.rows;

    // ── 4. Build context for Claude ───────────────────────────────────────
    const ticketContext = [
      `TICKET TITLE: ${ticket.title}`,
      ticket.description ? `DESCRIPTION: ${ticket.description}` : null,
      ticket.sector       ? `SECTOR: ${ticket.sector}`            : null,
      ticket.scheduled_duration_mins
        ? `SCHEDULED DURATION: ${ticket.scheduled_duration_mins} minutes`
        : null,
    ].filter(Boolean).join('\n');

    // Format comments — label each by type and date so Claude can cite source
    const threadContext = comments.length === 0
      ? 'No thread notes.'
      : comments.map(c => {
          const dateStr = new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
          const label   = c.comment_type === 'internal' ? 'Internal note'
                        : c.comment_type === 'audio_note' ? 'Meeting note'
                        : 'Update';
          return `[${label} — ${dateStr} — ${c.author_name || 'Unknown'}]\n${c.body}`;
        }).join('\n\n');

    const catalogueContext = catalogue.length === 0
      ? 'No product catalogue available.'
      : catalogue.map(p =>
          `- ID:${p.id} | ${p.name}${p.description ? ` (${p.description})` : ''} | Type:${p.type || 'service'} | Unit:${p.unit || 'ea'} | BuyCost:£${parseFloat(p.our_cost || 0).toFixed(2)} | SellPrice:£${parseFloat(p.client_price || 0).toFixed(2)}`
        ).join('\n');

    // ── 5. Call Claude ────────────────────────────────────────────────────
    const systemPrompt = `You are a field service quoting assistant. Given a ticket's details and thread notes, extract a list of suggested quote line items.

RULES:
- Only suggest items clearly mentioned or strongly implied by the ticket/notes
- For each item, check the product catalogue for a match. If matched, use that product's pricing (buy/sell) and mark catalogue_sourced: true
- If an item is mentioned but details are unclear (e.g. model unknown, quantity unclear), still include it but set flagged: true and explain in flag_reason
- Be specific: "Replace Cat5e patch cable 2m" not just "cable"
- For labour, estimate hours based on context or leave unit_price as 0 if unknown
- Set source to a brief human-readable label (e.g. "from internal note 3 Apr", "from ticket description", "from meeting note")
- confidence: "high" = explicitly stated, "medium" = implied, "low" = uncertain
- Return ONLY valid JSON. No preamble, no markdown fences.

RESPONSE FORMAT:
{
  "line_items": [
    {
      "description": "string",
      "item_type": "material|labour|expense|subcontractor",
      "quantity": number,
      "unit": "string (hrs/days/ea/m/m²/kg/set/lot/pack/visit or empty)",
      "unit_price": number,
      "buy_cost": number,
      "supplier": "string or empty",
      "product_id": "uuid or null",
      "confidence": "high|medium|low",
      "source": "string",
      "flagged": boolean,
      "flag_reason": "string or null",
      "catalogue_sourced": boolean
    }
  ]
}`;

    const userMessage = `TICKET:\n${ticketContext}\n\nTHREAD NOTES:\n${threadContext}\n\nPRODUCT CATALOGUE:\n${catalogueContext}`;

    console.log(`[GenerateFromTicket] Calling Claude for ticket ${ticket_id}`);
    const raw = await callClaude(systemPrompt, userMessage);

    // ── 6. Parse Claude response ──────────────────────────────────────────
    let parsed;
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error('[GenerateFromTicket] JSON parse failed:', raw);
      return res.status(500).json({ error: 'AI returned unparseable response. Please try again.' });
    }

    const lineItems = (parsed.line_items || []).map(item => ({
      description:       String(item.description || ''),
      item_type:         ['material','labour','expense','subcontractor'].includes(item.item_type) ? item.item_type : 'material',
      quantity:          parseFloat(item.quantity) || 1,
      unit:              String(item.unit || ''),
      unit_price:        parseFloat(item.unit_price) || 0,
      buy_cost:          parseFloat(item.buy_cost) || 0,
      supplier:          String(item.supplier || ''),
      product_id:        item.product_id || null,
      confidence:        ['high','medium','low'].includes(item.confidence) ? item.confidence : 'medium',
      source:            String(item.source || 'from ticket'),
      flagged:           Boolean(item.flagged),
      flag_reason:       item.flag_reason ? String(item.flag_reason) : null,
      catalogue_sourced: Boolean(item.catalogue_sourced),
    }));

    console.log(`[GenerateFromTicket] Returning ${lineItems.length} items`);
    return res.json({ line_items: lineItems, ticket_title: ticket.title });

  } catch (err) {
    console.error('[GenerateFromTicket] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to generate quote suggestions' });
  }
});

// POST /api/quotes/topup-from-ticket
// Reads only notes added after `since_date`, calls Claude, returns new suggested items.
router.post('/topup-from-ticket', async (req, res) => {
  const { ticket_id, since_date } = req.body;
  const orgId = req.user?.organisationId || req.user?.organizationId;

  if (!ticket_id)   return res.status(400).json({ error: 'ticket_id is required' });
  if (!since_date)  return res.status(400).json({ error: 'since_date is required' });

  const sinceTs = new Date(since_date);
  if (isNaN(sinceTs.getTime())) return res.status(400).json({ error: 'since_date is not a valid date' });

  try {
    // ── 1. Verify ticket belongs to org ──────────────────────────────────
    const ticketResult = await db.query(
      `SELECT id, title, sector FROM tickets WHERE id = $1 AND organisation_id = $2`,
      [ticket_id, orgId]
    );
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    const ticket = ticketResult.rows[0];

    // ── 2. Load only new comments (after since_date) ──────────────────────
    const commentsResult = await db.query(
      `SELECT c.body, c.comment_type, c.created_at, u.name as author_name
       FROM comments c
       LEFT JOIN users u ON c.author_id = u.id
       WHERE c.ticket_id = $1 AND c.created_at > $2
       ORDER BY c.created_at ASC`,
      [ticket_id, sinceTs]
    );
    const newComments = commentsResult.rows;

    if (newComments.length === 0) {
      console.log(`[TopUpFromTicket] No new notes since ${since_date} for ticket ${ticket_id}`);
      return res.json({ line_items: [], ticket_title: ticket.title });
    }

    // ── 3. Load product catalogue ─────────────────────────────────────────
    const productsResult = await db.query(
      `SELECT id, name, description, type, our_cost, client_price, unit
       FROM products
       WHERE organisation_id = $1 AND is_active = TRUE
       ORDER BY name ASC LIMIT 200`,
      [orgId]
    );
    const catalogue = productsResult.rows;

    // ── 4. Build context ──────────────────────────────────────────────────
    const sinceLabel = sinceTs.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const threadContext = newComments.map(c => {
      const dateStr = new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const label   = c.comment_type === 'internal' ? 'Internal note'
                    : c.comment_type === 'audio_note' ? 'Meeting note'
                    : 'Update';
      return `[${label} — ${dateStr} — ${c.author_name || 'Unknown'}]\n${c.body}`;
    }).join('\n\n');

    const catalogueContext = catalogue.length === 0
      ? 'No product catalogue available.'
      : catalogue.map(p =>
          `- ID:${p.id} | ${p.name}${p.description ? ` (${p.description})` : ''} | Type:${p.type || 'service'} | Unit:${p.unit || 'ea'} | BuyCost:£${parseFloat(p.our_cost || 0).toFixed(2)} | SellPrice:£${parseFloat(p.client_price || 0).toFixed(2)}`
        ).join('\n');

    // ── 5. Call Claude ────────────────────────────────────────────────────
    const systemPrompt = `You are a field service quoting assistant. A quote has already been generated for a ticket. You are reviewing NEW notes added AFTER the quote was created. Extract ONLY items that represent new work, parts, or costs mentioned in these new notes — do not re-suggest anything that would already be on the existing quote.

RULES:
- Only extract items clearly mentioned or strongly implied in the new notes
- For each item, check the product catalogue for a match. If matched, use that product's pricing and mark catalogue_sourced: true
- If details are unclear (model unknown, quantity unclear), still include the item but set flagged: true and explain in flag_reason
- Be specific: "Replace Cat5e patch cable 2m" not just "cable"
- Set source to a brief human-readable label (e.g. "from internal note 8 Apr", "from meeting note")
- confidence: "high" = explicitly stated, "medium" = implied, "low" = uncertain
- Return ONLY valid JSON. No preamble, no markdown fences.

RESPONSE FORMAT:
{
  "line_items": [
    {
      "description": "string",
      "item_type": "material|labour|expense|subcontractor",
      "quantity": number,
      "unit": "string",
      "unit_price": number,
      "buy_cost": number,
      "supplier": "string or empty",
      "product_id": "uuid or null",
      "confidence": "high|medium|low",
      "source": "string",
      "flagged": boolean,
      "flag_reason": "string or null",
      "catalogue_sourced": boolean
    }
  ]
}`;

    const userMessage = `TICKET: ${ticket.title}${ticket.sector ? ` (${ticket.sector})` : ''}\n\nNEW NOTES SINCE ${sinceLabel}:\n${threadContext}\n\nPRODUCT CATALOGUE:\n${catalogueContext}`;

    console.log(`[TopUpFromTicket] Calling Claude for ticket ${ticket_id}, ${newComments.length} new note(s) since ${sinceLabel}`);
    const raw = await callClaude(systemPrompt, userMessage);

    // ── 6. Parse ──────────────────────────────────────────────────────────
    let parsed;
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error('[TopUpFromTicket] JSON parse failed:', raw);
      return res.status(500).json({ error: 'AI returned unparseable response. Please try again.' });
    }

    const lineItems = (parsed.line_items || []).map(item => ({
      description:       String(item.description || ''),
      item_type:         ['material','labour','expense','subcontractor'].includes(item.item_type) ? item.item_type : 'material',
      quantity:          parseFloat(item.quantity) || 1,
      unit:              String(item.unit || ''),
      unit_price:        parseFloat(item.unit_price) || 0,
      buy_cost:          parseFloat(item.buy_cost) || 0,
      supplier:          String(item.supplier || ''),
      product_id:        item.product_id || null,
      confidence:        ['high','medium','low'].includes(item.confidence) ? item.confidence : 'medium',
      source:            String(item.source || 'from new note'),
      flagged:           Boolean(item.flagged),
      flag_reason:       item.flag_reason ? String(item.flag_reason) : null,
      catalogue_sourced: Boolean(item.catalogue_sourced),
    }));

    console.log(`[TopUpFromTicket] Returning ${lineItems.length} new item(s)`);
    return res.json({ line_items: lineItems, ticket_title: ticket.title });

  } catch (err) {
    console.error('[TopUpFromTicket] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to generate top-up suggestions' });
  }
});

module.exports = router;
