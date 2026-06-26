// web/client/src/app/src/components/OrderQueues.jsx
// Workspace › Approvals — manager queues. Approve/reject submitted orders (with a
// comment) and drive approved orders through purchasing → fulfilment → paid.
// All actions hit the orders API; the API enforces manager-only (403 handled).
//
// v3.7 — DARK reskin to Manus's Approvals card style (left accent bar, type pill,
// requester, amber Approve / red Reject). The REAL workflow is order-based (not
// the expense/leave illustration in the mockup), so the three real queues —
// Approval, Purchasing, Fulfilment — are kept exactly, with every action and the
// approval comment preserved. Nothing invented.
import React, { useEffect, useState } from 'react';
import { Check, X, ShoppingCart, Receipt, Banknote } from 'lucide-react';

const money = (n) => `£${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const AVATARS = ['#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#06b6d4'];
const avatarColor = (name) => { const s = String(name || ''); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return AVATARS[h % AVATARS.length]; };

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

  // a card row: left accent + order context + value/profit + right-hand actions
  const Card = ({ o, accent, children }) => (
    <div className="relative rounded-xl border border-[#2e2e4a] bg-[#242438] overflow-hidden mb-3">
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />
      <div className="grid grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_auto] gap-3 items-center pl-5 pr-4 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-block rounded-md px-2 py-0.5 text-[11px] uppercase tracking-wide bg-[rgba(245,158,11,0.18)] text-[#fcd34d]">Order</span>
            <span className="text-[15px] font-semibold text-white truncate">{o.companyName || 'No company'}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[12px] text-[#94a3b8]">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-semibold text-white" style={{ background: avatarColor(o.salespersonName) }}>{initials(o.salespersonName)}</span>
            {o.salespersonName || '—'}
          </div>
        </div>
        <div className="text-[13px]">
          <div className="text-white">{money(o.totals?.value)}</div>
          <div className="text-[#6ee7b7]">{money(o.totals?.profit)} profit</div>
        </div>
        <div className="flex items-center gap-2 justify-end">{children}</div>
      </div>
    </div>
  );

  const Section = ({ title, count, children }) => (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[14px] font-medium text-white">{title}</span>
        <span className="text-[12px] text-[#6b7280]">{count}</span>
      </div>
      {children}
    </div>
  );

  return (
    <div className="p-5 md:p-7 min-h-full bg-[#1a1a2e]">
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-semibold text-white">Approvals</div>
          {approval.length > 0 && (
            <span className="rounded-full px-2.5 py-0.5 text-[12px] bg-[rgba(245,158,11,0.15)] text-[#fcd34d] border border-[#f59e0b]">{approval.length} pending</span>
          )}
        </div>
        <div className="text-[13px] text-[#94a3b8]">Manager sign-off queue — approve orders, then drive them through purchasing to paid.</div>
      </div>

      {error && <div className="text-[12px] text-[#fca5a5] mb-3">{error}</div>}
      {loading && <div className="text-[13px] text-[#94a3b8]">Loading…</div>}

      {!loading && (
        <>
          <Section title="Approval queue" count={`${approval.length} awaiting`}>
            {approval.length === 0 && <div className="rounded-xl border border-[#2e2e4a] bg-[#242438] px-4 py-6 text-center text-[13px] text-[#6b7280]">Nothing awaiting approval.</div>}
            {approval.map((o) => (
              <div key={o.id} className="mb-3">
                <Card o={o} accent="#f59e0b">
                  <button disabled={busy} onClick={() => act(o.id, 'approve', { comment: comments[o.id] || null })}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#f59e0b] text-[#1a1a2e] font-medium px-3 py-1.5 text-[12px] hover:bg-[#d97706] disabled:opacity-50"><Check className="w-3.5 h-3.5" /> Approve</button>
                  <button disabled={busy} onClick={() => act(o.id, 'reject', { comment: comments[o.id] || null })}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#ef4444] text-[#fca5a5] px-3 py-1.5 text-[12px] hover:bg-[rgba(239,68,68,0.1)] disabled:opacity-50"><X className="w-3.5 h-3.5" /> Reject</button>
                </Card>
                <div className="-mt-1.5 mb-1 px-1">
                  <input value={comments[o.id] || ''} onChange={(e) => setComments({ ...comments, [o.id]: e.target.value })}
                    placeholder="Comment (saved to order history)"
                    className="w-full border border-[#2e2e4a] bg-[#1f1f33] text-white rounded-lg px-3 py-1.5 text-[12px] outline-none placeholder:text-[#6b7280]" />
                </div>
              </div>
            ))}
          </Section>

          <Section title="Purchasing queue" count={`${purchasing.length} approved`}>
            {purchasing.length === 0 && <div className="rounded-xl border border-[#2e2e4a] bg-[#242438] px-4 py-6 text-center text-[13px] text-[#6b7280]">No approved orders to purchase.</div>}
            {purchasing.map((o) => (
              <Card key={o.id} o={o} accent="#3b82f6">
                <button disabled={busy} onClick={() => act(o.id, 'purchase')}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#2e2e4a] text-[#cbd5e1] px-3 py-1.5 text-[12px] hover:bg-[#2a2a48] disabled:opacity-50"><ShoppingCart className="w-3.5 h-3.5" /> Mark ordered</button>
              </Card>
            ))}
          </Section>

          <Section title="Fulfilment" count={`${fulfilment.length} in progress`}>
            {fulfilment.length === 0 && <div className="rounded-xl border border-[#2e2e4a] bg-[#242438] px-4 py-6 text-center text-[13px] text-[#6b7280]">Nothing in fulfilment.</div>}
            {fulfilment.map((o) => (
              <Card key={o.id} o={o} accent="#10b981">
                {o.status === 'ordered'
                  ? <button disabled={busy} onClick={() => act(o.id, 'invoice')} className="inline-flex items-center gap-1 rounded-lg border border-[#2e2e4a] text-[#cbd5e1] px-3 py-1.5 text-[12px] hover:bg-[#2a2a48] disabled:opacity-50"><Receipt className="w-3.5 h-3.5" /> Mark invoiced</button>
                  : <button disabled={busy} onClick={() => act(o.id, 'pay')} className="inline-flex items-center gap-1 rounded-lg border border-[#10b981] text-[#6ee7b7] px-3 py-1.5 text-[12px] hover:bg-[rgba(16,185,129,0.1)] disabled:opacity-50"><Banknote className="w-3.5 h-3.5" /> Mark paid</button>}
              </Card>
            ))}
          </Section>

          <div className="text-[12px] text-[#6b7280]">Marking an order Paid is what releases its profit to commission.</div>
        </>
      )}
    </div>
  );
}
