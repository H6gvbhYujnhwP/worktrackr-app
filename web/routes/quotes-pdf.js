const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const db = require('../../shared/db');

// GET /api/quotes/:id/pdf - Generate and download quote PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.orgContext;

    // Fetch quote with all details
    const quoteQuery = `
      SELECT 
        q.*,
        c.company_name,
        c.contact_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address,
        u.full_name as created_by_name
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      LEFT JOIN users u ON q.created_by = u.id
      WHERE q.id = $1 AND q.organisation_id = $2
    `;
    
    const quoteResult = await db.query(quoteQuery, [id, organizationId]);
    
    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    const quote = quoteResult.rows[0];

    // Fetch line items
    const lineItemsQuery = `
      SELECT * FROM quote_line_items
      WHERE quote_id = $1
      ORDER BY sort_order, created_at
    `;
    
    const lineItemsResult = await db.query(lineItemsQuery, [id]);
    const lineItems = lineItemsResult.rows;

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=quote-${quote.quote_number}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add company header
    doc.fontSize(24).text('WorkTrackr Cloud', { align: 'left' });
    doc.fontSize(10).text('Custom Workflows. Zero Hassle.', { align: 'left' });
    doc.moveDown();

    // Add quote title
    doc.fontSize(20).text('QUOTATION', { align: 'center' });
    doc.moveDown();

    // Add quote details in two columns
    const leftColumn = 50;
    const rightColumn = 350;
    let yPosition = doc.y;

    // Left column - Customer details
    doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', leftColumn, yPosition);
    doc.font('Helvetica').fontSize(10);
    doc.text(quote.company_name || 'N/A', leftColumn, yPosition + 15);
    if (quote.contact_name) doc.text(quote.contact_name, leftColumn);
    if (quote.customer_email) doc.text(quote.customer_email, leftColumn);
    if (quote.customer_phone) doc.text(quote.customer_phone, leftColumn);
    if (quote.customer_address) doc.text(quote.customer_address, leftColumn, undefined, { width: 250 });

    // Right column - Quote details
    doc.fontSize(10).font('Helvetica-Bold').text('Quote Number:', rightColumn, yPosition);
    doc.font('Helvetica').text(quote.quote_number, rightColumn + 100, yPosition);
    
    doc.font('Helvetica-Bold').text('Quote Date:', rightColumn, yPosition + 15);
    doc.font('Helvetica').text(formatDate(quote.created_at), rightColumn + 100, yPosition + 15);
    
    doc.font('Helvetica-Bold').text('Valid Until:', rightColumn, yPosition + 30);
    doc.font('Helvetica').text(formatDate(quote.valid_until), rightColumn + 100, yPosition + 30);
    
    doc.font('Helvetica-Bold').text('Status:', rightColumn, yPosition + 45);
    doc.font('Helvetica').text(capitalizeFirst(quote.status), rightColumn + 100, yPosition + 45);

    doc.moveDown(3);

    // Add quote title if exists
    if (quote.title) {
      doc.fontSize(14).font('Helvetica-Bold').text(quote.title);
      doc.moveDown(0.5);
    }

    // Add description if exists
    if (quote.description) {
      doc.fontSize(10).font('Helvetica').text(quote.description);
      doc.moveDown();
    }

    doc.moveDown();

    // Add line items table
    const tableTop = doc.y;
    const itemX = 50;
    const descX = 100;
    const qtyX = 350;
    const priceX = 410;
    const totalX = 480;

    // Table header
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Item', itemX, tableTop);
    doc.text('Description', descX, tableTop);
    doc.text('Qty', qtyX, tableTop);
    doc.text('Price', priceX, tableTop);
    doc.text('Total', totalX, tableTop);

    // Draw header line
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Table rows
    let yPos = tableTop + 25;
    doc.font('Helvetica').fontSize(9);

    lineItems.forEach((item, index) => {
      const itemTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
      
      doc.text(index + 1, itemX, yPos);
      doc.text(item.description, descX, yPos, { width: 240 });
      doc.text(parseFloat(item.quantity).toFixed(2), qtyX, yPos);
      doc.text(`£${parseFloat(item.unit_price).toFixed(2)}`, priceX, yPos);
      doc.text(`£${itemTotal.toFixed(2)}`, totalX, yPos);
      
      yPos += 25;
      
      // Add new page if needed
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
    });

    // Draw line before totals
    doc.moveTo(350, yPos).lineTo(550, yPos).stroke();
    yPos += 10;

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price));
    }, 0);

    const taxAmount = lineItems.reduce((sum, item) => {
      const itemTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
      const taxRate = parseFloat(item.tax_rate || 0) / 100;
      return sum + (itemTotal * taxRate);
    }, 0);

    const total = subtotal + taxAmount;

    // Display totals
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Subtotal:', 410, yPos);
    doc.font('Helvetica').text(`£${subtotal.toFixed(2)}`, 480, yPos);
    
    yPos += 20;
    doc.font('Helvetica-Bold').text('Tax (VAT):', 410, yPos);
    doc.font('Helvetica').text(`£${taxAmount.toFixed(2)}`, 480, yPos);
    
    yPos += 20;
    doc.fontSize(12).font('Helvetica-Bold').text('Total:', 410, yPos);
    doc.text(`£${total.toFixed(2)}`, 480, yPos);

    // Add terms and conditions
    if (quote.terms_conditions) {
      yPos += 40;
      if (yPos > 650) {
        doc.addPage();
        yPos = 50;
      }
      doc.fontSize(12).font('Helvetica-Bold').text('Terms & Conditions', 50, yPos);
      yPos += 15;
      doc.fontSize(9).font('Helvetica').text(quote.terms_conditions, 50, yPos, { width: 500 });
    }

    // Add footer
    doc.fontSize(8).text(
      `Generated on ${new Date().toLocaleDateString('en-GB')} | WorkTrackr Cloud`,
      50,
      750,
      { align: 'center', width: 500 }
    );

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error generating PDF:', error);
    
    // If headers not sent yet, send error response
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }
});

// Helper functions
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = router;
