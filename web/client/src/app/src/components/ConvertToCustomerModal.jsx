// web/client/src/app/src/components/ConvertToCustomerModal.jsx
// Phase 7 (Leads) — guided step that turns a lead into a customer. Confirms the
// real contact people, account manager and optional address, then flips the
// company's crm.salesStage to 'customer' (and status to 'active') via PUT
// /api/contacts/:id. The same company record is promoted — nothing is recreated,
// notes and history are kept. NO money fields.
import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

const LABEL = 'block text-[12px] text-gray-600 mb-1';
const INPUT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#0F6E56]';

export default function ConvertToCustomerModal({ lead, currentUser, onClose, onConverted }) {
  const crm = lead?.crm || {};
  // Seed the main contact from what we already know about the lead.
  const [people, setPeople] = useState([
    {
      name: lead?.primaryContact || '',
      role: '',
      phone: lead?.phone || '',
      email: lead?.email || '',
      decisionMaker: true,
    },
  ]);
  const [accountManager, setAccountManager] = useState(crm.assignedTo || currentUser?.name || currentUser?.email || '');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  function setPerson(i, patch) {
    setPeople((arr) => arr.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function addPerson() {
    setPeople((arr) => [...arr, { name: '', role: '', phone: '', email: '', decisionMaker: false }]);
  }
  function removePerson(i) {
    setPeople((arr) => (arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr));
  }

  async function convert() {
    const main = people[0];
    if (!main.name.trim()) { setErr('The main contact needs a name'); return; }
    setSaving(true); setErr(null);
    try {
      const body = {
        primaryContact: main.name.trim(),
        phone: main.phone.trim(),
        email: main.email.trim(),
        contactPersons: people
          .filter((p) => p.name.trim())
          .map((p) => ({
            name: p.name.trim(),
            role: p.role.trim(),
            phone: p.phone.trim(),
            email: p.email.trim(),
            decisionMaker: !!p.decisionMaker,
          })),
        crm: { ...crm, salesStage: 'customer', status: 'active', assignedTo: accountManager || null },
      };
      if (address.trim()) body.addresses = [{ label: 'Main', address: address.trim() }];

      const r = await fetch(`/api/contacts/${lead.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      onConverted && onConverted();
    } catch (e) {
      setErr(e.message || 'Could not convert this lead');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-xl w-full max-w-[560px] border border-gray-200 shadow-xl my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-[15px] font-medium text-gray-900">Convert to customer</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-[13px] text-gray-600">
            Make <span className="font-medium text-gray-900">{lead?.name}</span> a customer and move it out of Leads. Confirm the details first.
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">Contacts</div>
            <div className="space-y-3">
              {people.map((p, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className={LABEL}>Name{i === 0 ? '' : ''}</label>
                      <input className={INPUT} value={p.name} onChange={(e) => setPerson(i, { name: e.target.value })} placeholder={i === 0 ? 'Main contact' : 'Name'} />
                    </div>
                    <div>
                      <label className={LABEL}>Role</label>
                      <input className={INPUT} value={p.role} onChange={(e) => setPerson(i, { role: e.target.value })} placeholder="e.g. Director" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className={LABEL}>Phone</label>
                      <input className={INPUT} value={p.phone} onChange={(e) => setPerson(i, { phone: e.target.value })} />
                    </div>
                    <div>
                      <label className={LABEL}>Email</label>
                      <input className={INPUT} value={p.email} onChange={(e) => setPerson(i, { email: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-[12px] text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={!!p.decisionMaker} onChange={(e) => setPerson(i, { decisionMaker: e.target.checked })} />
                      Decision-maker
                    </label>
                    {people.length > 1 && (
                      <button onClick={() => removePerson(i)} className="inline-flex items-center gap-1 text-[12px] text-gray-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addPerson} className="mt-2 inline-flex items-center gap-1 text-[12px] text-[#0F6E56] hover:underline">
              <Plus className="w-3.5 h-3.5" /> Add another contact
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Account manager</label>
              <input className={INPUT} value={accountManager} onChange={(e) => setAccountManager(e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Address <span className="text-gray-400">(optional)</span></label>
              <input className={INPUT} value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-gray-600">
            Stage changes to <span className="font-medium text-gray-800">Customer</span>. Notes and history are kept.
          </div>

          {err && <div className="text-[12px] text-red-700">{err}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-gray-300 text-gray-700 text-[13px] hover:bg-gray-50">Cancel</button>
          <button
            onClick={convert}
            disabled={saving || !people[0]?.name.trim()}
            className="h-9 px-4 rounded-lg bg-[#1D9E75] text-white text-[13px] hover:bg-[#16835f] disabled:opacity-50"
          >
            {saving ? 'Converting…' : 'Convert to customer'}
          </button>
        </div>
      </div>
    </div>
  );
}
