// web/client/src/app/src/components/CommissionRules.jsx
// Phase 4 — admin "Commission rules". Each ORGANISATION enters its OWN scheme here.
// Nothing is hardcoded; the form loads whatever this org saved (zeros/disabled by
// default) and writes it back to /api/commission/settings. The engine applies only
// what is stored here.
import React, { useEffect, useState } from 'react';
import { SlidersHorizontal, Save, Lock } from 'lucide-react';
import PageHero from './PageHero.jsx';

const FIELDS = [
  { key: 'oneOffRate',        label: 'One-off commission rate', suffix: '%', help: 'Applied to (profit − internal cost) on standard orders.' },
  { key: 'deductionPerSale',  label: 'Internal cost per sale',  prefix: '£', help: 'Your cost deducted before profit on a standard order (e.g. acquisition cost). Set 0 for none.' },
  { key: 'financeRate',       label: 'Finance rate',            suffix: '%', help: 'Applied to order value when an order is categorised "Finance".' },
  { key: 'referralRate',      label: 'Referral rate',           suffix: '%', help: 'Applied to profit when an order is categorised "Referral".' },
  { key: 'recurringRate',     label: 'Recurring rate',          suffix: '%', help: 'Applied to a contract\'s clear monthly profit while the contract is active. Set 0 for none.' },
  { key: 'thresholdTurnover', label: 'Performance-bonus threshold', prefix: '£', help: 'Paid turnover in a period that unlocks the performance bonus. Set 0 to disable the bonus.' },
  { key: 'bonusRate',         label: 'Performance-bonus rate',  suffix: '%', help: 'Percentage of the period\'s paid profit awarded once the threshold is exceeded.' },
  { key: 'periodStartDay',    label: 'Period start day',        suffix: '', help: 'Day of month each commission period begins (1–28).' },
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

  if (loading) return (
    <div className="flex items-center justify-center p-8 text-[13px] text-[#94a3b8] bg-[#1a1a2e] min-h-full">
      Loading rules…
    </div>
  );
  if (!config) return (
    <div className="p-6 text-[13px] text-[#fca5a5] bg-[#1a1a2e] min-h-full">
      Couldn't load commission rules{error ? `: ${error}` : ''}.
    </div>
  );

  return (
    <div className="space-y-5 p-5 md:p-7 min-h-full bg-[#1a1a2e]">
      <PageHero
        title="Commission Rules"
        icon={SlidersHorizontal}
        meta={[{ label: 'Configure your organisation\'s commission scheme' }]}
        compact
      />

      <div className="bg-[#242438] border border-[#2e2e4a] rounded-xl p-5 md:px-6 max-w-2xl">
        <label className="flex items-center gap-2 text-[14px] text-white mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!config.enabled}
            disabled={!canEdit}
            onChange={(e) => setField('enabled', e.target.checked)}
            className="accent-[#f59e0b]"
          />
          Commission module enabled
        </label>

        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
          {FIELDS.map((f) => (
            <div key={f.key} className={f.disabled ? 'opacity-50' : ''}>
              <div className="text-[13px] font-medium text-white mb-1">{f.label}</div>
              <div className="flex items-center gap-1.5">
                {f.prefix && <span className="text-[#94a3b8] text-[13px]">{f.prefix}</span>}
                <input
                  type="number"
                  step="any"
                  value={config[f.key] ?? 0}
                  disabled={!canEdit || f.disabled}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className="w-28 border border-[#2e2e4a] rounded-lg px-2 py-1.5 text-[13px] bg-[#1a1a2e] text-white focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/30 focus:border-[#f59e0b] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {f.suffix && <span className="text-[#94a3b8] text-[13px]">{f.suffix}</span>}
              </div>
              <div className="text-[11px] text-[#6b7280] mt-1">{f.help}</div>
            </div>
          ))}
        </div>

        {canEdit ? (
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-[#1a1a2e] px-4 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save rules'}
            </button>
            {msg && <span className="text-[12px] text-[#6ee7b7]">{msg}</span>}
            {error && <span className="text-[12px] text-[#fca5a5]">{error}</span>}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[12px] text-[#6b7280] mt-6">
            <Lock className="w-3.5 h-3.5" /> Only managers can edit these rules.
          </div>
        )}
      </div>
    </div>
  );
}
