// web/client/src/app/src/components/MyHoliday.jsx
// Workspace › My Holiday (staff view). Visible to everyone, engineers included.
// Shows the animated allowance bar (days left, with taken/booked/pending), lets
// staff request a holiday, and lists their requests (pending/approved/rejected)
// with a cancel on pending ones. All data from /api/holidays/me + /api/holidays/requests.
// Setting allowances + approvals + the company holiday year live on the manager
// screen (built next). When no allowance is set yet, the bar shows a gentle
// "not set yet" state rather than inventing a number.
import React, { useEffect, useRef, useState } from 'react';
import { Palmtree, CalendarDays, Plus, X, Clock, Trash2, AlertCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHero, { HeroButtonPrimary } from './PageHero.jsx';

const ukDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const fmt = (n) => {
  const s = (Math.round(Number(n) * 2) / 2).toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
};

const STATUS_PILL = {
  pending:  'bg-[rgba(245,158,11,0.18)] text-[#fcd34d] border border-[rgba(245,158,11,0.40)]',
  approved: 'bg-[rgba(16,185,129,0.18)] text-[#6ee7b7] border border-[rgba(16,185,129,0.40)]',
  rejected: 'bg-[rgba(239,68,68,0.18)] text-[#fca5a5] border border-[rgba(239,68,68,0.40)]',
};

export default function MyHoliday() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [animate, setAnimate] = useState(false);
  const numRef = useRef(null);

  const load = async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/holidays/me', { credentials: 'include' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Trigger the bar fill + count-up once data arrives.
  useEffect(() => {
    if (!data) return;
    setAnimate(false);
    const t = setTimeout(() => setAnimate(true), 80);
    return () => clearTimeout(t);
  }, [data]);

  useEffect(() => {
    if (!animate || !data || !data.allowanceSet || !numRef.current) return;
    const to = Math.max(0, Number(data.remaining));
    const el = numRef.current;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 1300);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(to * e);
      if (t < 1) raf = requestAnimationFrame(tick);
      else el.textContent = fmt(to);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, data]);

  const yearLabel = data && data.yearStart && data.yearEnd
    ? `Holiday year · ${ukDate(data.yearStart)} – ${ukDate(data.yearEnd)}`
    : 'Holiday year not set yet';

  return (
    <div className="p-5 md:p-7 min-h-full bg-[#1a1a2e]">
      <style>{`@keyframes wtHolGloss{0%{transform:translateX(-130%) skewX(-18deg)}100%{transform:translateX(420%) skewX(-18deg)}}`}</style>

      <div className="mb-5">
        <PageHero
          title="My Holiday"
          icon={Palmtree}
          meta={[{ icon: CalendarDays, label: yearLabel }]}
          actions={<HeroButtonPrimary icon={Plus} onClick={() => setShowForm((s) => !s)}>Request holiday</HeroButtonPrimary>}
          compact
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-[#94a3b8] text-sm px-1 py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your holiday…
        </div>
      )}
      {error && !loading && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.35)] text-[#fca5a5] text-sm">
          <AlertCircle className="w-4 h-4" /> Couldn’t load your holiday: {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <AllowanceBar data={data} animate={animate} numRef={numRef} />

          {showForm && (
            <RequestForm
              onClose={() => setShowForm(false)}
              onSaved={() => { setShowForm(false); load(); }}
            />
          )}

          <RequestsList requests={data.requests} onChanged={load} />
        </>
      )}
    </div>
  );
}

// ── the juicy allowance bar ──────────────────────────────────────────────────
function AllowanceBar({ data, animate, numRef }) {
  const { allowanceSet, allowance, taken, booked, pending, remaining, baseAllowance, carriedOver } = data;
  const total = allowanceSet ? Math.max(allowance, taken + booked + pending, 0.001) : 1;
  const pct = (v) => `${Math.max(0, Math.min(100, (v / total) * 100))}%`;
  const remPct = allowanceSet ? pct(Math.max(0, remaining)) : '0%';

  return (
    <div className="rounded-2xl border border-[#2e2e4a] mb-5"
      style={{
        borderBottom: '1px solid rgba(245,158,11,0.40)',
        boxShadow: '0 6px 36px rgba(245,158,11,0.10)',
        background: 'radial-gradient(ellipse 82% 150% at 16% 28%, rgba(245,158,11,0.14) 0%, rgba(245,158,11,0.035) 34%, #1f1f33 64%)',
        padding: '22px 24px 24px',
      }}>
      {allowanceSet ? (
        <>
          <div className="flex items-end gap-2.5 mb-4">
            <span ref={numRef} className="text-white font-bold leading-none tracking-tight" style={{ fontSize: 52 }}>0</span>
            <div className="pb-1.5">
              <div className="text-[#fbbf24] text-[15px] font-semibold leading-none">days left</div>
              <div className="text-[#6b7280] text-[12.5px] mt-1">
                of {fmt(allowance)} day allowance{carriedOver > 0 ? ` (incl. ${fmt(carriedOver)} carried over)` : ''}
              </div>
            </div>
          </div>
          <div className="relative h-[30px] rounded-[10px] overflow-hidden flex"
            style={{ background: '#15152a', border: '1px solid #2e2e4a', boxShadow: 'inset 0 1px 3px rgba(0,0,0,.4)' }}>
            <Seg w={animate ? remPct : '0%'} delay="0s"
              style={{ background: 'linear-gradient(90deg,#d97706,#f59e0b 55%,#fbbf24)', boxShadow: '0 0 18px rgba(245,158,11,.5), inset -2px 0 7px rgba(255,255,255,.28)', borderRight: remaining > 0 ? '2px solid #fde68a' : 'none', position: 'relative', overflow: 'hidden' }}>
              {animate && remaining > 0 && (
                <span style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '34%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent)', animation: 'wtHolGloss 1.5s cubic-bezier(.4,0,.2,1) .35s 1 forwards' }} />
              )}
            </Seg>
            <Seg w={animate ? pct(taken) : '0%'} delay=".12s" style={{ background: '#475569' }} />
            <Seg w={animate ? pct(booked) : '0%'} delay=".22s" style={{ background: '#3b82f6' }} />
            <Seg w={animate ? pct(pending) : '0%'} delay=".32s" style={{ background: 'repeating-linear-gradient(45deg,rgba(245,158,11,.55) 0 6px,rgba(245,158,11,.18) 6px 12px)' }} />
          </div>
          {remaining < 0 && (
            <div className="mt-2 text-[12.5px] text-[#fca5a5]">You’re {fmt(Math.abs(remaining))} day(s) over your allowance.</div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-[#fcd34d]" />
          <div>
            <div className="text-white text-[15px] font-semibold">Your holiday allowance hasn’t been set yet</div>
            <div className="text-[#94a3b8] text-[13px] mt-0.5">Your manager will set it soon. You can still request holiday below.</div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-[18px]">
        <Chip dot="#f59e0b" glow label="Remaining" value={allowanceSet ? fmt(remaining) : '—'} />
        <Chip dot="#475569" label="Taken" value={fmt(taken)} />
        <Chip dot="#3b82f6" label="Booked" value={fmt(booked)} />
        <Chip dotStripe label="Pending" value={fmt(pending)} />
        <Chip dot="#f59e0b" subtle label="Allowance" value={allowanceSet ? fmt(allowance) : '—'} />
      </div>
    </div>
  );
}

function Seg({ w, delay, style }) {
  return <div style={{ height: '100%', width: w, transition: 'width 1.25s cubic-bezier(.34,1.3,.45,1)', transitionDelay: delay, ...style }} />;
}

function Chip({ dot, dotStripe, glow, subtle, label, value }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg px-[11px] py-[7px] text-[12.5px] text-[#cbd5e1]"
      style={{ background: subtle ? 'rgba(245,158,11,0.08)' : '#1f1f33', border: `1px solid ${subtle ? 'rgba(245,158,11,0.35)' : '#2e2e4a'}` }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: dotStripe ? 'repeating-linear-gradient(45deg,#f59e0b 0 3px,rgba(245,158,11,.3) 3px 6px)' : dot, boxShadow: glow ? '0 0 7px rgba(245,158,11,.7)' : 'none' }} />
      {label} <b className="text-white font-semibold">{value}</b>
    </span>
  );
}

// ── pop-up calendar date picker ──────────────────────────────────────────────
// Click the field to open a small month calendar and pick a day. No minimum —
// past dates are allowed on purpose (they still go through approval).
function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => (value ? new Date(`${value}T00:00:00`) : new Date()));
  const ref = useRef(null);

  useEffect(() => { if (value) setView(new Date(`${value}T00:00:00`)); }, [value]);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const selected = value ? new Date(`${value}T00:00:00`) : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const y = view.getFullYear(), m = view.getMonth();
  const startWeekday = (new Date(y, m, 1).getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const pick = (d) => {
    onChange(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    setOpen(false);
  };
  const isDay = (d, ref2) => ref2 && ref2.getFullYear() === y && ref2.getMonth() === m && ref2.getDate() === d;

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#1a1a2e] border text-[13px] ${open ? 'border-[#f59e0b] ring-2 ring-[#f59e0b]/30' : 'border-[#2e2e4a]'}`}>
        <span className={selected ? 'text-white' : 'text-[#6b7280]'}>
          {selected ? selected.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'dd/mm/yyyy'}
        </span>
        <CalendarDays className="w-4 h-4 text-[#94a3b8]" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 w-64 rounded-xl border border-[#2e2e4a] bg-[#242438] p-3 shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setView(new Date(y, m - 1, 1))} className="p-1 rounded hover:bg-[#2a2a48] text-[#cbd5e1]"><ChevronLeft className="w-4 h-4" /></button>
            <div className="text-[13px] text-white font-medium">{view.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
            <button type="button" onClick={() => setView(new Date(y, m + 1, 1))} className="p-1 rounded hover:bg-[#2a2a48] text-[#cbd5e1]"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-[#6b7280] mb-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => d === null ? <div key={i} /> : (
              <button type="button" key={i} onClick={() => pick(d)}
                className={`h-7 rounded text-[12px] ${isDay(d, selected)
                  ? 'bg-[#f59e0b] text-[#1a1a2e] font-semibold'
                  : isDay(d, today)
                    ? 'text-[#fcd34d] ring-1 ring-[#f59e0b]/40 hover:bg-[#2a2a48]'
                    : 'text-[#cbd5e1] hover:bg-[#2a2a48]'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── request a holiday ────────────────────────────────────────────────────────
function RequestForm({ onClose, onSaved }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [halfStart, setHalfStart] = useState(false);
  const [halfEnd, setHalfEnd] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const sameDay = startDate && startDate === endDate;

  const submit = async () => {
    setErr(null);
    if (!startDate || !endDate) { setErr('Pick a start and end date.'); return; }
    if (new Date(endDate) < new Date(startDate)) { setErr('End date is before the start date.'); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/holidays/requests', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, halfStart, halfEnd: sameDay ? false : halfEnd, note: note || null }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || 'Could not submit');
      onSaved();
    } catch (e) {
      setErr(e.message || 'Could not submit');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#2e2e4a] text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/30 focus:border-[#f59e0b]';

  return (
    <div className="rounded-xl border border-[#2e2e4a] bg-[#242438] p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-white font-semibold text-[15px]">Request holiday</div>
        <button onClick={onClose} className="text-[#6b7280] hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] text-[#94a3b8] mb-1.5">From</label>
          <DatePicker value={startDate} onChange={setStartDate} />
          <label className="flex items-center gap-2 mt-2 text-[12px] text-[#cbd5e1] cursor-pointer">
            <input type="checkbox" checked={halfStart} onChange={(e) => setHalfStart(e.target.checked)} className="accent-[#f59e0b]" />
            {sameDay ? 'Half day' : 'First day is a half day'}
          </label>
        </div>
        <div>
          <label className="block text-[12px] text-[#94a3b8] mb-1.5">To</label>
          <DatePicker value={endDate} onChange={setEndDate} />
          {!sameDay && (
            <label className="flex items-center gap-2 mt-2 text-[12px] text-[#cbd5e1] cursor-pointer">
              <input type="checkbox" checked={halfEnd} onChange={(e) => setHalfEnd(e.target.checked)} className="accent-[#f59e0b]" />
              Last day is a half day
            </label>
          )}
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-[12px] text-[#94a3b8] mb-1.5">Note (optional)</label>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. family holiday" className={inputCls} />
      </div>

      {err && <div className="mt-3 text-[12.5px] text-[#fca5a5]">{err}</div>}

      <div className="flex items-center gap-2 mt-4">
        <button onClick={submit} disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#f59e0b] text-[#1a1a2e] font-semibold text-[13px] px-4 py-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Submit request
        </button>
        <button onClick={onClose} className="text-[13px] text-[#94a3b8] px-3 py-2 hover:text-white">Cancel</button>
      </div>
    </div>
  );
}

// ── my requests ──────────────────────────────────────────────────────────────
function RequestsList({ requests, onChanged }) {
  const cancel = async (id) => {
    if (!confirm('Cancel this pending request?')) return;
    try {
      const r = await fetch(`/api/holidays/requests/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!r.ok) throw new Error();
      onChanged();
    } catch {
      alert('Could not cancel the request.');
    }
  };

  if (!requests || requests.length === 0) {
    return (
      <div className="rounded-xl border border-[#2e2e4a] bg-[#242438] px-4 py-10 text-center text-[13px] text-[#94a3b8]">
        No holiday requests yet. Use “Request holiday” to book some time off.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#2e2e4a] bg-[#242438] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2e2e4a] text-white font-semibold text-[14px]">My requests</div>
      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,0.6fr)_minmax(0,1fr)_minmax(0,1.3fr)_72px] gap-2 px-4 py-2.5 bg-[#1f1f33] text-[11px] uppercase tracking-wide text-[#6b7280]">
        <div>Dates</div><div className="text-right">Days</div><div>Status</div><div>Note</div><div />
      </div>
      {requests.map((q) => (
        <div key={q.id} className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,0.6fr)_minmax(0,1fr)_minmax(0,1.3fr)_72px] gap-2 items-center px-4 py-3 border-t border-[#2e2e4a]">
          <div className="min-w-0 text-[13px] text-white truncate">
            {ukDate(q.startDate)}{q.startDate !== q.endDate ? ` – ${ukDate(q.endDate)}` : ''}
            {(q.halfStart || q.halfEnd) && <span className="ml-1.5 text-[11px] text-[#94a3b8]">½</span>}
          </div>
          <div className="text-right text-[13px] text-[#cbd5e1]">{fmt(q.days)}</div>
          <div>
            <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] capitalize ${STATUS_PILL[q.status] || ''}`}>{q.status}</span>
            {q.status === 'rejected' && q.decisionNote && <div className="text-[11px] text-[#fca5a5] mt-1 truncate">{q.decisionNote}</div>}
          </div>
          <div className="min-w-0 text-[12.5px] text-[#94a3b8] truncate">{q.note || '—'}</div>
          <div className="text-right">
            {q.status === 'pending' && (
              <button onClick={() => cancel(q.id)} title="Cancel request" className="text-[#6b7280] hover:text-[#fca5a5]">
                <Trash2 className="w-4 h-4 inline" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
