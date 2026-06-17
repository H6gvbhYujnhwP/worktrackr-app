// web/client/src/app/src/components/OrderQueues.jsx
// Phase 3 — manager queues. Approval queue (approve/reject submitted orders with
// a comment) and Purchasing & fulfilment (approved -> ordered -> invoiced -> paid).
// All actions hit the orders API; the API enforces manager-only.
import React, { useEffect, useState } from 'react';
import { Check, X, ShoppingCart, Receipt, Banknote } from 'lucide-react';

const money = (n) => `£${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function OrderQueues() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState({}); // orderId -> comment
  const [busy, setBusy] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/orders', { credentials: 'include' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setOrders(await r.json());
    } catch (e) { setError(e.message || 'Failed to load orders'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const act = async (id, path, body) => {
    setBusy(id + path); setError(null);
    try {
      const r = await fetch(`/api/orders/${id}/${path}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (r.status === 403) throw new Error('Only managers can do that.');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(null); }
  };

  const approval = orders.filter((o) => o.status === 'submitted');
  const purchasing = orders.filter((o) => o.status === 'approved');
  const fulfilment = orders.filter((o) => ['ordered', 'invoiced'].includes(o.status));

  const Row = ({ o, right }) => (
    <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-center px-4 py-3 border-t border-gray-100">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-gray-900 truncate">{o.companyName || 'No company'}</div>
        <div className="text-[12px] text-gray-500 truncate">{o.salespersonName || '—'}</div>
      </div>
      <div className="text-right text-[13px] text-gray-700">{money(o.totals?.value)}</div>
      <div className="text-right text-[13px] text-[#0f6e56]">{money(o.totals?.profit)} profit</div>
      <div className="flex items-center gap-1.5 justify-end">{right}</div>
    </div>
  );

  const Card = ({ title, count, children }) => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-3">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
        <span className="text-[14px] font-medium text-gray-900">{title}</span>
        <span className="text-[12px] text-gray-500">{count}</span>
      </div>
      {children}
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-4">
        <div className="text-lg font-medium text-gray-900">Order approvals</div>
        <div className="text-[13px] text-gray-500">Approve orders, then drive them through purchasing to paid.</div>
      </div>
      {error && <div className="text-[12px] text-red-700 mb-3">{error}</div>}
      {loading && <div className="text-[13px] text-gray-500">Loading…</div>}

      {!loading && (
        <>
          <Card title="Approval queue" count={`${approval.length} awaiting`}>
            {approval.length === 0 && <div className="px-4 py-6 text-center text-[13px] text-gray-500">Nothing awaiting approval.</div>}
            {approval.map((o) => (
              <div key={o.id} className="border-t border-gray-100">
                <Row o={o} right={
                  <>
                    <button disabled={busy} onClick={() => act(o.id, 'approve', { comment: comments[o.id] || null })}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#0F6E56] text-[#0F6E56] px-2.5 py-1 text-[12px]"><Check className="w-3.5 h-3.5" /> Approve</button>
                    <button disabled={busy} onClick={() => act(o.id, 'reject', { comment: comments[o.id] || null })}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#a32d2d] text-[#a32d2d] px-2.5 py-1 text-[12px]"><X className="w-3.5 h-3.5" /> Reject</button>
                  </>
                } />
                <div className="px-4 pb-3 -mt-1">
                  <input value={comments[o.id] || ''} onChange={(e) => setComments({ ...comments, [o.id]: e.target.value })}
                    placeholder="Comment (saved to order history)" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[12px]" />
                </div>
              </div>
            ))}
          </Card>

          <Card title="Purchasing queue" count={`${purchasing.length} approved`}>
            {purchasing.length === 0 && <div className="px-4 py-6 text-center text-[13px] text-gray-500">No approved orders to purchase.</div>}
            {purchasing.map((o) => (
              <Row key={o.id} o={o} right={
                <button disabled={busy} onClick={() => act(o.id, 'purchase')}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-[12px] hover:bg-gray-50"><ShoppingCart className="w-3.5 h-3.5" /> Mark ordered</button>
              } />
            ))}
          </Card>

          <Card title="Fulfilment" count={`${fulfilment.length} in progress`}>
            {fulfilment.length === 0 && <div className="px-4 py-6 text-center text-[13px] text-gray-500">Nothing in fulfilment.</div>}
            {fulfilment.map((o) => (
              <Row key={o.id} o={o} right={
                o.status === 'ordered'
                  ? <button disabled={busy} onClick={() => act(o.id, 'invoice')} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-[12px] hover:bg-gray-50"><Receipt className="w-3.5 h-3.5" /> Mark invoiced</button>
                  : <button disabled={busy} onClick={() => act(o.id, 'pay')} className="inline-flex items-center gap-1 rounded-lg border border-[#27500A] text-[#27500A] px-2.5 py-1 text-[12px]"><Banknote className="w-3.5 h-3.5" /> Mark paid</button>
              } />
            ))}
          </Card>
          <div className="text-[12px] text-gray-400">Marking an order Paid is what releases its profit to commission.</div>
        </>
      )}
    </div>
  );
}
