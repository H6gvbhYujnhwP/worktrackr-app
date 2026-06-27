// web/client/src/app/src/components/SalesQuotes.jsx
// Sales › Quotes tab. Shows ONLY a quotes list (no stat cards, no sub-tabs).
// Picks the source:
//   • org connected to IdoYourQuotes → the read-only IDYQ quotes list
//     (IdyqQuotesView, which keeps its line-item expand + act-on-quote actions);
//   • not connected → the org's native WorkTrackr quotes, in the shared chrome.
//
// v3.6 — DARK reskin to match the redesigned Sales group. Same data, same
// branching, same actions/filters/columns — only the colours change. The IDYQ
// view stays as-is (self-contained); only its surrounding title row is darkened.
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Lock } from 'lucide-react';
import { useIdyqConnection, IdyqQuotesView } from './IdyqIntegration.jsx';
import SalesPageLayout, {
  SalesSearch, SalesPrimaryButton, SalesAllPill, SalesFilterPill,
} from './SalesPageLayout.jsx';

// native quote statuses, dark-friendly pill colours
const STATUS = {
  draft:    'bg-[rgba(107,114,128,0.20)] text-[#cbd5e1]',
  sent:     'bg-[rgba(59,130,246,0.20)] text-[#93c5fd]',
  accepted: 'bg-[rgba(16,185,129,0.20)] text-[#6ee7b7]',
  declined: 'bg-[rgba(239,68,68,0.20)] text-[#fca5a5]',
  expired:  'bg-[rgba(245,158,11,0.20)] text-[#fcd34d]',
};
const FILTERS = ['draft', 'sent', 'accepted', 'declined', 'expired'];
const GRID = 'grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_28px] gap-2';
const money = (n) => `£${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ukDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

// ── native (non-IDYQ) quotes list, in the shared dark chrome ─────────────────
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
      <SalesSearch dark value={search} onChange={setSearch} placeholder="Search quote, customer, title" />
      <SalesPrimaryButton dark onClick={() => navigate('/app/crm/quotes/new')}>Create quote</SalesPrimaryButton>
    </>
  );

  const filters = (
    <>
      <SalesAllPill dark active={filter === 'all'} count={quotes.length} onClick={() => setFilter('all')} />
      {FILTERS.map((f) => (
        <SalesFilterPill
          key={f}
          dark
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
      dark
      title="Quotes"
      subtitle={`${quotes.length} ${quotes.length === 1 ? 'quote' : 'quotes'}`}
      actions={actions}
      filters={filters}
    >
      <div className={`${GRID} px-4 py-2.5 bg-[#1f1f33] text-[11px] uppercase tracking-wide text-[#6b7280]`}>
        <div>Quote</div><div>Customer</div><div>Title</div><div className="text-right">Total</div><div className="text-right">Created</div><div />
      </div>
      {loading && <div className="px-4 py-8 text-center text-[13px] text-[#94a3b8]">Loading quotes…</div>}
      {error && !loading && <div className="px-4 py-8 text-center text-[13px] text-[#fca5a5]">Couldn’t load quotes: {error}</div>}
      {!loading && !error && visible.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px] text-[#94a3b8]">No quotes {filter !== 'all' ? `at status “${filter}”` : 'yet'}. Create one with “Create quote”.</div>
      )}
      {!loading && !error && visible.map((q) => (
        <button key={q.id} onClick={() => navigate(`/app/crm/quotes/${q.id}/edit`)}
          className={`w-full text-left ${GRID} items-center px-4 py-3 border-t border-[#2e2e4a] hover:bg-[#2a2a48]`}>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">{q.quote_number || '—'}</div>
            <span className={`inline-block mt-1 rounded-md px-2 py-0.5 text-[11px] capitalize ${STATUS[q.status] || 'bg-[rgba(107,114,128,0.20)] text-[#cbd5e1]'}`}>{q.status || 'draft'}</span>
          </div>
          <div className="min-w-0 text-[13px] text-[#cbd5e1] truncate">{q.customer_name || 'Unknown'}</div>
          <div className="min-w-0 text-[13px] text-[#94a3b8] truncate">{q.title || '—'}</div>
          <div className="text-right text-[13px] text-white">{money(q.total_amount)}</div>
          <div className="text-right text-[13px] text-[#94a3b8]">{ukDate(q.created_at)}</div>
          <div className="text-right text-[#6b7280]"><ChevronRight className="w-4 h-4 inline" /></div>
        </button>
      ))}
    </SalesPageLayout>
  );
}

// ── connected (IDYQ) — read-only list, reusing IdyqQuotesView ─────────────────
function IdyqQuotes({ onOrderCreated }) {
  // IdyqQuotesView is self-contained (read-only badge, search, line-item expand,
  // act-on-quote). We only add the dark page title + width so it sits in the
  // Sales tab like the others — no stat cards, no sub-tabs.
  return (
    <div className="p-5 md:p-7 min-h-full bg-[#1a1a2e]">
      <div className="mb-4">
        <div className="text-2xl font-semibold text-white">Quotes</div>
        <div className="text-[13px] text-[#94a3b8] flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-[#6b7280]" /> Read-only · from IdoYourQuotes
        </div>
      </div>
      <IdyqQuotesView onOrderCreated={onOrderCreated} />
    </div>
  );
}

export default function SalesQuotes({ onOrderCreated }) {
  const { connected, loading } = useIdyqConnection();

  if (loading) {
    return (
      <div className="p-5 md:p-7 min-h-full bg-[#1a1a2e]">
        <div className="text-2xl font-semibold text-white mb-4">Quotes</div>
        <div className="border border-[#2e2e4a] rounded-xl bg-[#242438] px-4 py-10 text-center text-[13px] text-[#94a3b8]">
          Loading quotes…
        </div>
      </div>
    );
  }

  return connected ? <IdyqQuotes onOrderCreated={onOrderCreated} /> : <NativeQuotes />;
}
