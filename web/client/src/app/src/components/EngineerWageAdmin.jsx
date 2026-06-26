// web/client/src/app/src/components/EngineerWageAdmin.jsx
// Phase 4 — manager screen for engineer wage progression. Set the org's stage
// length + deal-count target (config, neutral by default), start a stage for an
// engineer, enter the neutral delivered-deal count, set the manual £ rise/new rate,
// and confirm. No hardcoded money. Reads/writes /api/engineer-wage.
import React, { useEffect, useState } from 'react';
import { SlidersHorizontal, Save, Plus, Check, Trash2, BadgeCheck } from 'lucide-react';
import PageHero from './PageHero.jsx';

const money = (n) => `£${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const inputCls = 'border border-[#2e2e4a] rounded-lg px-2 py-1.5 text-[13px] bg-[#1a1a2e] text-white focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/30 focus:border-[#f59e0b] w-full';
const smInputCls = 'block mt-1 w-full border border-[#2e2e4a] rounded px-2 py-1 text-[12px] bg-[#1a1a2e] text-white focus:outline-none focus:ring-[#f59e0b]/30 focus:border-[#f59e0b]';

export default function EngineerWageAdmin() {
  const [config, setConfig] = useState({ stageMonths: 0, dealCountTarget: 0 });
  const [records, setRecords] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ engineerUserId: '', currentRate: '', dealTarget: '', startedAt: '' });

  const loadAll = async () => {
    const [s, l, c] = await Promise.all([
      fetch('/api/engineer-wage/settings', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/engineer-wage', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/engineer-wage/candidates', { credentials: 'include' }).then((r) => r.json()),
    ]);
    setConfig(s.config || { stageMonths: 0, dealCountTarget: 0 });
    setRecords((l.records || []).map((r) => ({ ...r })));
    setCandidates(c.users || []);
  };

  useEffect(() => {
    (async () => { try { await loadAll(); } catch (e) { setError(e.message); } finally { setLoading(false); } })();
  }, []);

  const saveSettings = async () => {
    setMsg(null); setError(null);
    try {
      const r = await fetch('/api/engineer-wage/settings', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config }) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setMsg('Settings saved.');
    } catch (e) { setError(e.message); }
  };

  const startStage = async () => {
    if (!form.engineerUserId) { setError('Pick an engineer.'); return; }
    setError(null);
    try {
      const r = await fetch('/api/engineer-wage', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setForm({ engineerUserId: '', currentRate: '', dealTarget: '', startedAt: '' });
      await loadAll();
    } catch (e) { setError(e.message); }
  };

  const setRec = (id, patch) => setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const saveRec = async (rec) => {
    setError(null);
    try {
      const r = await fetch(`/api/engineer-wage/${rec.id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealsDelivered: rec.dealsDelivered, dealTarget: rec.dealTarget, currentRate: rec.currentRate, riseAmount: rec.riseAmount, newRate: rec.newRate, note: rec.note }) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setMsg('Saved.');
    } catch (e) { setError(e.message); }
  };
  const confirmRec = async (rec) => { try { const r = await fetch(`/api/engineer-wage/${rec.id}/confirm`, { method: 'POST', credentials: 'include' }); if (!r.ok) throw new Error(`HTTP ${r.status}`); await loadAll(); } catch (e) { setError(e.message); } };
  const deleteRec = async (rec) => { try { const r = await fetch(`/api/engineer-wage/${rec.id}`, { method: 'DELETE', credentials: 'include' }); if (!r.ok) throw new Error(`HTTP ${r.status}`); await loadAll(); } catch (e) { setError(e.message); } };

  if (loading) return (
    <div className="flex items-center justify-center p-8 text-[13px] text-[#94a3b8] bg-[#1a1a2e] min-h-full">
      Loading…
    </div>
  );

  const inProgress = records.filter((r) => r.status === 'in_progress');
  const confirmed = records.filter((r) => r.status === 'confirmed');
  const numIn = (v) => (v === '' || v === null || v === undefined ? '' : v);

  return (
    <div className="space-y-4 p-5 md:p-7 min-h-full bg-[#1a1a2e]">
      <PageHero
        title="Engineer Wages"
        icon={SlidersHorizontal}
        meta={[{ label: 'Per-engineer progression — engineers see only a neutral deal count and their rate' }]}
        compact
      />

      {error && <div className="text-[12px] text-[#fca5a5] bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.3)] rounded-lg px-4 py-2">{error}</div>}
      {msg && <div className="text-[12px] text-[#6ee7b7] bg-[rgba(16,185,129,0.10)] border border-[rgba(16,185,129,0.3)] rounded-lg px-4 py-2">{msg}</div>}

      {/* Scheme settings */}
      <div className="bg-[#242438] border border-[#2e2e4a] rounded-xl p-5">
        <div className="text-[14px] font-semibold text-white mb-3">Scheme settings</div>
        <div className="flex flex-wrap gap-5 items-end">
          <label className="text-[13px] text-[#94a3b8]">Stage length (months)
            <input type="number" value={numIn(config.stageMonths)} onChange={(e) => setConfig({ ...config, stageMonths: e.target.value })} className={`block mt-1 w-28 ${inputCls}`} />
          </label>
          <label className="text-[13px] text-[#94a3b8]">Deal-count target per stage
            <input type="number" value={numIn(config.dealCountTarget)} onChange={(e) => setConfig({ ...config, dealCountTarget: e.target.value })} className={`block mt-1 w-28 ${inputCls}`} />
          </label>
          <button onClick={saveSettings} className="inline-flex items-center gap-1.5 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-[#1a1a2e] px-4 py-2 text-[13px] font-semibold transition-colors">
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>

      {/* Start a stage */}
      <div className="bg-[#242438] border border-[#2e2e4a] rounded-xl p-5">
        <div className="text-[14px] font-semibold text-white mb-3">Start a stage</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <select value={form.engineerUserId} onChange={(e) => setForm({ ...form, engineerUserId: e.target.value })} className={inputCls}>
            <option value="">Select engineer…</option>
            {candidates.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input type="date" value={form.startedAt} onChange={(e) => setForm({ ...form, startedAt: e.target.value })} className={inputCls} />
          <input type="number" placeholder="Current rate £" value={form.currentRate} onChange={(e) => setForm({ ...form, currentRate: e.target.value })} className={inputCls} />
          <input type="number" placeholder={`Deal target (default ${config.dealCountTarget || 0})`} value={form.dealTarget} onChange={(e) => setForm({ ...form, dealTarget: e.target.value })} className={inputCls} />
        </div>
        <button onClick={startStage} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#2e2e4a] px-3 py-1.5 text-[13px] text-[#cbd5e1] hover:bg-[#2a2a48] transition-colors">
          <Plus className="w-4 h-4" /> Start stage
        </button>
      </div>

      {/* Active stages */}
      <div className="text-[14px] font-semibold text-white">Active stages</div>
      {inProgress.length === 0 && <div className="text-[13px] text-[#6b7280]">No active stages.</div>}
      {inProgress.map((rec) => (
        <div key={rec.id} className="bg-[#242438] border border-[#2e2e4a] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[14px] font-semibold text-white">{rec.engineerName} <span className="text-[#6b7280] text-[12px]">· stage {rec.stageNo}</span></div>
            <div className="flex gap-1.5">
              <button onClick={() => saveRec(rec)} className="inline-flex items-center gap-1 rounded-lg border border-[#2e2e4a] px-2.5 py-1 text-[12px] text-[#cbd5e1] hover:bg-[#2a2a48] transition-colors"><Save className="w-3.5 h-3.5" /> Save</button>
              <button onClick={() => confirmRec(rec)} className="inline-flex items-center gap-1 rounded-lg border border-[rgba(16,185,129,0.5)] text-[#6ee7b7] px-2.5 py-1 text-[12px] hover:bg-[rgba(16,185,129,0.10)] transition-colors"><Check className="w-3.5 h-3.5" /> Confirm rise</button>
              <button onClick={() => deleteRec(rec)} className="text-[#6b7280] hover:text-[#fca5a5] px-1 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[12px] text-[#94a3b8]">
            <label>Deals delivered<input type="number" value={numIn(rec.dealsDelivered)} onChange={(e) => setRec(rec.id, { dealsDelivered: e.target.value })} className={smInputCls} /></label>
            <label>Deal target<input type="number" value={numIn(rec.dealTarget)} onChange={(e) => setRec(rec.id, { dealTarget: e.target.value })} className={smInputCls} /></label>
            <label>Current rate £<input type="number" value={numIn(rec.currentRate)} onChange={(e) => setRec(rec.id, { currentRate: e.target.value })} className={smInputCls} /></label>
            <label>Rise £<input type="number" value={numIn(rec.riseAmount)} onChange={(e) => setRec(rec.id, { riseAmount: e.target.value })} className={smInputCls} /></label>
            <label>New rate £<input type="number" value={numIn(rec.newRate)} onChange={(e) => setRec(rec.id, { newRate: e.target.value })} className={smInputCls} /></label>
          </div>
          <input value={rec.note || ''} onChange={(e) => setRec(rec.id, { note: e.target.value })} placeholder="Note (optional)" className="mt-2 w-full border border-[#2e2e4a] rounded px-2 py-1 text-[12px] bg-[#1a1a2e] text-white placeholder:text-[#6b7280] focus:outline-none" />
        </div>
      ))}

      {/* Confirmed history */}
      {confirmed.length > 0 && (
        <div className="bg-[#242438] border border-[#2e2e4a] rounded-xl p-4">
          <div className="text-[14px] font-semibold text-white mb-2">Confirmed</div>
          {confirmed.map((rec) => (
            <div key={rec.id} className="flex items-center justify-between text-[13px] py-2 border-t border-[#2e2e4a]">
              <span className="text-[#94a3b8] inline-flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-[#6ee7b7]" /> {rec.engineerName} · stage {rec.stageNo}</span>
              <span className="text-[#cbd5e1]">{money(rec.currentRate)} → <b className="text-white">{money(rec.newRate || rec.currentRate)}</b></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
