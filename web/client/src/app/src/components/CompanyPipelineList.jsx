// web/client/src/app/src/components/CompanyPipelineList.jsx
// Sales › Companies. The salesperson's home: companies by sales stage.
// Reads live data from GET /api/contacts?type=company (cookie auth). Sales stage
// lives in contact.crm.salesStage (new|prospect|hot_prospect|customer); account
// manager in contact.crm.assignedTo.
//
// v3.6 — rebuilt to Manus's DARK design (Concept-3 "Relationship Hub"):
//   • PIPELINE view (default): four stage columns (Suspect/Prospect/Hot prospect/
//     Customer) of cards. Each card: company name, owner avatar + name, coloured
//     source pill, "x ago" activity time, a ⋯ menu (Open / Move stage) and a
//     per-column "+ Add company".
//   • LIST view: a dark table carrying telephone, email, contact, next action +
//     chase date (overdue in red) and monthly value.
//   • A List/Pipeline toggle, search, an "All sources" dropdown filter, and
//     Add company — all to the drawing.
//
// EVERYTHING from the old light list is preserved: load, search, stage filtering
// (now the columns + a list-view filter), CSV Import, Add company, row → open
// profile, monthly value, next action, loading/error/empty states. Stage moves
// from the ⋯ menu re-send the FULL existing crm object (the contacts PUT replaces
// crm wholesale) so no other field is lost.
//
// Props (unchanged): onOpenCompany(id), onAddCompany().
import React, { useEffect, useMemo, useState } from 'react';
import { Upload, MoreHorizontal, Clock, List, Columns3, Phone, Mail, ChevronDown } from 'lucide-react';
import CsvImport from './CsvImport.jsx';
import SalesPageLayout, {
  SalesSearch, SalesPrimaryButton, SalesSecondaryButton,
} from './SalesPageLayout.jsx';

// stage ladder — value `new` is shown as "Suspect" (the approved rename)
const STAGES = [
  { key: 'new',          label: 'Suspect',      pill: 'bg-[rgba(107,114,128,0.20)] text-[#cbd5e1]', dot: '#6b7280' },
  { key: 'prospect',     label: 'Prospect',     pill: 'bg-[rgba(59,130,246,0.20)] text-[#93c5fd]',  dot: '#3b82f6' },
  { key: 'hot_prospect', label: 'Hot prospect', pill: 'bg-[rgba(245,158,11,0.20)] text-[#fcd34d]',  dot: '#f59e0b' },
  { key: 'customer',     label: 'Customer',     pill: 'bg-[rgba(16,185,129,0.20)] text-[#6ee7b7]',  dot: '#10b981' },
];
const STAGE_BY_KEY = Object.fromEntries(STAGES.map((s) => [s.key, s]));

// source → pill colour (dark, translucent). Unknown sources fall back to grey.
const SOURCE_PILL = {
  'telesales':       'bg-[rgba(245,158,11,0.18)] text-[#fcd34d]',
  'door knocking':   'bg-[rgba(139,92,246,0.18)] text-[#c4b5fd]',
  'e-shot':          'bg-[rgba(59,130,246,0.18)] text-[#93c5fd]',
  'email campaign':  'bg-[rgba(59,130,246,0.18)] text-[#93c5fd]',
  'social media':    'bg-[rgba(6,182,212,0.18)] text-[#67e8f9]',
  'website':         'bg-[rgba(16,185,129,0.18)] text-[#6ee7b7]',
  'referral':        'bg-[rgba(16,185,129,0.18)] text-[#6ee7b7]',
  'event':           'bg-[rgba(236,72,153,0.18)] text-[#f9a8d4]',
};
const sourcePill = (s) => SOURCE_PILL[String(s || '').toLowerCase()] || 'bg-[rgba(107,114,128,0.18)] text-[#cbd5e1]';

// deterministic avatar colour from a name
const AVATARS = ['#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#06b6d4'];
const avatarColor = (name) => {
  const s = String(name || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATARS[h % AVATARS.length];
};
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const money = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? `£${n.toLocaleString()}/mo` : '—';
};

// "x ago" from a timestamp (falls back to created)
function timeAgo(iso) {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '—';
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const w = Math.floor(days / 7);
  if (w < 5) return w === 1 ? '1 week ago' : `${w} weeks ago`;
  const m = Math.floor(days / 30);
  if (m < 12) return m === 1 ? '1 month ago' : `${m} months ago`;
  const y = Math.floor(days / 365);
  return y === 1 ? '1 year ago' : `${y} years ago`;
}

// next action: prefer the v3.5 dated fields, fall back to the older event string
function nextActionOf(co) {
  const crm = co?.crm || {};
  const text = crm.nextAction || crm.nextCRMEvent || '';
  const chase = crm.chaseDate || null;
  let overdue = false;
  if (chase) {
    const d = new Date(chase); d.setHours(23, 59, 59, 999);
    overdue = d.getTime() < Date.now();
  }
  return { text, chase, overdue };
}
const ukDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '');

// ── card ⋯ menu (Open + safe stage move) ─────────────────────────────────────
function CardMenu({ co, onOpen, onMove, onClose }) {
  const cur = co?.crm?.salesStage;
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); onClose(); }} />
      <div
        className="absolute right-2 top-9 z-20 w-44 rounded-lg border border-[#2e2e4a] bg-[#242438] py-1 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="w-full text-left px-3 py-1.5 text-[13px] text-white hover:bg-[#2a2a48]"
          onClick={(e) => { e.stopPropagation(); onClose(); onOpen(); }}
        >
          Open company
        </button>
        <div className="my-1 border-t border-[#2e2e4a]" />
        <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-[#6b7280]">Move to</div>
        {STAGES.filter((s) => s.key !== cur).map((s) => (
          <button
            key={s.key}
            className="w-full text-left px-3 py-1.5 text-[13px] text-[#cbd5e1] hover:bg-[#2a2a48] flex items-center gap-2"
            onClick={(e) => { e.stopPropagation(); onClose(); onMove(s.key); }}
          >
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: s.dot }} />
            {s.label}
          </button>
        ))}
      </div>
    </>
  );
}

// ── a single pipeline card ───────────────────────────────────────────────────
function PipelineCard({ co, isCustomer, menuOpen, onMenu, onOpen, onMove, onCloseMenu }) {
  const owner = co?.crm?.assignedTo;
  return (
    <div
      onClick={() => onOpen(co.id)}
      className="relative cursor-pointer rounded-lg border border-[#2e2e4a] bg-[#242438] hover:bg-[#2a2a48] p-3.5 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[15px] font-semibold text-white truncate">{co.name}</div>
        <button
          aria-label="Card menu"
          onClick={(e) => { e.stopPropagation(); onMenu(menuOpen ? null : co.id); }}
          className="shrink-0 -mr-1 -mt-1 p-1 rounded text-[#94a3b8] hover:text-white hover:bg-[#33334f]"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {owner && (
        <div className="mt-2 flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold text-white"
            style={{ background: avatarColor(owner) }}
          >
            {initials(owner)}
          </span>
          <span className="text-[13px] text-[#cbd5e1] truncate">{owner}</span>
        </div>
      )}

      {co?.crm?.source && (
        <div className="mt-2.5">
          <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] ${sourcePill(co.crm.source)}`}>
            {co.crm.source}
          </span>
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-1.5 text-[12px] text-[#6b7280]">
        <Clock className="w-3.5 h-3.5" />
        {isCustomer ? `Active ${timeAgo(co.updatedAt)}` : timeAgo(co.updatedAt)}
      </div>

      {menuOpen && <CardMenu co={co} onOpen={() => onOpen(co.id)} onMove={(k) => onMove(co, k)} onClose={onCloseMenu} />}
    </div>
  );
}

export default function CompanyPipelineList({ onOpenCompany, onAddCompany }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeStage, setActiveStage] = useState(null); // list-view stage filter (null = all)
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [viewMode, setViewMode] = useState('pipeline'); // 'pipeline' | 'list'
  const [showImport, setShowImport] = useState(false);
  const [reload, setReload] = useState(0);
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch('/api/contacts?type=company', { credentials: 'include' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (alive) setCompanies(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) setError(e.message || 'Failed to load companies');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [reload]);

  // distinct sources present, for the "All sources" dropdown
  const sources = useMemo(() => {
    const set = new Set();
    for (const co of companies) { const s = co?.crm?.source; if (s) set.add(s); }
    return Array.from(set).sort();
  }, [companies]);

  // search + source filter (applies to both views); stage filter applies in list view
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((co) => {
      if (sourceFilter !== 'all' && String(co?.crm?.source || '') !== sourceFilter) return false;
      if (!q) return true;
      const hay = [co.name, co?.crm?.assignedTo, co.primaryContact, co.email, co.phone]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [companies, search, sourceFilter]);

  const listVisible = useMemo(
    () => (activeStage ? filtered.filter((co) => co?.crm?.salesStage === activeStage) : filtered),
    [filtered, activeStage]
  );

  const counts = useMemo(() => {
    const c = {};
    for (const co of filtered) { const k = co?.crm?.salesStage; if (k) c[k] = (c[k] || 0) + 1; }
    return c;
  }, [filtered]);

  // move stage safely: re-send the WHOLE crm object with only salesStage changed
  const moveStage = async (co, newKey) => {
    try {
      const nextCrm = { ...(co.crm || {}), salesStage: newKey };
      const r = await fetch(`/api/contacts/${co.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ crm: nextCrm }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setReload((n) => n + 1);
    } catch (e) {
      setError(e.message || 'Failed to move company');
    }
  };

  if (showImport) {
    return <CsvImport onBack={() => setShowImport(false)} onDone={() => setReload((n) => n + 1)} />;
  }

  const actions = (
    <>
      <SalesSearch dark value={search} onChange={setSearch} placeholder="Search companies…" />
      <div className="relative">
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="h-9 appearance-none rounded-lg border border-[#2e2e4a] bg-[#242438] text-white text-[13px] pl-3 pr-8 outline-none"
        >
          <option value="all">All sources</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <ChevronDown className="w-4 h-4 text-[#6b7280] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
      <SalesSecondaryButton dark icon={Upload} onClick={() => setShowImport(true)}>Import</SalesSecondaryButton>
      <SalesPrimaryButton dark onClick={() => onAddCompany && onAddCompany()}>Add company</SalesPrimaryButton>
    </>
  );

  // toggle + (list view only) stage filter pills
  const Toggle = (
    <div className="inline-flex rounded-lg border border-[#2e2e4a] bg-[#242438] p-0.5">
      <button
        onClick={() => setViewMode('list')}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] ${
          viewMode === 'list' ? 'bg-[rgba(245,158,11,0.15)] text-[#fcd34d]' : 'text-[#94a3b8] hover:text-white'
        }`}
      >
        <List className="w-4 h-4" /> List view
      </button>
      <button
        onClick={() => setViewMode('pipeline')}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] ${
          viewMode === 'pipeline' ? 'bg-[rgba(245,158,11,0.15)] text-[#fcd34d]' : 'text-[#94a3b8] hover:text-white'
        }`}
      >
        <Columns3 className="w-4 h-4" /> Pipeline view
      </button>
    </div>
  );

  const filters = (
    <>
      {Toggle}
      {viewMode === 'list' && (
        <>
          <span className="mx-1 h-5 w-px bg-[#2e2e4a]" />
          <button
            onClick={() => setActiveStage(null)}
            className={`rounded-full px-3 py-1.5 text-[13px] border ${
              activeStage === null ? 'border-[#f59e0b] bg-[rgba(245,158,11,0.15)] text-[#fcd34d]' : 'border-transparent bg-[#242438] text-[#94a3b8]'
            }`}
          >
            All <span className="opacity-60">{filtered.length}</span>
          </button>
          {STAGES.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveStage(activeStage === s.key ? null : s.key)}
              className={`rounded-full px-3 py-1.5 text-[13px] ${s.pill} ${activeStage === s.key ? 'outline outline-2 outline-[#f59e0b]' : ''}`}
            >
              {s.label} <span className="opacity-60">{counts[s.key] || 0}</span>
            </button>
          ))}
        </>
      )}
    </>
  );

  const subtitle = `Your pipeline · ${companies.length} ${companies.length === 1 ? 'company' : 'companies'}`;

  // ── PIPELINE (kanban) ──────────────────────────────────────────────────────
  const pipeline = (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {STAGES.map((s) => {
        const cards = filtered.filter((co) => co?.crm?.salesStage === s.key);
        return (
          <div key={s.key} className="rounded-xl border border-[#2e2e4a] bg-[rgba(36,36,56,0.45)] p-3">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] uppercase tracking-wide ${s.pill}`}>{s.label}</span>
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-[#1a1a2e] text-[12px] text-[#94a3b8] px-1.5">
                {cards.length}
              </span>
            </div>
            <div className="space-y-3">
              {cards.map((co) => (
                <PipelineCard
                  key={co.id}
                  co={co}
                  isCustomer={s.key === 'customer'}
                  menuOpen={menuOpen === co.id}
                  onMenu={setMenuOpen}
                  onCloseMenu={() => setMenuOpen(null)}
                  onOpen={(id) => onOpenCompany && onOpenCompany(id)}
                  onMove={moveStage}
                />
              ))}
              <button
                onClick={() => onAddCompany && onAddCompany()}
                className="w-full rounded-lg border border-dashed border-[#33334f] text-[#6b7280] hover:text-[#94a3b8] hover:border-[#454567] text-[13px] py-3"
              >
                + Add company
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── LIST (table) ───────────────────────────────────────────────────────────
  const LIST_GRID = 'grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,0.9fr)] gap-3';
  const list = (
    <>
      <div className={`${LIST_GRID} px-4 py-2.5 bg-[#1f1f33] text-[11px] uppercase tracking-wide text-[#6b7280]`}>
        <div>Company</div><div>Telephone</div><div>Email</div><div>Contact</div><div>Next action</div>
        <div className="text-right">Monthly value</div>
      </div>
      {loading && <div className="px-4 py-8 text-center text-[13px] text-[#94a3b8]">Loading companies…</div>}
      {error && !loading && <div className="px-4 py-8 text-center text-[13px] text-[#fca5a5]">Couldn’t load companies: {error}</div>}
      {!loading && !error && listVisible.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px] text-[#94a3b8]">
          No companies {activeStage ? `at stage “${STAGE_BY_KEY[activeStage]?.label}”` : 'yet'}. Add your first one to start the pipeline.
        </div>
      )}
      {!loading && !error && listVisible.map((co) => {
        const na = nextActionOf(co);
        const owner = co?.crm?.assignedTo;
        return (
          <button
            key={co.id}
            onClick={() => onOpenCompany && onOpenCompany(co.id)}
            className={`w-full text-left ${LIST_GRID} items-center px-4 py-3 border-t border-[#2e2e4a] hover:bg-[#2a2a48]`}
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{co.name}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] ${STAGE_BY_KEY[co?.crm?.salesStage]?.pill || 'bg-[rgba(107,114,128,0.20)] text-[#cbd5e1]'}`}>
                  {STAGE_BY_KEY[co?.crm?.salesStage]?.label || 'No stage'}
                </span>
                {owner && <span className="text-[11px] text-[#6b7280] truncate">{owner}</span>}
              </div>
            </div>
            <div className="min-w-0 text-[13px] text-[#cbd5e1] truncate flex items-center gap-1.5">
              {co.phone ? <><Phone className="w-3.5 h-3.5 text-[#6b7280] shrink-0" />{co.phone}</> : <span className="text-[#6b7280]">—</span>}
            </div>
            <div className="min-w-0 text-[13px] text-[#cbd5e1] truncate flex items-center gap-1.5">
              {co.email ? <><Mail className="w-3.5 h-3.5 text-[#6b7280] shrink-0" />{co.email}</> : <span className="text-[#6b7280]">—</span>}
            </div>
            <div className="min-w-0 text-[13px] text-[#cbd5e1] truncate">{co.primaryContact || <span className="text-[#6b7280]">—</span>}</div>
            <div className="min-w-0 text-[13px] truncate">
              {na.text ? <span className="text-[#cbd5e1]">{na.text}</span> : <span className="text-[#6b7280]">—</span>}
              {na.chase && <span className={`ml-1.5 ${na.overdue ? 'text-[#ef4444]' : 'text-[#6b7280]'}`}>({ukDate(na.chase)})</span>}
            </div>
            <div className="text-right text-[13px] text-white">{money(co?.crm?.totalProfit)}</div>
          </button>
        );
      })}
    </>
  );

  return (
    <SalesPageLayout
      dark
      bare={viewMode === 'pipeline'}
      title="Companies"
      subtitle={subtitle}
      actions={actions}
      filters={filters}
    >
      {viewMode === 'pipeline' ? pipeline : list}
    </SalesPageLayout>
  );
}
