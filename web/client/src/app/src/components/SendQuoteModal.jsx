// web/client/src/app/src/components/SendQuoteModal.jsx
import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

// ── Email body generator ───────────────────────────────────────────────────────
function generateEmailBody(quote) {
  const f    = (n) => `£${parseFloat(n || 0).toFixed(2)}`;
  const fDt  = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

  const recipientName = quote.contact_name || quote.customer_name || quote.company_name || 'there';
  const lineItems     = quote.line_items || [];

  // Compute totals
  const subtotalEx = lineItems.reduce((s, i) => {
    const qty = parseFloat(i.quantity||0), sell = parseFloat(i.unit_price||0), disc = parseFloat(i.discount_percent||0);
    return s + qty * sell * (1 - disc / 100);
  }, 0);
  const vatTotal = lineItems.reduce((s, i) => {
    const qty = parseFloat(i.quantity||0), sell = parseFloat(i.unit_price||0), disc = parseFloat(i.discount_percent||0);
    const net = qty * sell * (1 - disc / 100);
    return s + ((i.tax_rate || 0) > 0 ? net * 0.2 : 0);
  }, 0);
  const totalIncVat = subtotalEx + vatTotal;

  // Group items by section
  const materials = lineItems.filter(i => i.item_type === 'material' || i.item_type === 'parts');
  const labour    = lineItems.filter(i => i.item_type !== 'material' && i.item_type !== 'parts');

  const formatItems = (items) => items.map(i => {
    const qty   = parseFloat(i.quantity || 0);
    const sell  = parseFloat(i.unit_price || 0);
    const disc  = parseFloat(i.discount_percent || 0);
    const total = qty * sell * (1 - disc / 100);
    const unit  = i.unit ? ` ${i.unit}` : '';
    const discStr = disc > 0 ? ` (less ${disc}% discount)` : '';
    const vatStr  = (i.tax_rate || 0) > 0 ? ' +VAT' : '';
    return `  • ${i.description}${unit ? ` [${unit.trim()}]` : ''} × ${qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2)}${discStr}${vatStr}  —  ${f(total)}`;
  }).join('\n');

  const itemsBlock = [
    materials.length ? `Materials & Parts:\n${formatItems(materials)}` : '',
    labour.length    ? `Labour & Other Charges:\n${formatItems(labour)}` : '',
  ].filter(Boolean).join('\n\n');

  const validUntil = fDt(quote.valid_until);

  return `Dear ${recipientName},

Thank you for the opportunity to quote for this work. Please find our quotation below.

QUOTE REFERENCE: ${quote.quote_number || ''}${quote.title ? `\nRE: ${quote.title}` : ''}${quote.description ? `\n\n${quote.description}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ITEMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${itemsBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subtotal (ex VAT):   ${f(subtotalEx)}
VAT (20%):           ${f(vatTotal)}
TOTAL (inc VAT):     ${f(totalIncVat)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${validUntil ? `\nThis quotation is valid until ${validUntil}.` : ''}

To accept this quotation, please reply to this email confirming your approval, or call us directly and we will be happy to assist.
${quote.terms_conditions ? `\n─────────────────────────────────────────\nTERMS & CONDITIONS:\n${quote.terms_conditions}\n─────────────────────────────────────────` : ''}
Kind regards`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SendQuoteModal({ quote, onClose, onSend }) {
  const [recipientEmail, setRecipientEmail] = useState(quote?.customer_email || '');
  const [ccEmails, setCcEmails]             = useState('');
  const [subject, setSubject]               = useState(`Quotation ${quote?.quote_number || ''} — ${quote?.title || ''}`);
  const [message, setMessage]               = useState(() => generateEmailBody(quote));
  const [sending, setSending]               = useState(false);
  const [error, setError]                   = useState(null);
  const [copied, setCopied]                 = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the textarea
      const el = document.getElementById('email-body-textarea');
      if (el) { el.select(); document.execCommand('copy'); }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSend = async () => {
    if (!recipientEmail) { setError('Recipient email is required'); return; }
    setSending(true); setError(null);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ recipient_email: recipientEmail, cc_emails: ccEmails || undefined, subject, message })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Send failed — check SMTP is configured on the server');
      }
      onSend(await res.json());
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-[13px] border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017]";
  const labelCls = "block text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
          <h3 className="text-[15px] font-semibold text-[#111113]">Send Quote</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f5f5f7] text-[#6b7280] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-[13px]">
              {error}
            </div>
          )}

          {/* Copy-to-clipboard banner */}
          <div className="bg-[#fef9ee] border border-[#d4a017]/30 rounded-lg px-4 py-3 flex items-start justify-between gap-3">
            <p className="text-[12px] text-[#b8860b] leading-relaxed">
              <span className="font-semibold">Copy-paste ready.</span> The email body below is pre-filled from your quote. Edit it as needed, then copy and paste into your email client — or use the Send button if SMTP is configured.
            </p>
            <button
              onClick={handleCopy}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#d4a017] text-[#111113] hover:bg-[#b8860b]'
              }`}
            >
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Email</>}
            </button>
          </div>

          <div>
            <label className={labelCls}>To <span className="text-red-500 normal-case">*</span></label>
            <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)}
              placeholder="customer@example.com" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>CC <span className="text-[#9ca3af] normal-case font-normal">(optional)</span></label>
            <input type="text" value={ccEmails} onChange={e => setCcEmails(e.target.value)}
              placeholder="email1@example.com, email2@example.com" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Subject</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className={inputCls} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelCls} style={{ marginBottom: 0 }}>Email Body</label>
              <button onClick={handleCopy}
                className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
                  copied ? 'text-emerald-600' : 'text-[#d4a017] hover:text-[#b8860b]'
                }`}>
                {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
            <textarea
              id="email-body-textarea"
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={16}
              className={`${inputCls} font-mono text-[12px] resize-y`}
            />
          </div>

          <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-lg px-4 py-3">
            <p className="text-[12px] text-[#6b7280]">
              <span className="font-medium text-[#374151]">PDF attachment:</span> A PDF of the quote will be attached automatically when using the Send button. Copy-paste mode: attach the PDF manually from the Download button on the quote.
              {quote?.status === 'draft' && ' The quote status will be changed to "Sent" on dispatch.'}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#e5e7eb]">
          <button onClick={onClose} disabled={sending}
            className="px-4 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa] transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleCopy}
            className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-colors ${
              copied ? 'bg-emerald-600 text-white' : 'border border-[#d4a017] text-[#b8860b] hover:bg-[#fef9ee]'
            }`}>
            {copied ? '✓ Copied!' : 'Copy to Clipboard'}
          </button>
          <button onClick={handleSend} disabled={sending || !recipientEmail}
            className="px-4 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {sending ? 'Sending…' : 'Send via SMTP'}
          </button>
        </div>
      </div>
    </div>
  );
}
