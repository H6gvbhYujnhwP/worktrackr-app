// web/client/src/app/src/components/BonusScreen.jsx
// Workspace › My Pay (Commission). Per-user, reads /api/commission/me?offset=.
// Everything is computed from the org's configured scheme applied to this user's
// paid/unpaid orders; nothing hardcoded. Shows the live period with prev/next
// navigation. Paid-gated throughout.
//
// v3.7 — DARK reskin only. Same data, same period navigation, same threshold
// progress / breakdown / history — colours only.
import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, Unlock, Check, BadgeCheck } from 'lucide-react';

const money = (n) => `£${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const CAT = { standard: 'One-off', finance: 'Finance', referral: 'Referral', recurring: 'Recurring' };
const STATUS_PILL = { paid: 'bg-[rgba(16,185,129,0.20)] text-[#6ee7b7]', pending: 'bg-[rgba(245,158,11,0.20)] text-[#fcd34d]' };

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

  if (loading && !data) return <div className="p-6 text-[13px] text-[#94a3b8]">Loading commission…</div>;
  if (error) return <div className="p-6 text-[13px] text-[#fca5a5]">Couldn’t load commission: {error}</div>;
  if (!data) return null;

  const { cards, breakdown, history, period } = data;
  const threshold = cards.bonus.threshold || 0;
  const turnover = cards.bonus.turnover || 0;
  const pct = threshold > 0 ? Math.min(100, (turnover / threshold) * 100) : 0;

  const GRIDH = 'grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_60px_minmax(0,1fr)_80px] gap-2';

  return (
    <div className="p-5 md:p-7 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="text-[15px] font-medium text-white">My commission &amp; bonus</div>
          <div className="text-[13px] text-[#94a3b8]">All figures ex-VAT · payable once invoices are settled</div>
        </div>
        <div className="flex items-center gap-2 text-[13px]">
          <button onClick={() => setOffset(offset - 1)} className="h-8 px-2 border border-[#2e2e4a] rounded-lg text-[#cbd5e1] hover:bg-[#2a2a48]"><ChevronLeft className="w-4 h-4" /></button>
          <span className="border border-[#2e2e4a] bg-[#242438] text-white rounded-lg px-3 py-1.5">{period.label}</span>
          <button onClick={() => setOffset(offset + 1)} disabled={offset >= 0} className="h-8 px-2 border border-[#2e2e4a] rounded-lg text-[#cbd5e1] hover:bg-[#2a2a48] disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {!data.enabled && (
        <div className="bg-[rgba(245,158,11,0.12)] text-[#fcd34d] border border-[#854f0b] rounded-xl px-4 py-3 text-[13px] mb-4">
          No commission scheme is set up for your organisation yet, so everything below reads zero. A manager can configure rates in <b>Commission rules</b>.
        </div>
      )}

      {data.approved && (
        <div className="inline-flex items-center gap-1.5 text-[12px] text-[#6ee7b7] mb-3"><BadgeCheck className="w-4 h-4" /> This period has been approved by a manager.</div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-[#242438] border border-[#2e2e4a] rounded-lg p-4">
          <div className="text-[13px] text-[#94a3b8]">Confirmed (payable)</div>
          <div className="text-2xl font-semibold text-[#6ee7b7]">{money(cards.confirmed)}</div>
          <div className="text-[12px] text-[#6b7280]">invoices paid</div>
        </div>
        <div className="bg-[#242438] border border-[#2e2e4a] rounded-lg p-4">
          <div className="text-[13px] text-[#94a3b8]">Pending</div>
          <div className="text-2xl font-semibold text-white">{money(cards.pending)}</div>
          <div className="text-[12px] text-[#6b7280]">awaiting settlement</div>
        </div>
        <div className="bg-[#242438] border border-[#2e2e4a] rounded-lg p-4">
          <div className="text-[13px] text-[#94a3b8]">Performance bonus</div>
          <div className="text-2xl font-semibold text-white">{cards.bonus.unlocked ? money(cards.bonus.amount) : '—'}</div>
          <div className={`text-[12px] inline-flex items-center gap-1 ${cards.bonus.unlocked ? 'text-[#6ee7b7]' : 'text-[#6b7280]'}`}>
            {cards.bonus.unlocked ? <><Unlock className="w-3 h-3" /> unlocked</> : <><Lock className="w-3 h-3" /> locked</>}
          </div>
        </div>
      </div>

      {/* Threshold progress */}
      {threshold > 0 && (
        <div className="bg-[#242438] border border-[#2e2e4a] rounded-xl p-4 md:px-5 mb-4">
          <div className="flex items-center justify-between text-[13px] mb-2">
            <span className="text-[#cbd5e1]">Turnover toward performance bonus</span>
            <span className="text-[#94a3b8]">{money(turnover)} / {money(threshold)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-[#1a1a2e] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cards.bonus.unlocked ? '#10b981' : '#f59e0b' }} />
          </div>
          {cards.bonus.unlocked && <div className="text-[12px] text-[#6ee7b7] mt-1.5"><Check className="w-3 h-3 inline" /> Threshold passed — {cards.bonus.bonusRate}% of period profit added as bonus.</div>}
        </div>
      )}

      {/* Breakdown */}
      <div className="bg-[#242438] border border-[#2e2e4a] rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-2.5 bg-[#1f1f33] text-[14px] font-medium text-white">Breakdown</div>
        <div className={`${GRIDH} px-4 py-2 text-[11px] uppercase tracking-wide text-[#6b7280] border-t border-[#2e2e4a]`}>
          <div>Source</div><div>Type</div><div className="text-right">Rate</div><div className="text-right">Amount</div><div className="text-right">Status</div>
        </div>
        {breakdown.length === 0 && <div className="px-4 py-8 text-center text-[13px] text-[#94a3b8]">No commission activity in this period.</div>}
        {breakdown.map((b) => (
          <div key={b.key || b.orderId} className={`${GRIDH} px-4 py-2.5 items-center border-t border-[#2e2e4a] text-[13px]`}>
            <div className="truncate text-white">{b.company}{b.overridden && <span className="ml-1 text-[10px] text-[#c4b5fd]">(manual)</span>}</div>
            <div className="text-[#94a3b8]">{CAT[b.category] || b.category}</div>
            <div className="text-right text-[#94a3b8]">{b.rate}%</div>
            <div className="text-right text-white">{money(b.amount)}</div>
            <div className="text-right"><span className={`rounded px-1.5 py-0.5 text-[11px] ${STATUS_PILL[b.status] || ''}`}>{b.status}</span></div>
          </div>
        ))}
      </div>

      {/* History */}
      <div className="bg-[#242438] border border-[#2e2e4a] rounded-xl p-4 md:px-5 mb-3">
        <div className="text-[14px] font-medium text-white mb-1">Previous periods (paid)</div>
        {history.map((h, i) => (
          <div key={i} className="flex justify-between text-[13px] py-2 border-t border-[#2e2e4a]">
            <span className="text-[#94a3b8]">{h.label}</span><span className="font-medium text-white">{money(h.paid)}</span>
          </div>
        ))}
      </div>

      <div className="text-[12px] text-[#6b7280]">Calculated automatically from your paid orders and active contracts, using your organisation’s configured rates; a manager approves each period before payroll. Manual adjustments a manager makes show as “manual”.</div>
    </div>
  );
}
