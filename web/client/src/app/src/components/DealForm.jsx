// web/client/src/app/src/components/DealForm.jsx
// Phase 6 (slim) — create/edit a deal. Lightweight: company, title, value,
// stage, expected close, notes. Saves to /api/deals.
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save, Trash2, Target } from 'lucide-react';

const STAGES = [
  { key: 'open',        label: 'Open' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'won',         label: 'Won' },
  { key: 'lost',        label: 'Lost' },
];

export default function DealForm({ dealId, initialCompanyId, onBack, onSaved }) {
  const [companies, setCompanies] = useState([]);
  const [id, setId] = useState(dealId || null);
  const [contactId, setContactId] = useState(initialCompanyId || '');
  const [title, setTitle] = useState('');
  const [value, setValue] = useState(0);
  const [stage, setStage] = useState('open');
  const [closeDate, setCloseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(!!dealId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/contacts?type=company', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : [])).then((d) => setCompanies(Array.isArray(d) ? d : [])).catch(() => {});
    if (dealId) {
      (async () => {
        try {
          const r = await fetch(`/api/deals/${dealId}`, { credentials: 'include' });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const d = await r.json();
          setId(d.id); setContactId(d.contactId || ''); setTitle(d.title || ''); setValue(d.value || 0);
          setStage(d.stage || 'open'); setCloseDate(d.expectedCloseDate ? String(d.expectedCloseDate).slice(0, 10) : ''); setNotes(d.notes || '');
        } catch (e) { setError(e.message); } finally { setLoading(false); }
      })();
    }
  }, [dealId]);

  const save = async () => {
    if (!title.trim()) { setError('Give the deal a title.'); return; }
    setSaving(true); setError(null);
    try {
      const payload = {
        contactId: contactId || null, title: title.trim(), value: Number(value) || 0,
        stage, expectedCloseDate: closeDate || null, notes: notes || null,
      };
      const r = await fetch(id ? `/api/deals/${id}` : '/api/deals', {
        method: id ? 'PUT' : 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      onSaved && onSaved();
      onBack && onBack();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!id || !window.confirm('Delete this deal?')) return;
    setSaving(true);
    try { await fetch(`/api/deals/${id}`, { method: 'DELETE', credentials: 'include' }); onSaved && onSaved(); onBack && onBack(); }
    catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-[13px] text-gray-500">Loading deal…</div>;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <button onClick={() => onBack && onBack()} className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-800 mb-3">
        <ArrowLeft className="w-4 h-4" /> Back to deals
      </button>

      <div className="bg-white border border-gray-200 rounded-xl p-4 md:px-5">
        <div className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-3"><Target className="w-4 h-4 text-[#0C447C]" /> {id ? 'Deal' : 'New deal'}</div>

        <div className="grid gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Title</div>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Network refresh" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px]" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Company</div>
              <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] bg-white">
                <option value="">Select a company…</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Value (£, ex VAT)</div>
              <input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px]" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Stage</div>
              <select value={stage} onChange={(e) => setStage(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] bg-white">
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Expected close</div>
              <input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px]" />
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Notes</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px]" placeholder="Optional" />
          </div>
        </div>

        {error && <div className="text-[12px] text-red-700 mt-2">{error}</div>}

        <div className="flex items-center justify-between mt-4">
          {id ? <button onClick={remove} disabled={saving} className="inline-flex items-center gap-1.5 text-[13px] text-red-700 hover:text-red-800"><Trash2 className="w-4 h-4" /> Delete</button> : <span />}
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-[#0C447C] text-[#0C447C] px-3 py-1.5 text-[13px] hover:bg-[#E6F1FB]">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save deal'}
          </button>
        </div>
      </div>
    </div>
  );
}
