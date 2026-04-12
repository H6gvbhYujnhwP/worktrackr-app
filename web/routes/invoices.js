// web/routes/invoices.js
// Invoices module — aligned to live DB schema (pre-existing tables).
//
// Live column names that differ from the original plan:
//   tax_amount     (not vat_total)
//   total_amount   (not total)
//   balance_due    (total_amount - amount_paid, must be written on INSERT)
//   tax_rate       on invoice_lines (not vat_applicable boolean)
//   contact_id     is NOT NULL on invoices — required on every INSERT
//   due_date       is NOT NULL on invoices — defaults to +30 days if omitted
//   created_by     written from req.user.userId
//
// Status constraint (live): draft | sent | viewed | paid |
//                           partially_paid | overdue | cancelled | refunded

const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const db = require('../../shared/db');

const VALID_STATUSES = [
  'draft', 'sent', 'viewed', 'paid',
  'partially_paid', 'overdue', 'cancelled', 'refunded',
];

// ---------------------------------------------------------------------------
// Helper: fetch full invoice with lines, contact name, job reference
// ---------------------------------------------------------------------------
async function fetchFullInvoice(invoiceId, organizationId) {
  const invoiceResult = await db.query(
    `SELECT
       i.*,
       c.name          AS contact_name,
       c.email         AS contact_email,
       c.phone         AS contact_phone,
       j.job_number,
       j.title         AS job_title
     FROM invoices i
     LEFT JOIN contacts c ON i.contact_id = c.id
     LEFT JOIN jobs    j ON i.job_id = j.id
     WHERE i.id = $1 AND i.organisation_id = $2`,
    [invoiceId, organizationId]
  );
  if (invoiceResult.rows.length === 0) return null;

  const invoice = invoiceResult.rows[0];

  const linesResult = await db.query(
    `SELECT * FROM invoice_lines
     WHERE invoice_id = $1
     ORDER BY sort_order, created_at`,
    [invoiceId]
  );
  invoice.lines = linesResult.rows;
  return invoice;
}

// ---------------------------------------------------------------------------
// Helper: generate next invoice number for org
// ---------------------------------------------------------------------------
async function generateInvoiceNumber(client, organizationId) {
  const result = await client.query(
    `SELECT generate_invoice_number($1) AS invoice_number`,
    [organizationId]
  );
  return result.rows[0].invoice_number;
}

// ---------------------------------------------------------------------------
// Helper: default due_date to issue_date + 30 days
// ---------------------------------------------------------------------------
function defaultDueDate(issueDate) {
  const d = issueDate ? new Date(issueDate) : new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// GET /api/invoices
// List invoices for org. Optional ?status= filter. Ordered by created_at DESC.
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { status } = req.query;

    const params = [organizationId];
    let statusClause = '';

    if (status) {
      params.push(status);
      statusClause = `AND i.status = $${params.length}`;
    }

    const result = await db.query(
      `SELECT
         i.*,
         c.name     AS contact_name,
         j.job_number,
         j.title    AS job_title
       FROM invoices i
       LEFT JOIN contacts c ON i.contact_id = c.id
       LEFT JOIN jobs    j ON i.job_id = j.id
       WHERE i.organisation_id = $1 ${statusClause}
       ORDER BY i.created_at DESC`,
      params
    );

    res.json({ invoices: result.rows });
  } catch (error) {
    console.error('Error listing invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/invoices/:id
// Single invoice with lines, contact name, job reference.
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.orgContext;

    const invoice = await fetchFullInvoice(id, organizationId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/invoices
// Create invoice. When job_id supplied: copies parts + time entries as lines.
// contact_id is NOT NULL — must be resolved from body or job row.
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { organizationId } = req.orgContext;
    const { userId } = req.user;
    const { job_id, contact_id, issue_date, due_date, notes } = req.body;

    await client.query('BEGIN');

    // ── Resolve contact_id from job if not supplied ──────────────────────
    let resolvedContactId = contact_id || null;
    let jobRow = null;

    if (job_id) {
      const jobResult = await client.query(
        `SELECT * FROM jobs WHERE id = $1 AND organisation_id = $2`,
        [job_id, organizationId]
      );
      if (jobResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Job not found' });
      }
      jobRow = jobResult.rows[0];
      if (!resolvedContactId) resolvedContactId = jobRow.contact_id || null;
    }

    // contact_id is NOT NULL in the live schema
    if (!resolvedContactId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'contact_id is required. Supply it directly or via a job_id that has a contact.',
      });
    }

    // ── Dates ────────────────────────────────────────────────────────────
    const resolvedIssueDate = issue_date || new Date().toISOString().slice(0, 10);
    const resolvedDueDate   = due_date   || defaultDueDate(resolvedIssueDate);

    // ── Generate invoice number ──────────────────────────────────────────
    const invoiceNumber = await generateInvoiceNumber(client, organizationId);

    // ── Build line items from job parts + time entries ───────────────────
    const lineItems = [];

    if (job_id) {
      // Parts
      const partsResult = await client.query(
        `SELECT * FROM job_parts WHERE job_id = $1 ORDER BY created_at`,
        [job_id]
      );
      partsResult.rows.forEach((part, idx) => {
        const qty       = parseFloat(part.quantity)   || 1;
        const unitPrice = parseFloat(part.unit_price) || 0;
        lineItems.push({
          description: part.description,
          quantity:    qty,
          unit_price:  unitPrice,
          tax_rate:    20,
          line_total:  parseFloat((qty * unitPrice).toFixed(2)),
          sort_order:  idx,
        });
      });

      // Time entries (labour)
      const timeResult = await client.query(
        `SELECT * FROM job_time_entries WHERE job_id = $1 ORDER BY created_at`,
        [job_id]
      );
      const offset = lineItems.length;
      timeResult.rows.forEach((entry, idx) => {
        const hours     = parseFloat(entry.duration_minutes || 0) / 60;
        const rate      = parseFloat(entry.hourly_rate || 0);
        const qty       = parseFloat(hours.toFixed(2));
        const label     = entry.description ? `Labour: ${entry.description}` : 'Labour';
        lineItems.push({
          description: label,
          quantity:    qty,
          unit_price:  rate,
          tax_rate:    20,
          line_total:  parseFloat((qty * rate).toFixed(2)),
          sort_order:  offset + idx,
        });
      });
    }

    // ── Calculate totals ─────────────────────────────────────────────────
    const subtotal   = lineItems.reduce((s, l) => s + l.line_total, 0);
    const taxAmount  = lineItems.reduce((s, l) => s + l.line_total * ((l.tax_rate || 20) / 100), 0);
    const totalAmount = subtotal + taxAmount;
    const balanceDue  = totalAmount; // nothing paid yet

    // ── Insert invoice ────────────────────────────────────────────────────
    const invoiceResult = await client.query(
      `INSERT INTO invoices (
         organisation_id, contact_id, job_id, invoice_number,
         issue_date, due_date,
         subtotal, tax_amount, total_amount,
         balance_due, amount_paid,
         notes, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        organizationId,
        resolvedContactId,
        job_id         || null,
        invoiceNumber,
        resolvedIssueDate,
        resolvedDueDate,
        parseFloat(subtotal.toFixed(2)),
        parseFloat(taxAmount.toFixed(2)),
        parseFloat(totalAmount.toFixed(2)),
        parseFloat(balanceDue.toFixed(2)),
        0,
        notes || null,
        userId,
      ]
    );
    const invoice = invoiceResult.rows[0];

    // ── Insert lines ──────────────────────────────────────────────────────
    for (const line of lineItems) {
      await client.query(
        `INSERT INTO invoice_lines (
           invoice_id, description, quantity, unit_price,
           tax_rate, line_total, sort_order
         ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          invoice.id,
          line.description,
          line.quantity,
          line.unit_price,
          line.tax_rate,
          line.line_total,
          line.sort_order,
        ]
      );
    }

    // ── Mark job as converted ─────────────────────────────────────────────
    if (job_id) {
      await client.query(
        `UPDATE jobs
         SET converted_to_invoice_id = $1, updated_at = NOW()
         WHERE id = $2`,
        [invoice.id, job_id]
      );
    }

    await client.query('COMMIT');

    const full = await fetchFullInvoice(invoice.id, organizationId);
    res.status(201).json({ invoice: full });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice', message: error.message });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// PUT /api/invoices/:id
// Allowed fields: status, due_date, notes, invoice_number.
// Explicit field writes only — no silent defaults.
// ---------------------------------------------------------------------------
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.orgContext;

    if (
      req.body.status !== undefined &&
      !VALID_STATUSES.includes(req.body.status)
    ) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const ALLOWED = ['status', 'due_date', 'notes', 'invoice_number'];
    const updates = [];
    const values  = [];
    let   idx     = 1;

    for (const field of ALLOWED) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates.push(`${field} = $${idx}`);
        values.push(req.body[field]);
        idx++;
      }
    }

    // Track sent_at / paid_at timestamps automatically
    if (req.body.status === 'sent') {
      updates.push(`sent_at = NOW()`);
    }
    if (req.body.status === 'paid') {
      updates.push(`paid_at = NOW()`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updatable fields supplied' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id, organizationId);

    const result = await db.query(
      `UPDATE invoices
       SET ${updates.join(', ')}
       WHERE id = $${idx} AND organisation_id = $${idx + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const full = await fetchFullInvoice(id, organizationId);
    res.json({ invoice: full });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/invoices/:id
// Nulls jobs.converted_to_invoice_id, then deletes (lines cascade).
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { organizationId } = req.orgContext;

    await client.query('BEGIN');

    await client.query(
      `UPDATE jobs
       SET converted_to_invoice_id = NULL, updated_at = NOW()
       WHERE converted_to_invoice_id = $1`,
      [id]
    );

    const result = await client.query(
      `DELETE FROM invoices
       WHERE id = $1 AND organisation_id = $2
       RETURNING id, invoice_number`,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Invoice deleted', invoice: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// GET /api/invoices/:id/pdf
// ---------------------------------------------------------------------------
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.orgContext;

    const invoice = await fetchFullInvoice(id, organizationId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    const lines = invoice.lines || [];

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${invoice.invoice_number}.pdf`
    );
    doc.pipe(res);

    // ── Header ────────────────────────────────────────────────────────────
    doc.fontSize(24).text('WorkTrackr Cloud', { align: 'left' });
    doc.fontSize(10).text('Custom Workflows. Zero Hassle.', { align: 'left' });
    doc.moveDown();
    doc.fontSize(20).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
    doc.moveDown();

    // ── Meta block ────────────────────────────────────────────────────────
    const leftX  = 50;
    const rightX = 350;
    let   yPos   = doc.y;

    doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', leftX, yPos);
    doc.font('Helvetica').fontSize(10);
    doc.text(invoice.contact_name || 'N/A', leftX, yPos + 15);
    if (invoice.contact_email) doc.text(invoice.contact_email, leftX);
    if (invoice.contact_phone) doc.text(invoice.contact_phone, leftX);

    doc.fontSize(10).font('Helvetica-Bold').text('Invoice Number:', rightX, yPos);
    doc.font('Helvetica').text(invoice.invoice_number, rightX + 110, yPos);

    doc.font('Helvetica-Bold').text('Issue Date:', rightX, yPos + 15);
    doc.font('Helvetica').text(pdfDate(invoice.issue_date), rightX + 110, yPos + 15);

    doc.font('Helvetica-Bold').text('Due Date:', rightX, yPos + 30);
    doc.font('Helvetica').text(pdfDate(invoice.due_date), rightX + 110, yPos + 30);

    doc.font('Helvetica-Bold').text('Status:', rightX, yPos + 45);
    doc.font('Helvetica').text(capitalise(invoice.status), rightX + 110, yPos + 45);

    if (invoice.job_number) {
      doc.font('Helvetica-Bold').text('Job Reference:', rightX, yPos + 60);
      doc.font('Helvetica').text(invoice.job_number, rightX + 110, yPos + 60);
    }

    doc.moveDown(4);

    // ── Line items table ──────────────────────────────────────────────────
    const tableTop = doc.y;
    const descX  = 50;
    const qtyX   = 320;
    const priceX = 375;
    const vatX   = 440;
    const totalX = 470;
    const pageW  = 545;

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Description', descX,  tableTop, { width: 265 });
    doc.text('Qty',         qtyX,   tableTop, { width: 50,  align: 'right' });
    doc.text('Unit Price',  priceX, tableTop, { width: 60,  align: 'right' });
    doc.text('VAT',         vatX,   tableTop, { width: 25,  align: 'center' });
    doc.text('Total',       totalX, tableTop, { width: 70,  align: 'right' });

    doc.moveTo(descX, tableTop + 14).lineTo(pageW, tableTop + 14).lineWidth(0.5).stroke();

    let rowY = tableTop + 22;
    doc.font('Helvetica').fontSize(9);

    lines.forEach((line) => {
      if (rowY > 680) { doc.addPage(); rowY = 50; }

      const qty       = parseFloat(line.quantity)   || 0;
      const unitPrice = parseFloat(line.unit_price) || 0;
      const lineTotal = parseFloat(line.line_total) || qty * unitPrice;
      const taxRate   = line.tax_rate != null ? parseFloat(line.tax_rate) : 20;
      const vatLabel  = taxRate > 0 ? `${taxRate}%` : '—';
      const descH     = doc.heightOfString(line.description, { width: 265 });
      const rowH      = Math.max(descH, 14) + 4;

      doc.text(line.description,
                                            descX,  rowY, { width: 265 });
      doc.text(qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2),
                                            qtyX,   rowY, { width: 50,  align: 'right' });
      doc.text(`£${unitPrice.toFixed(2)}`,  priceX, rowY, { width: 60,  align: 'right' });
      doc.text(vatLabel,                    vatX,   rowY, { width: 25,  align: 'center' });
      doc.text(`£${lineTotal.toFixed(2)}`,  totalX, rowY, { width: 70,  align: 'right' });

      rowY += rowH + 4;
    });

    // ── Totals block ──────────────────────────────────────────────────────
    doc.moveTo(priceX, rowY).lineTo(pageW, rowY).lineWidth(0.5).stroke();
    rowY += 8;

    const subtotal    = parseFloat(invoice.subtotal)     || 0;
    const taxAmount   = parseFloat(invoice.tax_amount)   || 0;
    const totalAmount = parseFloat(invoice.total_amount) || 0;
    const amountPaid  = parseFloat(invoice.amount_paid)  || 0;
    const balanceDue  = parseFloat(invoice.balance_due)  || 0;

    const labelX = 350;
    const valX   = 460;
    const valW   = 80;

    doc.font('Helvetica').fontSize(9);
    doc.text('Subtotal (ex VAT):', labelX, rowY, { width: 105 });
    doc.text(`£${subtotal.toFixed(2)}`,    valX, rowY, { width: valW, align: 'right' });
    rowY += 16;

    doc.text('VAT:', labelX, rowY, { width: 105 });
    doc.text(`£${taxAmount.toFixed(2)}`,   valX, rowY, { width: valW, align: 'right' });
    rowY += 16;

    doc.moveTo(labelX, rowY).lineTo(pageW, rowY).lineWidth(0.5).stroke();
    rowY += 6;

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('Total (inc VAT):', labelX, rowY, { width: 105 });
    doc.text(`£${totalAmount.toFixed(2)}`, valX, rowY, { width: valW, align: 'right' });
    rowY += 20;

    if (amountPaid > 0) {
      doc.font('Helvetica').fontSize(9);
      doc.text('Amount Paid:', labelX, rowY, { width: 105 });
      doc.text(`£${amountPaid.toFixed(2)}`, valX, rowY, { width: valW, align: 'right' });
      rowY += 16;

      doc.font('Helvetica-Bold');
      doc.text('Balance Due:', labelX, rowY, { width: 105 });
      doc.text(`£${balanceDue.toFixed(2)}`, valX, rowY, { width: valW, align: 'right' });
      rowY += 16;
    }

    // ── Notes ─────────────────────────────────────────────────────────────
    if (invoice.notes) {
      rowY += 30;
      if (rowY > 650) { doc.addPage(); rowY = 50; }
      doc.fontSize(12).font('Helvetica-Bold').text('Notes', descX, rowY);
      rowY += 15;
      doc.fontSize(9).font('Helvetica').text(invoice.notes, descX, rowY, { width: 500 });
    }

    // ── Footer ────────────────────────────────────────────────────────────
    doc.fontSize(8).text(
      `Generated on ${new Date().toLocaleDateString('en-GB')} | WorkTrackr Cloud`,
      50, 750, { align: 'center', width: 500 }
    );

    doc.end();
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF', message: error.message });
    }
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function pdfDate(d) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function capitalise(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = router;
