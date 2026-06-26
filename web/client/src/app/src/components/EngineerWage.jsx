// web/client/src/app/src/components/EngineerWage.jsx
// Workspace › My Pay (Wage) — engineer view, read-only. Reads /api/engineer-wage/me.
// Shows current rate, a neutral delivered-deal count vs the org's target, the
// review date, the manager-set rise, and stage history. NEVER shows profit,
// commission, or any company financials.
//
// v3.7 — DARK reskin only. Same data + logic — colours only.
import React, { useEffect, useState } from 'react';
import { TrendingUp, Calendar, BadgeCheck } from 'lucide-react';

const money = (n) => `£${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const addMonths = (iso, m) => { if (!iso || !m) return null; const d = new Date(iso); d.setMonth(d.getMonth() + Number(m)); return d; };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function EngineerWage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/engineer-wage/me', { credentials: 'include' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setData(await r.json());
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="p-6 text-[13px] text-[#94a3b8]">Loading…</div>;
  if (error) return <div className="p-6 text-[13px] text-[#fca5a5]">Couldn’t load wage progression: {error}</div>;

  const cur = data?.current;
  const cfg = data?.config || {};
  const history = data?.history || [];

  return (
    <div className="p-5 md:p-7 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-5 h-5 text-[#94a3b8]" />
        <div className="text-[15px] font-medium text-white">My wage progression</div>
      </div>
      <div className="text-[13px] text-[#94a3b8] mb-4">Your rate and progress toward your next review.</div>

      {!cur && (
        <div className="bg-[#242438] border border-[#2e2e4a] rounded-xl px-4 py-6 text-center text-[13px] text-[#94a3b8]">
          No wage progression stage has been set up for you yet. Your manager starts a stage and confirms any rise.
        </div>
      )}

      {cur && (() => {
        const target = cur.dealTarget || 0;
        const pct = target > 0 ? Math.min(100, (cur.dealsDelivered / target) * 100) : 0;
        const reviewDate = addMonths(cur.startedAt, cfg.stageMonths);
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-[#242438] border border-[#2e2e4a] rounded-lg p-4">
                <div className="text-[13px] text-[#94a3b8]">Current rate</div>
                <div className="text-2xl font-semibold text-white">{money(cur.currentRate)}</div>
                <div className="text-[12px] text-[#6b7280]">stage {cur.stageNo}</div>
              </div>
              <div className="bg-[#242438] border border-[#2e2e4a] rounded-lg p-4">
                <div className="text-[13px] text-[#94a3b8]">Deals delivered</div>
                <div className="text-2xl font-semibold text-white">{cur.dealsDelivered}{target > 0 ? <span className="text-base text-[#6b7280]"> / {target}</span> : null}</div>
                <div className="text-[12px] text-[#6b7280]">this stage</div>
              </div>
              <div className="bg-[#242438] border border-[#2e2e4a] rounded-lg p-4">
                <div className="text-[13px] text-[#94a3b8] inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Next review</div>
                <div className="text-2xl font-semibold text-white">{reviewDate ? fmtDate(reviewDate) : '—'}</div>
                <div className="text-[12px] text-[#6b7280]">from {fmtDate(cur.startedAt)}</div>
              </div>
            </div>

            {target > 0 && (
              <div className="bg-[#242438] border border-[#2e2e4a] rounded-xl p-4 md:px-5 mb-4">
                <div className="flex items-center justify-between text-[13px] mb-2">
                  <span className="text-[#cbd5e1]">Progress to next review point</span>
                  <span className="text-[#94a3b8]">{cur.dealsDelivered} / {target} deals</span>
                </div>
                <div className="h-2.5 rounded-full bg-[#1a1a2e] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#f59e0b' }} />
                </div>
              </div>
            )}

            <div className="bg-[#242438] border border-[#2e2e4a] rounded-xl p-4 md:px-5 mb-4">
              <div className="text-[14px] font-medium text-white mb-1">Upcoming rise</div>
              {cur.riseAmount > 0 || cur.newRate > 0 ? (
                <div className="text-[13px] text-[#cbd5e1]">Proposed rise of <b className="text-[#6ee7b7]">{money(cur.riseAmount)}</b>{cur.newRate > 0 ? <> → new rate <b className="text-white">{money(cur.newRate)}</b></> : null}. Confirmed by your manager at review.</div>
              ) : (
                <div className="text-[13px] text-[#94a3b8]">No rise has been entered yet for this stage.</div>
              )}
            </div>
          </>
        );
      })()}

      {history.length > 0 && (
        <div className="bg-[#242438] border border-[#2e2e4a] rounded-xl p-4 md:px-5">
          <div className="text-[14px] font-medium text-white mb-1">History</div>
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between text-[13px] py-2 border-t border-[#2e2e4a]">
              <span className="text-[#94a3b8] inline-flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-[#6ee7b7]" /> Stage {h.stageNo} · {fmtDate(h.startedAt)}</span>
              <span className="text-[#cbd5e1]">{money(h.currentRate)} → <b className="text-white">{money(h.newRate || h.currentRate)}</b>{h.riseAmount > 0 ? <span className="text-[#6ee7b7]"> (+{money(h.riseAmount)})</span> : null}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
