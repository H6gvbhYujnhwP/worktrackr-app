// web/client/src/app/src/components/OrdersList.jsx
// Phase 3 — orders list + entry to the order form. Encapsulates open/create
// state so the Dashboard only renders <OrdersList/>. Reads /api/orders.
// Props: initialNewCompanyId (open a fresh order for this company), onConsumeInitial().
// Chrome (header / pills / table shell) comes from SalesPageLayout so every Sales
// tab shares one look (see SalesPageLayout.jsx).
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import OrderForm from './OrderForm.jsx';
import SalesPageLayout, {
  SalesSearch, SalesPrimaryButton, SalesAllPill, SalesFilterPill,
} from './SalesPageLayout.jsx';

const STATUS = {
  draft:     'bg-[#F1EFE8] text-[#2C2C2A]',
  submitted: 'bg-[#E6F1FB] text-[#0C447C]',
  approved:  'bg-[#E1F5EE] text-[#085041]',
  rejected:  'bg-[#FAECE7] text-[#993C1D]',
  ordered:   'bg-[#FAEEDA] text-[#854F0B]',
  invoiced:  'bg-[#E6F1FB] text-[#0C447C]',
  paid:      'bg-[#EAF3DE] text-[#27500A]',
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
      <SalesSearch value={search} onChange={setSearch} placeholder="Search company, salesperson" />
      <SalesPrimaryButton onClick={() => setOpen({})}>New order</SalesPrimaryButton>
    </>
  );

  const filters = (
    <>
      <SalesAllPill active={filter === 'all'} count={orders.length} onClick={() => setFilter('all')} />
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

  return (
    <SalesPageLayout
      title="Orders"
      subtitle={`${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`}
      actions={actions}
      filters={filters}
    >
      <div className={`${GRID} px-4 py-2.5 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500`}>
        <div>Company</div><div>Salesperson</div><div className="text-right">Value</div><div className="text-right">Profit</div><div />
      </div>
      {loading && <div className="px-4 py-8 text-center text-[13px] text-gray-500">Loading orders…</div>}
      {error && !loading && <div className="px-4 py-8 text-center text-[13px] text-red-700">{error}</div>}
      {!loading && !error && visible.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px] text-gray-500">No orders {filter !== 'all' ? `at status “${filter}”` : 'yet'}. Create one with “New order”.</div>
      )}
      {!loading && !error && visible.map((o, i) => (
        <button key={o.id} onClick={() => setOpen({ orderId: o.id })}
          className={`w-full text-left ${GRID} items-center px-4 py-3 border-t border-gray-100 hover:bg-gray-50 ${i % 2 ? 'bg-gray-50/40' : ''}`}>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{o.companyName || 'No company'}</div>
            <span className={`inline-block mt-1 rounded-md px-2 py-0.5 text-[11px] capitalize ${STATUS[o.status] || 'bg-gray-100 text-gray-700'}`}>{o.status}</span>
          </div>
          <div className="min-w-0 text-[13px] text-gray-600 truncate">{o.salespersonName || '—'}</div>
          <div className="text-right text-[13px] text-gray-700">{money(o.totals?.value)}</div>
          <div className="text-right text-[13px] text-[#0f6e56]">{money(o.totals?.profit)}</div>
          <div className="text-right text-gray-300"><ChevronRight className="w-4 h-4 inline" /></div>
        </button>
      ))}
    </SalesPageLayout>
  );
}
