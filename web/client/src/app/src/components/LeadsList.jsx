// web/client/src/app/src/components/LeadsList.jsx
// Phase 7 (Leads) — the salesperson's chase list: companies not yet won.
// A "lead" is a contacts row type='company' whose crm.salesStage is one of
// new | prospect | hot_prospect (customers graduate out of this list). Lead
// detail (first contact, chase date, next action) lives on contact.crm, like
// salesStage. Reads live data from GET /api/contacts?type=company (cookie auth).
// NO money figures anywhere — a lead is a pure chase record.
//   Row actions: Convert to customer (guided), Delete (confirmed → archive).
//   Managers also get an Archived view (Restore / permanent Delete).
// Optional callbacks:
//   onOpenCompany(id) — open the company profile
import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Plus, Upload, ArrowUp, ArrowDown, ChevronsUpDown, AlertCircle,
  UserPlus, Trash2, RotateCcw, Archive, MessageSquare,
} from 'lucide-react';
import CsvImport from './CsvImport.jsx';
import AddLeadModal from './AddLeadModal.jsx';
import ConvertToCustomerModal from './ConvertToCustomerModal.jsx';
import LeadNotesPanel from './LeadNotesPanel.jsx';

// Lead stages only (customers are not leads).
const LEAD_STAGES = [
  { key: 'new',          label: 'New',          pill: 'bg-[#F1EFE8] text-[#2C2C2A]' },
  { key: 'prospect',     label: 'Prospect',     pill: 'bg-[#E6F1FB] text-[#0C447C]' },
  { key: 'hot_prospect', label: 'Hot prospect', pill: 'bg-[#FAEEDA] text-[#854F0B]' },
];
const STAGE_BY_KEY = Object.fromEntries(LEAD_STAGES.map((s) => [s.key, s]));
const STAGE_ORDER = { new: 0, prospect: 1, hot_prospect: 2 };
const LEAD_KEYS = new Set(['new', 'prospect', 'hot_prospect']);

function StagePill({ stageKey }) {
  const s = STAGE_BY_KEY[stageKey];
  if (!s) return <span className="text-[11px] text-gray-400">—</span>;
  return <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] ${s.pill}`}>{s.label}</span>;
}

// Date helpers. First contact = friendly "12 May"; chase date = full UK DD/MM/YYYY.
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function fmtFirst(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function fmtChase(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}
function isOverdue(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  return d < startOfToday();
}
function timeVal(iso) { const d = iso ? new Date(iso) : null; return d && !isNaN(d.getTime()) ? d.getTime() : Infinity; }

const GRID = 'grid grid-cols-[minmax(140px,1.2fr)_minmax(100px,0.95fr)_minmax(100px,0.9fr)_minmax(140px,1.4fr)_minmax(100px,1fr)_minmax(80px,0.75fr)_minmax(80px,0.8fr)_minmax(110px,1.05fr)_minmax(100px,0.85fr)_minmax(108px,0.8fr)] gap-2';

function SortHead({ label, sortKey, active, dir, onSort, className = '' }) {
  const Icon = !active ? ChevronsUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button onClick={() => onSort(sortKey)} className={`inline-flex items-center gap-1 text-left ${active ? 'text-gray-700' : ''} ${className}`}>
      {label}
      <Icon className={`w-3 h-3 ${active ? 'text-[#0F6E56]' : 'text-gray-400'}`} />
    </button>
  );
}

export default function LeadsList({ onOpenCompany, currentUser, isManager = false }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('active'); // 'active' | 'archived' (managers)
  const [activeStage, setActiveStage] = useState(null); // null = all
  const [search, setSearch] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [convertLead, setConvertLead] = useState(null);
  const [notesLead, setNotesLead] = useState(null);
  const [reload, setReload] = useState(0);
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const me = (currentUser?.name || currentUser?.email || '').toLowerCase();
  const archivedView = mode === 'archived';

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const url = archivedView
          ? '/api/contacts?type=company&archived=only'
          : '/api/contacts?type=company';
        const r = await fetch(url, { credentials: 'include' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (alive) setCompanies(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) setError(e.message || 'Failed to load leads');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [reload, archivedView]);

  // Only companies that are leads. (Archived view: server already returns archived only.)
  const leads = useMemo(
    () => companies.filter((co) => LEAD_KEYS.has(co?.crm?.salesStage)),
    [companies]
  );

  const counts = useMemo(() => {
    const c = {};
    for (const co of leads) { const k = co?.crm?.salesStage; if (k) c[k] = (c[k] || 0) + 1; }
    return c;
  }, [leads]);

  const overdueCount = useMemo(
    () => (archivedView ? 0 : leads.filter((co) => isOverdue(co?.crm?.chaseDate)).length),
    [leads, archivedView]
  );

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = leads.filter((co) => {
      if (activeStage && co?.crm?.salesStage !== activeStage) return false;
      if (mineOnly && (co?.crm?.assignedTo || '').toLowerCase() !== me) return false;
      if (!q) return true;
      const hay = [co.name, co.primaryContact, co.email, co.phone, co?.crm?.assignedTo]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    const keyOf = (co) => {
      switch (sortKey) {
        case 'contact': return (co.primaryContact || '').toLowerCase();
        case 'stage':   return STAGE_ORDER[co?.crm?.salesStage] ?? 99;
        case 'first':   return timeVal(co?.crm?.firstContact);
        case 'chase':   return timeVal(co?.crm?.chaseDate);
        case 'name':
        default:        return (co.name || '').toLowerCase();
      }
    };
    rows = [...rows].sort((a, b) => {
      const ka = keyOf(a), kb = keyOf(b);
      if (ka < kb) return -1 * dir;
      if (ka > kb) return 1 * dir;
      return 0;
    });
    return rows;
  }, [leads, activeStage, mineOnly, me, search, sortKey, sortDir]);

  // ── Row actions ──────────────────────────────────────────────────────────
  async function patchCrm(co, patch) {
    const r = await fetch(`/api/contacts/${co.id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crm: { ...(co.crm || {}), ...patch } }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  }
  async function archiveLead(co) {
    if (!window.confirm(`Archive ${co.name}? It will be hidden from the leads list. Admins and managers can restore it.`)) return;
    try { await patchCrm(co, { archived: true, archivedAt: new Date().toISOString() }); setReload((n) => n + 1); }
    catch (e) { alert('Could not archive: ' + (e.message || 'error')); }
  }
  async function restoreLead(co) {
    try { await patchCrm(co, { archived: false, archivedAt: null }); setReload((n) => n + 1); }
    catch (e) { alert('Could not restore: ' + (e.message || 'error')); }
  }
  async function deleteForever(co) {
    if (!window.confirm(`Permanently delete ${co.name}? This cannot be undone.`)) return;
    try {
      const r = await fetch(`/api/contacts/${co.id}`, { method: 'DELETE', credentials: 'include' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setReload((n) => n + 1);
    } catch (e) { alert('Could not delete: ' + (e.message || 'error')); }
  }

  if (showImport) {
    return <CsvImport onBack={() => setShowImport(false)} onDone={() => setReload((n) => n + 1)} />;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {showAdd && (
        <AddLeadModal currentUser={currentUser} onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); setReload((n) => n + 1); }} />
      )}
      {convertLead && (
        <ConvertToCustomerModal lead={convertLead} currentUser={currentUser}
          onClose={() => setConvertLead(null)}
          onConverted={() => { setConvertLead(null); setReload((n) => n + 1); }} />
      )}
      {notesLead && (
        <LeadNotesPanel lead={notesLead} onClose={() => setNotesLead(null)} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="text-lg font-medium text-gray-900">{archivedView ? 'Archived leads' : 'Leads'}</div>
          <div className="text-[13px] text-gray-500">{archivedView ? 'Hidden leads — restore or remove' : 'Companies you’re chasing'}</div>
        </div>
        {!archivedView && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 h-9 bg-white">
              <Search className="w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, contact, email" className="text-[13px] outline-none w-48 bg-transparent" />
            </div>
            <button onClick={() => setMineOnly((v) => !v)}
              className={`h-9 inline-flex items-center rounded-lg border px-3 text-[13px] ${mineOnly ? 'border-[#0F6E56] bg-[#E1F5EE] text-[#0F6E56]' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
              Mine only
            </button>
            <button onClick={() => setShowImport(true)}
              className="h-9 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 text-gray-700 px-3 text-[13px] hover:bg-gray-50">
              <Upload className="w-4 h-4" /> Import
            </button>
            <button onClick={() => setShowAdd(true)}
              className="h-9 inline-flex items-center gap-1.5 rounded-lg bg-[#1D9E75] text-white px-3.5 text-[13px] hover:bg-[#16835f]">
              <Plus className="w-4 h-4" /> Add lead
            </button>
          </div>
        )}
      </div>

      {/* Chips row */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {!archivedView ? (
          <>
            <button onClick={() => setActiveStage(null)}
              className={`rounded-full px-3 py-1.5 text-[13px] border ${activeStage === null ? 'border-[#0F6E56] bg-[#E1F5EE] text-[#0F6E56]' : 'border-transparent bg-gray-100 text-gray-700'}`}>
              All <span className="opacity-60">{leads.length}</span>
            </button>
            {LEAD_STAGES.map((s) => (
              <button key={s.key} onClick={() => setActiveStage(activeStage === s.key ? null : s.key)}
                className={`rounded-full px-3 py-1.5 text-[13px] ${s.pill} ${activeStage === s.key ? 'outline outline-2 outline-[#EF9F27]' : ''}`}>
                {s.label} <span className="opacity-60">{counts[s.key] || 0}</span>
              </button>
            ))}
            {isManager && (
              <button onClick={() => { setMode('archived'); setActiveStage(null); }}
                className="rounded-full px-3 py-1.5 text-[13px] border border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200 inline-flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5" /> Archived
              </button>
            )}
            {overdueCount > 0 && (
              <span className="ml-auto inline-flex items-center gap-1 text-[12px] text-[#993C1D]">
                <AlertCircle className="w-3.5 h-3.5" /> {overdueCount} {overdueCount === 1 ? 'chase' : 'chases'} overdue
              </span>
            )}
          </>
        ) : (
          <button onClick={() => setMode('active')}
            className="rounded-full px-3 py-1.5 text-[13px] border border-gray-300 text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1.5">
            ← Active leads
          </button>
        )}
      </div>

      {/* List */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <div className="min-w-[1184px]">
            <div className={`${GRID} px-4 py-2.5 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500`}>
              <SortHead label="Company"     sortKey="name"    active={sortKey === 'name'}    dir={sortDir} onSort={toggleSort} />
              <SortHead label="Contact"     sortKey="contact" active={sortKey === 'contact'} dir={sortDir} onSort={toggleSort} />
              <div>Phone</div>
              <div>Email</div>
              <SortHead label="Stage"       sortKey="stage"   active={sortKey === 'stage'}   dir={sortDir} onSort={toggleSort} />
              <div>Owner</div>
              <SortHead label="1st contact" sortKey="first"   active={sortKey === 'first'}   dir={sortDir} onSort={toggleSort} />
              <div>Next action</div>
              <SortHead label="Chase date"  sortKey="chase"   active={sortKey === 'chase'}   dir={sortDir} onSort={toggleSort} />
              <div className="text-right">Actions</div>
            </div>

            {loading && <div className="px-4 py-8 text-center text-[13px] text-gray-500">Loading…</div>}
            {error && !loading && (
              <div className="px-4 py-8 text-center text-[13px] text-red-700">Couldn’t load: {error}</div>
            )}
            {!loading && !error && visible.length === 0 && (
              <div className="px-4 py-10 text-center text-[13px] text-gray-500">
                {archivedView ? 'No archived leads.' : (activeStage ? `No leads at stage “${STAGE_BY_KEY[activeStage]?.label}”.` : 'No leads yet. Add one or import a list to start chasing.')}
              </div>
            )}

            {!loading && !error && visible.map((co, i) => (
              <div
                key={co.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenCompany && onOpenCompany(co.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') onOpenCompany && onOpenCompany(co.id); }}
                className={`w-full text-left ${GRID} items-center px-4 py-3 border-t border-gray-100 hover:bg-gray-50 cursor-pointer ${i % 2 ? 'bg-gray-50/40' : ''}`}
              >
                <div className="min-w-0 text-sm font-medium text-gray-900 truncate">{co.name}</div>
                <div className="min-w-0 text-[13px] text-gray-600 truncate">{co.primaryContact || '—'}</div>
                <div className="min-w-0 text-[13px] text-gray-600 truncate">{co.phone || '—'}</div>
                <div className="min-w-0 text-[13px] text-gray-600 truncate">{co.email || '—'}</div>
                <div className="min-w-0"><StagePill stageKey={co?.crm?.salesStage} /></div>
                <div className="min-w-0 text-[13px] text-gray-600 truncate">{co?.crm?.assignedTo || '—'}</div>
                <div className="min-w-0 text-[13px] text-gray-600 truncate">{fmtFirst(co?.crm?.firstContact)}</div>
                <div className="min-w-0 text-[13px] text-gray-700 truncate">{co?.crm?.nextAction || '—'}</div>
                <div className={`min-w-0 text-[13px] truncate ${isOverdue(co?.crm?.chaseDate) ? 'text-[#993C1D] font-medium' : 'text-gray-600'}`}>
                  {fmtChase(co?.crm?.chaseDate)}
                </div>
                <div className="min-w-0 flex items-center justify-end gap-3">
                  {!archivedView ? (
                    <>
                      <button title="Notes" aria-label="Notes"
                        onClick={(e) => { e.stopPropagation(); setNotesLead(co); }}
                        className="text-gray-400 hover:text-[#0C447C]"><MessageSquare className="w-4 h-4" /></button>
                      <button title="Convert to customer" aria-label="Convert to customer"
                        onClick={(e) => { e.stopPropagation(); setConvertLead(co); }}
                        className="text-[#0F6E56] hover:text-[#0a4f3e]"><UserPlus className="w-4 h-4" /></button>
                      <button title="Delete (archive)" aria-label="Delete lead"
                        onClick={(e) => { e.stopPropagation(); archiveLead(co); }}
                        className="text-gray-400 hover:text-[#A32D2D]"><Trash2 className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <>
                      <button title="Restore" aria-label="Restore lead"
                        onClick={(e) => { e.stopPropagation(); restoreLead(co); }}
                        className="text-[#0F6E56] hover:text-[#0a4f3e]"><RotateCcw className="w-4 h-4" /></button>
                      <button title="Delete permanently" aria-label="Delete permanently"
                        onClick={(e) => { e.stopPropagation(); deleteForever(co); }}
                        className="text-gray-400 hover:text-[#A32D2D]"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
