const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { query, getOrgContext } = require('@worktrackr/shared/db');

// Validation schemas
const contactSchema = z.object({
  type: z.enum(['company', 'individual']).default('company'),
  name: z.string().min(1, 'Name is required'),
  displayName: z.string().optional(),
  primaryContact: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  addresses: z.array(z.any()).default([]),
  accounting: z.object({
    xeroContactId: z.string().optional().nullable(),
    quickbooksContactId: z.string().optional().nullable(),
    taxNumber: z.string().optional(),
    paymentTerms: z.string().optional(),
    currency: z.string().default('GBP'),
    accountCode: z.string().optional(),
    creditLimit: z.number().optional().default(0),
    discountRate: z.number().optional().default(0)
  }).optional().default({}),
  crm: z.object({
    status: z.enum(['active', 'inactive', 'at_risk', 'prospect', 'archived']).default('prospect'),
    // Sales pipeline stage (Phase 1) — kept separate from `status` (customer health).
    // New → Prospect → Hot Prospect → Customer.
    salesStage: z.enum(['new', 'prospect', 'hot_prospect', 'customer']).optional(),
    // Leads workflow fields (stored on the company's crm JSONB, like salesStage).
    firstContact: z.string().optional().nullable(),   // date first actually spoke (yyyy-mm-dd)
    chaseDate: z.string().optional().nullable(),       // date to next chase (yyyy-mm-dd)
    nextAction: z.string().optional(),                 // free text, e.g. "Call back"
    archived: z.boolean().optional().default(false),   // archived leads are hidden from salesmen
    archivedAt: z.string().optional().nullable(),
    lastActivity: z.string().optional().nullable(),
    nextCRMEvent: z.string().optional().nullable(),
    renewalsCount: z.number().optional().default(0),
    openOppsCount: z.number().optional().default(0),
    totalProfit: z.number().optional().default(0),
    assignedTo: z.string().optional().nullable(),
    source: z.string().optional(),
    industry: z.string().optional(),
    companySize: z.string().optional()
  }).optional().default({}),
  contactPersons: z.array(z.any()).default([]),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  customFields: z.object({}).optional().default({})
}).strict(false);

// ─── Response normaliser ───────────────────────────────────────────────────────
// DB columns are snake_case; the frontend expects camelCase throughout.
// Every row returned from the DB must pass through this before being sent to
// the client, otherwise:
//   1. Edit forms open with blank fields (contact.primaryContact = undefined)
//   2. contactPersons gets silently wiped to [] on every save because
//      JSON.stringify omits undefined, Zod's default([]) fills it, and the
//      UPDATE then writes contact_persons = '[]' to the DB.
function mapContact(row) {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    displayName: row.display_name || '',
    primaryContact: row.primary_contact || '',
    email: row.email || '',
    phone: row.phone || '',
    website: row.website || '',
    addresses: row.addresses || [],
    accounting: row.accounting || {},
    crm: row.crm || {},
    contactPersons: row.contact_persons || [],
    tags: row.tags || [],
    notes: row.notes || '',
    customFields: row.custom_fields || {},
    organisationId: row.organisation_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/contacts - Get all contacts for the organization
// Optional filters: ?type=company|individual  ?stage=new|prospect|hot_prospect|customer
router.get('/', async (req, res) => {
  try {
    const orgContext = await getOrgContext(req.user.userId);
    const organizationId = orgContext.organizationId;

    const conditions = ['organisation_id = $1'];
    const params = [organizationId];
    if (req.query.type) {
      params.push(req.query.type);
      conditions.push(`"type" = $${params.length}`);
    }
    if (req.query.stage) {
      params.push(req.query.stage);
      conditions.push(`crm->>'salesStage' = $${params.length}`);
    }

    // Archive visibility: archived records are hidden from everyone by default;
    // only managers/admins can request the archived set (?archived=only).
    const role = orgContext.role;
    const isManager = ['admin', 'manager', 'owner', 'partner_admin'].includes(role);
    if (req.query.archived === 'only') {
      if (!isManager) return res.json([]); // non-managers never see archived
      conditions.push(`crm->>'archived' = 'true'`);
    } else {
      conditions.push(`(crm->>'archived' IS DISTINCT FROM 'true')`);
    }

    const result = await query(
      `SELECT * FROM contacts WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      params
    );

    res.json(result.rows.map(mapContact));
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// GET /api/contacts/statistics - Get contact statistics
router.get('/statistics', async (req, res) => {
  try {
    const orgContext = await getOrgContext(req.user.userId);
    const organizationId = orgContext.organizationId;

    const result = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE (crm->>'status')::text = 'active') as active,
        COUNT(*) FILTER (WHERE (crm->>'status')::text = 'prospect') as prospects,
        COUNT(*) FILTER (WHERE (crm->>'status')::text = 'at_risk') as "atRisk",
        COUNT(*) FILTER (WHERE "type" = 'company') as companies,
        COUNT(*) FILTER (WHERE "type" = 'individual') as individuals,
        COALESCE(SUM((crm->>'totalProfit')::numeric), 0) as "totalProfit",
        COALESCE(SUM((crm->>'renewalsCount')::numeric), 0) as "totalRenewals",
        COALESCE(SUM((crm->>'openOppsCount')::numeric), 0) as "totalOpportunities"
       FROM contacts WHERE organisation_id = $1`,
      [organizationId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching contact statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/contacts/:id - Get a single contact
router.get('/:id', async (req, res) => {
  try {
    const orgContext = await getOrgContext(req.user.userId);
    const organizationId = orgContext.organizationId;
    const { id } = req.params;

    const result = await query(
      `SELECT * FROM contacts WHERE id = $1 AND organisation_id = $2`,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(mapContact(result.rows[0]));
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// GET /api/contacts/:id/history - activity timeline for a company
// Aggregates CRM events (calls, meetings, etc.) and completed tasks, newest first.
router.get('/:id/history', async (req, res) => {
  try {
    const { organizationId } = await getOrgContext(req.user.userId);
    const { id } = req.params;

    const events = await query(
      `SELECT e.id, e.type, e.title, e.start_at AS at, u.name AS actor
         FROM crm_events e
         LEFT JOIN users u ON u.id = COALESCE(e.created_by, e.assigned_user_id)
        WHERE e.contact_id = $1 AND e.organisation_id = $2`,
      [id, organizationId]
    );

    const doneTasks = await query(
      `SELECT t.id, t.title, t.completed_at AS at, u.name AS actor
         FROM tasks t
         LEFT JOIN users u ON u.id = COALESCE(t.assigned_user_id, t.created_by)
        WHERE t.contact_id = $1 AND t.organisation_id = $2 AND t.status = 'done'`,
      [id, organizationId]
    );

    // Notes + logged emails (own store; also shown on the profile timeline).
    // Wrapped so a missing table (pre-migration) never breaks history.
    let noteRows = [];
    try {
      const notes = await query(
        `SELECT n.id, n.kind, n.subject, n.body, n.created_at AS at, u.name AS actor
           FROM contact_notes n
           LEFT JOIN users u ON u.id = n.created_by
          WHERE n.contact_id = $1 AND n.organisation_id = $2`,
        [id, organizationId]
      );
      noteRows = notes.rows;
    } catch (e) {
      noteRows = [];
    }

    const items = [
      ...events.rows.map((r) => ({ id: `e_${r.id}`, kind: r.type || 'other', title: r.title, actor: r.actor || null, at: r.at })),
      ...doneTasks.rows.map((r) => ({ id: `t_${r.id}`, kind: 'task', title: r.title, actor: r.actor || null, at: r.at })),
      ...noteRows.map((r) => ({
        id: `n_${r.id}`,
        kind: r.kind,
        title: r.kind === 'email' ? (r.subject || 'Email') : (r.body || ''),
        body: r.body || '',
        subject: r.subject || '',
        actor: r.actor || null,
        at: r.at,
      })),
    ]
      .filter((x) => x.at)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 50);

    res.json(items);
  } catch (error) {
    console.error('Error fetching contact history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// POST /api/contacts/:id/notes - add a note or logged email to a company.
// Body: { kind?: 'note'|'email', body?, subject? }. Appears in the timeline.
router.post('/:id/notes', async (req, res) => {
  try {
    const { organizationId } = await getOrgContext(req.user.userId);
    const { id } = req.params;
    const kind = req.body?.kind === 'email' ? 'email' : 'note';
    const body = String(req.body?.body || '').trim();
    const subject = String(req.body?.subject || '').trim();
    if (!body && !subject) return res.status(400).json({ error: 'Nothing to save' });

    const r = await query(
      `INSERT INTO contact_notes (organisation_id, contact_id, kind, subject, body, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [organizationId, id, kind, subject || null, body, req.user.userId]
    );
    res.status(201).json({ id: r.rows[0].id, created_at: r.rows[0].created_at });
  } catch (error) {
    console.error('Error adding contact note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// POST /api/contacts - Create a new contact
// POST /api/contacts/import — bulk-create companies/people from a parsed CSV.
// Body: { type: 'company'|'individual', rows: [{name,email,phone,primaryContact,website,notes,salesStage}] }
// Skips duplicates by name or email (against existing org contacts and within the file).
router.post('/import', async (req, res) => {
  try {
    const orgContext = await getOrgContext(req.user.userId);
    const organizationId = orgContext.organizationId;
    const type = req.body?.type === 'individual' ? 'individual' : 'company';
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (rows.length === 0) return res.status(400).json({ error: 'No rows to import' });
    if (rows.length > 5000) return res.status(400).json({ error: 'Too many rows (max 5000)' });

    const existing = await query('SELECT lower(name) AS name, lower(email) AS email FROM contacts WHERE organisation_id = $1', [organizationId]);
    const haveName = new Set(existing.rows.map((r) => r.name).filter(Boolean));
    const haveEmail = new Set(existing.rows.map((r) => r.email).filter(Boolean));
    const seenName = new Set();
    const seenEmail = new Set();
    const VALID_STAGES = ['new', 'prospect', 'hot_prospect', 'customer'];

    let created = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const name = String(row.name || '').trim();
      const email = String(row.email || '').trim();
      const emailKey = email.toLowerCase();
      const nameKey = name.toLowerCase();
      if (!name) { errors.push({ row: i + 1, error: 'Missing name' }); continue; }
      const dup = haveName.has(nameKey) || (emailKey && haveEmail.has(emailKey)) || seenName.has(nameKey) || (emailKey && seenEmail.has(emailKey));
      if (dup) { skipped++; continue; }
      seenName.add(nameKey);
      if (emailKey) seenEmail.add(emailKey);

      const crm = {};
      let stage = String(row.salesStage || '').trim().toLowerCase().replace(/\s+/g, '_');
      if (stage === 'suspect') stage = 'new'; // legacy alias from older imports/spreadsheets
      if (VALID_STAGES.includes(stage)) crm.salesStage = stage;

      try {
        await query(
          `INSERT INTO contacts (organisation_id, "type", name, display_name, primary_contact, email, phone, website, crm, notes, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [organizationId, type, name, name, String(row.primaryContact || ''), email, String(row.phone || ''), String(row.website || ''), JSON.stringify(crm), String(row.notes || ''), req.user.userId]
        );
        created++;
      } catch (e) {
        errors.push({ row: i + 1, error: 'Could not save' });
      }
    }

    res.json({ created, skipped, errors, total: rows.length });
  } catch (error) {
    console.error('Error importing contacts:', error);
    res.status(500).json({ error: 'Failed to import contacts' });
  }
});

router.post('/', async (req, res) => {
  try {
    const orgContext = await getOrgContext(req.user.userId);
    const organizationId = orgContext.organizationId;

    const validatedData = contactSchema.parse(req.body);

    const result = await query(
      `INSERT INTO contacts (
        organisation_id, "type", name, display_name, primary_contact, email, phone, website,
        addresses, accounting, crm, contact_persons, tags, notes, custom_fields, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        organizationId,
        validatedData.type,
        validatedData.name,
        validatedData.displayName || validatedData.name,
        validatedData.primaryContact || '',
        validatedData.email || '',
        validatedData.phone || '',
        validatedData.website || '',
        JSON.stringify(validatedData.addresses),
        JSON.stringify(validatedData.accounting),
        JSON.stringify(validatedData.crm),
        JSON.stringify(validatedData.contactPersons),
        validatedData.tags,
        validatedData.notes || '',
        JSON.stringify(validatedData.customFields),
        req.user.userId
      ]
    );

    res.status(201).json(mapContact(result.rows[0]));
  } catch (error) {
    console.error('Error creating contact:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// PUT /api/contacts/:id - Update a contact
router.put('/:id', async (req, res) => {
  try {
    const orgContext = await getOrgContext(req.user.userId);
    const organizationId = orgContext.organizationId;
    const { id } = req.params;

    // Verify contact exists and belongs to organization
    const checkResult = await query(
      `SELECT id FROM contacts WHERE id = $1 AND organisation_id = $2`,
      [id, organizationId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Parse with Zod, then strip any keys absent from the request body.
    // Without this, Zod's .default([]) / .default({}) silently fills absent
    // array/object fields, causing the UPDATE to overwrite real DB data
    // (e.g. contactPersons → [] wipes all contact people on every save).
    const presentKeys = new Set(Object.keys(req.body));
    const parsedFull = contactSchema.partial().parse(req.body);
    const validatedData = {};
    for (const key of Object.keys(parsedFull)) {
      if (presentKeys.has(key)) validatedData[key] = parsedFull[key];
    }

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (validatedData.type !== undefined) {
      updateFields.push(`"type" = $${paramIndex++}`);
      updateValues.push(validatedData.type);
    }
    if (validatedData.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(validatedData.name);
    }
    if (validatedData.displayName !== undefined) {
      updateFields.push(`display_name = $${paramIndex++}`);
      updateValues.push(validatedData.displayName);
    }
    if (validatedData.primaryContact !== undefined) {
      updateFields.push(`primary_contact = $${paramIndex++}`);
      updateValues.push(validatedData.primaryContact);
    }
    if (validatedData.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(validatedData.email);
    }
    if (validatedData.phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`);
      updateValues.push(validatedData.phone);
    }
    if (validatedData.website !== undefined) {
      updateFields.push(`website = $${paramIndex++}`);
      updateValues.push(validatedData.website);
    }
    if (validatedData.addresses !== undefined) {
      updateFields.push(`addresses = $${paramIndex++}`);
      updateValues.push(JSON.stringify(validatedData.addresses));
    }
    if (validatedData.accounting !== undefined) {
      updateFields.push(`accounting = $${paramIndex++}`);
      updateValues.push(JSON.stringify(validatedData.accounting));
    }
    if (validatedData.crm !== undefined) {
      updateFields.push(`crm = $${paramIndex++}`);
      updateValues.push(JSON.stringify(validatedData.crm));
    }
    if (validatedData.contactPersons !== undefined) {
      updateFields.push(`contact_persons = $${paramIndex++}`);
      updateValues.push(JSON.stringify(validatedData.contactPersons));
    }
    if (validatedData.tags !== undefined) {
      updateFields.push(`tags = $${paramIndex++}`);
      updateValues.push(validatedData.tags);
    }
    if (validatedData.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      updateValues.push(validatedData.notes);
    }
    if (validatedData.customFields !== undefined) {
      updateFields.push(`custom_fields = $${paramIndex++}`);
      updateValues.push(JSON.stringify(validatedData.customFields));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(id, organizationId);

    const result = await query(
      `UPDATE contacts SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex++} AND organisation_id = $${paramIndex++}
       RETURNING *`,
      updateValues
    );

    res.json(mapContact(result.rows[0]));
  } catch (error) {
    console.error('Error updating contact:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// DELETE /api/contacts/:id - Delete a contact
router.delete('/:id', async (req, res) => {
  try {
    const orgContext = await getOrgContext(req.user.userId);
    const organizationId = orgContext.organizationId;
    const { id } = req.params;

    const result = await query(
      `DELETE FROM contacts WHERE id = $1 AND organisation_id = $2 RETURNING id`,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

module.exports = router;
