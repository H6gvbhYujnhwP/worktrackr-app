// web/client/src/app/src/components/QuotesList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, FileText, ArrowUpDown } from 'lucide-react';

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

  const statusBadge = (status) => {
    const map = {
      draft:    'bg-[#f3f4f6] text-[#6b7280]',
      sent:     'bg-[#dbeafe] text-[#1d4ed8]',
      accepted: 'bg-[#dcfce7] text-[#15803d]',
      declined: 'bg-[#fee2e2] text-[#dc2626]',
      expired:  'bg-[#ffedd5] text-[#c2410c]',
    };
    const cls = map[status] || map.draft;
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

  const SortTh = ({ field, children }) => (
    <th
      className="text-left py-3 px-4 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider bg-[#fafafa] cursor-pointer hover:text-[#374151] select-none"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1.5">
        {children}
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-[13px] text-[#9ca3af]">
        Loading quotes...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-6">
        <p className="text-[13px] text-red-600 mb-3">Error: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 text-[13px] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#111113]">Quotes</h1>
          <p className="text-[13px] text-[#9ca3af] mt-0.5">Manage and track customer quotes</p>
        </div>
        <button
          onClick={() => navigate('/app/crm/quotes/new')}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create New Quote
        </button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Quotes', value: quotes.length, color: 'text-[#111113]' },
          { label: 'Sent', value: quotes.filter(q => q.status === 'sent').length, color: 'text-[#1d4ed8]' },
          { label: 'Accepted', value: quotes.filter(q => q.status === 'accepted').length, color: 'text-[#15803d]' },
          { label: 'Total Value', value: formatCurrency(quotes.reduce((s, q) => s + parseFloat(q.total_amount || 0), 0)), color: 'text-[#111113]' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-[#e5e7eb] px-4 py-3">
            <div className={`text-[22px] font-bold ${color}`}>{value}</div>
            <div className="text-[11px] text-[#9ca3af] uppercase tracking-wider mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Main table container */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 p-4 border-b border-[#e5e7eb]">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search by quote number, title, or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-[13px] border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#9ca3af]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-[13px] border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017] bg-white"
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

        {filteredQuotes.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-10 h-10 text-[#e5e7eb] mx-auto mb-3" />
            <h3 className="text-[14px] font-medium text-[#374151] mb-1">
              {quotes.length === 0 ? 'No quotes yet' : 'No quotes found'}
            </h3>
            <p className="text-[13px] text-[#9ca3af] mb-4">
              {quotes.length === 0 ? 'Create your first quote to get started' : 'Try adjusting your search or filters'}
            </p>
            {quotes.length === 0 && (
              <button
                onClick={() => navigate('/app/crm/quotes/new')}
                className="px-4 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg transition-colors"
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
                  <tr className="border-b border-[#e5e7eb]">
                    <SortTh field="quote_number">Quote #</SortTh>
                    <SortTh field="customer_name">Customer</SortTh>
                    <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider bg-[#fafafa]">Title</th>
                    <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider bg-[#fafafa]">Status</th>
                    <SortTh field="total_amount">Total</SortTh>
                    <SortTh field="valid_until">Valid Until</SortTh>
                    <SortTh field="created_at">Created</SortTh>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map((quote, index) => (
                    <tr
                      key={quote.id}
                      onClick={() => navigate(`/app/crm/quotes/${quote.quote_number}`)}
                      className={`border-b border-[#f3f4f6] hover:bg-[#fef9ee] cursor-pointer transition-colors text-[13px] ${index % 2 === 1 ? 'bg-[#fafbfc]' : 'bg-white'}`}
                    >
                      <td className="py-3 px-4 font-medium text-[#d4a017]">{quote.quote_number}</td>
                      <td className="py-3 px-4 text-[#111113]">{quote.customer_name || 'Unknown'}</td>
                      <td className="py-3 px-4 text-[#374151]">{quote.title}</td>
                      <td className="py-3 px-4">{statusBadge(quote.status)}</td>
                      <td className="py-3 px-4 font-medium text-[#111113]">{formatCurrency(quote.total_amount)}</td>
                      <td className="py-3 px-4 text-[#6b7280]">{formatDate(quote.valid_until)}</td>
                      <td className="py-3 px-4 text-[#9ca3af]">{formatDate(quote.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-[#f3f4f6] text-[12px] text-[#9ca3af]">
              Showing {filteredQuotes.length} of {quotes.length} quotes
            </div>
          </>
        )}
      </div>
    </div>
  );
}
