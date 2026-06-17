// web/client/src/app/src/components/CompanyProfile.jsx
// Phase 1 — the company hub. Reads one company via GET /api/contacts/:id and lets
// you change its sales stage (saved back with PUT, merging crm so nothing else is
// lost). Matches the approved `crm_company_profile` mockup. Account manager =
// crm.assignedTo, source = crm.source, monthly profit = crm.totalProfit.
// Props: companyId (required), onBack(), onNewOrder().
// The "Services & monthly profit" block is badged from IdoYourQuotes and shows an
// empty state until quotes are linked (that data arrives when the order/contracts
// work lands).
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Plus, Lock, Phone, Mail, Users } from 'lucide-react';

const STAGES = [
  { key: 'suspect',      label: 'Suspect',      pill: 'bg-[#F1EFE8] text-[#2C2C2A]' },
  { key: 'prospect',     label: 'Prospect',     pill: 'bg-[#E6F1FB] text-[#0C447C]' },
  { key: 'hot_prospect', label: 'Hot prospect', pill: 'bg-[#FAEEDA] text-[#854F0B]' },
  { key: 'customer',     label: 'Customer',     pill: 'bg-[#E1F5EE] text-[#085041]' },
];

const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

export default function CompanyProfile({ companyId, onBack, onNewOrder }) {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/contacts/${companyId}`, { credentials: 'include' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (alive) setCompany(data);
      } catch (e) {
        if (alive) setError(e.message || 'Failed to load company');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [companyId]);

  const setStage = async (stage) => {
    if (!company) return;
    const prev = company;
    const nextCrm = { ...(company.crm || {}), salesStage: stage };
    setCompany({ ...company, crm: nextCrm }); // optimistic
    setSaving(true);
    try {
      const r = await fetch(`/api/contacts/${companyId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crm: nextCrm }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      setCompany(prev); // roll back on failure
      setError(e.message || 'Could not save stage');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-[13px] text-gray-500">Loading company…</div>;
  if (error && !company) return <div className="p-6 text-[13px] text-red-700">Couldn’t load company: {error}</div>;
  if (!company) return null;

  const crm = company.crm || {};
  const people = Array.isArray(company.contactPersons) ? company.contactPersons : [];
  const monthly = Number(crm.totalProfit);
  const stagePill = STAGES.find((s) => s.key === crm.salesStage)?.pill || 'bg-gray-100 text-gray-700';

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <button onClick={() => onBack && onBack()} className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-800 mb-3">
        <ArrowLeft className="w-4 h-4" /> Back to companies
      </button>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:px-5 mb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-lg font-medium text-gray-900">{company.name}</span>
              <select
                value={crm.salesStage || ''}
                onChange={(e) => setStage(e.target.value)}
                disabled={saving}
                className={`rounded-md px-2 py-1 text-[12px] border-0 ${stagePill}`}
              >
                <option value="" disabled>Set stage…</option>
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div className="text-[13px] text-gray-500 mt-1">
              Account manager: {crm.assignedTo || '—'} · Source: {crm.source || '—'}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStage('customer')} disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-[13px] hover:bg-gray-50">
              <Check className="w-4 h-4" /> Mark won
            </button>
            <button onClick={() => onNewOrder && onNewOrder(company)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#378add] text-[#185fa5] px-3 py-1.5 text-[13px] hover:bg-[#e6f1fb]">
              <Plus className="w-4 h-4" /> New order
            </button>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-[13px] text-gray-500">Monthly profit</div>
          <div className="text-2xl font-medium text-gray-900">{Number.isFinite(monthly) && monthly > 0 ? `£${monthly.toLocaleString()}` : '—'}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-[13px] text-gray-500">Active services</div>
          <div className="text-2xl font-medium text-gray-900">—</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-[13px] text-gray-500">Open tasks</div>
          <div className="text-2xl font-medium text-gray-900">—</div>
        </div>
      </div>

      {/* Services & monthly profit (from IdoYourQuotes) */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:px-5 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-base font-medium text-gray-900">Services &amp; monthly profit</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-[#EEEDFE] text-[#3C3489] px-2 py-0.5 text-[11px]">
            <Lock className="w-3 h-3" /> from IdoYourQuotes
          </span>
        </div>
        <div className="text-[13px] text-gray-500 py-6 text-center border-t border-gray-100">
          Linked IdoYourQuotes services will appear here once a quote is linked to this company.
        </div>
      </div>

      {/* Contacts + history */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:px-5">
          <div className="text-base font-medium text-gray-900 mb-2">Contacts</div>
          {people.length === 0 && <div className="text-[13px] text-gray-500 py-2 border-t border-gray-100">No people added yet.</div>}
          {people.map((p, i) => {
            const name = p.name || p.fullName || 'Unnamed';
            const role = p.role || p.title || p.position || '';
            const dm = p.isDecisionMaker || p.decisionMaker;
            return (
              <div key={i} className="flex items-center gap-3 py-2 border-t border-gray-100">
                <div className="w-8 h-8 rounded-full bg-[#e6f1fb] text-[#185fa5] flex items-center justify-center text-[12px] font-medium">{initials(name)}</div>
                <div>
                  <div className="text-[13px] font-medium text-gray-900">
                    {name}
                    {dm && <span className="ml-2 rounded bg-[#E1F5EE] text-[#085041] px-1.5 py-0.5 text-[10px]">decision maker</span>}
                  </div>
                  {role && <div className="text-[12px] text-gray-500">{role}</div>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 md:px-5">
          <div className="text-base font-medium text-gray-900 mb-2">Recent history</div>
          {company.notes
            ? <div className="text-[13px] text-gray-700 py-2 border-t border-gray-100 whitespace-pre-wrap">{company.notes}</div>
            : <div className="text-[13px] text-gray-500 py-2 border-t border-gray-100">No recent activity yet. Calls, emails and notes will show here.</div>}
        </div>
      </div>

      {error && <div className="text-[12px] text-red-700 mt-3">{error}</div>}
    </div>
  );
}
