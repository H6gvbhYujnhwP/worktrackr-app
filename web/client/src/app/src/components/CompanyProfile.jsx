// web/client/src/app/src/components/CompanyProfile.jsx
// Phase 1 + Phase 2 — the company hub.
// Reads one company (GET /api/contacts/:id), lets you change its sales stage
// (PUT, merging crm), manage its people (contactPersons), track its tasks
// (GET/POST/PUT /api/tasks?contactId=) and see a live activity timeline
// (GET /api/contacts/:id/history = CRM events + completed tasks).
// Props: companyId (required), onBack(), onNewOrder().
import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Check, Plus, Lock, X, Pencil,
  Phone, Users, Mail, FileText, RefreshCw, CornerUpRight, SquareCheck,
} from 'lucide-react';

const STAGES = [
  { key: 'suspect',      label: 'Suspect',      pill: 'bg-[#F1EFE8] text-[#2C2C2A]' },
  { key: 'prospect',     label: 'Prospect',     pill: 'bg-[#E6F1FB] text-[#0C447C]' },
  { key: 'hot_prospect', label: 'Hot prospect', pill: 'bg-[#FAEEDA] text-[#854F0B]' },
  { key: 'customer',     label: 'Customer',     pill: 'bg-[#E1F5EE] text-[#085041]' },
];
const PRIORITY = {
  high:   'bg-[#FAECE7] text-[#993C1D]',
  medium: 'bg-[#FAEEDA] text-[#854F0B]',
  low:    'bg-[#EAF3DE] text-[#3B6D11]',
};
const HISTORY = {
  call:      { icon: Phone,       label: 'Call' },
  meeting:   { icon: Users,       label: 'Meeting' },
  follow_up: { icon: CornerUpRight, label: 'Follow-up' },
  renewal:   { icon: RefreshCw,   label: 'Renewal' },
  other:     { icon: FileText,    label: 'Note' },
  task:      { icon: SquareCheck, label: 'Task completed' },
};
const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
const timeAgo = (iso) => {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};
const emptyPerson = { name: '', role: '', email: '', phone: '', isDecisionMaker: false, editIndex: -1 };

export default function CompanyProfile({ companyId, onBack, onNewOrder }) {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);

  const [personForm, setPersonForm] = useState(null); // null = closed
  const [taskForm, setTaskForm] = useState(null);      // null = closed

  const loadCompany = async () => {
    const r = await fetch(`/api/contacts/${companyId}`, { credentials: 'include' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    setCompany(await r.json());
  };
  const loadTasks = () =>
    fetch(`/api/tasks?contactId=${companyId}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : [])).then((d) => setTasks(Array.isArray(d) ? d : [])).catch(() => {});
  const loadHistory = () =>
    fetch(`/api/contacts/${companyId}/history`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : [])).then((d) => setHistory(Array.isArray(d) ? d : [])).catch(() => {});

  useEffect(() => {
    let alive = true;
    (async () => {
      try { setLoading(true); await loadCompany(); }
      catch (e) { if (alive) setError(e.message || 'Failed to load company'); }
      finally { if (alive) setLoading(false); }
    })();
    loadTasks();
    loadHistory();
    return () => { alive = false; };
  }, [companyId]);

  const setStage = async (stage) => {
    if (!company) return;
    const prev = company;
    const nextCrm = { ...(company.crm || {}), salesStage: stage };
    setCompany({ ...company, crm: nextCrm });
    setSaving(true);
    try {
      const r = await fetch(`/api/contacts/${companyId}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crm: nextCrm }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch (e) { setCompany(prev); setError(e.message || 'Could not save stage'); }
    finally { setSaving(false); }
  };

  const savePeople = async (people) => {
    const prev = company;
    setCompany({ ...company, contactPersons: people });
    try {
      const r = await fetch(`/api/contacts/${companyId}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactPersons: people }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch (e) { setCompany(prev); setError(e.message || 'Could not save contacts'); }
  };

  const submitPerson = () => {
    if (!personForm.name.trim()) return;
    const people = Array.isArray(company.contactPersons) ? [...company.contactPersons] : [];
    const entry = {
      name: personForm.name.trim(), role: personForm.role.trim(),
      email: personForm.email.trim(), phone: personForm.phone.trim(),
      isDecisionMaker: !!personForm.isDecisionMaker,
    };
    if (personForm.editIndex >= 0) people[personForm.editIndex] = entry; else people.push(entry);
    setPersonForm(null);
    savePeople(people);
  };
  const removePerson = (i) => {
    const people = (company.contactPersons || []).filter((_, idx) => idx !== i);
    savePeople(people);
  };

  const addTask = async () => {
    if (!taskForm.title.trim()) return;
    try {
      const r = await fetch('/api/tasks', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskForm.title.trim(), contactId: companyId,
          dueDate: taskForm.dueDate || null, priority: taskForm.priority,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setTaskForm(null);
      loadTasks(); loadHistory();
    } catch (e) { setError(e.message || 'Could not add task'); }
  };
  const toggleTask = async (t) => {
    const next = t.status === 'done' ? 'open' : 'done';
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: next } : x)));
    try {
      await fetch(`/api/tasks/${t.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      loadHistory();
    } catch { loadTasks(); }
  };

  if (loading) return <div className="p-6 text-[13px] text-gray-500">Loading company…</div>;
  if (error && !company) return <div className="p-6 text-[13px] text-red-700">Couldn’t load company: {error}</div>;
  if (!company) return null;

  const crm = company.crm || {};
  const people = Array.isArray(company.contactPersons) ? company.contactPersons : [];
  const monthly = Number(crm.totalProfit);
  const stagePill = STAGES.find((s) => s.key === crm.salesStage)?.pill || 'bg-gray-100 text-gray-700';
  const openTasks = tasks.filter((t) => t.status === 'open');
  const today = new Date().toISOString().slice(0, 10);

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
              <select value={crm.salesStage || ''} onChange={(e) => setStage(e.target.value)} disabled={saving}
                className={`rounded-md px-2 py-1 text-[12px] border-0 ${stagePill}`}>
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
          <div className="text-2xl font-medium text-gray-900">{openTasks.length}</div>
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

      {/* Contacts + Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Contacts (editable) */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:px-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-medium text-gray-900">Contacts</span>
            <button onClick={() => setPersonForm({ ...emptyPerson })} className="text-[13px] text-[#185fa5] inline-flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add person
            </button>
          </div>

          {personForm && (
            <div className="border border-gray-200 rounded-lg p-3 mb-2 grid gap-2">
              <input autoFocus value={personForm.name} onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })} placeholder="Name" className="border border-gray-300 rounded px-2 py-1.5 text-[13px]" />
              <input value={personForm.role} onChange={(e) => setPersonForm({ ...personForm, role: e.target.value })} placeholder="Role" className="border border-gray-300 rounded px-2 py-1.5 text-[13px]" />
              <input value={personForm.email} onChange={(e) => setPersonForm({ ...personForm, email: e.target.value })} placeholder="Email" className="border border-gray-300 rounded px-2 py-1.5 text-[13px]" />
              <input value={personForm.phone} onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })} placeholder="Phone" className="border border-gray-300 rounded px-2 py-1.5 text-[13px]" />
              <label className="text-[13px] text-gray-700 flex items-center gap-2">
                <input type="checkbox" checked={personForm.isDecisionMaker} onChange={(e) => setPersonForm({ ...personForm, isDecisionMaker: e.target.checked })} /> Decision maker
              </label>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setPersonForm(null)} className="rounded border border-gray-300 px-2 py-1 text-[12px]">Cancel</button>
                <button onClick={submitPerson} className="rounded border border-[#d4a017] bg-[rgba(212,160,23,0.12)] text-[#8a6a0f] px-2 py-1 text-[12px]">Save</button>
              </div>
            </div>
          )}

          {people.length === 0 && !personForm && <div className="text-[13px] text-gray-500 py-2 border-t border-gray-100">No people added yet.</div>}
          {people.map((p, i) => {
            const name = p.name || p.fullName || 'Unnamed';
            const role = p.role || p.title || p.position || '';
            const dm = p.isDecisionMaker || p.decisionMaker;
            return (
              <div key={i} className="flex items-center gap-3 py-2 border-t border-gray-100">
                <div className="w-8 h-8 rounded-full bg-[#e6f1fb] text-[#185fa5] flex items-center justify-center text-[12px] font-medium flex-shrink-0">{initials(name)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-gray-900 truncate">
                    {name}
                    {dm && <span className="ml-2 rounded bg-[#E1F5EE] text-[#085041] px-1.5 py-0.5 text-[10px]">decision maker</span>}
                  </div>
                  <div className="text-[12px] text-gray-500 truncate">{[role, p.email, p.phone].filter(Boolean).join(' · ') || '—'}</div>
                </div>
                <button onClick={() => setPersonForm({ name, role, email: p.email || '', phone: p.phone || '', isDecisionMaker: !!dm, editIndex: i })} className="text-gray-400 hover:text-gray-700"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => removePerson(i)} className="text-gray-400 hover:text-red-700"><X className="w-4 h-4" /></button>
              </div>
            );
          })}
        </div>

        {/* Tasks for this company */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:px-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-medium text-gray-900">Tasks</span>
            <button onClick={() => setTaskForm({ title: '', dueDate: '', priority: 'medium' })} className="text-[13px] text-[#185fa5] inline-flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add task
            </button>
          </div>

          {taskForm && (
            <div className="border border-gray-200 rounded-lg p-3 mb-2 grid gap-2">
              <input autoFocus value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="What needs doing?" className="border border-gray-300 rounded px-2 py-1.5 text-[13px]" />
              <div className="flex gap-2">
                <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5 text-[13px] flex-1" />
                <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5 text-[13px] bg-white">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setTaskForm(null)} className="rounded border border-gray-300 px-2 py-1 text-[12px]">Cancel</button>
                <button onClick={addTask} className="rounded border border-[#d4a017] bg-[rgba(212,160,23,0.12)] text-[#8a6a0f] px-2 py-1 text-[12px]">Save</button>
              </div>
            </div>
          )}

          {tasks.length === 0 && !taskForm && <div className="text-[13px] text-gray-500 py-2 border-t border-gray-100">No tasks yet.</div>}
          {tasks.map((t) => {
            const overdue = t.status === 'open' && t.dueDate && t.dueDate < today;
            return (
              <div key={t.id} className="flex items-center gap-2 py-2 border-t border-gray-100 text-[13px]">
                <button onClick={() => toggleTask(t)} className="flex-shrink-0 w-4 h-4 rounded border border-gray-300 flex items-center justify-center hover:border-[#d4a017]">
                  {t.status === 'done' && <Check className="w-3 h-3 text-[#0f6e56]" />}
                </button>
                <span className={`flex-1 truncate ${t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{t.title}</span>
                {t.dueDate && <span className={`text-[12px] ${overdue ? 'text-red-700' : 'text-gray-500'}`}>{overdue ? 'overdue' : t.dueDate}</span>}
                <span className={`rounded px-1.5 py-0.5 text-[10px] ${PRIORITY[t.priority] || PRIORITY.medium}`}>{t.priority[0].toUpperCase() + t.priority.slice(1)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* History timeline */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:px-5 mt-3">
        <div className="text-base font-medium text-gray-900 mb-1">History</div>
        {history.length === 0 && <div className="text-[13px] text-gray-500 py-2 border-t border-gray-100">No recent activity yet. Calls and meetings (from the CRM calendar) and completed tasks will show here.</div>}
        {history.map((h) => {
          const cfg = HISTORY[h.kind] || HISTORY.other;
          const Icon = cfg.icon;
          return (
            <div key={h.id} className="flex gap-2.5 py-2 border-t border-gray-100 text-[13px]">
              <Icon className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-medium text-gray-900">{cfg.label}</span>
                <span className="text-gray-700"> — {h.title}</span>
                <span className="text-gray-400"> · {h.actor ? `${h.actor} · ` : ''}{timeAgo(h.at)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {error && <div className="text-[12px] text-red-700 mt-3">{error}</div>}
    </div>
  );
}
