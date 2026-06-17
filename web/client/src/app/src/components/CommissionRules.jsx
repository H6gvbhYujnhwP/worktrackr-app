// web/client/src/app/src/components/CommissionRules.jsx
// Phase 4 — admin "Commission rules". Each ORGANISATION enters its OWN scheme here.
// Nothing is hardcoded; the form loads whatever this org saved (zeros/disabled by
// default) and writes it back to /api/commission/settings. The engine applies only
// what is stored here.
import React, { useEffect, useState } from 'react';
import { SlidersHorizontal, Save, Lock } from 'lucide-react';

const FIELDS = [
  { key: 'oneOffRate',        label: 'One-off commission rate', suffix: '%', help: 'Applied to (profit − internal cost) on standard orders.' },
  { key: 'deductionPerSale',  label: 'Internal cost per sale',  prefix: '£', help: 'Your cost deducted before profit on a standard order (e.g. acquisition cost). Set 0 for none.' },
  { key: 'financeRate',       label: 'Finance rate',            suffix: '%', help: 'Applied to order value when an order is categorised “Finance”.' },
  { key: 'referralRate',      label: 'Referral rate',           suffix: '%', help: 'Applied to profit when an order is categorised “Referral”.' },
  { key: 'recurringRate',     label: 'Recurring rate',          suffix: '%', help: 'For recurring Contracts — available once Contracts ship (Phase 5).', disabled: true },
  { key: 'thresholdTurnover', label: 'Performance-bonus threshold', prefix: '£', help: 'Paid turnover in a period that unlocks the performance bonus. Set 0 to disable the bonus.' },
  { key: 'bonusRate',         label: 'Performance-bonus rate',  suffix: '%', help: 'Percentage of the period’s paid profit awarded once the threshold is exceeded.' },
  { key: 'periodStartDay',    label: 'Period start day',        suffix: '', help: 'Day of month each commission period begins (1–28). E.g. 25 gives a 25th–25th period.' },
];

export default function CommissionRules() {
  const [config, setConfig] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/commission/settings', { credentials: 'include' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        setConfig(d.config); setCanEdit(!!d.canEdit);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const setField = (k, v) => setConfig((c) => ({ ...c, [k]: v }));

  const save = async () => {
    setSaving(true); setMsg(null); setError(null);
    try {
      const r = await fetch('/api/commission/settings', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      if (r.status === 403) throw new Error('Manager access required to edit rules.');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setConfig(d.config); setMsg('Saved.');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-[13px] text-gray-500">Loading rules…</div>;
  if (!config) return <div className="p-6 text-[13px] text-red-700">Couldn’t load commission rules{error ? `: ${error}` : ''}.</div>;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <SlidersHorizontal className="w-5 h-5 text-gray-700" />
        <div className="text-lg font-medium text-gray-900">Commission rules</div>
      </div>
      <div className="text-[13px] text-gray-500 mb-4">
        Your organisation’s own scheme. Nothing is pre-set — enter the rates and amounts that apply to your business. All figures ex-VAT; commission is only ever payable once an order is marked <b>Paid</b>.
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 md:px-5">
        <label className="flex items-center gap-2 text-[14px] text-gray-900 mb-4">
          <input type="checkbox" checked={!!config.enabled} disabled={!canEdit} onChange={(e) => setField('enabled', e.target.checked)} />
          Commission module enabled
        </label>

        <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
          {FIELDS.map((f) => (
            <div key={f.key} className={f.disabled ? 'opacity-50' : ''}>
              <div className="text-[13px] font-medium text-gray-800 mb-1">{f.label}</div>
              <div className="flex items-center gap-1">
                {f.prefix && <span className="text-gray-500 text-[13px]">{f.prefix}</span>}
                <input type="number" step="any" value={config[f.key] ?? 0}
                  disabled={!canEdit || f.disabled}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-[13px] disabled:bg-gray-50" />
                {f.suffix && <span className="text-gray-500 text-[13px]">{f.suffix}</span>}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">{f.help}</div>
            </div>
          ))}
        </div>

        {canEdit ? (
          <div className="flex items-center gap-3 mt-5">
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4a017] bg-[rgba(212,160,23,0.12)] text-[#8a6a0f] px-3 py-1.5 text-[13px]">
              <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save rules'}
            </button>
            {msg && <span className="text-[12px] text-[#0f6e56]">{msg}</span>}
            {error && <span className="text-[12px] text-red-700">{error}</span>}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[12px] text-gray-400 mt-5"><Lock className="w-3.5 h-3.5" /> Only managers can edit these rules.</div>
        )}
      </div>
    </div>
  );
}
