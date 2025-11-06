const express = require('express');
const router = express.Router();
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const db = require('../../shared/db');

// Initialize Mailgun
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || 'key-placeholder',
  url: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net'
});

// POST /api/quotes/:id/send - Send quote via email
router.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.orgContext;
    const { recipient_email, cc_emails, message, subject } = req.body;

    console.log('📧 Sending quote email:', { id, recipient_email, cc_emails });

    // Validate input
    if (!recipient_email) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    // Fetch quote with all details
    const quoteQuery = `
      SELECT 
        q.*,
        c.company_name,
        c.contact_name,
        c.email as customer_email,
        u.name as created_by_name,
        u.email as created_by_email
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
    console.log('✅ Quote found:', quote.quote_number);

    // Fetch line items
    const lineItemsQuery = `
      SELECT * FROM quote_lines
      WHERE quote_id = $1
      ORDER BY sort_order, created_at
    `;
    
    const lineItemsResult = await db.query(lineItemsQuery, [id]);
    const lineItems = lineItemsResult.rows;
    console.log('✅ Line items found:', lineItems.length);

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

    // Generate HTML email content
    const emailHtml = generateQuoteEmailHtml(quote, lineItems, subtotal, taxAmount, total, message);

    // Prepare email data for Mailgun
    const emailData = {
      from: `WorkTrackr <noreply@${process.env.MAILGUN_DOMAIN || 'worktrackr.com'}>`,
      to: recipient_email,
      subject: subject || `Quote ${quote.quote_number} from WorkTrackr`,
      html: emailHtml
    };

    // Add CC if provided
    if (cc_emails && cc_emails.trim()) {
      emailData.cc = cc_emails;
    }

    console.log('📤 Sending email via Mailgun...');

    // Send email via Mailgun
    const result = await mg.messages.create(
      process.env.MAILGUN_DOMAIN || 'worktrackr.com',
      emailData
    );

    console.log('✅ Email sent successfully:', result.id);

    // Update quote status to 'sent' if it was 'draft'
    if (quote.status === 'draft') {
      await db.query(
        'UPDATE quotes SET status = $1, updated_at = NOW() WHERE id = $2',
        ['sent', id]
      );
      console.log('✅ Quote status updated to sent');
    }

    res.json({ 
      success: true, 
      message: 'Quote sent successfully',
      messageId: result.id 
    });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    });
  }
});

// Helper function to generate HTML email
function generateQuoteEmailHtml(quote, lineItems, subtotal, taxAmount, total, customMessage) {
  const lineItemsHtml = lineItems.map((item, index) => {
    const itemTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
    return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${index + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.description}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${parseFloat(item.quantity).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">£${parseFloat(item.unit_price).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">£${itemTotal.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Quote ${quote.quote_number}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <h1 style="color: #2563eb; margin: 0;">WorkTrackr Cloud</h1>
        <p style="color: #6b7280; margin: 5px 0 0 0;">Custom Workflows. Zero Hassle.</p>
      </div>

      <h2 style="color: #1f2937;">Quotation ${quote.quote_number}</h2>

      ${customMessage ? `<p style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">${customMessage}</p>` : ''}

      <div style="margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0;"><strong>Quote Number:</strong></td>
            <td style="padding: 5px 0; text-align: right;">${quote.quote_number}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;"><strong>Date:</strong></td>
            <td style="padding: 5px 0; text-align: right;">${formatDate(quote.created_at)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;"><strong>Valid Until:</strong></td>
            <td style="padding: 5px 0; text-align: right;">${formatDate(quote.valid_until)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;"><strong>Customer:</strong></td>
            <td style="padding: 5px 0; text-align: right;">${quote.company_name}</td>
          </tr>
        </table>
      </div>

      ${quote.title ? `<h3 style="color: #1f2937; margin-top: 30px;">${quote.title}</h3>` : ''}
      ${quote.description ? `<p>${quote.description}</p>` : ''}

      <h3 style="color: #1f2937; margin-top: 30px;">Items</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">#</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Description</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
        </tbody>
      </table>

      <div style="margin-top: 20px; text-align: right;">
        <table style="width: 300px; margin-left: auto; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px;"><strong>Subtotal:</strong></td>
            <td style="padding: 5px; text-align: right;">£${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 5px;"><strong>Tax (VAT):</strong></td>
            <td style="padding: 5px; text-align: right;">£${taxAmount.toFixed(2)}</td>
          </tr>
          <tr style="border-top: 2px solid #ddd;">
            <td style="padding: 10px 5px;"><strong style="font-size: 18px;">Total:</strong></td>
            <td style="padding: 10px 5px; text-align: right;"><strong style="font-size: 18px;">£${total.toFixed(2)}</strong></td>
          </tr>
        </table>
      </div>

      ${quote.terms_conditions ? `
        <div style="margin-top: 30px; padding: 15px; background-color: #f9fafb; border-radius: 5px;">
          <h4 style="color: #1f2937; margin-top: 0;">Terms & Conditions</h4>
          <p style="font-size: 14px; color: #6b7280; white-space: pre-line;">${quote.terms_conditions}</p>
        </div>
      ` : ''}

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
        <p>This quote was generated by WorkTrackr Cloud</p>
        <p>Please contact us if you have any questions.</p>
      </div>
    </body>
    </html>
  `;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

module.exports = router;
