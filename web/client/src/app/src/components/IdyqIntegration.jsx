import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link2, RefreshCw, Unplug, Plug, Lock, ChevronDown, ChevronRight, AlertCircle, Repeat, FilePlus } from 'lucide-react';

// ── shared styles (match the CRM look) ──────────────────────────────────────
const GOLD_BTN = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#f59e0b] text-white text-[13px] font-medium hover:bg-[#b8901a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const OUTLINE_BTN = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#2e2e4a] bg-[#242438] text-[#cbd5e1] text-[13px] font-medium hover:bg-[#1a1a2e] transition-colors disabled:opacity-50';
const INPUT_CLS = 'w-full px-3 py-2 rounded-lg border border-[#2e2e4a] text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/30 focus:border-[#f59e0b]';
const LABEL_CLS = 'block text-[12px] font-medium text-[#94a3b8] mb-1';
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
  if (!text) return <span className="text-[#6b7280]">—</span>;
  const parts = String(text).split('||').map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return <span className="text-[12px] text-[#94a3b8]">{text}</span>;
  return (
    <ul className="text-[12px] text-[#94a3b8] list-disc pl-4 space-y-0.5">
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

// ── read-only catalogue (mirrors IDYQ's fields, grouped + collapsible) ───────
export function IdyqCatalogView() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [live, setLive] = useState(true);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    return api('/catalogue')
      .then((d) => { setProducts(d.products || []); setLive(d.live !== false); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [p.name, p.description, p.category, p.unit].some((f) => (f || '').toLowerCase().includes(q));
  });

  const groups = useMemo(() => {
    const m = new Map();
    for (const p of filtered) {
      const k = p.category || 'Uncategorised';
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(p);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const toggle = (cat) => setCollapsed((c) => ({ ...c, [cat]: !c[cat] }));
  const allCollapsed = groups.length > 0 && groups.every(([c]) => collapsed[c]);
  const setAll = (val) => setCollapsed(Object.fromEntries(groups.map(([c]) => [c, val])));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={READONLY_BADGE}><Lock className="w-3 h-3" /> Read-only · IdoYourQuotes</span>
          <span className="text-[12px] text-[#6b7280]">{filtered.length} item{filtered.length === 1 ? '' : 's'} · {groups.length} categor{groups.length === 1 ? 'y' : 'ies'}</span>
          {!live && <span className="text-[12px] text-[#b45309]">showing last saved copy</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {groups.length > 0 && (
            <button type="button" className={OUTLINE_BTN} onClick={() => setAll(!allCollapsed)}>
              {allCollapsed ? 'Expand all' : 'Collapse all'}
            </button>
          )}
          <button type="button" className={OUTLINE_BTN} onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <input className={`${INPUT_CLS} max-w-xs`} placeholder="Search catalogue…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="px-4 py-8 text-center text-[13px] text-[#6b7280] border border-[#2e2e4a] rounded-xl">Loading catalogue…</div>
      ) : groups.length === 0 ? (
        <div className="px-4 py-8 text-center text-[13px] text-[#6b7280] border border-[#2e2e4a] rounded-xl">No catalogue items found.</div>
      ) : (
        <div className="space-y-3">
          {groups.map(([category, items]) => {
            const isCollapsed = !!collapsed[category];
            return (
              <div key={category} className="border border-[#2e2e4a] rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggle(category)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#1f1f33] hover:bg-[#2a2a48] transition-colors text-left"
                >
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-white">
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {category}
                    <span className="text-[11px] font-medium text-[#6b7280]">{items.length}</span>
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="overflow-x-auto border-t border-[#2e2e4a]">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#242438] border-b border-[#2e2e4a]">
                          {['Name', 'Description', 'Unit', 'Sell (ex VAT)', 'Buy-in (ex VAT)', 'Install hrs', 'Pricing', 'Active'].map((h, i) => (
                            <th key={i} className="px-4 py-2 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((p, index) => (
                          <tr key={p.id} className={`border-b border-[#2e2e4a] align-top ${index % 2 === 1 ? 'bg-[#1f1f33]' : 'bg-[#242438]'}`}>
                            <td className="px-4 py-3 text-[13px] font-medium text-white min-w-[180px]">{p.name}</td>
                            <td className="px-4 py-3 max-w-[360px]"><DescriptionCell text={p.description} /></td>
                            <td className="px-4 py-3 text-[13px] text-[#cbd5e1] whitespace-nowrap">{p.unit || '—'}</td>
                            <td className="px-4 py-3 text-[13px] text-[#cbd5e1] whitespace-nowrap">{money(p.unitPrice, p.currency)}</td>
                            <td className="px-4 py-3 text-[13px] text-[#cbd5e1] whitespace-nowrap">{money(p.costPrice, p.currency)}</td>
                            <td className="px-4 py-3 text-[13px] text-[#cbd5e1] whitespace-nowrap">{numOrDash(p.installHours)}</td>
                            <td className="px-4 py-3 text-[13px] text-[#cbd5e1] capitalize whitespace-nowrap">{p.pricingType || '—'}</td>
                            <td className="px-4 py-3 whitespace-nowrap"><span className={`text-[12px] font-medium ${p.active ? 'text-[#059669]' : 'text-[#6b7280]'}`}>{p.active ? 'Active' : 'Inactive'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── read-only quotes ─────────────────────────────────────────────────────────
const statusStyle = (s) => {
  const map = {
    draft: 'bg-[#1f1f33] text-[#94a3b8]',
    sent: 'bg-[#dbeafe] text-[#2563eb]',
    accepted: 'bg-[#dcfce7] text-[#16a34a]',
    declined: 'bg-red-50 text-red-600',
    expired: 'bg-[#fef3c7] text-[#b45309]',
  };
  return map[(s || '').toLowerCase()] || 'bg-[#1f1f33] text-[#94a3b8]';
};

function QuoteRow({ quote, onOrderCreated }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [actMsg, setActMsg] = useState(null);

  // "Act on this quote" — create a recurring Contract or a one-off Order from it.
  // Both create a draft then pull this quote server-side (contact + lines come
  // across from the quote; the contract pull also spins one-off lines into an order).
  const createFromQuote = async (kind) => {
    setActing(true); setActMsg(null);
    const base = kind === 'contract' ? '/api/contracts' : '/api/orders';
    try {
      const cr = await fetch(base, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!cr.ok) throw new Error('Could not create.');
      const created = await cr.json();
      const pr = await fetch(`${base}/${created.id}/pull-quote`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idyqQuoteId: quote.idyqId }),
      });
      const pulled = await pr.json().catch(() => ({}));
      if (!pr.ok) throw new Error(pulled.error || 'Could not pull the quote.');
      if (kind === 'contract') {
        let m = 'Draft contract created — open Contracts to review and activate.';
        if (pulled.linkedOrder) m += ` ${pulled.linkedOrder.lineCount} one-off item${pulled.linkedOrder.lineCount === 1 ? '' : 's'} also started as an order.`;
        setActMsg({ ok: true, text: m });
      } else {
        // If the host gave us a jump-to-order handler (the Sales › Quotes tab),
        // hand off the new order id so the app switches to the Orders tab and
        // opens this order for review. Otherwise (e.g. the CRM settings quotes
        // view) fall back to the old "go look at Orders" message.
        if (onOrderCreated) {
          onOrderCreated(created.id);
          return; // this row is about to unmount as the view switches
        }
        setActMsg({ ok: true, text: 'Draft order created — open Orders to review.' });
      }
    } catch (e) {
      setActMsg({ ok: false, text: e.message || 'Could not act on this quote.' });
    } finally { setActing(false); }
  };

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
      <tr className="border-b border-[#2e2e4a] bg-[#242438] hover:bg-[rgba(245,158,11,0.08)] cursor-pointer" onClick={toggle}>
        <td className="px-4 py-3 text-[13px] font-medium text-white whitespace-nowrap">
          <span className="inline-flex items-center gap-1">{open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}{quote.quoteNumber || `#${quote.idyqId}`}</span>
        </td>
        <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${statusStyle(quote.status)}`}>{quote.status || '—'}</span></td>
        <td className="px-4 py-3 text-[13px] text-[#cbd5e1]">
          <div>{quote.customer?.company || quote.customer?.name || '—'}</div>
          {quote.customer?.email && <div className="text-[11px] text-[#6b7280]">{quote.customer.email}</div>}
        </td>
        <td className="px-4 py-3 text-[13px] text-[#cbd5e1] whitespace-nowrap">{money(quote.total, quote.currency)}</td>
        <td className="px-4 py-3 text-[13px] text-[#94a3b8] whitespace-nowrap">{dateShort(quote.sourceUpdatedAt)}</td>
      </tr>
      {open && (
        <tr className="bg-[#1f1f33] border-b border-[#2e2e4a]">
          <td colSpan={5} className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-[12px] font-medium text-[#cbd5e1]">Act on this quote:</span>
              <button onClick={() => createFromQuote('contract')} disabled={acting}
                className="inline-flex items-center gap-1 rounded-lg border border-[#0F6E56] text-[#085041] px-2.5 py-1 text-[12px] hover:bg-[#E1F5EE] disabled:opacity-50">
                <Repeat className="w-3.5 h-3.5" /> Create contract
              </button>
              <button onClick={() => createFromQuote('order')} disabled={acting}
                className="inline-flex items-center gap-1 rounded-lg border border-[#f59e0b] text-[#8a6a0f] px-2.5 py-1 text-[12px] hover:bg-[rgba(212,160,23,0.08)] disabled:opacity-50">
                <FilePlus className="w-3.5 h-3.5" /> Create order
              </button>
              {acting && <span className="text-[12px] text-[#6b7280]">Working…</span>}
              {actMsg && <span className={`text-[12px] ${actMsg.ok ? 'text-[#0f6e56]' : 'text-red-700'}`}>{actMsg.text}</span>}
            </div>
            {loading ? (
              <p className="text-[12px] text-[#6b7280]">Loading line items…</p>
            ) : (
              <div className="border border-[#2e2e4a] rounded-lg overflow-hidden bg-[#242438]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#1f1f33] border-b border-[#2e2e4a]">
                      {['Description', 'Qty', 'Unit price', 'Line total'].map((h, i) => (
                        <th key={i} className={`px-3 py-2 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(detail?.lineItems || []).length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-3 text-center text-[12px] text-[#6b7280]">No line items.</td></tr>
                    ) : detail.lineItems.map((l) => (
                      <tr key={l.id} className="border-b border-[#2e2e4a]">
                        <td className="px-3 py-2 text-[12px] text-[#cbd5e1]">{l.description || '—'}</td>
                        <td className="px-3 py-2 text-[12px] text-[#cbd5e1] text-right">{numOrDash(l.qty)}</td>
                        <td className="px-3 py-2 text-[12px] text-[#cbd5e1] text-right">{money(l.unitPrice, quote.currency)}</td>
                        <td className="px-3 py-2 text-[12px] text-[#cbd5e1] text-right">{money(l.lineTotal, quote.currency)}</td>
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

export function IdyqQuotesView({ onOrderCreated } = {}) {
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
          <span className="text-[12px] text-[#6b7280]">{filtered.length} quote{filtered.length === 1 ? '' : 's'}</span>
        </div>
        <input className={`${INPUT_CLS} max-w-xs`} placeholder="Search quotes…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="border border-[#2e2e4a] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#1f1f33] border-b border-[#2e2e4a]">
              {['Quote', 'Status', 'Customer', 'Total', 'Updated'].map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[13px] text-[#6b7280]">Loading quotes…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[13px] text-[#6b7280]">No quotes found.</td></tr>
            ) : filtered.map((q) => <QuoteRow key={q.idyqId} quote={q} onOrderCreated={onOrderCreated} />)}
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
    <div className="border border-[#2e2e4a] rounded-xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#eef2ff] flex items-center justify-center flex-shrink-0"><Link2 className="w-5 h-5 text-[#4f46e5]" /></div>
        <div className="flex-1">
          <h4 className="text-[14px] font-semibold text-white">IdoYourQuotes integration</h4>
          <p className="text-[13px] text-[#94a3b8] mt-0.5">
            When connected, your Product Catalog and Quotes tabs show live, read-only data from IdoYourQuotes, and editing those here is switched off. Everything else in WorkTrackr is unaffected.
          </p>
        </div>
        {!loading && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold ${connected ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#1f1f33] text-[#94a3b8]'}`}>
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
            <div><span className="text-[#6b7280]">Organisation</span><div className="text-white font-medium">{conn?.idyqOrgRef || '—'}</div></div>
            <div><span className="text-[#6b7280]">Catalogue synced</span><div className="text-white font-medium">{conn?.lastCatalogueSyncAt ? new Date(conn.lastCatalogueSyncAt).toLocaleString('en-GB') : 'never'}</div></div>
            <div><span className="text-[#6b7280]">Quotes synced</span><div className="text-white font-medium">{conn?.lastQuotesSyncAt ? new Date(conn.lastQuotesSyncAt).toLocaleString('en-GB') : 'never'}</div></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={OUTLINE_BTN} disabled={busy} onClick={syncCatalogue}><RefreshCw className="w-4 h-4" /> Sync catalogue</button>
            <button type="button" className={OUTLINE_BTN} disabled={busy} onClick={syncQuotes}><RefreshCw className="w-4 h-4" /> Sync quotes</button>
            <button type="button" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 bg-[#242438] text-red-600 text-[13px] font-medium hover:bg-red-50 transition-colors disabled:opacity-50" disabled={busy} onClick={disconnect}>
              <Unplug className="w-4 h-4" /> Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
