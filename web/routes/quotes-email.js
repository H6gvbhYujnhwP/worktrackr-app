const express = require('express');
const router = express.Router();
const { Resend } = require('resend');
const { authenticateToken, requireOrgContext } = require('../middleware/auth');
const pool = require('../db');

// Initialize Resend client
const resend = new Resend(process.env.RESEND);

/**
 * POST /api/quotes/:id/send
 * Send quote via email using Resend
 */
router.post('/:id/send', authenticateToken, requireOrgContext, async (req, res) => {
  const { id } = req.params;
  const { to, cc, subject, message } = req.body;
  const { organizationId } = req.orgContext;

  console.log('📧 Sending quote email:', { id, to, cc, subject });

  try {
    // Fetch quote details
    const quoteResult = await pool.query(
      `SELECT q.*, 
              c.name as customer_name,
              c.email as customer_email,
              c.contact_name,
              c.phone,
              c.address
       FROM quotes q
       JOIN customers c ON q.customer_id = c.id
       WHERE q.id = $1 AND q.organization_id = $2`,
      [id, organizationId]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const quote = quoteResult.rows[0];

    // Fetch line items
    const lineItemsResult = await pool.query(
      `SELECT * FROM quote_lines
       WHERE quote_id = $1
       ORDER BY created_at`,
      [id]
    );

    const lineItems = lineItemsResult.rows;

    // Build email HTML
    const emailHtml = buildQuoteEmailHtml(quote, lineItems, message);

    // Prepare email data
    const emailData = {
      from: 'WorkTrackr <noreply@worktrackr.cloud>',
      to: to || quote.customer_email,
      subject: subject || `Quote ${quote.quote_number} from WorkTrackr`,
      html: emailHtml,
    };

    // Add CC if provided
    if (cc && cc.trim()) {
      emailData.cc = cc.split(',').map(email => email.trim());
    }

    console.log('📤 Sending email via Resend:', { to: emailData.to, subject: emailData.subject });

    // Send email via Resend
    const result = await resend.emails.send(emailData);

    console.log('✅ Email sent successfully:', result);

    // Update quote status to 'sent' if it was 'draft'
    if (quote.status === 'draft') {
      await pool.query(
        `UPDATE quotes SET status = 'sent', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
      );
    }

    res.json({ 
      success: true, 
      message: 'Quote sent successfully',
      emailId: result.id
    });

  } catch (error) {
    console.error('❌ Error sending quote email:', error);
    res.status(500).json({ 
      error: 'Failed to send quote email',
      details: error.message 
    });
  }
});

/**
 * Build HTML email content for quote
 */
function buildQuoteEmailHtml(quote, lineItems, customMessage) {
  const lineItemsHtml = lineItems.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description || ''}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">£${parseFloat(item.unit_price).toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">£${(parseFloat(item.quantity) * parseFloat(item.unit_price)).toFixed(2)}</td>
    </tr>
  `).join('');

  const subtotal = lineItems.reduce((sum, item) => 
    sum + (parseFloat(item.quantity) * parseFloat(item.unit_price)), 0
  );
  
  const tax = lineItems.reduce((sum, item) => 
    sum + (parseFloat(item.quantity) * parseFloat(item.unit_price) * (parseFloat(item.tax_rate || 20) / 100)), 0
  );
  
  const total = subtotal + tax;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Quote ${quote.quote_number}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">WorkTrackr</h1>
          <p style="color: #e0e7ff; margin: 5px 0 0 0; font-size: 14px;">Custom Workflows. Zero Hassle.</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          
          <!-- Greeting -->
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Quote ${quote.quote_number}</h2>
          
          ${customMessage ? `
            <div style="background-color: #f3f4f6; border-left: 4px solid #667eea; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
              <p style="margin: 0; color: #4b5563;">${customMessage}</p>
            </div>
          ` : ''}

          <p style="color: #6b7280; margin: 0 0 25px 0;">
            Hello ${quote.contact_name || quote.customer_name},
          </p>

          <p style="color: #6b7280; margin: 0 0 25px 0;">
            Please find your quote details below. This quote is valid until <strong>${new Date(quote.valid_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>.
          </p>

          <!-- Quote Details -->
          <table style="width: 100%; margin-bottom: 25px; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Quote Number:</td>
              <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${quote.quote_number}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Quote Date:</td>
              <td style="padding: 8px 0; color: #1f2937; text-align: right;">${new Date(quote.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Valid Until:</td>
              <td style="padding: 8px 0; color: #1f2937; text-align: right;">${new Date(quote.valid_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
            </tr>
          </table>

          <!-- Line Items -->
          <h3 style="color: #1f2937; margin: 30px 0 15px 0; font-size: 18px;">Items</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 12px; text-align: left; color: #6b7280; font-weight: 600; font-size: 14px; border-bottom: 2px solid #e5e7eb;">Description</th>
                <th style="padding: 12px; text-align: center; color: #6b7280; font-weight: 600; font-size: 14px; border-bottom: 2px solid #e5e7eb;">Qty</th>
                <th style="padding: 12px; text-align: right; color: #6b7280; font-weight: 600; font-size: 14px; border-bottom: 2px solid #e5e7eb;">Price</th>
                <th style="padding: 12px; text-align: right; color: #6b7280; font-weight: 600; font-size: 14px; border-bottom: 2px solid #e5e7eb;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsHtml}
            </tbody>
          </table>

          <!-- Totals -->
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Subtotal:</td>
                <td style="padding: 8px 0; color: #1f2937; text-align: right; font-size: 16px;">£${subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Tax (VAT):</td>
                <td style="padding: 8px 0; color: #1f2937; text-align: right; font-size: 16px;">£${tax.toFixed(2)}</td>
              </tr>
              <tr style="border-top: 2px solid #e5e7eb;">
                <td style="padding: 12px 0 0 0; color: #1f2937; font-weight: 700; font-size: 16px;">Total:</td>
                <td style="padding: 12px 0 0 0; color: #667eea; font-weight: 700; text-align: right; font-size: 20px;">£${total.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          ${quote.terms_conditions ? `
            <div style="margin-bottom: 25px;">
              <h3 style="color: #1f2937; margin: 0 0 10px 0; font-size: 16px;">Terms & Conditions</h3>
              <p style="color: #6b7280; font-size: 14px; margin: 0; white-space: pre-line;">${quote.terms_conditions}</p>
            </div>
          ` : ''}

          <p style="color: #6b7280; margin: 25px 0 0 0;">
            If you have any questions about this quote, please don't hesitate to contact us.
          </p>

          <p style="color: #6b7280; margin: 15px 0 0 0;">
            Best regards,<br>
            <strong>The WorkTrackr Team</strong>
          </p>

        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This email was sent by WorkTrackr<br>
            <a href="https://worktrackr.cloud" style="color: #667eea; text-decoration: none;">worktrackr.cloud</a>
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
}

module.exports = router;
