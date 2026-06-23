// web/client/src/app/src/components/AddLeadModal.jsx
// Phase 7 (Leads) — quick-add a new lead. Creates a contacts row type='company'
// at a lead stage (default 'new') via POST /api/contacts. Lead detail (first
// contact, chase date, next action) is stored on crm, like salesStage. The
// optional first note is saved to the company's notes. NO money fields.
import React, { useState } from 'react';
import { X } from 'lucide-react';

const LABEL = 'block text-[12px] text-gray-600 mb-1';
const INPUT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#0F6E56]';

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function AddLeadModal({ currentUser, onClose, onCreated }) {
  const me = currentUser?.name || currentUser?.email || '';
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState('new');
  const [firstContact, setFirstContact] = useState(todayISO());
  const [chaseDate, setChaseDate] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  async function save() {
    if (!name.trim()) { setErr('Company name is required'); return; }
    setSaving(true); setErr(null);
    try {
      const body = {
        type: 'company',
        name: name.trim(),
        primaryContact: contact.trim(),
        email: email.trim(),
        phone: phone.trim(),
        crm: {
          salesStage: stage,
          firstContact: firstContact || null,
          chaseDate: chaseDate || null,
          nextAction: nextAction.trim(),
          assignedTo: me || null,
        },
        notes: note.trim(),
      };
      const r = await fetch('/api/contacts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      onCreated && onCreated();
    } catch (e) {
      setErr(e.message || 'Could not add the lead');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-xl w-full max-w-[540px] border border-gray-200 shadow-xl my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-[15px] font-medium text-gray-900">Add lead</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className={LABEL}>Company name</label>
            <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Co" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Contact name</label>
              <input className={INPUT} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Person you spoke to" />
            </div>
            <div>
              <label className={LABEL}>Phone</label>
              <input className={INPUT} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Email</label>
              <input className={INPUT} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Stage</label>
              <select className={INPUT} value={stage} onChange={(e) => setStage(e.target.value)}>
                <option value="new">New</option>
                <option value="prospect">Prospect</option>
                <option value="hot_prospect">Hot prospect</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>First contact</label>
              <input type="date" className={INPUT} value={firstContact} onChange={(e) => setFirstContact(e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Chase date</label>
              <input type="date" className={INPUT} value={chaseDate} onChange={(e) => setChaseDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={LABEL}>Next action</label>
            <input className={INPUT} value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="e.g. Call back" />
          </div>

          <div>
            <label className={LABEL}>First note <span className="text-gray-400">(optional)</span></label>
            <textarea className={`${INPUT} min-h-[64px]`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was said…" />
          </div>

          {err && <div className="text-[12px] text-red-700">{err}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-gray-300 text-gray-700 text-[13px] hover:bg-gray-50">Cancel</button>
          <button
            onClick={save}
            disabled={saving || !name.trim()}
            className="h-9 px-4 rounded-lg bg-[#1D9E75] text-white text-[13px] hover:bg-[#16835f] disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add lead'}
          </button>
        </div>
      </div>
    </div>
  );
}
