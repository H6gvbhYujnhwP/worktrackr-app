// web/client/src/app/src/components/ContractsList.jsx
// Phase 5 — contracts list + entry to the contract form. The recurring
// counterpart to OrdersList. Reads /api/contracts.
// Props: initialNewCompanyId (open a fresh contract for this company),
// onConsumeInitial(), isManager (gates pause/cancel inside the form).
// Chrome (header / pills / table shell) comes from SalesPageLayout so every Sales
// tab shares one look (see SalesPageLayout.jsx).
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Repeat } from 'lucide-react';
import ContractForm from './ContractForm.jsx';
import SalesPageLayout, {
  SalesSearch, SalesPrimaryButton, SalesAllPill, SalesFilterPill,
} from './SalesPageLayout.jsx';

const STATUS = {
  draft:     'bg-[#F1EFE8] text-[#2C2C2A]',
  active:    'bg-[#E1F5EE] text-[#085041]',
  paused:    'bg-[#FAEEDA] text-[#854F0B]',
  cancelled: 'bg-[#FAECE7] text-[#993C1D]',
};
const FILTERS = ['draft', 'active', 'paused', 'cancelled'];
const money = (n) => `£${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const GRID = 'grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_28px] gap-2';

export default function ContractsList({ initialNewCompanyId, onConsumeInitial, isManager }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
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

  const counts = useMemo(() => {
    const c = {};
    for (const ct of contracts) c[ct.status] = (c[ct.status] || 0) + 1;
    return c;
  }, [contracts]);

  const activeProfit = useMemo(
    () => contracts.filter((c) => c.status === 'active').reduce((s, c) => s + (Number(c.totals?.monthlyProfit) || 0), 0),
    [contracts],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contracts.filter((c) => {
      if (filter !== 'all' && c.status !== filter) return false;
      if (!q) return true;
      return [c.companyName, c.salespersonName].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [contracts, filter, search]);

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

  const actions = (
    <>
      <SalesSearch value={search} onChange={setSearch} placeholder="Search company, salesperson" />
      <SalesPrimaryButton onClick={() => setOpen({})}>New contract</SalesPrimaryButton>
    </>
  );

  const filters = (
    <>
      <SalesAllPill active={filter === 'all'} count={contracts.length} onClick={() => setFilter('all')} />
      {FILTERS.map((f) => (
        <SalesFilterPill
          key={f}
          active={filter === f}
          pillClass={STATUS[f]}
          count={counts[f] || 0}
          onClick={() => setFilter(filter === f ? 'all' : f)}
        >
          {f}
        </SalesFilterPill>
      ))}
    </>
  );

  const title = (
    <span className="inline-flex items-center gap-2"><Repeat className="w-4 h-4 text-[#0F6E56]" /> Contracts</span>
  );

  return (
    <SalesPageLayout
      title={title}
      subtitle={`${contracts.length} ${contracts.length === 1 ? 'contract' : 'contracts'} · active recurring profit ${money(activeProfit)}/mo`}
      actions={actions}
      filters={filters}
    >
      <div className={`${GRID} px-4 py-2.5 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500`}>
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
            className={`w-full text-left ${GRID} items-center px-4 py-3 border-t border-gray-100 hover:bg-gray-50 ${i % 2 ? 'bg-gray-50/40' : ''}`}>
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
      <div className="px-4 py-3 border-t border-gray-100 text-[12px] text-gray-400">
        Profit feeds recurring commission only while a contract is Active. Paused and cancelled contracts stop accruing.
      </div>
    </SalesPageLayout>
  );
}
