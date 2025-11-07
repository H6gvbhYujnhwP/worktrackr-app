// AI Contact Matching Helper
// Intelligently matches email senders to existing contacts or suggests new ones

const db = require('../../shared/db');

/**
 * Find matching contact for an email sender
 * @param {string} organisationId - Organization ID
 * @param {string} senderEmail - Email address from incoming email
 * @param {string} senderName - Name from incoming email (optional)
 * @returns {Object} { match: contact|null, confidence: number, suggestion: object|null }
 */
async function findMatchingContact(organisationId, senderEmail, senderName = '') {
  if (!senderEmail) {
    return { match: null, confidence: 0, suggestion: null };
  }

  // Step 1: Exact email match (highest confidence)
  const exactMatch = await db.query(
    `SELECT * FROM contacts 
     WHERE organisation_id = $1 
     AND LOWER(email) = LOWER($2)
     LIMIT 1`,
    [organisationId, senderEmail]
  );

  if (exactMatch.rows.length > 0) {
    return {
      match: exactMatch.rows[0],
      confidence: 1.0,
      suggestion: null,
      matchType: 'exact_email'
    };
  }

  // Step 2: Fuzzy name match (if sender name provided)
  if (senderName) {
    const nameMatch = await db.query(
      `SELECT *, 
       similarity(LOWER(name), LOWER($2)) as name_similarity
       FROM contacts 
       WHERE organisation_id = $1
       AND similarity(LOWER(name), LOWER($2)) > 0.6
       ORDER BY name_similarity DESC
       LIMIT 1`,
      [organisationId, senderName]
    );

    if (nameMatch.rows.length > 0) {
      const contact = nameMatch.rows[0];
      return {
        match: contact,
        confidence: contact.name_similarity,
        suggestion: null,
        matchType: 'fuzzy_name',
        warning: 'Email addresses differ - please verify this is the correct contact'
      };
    }
  }

  // Step 3: Domain match (same company)
  const domain = senderEmail.split('@')[1];
  const domainMatch = await db.query(
    `SELECT * FROM contacts 
     WHERE organisation_id = $1 
     AND email LIKE $2
     LIMIT 5`,
    [organisationId, `%@${domain}`]
  );

  if (domainMatch.rows.length > 0) {
    return {
      match: null,
      confidence: 0.5,
      suggestion: {
        type: 'new_contact_same_company',
        senderEmail,
        senderName,
        existingContacts: domainMatch.rows,
        message: `Found ${domainMatch.rows.length} existing contact(s) from ${domain}`
      },
      matchType: 'domain_match'
    };
  }

  // Step 4: No match - suggest creating new contact
  return {
    match: null,
    confidence: 0,
    suggestion: {
      type: 'new_contact',
      senderEmail,
      senderName,
      message: 'No matching contact found - create new?'
    },
    matchType: 'no_match'
  };
}

/**
 * Use AI (OpenAI) to extract structured contact info from email signature/body
 * @param {string} emailBody - Full email body text
 * @param {string} senderEmail - Sender email address
 * @param {string} senderName - Sender name
 * @returns {Object} Extracted contact information
 */
async function extractContactInfoWithAI(emailBody, senderEmail, senderName) {
  try {
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Extract contact information from this email. Return JSON only.

Email from: ${senderName} <${senderEmail}>
Email body:
${emailBody}

Extract and return JSON with these fields (use null if not found):
{
  "name": "Full name",
  "company": "Company name",
  "phone": "Phone number",
  "address": "Full address",
  "jobTitle": "Job title/position"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'You are a contact information extraction assistant. Extract structured data from emails and return valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 300
    });

    const extracted = JSON.parse(response.choices[0].message.content);
    
    // Merge with known info
    return {
      name: extracted.name || senderName || '',
      email: senderEmail,
      company: extracted.company || '',
      phone: extracted.phone || '',
      address: extracted.address || '',
      jobTitle: extracted.jobTitle || ''
    };
  } catch (error) {
    console.error('AI extraction failed:', error.message);
    // Fallback to basic info
    return {
      name: senderName || '',
      email: senderEmail,
      company: '',
      phone: '',
      address: '',
      jobTitle: ''
    };
  }
}

module.exports = {
  findMatchingContact,
  extractContactInfoWithAI
};
