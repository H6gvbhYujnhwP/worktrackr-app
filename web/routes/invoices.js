// web/routes/invoices.js
// Invoices module — Phase 1 backend
// Patterns: auth via req.orgContext (injected by authenticateToken in server.js),
//           snake_case column names throughout (frontend applies mapInvoice() normaliser),
//           explicit field writes on PUT (no Zod .default() silent overwrite),
//           try/catch on every route, { error } response with appropriate HTTP status.

const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const db = require('../../shared/db');

// ---------------------------------------------------------------------------
// Helper: build full invoice row (invoice + lines + contact + job)
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
// Helper: auto-generate invoice number for org
// ---------------------------------------------------------------------------
async function generateInvoiceNumber(client, organizationId) {
  const result = await client.query(
    `SELECT generate_invoice_number($1) AS invoice_number`,
    [organizationId]
  );
  return result.rows[0].invoice_number;
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
    let paramIdx = 1;
    let statusClause = '';

    if (status) {
      paramIdx++;
      statusClause = `AND i.status = $${paramIdx}`;
      params.push(status);
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
// Single invoice with lines, contact name, job number.
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
// Create invoice. When job_id is supplied, copies parts + time_entries as lines.
// Sets jobs.converted_to_invoice_id on the source job.
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { organizationId } = req.orgContext;
    const {
      job_id,
      contact_id,
      issue_date,
      due_date,
      notes,
    } = req.body;

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
      if (!resolvedContactId) {
        resolvedContactId = jobRow.contact_id || null;
      }
    }

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
        const qty       = parseFloat(part.quantity) || 1;
        const unitPrice = parseFloat(part.unit_price) || 0;
        lineItems.push({
          description:   part.description,
          quantity:      qty,
          unit_price:    unitPrice,
          line_total:    parseFloat((qty * unitPrice).toFixed(2)),
          vat_applicable: true,
          sort_order:    idx,
        });
      });

      // Time entries (labour)
      const timeResult = await client.query(
        `SELECT * FROM job_time_entries WHERE job_id = $1 ORDER BY created_at`,
        [job_id]
      );
      const partsCount = lineItems.length;
      timeResult.rows.forEach((entry, idx) => {
        const hours     = parseFloat(entry.duration_minutes || 0) / 60;
        const rate      = parseFloat(entry.hourly_rate || 0);
        const unitPrice = rate;
        const qty       = parseFloat(hours.toFixed(2));
        const label     = entry.description
          ? `Labour: ${entry.description}`
          : 'Labour';
        lineItems.push({
          description:   label,
          quantity:      qty,
          unit_price:    unitPrice,
          line_total:    parseFloat((qty * unitPrice).toFixed(2)),
          vat_applicable: true,
          sort_order:    partsCount + idx,
        });
      });
    }

    // ── Calculate totals ─────────────────────────────────────────────────
    const subtotal = lineItems.reduce((sum, l) => sum + l.line_total, 0);
    const vatTotal = lineItems.reduce((sum, l) => {
      return sum + (l.vat_applicable ? l.line_total * 0.20 : 0);
    }, 0);
    const total = subtotal + vatTotal;

    // ── Insert invoice ────────────────────────────────────────────────────
    const invoiceResult = await client.query(
      `INSERT INTO invoices (
         organisation_id, job_id, contact_id, invoice_number,
         issue_date, due_date, subtotal, vat_total, total, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        organizationId,
        job_id    || null,
        resolvedContactId,
        invoiceNumber,
        issue_date || null,
        due_date   || null,
        parseFloat(subtotal.toFixed(2)),
        parseFloat(vatTotal.toFixed(2)),
        parseFloat(total.toFixed(2)),
        notes      || null,
      ]
    );
    const invoice = invoiceResult.rows[0];

    // ── Insert lines ──────────────────────────────────────────────────────
    for (const line of lineItems) {
      await client.query(
        `INSERT INTO invoice_lines (
           invoice_id, description, quantity, unit_price, line_total,
           vat_applicable, sort_order
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          invoice.id,
          line.description,
          line.quantity,
          line.unit_price,
          line.line_total,
          line.vat_applicable,
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

    // Return full invoice (re-fetch with joins)
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
// Update: status, due_date, notes, invoice_number only.
// Explicit field writes — NO Zod .default() to avoid silent data-loss.
// ---------------------------------------------------------------------------
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.orgContext;

    // Allowed fields — only write keys present in the request body
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

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updatable fields supplied' });
    }

    // Validate status if provided
    const validStatuses = ['draft', 'sent', 'paid', 'overdue'];
    if (
      req.body.status !== undefined &&
      !validStatuses.includes(req.body.status)
    ) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
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
// Delete invoice (cascade removes lines). Also nulls jobs.converted_to_invoice_id.
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { organizationId } = req.orgContext;

    await client.query('BEGIN');

    // Null out job back-reference first
    await client.query(
      `UPDATE jobs SET converted_to_invoice_id = NULL, updated_at = NOW()
       WHERE converted_to_invoice_id = $1`,
      [id]
    );

    // Delete invoice (invoice_lines cascade)
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
// Generate PDF. Modelled on quotes.js PDF route.
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

    // ── PDF setup ─────────────────────────────────────────────────────────
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

    // ── Two-column meta block ─────────────────────────────────────────────
    const leftX  = 50;
    const rightX = 350;
    let   yPos   = doc.y;

    // Left — Bill To
    doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', leftX, yPos);
    doc.font('Helvetica').fontSize(10);
    doc.text(invoice.contact_name || 'N/A', leftX, yPos + 15);
    if (invoice.contact_email) doc.text(invoice.contact_email, leftX);
    if (invoice.contact_phone) doc.text(invoice.contact_phone, leftX);

    // Right — Invoice details
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

    // Header row
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Description',  descX,  tableTop, { width: 265 });
    doc.text('Qty',          qtyX,   tableTop, { width: 50,  align: 'right' });
    doc.text('Unit Price',   priceX, tableTop, { width: 60,  align: 'right' });
    doc.text('VAT',          vatX,   tableTop, { width: 25,  align: 'center' });
    doc.text('Total',        totalX, tableTop, { width: 70,  align: 'right' });

    doc.moveTo(descX, tableTop + 14).lineTo(pageW, tableTop + 14).lineWidth(0.5).stroke();

    let rowY = tableTop + 22;
    doc.font('Helvetica').fontSize(9);

    lines.forEach((line) => {
      if (rowY > 680) { doc.addPage(); rowY = 50; }

      const qty        = parseFloat(line.quantity)   || 0;
      const unitPrice  = parseFloat(line.unit_price) || 0;
      const lineTotal  = parseFloat(line.line_total) || qty * unitPrice;
      const vatLabel   = line.vat_applicable ? '20%' : '—';
      const descHeight = doc.heightOfString(line.description, { width: 265 });
      const rowH       = Math.max(descHeight, 14) + 4;

      doc.text(line.description,                 descX,  rowY, { width: 265 });
      doc.text(qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2),
                                                 qtyX,   rowY, { width: 50,  align: 'right' });
      doc.text(`£${unitPrice.toFixed(2)}`,       priceX, rowY, { width: 60,  align: 'right' });
      doc.text(vatLabel,                         vatX,   rowY, { width: 25,  align: 'center' });
      doc.text(`£${lineTotal.toFixed(2)}`,       totalX, rowY, { width: 70,  align: 'right' });

      rowY += rowH + 4;
    });

    // ── Totals block ──────────────────────────────────────────────────────
    doc.moveTo(priceX, rowY).lineTo(pageW, rowY).lineWidth(0.5).stroke();
    rowY += 8;

    const subtotal = parseFloat(invoice.subtotal) || 0;
    const vatTotal = parseFloat(invoice.vat_total) || 0;
    const total    = parseFloat(invoice.total)     || 0;

    const labelX  = 350;
    const valX    = 460;
    const valW    = 80;

    doc.font('Helvetica').fontSize(9);
    doc.text('Subtotal (ex VAT):',  labelX, rowY, { width: 105 });
    doc.text(`£${subtotal.toFixed(2)}`, valX, rowY, { width: valW, align: 'right' });
    rowY += 16;

    doc.text('VAT (20%):',          labelX, rowY, { width: 105 });
    doc.text(`£${vatTotal.toFixed(2)}`, valX, rowY, { width: valW, align: 'right' });
    rowY += 16;

    doc.moveTo(labelX, rowY).lineTo(pageW, rowY).lineWidth(0.5).stroke();
    rowY += 6;

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('Total (inc VAT):',    labelX, rowY, { width: 105 });
    doc.text(`£${total.toFixed(2)}`, valX,  rowY, { width: valW, align: 'right' });
    rowY += 20;

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
// PDF helpers
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
