import React, { useEffect, useState } from 'react';
import { DollarSign, Plus, Send, Calendar, FileText, CheckCircle, XCircle, Clock, ExternalLink, Loader2, Sparkles } from 'lucide-react';

const QUOTE_STATUS_COLORS = {
  draft:      'bg-[#f3f4f6] text-[#374151] border border-[#e5e7eb]',
  sent:       'bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]',
  viewed:     'bg-[#ede9fe] text-[#5b21b6] border border-[#ddd6fe]',
  accepted:   'bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]',
  declined:   'bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]',
  expired:    'bg-[#fff7ed] text-[#9a3412] border border-[#fed7aa]',
  superseded: 'bg-[#f3f4f6] text-[#9ca3af] border border-[#e5e7eb]',
};

const QUOTE_STATUS_ICONS = {
  draft:      FileText,
  sent:       Send,
  viewed:     ExternalLink,
  accepted:   CheckCircle,
  declined:   XCircle,
  expired:    Clock,
  superseded: FileText,
};

export default function QuotesTab({ ticketId }) {
  const [quotes, setQuotes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => { fetchQuotes(); }, [ticketId]);

  const fetchQuotes = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/quotes?ticket_id=${ticketId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch quotes');
      const data = await response.json();
      setQuotes(data.quotes || []);
    } catch (err) {
      console.error('[QuotesTab] Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuote = () => {
    window.location.href = `/app/crm/quotes/new?ticket_id=${ticketId}`;
  };

  const handleGenerateWithAI = () => {
    window.location.href = `/app/crm/quotes/new?ticket_id=${ticketId}&tab=ai`;
  };

  const handleViewQuote = (quoteId) => {
    window.location.href = `/app/crm/quotes/${quoteId}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#d4a017]" />
        <p className="text-[#6b7280] text-sm">Loading quotes…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-12 text-center">
        <XCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchQuotes}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-[#111113]">Quotes</h3>
          <p className="text-[13px] text-[#9ca3af] mt-0.5">
            {quotes.length === 0 ? 'No quotes yet' : `${quotes.length} quote${quotes.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateWithAI}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-[#d4a017] text-[#b8860b] hover:bg-[#fef9ee] transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Generate with AI
          </button>
          <button
            onClick={handleCreateQuote}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-[#d4a017] text-[#111113] hover:bg-[#b8860b] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Quote
          </button>
        </div>
      </div>

      {/* Empty state */}
      {quotes.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e5e7eb] py-14 text-center">
          <DollarSign className="w-10 h-10 mx-auto mb-3 text-[#e5e7eb]" />
          <p className="text-[#6b7280] text-sm mb-5">No quotes created for this ticket yet</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleGenerateWithAI}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-[#d4a017] text-[#b8860b] hover:bg-[#fef9ee] transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Generate with AI
            </button>
            <button
              onClick={handleCreateQuote}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map((quote) => {
            const StatusIcon = QUOTE_STATUS_ICONS[quote.status] || FileText;
            const isExpiringSoon = quote.valid_until &&
              new Date(quote.valid_until) > new Date() &&
              new Date(quote.valid_until) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            return (
              <div
                key={quote.id}
                onClick={() => handleViewQuote(quote.id)}
                className="bg-white rounded-xl border border-[#e5e7eb] p-4 hover:border-[#d4a017] hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1.5">
                      <StatusIcon className="w-4 h-4 text-[#9ca3af] flex-shrink-0" />
                      <div>
                        <div className="text-[13px] font-semibold text-[#111113]">{quote.quote_number}</div>
                        <div className="text-[13px] text-[#6b7280]">{quote.title}</div>
                      </div>
                      {quote.ai_generated && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#fef9ee] text-[#b8860b] border border-[#d4a017]/30">
                          <Sparkles className="w-3 h-3" /> AI
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[12px] text-[#9ca3af] mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(quote.created_at).toLocaleDateString()}
                      </span>
                      {quote.valid_until && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Valid until {new Date(quote.valid_until).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right ml-4 flex-shrink-0">
                    <div className="text-[18px] font-bold text-[#111113] mb-1.5">
                      £{parseFloat(quote.total_amount || 0).toFixed(2)}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${QUOTE_STATUS_COLORS[quote.status]}`}>
                      {quote.status.toUpperCase()}
                    </span>
                    {isExpiringSoon && (
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fff7ed] text-[#9a3412] border border-[#fed7aa]">
                          Expiring Soon
                        </span>
                      </div>
                    )}
                    {quote.version > 1 && (
                      <div className="mt-1 text-[11px] text-[#9ca3af]">v{quote.version}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
