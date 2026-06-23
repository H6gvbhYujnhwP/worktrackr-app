// web/client/src/app/src/components/SalesQuotes.jsx
// Phase 8 (UX consolidation) — the Sales › Quotes tab.
// Shows ONLY a quotes list (no stat cards, no inner sub-tabs). Picks the source:
//   • org connected to IdoYourQuotes → the read-only IDYQ quotes list
//     (IdyqQuotesView, which keeps its line-item expand + act-on-quote actions);
//   • not connected → the org's native WorkTrackr quotes, in the shared chrome.
// This replaces the old behaviour where the whole CRM mega-page (Customers /
// Product Catalog / Quotes / CRM Settings sub-tabs + 4 stat cards) was shown here.
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Lock } from 'lucide-react';
import { useIdyqConnection, IdyqQuotesView } from './IdyqIntegration.jsx';
import SalesPageLayout, {
  SalesSearch, SalesPrimaryButton, SalesAllPill, SalesFilterPill,
} from './SalesPageLayout.jsx';

// native quote statuses, coloured from the shared Sales palette
const STATUS = {
  draft:    'bg-[#F1EFE8] text-[#2C2C2A]',
  sent:     'bg-[#E6F1FB] text-[#0C447C]',
  accepted: 'bg-[#E1F5EE] text-[#085041]',
  declined: 'bg-[#FAECE7] text-[#993C1D]',
  expired:  'bg-[#FAEEDA] text-[#854F0B]',
};
const FILTERS = ['draft', 'sent', 'accepted', 'declined', 'expired'];
const GRID = 'grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_28px] gap-2';
const money = (n) => `£${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ukDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

// ── native (non-IDYQ) quotes list, in the shared chrome ──────────────────────
function NativeQuotes() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch('/api/quotes', { credentials: 'include' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (alive) setQuotes(Array.isArray(data?.quotes) ? data.quotes : []);
      } catch (e) {
        if (alive) setError(e.message || 'Failed to load quotes');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const counts = useMemo(() => {
    const c = {};
    for (const q of quotes) c[q.status] = (c[q.status] || 0) + 1;
    return c;
  }, [quotes]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quotes.filter((qt) => {
      if (filter !== 'all' && qt.status !== filter) return false;
      if (!q) return true;
      return [qt.quote_number, qt.title, qt.customer_name].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [quotes, filter, search]);

  const actions = (
    <>
      <SalesSearch value={search} onChange={setSearch} placeholder="Search quote, customer, title" />
      <SalesPrimaryButton onClick={() => navigate('/app/crm/quotes/new')}>Create quote</SalesPrimaryButton>
    </>
  );

  const filters = (
    <>
      <SalesAllPill active={filter === 'all'} count={quotes.length} onClick={() => setFilter('all')} />
      {FILTERS.map((f) => (
        <SalesFilterPill
          key={f}
          active={filter === f}
          pillClass={STATUS[f]}
          count={counts[f] || 0}
          onClick={() => setFilter(filter === f ? 'all' : f)}
          capitalize
        >
          {f}
        </SalesFilterPill>
      ))}
    </>
  );

  return (
    <SalesPageLayout
      title="Quotes"
      subtitle={`${quotes.length} ${quotes.length === 1 ? 'quote' : 'quotes'}`}
      actions={actions}
      filters={filters}
    >
      <div className={`${GRID} px-4 py-2.5 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500`}>
        <div>Quote</div><div>Customer</div><div>Title</div><div className="text-right">Total</div><div className="text-right">Created</div><div />
      </div>
      {loading && <div className="px-4 py-8 text-center text-[13px] text-gray-500">Loading quotes…</div>}
      {error && !loading && <div className="px-4 py-8 text-center text-[13px] text-red-700">Couldn’t load quotes: {error}</div>}
      {!loading && !error && visible.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px] text-gray-500">No quotes {filter !== 'all' ? `at status “${filter}”` : 'yet'}. Create one with “Create quote”.</div>
      )}
      {!loading && !error && visible.map((q, i) => (
        <button key={q.id} onClick={() => navigate(`/app/crm/quotes/${q.id}/edit`)}
          className={`w-full text-left ${GRID} items-center px-4 py-3 border-t border-gray-100 hover:bg-gray-50 ${i % 2 ? 'bg-gray-50/40' : ''}`}>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{q.quote_number || '—'}</div>
            <span className={`inline-block mt-1 rounded-md px-2 py-0.5 text-[11px] capitalize ${STATUS[q.status] || 'bg-gray-100 text-gray-700'}`}>{q.status || 'draft'}</span>
          </div>
          <div className="min-w-0 text-[13px] text-gray-700 truncate">{q.customer_name || 'Unknown'}</div>
          <div className="min-w-0 text-[13px] text-gray-600 truncate">{q.title || '—'}</div>
          <div className="text-right text-[13px] text-gray-700">{money(q.total_amount)}</div>
          <div className="text-right text-[13px] text-gray-500">{ukDate(q.created_at)}</div>
          <div className="text-right text-gray-300"><ChevronRight className="w-4 h-4 inline" /></div>
        </button>
      ))}
    </SalesPageLayout>
  );
}

// ── connected (IDYQ) — read-only list, reusing IdyqQuotesView ─────────────────
function IdyqQuotes() {
  // IdyqQuotesView is self-contained (read-only badge, search, line-item expand,
  // and the act-on-quote actions). We only add the page title + width so it sits
  // in the Sales tab like the others — no stat cards, no sub-tabs.
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-4">
        <div className="text-lg font-medium text-gray-900">Quotes</div>
        <div className="text-[13px] text-gray-500 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-gray-400" /> Read-only · from IdoYourQuotes
        </div>
      </div>
      <IdyqQuotesView />
    </div>
  );
}

export default function SalesQuotes() {
  const { connected, loading } = useIdyqConnection();

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="text-lg font-medium text-gray-900 mb-4">Quotes</div>
        <div className="border border-gray-200 rounded-xl bg-white px-4 py-10 text-center text-[13px] text-gray-500">
          Loading quotes…
        </div>
      </div>
    );
  }

  return connected ? <IdyqQuotes /> : <NativeQuotes />;
}
