// web/client/src/app/src/components/OrdersList.jsx
// Phase 3 — orders list + entry to the order form. Encapsulates open/create
// state so the Dashboard only renders <OrdersList/>. Reads /api/orders.
// Props: initialNewCompanyId (open a fresh order for this company), onConsumeInitial().
import React, { useEffect, useState } from 'react';
import { Plus, ChevronRight } from 'lucide-react';
import OrderForm from './OrderForm.jsx';

const STATUS = {
  draft:     'bg-[#F1EFE8] text-[#2C2C2A]',
  submitted: 'bg-[#E6F1FB] text-[#0C447C]',
  approved:  'bg-[#E1F5EE] text-[#085041]',
  rejected:  'bg-[#FAECE7] text-[#993C1D]',
  ordered:   'bg-[#FAEEDA] text-[#854F0B]',
  invoiced:  'bg-[#E6F1FB] text-[#0C447C]',
  paid:      'bg-[#EAF3DE] text-[#27500A]',
};
const FILTERS = ['all', 'draft', 'submitted', 'approved', 'ordered', 'invoiced', 'paid'];
const money = (n) => `£${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function OrdersList({ initialNewCompanyId, onConsumeInitial }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
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

  const visible = orders.filter((o) => (filter === 'all' ? true : o.status === filter));

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="text-lg font-medium text-gray-900">Orders</div>
          <div className="text-[13px] text-gray-500">{orders.length} {orders.length === 1 ? 'order' : 'orders'}</div>
        </div>
        <button onClick={() => setOpen({})} className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4a017] text-[#8a6a0f] px-3 py-1.5 text-[13px] hover:bg-[rgba(212,160,23,0.08)]">
          <Plus className="w-4 h-4" /> New order
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-[13px] capitalize ${filter === f ? 'outline outline-2 outline-[#d4a017] bg-[rgba(212,160,23,0.12)] text-[#8a6a0f]' : 'bg-gray-100 text-gray-700'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_28px] gap-2 px-4 py-2.5 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
          <div>Company</div><div>Salesperson</div><div className="text-right">Value</div><div className="text-right">Profit</div><div />
        </div>
        {loading && <div className="px-4 py-8 text-center text-[13px] text-gray-500">Loading orders…</div>}
        {error && !loading && <div className="px-4 py-8 text-center text-[13px] text-red-700">{error}</div>}
        {!loading && !error && visible.length === 0 && (
          <div className="px-4 py-10 text-center text-[13px] text-gray-500">No orders {filter !== 'all' ? `at status “${filter}”` : 'yet'}. Create one with “New order”.</div>
        )}
        {!loading && !error && visible.map((o, i) => (
          <button key={o.id} onClick={() => setOpen({ orderId: o.id })}
            className={`w-full text-left grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_28px] gap-2 items-center px-4 py-3 border-t border-gray-100 hover:bg-gray-50 ${i % 2 ? 'bg-gray-50/40' : ''}`}>
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
      </div>
    </div>
  );
}
