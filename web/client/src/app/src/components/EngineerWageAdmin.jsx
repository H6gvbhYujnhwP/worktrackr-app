// web/client/src/app/src/components/EngineerWageAdmin.jsx
// Phase 4 — manager screen for engineer wage progression. Set the org's stage
// length + deal-count target (config, neutral by default), start a stage for an
// engineer, enter the neutral delivered-deal count, set the manual £ rise/new rate,
// and confirm. No hardcoded money. Reads/writes /api/engineer-wage.
import React, { useEffect, useState } from 'react';
import { SlidersHorizontal, Save, Plus, Check, Trash2, BadgeCheck } from 'lucide-react';

const money = (n) => `£${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

  if (loading) return <div className="p-6 text-[13px] text-gray-500">Loading…</div>;

  const inProgress = records.filter((r) => r.status === 'in_progress');
  const confirmed = records.filter((r) => r.status === 'confirmed');
  const numIn = (v) => (v === '' || v === null || v === undefined ? '' : v);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-1"><SlidersHorizontal className="w-5 h-5 text-gray-700" /><div className="text-lg font-medium text-gray-900">Engineer wages</div></div>
      <div className="text-[13px] text-gray-500 mb-4">Per-engineer progression. Engineers see only a neutral deal count and their rate — never profit. Every £ figure is set by you.</div>
      {error && <div className="text-[12px] text-red-700 mb-2">{error}</div>}
      {msg && <div className="text-[12px] text-[#0f6e56] mb-2">{msg}</div>}

      {/* Scheme settings */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:px-5 mb-3">
        <div className="text-[14px] font-medium text-gray-900 mb-2">Scheme settings</div>
        <div className="flex flex-wrap gap-4 items-end">
          <label className="text-[13px]">Stage length (months)
            <input type="number" value={numIn(config.stageMonths)} onChange={(e) => setConfig({ ...config, stageMonths: e.target.value })} className="block mt-1 w-28 border border-gray-300 rounded-lg px-2 py-1.5" />
          </label>
          <label className="text-[13px]">Deal-count target per stage
            <input type="number" value={numIn(config.dealCountTarget)} onChange={(e) => setConfig({ ...config, dealCountTarget: e.target.value })} className="block mt-1 w-28 border border-gray-300 rounded-lg px-2 py-1.5" />
          </label>
          <button onClick={saveSettings} className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4a017] bg-[rgba(212,160,23,0.12)] text-[#8a6a0f] px-3 py-1.5 text-[13px]"><Save className="w-4 h-4" /> Save</button>
        </div>
      </div>

      {/* Start a stage */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:px-5 mb-3">
        <div className="text-[14px] font-medium text-gray-900 mb-2">Start a stage</div>
        <div className="grid sm:grid-cols-2 gap-2">
          <select value={form.engineerUserId} onChange={(e) => setForm({ ...form, engineerUserId: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-[13px] bg-white">
            <option value="">Select engineer…</option>
            {candidates.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input type="date" value={form.startedAt} onChange={(e) => setForm({ ...form, startedAt: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-[13px]" />
          <input type="number" placeholder="Current rate £" value={form.currentRate} onChange={(e) => setForm({ ...form, currentRate: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-[13px]" />
          <input type="number" placeholder={`Deal target (default ${config.dealCountTarget || 0})`} value={form.dealTarget} onChange={(e) => setForm({ ...form, dealTarget: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-[13px]" />
        </div>
        <button onClick={startStage} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-[13px] hover:bg-gray-50"><Plus className="w-4 h-4" /> Start stage</button>
      </div>

      {/* Active stages */}
      <div className="text-[14px] font-medium text-gray-900 mb-2">Active stages</div>
      {inProgress.length === 0 && <div className="text-[13px] text-gray-500 mb-3">No active stages.</div>}
      {inProgress.map((rec) => (
        <div key={rec.id} className="bg-white border border-gray-200 rounded-xl p-4 md:px-5 mb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[14px] font-medium text-gray-900">{rec.engineerName} <span className="text-gray-400 text-[12px]">· stage {rec.stageNo}</span></div>
            <div className="flex gap-1.5">
              <button onClick={() => saveRec(rec)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-[12px] hover:bg-gray-50"><Save className="w-3.5 h-3.5" /> Save</button>
              <button onClick={() => confirmRec(rec)} className="inline-flex items-center gap-1 rounded-lg border border-[#0F6E56] text-[#0F6E56] px-2.5 py-1 text-[12px]"><Check className="w-3.5 h-3.5" /> Confirm rise</button>
              <button onClick={() => deleteRec(rec)} className="text-gray-300 hover:text-red-700 px-1"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[12px]">
            <label>Deals delivered<input type="number" value={numIn(rec.dealsDelivered)} onChange={(e) => setRec(rec.id, { dealsDelivered: e.target.value })} className="block mt-1 w-full border border-gray-300 rounded px-2 py-1" /></label>
            <label>Deal target<input type="number" value={numIn(rec.dealTarget)} onChange={(e) => setRec(rec.id, { dealTarget: e.target.value })} className="block mt-1 w-full border border-gray-300 rounded px-2 py-1" /></label>
            <label>Current rate £<input type="number" value={numIn(rec.currentRate)} onChange={(e) => setRec(rec.id, { currentRate: e.target.value })} className="block mt-1 w-full border border-gray-300 rounded px-2 py-1" /></label>
            <label>Rise £<input type="number" value={numIn(rec.riseAmount)} onChange={(e) => setRec(rec.id, { riseAmount: e.target.value })} className="block mt-1 w-full border border-gray-300 rounded px-2 py-1" /></label>
            <label>New rate £<input type="number" value={numIn(rec.newRate)} onChange={(e) => setRec(rec.id, { newRate: e.target.value })} className="block mt-1 w-full border border-gray-300 rounded px-2 py-1" /></label>
          </div>
          <input value={rec.note || ''} onChange={(e) => setRec(rec.id, { note: e.target.value })} placeholder="Note (optional)" className="mt-2 w-full border border-gray-200 rounded px-2 py-1 text-[12px]" />
        </div>
      ))}

      {/* Confirmed history */}
      {confirmed.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:px-5 mt-3">
          <div className="text-[14px] font-medium text-gray-900 mb-1">Confirmed</div>
          {confirmed.map((rec) => (
            <div key={rec.id} className="flex items-center justify-between text-[13px] py-2 border-t border-gray-100">
              <span className="text-gray-600 inline-flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-[#0f6e56]" /> {rec.engineerName} · stage {rec.stageNo}</span>
              <span className="text-gray-700">{money(rec.currentRate)} → <b>{money(rec.newRate || rec.currentRate)}</b></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
