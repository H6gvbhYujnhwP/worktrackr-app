// web/client/src/app/src/components/DateTimePicker.jsx
// Shared date+time and time-only pickers that match DatePicker's dark pop-up.
// Time is ALWAYS offered in 15-minute steps (00, 15, 30, 45) — never per-minute.
//
// - TimePicker:      value/onChange are 'HH:MM' strings.
// - DateTimePicker:  value/onChange are 'YYYY-MM-DDTHH:MM' strings (same shape a
//                    native <input type="datetime-local"> produces), so it's a
//                    drop-in swap. Empty value => '' out.
//
// Both accept `className` (to match the form's input styling) and, like
// DatePicker, an optional inline `style` object for screens that style inline.
import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import DatePicker from './DatePicker.jsx';

export const TIME_OPTIONS = (() => {
  const out = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return out;
})();

export function TimePicker({ value, onChange, className = '', style, placeholder = '--:--' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const norm = value ? String(value).slice(0, 5) : '';
  const wrapperStyle = style
    ? { width: style.width, flex: style.flex, alignSelf: style.alignSelf, minWidth: style.minWidth }
    : undefined;
  const buttonStyle = style ? { ...style, width: '100%' } : undefined;

  return (
    <div className="relative" style={wrapperStyle} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={buttonStyle}
        className={`flex items-center justify-between text-left ${className} ${open ? 'ring-2 ring-[#f59e0b]/30 border-[#f59e0b]' : ''}`}
      >
        <span className={norm ? '' : 'text-[#6b7280]'}>{norm || placeholder}</span>
        <Clock className="w-4 h-4 text-[#94a3b8] ml-2 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 w-28 max-h-56 overflow-auto rounded-xl border border-[#2e2e4a] bg-[#242438] p-1 shadow-2xl">
          {TIME_OPTIONS.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => { onChange(t); setOpen(false); }}
              className={`block w-full text-left px-2 py-1 rounded text-[12px] ${t === norm
                ? 'bg-[#f59e0b] text-[#1a1a2e] font-semibold'
                : 'text-[#cbd5e1] hover:bg-[#2a2a48]'}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DateTimePicker({ value, onChange, className = '', defaultTime = '09:00' }) {
  const raw = value || '';
  const [datePart, timeRaw] = raw.includes('T') ? raw.split('T') : [raw, ''];
  const time = (timeRaw || '').slice(0, 5);
  const emit = (d, t) => onChange(d ? `${d}T${t || defaultTime}` : '');

  return (
    <div className="flex flex-wrap gap-2 w-full">
      <DatePicker value={datePart} onChange={(d) => emit(d, time)} className={className} style={{ flex: 1, minWidth: 140 }} />
      <TimePicker value={time} onChange={(t) => emit(datePart, t)} className={className} />
    </div>
  );
}
