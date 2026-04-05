// web/client/src/app/src/components/QuoteDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Send, Download, Trash2, Calendar, FileText, Sparkles, Loader2 } from 'lucide-react';
import SendQuoteModal from './SendQuoteModal';

export default function QuoteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [summary, setSummary]         = useState('');
  const [summarising, setSummarising] = useState(false);

  useEffect(() => {
    console.log('🔍 QuoteDetails mounted, ID from params:', id);
    const fetchQuote = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/quotes/${id}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch quote');
        const data = await response.json();
        setQuote(data);
      } catch (err) {
        console.error('Error fetching quote:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchQuote();
  }, [id]);

  const statusBadge = (status) => {
    const map = {
      draft:    'bg-[#f3f4f6] text-[#6b7280]',
      sent:     'bg-[#dbeafe] text-[#1d4ed8]',
      accepted: 'bg-[#dcfce7] text-[#15803d]',
      declined: 'bg-[#fee2e2] text-[#dc2626]',
    };
    const cls = map[status] || map.draft;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${cls}`}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft'}
      </span>
    );
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount) => `£${parseFloat(amount || 0).toFixed(2)}`;

  const handleStatusChange = async (newStatus) => {
    try {
      const response = await fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error('Failed to update quote status');
      const updatedQuote = await response.json();
      setQuote(updatedQuote);
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update quote status. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) { setShowDeleteConfirm(true); return; }
    try {
      const response = await fetch(`/api/quotes/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) throw new Error('Failed to delete quote');
      navigate('/app/dashboard', { state: { view: 'quotes' } });
    } catch (err) {
      console.error('Error deleting quote:', err);
      alert('Failed to delete quote. Please try again.');
      setShowDeleteConfirm(false);
    }
  };

  const handleDownloadPDF = () => window.open(`/api/quotes/${id}/pdf`, '_blank');

  const handleSummarise = async () => {
    setSummarising(true);
    setSummary('');
    try {
      const res = await fetch(`/api/summaries/quote/${id}`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to summarise');
      setSummary(data.summary);
    } catch (err) {
      setSummary('Could not generate summary. Please try again.');
      console.error('[Summarise] Error:', err);
    } finally {
      setSummarising(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const response = await fetch(`/api/quotes/${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch quote');
      const originalQuote = await response.json();
      const newQuoteData = {
        customer_id: originalQuote.customer_id,
        title: `${originalQuote.title} (Copy)`,
        description: originalQuote.description,
        valid_until: originalQuote.valid_until,
        terms_conditions: originalQuote.terms_conditions,
        internal_notes: originalQuote.internal_notes,
        status: 'draft',
        line_items: originalQuote.line_items.map(item => ({
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          tax_rate: item.tax_rate
        }))
      };
      const createResponse = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newQuoteData)
      });
      if (!createResponse.ok) throw new Error('Failed to create duplicate quote');
      const newQuote = await createResponse.json();
      navigate(`/app/crm/quotes/${newQuote.id}/edit`);
    } catch (err) {
      console.error('Error duplicating quote:', err);
      alert('Failed to duplicate quote. Please try again.');
    }
  };

  const handleSendEmail = (result) => {
    console.log('Quote sent successfully:', result);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-[13px] text-[#9ca3af]">
        Loading quote details...
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 text-center">
        <p className="text-[13px] text-red-600 mb-3">{error || 'Quote not found'}</p>
        <button
          onClick={() => navigate('/app/dashboard', { state: { view: 'quotes' } })}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa] mx-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Quotes
        </button>
      </div>
    );
  }

  const actionBtnClass = "flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa] transition-colors";
  const metaLabelClass = "text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider";

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/dashboard', { state: { view: 'quotes' } })}
            className="p-2 rounded-lg border border-[#e5e7eb] hover:bg-[#fafafa] text-[#6b7280]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-bold text-[#111113]">{quote.quote_number}</h1>
              {statusBadge(quote.status)}
            </div>
            <p className="text-[13px] text-[#9ca3af] mt-0.5">{quote.title}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate(`/app/crm/quotes/${id}/edit`)} className={actionBtnClass}>
            <Edit className="w-4 h-4" /> Edit
          </button>
          <button onClick={() => setShowSendModal(true)} className={actionBtnClass}>
            <Send className="w-4 h-4" /> Send
          </button>
          <button onClick={handleDownloadPDF} className={actionBtnClass}>
            <Download className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={handleDelete}
            className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${
              showDeleteConfirm
                ? 'bg-red-600 text-white hover:bg-red-700 border border-red-600'
                : 'text-red-600 border border-red-200 hover:bg-red-50'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {showDeleteConfirm ? 'Confirm Delete' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left — main content */}
        <div className="lg:col-span-2 space-y-5">

          {/* Customer */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[13px] font-semibold text-[#374151]">Customer Information</h3>
            </div>
            <div className="p-5 space-y-2">
              <p className="text-[15px] font-semibold text-[#111113]">{quote.customer_name}</p>
              {quote.customer_email && <p className="text-[13px] text-[#6b7280]"><span className="font-medium text-[#374151]">Email:</span> {quote.customer_email}</p>}
              {quote.customer_phone && <p className="text-[13px] text-[#6b7280]"><span className="font-medium text-[#374151]">Phone:</span> {quote.customer_phone}</p>}
              {quote.customer_address && <p className="text-[13px] text-[#6b7280]"><span className="font-medium text-[#374151]">Address:</span> {quote.customer_address}</p>}
            </div>
          </div>

          {/* Line items */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[13px] font-semibold text-[#374151]">Items</h3>
              {quote.description && <p className="text-[12px] text-[#9ca3af] mt-0.5">{quote.description}</p>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    {['Item', 'Description', 'Qty', 'Price', 'Total'].map((h, i) => (
                      <th key={h} className={`py-3 px-4 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider bg-[#fafafa] ${i >= 2 ? 'text-right' : 'text-left'} ${i === 1 ? 'hidden sm:table-cell' : ''}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {quote.line_items && quote.line_items.length > 0 ? (
                    quote.line_items.map((item, index) => (
                      <tr key={index} className={`border-b border-[#f3f4f6] text-[13px] ${index % 2 === 1 ? 'bg-[#fafbfc]' : 'bg-white'}`}>
                        <td className="py-3 px-4 text-[#374151]">{item.product_name || item.name}</td>
                        <td className="py-3 px-4 text-[#6b7280] hidden sm:table-cell">{item.description}</td>
                        <td className="py-3 px-4 text-right text-[#374151]">{item.quantity}</td>
                        <td className="py-3 px-4 text-right text-[#374151]">{formatCurrency(item.unit_price)}</td>
                        <td className="py-3 px-4 text-right font-medium text-[#111113]">{formatCurrency(item.line_total)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-[13px] text-[#9ca3af]">No items found</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#e5e7eb]">
                    <td colSpan="4" className="py-3 px-4 text-right text-[13px] font-medium text-[#374151]">Subtotal:</td>
                    <td className="py-3 px-4 text-right text-[13px] font-medium text-[#374151]">{formatCurrency(quote.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan="4" className="py-2 px-4 text-right text-[12px] text-[#9ca3af]">Tax:</td>
                    <td className="py-2 px-4 text-right text-[12px] text-[#6b7280]">{formatCurrency(quote.tax_amount)}</td>
                  </tr>
                  <tr className="border-t-2 border-[#e5e7eb]">
                    <td colSpan="4" className="py-3 px-4 text-right text-[15px] font-bold text-[#111113]">Total:</td>
                    <td className="py-3 px-4 text-right text-[15px] font-bold text-[#111113]">{formatCurrency(quote.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Terms */}
          {quote.terms_conditions && (
            <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#e5e7eb]">
                <h3 className="text-[13px] font-semibold text-[#374151]">Terms & Conditions</h3>
              </div>
              <div className="p-5 text-[13px] text-[#6b7280] whitespace-pre-wrap">{quote.terms_conditions}</div>
            </div>
          )}

          {/* Internal notes */}
          {quote.notes && (
            <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#e5e7eb]">
                <h3 className="text-[13px] font-semibold text-[#374151]">Internal Notes</h3>
                <p className="text-[11px] text-[#9ca3af] mt-0.5">Only visible to staff</p>
              </div>
              <div className="p-5 text-[13px] text-[#6b7280] whitespace-pre-wrap">{quote.notes}</div>
            </div>
          )}
        </div>

        {/* Right — meta + actions */}
        <div className="space-y-5">

          {/* Quote details */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[13px] font-semibold text-[#374151]">Quote Details</h3>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Quote Date', value: formatDate(quote.quote_date) },
                { label: 'Valid Until', value: formatDate(quote.valid_until) },
                { label: 'Created By', value: quote.created_by_name || '—' },
                { label: 'Last Modified', value: formatDate(quote.updated_at) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className={metaLabelClass}>{label}</p>
                  <p className="text-[13px] font-medium text-[#374151] mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[13px] font-semibold text-[#374151]">Quick Actions</h3>
            </div>
            <div className="p-5 space-y-2">
              {[
                { label: 'Mark as Sent', status: 'sent' },
                { label: 'Mark as Accepted', status: 'accepted' },
                { label: 'Mark as Declined', status: 'declined' },
              ].map(({ label, status }) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={quote.status === status}
                  className="w-full text-left px-3 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {label}
                </button>
              ))}
              <button
                onClick={handleDuplicate}
                className="w-full text-left px-3 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa] transition-colors"
              >
                Duplicate Quote
              </button>

              <div className="border-t border-[#e5e7eb] pt-3 mt-1">
                <button
                  onClick={handleSummarise}
                  disabled={summarising}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-[#d4a017] text-[#b8860b] hover:bg-[#fef9ee] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {summarising
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Summarising…</>
                    : <><Sparkles className="w-4 h-4" /> Summarise for Customer</>}
                </button>
                {summary && (
                  <div className="mt-3 bg-[#fef9ee] border border-[#d4a017]/30 rounded-xl p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#b8860b] mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> AI Summary
                    </p>
                    <p className="text-[13px] text-[#374151] leading-relaxed">{summary}</p>
                  </div>
                )}
              </div>

              {quote.status === 'accepted' && (
                <>
                  <div className="border-t border-[#e5e7eb] pt-3 mt-3">
                    <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">Workflow</p>
                  </div>
                  <button
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg transition-colors"
                    onClick={() => {
                      const assignedUserId = prompt('Enter assigned user ID:');
                      const scheduledDate = prompt('Enter scheduled date (YYYY-MM-DD):');
                      if (assignedUserId && scheduledDate) {
                        fetch(`/api/quotes/${id}/schedule-work`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ assigned_user_id: assignedUserId, scheduled_date: scheduledDate })
                        }).then(() => { alert('Work scheduled successfully!'); window.location.reload(); })
                          .catch(() => alert('Failed to schedule work'));
                      }
                    }}
                  >
                    <Calendar className="w-4 h-4" /> Schedule Work
                  </button>
                  <button
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa] transition-colors"
                    onClick={() => {
                      if (confirm('Create invoice from this quote?')) {
                        fetch(`/api/quotes/${id}/create-invoice`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({})
                        }).then(() => { alert('Invoice created successfully!'); window.location.reload(); })
                          .catch(() => alert('Failed to create invoice'));
                      }
                    }}
                  >
                    <FileText className="w-4 h-4" /> Create Invoice
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSendModal && (
        <SendQuoteModal quote={quote} onClose={() => setShowSendModal(false)} onSend={handleSendEmail} />
      )}
    </div>
  );
}
