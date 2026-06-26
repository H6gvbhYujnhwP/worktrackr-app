// web/client/src/app/src/components/OrdersList.jsx
// Sales › Orders — orders list + entry to the order form. Encapsulates open/create
// state so the Dashboard only renders <OrdersList/>. Reads /api/orders.
// Props: initialNewCompanyId (open a fresh order for this company), onConsumeInitial().
//
// v3.6 — DARK reskin to match the redesigned Sales group. Same data, same
// search/filters/columns, same "new order for company" entry and row → order
// form. Only the colours change.
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import OrderForm from './OrderForm.jsx';
import SalesPageLayout, {
  SalesSearch, SalesPrimaryButton, SalesAllPill, SalesFilterPill,
} from './SalesPageLayout.jsx';

const STATUS = {
  draft:     'bg-[rgba(107,114,128,0.20)] text-[#cbd5e1]',
  submitted: 'bg-[rgba(59,130,246,0.20)] text-[#93c5fd]',
  approved:  'bg-[rgba(16,185,129,0.20)] text-[#6ee7b7]',
  rejected:  'bg-[rgba(239,68,68,0.20)] text-[#fca5a5]',
  ordered:   'bg-[rgba(245,158,11,0.20)] text-[#fcd34d]',
  invoiced:  'bg-[rgba(59,130,246,0.20)] text-[#93c5fd]',
  paid:      'bg-[rgba(132,204,22,0.20)] text-[#bef264]',
};
const FILTERS = ['draft', 'submitted', 'approved', 'ordered', 'invoiced', 'paid'];
const money = (n) => `£${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const GRID = 'grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_28px] gap-2';

export default function OrdersList({ initialNewCompanyId, onConsumeInitial }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(null); // null | {orderId} | {newCompanyId}

  const load = async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/orders', { credentials: 'include' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setOrders(await r.json());
    } catch (e) { setError(e.message || 'Failed to load orders'); }
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
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (!q) return true;
      return [o.companyName, o.salespersonName].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [orders, filter, search]);

  if (open) {
    return (
      <OrderForm
        orderId={open.orderId || null}
        initialCompanyId={open.newCompanyId || null}
        onBack={() => { setOpen(null); load(); }}
        onSaved={load}
      />
    );
  }

  const actions = (
    <>
      <SalesSearch dark value={search} onChange={setSearch} placeholder="Search company, salesperson" />
      <SalesPrimaryButton dark onClick={() => setOpen({})}>New order</SalesPrimaryButton>
    </>
  );

  const filters = (
    <>
      <SalesAllPill dark active={filter === 'all'} count={orders.length} onClick={() => setFilter('all')} />
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
      title="Orders"
      subtitle={`${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`}
      actions={actions}
      filters={filters}
    >
      <div className={`${GRID} px-4 py-2.5 bg-[#1f1f33] text-[11px] uppercase tracking-wide text-[#6b7280]`}>
        <div>Company</div><div>Salesperson</div><div className="text-right">Value</div><div className="text-right">Profit</div><div />
      </div>
      {loading && <div className="px-4 py-8 text-center text-[13px] text-[#94a3b8]">Loading orders…</div>}
      {error && !loading && <div className="px-4 py-8 text-center text-[13px] text-[#fca5a5]">{error}</div>}
      {!loading && !error && visible.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px] text-[#94a3b8]">No orders {filter !== 'all' ? `at status “${filter}”` : 'yet'}. Create one with “New order”.</div>
      )}
      {!loading && !error && visible.map((o) => (
        <button key={o.id} onClick={() => setOpen({ orderId: o.id })}
          className={`w-full text-left ${GRID} items-center px-4 py-3 border-t border-[#2e2e4a] hover:bg-[#2a2a48]`}>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">{o.companyName || 'No company'}</div>
            <span className={`inline-block mt-1 rounded-md px-2 py-0.5 text-[11px] capitalize ${STATUS[o.status] || 'bg-[rgba(107,114,128,0.20)] text-[#cbd5e1]'}`}>{o.status}</span>
          </div>
          <div className="min-w-0 text-[13px] text-[#94a3b8] truncate">{o.salespersonName || '—'}</div>
          <div className="text-right text-[13px] text-[#cbd5e1]">{money(o.totals?.value)}</div>
          <div className="text-right text-[13px] text-[#6ee7b7]">{money(o.totals?.profit)}</div>
          <div className="text-right text-[#6b7280]"><ChevronRight className="w-4 h-4 inline" /></div>
        </button>
      ))}
    </SalesPageLayout>
  );
}
