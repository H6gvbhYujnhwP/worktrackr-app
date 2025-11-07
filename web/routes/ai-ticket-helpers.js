// AI Ticket Helper Functions
// Smart features to reduce manual work and improve ticket quality

const db = require('../db');

/**
 * Auto-fill ticket fields from linked contact
 * @param {Object} ticket - Ticket object
 * @param {Object} contact - Contact object
 * @returns {Object} Suggested field values
 */
function autoFillFromContact(ticket, contact) {
  const suggestions = {};
  
  // Auto-fill company/sector if contact has it
  if (contact.company && !ticket.sector) {
    // Map common company types to sectors
    const companyLower = contact.company.toLowerCase();
    if (companyLower.includes('construction') || companyLower.includes('builder')) {
      suggestions.sector = 'Construction';
    } else if (companyLower.includes('manufacturing') || companyLower.includes('factory')) {
      suggestions.sector = 'Manufacturing';
    } else if (companyLower.includes('it') || companyLower.includes('tech') || companyLower.includes('software')) {
      suggestions.sector = 'IT';
    } else if (companyLower.includes('maintenance') || companyLower.includes('facilities')) {
      suggestions.sector = 'Facilities';
    }
  }
  
  return suggestions;
}

/**
 * Find similar/duplicate tickets from the same contact
 * @param {string} organisationId - Organization ID
 * @param {string} contactId - Contact ID
 * @param {string} ticketTitle - Current ticket title
 * @param {string} ticketId - Current ticket ID (to exclude from results)
 * @returns {Array} Similar tickets
 */
async function findSimilarTickets(organisationId, contactId, ticketTitle, ticketId = null) {
  if (!contactId) return [];
  
  try {
    const query = `
      SELECT id, title, status, priority, created_at,
             similarity(LOWER(title), LOWER($3)) as title_similarity
      FROM tickets
      WHERE organisation_id = $1
      AND contact_id = $2
      AND id != COALESCE($4, '00000000-0000-0000-0000-000000000000'::uuid)
      AND similarity(LOWER(title), LOWER($3)) > 0.3
      AND status != 'closed'
      ORDER BY title_similarity DESC, created_at DESC
      LIMIT 5
    `;
    
    const result = await db.query(query, [organisationId, contactId, ticketTitle, ticketId]);
    return result.rows;
  } catch (error) {
    console.error('Error finding similar tickets:', error);
    return [];
  }
}

/**
 * Get contact ticket statistics
 * @param {string} organisationId - Organization ID
 * @param {string} contactId - Contact ID
 * @returns {Object} Statistics
 */
async function getContactTicketStats(organisationId, contactId) {
  if (!contactId) return null;
  
  try {
    const stats = await db.query(
      `SELECT 
        COUNT(*) as total_tickets,
        COUNT(*) FILTER (WHERE status = 'open') as open_tickets,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tickets,
        COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_tickets,
        MAX(created_at) as last_ticket_date
       FROM tickets
       WHERE organisation_id = $1 AND contact_id = $2`,
      [organisationId, contactId]
    );
    
    return stats.rows[0];
  } catch (error) {
    console.error('Error getting contact stats:', error);
    return null;
  }
}

/**
 * Generate AI-powered ticket insights
 * @param {Object} ticket - Ticket object
 * @param {Object} contact - Contact object (optional)
 * @param {Array} similarTickets - Similar tickets (optional)
 * @returns {Array} Insight messages
 */
function generateTicketInsights(ticket, contact = null, similarTickets = []) {
  const insights = [];
  
  // Contact-based insights
  if (contact) {
    insights.push({
      type: 'info',
      icon: 'user',
      message: `Ticket from ${contact.name}${contact.company ? ` at ${contact.company}` : ''}`
    });
  }
  
  // Duplicate detection
  if (similarTickets.length > 0) {
    const highSimilarity = similarTickets.filter(t => t.title_similarity > 0.6);
    if (highSimilarity.length > 0) {
      insights.push({
        type: 'warning',
        icon: 'alert-circle',
        message: `${highSimilarity.length} similar open ticket(s) found from this contact`,
        action: 'view_similar',
        data: highSimilarity
      });
    }
  }
  
  // Urgency insights
  if (ticket.priority === 'urgent') {
    insights.push({
      type: 'urgent',
      icon: 'alert-triangle',
      message: 'Urgent priority - requires immediate attention'
    });
  }
  
  return insights;
}

/**
 * Suggest ticket assignment based on history
 * @param {string} organisationId - Organization ID
 * @param {string} contactId - Contact ID
 * @param {string} sector - Ticket sector
 * @returns {string|null} Suggested assignee user ID
 */
async function suggestAssignee(organisationId, contactId, sector) {
  try {
    // Find user who handled most tickets from this contact
    if (contactId) {
      const contactAssignee = await db.query(
        `SELECT assignee_id, COUNT(*) as ticket_count
         FROM tickets
         WHERE organisation_id = $1 
         AND contact_id = $2 
         AND assignee_id IS NOT NULL
         GROUP BY assignee_id
         ORDER BY ticket_count DESC
         LIMIT 1`,
        [organisationId, contactId]
      );
      
      if (contactAssignee.rows.length > 0) {
        return {
          userId: contactAssignee.rows[0].assignee_id,
          reason: 'Previously handled tickets from this contact',
          confidence: 0.8
        };
      }
    }
    
    // Find user who handles most tickets in this sector
    if (sector && sector !== 'None') {
      const sectorAssignee = await db.query(
        `SELECT assignee_id, COUNT(*) as ticket_count
         FROM tickets
         WHERE organisation_id = $1 
         AND sector = $2 
         AND assignee_id IS NOT NULL
         GROUP BY assignee_id
         ORDER BY ticket_count DESC
         LIMIT 1`,
        [organisationId, sector]
      );
      
      if (sectorAssignee.rows.length > 0) {
        return {
          userId: sectorAssignee.rows[0].assignee_id,
          reason: `Specializes in ${sector} tickets`,
          confidence: 0.6
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error suggesting assignee:', error);
    return null;
  }
}

module.exports = {
  autoFillFromContact,
  findSimilarTickets,
  getContactTicketStats,
  generateTicketInsights,
  suggestAssignee
};
