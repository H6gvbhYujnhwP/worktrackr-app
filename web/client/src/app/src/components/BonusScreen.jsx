// web/client/src/app/src/components/BonusScreen.jsx
// Phase 4 — "My commission" (the approved bonus mockup). Per-user, reads
// /api/commission/me?offset=. Everything is computed from the org's configured
// scheme applied to this user's paid/unpaid orders; nothing hardcoded. Shows the
// live period with prev/next navigation. Paid-gated throughout.
import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, Unlock, Check, BadgeCheck } from 'lucide-react';

const money = (n) => `£${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const CAT = { standard: 'One-off', finance: 'Finance', referral: 'Referral', recurring: 'Recurring' };
const STATUS_PILL = { paid: 'bg-[#EAF3DE] text-[#27500A]', pending: 'bg-[#FAEEDA] text-[#854F0B]' };

export default function BonusScreen() {
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/commission/me?offset=${offset}`, { credentials: 'include' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        if (alive) setData(d);
      } catch (e) { if (alive) setError(e.message); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [offset]);

  if (loading && !data) return <div className="p-6 text-[13px] text-gray-500">Loading commission…</div>;
  if (error) return <div className="p-6 text-[13px] text-red-700">Couldn’t load commission: {error}</div>;
  if (!data) return null;

  const { cards, breakdown, history, period } = data;
  const threshold = cards.bonus.threshold || 0;
  const turnover = cards.bonus.turnover || 0;
  const pct = threshold > 0 ? Math.min(100, (turnover / threshold) * 100) : 0;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="text-lg font-medium text-gray-900">My commission &amp; bonus</div>
          <div className="text-[13px] text-gray-500">All figures ex-VAT · payable once invoices are settled</div>
        </div>
        <div className="flex items-center gap-2 text-[13px]">
          <button onClick={() => setOffset(offset - 1)} className="h-8 px-2 border border-gray-300 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
          <span className="border border-gray-300 rounded-lg px-3 py-1.5">{period.label}</span>
          <button onClick={() => setOffset(offset + 1)} disabled={offset >= 0} className="h-8 px-2 border border-gray-300 rounded-lg disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {!data.enabled && (
        <div className="bg-[#FAEEDA] text-[#854F0B] border border-[#e7c98a] rounded-xl px-4 py-3 text-[13px] mb-4">
          No commission scheme is set up for your organisation yet, so everything below reads zero. A manager can configure rates in <b>Commission rules</b>.
        </div>
      )}

      {data.approved && (
        <div className="inline-flex items-center gap-1.5 text-[12px] text-[#0f6e56] mb-3"><BadgeCheck className="w-4 h-4" /> This period has been approved by a manager.</div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-[13px] text-gray-500">Confirmed (payable)</div>
          <div className="text-2xl font-medium text-[#0f6e56]">{money(cards.confirmed)}</div>
          <div className="text-[12px] text-gray-400">invoices paid</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-[13px] text-gray-500">Pending</div>
          <div className="text-2xl font-medium text-gray-900">{money(cards.pending)}</div>
          <div className="text-[12px] text-gray-400">awaiting settlement</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-[13px] text-gray-500">Performance bonus</div>
          <div className="text-2xl font-medium text-gray-900">{cards.bonus.unlocked ? money(cards.bonus.amount) : '—'}</div>
          <div className={`text-[12px] inline-flex items-center gap-1 ${cards.bonus.unlocked ? 'text-[#0f6e56]' : 'text-gray-400'}`}>
            {cards.bonus.unlocked ? <><Unlock className="w-3 h-3" /> unlocked</> : <><Lock className="w-3 h-3" /> locked</>}
          </div>
        </div>
      </div>

      {/* Threshold progress */}
      {threshold > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:px-5 mb-4">
          <div className="flex items-center justify-between text-[13px] mb-2">
            <span className="text-gray-700">Turnover toward performance bonus</span>
            <span className="text-gray-500">{money(turnover)} / {money(threshold)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cards.bonus.unlocked ? '#0f6e56' : '#d4a017' }} />
          </div>
          {cards.bonus.unlocked && <div className="text-[12px] text-[#0f6e56] mt-1.5"><Check className="w-3 h-3 inline" /> Threshold passed — {cards.bonus.bonusRate}% of period profit added as bonus.</div>}
        </div>
      )}

      {/* Breakdown */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-2.5 bg-gray-50 text-[14px] font-medium text-gray-900">Breakdown</div>
        <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_60px_minmax(0,1fr)_80px] gap-2 px-4 py-2 text-[11px] uppercase tracking-wide text-gray-500 border-t border-gray-100">
          <div>Order</div><div>Type</div><div className="text-right">Rate</div><div className="text-right">Amount</div><div className="text-right">Status</div>
        </div>
        {breakdown.length === 0 && <div className="px-4 py-8 text-center text-[13px] text-gray-500">No commission activity in this period.</div>}
        {breakdown.map((b) => (
          <div key={b.orderId} className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_60px_minmax(0,1fr)_80px] gap-2 px-4 py-2.5 items-center border-t border-gray-100 text-[13px]">
            <div className="truncate text-gray-900">{b.company}{b.overridden && <span className="ml-1 text-[10px] text-[#3C3489]">(manual)</span>}</div>
            <div className="text-gray-600">{CAT[b.category] || b.category}</div>
            <div className="text-right text-gray-500">{b.rate}%</div>
            <div className="text-right text-gray-900">{money(b.amount)}</div>
            <div className="text-right"><span className={`rounded px-1.5 py-0.5 text-[11px] ${STATUS_PILL[b.status] || ''}`}>{b.status}</span></div>
          </div>
        ))}
      </div>

      {/* History */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:px-5 mb-3">
        <div className="text-[14px] font-medium text-gray-900 mb-1">Previous periods (paid)</div>
        {history.map((h, i) => (
          <div key={i} className="flex justify-between text-[13px] py-2 border-t border-gray-100">
            <span className="text-gray-500">{h.label}</span><span className="font-medium">{money(h.paid)}</span>
          </div>
        ))}
      </div>

      <div className="text-[12px] text-gray-400">Calculated automatically from your paid orders and your organisation’s configured rates; a manager approves each period before payroll. Manual adjustments a manager makes to an order show as “manual”.</div>
    </div>
  );
}
