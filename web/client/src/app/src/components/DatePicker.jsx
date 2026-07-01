// web/client/src/app/src/components/DatePicker.jsx
// Shared pop-up calendar. Click the field to open a small month calendar and
// pick a day. Value in/out is a 'YYYY-MM-DD' string, so it's a drop-in swap for
// a native <input type="date"> (pass onChange={setX} instead of e.target.value).
//
// No minimum — past dates are allowed on purpose.
// Pass `className` = the form's own input classes so the trigger matches; the
// pop-up itself is always dark-themed to match the app.
import React, { useState, useEffect, useRef } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DatePicker({ value, onChange, className = '', placeholder = 'dd/mm/yyyy' }) {
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
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center justify-between text-left ${className} ${open ? 'ring-2 ring-[#f59e0b]/30 border-[#f59e0b]' : ''}`}
      >
        <span className={selected ? '' : 'text-[#6b7280]'}>
          {selected ? selected.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : placeholder}
        </span>
        <CalendarDays className="w-4 h-4 text-[#94a3b8] ml-2 shrink-0" />
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
              <button
                type="button"
                key={i}
                onClick={() => pick(d)}
                className={`h-7 rounded text-[12px] ${isDay(d, selected)
                  ? 'bg-[#f59e0b] text-[#1a1a2e] font-semibold'
                  : isDay(d, today)
                    ? 'text-[#fcd34d] ring-1 ring-[#f59e0b]/40 hover:bg-[#2a2a48]'
                    : 'text-[#cbd5e1] hover:bg-[#2a2a48]'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
