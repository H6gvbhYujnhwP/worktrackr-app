// web/client/src/app/src/components/ContractsList.jsx
// Phase 5 — contracts list + entry to the contract form. The recurring
// counterpart to OrdersList; teal accent signals "recurring". Reads /api/contracts.
// Props: initialNewCompanyId (open a fresh contract for this company),
// onConsumeInitial(), isManager (gates pause/cancel inside the form).
import React, { useEffect, useState } from 'react';
import { Plus, ChevronRight, Repeat } from 'lucide-react';
import ContractForm from './ContractForm.jsx';

const STATUS = {
  draft:     'bg-[#F1EFE8] text-[#2C2C2A]',
  active:    'bg-[#E1F5EE] text-[#085041]',
  paused:    'bg-[#FAEEDA] text-[#854F0B]',
  cancelled: 'bg-[#FAECE7] text-[#993C1D]',
};
const FILTERS = ['all', 'draft', 'active', 'paused', 'cancelled'];
const money = (n) => `£${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function ContractsList({ initialNewCompanyId, onConsumeInitial, isManager }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null); // null | {contractId} | {newCompanyId}

  const load = async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/contracts', { credentials: 'include' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setContracts(await r.json());
    } catch (e) { setError(e.message || 'Failed to load contracts'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    if (initialNewCompanyId) {
      setOpen({ newCompanyId: initialNewCompanyId });
      onConsumeInitial && onConsumeInitial();
    }
  }, []);

  if (open) {
    return (
      <ContractForm
        contractId={open.contractId || null}
        initialCompanyId={open.newCompanyId || null}
        isManager={isManager}
        onBack={() => { setOpen(null); load(); }}
        onSaved={load}
      />
    );
  }

  const visible = contracts.filter((c) => (filter === 'all' ? true : c.status === filter));
  const activeProfit = contracts.filter((c) => c.status === 'active').reduce((s, c) => s + (Number(c.totals?.monthlyProfit) || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="text-lg font-medium text-gray-900 flex items-center gap-2"><Repeat className="w-4 h-4 text-[#0F6E56]" /> Contracts</div>
          <div className="text-[13px] text-gray-500">{contracts.length} {contracts.length === 1 ? 'contract' : 'contracts'} · active recurring profit {money(activeProfit)}/mo</div>
        </div>
        <button onClick={() => setOpen({})} className="inline-flex items-center gap-1.5 rounded-lg border border-[#0F6E56] text-[#085041] px-3 py-1.5 text-[13px] hover:bg-[#E1F5EE]">
          <Plus className="w-4 h-4" /> New contract
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-[13px] capitalize ${filter === f ? 'outline outline-2 outline-[#0F6E56] bg-[#E1F5EE] text-[#085041]' : 'bg-gray-100 text-gray-700'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_28px] gap-2 px-4 py-2.5 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
          <div>Company</div><div>Salesperson</div><div className="text-right">Charge / mo</div><div className="text-right">Profit / mo</div><div />
        </div>
        {loading && <div className="px-4 py-8 text-center text-[13px] text-gray-500">Loading contracts…</div>}
        {error && !loading && <div className="px-4 py-8 text-center text-[13px] text-red-700">{error}</div>}
        {!loading && !error && visible.length === 0 && (
          <div className="px-4 py-10 text-center text-[13px] text-gray-500">No contracts {filter !== 'all' ? `at status “${filter}”` : 'yet'}. Create one with “New contract”.</div>
        )}
        {!loading && !error && visible.map((c, i) => {
          const notAccruing = c.status !== 'active';
          return (
            <button key={c.id} onClick={() => setOpen({ contractId: c.id })}
              className={`w-full text-left grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_28px] gap-2 items-center px-4 py-3 border-t border-gray-100 hover:bg-gray-50 ${i % 2 ? 'bg-gray-50/40' : ''}`}>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{c.companyName || 'No company'}</div>
                <span className={`inline-block mt-1 rounded-md px-2 py-0.5 text-[11px] capitalize ${STATUS[c.status] || 'bg-gray-100 text-gray-700'}`}>{c.status}</span>
              </div>
              <div className="min-w-0 text-[13px] text-gray-600 truncate">{c.salespersonName || '—'}</div>
              <div className="text-right text-[13px] text-gray-700">{money(c.totals?.monthlyCharge)}</div>
              <div className={`text-right text-[13px] ${notAccruing ? 'text-gray-400' : 'text-[#0f6e56]'}`}>{money(c.totals?.monthlyProfit)}</div>
              <div className="text-right text-gray-300"><ChevronRight className="w-4 h-4 inline" /></div>
            </button>
          );
        })}
      </div>
      <div className="text-[12px] text-gray-400 mt-3">Profit feeds recurring commission only while a contract is Active. Paused and cancelled contracts stop accruing.</div>
    </div>
  );
}
