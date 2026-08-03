// web/client/src/app/src/components/CompanyFilterModal.jsx
// Sales › Companies → "Filter" pop-up.
//
// A tidy dark modal of tick-box groups (Stage, Source, Industry, Employees,
// Account manager, Spotter, Customer status, Tags, Missing details, Chase date).
// The user ticks anything across any group, then presses Search — the modal
// closes and the Companies list shows the matches.
//
// WITHIN a group, ticks are OR ("Voicemail or Contacted").
// ACROSS groups, they are AND ("Voicemail AND source = telesales").
//
// This component is deliberately GENERIC: the parent (CompanyPipelineList)
// builds the `groups` from the REAL loaded companies, so no option ever
// appears that no company actually has. Nothing is invented here.
//
// Props:
//   open       — bool
//   groups     — [{ key, label, options: [{ value, label, count }] }]
//   value      — { [groupKey]: [selected values] }
//   onApply(next) — called with the new selection when Search is pressed
//   onClose()  — dismiss without applying
import React, { useEffect, useMemo, useState } from 'react';
import { X, Search as SearchIcon, Check } from 'lucide-react';

// Show the type-to-narrow box once a group gets long enough to be a scroll-hunt.
const NARROW_AT = 8;

function Group({ group, selected, onToggle }) {
  const [q, setQ] = useState('');
  const opts = group.options || [];
  const showNarrow = opts.length > NARROW_AT;

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return opts;
    return opts.filter((o) => String(o.label).toLowerCase().includes(needle));
  }, [opts, q]);

  const chosen = selected.length;

  return (
    <div className="rounded-lg border border-[#2e2e4a] bg-[#1f1f33] p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[12px] font-medium uppercase tracking-wide text-[#94a3b8]">
          {group.label}
        </div>
        {chosen > 0 && (
          <span className="rounded-full bg-[rgba(245,158,11,0.15)] px-2 py-0.5 text-[11px] text-[#fcd34d]">
            {chosen}
          </span>
        )}
      </div>

      {showNarrow && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Narrow ${group.label.toLowerCase()}…`}
          className="mb-2 h-7 w-full rounded-md border border-[#2e2e4a] bg-[#242438] px-2 text-[12px] text-white placeholder-[#6b7280] outline-none focus:border-[#f59e0b]"
        />
      )}

      <div className="max-h-40 overflow-y-auto pr-1 space-y-0.5">
        {visible.length === 0 && (
          <div className="py-2 text-[12px] text-[#6b7280]">No matches</div>
        )}
        {visible.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(group.key, o.value)}
              className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-[#2a2a48]"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  on
                    ? 'border-[#f59e0b] bg-[#f59e0b]'
                    : 'border-[#3a3a5c] bg-transparent'
                }`}
              >
                {on && <Check className="h-3 w-3 text-[#1a1a2e]" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-[#cbd5e1]">
                {o.label}
              </span>
              {o.count != null && (
                <span className="shrink-0 text-[11px] text-[#6b7280]">{o.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CompanyFilterModal({ open, groups = [], value = {}, onApply, onClose }) {
  // Draft selection — so Cancel discards and only Search commits.
  const [draft, setDraft] = useState(value);

  // Re-seed the draft each time the modal is opened.
  useEffect(() => {
    if (open) setDraft(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const toggle = (groupKey, val) => {
    setDraft((prev) => {
      const cur = prev[groupKey] || [];
      const next = cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val];
      return { ...prev, [groupKey]: next };
    });
  };

  const totalChosen = Object.values(draft).reduce(
    (n, arr) => n + (Array.isArray(arr) ? arr.length : 0),
    0
  );

  const clearAll = () => {
    const cleared = {};
    for (const g of groups) cleared[g.key] = [];
    setDraft(cleared);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-[#2e2e4a] bg-[#242438] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#2e2e4a] px-5 py-3">
          <div>
            <div className="text-[15px] font-semibold text-white">Filter companies</div>
            <div className="text-[12px] text-[#6b7280]">
              Tick anything you like, then press Search
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#94a3b8] hover:bg-[#2a2a48] hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* groups */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {groups.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[#6b7280]">
              Nothing to filter on yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((g) => (
                <Group
                  key={g.key}
                  group={g}
                  selected={draft[g.key] || []}
                  onToggle={toggle}
                />
              ))}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#2e2e4a] px-5 py-3">
          <button
            type="button"
            onClick={clearAll}
            disabled={totalChosen === 0}
            className="text-[13px] text-[#94a3b8] hover:text-white disabled:opacity-40 disabled:hover:text-[#94a3b8]"
          >
            Clear all
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#2e2e4a] bg-[#242438] px-4 py-1.5 text-[13px] text-[#cbd5e1] hover:bg-[#2a2a48]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onApply(draft)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#f59e0b] px-4 py-1.5 text-[13px] font-medium text-[#1a1a2e] hover:bg-[#fbbf24]"
            >
              <SearchIcon className="h-4 w-4" />
              Search{totalChosen > 0 ? ` (${totalChosen})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
