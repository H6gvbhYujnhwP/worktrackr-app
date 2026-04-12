const express = require('express');
const router = express.Router();
const db = require('../../shared/db');

// Call Anthropic Claude API
async function callAnthropic(systemPrompt, userMessage) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${err}`);
  }
  const data = await response.json();
  return data.content[0].text;
}

// POST /api/summaries/ticket/:id
router.post('/ticket/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.orgContext.organizationId;

    const ticketResult = await db.query(
      `SELECT t.title, t.description, t.status, t.priority, t.category,
              t.created_at, t.updated_at,
              c.name as contact_name, c.company_name,
              u.name as assignee_name
       FROM tickets t
       LEFT JOIN contacts c ON t.contact_id = c.id
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.id = $1 AND t.organisation_id = $2`,
      [id, orgId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    const commentsResult = await db.query(
      `SELECT c.body, c.created_at, u.name as author_name
       FROM comments c
       JOIN users u ON c.author_id = u.id
       WHERE c.ticket_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );

    const comments = commentsResult.rows;
    const threadText = comments.length > 0
      ? comments.map(c =>
          `[${new Date(c.created_at).toLocaleDateString('en-GB')} — ${c.author_name}]: ${c.body}`
        ).join('\n')
      : 'No comments yet.';

    const userMessage =
      `TICKET: ${ticket.title}
STATUS: ${ticket.status} | PRIORITY: ${ticket.priority} | CATEGORY: ${ticket.category || 'N/A'}
CUSTOMER: ${ticket.company_name || ticket.contact_name || 'Unknown'}
ASSIGNED TO: ${ticket.assignee_name || 'Unassigned'}
OPENED: ${new Date(ticket.created_at).toLocaleDateString('en-GB')}
DESCRIPTION: ${ticket.description || 'No description provided.'}

THREAD:
${threadText}

Write a concise summary (3–5 sentences) of this ticket: what the issue is, what has been done so far, and what the current status is. Be factual and direct. No bullet points.`;

    const summary = await callAnthropic(
      'You are a helpful assistant that summarises IT support tickets. Write in plain English, be concise and factual.',
      userMessage
    );

    res.json({ summary });

  } catch (error) {
    console.error('[Summaries] Ticket error:', error);
    res.status(500).json({ error: 'Failed to generate summary', message: error.message });
  }
});

// POST /api/summaries/quote/:id
router.post('/quote/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.orgContext.organizationId;

    const quoteResult = await db.query(
      `SELECT q.title, q.description, q.status, q.total_amount, q.valid_until,
              q.terms_conditions, q.notes,
              c.name as contact_name, c.company_name
       FROM quotes q
       LEFT JOIN contacts c ON q.contact_id = c.id
       WHERE q.id = $1 AND q.organisation_id = $2`,
      [id, orgId]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const quote = quoteResult.rows[0];

    const lineItemsResult = await db.query(
      `SELECT description, quantity, unit_price, item_type, unit
       FROM quote_lines
       WHERE quote_id = $1
       ORDER BY sort_order`,
      [id]
    );

    const lineItems = lineItemsResult.rows;
    const lineItemsText = lineItems.map(item =>
      `- ${item.description} (qty: ${item.quantity}, unit price: £${parseFloat(item.unit_price).toFixed(2)})`
    ).join('\n');

    const userMessage =
      `QUOTE: ${quote.title}
CUSTOMER: ${quote.company_name || quote.contact_name || 'Unknown'}
TOTAL: £${parseFloat(quote.total_amount || 0).toFixed(2)}
VALID UNTIL: ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('en-GB') : 'Not set'}
DESCRIPTION: ${quote.description || 'No description.'}

LINE ITEMS:
${lineItemsText || 'No line items.'}

${quote.terms_conditions ? `TERMS: ${quote.terms_conditions}` : ''}

Write a short, friendly summary (2–4 sentences) of what this quote covers — suitable to say to a customer on a call. Mention the key work being done and the total cost. No bullet points, no jargon.`;

    const summary = await callAnthropic(
      'You are a helpful assistant that summarises quotes for IT and field service businesses. Write in plain, friendly English as if speaking to a customer.',
      userMessage
    );

    res.json({ summary });

  } catch (error) {
    console.error('[Summaries] Quote error:', error);
    res.status(500).json({ error: 'Failed to generate summary', message: error.message });
  }
});

// POST /api/summaries/crm-event/:id/next-action
// Fires after a CRM event is marked Done. Calls Claude Haiku with event context
// and returns a suggested next action + up to 2 quick-action buttons.
// Action types: new_ticket | new_quote | schedule_followup | none
router.post('/crm-event/:id/next-action', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.orgContext.organizationId;

    // Verify org ownership; get DB fields including contact name via JOIN
    const eventResult = await db.query(
      `SELECT e.id, e.title, e.type, e.notes, e.status, e.description,
              c.name as contact_name
       FROM crm_events e
       LEFT JOIN contacts c ON e.contact_id = c.id
       WHERE e.id = $1 AND e.organisation_id = $2`,
      [id, orgId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'CRM event not found' });
    }

    const event = eventResult.rows[0];

    // company/contact text strings are not DB columns — accepted from body as context
    const bodyCompany = req.body.company || '';
    const bodyContact = req.body.contact || '';

    // Best available contact name
    const contactName = event.contact_name || bodyContact || bodyCompany || 'the contact';
    const companyName = bodyCompany || event.contact_name || 'the company';

    const typeLabels = {
      call:      'Phone call',
      meeting:   'In-person meeting',
      follow_up: 'Follow-up',
      renewal:   'Renewal discussion',
      other:     'Activity',
    };
    const typeLabel = typeLabels[event.type] || event.type;

    const userMessage =
`EVENT TYPE: ${typeLabel}
TITLE: ${event.title}
CONTACT: ${contactName}
COMPANY: ${companyName}
NOTES: ${event.notes || event.description || 'None recorded'}
STATUS: Just marked Done

This CRM event has just been marked as done. Based on the event type and any notes, suggest the single most logical next action for this contact.

Respond ONLY with valid JSON (no markdown, no code fences, no extra text):
{
  "suggestion": "One or two sentences explaining what to do next and why.",
  "actions": [
    { "label": "Short button label", "type": "new_ticket|new_quote|schedule_followup|none" },
    { "label": "Short button label", "type": "new_ticket|new_quote|schedule_followup|none" }
  ]
}

Action type rules:
- new_ticket: raise a support or work ticket for this contact
- new_quote: prepare a quote or proposal for this contact
- schedule_followup: book a follow-up call or meeting
- none: only if truly no follow-up is warranted
Return 1–2 actions. Do not repeat the same type twice.`;

    const raw = await callAnthropic(
      'You are a CRM assistant for an IT support and field services company. Suggest the next logical action after a CRM event is completed. Respond with valid JSON only — no markdown, no extra text.',
      userMessage
    );

    // Parse — strip accidental markdown fences
    let parsed;
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      console.error('[Summaries] Next-action JSON parse error:', parseErr, '\nRaw:', raw);
      // Graceful fallback so the UI always gets a valid response shape
      return res.json({
        suggestion: 'Consider scheduling a follow-up with this contact to keep things moving forward.',
        actions: [{ label: 'Schedule follow-up', type: 'schedule_followup' }]
      });
    }

    // Sanitise shape
    const suggestion = typeof parsed.suggestion === 'string' ? parsed.suggestion.trim() : '';
    const actions = Array.isArray(parsed.actions)
      ? parsed.actions
          .filter(a => a && typeof a.label === 'string' && typeof a.type === 'string')
          .slice(0, 2)
          .map(a => ({ label: a.label.trim(), type: a.type.trim() }))
      : [];

    res.json({ suggestion, actions });

  } catch (error) {
    console.error('[Summaries] CRM next-action error:', error);
    res.status(500).json({ error: 'Failed to generate next-action suggestion', message: error.message });
  }
});

module.exports = router;
