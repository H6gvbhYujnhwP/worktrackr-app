// web/client/src/app/src/components/CompanyPipelineList.jsx
// Phase 1 — the salesperson's home: companies by sales stage.
// Reads live data from GET /api/contacts?type=company (cookie auth). Sales stage
// lives in contact.crm.salesStage (suspect|prospect|hot_prospect|customer);
// account manager in contact.crm.assignedTo. Matches the approved
// `crm_company_pipeline_list` mockup. Self-contained; optional callbacks:
//   onOpenCompany(id)  — open the company profile
//   onAddCompany()     — open the add-company flow
import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, ChevronRight, Upload } from 'lucide-react';
import CsvImport from './CsvImport.jsx';

const STAGES = [
  { key: 'suspect',      label: 'Suspect',      pill: 'bg-[#F1EFE8] text-[#2C2C2A]' },
  { key: 'prospect',     label: 'Prospect',     pill: 'bg-[#E6F1FB] text-[#0C447C]' },
  { key: 'hot_prospect', label: 'Hot prospect', pill: 'bg-[#FAEEDA] text-[#854F0B]' },
  { key: 'customer',     label: 'Customer',     pill: 'bg-[#E1F5EE] text-[#085041]' },
];
const STAGE_BY_KEY = Object.fromEntries(STAGES.map((s) => [s.key, s]));

function StagePill({ stageKey }) {
  const s = STAGE_BY_KEY[stageKey];
  if (!s) return <span className="text-xs text-gray-400">No stage</span>;
  return <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] ${s.pill}`}>{s.label}</span>;
}

export default function CompanyPipelineList({ onOpenCompany, onAddCompany }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeStage, setActiveStage] = useState(null); // null = all
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [reload, setReload] = useState(0);

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

  const counts = useMemo(() => {
    const c = {};
    for (const co of companies) {
      const k = co?.crm?.salesStage;
      if (k) c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [companies]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((co) => {
      if (activeStage && co?.crm?.salesStage !== activeStage) return false;
      if (!q) return true;
      const hay = [co.name, co?.crm?.assignedTo, co.primaryContact, co.email]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [companies, activeStage, search]);

  const monthlyValue = (co) => {
    const v = Number(co?.crm?.totalProfit);
    return Number.isFinite(v) && v > 0 ? `£${v.toLocaleString()}/mo` : '—';
  };
  const nextAction = (co) => co?.crm?.nextCRMEvent || '—';

  if (showImport) {
    return <CsvImport onBack={() => setShowImport(false)} onDone={() => setReload((n) => n + 1)} />;
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="text-lg font-medium text-gray-900">Companies</div>
          <div className="text-[13px] text-gray-500">
            Your pipeline · {companies.length} {companies.length === 1 ? 'company' : 'companies'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 h-9 bg-white">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, contact, manager"
              className="text-[13px] outline-none w-48 bg-transparent"
            />
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="h-9 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 text-gray-700 px-3 text-[13px] hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" /> Import
          </button>
          <button
            onClick={() => onAddCompany && onAddCompany()}
            className="h-9 inline-flex items-center gap-1.5 rounded-lg border border-[#d4a017] text-[#8a6a0f] px-3 text-[13px] hover:bg-[rgba(212,160,23,0.08)]"
          >
            <Plus className="w-4 h-4" /> Add company
          </button>
        </div>
      </div>

      {/* Stage filter chips */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setActiveStage(null)}
          className={`rounded-lg px-3 py-1.5 text-[13px] border ${activeStage === null ? 'border-[#d4a017] bg-[rgba(212,160,23,0.12)] text-[#8a6a0f]' : 'border-transparent bg-gray-100 text-gray-700'}`}
        >
          All <span className="opacity-60">{companies.length}</span>
        </button>
        {STAGES.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveStage(activeStage === s.key ? null : s.key)}
            className={`rounded-lg px-3 py-1.5 text-[13px] ${s.pill} ${activeStage === s.key ? 'outline outline-2 outline-[#EF9F27]' : ''}`}
          >
            {s.label} <span className="opacity-60">{counts[s.key] || 0}</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,1fr)_28px] gap-2 px-4 py-2.5 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
          <div>Company</div><div>Next action</div><div className="text-right">Monthly value</div><div />
        </div>

        {loading && <div className="px-4 py-8 text-center text-[13px] text-gray-500">Loading companies…</div>}
        {error && !loading && (
          <div className="px-4 py-8 text-center text-[13px] text-red-700">Couldn’t load companies: {error}</div>
        )}
        {!loading && !error && visible.length === 0 && (
          <div className="px-4 py-10 text-center text-[13px] text-gray-500">
            No companies {activeStage ? `at stage “${STAGE_BY_KEY[activeStage]?.label}”` : 'yet'}. Add your first one to start the pipeline.
          </div>
        )}

        {!loading && !error && visible.map((co, i) => (
          <button
            key={co.id}
            onClick={() => onOpenCompany && onOpenCompany(co.id)}
            className={`w-full text-left grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,1fr)_28px] gap-2 items-center px-4 py-3 border-t border-gray-100 hover:bg-gray-50 ${i % 2 ? 'bg-gray-50/40' : ''}`}
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{co.name}</div>
              <div className="mt-1 flex items-center gap-2">
                <StagePill stageKey={co?.crm?.salesStage} />
                {co?.crm?.assignedTo && <span className="text-[11px] text-gray-400 truncate">{co.crm.assignedTo}</span>}
              </div>
            </div>
            <div className="min-w-0 text-[13px] text-gray-700 truncate">{nextAction(co)}</div>
            <div className="text-right text-[13px] text-gray-700">{monthlyValue(co)}</div>
            <div className="text-right text-gray-300"><ChevronRight className="w-4 h-4 inline" /></div>
          </button>
        ))}
      </div>
    </div>
  );
}
