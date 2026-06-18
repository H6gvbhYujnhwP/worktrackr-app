// web/client/src/app/src/components/DealsList.jsx
// Phase 6 (slim) — deals list + the simple forecast: one headline number,
// "open pipeline" = sum of value for deals still Open or In progress.
import React, { useEffect, useState } from 'react';
import { Plus, ChevronRight, Target } from 'lucide-react';
import DealForm from './DealForm.jsx';

const STAGE = {
  open:        { label: 'Open',        pill: 'bg-[#F1EFE8] text-[#2C2C2A]' },
  in_progress: { label: 'In progress', pill: 'bg-[#E6F1FB] text-[#0C447C]' },
  won:         { label: 'Won',         pill: 'bg-[#E1F5EE] text-[#085041]' },
  lost:        { label: 'Lost',        pill: 'bg-[#FAECE7] text-[#993C1D]' },
};
const FILTERS = ['all', 'open', 'in_progress', 'won', 'lost'];
const money = (n) => `£${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const isOpen = (s) => s === 'open' || s === 'in_progress';

export default function DealsList({ initialNewCompanyId, onConsumeInitial }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null); // null | {dealId} | {newCompanyId}

  const load = async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/deals', { credentials: 'include' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setDeals(await r.json());
    } catch (e) { setError(e.message || 'Failed to load deals'); } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    if (initialNewCompanyId) { setOpen({ newCompanyId: initialNewCompanyId }); onConsumeInitial && onConsumeInitial(); }
  }, []);

  if (open) {
    return <DealForm dealId={open.dealId || null} initialCompanyId={open.newCompanyId || null} onBack={() => { setOpen(null); load(); }} onSaved={load} />;
  }

  const visible = deals.filter((d) => (filter === 'all' ? true : d.stage === filter));
  const openPipeline = deals.filter((d) => isOpen(d.stage)).reduce((s, d) => s + (Number(d.value) || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="text-lg font-medium text-gray-900 flex items-center gap-2"><Target className="w-4 h-4 text-[#0C447C]" /> Deals</div>
          <div className="text-[13px] text-gray-500">Open pipeline <span className="font-medium text-[#0C447C]">{money(openPipeline)}</span> · {deals.length} {deals.length === 1 ? 'deal' : 'deals'}</div>
        </div>
        <button onClick={() => setOpen({})} className="inline-flex items-center gap-1.5 rounded-lg border border-[#0C447C] text-[#0C447C] px-3 py-1.5 text-[13px] hover:bg-[#E6F1FB]">
          <Plus className="w-4 h-4" /> New deal
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-[13px] ${filter === f ? 'outline outline-2 outline-[#0C447C] bg-[#E6F1FB] text-[#0C447C]' : 'bg-gray-100 text-gray-700'}`}>
            {f === 'all' ? 'All' : STAGE[f].label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_28px] gap-2 px-4 py-2.5 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
          <div>Deal</div><div>Company</div><div className="text-right">Value</div><div>Close</div><div />
        </div>
        {loading && <div className="px-4 py-8 text-center text-[13px] text-gray-500">Loading deals…</div>}
        {error && !loading && <div className="px-4 py-8 text-center text-[13px] text-red-700">{error}</div>}
        {!loading && !error && visible.length === 0 && (
          <div className="px-4 py-10 text-center text-[13px] text-gray-500">No deals {filter !== 'all' ? `at “${STAGE[filter].label}”` : 'yet'}. Add one with “New deal”.</div>
        )}
        {!loading && !error && visible.map((d, i) => (
          <button key={d.id} onClick={() => setOpen({ dealId: d.id })}
            className={`w-full text-left grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_28px] gap-2 items-center px-4 py-3 border-t border-gray-100 hover:bg-gray-50 ${i % 2 ? 'bg-gray-50/40' : ''}`}>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{d.title}</div>
              <span className={`inline-block mt-1 rounded-md px-2 py-0.5 text-[11px] ${STAGE[d.stage]?.pill || 'bg-gray-100 text-gray-700'}`}>{STAGE[d.stage]?.label || d.stage}</span>
            </div>
            <div className="min-w-0 text-[13px] text-gray-600 truncate">{d.companyName || '—'}</div>
            <div className="text-right text-[13px] text-gray-700">{money(d.value)}</div>
            <div className="text-[13px] text-gray-500">{d.expectedCloseDate ? String(d.expectedCloseDate).slice(0, 10) : '—'}</div>
            <div className="text-right text-gray-300"><ChevronRight className="w-4 h-4 inline" /></div>
          </button>
        ))}
      </div>
      <div className="text-[12px] text-gray-400 mt-3">Open pipeline = total value of deals still Open or In progress. Won and Lost don't count.</div>
    </div>
  );
}
