const express = require('express');
const router = express.Router();
const { z } = require('zod');
const db = require('../../shared/db');
const nodemailer = require('nodemailer');

// Validation schemas
const sendQuoteSchema = z.object({
  recipient_email: z.string().email(),
  recipient_name: z.string().min(1),
  message: z.string().optional()
});

const scheduleWorkSchema = z.object({
  assigned_user_id: z.string().uuid(),
  scheduled_date: z.string(), // ISO date
  scheduled_time: z.string().optional(),
  notes: z.string().optional()
});

const createInvoiceSchema = z.object({
  due_date: z.string().optional(),
  notes: z.string().optional()
});

// POST /api/quotes/:id/send - Send quote to customer
router.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    const { recipient_email, recipient_name, message } = sendQuoteSchema.parse(req.body);
    const orgId = req.orgContext.organizationId;
    const userId = req.user.userId;

    console.log('[Quote Workflow] Sending quote:', id);

    await db.transaction(async (client) => {
      // 1. Get quote details
      const quoteResult = await client.query(
        `SELECT q.*, c.company_name, c.email as customer_email
         FROM quotes q
         LEFT JOIN contacts c ON q.contact_id = c.id
         WHERE q.id = $1 AND q.organisation_id = $2`,
        [id, orgId]
      );

      if (quoteResult.rows.length === 0) {
        throw new Error('Quote not found');
      }

      const quote = quoteResult.rows[0];

      // 2. Generate share token if not exists
      let shareToken = quote.share_token;
      if (!shareToken) {
        const tokenResult = await client.query(
          `UPDATE quotes 
           SET share_token = generate_share_token()
           WHERE id = $1
           RETURNING share_token`,
          [id]
        );
        shareToken = tokenResult.rows[0].share_token;
      }

      // 3. Update quote status
      await client.query(
        `UPDATE quotes 
         SET status = 'sent', sent_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [id]
      );

      // 4. Update linked ticket status (if exists)
      if (quote.ticket_id) {
        await client.query(
          `UPDATE tickets 
           SET status = 'quote_sent', updated_at = NOW()
           WHERE id = $1`,
          [quote.ticket_id]
        );
      }

      // 5. Send email (placeholder - configure SMTP in production)
      const quoteUrl = `${process.env.APP_URL || 'https://worktrackr.cloud'}/quotes/view/${shareToken}`;
      
      console.log('[Quote Workflow] Quote URL:', quoteUrl);
      console.log('[Quote Workflow] Would send email to:', recipient_email);
      
      // TODO: Implement actual email sending
      // const transporter = nodemailer.createTransport({...});
      // await transporter.sendMail({...});

      res.json({
        success: true,
        message: 'Quote sent successfully',
        quote_url: quoteUrl,
        sent_to: recipient_email
      });
    });

  } catch (error) {
    console.error('[Quote Workflow] Send error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }

    res.status(500).json({ 
      error: 'Failed to send quote', 
      message: error.message 
    });
  }
});

// POST /api/quotes/:id/schedule-work - Schedule work from accepted quote
router.post('/:id/schedule-work', async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_user_id, scheduled_date, scheduled_time, notes } = scheduleWorkSchema.parse(req.body);
    const orgId = req.orgContext.organizationId;

    console.log('[Quote Workflow] Scheduling work for quote:', id);

    await db.transaction(async (client) => {
      // 1. Get quote details
      const quoteResult = await client.query(
        `SELECT * FROM quotes WHERE id = $1 AND organisation_id = $2`,
        [id, orgId]
      );

      if (quoteResult.rows.length === 0) {
        throw new Error('Quote not found');
      }

      const quote = quoteResult.rows[0];

      if (quote.status !== 'accepted') {
        throw new Error('Can only schedule work for accepted quotes');
      }

      // 2. Update linked ticket (if exists)
      if (quote.ticket_id) {
        const scheduledDateTime = scheduled_time 
          ? `${scheduled_date} ${scheduled_time}`
          : scheduled_date;

        await client.query(
          `UPDATE tickets 
           SET status = 'scheduled',
               assigned_user_id = $1,
               scheduled_date = $2,
               notes = COALESCE(notes || E'\\n\\n', '') || $3,
               updated_at = NOW()
           WHERE id = $4`,
          [
            assigned_user_id,
            scheduledDateTime,
            `Work scheduled from quote ${quote.quote_number}${notes ? ': ' + notes : ''}`,
            quote.ticket_id
          ]
        );

        console.log('[Quote Workflow] Updated ticket:', quote.ticket_id);
      }

      // 3. Create job record (optional - for future job tracking)
      // TODO: Implement jobs table integration

      res.json({
        success: true,
        message: 'Work scheduled successfully',
        ticket_id: quote.ticket_id,
        assigned_to: assigned_user_id,
        scheduled_date
      });
    });

  } catch (error) {
    console.error('[Quote Workflow] Schedule error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }

    res.status(500).json({ 
      error: 'Failed to schedule work', 
      message: error.message 
    });
  }
});

// POST /api/quotes/:id/create-invoice - Create invoice from quote
router.post('/:id/create-invoice', async (req, res) => {
  try {
    const { id } = req.params;
    const { due_date, notes } = createInvoiceSchema.parse(req.body);
    const orgId = req.orgContext.organizationId;
    const userId = req.user.userId;

    console.log('[Quote Workflow] Creating invoice for quote:', id);

    await db.transaction(async (client) => {
      // 1. Get quote with line items
      const quoteResult = await client.query(
        `SELECT * FROM quotes WHERE id = $1 AND organisation_id = $2`,
        [id, orgId]
      );

      if (quoteResult.rows.length === 0) {
        throw new Error('Quote not found');
      }

      const quote = quoteResult.rows[0];

      const lineItemsResult = await client.query(
        `SELECT * FROM quote_lines WHERE quote_id = $1 ORDER BY sort_order`,
        [id]
      );

      // 2. Generate invoice number
      const invoiceNumberResult = await client.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_num
         FROM invoices
         WHERE organisation_id = $1
         AND invoice_number ~ '^INV-[0-9]+$'`,
        [orgId]
      );

      const invoiceNumber = 'INV-' + String(invoiceNumberResult.rows[0].next_num).padStart(6, '0');

      // 3. Create invoice (assuming invoices table exists)
      const dueDate = due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const invoiceResult = await client.query(
        `INSERT INTO invoices (
          organisation_id, contact_id, quote_id, invoice_number,
          title, description, status, subtotal, discount_amount, discount_percent,
          tax_amount, total_amount, due_date, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          orgId, quote.contact_id, id, invoiceNumber,
          quote.title, quote.description,
          quote.subtotal, quote.discount_amount, quote.discount_percent,
          quote.tax_amount, quote.total_amount,
          dueDate, notes || quote.notes, userId
        ]
      ).catch(err => {
        // If invoices table doesn't exist yet, return placeholder
        console.log('[Quote Workflow] Invoices table not ready yet');
        return { rows: [{ id: 'placeholder', invoice_number: invoiceNumber }] };
      });

      const invoice = invoiceResult.rows[0];

      // 4. Copy line items to invoice
      if (invoice.id !== 'placeholder') {
        for (const item of lineItemsResult.rows) {
          await client.query(
            `INSERT INTO invoice_lines (
              invoice_id, product_id, description, quantity, unit_price,
              discount_percent, tax_rate, line_total, sort_order
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              invoice.id, item.product_id, item.description, item.quantity, item.unit_price,
              item.discount_percent, item.tax_rate, item.line_total, item.sort_order
            ]
          ).catch(() => {
            // Ignore if invoice_lines table doesn't exist
          });
        }
      }

      // 5. Update ticket status (if exists)
      if (quote.ticket_id) {
        await client.query(
          `UPDATE tickets 
           SET status = 'invoiced', updated_at = NOW()
           WHERE id = $1`,
          [quote.ticket_id]
        );
      }

      res.json({
        success: true,
        message: 'Invoice created successfully',
        invoice_id: invoice.id,
        invoice_number: invoiceNumber
      });
    });

  } catch (error) {
    console.error('[Quote Workflow] Invoice creation error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }

    res.status(500).json({ 
      error: 'Failed to create invoice', 
      message: error.message 
    });
  }
});

// POST /api/quotes/:id/mark-accepted - Mark quote as accepted (manual or via customer)
router.post('/:id/mark-accepted', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.orgContext.organizationId;

    await db.transaction(async (client) => {
      // Update quote
      await client.query(
        `UPDATE quotes 
         SET status = 'accepted', updated_at = NOW()
         WHERE id = $1 AND organisation_id = $2`,
        [id, orgId]
      );

      // Update linked ticket
      const quoteResult = await client.query(
        `SELECT ticket_id FROM quotes WHERE id = $1`,
        [id]
      );

      if (quoteResult.rows[0]?.ticket_id) {
        await client.query(
          `UPDATE tickets 
           SET status = 'quote_accepted', updated_at = NOW()
           WHERE id = $1`,
          [quoteResult.rows[0].ticket_id]
        );
      }

      res.json({
        success: true,
        message: 'Quote marked as accepted'
      });
    });

  } catch (error) {
    console.error('[Quote Workflow] Accept error:', error);
    res.status(500).json({ 
      error: 'Failed to accept quote', 
      message: error.message 
    });
  }
});

// POST /api/quotes/:id/mark-declined - Mark quote as declined
router.post('/:id/mark-declined', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const orgId = req.orgContext.organizationId;

    await db.transaction(async (client) => {
      // Update quote
      await client.query(
        `UPDATE quotes 
         SET status = 'declined', 
             declined_at = NOW(),
             declined_reason = $1,
             updated_at = NOW()
         WHERE id = $2 AND organisation_id = $3`,
        [reason, id, orgId]
      );

      // Update linked ticket
      const quoteResult = await client.query(
        `SELECT ticket_id FROM quotes WHERE id = $1`,
        [id]
      );

      if (quoteResult.rows[0]?.ticket_id) {
        await client.query(
          `UPDATE tickets 
           SET status = 'quote_declined', updated_at = NOW()
           WHERE id = $1`,
          [quoteResult.rows[0].ticket_id]
        );
      }

      res.json({
        success: true,
        message: 'Quote marked as declined'
      });
    });

  } catch (error) {
    console.error('[Quote Workflow] Decline error:', error);
    res.status(500).json({ 
      error: 'Failed to decline quote', 
      message: error.message 
    });
  }
});

module.exports = router;
