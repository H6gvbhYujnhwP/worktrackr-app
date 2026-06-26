// web/client/src/app/src/components/ContractForm.jsx
// Phase 5 — the contract form (recurring). Create/edit a draft, activate it, or
// pause/cancel (manager). Recurring lines only — pulling an IdoYourQuotes quote
// auto-sorts it server-side: monthly/annual lines join this contract; one-off
// lines are spun into a linked draft Order. Line economics come from the quote
// (read-only) or are typed in for manual lines. Saves to /api/contracts.
// Props: contractId (null = new), initialCompanyId, isManager, onBack(), onSaved().
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Lock, Play, Pause, Ban, Repeat } from 'lucide-react';

const money = (n) => `£${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const STATUS_PILL = {
  draft:     'bg-[#F1EFE8] text-[#2C2C2A]',
  active:    'bg-[#E1F5EE] text-[#085041]',
  paused:    'bg-[#FAEEDA] text-[#854F0B]',
  cancelled: 'bg-[#FAECE7] text-[#993C1D]',
};
// per-month figure: annual ÷ 12, monthly as-is
const perMonth = (value, interval) => (Number(value) || 0) / (interval === 'annual' ? 12 : 1);
const blankLine = () => ({ _key: Math.random().toString(36).slice(2), description: '', qty: 1, unitCost: 0, unitProfit: 0, billingInterval: 'monthly', source: 'manual', idyqQuoteId: null });

export default function ContractForm({ contractId, initialCompanyId, isManager, onBack, onSaved }) {
  const [companies, setCompanies] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [id, setId] = useState(contractId || null);
  const [status, setStatus] = useState('draft');
  const [contactId, setContactId] = useState(initialCompanyId || '');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([]);
  const [pulledQuotes, setPulledQuotes] = useState([]);
  const [pickQuote, setPickQuote] = useState('');
  const [linkedNote, setLinkedNote] = useState(null);
  const [loading, setLoading] = useState(!!contractId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const editable = status === 'draft' || status === 'active';

  const applyContract = (c) => {
    setId(c.id); setStatus(c.status); setContactId(c.contactId || ''); setNotes(c.notes || '');
    setLines((c.lines || []).map((l) => ({ ...l, _key: l.id })));
    setPulledQuotes([...new Set((c.lines || []).filter((l) => l.idyqQuoteId).map((l) => l.idyqQuoteId))]);
  };

  useEffect(() => {
    fetch('/api/contacts?type=company', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : [])).then((d) => setCompanies(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/idyq/quotes', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { quotes: [] })).then((d) => setQuotes(d.quotes || [])).catch(() => {});
    // Then re-sync from IdoYourQuotes in the background so brand-new quotes appear
    // in the picker without a manual sync (the cached list shows instantly above).
    fetch('/api/idyq/quotes?refresh=1', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && d.quotes) setQuotes(d.quotes); }).catch(() => {});
    if (contractId) {
      (async () => {
        try {
          const r = await fetch(`/api/contracts/${contractId}`, { credentials: 'include' });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          applyContract(await r.json());
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
      })();
    }
  }, [contractId]);

  const setLine = (key, patch) => setLines((prev) => prev.map((l) => (l._key === key ? { ...l, ...patch } : l)));
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l._key !== key));

  // Persist header + manual/existing lines. Returns the contract id.
  const persist = async () => {
    const payload = {
      contactId: contactId || null,
      notes: notes || null,
      lines: lines.map((l) => ({
        description: l.description || 'Service', qty: Number(l.qty) || 1,
        unitCost: Number(l.unitCost) || 0, unitProfit: Number(l.unitProfit) || 0,
        billingInterval: l.billingInterval === 'annual' ? 'annual' : 'monthly',
        source: l.source || 'manual', idyqQuoteId: l.idyqQuoteId || null,
      })),
    };
    const r = await fetch(id ? `/api/contracts/${id}` : '/api/contracts', {
      method: id ? 'PUT' : 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const c = await r.json();
    setId(c.id); setStatus(c.status);
    return c.id;
  };

  // Pull a quote: the contract must exist first (the server reads its lines and
  // creates the linked order against it), so save a draft if this is brand new.
  const pullQuote = async () => {
    if (!pickQuote) return;
    setSaving(true); setError(null); setLinkedNote(null);
    try {
      const cid = id || (await persist());
      const r = await fetch(`/api/contracts/${cid}/pull-quote`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idyqQuoteId: pickQuote }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
      const data = await r.json();
      applyContract(data);
      if (data.linkedOrder) setLinkedNote(`${data.linkedOrder.lineCount} one-off item${data.linkedOrder.lineCount === 1 ? '' : 's'} started as a separate order (in Orders).`);
      else if (data.pulled && data.pulled.recurring === 0) setLinkedNote('That quote had no monthly items to add. (Untagged lines are treated as one-off.)');
      setPickQuote('');
    } catch (e) { setError('Could not pull quote: ' + e.message); }
    finally { setSaving(false); }
  };

  const saveDraft = async () => {
    setSaving(true); setError(null);
    try { await persist(); onSaved && onSaved(); } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const doAction = async (action, needSaveFirst) => {
    setSaving(true); setError(null);
    try {
      const cid = needSaveFirst ? (id || (await persist())) : id;
      if (!cid) throw new Error('Save the contract first.');
      const r = await fetch(`/api/contracts/${cid}/${action}`, { method: 'POST', credentials: 'include' });
      if (r.status === 403) throw new Error('Manager access required.');
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
      applyContract(await r.json());
      onSaved && onSaved();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const totals = lines.reduce((acc, l) => {
    acc.cost += perMonth((Number(l.unitCost) || 0) * (Number(l.qty) || 0), l.billingInterval);
    acc.profit += perMonth((Number(l.unitProfit) || 0) * (Number(l.qty) || 0), l.billingInterval);
    return acc;
  }, { cost: 0, profit: 0 });
  const monthlyCharge = totals.cost + totals.profit;

  if (loading) return <div className="p-6 text-[13px] text-[#94a3b8]">Loading contract…</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <button onClick={() => onBack && onBack()} className="inline-flex items-center gap-1.5 text-[13px] text-[#94a3b8] hover:text-white mb-3">
        <ArrowLeft className="w-4 h-4" /> Back to contracts
      </button>

      <div className="bg-[#242438] border border-[#2e2e4a] rounded-xl p-4 md:px-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <div className="text-lg font-medium text-white flex items-center gap-2"><Repeat className="w-4 h-4 text-[#0F6E56]" /> {id ? 'Contract' : 'New contract'}</div>
            <div className="text-[13px] text-[#94a3b8]">Recurring services · all figures ex-VAT · per month</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className={`text-[12px] rounded-full px-3 py-1 capitalize self-center ${STATUS_PILL[status] || 'bg-[#242438] text-[#cbd5e1]'}`}>{status}</span>
            {editable && (
              <button onClick={saveDraft} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-[#2e2e4a] px-3 py-1.5 text-[13px] hover:bg-[#1f1f33]">
                <Save className="w-4 h-4" /> Save
              </button>
            )}
            {(status === 'draft' || status === 'paused') && (
              <button onClick={() => doAction('activate', true)} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-[#0F6E56] text-[#085041] px-3 py-1.5 text-[13px] hover:bg-[#E1F5EE]">
                <Play className="w-4 h-4" /> {status === 'paused' ? 'Resume' : 'Activate'}
              </button>
            )}
            {status === 'active' && isManager && (
              <button onClick={() => doAction('pause', false)} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-[#854F0B] text-[#854F0B] px-3 py-1.5 text-[13px] hover:bg-[#FAEEDA]">
                <Pause className="w-4 h-4" /> Pause
              </button>
            )}
            {status !== 'cancelled' && isManager && (
              <button onClick={() => { if (window.confirm('Cancel this contract? It will stop earning recurring commission.')) doAction('cancel', false); }} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-[#993C1D] text-[#993C1D] px-3 py-1.5 text-[13px] hover:bg-[#FAECE7]">
                <Ban className="w-4 h-4" /> Cancel
              </button>
            )}
          </div>
        </div>

        {/* Company + IDYQ pull */}
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#94a3b8] mb-1">Company</div>
            <select value={contactId} onChange={(e) => setContactId(e.target.value)} disabled={!editable}
              className="w-full border border-[#2e2e4a] rounded-lg px-3 py-2 text-[13px] bg-[#242438] disabled:bg-[#1f1f33]">
              <option value="">Select a company…</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {editable && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[#94a3b8] mb-1">Pull from IdoYourQuotes</div>
              <div className="flex gap-2">
                <select value={pickQuote} onChange={(e) => setPickQuote(e.target.value)} className="flex-1 border border-[#2e2e4a] rounded-lg px-3 py-2 text-[13px] bg-[#242438]">
                  <option value="">Choose a quote…</option>
                  {quotes.map((q) => <option key={q.idyqId} value={q.idyqId}>{q.quoteNumber || q.idyqId}{q.customer?.name ? ` · ${q.customer.name}` : ''}</option>)}
                </select>
                <button onClick={pullQuote} disabled={!pickQuote || saving} className="rounded-lg border border-[#3C3489] text-[#3C3489] px-3 text-[13px] disabled:opacity-40">Pull</button>
              </div>
              {pulledQuotes.length > 0 && <div className="text-[11px] text-[#3C3489] mt-1">Pulled: {pulledQuotes.join(', ')}</div>}
              {linkedNote && <div className="text-[11px] text-[#854F0B] mt-1">{linkedNote}</div>}
            </div>
          )}
        </div>

        {/* Recurring lines */}
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]" style={{ minWidth: 640 }}>
            <thead>
              <tr className="text-[#94a3b8] text-[11px] uppercase tracking-wide text-left">
                <th className="py-1.5 pr-2">Service</th>
                <th className="py-1.5 px-1 text-right w-14">Qty</th>
                <th className="py-1.5 px-1 w-28">Interval</th>
                <th className="py-1.5 px-1 text-right w-24">Unit cost</th>
                <th className="py-1.5 px-1 text-right w-24">Unit profit</th>
                <th className="py-1.5 px-1 text-right w-28">Profit / mo</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const ro = l.source === 'idyq' || !editable;
                const mp = perMonth((Number(l.unitProfit) || 0) * (Number(l.qty) || 0), l.billingInterval);
                return (
                  <tr key={l._key} className="border-t border-[#2e2e4a] align-top">
                    <td className="py-1.5 pr-2">
                      <input value={l.description} disabled={ro} onChange={(e) => setLine(l._key, { description: e.target.value })}
                        placeholder="Service" className="w-full border border-[#2e2e4a] rounded px-2 py-1 text-[12.5px] disabled:border-transparent disabled:bg-transparent disabled:px-0" />
                      {l.source === 'idyq' && <span className="inline-block mt-0.5 bg-[#EEEDFE] text-[#3C3489] rounded px-1.5 text-[9.5px] font-semibold">IDYQ</span>}
                    </td>
                    <td className="py-1.5 px-1 text-right"><input type="number" value={l.qty} disabled={ro} onChange={(e) => setLine(l._key, { qty: e.target.value })} className="w-12 text-right border border-[#2e2e4a] rounded px-1 py-1 disabled:border-transparent disabled:bg-transparent" /></td>
                    <td className="py-1.5 px-1">
                      {ro
                        ? <span className="capitalize text-[#94a3b8]">{l.billingInterval}{l.billingInterval === 'annual' ? ' ÷12' : ''}</span>
                        : <select value={l.billingInterval} onChange={(e) => setLine(l._key, { billingInterval: e.target.value })} className="border border-[#2e2e4a] rounded px-1 py-1 text-[12.5px] bg-[#242438]"><option value="monthly">monthly</option><option value="annual">annual</option></select>}
                    </td>
                    <td className="py-1.5 px-1 text-right">{ro ? money(l.unitCost) : <input type="number" value={l.unitCost} onChange={(e) => setLine(l._key, { unitCost: e.target.value })} className="w-20 text-right border border-[#2e2e4a] rounded px-1 py-1" />}</td>
                    <td className="py-1.5 px-1 text-right">{ro ? <span className="text-[#0f6e56]">{money(l.unitProfit)}</span> : <input type="number" value={l.unitProfit} onChange={(e) => setLine(l._key, { unitProfit: e.target.value })} className="w-20 text-right border border-[#2e2e4a] rounded px-1 py-1" />}</td>
                    <td className="py-1.5 px-1 text-right text-[#0f6e56]">{money(mp)}</td>
                    <td className="py-1.5">{editable && l.source !== 'idyq' && <button onClick={() => removeLine(l._key)} className="text-[#6b7280] hover:text-red-700"><Trash2 className="w-4 h-4" /></button>}</td>
                  </tr>
                );
              })}
              {lines.length === 0 && <tr className="border-t border-[#2e2e4a]"><td colSpan={7} className="py-3 text-center text-[#6b7280]">No services yet — pull a quote or add a line.</td></tr>}
              {editable && (
                <tr className="border-t border-dashed border-[#2e2e4a]">
                  <td colSpan={7} className="py-2"><button onClick={() => setLines((p) => [...p, blankLine()])} className="text-[#0F6E56] text-[13px] inline-flex items-center gap-1"><Plus className="w-4 h-4" /> Add line</button></td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#2e2e4a] font-medium">
                <td className="py-2" colSpan={3}>Totals / month</td>
                <td className="py-2 px-1 text-right">{money(totals.cost)}</td>
                <td />
                <td className="py-2 px-1 text-right text-[#0f6e56]">{money(totals.profit)}</td>
                <td />
              </tr>
              <tr><td className="text-[#94a3b8]" colSpan={3}>Monthly charge (ex-VAT)</td><td className="px-1 text-right font-medium" colSpan={4}>{money(monthlyCharge)}</td></tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-3">
          <div className="text-[11px] uppercase tracking-wide text-[#94a3b8] mb-1">Notes</div>
          <textarea value={notes} disabled={!editable} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="w-full border border-[#2e2e4a] rounded-lg px-3 py-2 text-[13px] disabled:bg-[#1f1f33]" placeholder="Optional notes for this contract" />
        </div>

        <div className="text-[12px] text-[#6b7280] mt-3 flex items-center gap-1">
          <Lock className="w-3 h-3" /> IdoYourQuotes lines are read-only — edit margins on the quote and re-pull. Monthly profit feeds recurring commission while the contract is Active.
        </div>
        {error && <div className="text-[12px] text-red-700 mt-2">{error}</div>}
      </div>
    </div>
  );
}
