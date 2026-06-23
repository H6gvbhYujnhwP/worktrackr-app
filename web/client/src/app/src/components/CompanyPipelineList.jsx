// web/client/src/app/src/components/CompanyPipelineList.jsx
// Phase 1 — the salesperson's home: companies by sales stage.
// Reads live data from GET /api/contacts?type=company (cookie auth). Sales stage
// lives in contact.crm.salesStage (new|prospect|hot_prospect|customer);
// account manager in contact.crm.assignedTo. Matches the approved
// `crm_company_pipeline_list` mockup. Self-contained; optional callbacks:
//   onOpenCompany(id)  — open the company profile
//   onAddCompany()     — open the add-company flow
// Chrome (header / pills / table shell) comes from SalesPageLayout so every Sales
// tab shares one look (see SalesPageLayout.jsx).
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Upload } from 'lucide-react';
import CsvImport from './CsvImport.jsx';
import SalesPageLayout, {
  SalesSearch, SalesPrimaryButton, SalesSecondaryButton, SalesAllPill, SalesFilterPill,
} from './SalesPageLayout.jsx';

const STAGES = [
  { key: 'new',          label: 'New',          pill: 'bg-[#F1EFE8] text-[#2C2C2A]' },
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

const GRID = 'grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,1fr)_28px] gap-2';

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

  const actions = (
    <>
      <SalesSearch value={search} onChange={setSearch} placeholder="Search name, contact, manager" />
      <SalesSecondaryButton icon={Upload} onClick={() => setShowImport(true)}>Import</SalesSecondaryButton>
      <SalesPrimaryButton onClick={() => onAddCompany && onAddCompany()}>Add company</SalesPrimaryButton>
    </>
  );

  const filters = (
    <>
      <SalesAllPill active={activeStage === null} count={companies.length} onClick={() => setActiveStage(null)} />
      {STAGES.map((s) => (
        <SalesFilterPill
          key={s.key}
          active={activeStage === s.key}
          pillClass={s.pill}
          count={counts[s.key] || 0}
          onClick={() => setActiveStage(activeStage === s.key ? null : s.key)}
        >
          {s.label}
        </SalesFilterPill>
      ))}
    </>
  );

  return (
    <SalesPageLayout
      title="Companies"
      subtitle={`Your pipeline · ${companies.length} ${companies.length === 1 ? 'company' : 'companies'}`}
      actions={actions}
      filters={filters}
    >
      <div className={`${GRID} px-4 py-2.5 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500`}>
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
          className={`w-full text-left ${GRID} items-center px-4 py-3 border-t border-gray-100 hover:bg-gray-50 ${i % 2 ? 'bg-gray-50/40' : ''}`}
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
    </SalesPageLayout>
  );
}
