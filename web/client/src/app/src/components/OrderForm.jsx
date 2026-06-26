// web/client/src/app/src/components/OrderForm.jsx
// Phase 3 — the order form (one-off job). Create/edit a draft, or view a
// submitted+ order read-only. Line economics are unit cost + unit profit
// (sell = cost + profit); manual lines are editable, IDYQ-pulled lines are
// read-only (their cost/profit come from the quote). Saves to /api/orders.
// Props: orderId (null = new), initialCompanyId, onBack(), onSaved().
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Send, Save, ExternalLink, Lock } from 'lucide-react';

const STEPS = ['draft', 'submitted', 'approved', 'ordered', 'invoiced', 'paid'];
const STEP_LABEL = { draft: 'Draft', submitted: 'Submitted', approved: 'Approved', ordered: 'Ordered', invoiced: 'Invoiced', paid: 'Paid', rejected: 'Rejected' };
const money = (n) => `£${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const blankLine = () => ({ _key: Math.random().toString(36).slice(2), description: '', qty: 1, supplierUrl: '', unitCost: 0, unitProfit: 0, source: 'manual', idyqQuoteId: null, lineType: null });

export default function OrderForm({ orderId, initialCompanyId, onBack, onSaved }) {
  const [companies, setCompanies] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [id, setId] = useState(orderId || null);
  const [status, setStatus] = useState('draft');
  const [contactId, setContactId] = useState(initialCompanyId || '');
  const [notes, setNotes] = useState('');
  const [commissionCategory, setCommissionCategory] = useState('standard');
  const [lines, setLines] = useState([]);
  const [pulledQuotes, setPulledQuotes] = useState([]);
  const [pickQuote, setPickQuote] = useState('');
  const [loading, setLoading] = useState(!!orderId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const editable = status === 'draft' || status === 'rejected';

  useEffect(() => {
    fetch('/api/contacts?type=company', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : [])).then((d) => setCompanies(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/idyq/quotes', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { quotes: [] })).then((d) => setQuotes(d.quotes || [])).catch(() => {});
    // Then re-sync from IdoYourQuotes in the background so brand-new quotes appear
    // in the picker without a manual sync (the cached list shows instantly above).
    fetch('/api/idyq/quotes?refresh=1', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && d.quotes) setQuotes(d.quotes); }).catch(() => {});
    if (orderId) {
      (async () => {
        try {
          const r = await fetch(`/api/orders/${orderId}`, { credentials: 'include' });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const o = await r.json();
          setId(o.id); setStatus(o.status); setContactId(o.contactId || ''); setNotes(o.notes || '');
          setCommissionCategory(o.commissionCategory || 'standard');
          setLines((o.lines || []).map((l) => ({ ...l, _key: l.id })));
          setPulledQuotes([...new Set((o.lines || []).filter((l) => l.idyqQuoteId).map((l) => l.idyqQuoteId))]);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
      })();
    }
  }, [orderId]);

  const setLine = (key, patch) => setLines((prev) => prev.map((l) => (l._key === key ? { ...l, ...patch } : l)));
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l._key !== key));

  const pullQuote = async () => {
    if (!pickQuote) return;
    try {
      const r = await fetch(`/api/idyq/quotes/${pickQuote}`, { credentials: 'include' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const { lineItems = [] } = await r.json();
      const added = lineItems.map((li) => {
        const qty = Number(li.qty) || 1;
        const unitCost = li.buyInCost != null ? Number(li.buyInCost) : 0;
        const unitProfit = li.profit != null ? Number(li.profit) / qty : (li.unitPrice != null ? Number(li.unitPrice) - unitCost : 0);
        return { _key: Math.random().toString(36).slice(2), description: li.description || 'Item', qty, supplierUrl: '', unitCost, unitProfit, source: 'idyq', idyqQuoteId: pickQuote, lineType: li.type || null };
      });
      setLines((prev) => [...prev, ...added]);
      setPulledQuotes((prev) => [...new Set([...prev, pickQuote])]);
      setPickQuote('');
    } catch (e) { setError('Could not pull quote: ' + e.message); }
  };

  const totals = lines.reduce((acc, l) => {
    acc.cost += (Number(l.unitCost) || 0) * (Number(l.qty) || 0);
    acc.profit += (Number(l.unitProfit) || 0) * (Number(l.qty) || 0);
    return acc;
  }, { cost: 0, profit: 0 });
  const orderValue = totals.cost + totals.profit;

  const persist = async () => {
    const payload = {
      contactId: contactId || null,
      notes: notes || null,
      commissionCategory,
      lines: lines.map((l) => ({
        description: l.description || 'Item', qty: Number(l.qty) || 1, supplierUrl: l.supplierUrl || null,
        unitCost: Number(l.unitCost) || 0, unitProfit: Number(l.unitProfit) || 0,
        source: l.source || 'manual', idyqQuoteId: l.idyqQuoteId || null, lineType: l.lineType || null,
      })),
    };
    const r = await fetch(id ? `/api/orders/${id}` : '/api/orders', {
      method: id ? 'PUT' : 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const o = await r.json();
    setId(o.id); setStatus(o.status);
    return o.id;
  };

  const saveDraft = async () => {
    setSaving(true); setError(null);
    try { await persist(); onSaved && onSaved(); } catch (e) { setError(e.message); } finally { setSaving(false); }
  };
  const submit = async () => {
    if (!contactId) { setError('Pick a company first.'); return; }
    setSaving(true); setError(null);
    try {
      const savedId = await persist();
      const r = await fetch(`/api/orders/${savedId}/submit`, { method: 'POST', credentials: 'include' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setStatus('submitted'); onSaved && onSaved();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-[13px] text-[#94a3b8]">Loading order…</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <button onClick={() => onBack && onBack()} className="inline-flex items-center gap-1.5 text-[13px] text-[#94a3b8] hover:text-white mb-3">
        <ArrowLeft className="w-4 h-4" /> Back to orders
      </button>

      <div className="bg-[#242438] border border-[#2e2e4a] rounded-xl p-4 md:px-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <div className="text-lg font-medium text-white">{id ? 'Order' : 'New order'}</div>
            <div className="text-[13px] text-[#94a3b8]">One-off job · all figures ex-VAT</div>
          </div>
          {editable && (
            <div className="flex gap-2">
              <button onClick={saveDraft} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-[#2e2e4a] px-3 py-1.5 text-[13px] hover:bg-[#1f1f33]">
                <Save className="w-4 h-4" /> Save draft
              </button>
              <button onClick={submit} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-[#378add] text-[#185fa5] px-3 py-1.5 text-[13px] hover:bg-[#e6f1fb]">
                <Send className="w-4 h-4" /> Submit for approval
              </button>
            </div>
          )}
        </div>

        {/* Status stepper */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {status === 'rejected'
            ? <span className="text-[12px] rounded-full px-3 py-1 bg-[#FAECE7] text-[#993C1D] border border-[#993C1D]">Rejected — edit and resubmit</span>
            : STEPS.map((s) => (
                <span key={s} className={`text-[12px] rounded-full px-3 py-1 border ${s === status ? 'bg-[rgba(212,160,23,0.14)] text-[#8a6a0f] border-[#f59e0b] font-medium' : 'bg-[#1f1f33] text-[#6b7280] border-[#2e2e4a]'}`}>{STEP_LABEL[s]}</span>
              ))}
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
                <button onClick={pullQuote} disabled={!pickQuote} className="rounded-lg border border-[#3C3489] text-[#3C3489] px-3 text-[13px] disabled:opacity-40">Pull</button>
              </div>
              {pulledQuotes.length > 0 && <div className="text-[11px] text-[#3C3489] mt-1">Pulled: {pulledQuotes.join(', ')}</div>}
            </div>
          )}
        </div>

        <div className="mb-3">
          <div className="text-[11px] uppercase tracking-wide text-[#94a3b8] mb-1">Commission category</div>
          <select value={commissionCategory} onChange={(e) => setCommissionCategory(e.target.value)} disabled={!editable}
            className="w-full sm:w-64 border border-[#2e2e4a] rounded-lg px-3 py-2 text-[13px] bg-[#242438] disabled:bg-[#1f1f33]">
            <option value="standard">Standard (one-off)</option>
            <option value="finance">Finance</option>
            <option value="referral">Referral</option>
          </select>
          <div className="text-[11px] text-[#6b7280] mt-1">Determines which configured commission rate applies. Rates are set per organisation in Commission rules.</div>
        </div>

        {/* Lines */}
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]" style={{ minWidth: 640 }}>
            <thead>
              <tr className="text-[#94a3b8] text-[11px] uppercase tracking-wide text-left">
                <th className="py-1.5 pr-2">Item</th>
                <th className="py-1.5 px-1 text-right w-14">Qty</th>
                <th className="py-1.5 px-1 w-28">Supplier</th>
                <th className="py-1.5 px-1 text-right w-24">Unit cost</th>
                <th className="py-1.5 px-1 text-right w-24">Unit profit</th>
                <th className="py-1.5 px-1 text-right w-24">Total profit</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const ro = l.source === 'idyq' || !editable;
                const tp = (Number(l.unitProfit) || 0) * (Number(l.qty) || 0);
                return (
                  <tr key={l._key} className="border-t border-[#2e2e4a] align-top">
                    <td className="py-1.5 pr-2">
                      <input value={l.description} disabled={ro} onChange={(e) => setLine(l._key, { description: e.target.value })}
                        placeholder="Item" className="w-full border border-[#2e2e4a] rounded px-2 py-1 text-[12.5px] disabled:border-transparent disabled:bg-transparent disabled:px-0" />
                      {l.source === 'idyq' && <span className="inline-block mt-0.5 bg-[#EEEDFE] text-[#3C3489] rounded px-1.5 text-[9.5px] font-semibold">IDYQ{l.lineType ? ` · ${l.lineType}` : ''}</span>}
                    </td>
                    <td className="py-1.5 px-1 text-right"><input type="number" value={l.qty} disabled={ro} onChange={(e) => setLine(l._key, { qty: e.target.value })} className="w-12 text-right border border-[#2e2e4a] rounded px-1 py-1 disabled:border-transparent disabled:bg-transparent" /></td>
                    <td className="py-1.5 px-1">{l.source === 'idyq' ? <span className="text-[#6b7280]">—</span> : <input value={l.supplierUrl} disabled={ro} onChange={(e) => setLine(l._key, { supplierUrl: e.target.value })} placeholder="URL" className="w-24 border border-[#2e2e4a] rounded px-1 py-1 disabled:border-transparent disabled:bg-transparent" />}</td>
                    <td className="py-1.5 px-1 text-right">{ro ? money(l.unitCost) : <input type="number" value={l.unitCost} onChange={(e) => setLine(l._key, { unitCost: e.target.value })} className="w-20 text-right border border-[#2e2e4a] rounded px-1 py-1" />}</td>
                    <td className="py-1.5 px-1 text-right">{ro ? <span className="text-[#0f6e56]">{money(l.unitProfit)}</span> : <input type="number" value={l.unitProfit} onChange={(e) => setLine(l._key, { unitProfit: e.target.value })} className="w-20 text-right border border-[#2e2e4a] rounded px-1 py-1" />}</td>
                    <td className="py-1.5 px-1 text-right text-[#0f6e56]">{money(tp)}</td>
                    <td className="py-1.5">{editable && <button onClick={() => removeLine(l._key)} className="text-[#6b7280] hover:text-red-700"><Trash2 className="w-4 h-4" /></button>}</td>
                  </tr>
                );
              })}
              {editable && (
                <tr className="border-t border-dashed border-[#2e2e4a]">
                  <td colSpan={7} className="py-2"><button onClick={() => setLines((p) => [...p, blankLine()])} className="text-[#185fa5] text-[13px] inline-flex items-center gap-1"><Plus className="w-4 h-4" /> Add line</button></td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#2e2e4a] font-medium">
                <td className="py-2" colSpan={3}>Totals</td>
                <td className="py-2 px-1 text-right">{money(totals.cost)}</td>
                <td />
                <td className="py-2 px-1 text-right text-[#0f6e56]">{money(totals.profit)}</td>
                <td />
              </tr>
              <tr><td className="text-[#94a3b8]" colSpan={3}>Order value (ex-VAT)</td><td className="px-1 text-right font-medium" colSpan={4}>{money(orderValue)}</td></tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-3">
          <div className="text-[11px] uppercase tracking-wide text-[#94a3b8] mb-1">Notes</div>
          <textarea value={notes} disabled={!editable} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="w-full border border-[#2e2e4a] rounded-lg px-3 py-2 text-[13px] disabled:bg-[#1f1f33]" placeholder="Optional notes for this order" />
        </div>

        <div className="text-[12px] text-[#6b7280] mt-3 flex items-center gap-1">
          <Lock className="w-3 h-3" /> IdoYourQuotes lines are read-only here — edit margins on the quote in IdoYourQuotes. Total profit feeds commission once the order is marked Paid.
        </div>
        {error && <div className="text-[12px] text-red-700 mt-2">{error}</div>}
      </div>
    </div>
  );
}
