const express = require('express');
const router = express.Router();
const db = require('../../shared/db');

// GET /api/quotes/ai-context-preview - Get context preview for AI generation
router.get('/ai-context-preview', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { ticket_id, contact_id } = req.query;

    const context = {
      ticket_description: null,
      ticket_updates_count: 0,
      customer_name: null,
      customer_sector: null,
      similar_quotes_count: 0
    };

    // Fetch ticket information if ticket_id provided
    if (ticket_id) {
      const ticketQuery = `
        SELECT 
          t.title,
          t.description,
          t.contact_id,
          (SELECT COUNT(*) FROM ticket_updates WHERE ticket_id = t.id) as updates_count
        FROM tickets t
        WHERE t.id = $1 AND t.organisation_id = $2
      `;
      const ticketResult = await db.query(ticketQuery, [ticket_id, organizationId]);
      
      if (ticketResult.rows.length > 0) {
        const ticket = ticketResult.rows[0];
        context.ticket_description = `${ticket.title}: ${ticket.description || 'No description'}`;
        context.ticket_updates_count = parseInt(ticket.updates_count) || 0;
        
        // Use ticket's contact_id if no contact_id provided
        if (!contact_id && ticket.contact_id) {
          const customerQuery = `
            SELECT name, sector FROM contacts WHERE id = $1 AND organisation_id = $2
          `;
          const customerResult = await db.query(customerQuery, [ticket.contact_id, organizationId]);
          if (customerResult.rows.length > 0) {
            context.customer_name = customerResult.rows[0].name;
            context.customer_sector = customerResult.rows[0].sector;
          }
        }
      }
    }

    // Fetch customer information if contact_id provided
    if (contact_id) {
      const customerQuery = `
        SELECT name, sector FROM contacts WHERE id = $1 AND organisation_id = $2
      `;
      const customerResult = await db.query(customerQuery, [contact_id, organizationId]);
      if (customerResult.rows.length > 0) {
        context.customer_name = customerResult.rows[0].name;
        context.customer_sector = customerResult.rows[0].sector;
      }

      // Find similar quotes for this customer
      const similarQuotesQuery = `
        SELECT COUNT(*) as count
        FROM quotes
        WHERE contact_id = $1 AND organisation_id = $2 AND status != 'draft'
      `;
      const similarResult = await db.query(similarQuotesQuery, [contact_id, organizationId]);
      context.similar_quotes_count = parseInt(similarResult.rows[0].count) || 0;
    }

    res.json(context);
  } catch (error) {
    console.error('Error fetching AI context preview:', error);
    res.status(500).json({ error: 'Failed to fetch context preview' });
  }
});

module.exports = router;
