// Sales › Quotes list — dark reskin matching the WorkTrackr v3.1 design system.
// All data fetching, routing, search, sort, and filter behaviour is unchanged.
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, FileText, ArrowUpDown, FileCheck } from 'lucide-react';
import PageHero, { HeroButtonPrimary } from './PageHero.jsx';

export default function QuotesList() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    const fetchQuotes = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/quotes', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch quotes');
        const data = await response.json();
        setQuotes(data.quotes || []);
      } catch (err) {
        console.error('Error fetching quotes:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchQuotes();
  }, []);

  const STATUS_DARK = {
    draft:    'bg-[rgba(107,114,128,0.20)] text-[#cbd5e1]',
    sent:     'bg-[rgba(59,130,246,0.20)] text-[#93c5fd]',
    accepted: 'bg-[rgba(16,185,129,0.20)] text-[#6ee7b7]',
    declined: 'bg-[rgba(239,68,68,0.20)] text-[#fca5a5]',
    expired:  'bg-[rgba(245,158,11,0.20)] text-[#fcd34d]',
  };

  const statusBadge = (status) => {
    const cls = STATUS_DARK[status] || STATUS_DARK.draft;
    const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>
        {label}
      </span>
    );
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount) => `£${parseFloat(amount || 0).toFixed(2)}`;

  const filteredQuotes = quotes
    .filter(q => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (
          q.quote_number?.toLowerCase().includes(s) ||
          q.title?.toLowerCase().includes(s) ||
          q.customer_name?.toLowerCase().includes(s)
        );
      }
      return true;
    })
    .sort((a, b) => {
      let av = a[sortBy], bv = b[sortBy];
      if (sortBy === 'created_at' || sortBy === 'valid_until') {
        av = new Date(av || 0).getTime();
        bv = new Date(bv || 0).getTime();
      }
      if (sortBy === 'total_amount') {
        av = parseFloat(av || 0);
        bv = parseFloat(bv || 0);
      }
      return sortOrder === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const toggleSort = (field) => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
  };

  const renderSortTh = (field, children) => (
    <th
      className="text-left py-3 px-4 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider bg-[#1f1f33] cursor-pointer hover:text-[#94a3b8] select-none"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1.5">
        {children}
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      </div>
    </th>
  );

  const heroActions = (
    <HeroButtonPrimary icon={Plus} onClick={() => navigate('/app/crm/quotes/new')}>
      Create New Quote
    </HeroButtonPrimary>
  );

  if (loading) {
    return (
      <div className="p-5 md:p-7 min-h-full bg-[#1a1a2e]">
        <div className="mb-5">
          <PageHero title="Quotes" icon={FileCheck} actions={heroActions} compact />
        </div>
        <div className="flex justify-center items-center h-48 text-[13px] text-[#94a3b8]">Loading quotes…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 md:p-7 min-h-full bg-[#1a1a2e]">
        <div className="mb-5">
          <PageHero title="Quotes" icon={FileCheck} actions={heroActions} compact />
        </div>
        <div className="rounded-xl border border-[#2e2e4a] bg-[#242438] p-6">
          <p className="text-[13px] text-[#fca5a5] mb-3">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 text-[13px] border border-[#2e2e4a] text-[#94a3b8] rounded-lg hover:bg-[#2a2a48]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-7 min-h-full bg-[#1a1a2e]">

      {/* Glowing hero header */}
      <div className="mb-5">
        <PageHero title="Quotes" icon={FileCheck} actions={heroActions} compact />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
          <input
            type="text"
            placeholder="Search by quote number, title, or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-[13px] border border-[#2e2e4a] rounded-lg bg-[#242438] text-white placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/30 focus:border-[#f59e0b]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#6b7280]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-[13px] border border-[#2e2e4a] rounded-lg bg-[#242438] text-white focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/30 focus:border-[#f59e0b]"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-[#2e2e4a] rounded-xl overflow-hidden bg-[#242438]">
        {filteredQuotes.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-10 h-10 text-[#2e2e4a] mx-auto mb-3" />
            <h3 className="text-[14px] font-medium text-[#94a3b8] mb-1">
              {quotes.length === 0 ? 'No quotes yet' : 'No quotes found'}
            </h3>
            <p className="text-[13px] text-[#6b7280] mb-4">
              {quotes.length === 0 ? 'Create your first quote to get started' : 'Try adjusting your search or filters'}
            </p>
            {quotes.length === 0 && (
              <button
                onClick={() => navigate('/app/crm/quotes/new')}
                className="px-4 py-2 text-[13px] font-medium text-[#1a1a2e] bg-[#f59e0b] hover:bg-[#d97706] rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-1.5" />
                Create New Quote
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2e2e4a]">
                    {renderSortTh('quote_number', 'Quote #')}
                    {renderSortTh('customer_name', 'Customer')}
                    <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider bg-[#1f1f33]">Title</th>
                    <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider bg-[#1f1f33]">Status</th>
                    {renderSortTh('total_amount', 'Total')}
                    {renderSortTh('valid_until', 'Valid Until')}
                    {renderSortTh('created_at', 'Created')}
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map((quote) => (
                    <tr
                      key={quote.id}
                      onClick={() => navigate(`/app/crm/quotes/${quote.quote_number}`)}
                      className="border-b border-[#2e2e4a] hover:bg-[#2a2a48] cursor-pointer transition-colors text-[13px]"
                    >
                      <td className="py-3 px-4 font-medium text-[#f59e0b]">{quote.quote_number}</td>
                      <td className="py-3 px-4 text-white">{quote.customer_name || 'Unknown'}</td>
                      <td className="py-3 px-4 text-[#cbd5e1]">{quote.title}</td>
                      <td className="py-3 px-4">{statusBadge(quote.status)}</td>
                      <td className="py-3 px-4 font-medium text-white">{formatCurrency(quote.total_amount)}</td>
                      <td className="py-3 px-4 text-[#94a3b8]">{formatDate(quote.valid_until)}</td>
                      <td className="py-3 px-4 text-[#6b7280]">{formatDate(quote.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-[#2e2e4a] text-[12px] text-[#6b7280]">
              Showing {filteredQuotes.length} of {quotes.length} quotes
            </div>
          </>
        )}
      </div>
    </div>
  );
}
