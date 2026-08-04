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
//   textFields — [{ key, label, placeholder, hint }] free-text boxes shown on top
//   value      — { [groupKey]: [selected values], [textKey]: 'string' }
//   onApply(next) — called with the new selection when Search is pressed
//   onClose()  — dismiss without applying
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search as SearchIcon, Check, Bookmark, ChevronDown, Trash2 } from 'lucide-react';

// ── Saved searches (shared with the whole organisation) ─────────────────────
// A named filter combination anyone in Sales can save and everyone can re-run.
// Picking one applies it and closes the pop-up immediately.
function SavedSearchMenu({ saved, loading, error, onPick, onDelete, canDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // click-away to close
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#2e2e4a] bg-[#242438] px-3 py-1.5 text-[13px] text-[#cbd5e1] hover:bg-[#2a2a48]"
      >
        <Bookmark className="h-4 w-4" />
        Saved searches
        {saved.length > 0 && <span className="text-[#6b7280]">({saved.length})</span>}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-0 z-10 mt-1 max-h-72 w-80 overflow-y-auto rounded-lg border border-[#2e2e4a] bg-[#242438] py-1 shadow-2xl">
          {loading && <div className="px-3 py-2 text-[12px] text-[#6b7280]">Loading…</div>}
          {error && !loading && <div className="px-3 py-2 text-[12px] text-[#fca5a5]">{error}</div>}
          {!loading && !error && saved.length === 0 && (
            <div className="px-3 py-2 text-[12px] text-[#6b7280]">
              Nothing saved yet. Tick some filters, then name and save them below.
            </div>
          )}
          {!loading && saved.map((s) => (
            <div key={s.id} className="group flex items-start gap-1 px-1">
              <button
                type="button"
                onClick={() => { setOpen(false); onPick(s); }}
                className="min-w-0 flex-1 rounded px-2 py-1.5 text-left hover:bg-[#2a2a48]"
              >
                <div className="truncate text-[13px] text-white">{s.name}</div>
                {s.summary && (
                  <div className="truncate text-[11px] text-[#6b7280]">{s.summary}</div>
                )}
              </button>
              {canDelete(s) && (
                <button
                  type="button"
                  onClick={() => onDelete(s)}
                  title="Delete this saved search"
                  className="mt-1 shrink-0 rounded p-1 text-[#6b7280] opacity-0 hover:bg-[#3a2a2a] hover:text-[#fca5a5] group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

export default function CompanyFilterModal({
  open, groups = [], textFields = [], value = {}, onApply, onClose,
  // saved searches (shared across the organisation)
  saved = [], savedLoading = false, savedError = '',
  onPickSaved, onSaveSearch, onDeleteSaved, canDeleteSaved = () => false,
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  // Draft selection — so Cancel discards and only Search commits.
  const [draft, setDraft] = useState(value);

  // Re-seed the draft each time the modal is opened.
  useEffect(() => {
    if (open) { setDraft(value); setName(''); setSaveMsg(''); }
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

  const setText = (key, v) => setDraft((prev) => ({ ...prev, [key]: v }));

  const totalChosen =
    Object.values(draft).reduce((n, arr) => n + (Array.isArray(arr) ? arr.length : 0), 0) +
    textFields.reduce((n, f) => n + (String(draft[f.key] || '').trim() ? 1 : 0), 0);

  const clearAll = () => {
    const cleared = {};
    for (const g of groups) cleared[g.key] = [];
    for (const f of textFields) cleared[f.key] = '';
    setDraft((prev) => ({ ...prev, ...cleared }));
  };

  const doSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || totalChosen === 0 || saving) return;
    setSaving(true);
    setSaveMsg('');
    try {
      // onSaveSearch resolves with an error string, or nothing on success
      const err = await onSaveSearch(trimmed, draft);
      if (err) {
        setSaveMsg({ ok: false, text: err });
      } else {
        setSaveMsg({ ok: true, text: 'Saved for the team' });
        setName('');
      }
    } catch (e) {
      setSaveMsg({ ok: false, text: e?.message || 'Could not save' });
    } finally {
      setSaving(false);
    }
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
          <div className="flex items-center gap-2">
            <SavedSearchMenu
              saved={saved}
              loading={savedLoading}
              error={savedError}
              onPick={onPickSaved}
              onDelete={onDeleteSaved}
              canDelete={canDeleteSaved}
            />
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-[#94a3b8] hover:bg-[#2a2a48] hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* groups */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {textFields.length > 0 && (
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {textFields.map((f) => (
                <div key={f.key} className="rounded-lg border border-[#2e2e4a] bg-[#1f1f33] p-3">
                  <div className="mb-2 text-[12px] font-medium uppercase tracking-wide text-[#94a3b8]">
                    {f.label}
                  </div>
                  <input
                    value={draft[f.key] || ''}
                    onChange={(e) => setText(f.key, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onApply(draft); }}
                    placeholder={f.placeholder || ''}
                    className="h-8 w-full rounded-md border border-[#2e2e4a] bg-[#242438] px-2 text-[13px] text-white placeholder-[#6b7280] outline-none focus:border-[#f59e0b]"
                  />
                  {f.hint && <div className="mt-1.5 text-[11px] leading-snug text-[#6b7280]">{f.hint}</div>}
                </div>
              ))}
            </div>
          )}

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

        {/* save this combination for the whole team */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-[#2e2e4a] px-5 py-3">
          <span className="text-[12px] text-[#94a3b8]">Save this search</span>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setSaveMsg(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim() && totalChosen > 0) doSave(); }}
            placeholder="e.g. Kent chase list"
            maxLength={60}
            className="h-8 w-56 rounded-md border border-[#2e2e4a] bg-[#242438] px-2 text-[13px] text-white placeholder-[#6b7280] outline-none focus:border-[#f59e0b]"
          />
          <button
            type="button"
            onClick={doSave}
            disabled={saving || !name.trim() || totalChosen === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2e2e4a] bg-[#242438] px-3 py-1.5 text-[13px] text-[#cbd5e1] hover:bg-[#2a2a48] disabled:opacity-40 disabled:hover:bg-[#242438]"
          >
            <Bookmark className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save'}
          </button>
          {totalChosen === 0 && !saveMsg && (
            <span className="text-[11px] text-[#6b7280]">Tick something first</span>
          )}
          {saveMsg && (
            <span className={`text-[11px] ${saveMsg.ok ? 'text-[#86efac]' : 'text-[#fca5a5]'}`}>
              {saveMsg.text}
            </span>
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
