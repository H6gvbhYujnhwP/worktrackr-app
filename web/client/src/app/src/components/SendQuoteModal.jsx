// web/client/src/app/src/components/SendQuoteModal.jsx
import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function SendQuoteModal({ quote, onClose, onSend }) {
  const [recipientEmail, setRecipientEmail] = useState(quote?.customer_email || '');
  const [ccEmails, setCcEmails] = useState('');
  const [subject, setSubject] = useState(`Quote ${quote?.quote_number} from WorkTrackr`);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const handleSend = async () => {
    if (!recipientEmail) {
      setError('Recipient email is required');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/quotes/${quote.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipient_email: recipientEmail,
          cc_emails: ccEmails || undefined,
          subject,
          message
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }
      const result = await response.json();
      onSend(result);
      onClose();
    } catch (err) {
      console.error('Error sending quote:', err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const inputClass = "w-full px-3 py-2 text-[13px] border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017]";
  const labelClass = "block text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
          <h3 className="text-[15px] font-semibold text-[#111113]">Send Quote via Email</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#f5f5f7] text-[#6b7280] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-[13px]">
              {error}
            </div>
          )}

          <div>
            <label className={labelClass}>
              To <span className="text-red-500 normal-case">*</span>
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="customer@example.com"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>CC <span className="text-[#9ca3af] normal-case font-normal">(optional)</span></label>
            <input
              type="text"
              value={ccEmails}
              onChange={(e) => setCcEmails(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
              className={inputClass}
            />
            <p className="text-[11px] text-[#9ca3af] mt-1">Separate multiple emails with commas</p>
          </div>

          <div>
            <label className={labelClass}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Message <span className="text-[#9ca3af] normal-case font-normal">(optional)</span></label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message to include in the email..."
              rows={4}
              className={inputClass}
            />
          </div>

          <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-lg px-4 py-3">
            <p className="text-[13px] text-[#6b7280]">
              <span className="font-medium text-[#374151]">Note:</span> The quote will be attached as a PDF.
              {quote?.status === 'draft' && ' The quote status will be automatically changed to "Sent".'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#e5e7eb]">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !recipientEmail}
            className="px-4 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send Quote'}
          </button>
        </div>
      </div>
    </div>
  );
}
