import React, { useState, useEffect, useCallback } from 'react';
import { Link2, RefreshCw, Unplug, Plug, Lock, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';

// ── shared styles (match the CRM look) ──────────────────────────────────────
const GOLD_BTN = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#d4a017] text-white text-[13px] font-medium hover:bg-[#b8901a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const OUTLINE_BTN = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#e5e7eb] bg-white text-[#374151] text-[13px] font-medium hover:bg-[#f9fafb] transition-colors disabled:opacity-50';
const INPUT_CLS = 'w-full px-3 py-2 rounded-lg border border-[#e5e7eb] text-[13px] text-[#111113] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017]';
const LABEL_CLS = 'block text-[12px] font-medium text-[#6b7280] mb-1';
const READONLY_BADGE = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#eef2ff] text-[#4f46e5]';

const api = (path, opts = {}) =>
  fetch(`/api/idyq${path}`, { credentials: 'include', ...opts }).then(async (r) => {
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || body.details || `Request failed (${r.status})`);
    return body;
  });

const money = (v, currency = 'GBP') => {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  const symbol = currency === 'GBP' ? '£' : `${currency} `;
  return `${symbol}${n.toFixed(2)}`;
};
const numOrDash = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isNaN(n) ? '—' : String(n);
};
const dateShort = (v) => (v ? new Date(v).toLocaleDateString('en-GB') : '—');

// Render IDYQ's "a || b || c" descriptions as readable lines.
const DescriptionCell = ({ text }) => {
  if (!text) return <span className="text-[#9ca3af]">—</span>;
  const parts = String(text).split('||').map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return <span className="text-[12px] text-[#6b7280]">{text}</span>;
  return (
    <ul className="text-[12px] text-[#6b7280] list-disc pl-4 space-y-0.5">
      {parts.map((p, i) => <li key={i}>{p}</li>)}
    </ul>
  );
};

// ── connection hook ──────────────────────────────────────────────────────────
export function useIdyqConnection() {
  const [conn, setConn] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api('/connection');
      setConn(data);
    } catch {
      setConn({ enabled: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { connected: !!conn?.enabled, conn, loading, refresh };
}

// ── read-only catalogue (mirrors IDYQ's fields) ──────────────────────────────
export function IdyqCatalogView() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api('/catalogue?limit=500')
      .then((d) => { if (alive) { setProducts(d.products || []); setError(null); } })
      .catch((e) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filtered = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [p.name, p.description, p.category, p.unit].some((f) => (f || '').toLowerCase().includes(q));
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={READONLY_BADGE}><Lock className="w-3 h-3" /> Read-only · IdoYourQuotes</span>
          <span className="text-[12px] text-[#9ca3af]">{filtered.length} item{filtered.length === 1 ? '' : 's'}</span>
        </div>
        <input className={`${INPUT_CLS} max-w-xs`} placeholder="Search catalogue…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="border border-[#e5e7eb] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#fafafa] border-b border-[#e5e7eb]">
              {['Name', 'Description', 'Category', 'Unit', 'Sell (ex VAT)', 'Buy-in (ex VAT)', 'Install hrs', 'Pricing', 'Active'].map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[13px] text-[#9ca3af]">Loading catalogue…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[13px] text-[#9ca3af]">No catalogue items found.</td></tr>
            ) : filtered.map((p, index) => (
              <tr key={p.id} className={`border-b border-[#f3f4f6] align-top ${index % 2 === 1 ? 'bg-[#fafbfc]' : 'bg-white'}`}>
                <td className="px-4 py-3 text-[13px] font-medium text-[#111113] min-w-[180px]">{p.name}</td>
                <td className="px-4 py-3 max-w-[360px]"><DescriptionCell text={p.description} /></td>
                <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#f3f4f6] text-[#6b7280] whitespace-nowrap">{p.category || '—'}</span></td>
                <td className="px-4 py-3 text-[13px] text-[#374151] whitespace-nowrap">{p.unit || '—'}</td>
                <td className="px-4 py-3 text-[13px] text-[#374151] whitespace-nowrap">{money(p.unitPrice, p.currency)}</td>
                <td className="px-4 py-3 text-[13px] text-[#374151] whitespace-nowrap">{money(p.costPrice, p.currency)}</td>
                <td className="px-4 py-3 text-[13px] text-[#374151] whitespace-nowrap">{numOrDash(p.installHours)}</td>
                <td className="px-4 py-3 text-[13px] text-[#374151] capitalize whitespace-nowrap">{p.pricingType || '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-[12px] font-medium ${p.active ? 'text-[#059669]' : 'text-[#9ca3af]'}`}>{p.active ? 'Active' : 'Inactive'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── read-only quotes ─────────────────────────────────────────────────────────
const statusStyle = (s) => {
  const map = {
    draft: 'bg-[#f3f4f6] text-[#6b7280]',
    sent: 'bg-[#dbeafe] text-[#2563eb]',
    accepted: 'bg-[#dcfce7] text-[#16a34a]',
    declined: 'bg-red-50 text-red-600',
    expired: 'bg-[#fef3c7] text-[#b45309]',
  };
  return map[(s || '').toLowerCase()] || 'bg-[#f3f4f6] text-[#6b7280]';
};

function QuoteRow({ quote }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !detail) {
      setLoading(true);
      try { setDetail(await api(`/quotes/${encodeURIComponent(quote.idyqId)}`)); }
      catch { setDetail({ lineItems: [] }); }
      finally { setLoading(false); }
    }
  };

  return (
    <>
      <tr className="border-b border-[#f3f4f6] bg-white hover:bg-[#fef9ee] cursor-pointer" onClick={toggle}>
        <td className="px-4 py-3 text-[13px] font-medium text-[#111113] whitespace-nowrap">
          <span className="inline-flex items-center gap-1">{open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}{quote.quoteNumber || `#${quote.idyqId}`}</span>
        </td>
        <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${statusStyle(quote.status)}`}>{quote.status || '—'}</span></td>
        <td className="px-4 py-3 text-[13px] text-[#374151]">
          <div>{quote.customer?.company || quote.customer?.name || '—'}</div>
          {quote.customer?.email && <div className="text-[11px] text-[#9ca3af]">{quote.customer.email}</div>}
        </td>
        <td className="px-4 py-3 text-[13px] text-[#374151] whitespace-nowrap">{money(quote.total, quote.currency)}</td>
        <td className="px-4 py-3 text-[13px] text-[#6b7280] whitespace-nowrap">{dateShort(quote.sourceUpdatedAt)}</td>
      </tr>
      {open && (
        <tr className="bg-[#fafbfc] border-b border-[#f3f4f6]">
          <td colSpan={5} className="px-4 py-3">
            {loading ? (
              <p className="text-[12px] text-[#9ca3af]">Loading line items…</p>
            ) : (
              <div className="border border-[#e5e7eb] rounded-lg overflow-hidden bg-white">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#fafafa] border-b border-[#e5e7eb]">
                      {['Description', 'Qty', 'Unit price', 'Line total'].map((h, i) => (
                        <th key={i} className={`px-3 py-2 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(detail?.lineItems || []).length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-3 text-center text-[12px] text-[#9ca3af]">No line items.</td></tr>
                    ) : detail.lineItems.map((l) => (
                      <tr key={l.id} className="border-b border-[#f3f4f6]">
                        <td className="px-3 py-2 text-[12px] text-[#374151]">{l.description || '—'}</td>
                        <td className="px-3 py-2 text-[12px] text-[#374151] text-right">{numOrDash(l.qty)}</td>
                        <td className="px-3 py-2 text-[12px] text-[#374151] text-right">{money(l.unitPrice, quote.currency)}</td>
                        <td className="px-3 py-2 text-[12px] text-[#374151] text-right">{money(l.lineTotal, quote.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function IdyqQuotesView() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api('/quotes?limit=500')
      .then((d) => { if (alive) { setQuotes(d.quotes || []); setError(null); } })
      .catch((e) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filtered = quotes.filter((q) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return [q.quoteNumber, q.status, q.customer?.name, q.customer?.company].some((f) => (f || '').toLowerCase().includes(term));
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={READONLY_BADGE}><Lock className="w-3 h-3" /> Read-only · IdoYourQuotes</span>
          <span className="text-[12px] text-[#9ca3af]">{filtered.length} quote{filtered.length === 1 ? '' : 's'}</span>
        </div>
        <input className={`${INPUT_CLS} max-w-xs`} placeholder="Search quotes…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="border border-[#e5e7eb] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#fafafa] border-b border-[#e5e7eb]">
              {['Quote', 'Status', 'Customer', 'Total', 'Updated'].map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[13px] text-[#9ca3af]">Loading quotes…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[13px] text-[#9ca3af]">No quotes found.</td></tr>
            ) : filtered.map((q) => <QuoteRow key={q.idyqId} quote={q} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── connect / disconnect / sync panel (CRM Settings) ─────────────────────────
export function IdyqConnectionPanel({ onChanged }) {
  const { conn, connected, loading, refresh } = useIdyqConnection();
  const [orgRef, setOrgRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => { if (conn?.idyqOrgRef) setOrgRef(conn.idyqOrgRef); }, [conn]);

  const run = async (fn, okMsg) => {
    setBusy(true); setErr(null); setMsg(null);
    try { const r = await fn(); await refresh(); onChanged && onChanged(); if (okMsg) setMsg(typeof okMsg === 'function' ? okMsg(r) : okMsg); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const connect = () => run(
    () => api('/connection/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idyqOrgRef: orgRef.trim() }) }),
    (r) => `Connected. First sync: ${r.firstSync?.catalogue ?? 0} products, ${r.firstSync?.quotes ?? 0} quotes.`
  );
  const disconnect = () => run(() => api('/connection/disconnect', { method: 'POST' }), 'Disconnected. Your own catalogue and quotes are back.');
  const syncCatalogue = () => run(() => api('/sync/catalogue', { method: 'POST' }), (r) => `Synced ${r.count} catalogue items.`);
  const syncQuotes = () => run(() => api('/sync/quotes', { method: 'POST' }), (r) => `Synced ${r.count} quotes.`);

  return (
    <div className="border border-[#e5e7eb] rounded-xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#eef2ff] flex items-center justify-center flex-shrink-0"><Link2 className="w-5 h-5 text-[#4f46e5]" /></div>
        <div className="flex-1">
          <h4 className="text-[14px] font-semibold text-[#111113]">IdoYourQuotes integration</h4>
          <p className="text-[13px] text-[#6b7280] mt-0.5">
            When connected, your Product Catalog and Quotes tabs show live, read-only data from IdoYourQuotes, and editing those here is switched off. Everything else in WorkTrackr is unaffected.
          </p>
        </div>
        {!loading && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold ${connected ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#f3f4f6] text-[#6b7280]'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#16a34a]' : 'bg-[#9ca3af]'}`} />
            {connected ? 'Connected' : 'Not connected'}
          </span>
        )}
      </div>

      {msg && <div className="p-3 rounded-lg bg-[#dcfce7] border border-[#bbf7d0] text-[13px] text-[#166534]">{msg}</div>}
      {err && <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700"><AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{err}</div>}

      {!connected ? (
        <div className="space-y-3">
          <div className="max-w-sm">
            <label className={LABEL_CLS}>Your IdoYourQuotes organisation (slug or id)</label>
            <input className={INPUT_CLS} placeholder="e.g. sweetbyte-ltd-mo5yzrt7" value={orgRef} onChange={(e) => setOrgRef(e.target.value)} />
          </div>
          <button type="button" className={GOLD_BTN} disabled={busy || !orgRef.trim()} onClick={connect}>
            <Plug className="w-4 h-4" /> {busy ? 'Connecting…' : 'Connect IdoYourQuotes'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px]">
            <div><span className="text-[#9ca3af]">Organisation</span><div className="text-[#111113] font-medium">{conn?.idyqOrgRef || '—'}</div></div>
            <div><span className="text-[#9ca3af]">Catalogue synced</span><div className="text-[#111113] font-medium">{conn?.lastCatalogueSyncAt ? new Date(conn.lastCatalogueSyncAt).toLocaleString('en-GB') : 'never'}</div></div>
            <div><span className="text-[#9ca3af]">Quotes synced</span><div className="text-[#111113] font-medium">{conn?.lastQuotesSyncAt ? new Date(conn.lastQuotesSyncAt).toLocaleString('en-GB') : 'never'}</div></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={OUTLINE_BTN} disabled={busy} onClick={syncCatalogue}><RefreshCw className="w-4 h-4" /> Sync catalogue</button>
            <button type="button" className={OUTLINE_BTN} disabled={busy} onClick={syncQuotes}><RefreshCw className="w-4 h-4" /> Sync quotes</button>
            <button type="button" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 bg-white text-red-600 text-[13px] font-medium hover:bg-red-50 transition-colors disabled:opacity-50" disabled={busy} onClick={disconnect}>
              <Unplug className="w-4 h-4" /> Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
