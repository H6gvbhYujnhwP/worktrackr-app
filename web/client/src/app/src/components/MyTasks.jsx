// web/client/src/app/src/components/MyTasks.jsx
// Phase 2 — the tasks dashboard. Lists the signed-in user's tasks across all
// companies (GET /api/tasks?mine=1), grouped by Open / Overdue / Due today /
// Completed. Tick to complete (PUT), or add a task linked to a company.
import React, { useEffect, useState } from 'react';
import { Plus, Calendar, Building2, Check } from 'lucide-react';

const PRIORITY = {
  high:   'bg-[#FAECE7] text-[#993C1D]',
  medium: 'bg-[#FAEEDA] text-[#854F0B]',
  low:    'bg-[#EAF3DE] text-[#3B6D11]',
};
const todayStr = () => new Date().toISOString().slice(0, 10);

const FILTERS = [
  { key: 'open',      label: 'Open' },
  { key: 'overdue',   label: 'Overdue' },
  { key: 'today',     label: 'Due today' },
  { key: 'completed', label: 'Completed' },
];

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('open');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', contactId: '', assignedUserId: '', dueDate: '', priority: 'medium' });

  const load = async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/tasks?mine=1', { credentials: 'include' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setTasks(await r.json());
    } catch (e) { setError(e.message || 'Failed to load tasks'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    fetch('/api/contacts?type=company', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : [])).then((d) => setCompanies(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/tickets/users/list', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { users: [] })).then((d) => setUsers(d.users || [])).catch(() => {});
  }, []);

  const today = todayStr();
  const bucket = (t) => {
    if (t.status === 'done') return 'completed';
    if (t.dueDate && t.dueDate < today) return 'overdue';
    if (t.dueDate === today) return 'today';
    return 'open';
  };
  const counts = FILTERS.reduce((acc, f) => {
    acc[f.key] = tasks.filter((t) => (f.key === 'open' ? t.status === 'open' : bucket(t) === f.key)).length;
    return acc;
  }, {});
  const visible = tasks.filter((t) => (filter === 'open' ? t.status === 'open' : bucket(t) === filter));

  const toggle = async (t) => {
    const next = t.status === 'done' ? 'open' : 'done';
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: next } : x)));
    try {
      await fetch(`/api/tasks/${t.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
    } catch { load(); }
  };

  const save = async () => {
    if (!form.title.trim()) return;
    try {
      const r = await fetch('/api/tasks', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          contactId: form.contactId || null,
          assignedUserId: form.assignedUserId || null,
          dueDate: form.dueDate || null,
          priority: form.priority,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setForm({ title: '', contactId: '', assignedUserId: '', dueDate: '', priority: 'medium' });
      setAdding(false);
      load();
    } catch (e) { setError(e.message || 'Could not add task'); }
  };

  const dueLabel = (t) => {
    if (!t.dueDate) return '';
    if (t.status === 'open' && t.dueDate < today) return 'overdue';
    if (t.dueDate === today) return 'due today';
    return t.dueDate;
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="text-lg font-medium text-gray-900">My tasks</div>
          <div className="text-[13px] text-gray-500">{counts.open} open · {counts.overdue} overdue</div>
        </div>
        <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4a017] text-[#8a6a0f] px-3 py-1.5 text-[13px] hover:bg-[rgba(212,160,23,0.08)]">
          <Plus className="w-4 h-4" /> Add task
        </button>
      </div>

      {adding && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 grid gap-2 sm:grid-cols-2">
          <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="What needs doing?" className="sm:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-[13px] outline-none" />
          <select value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-[13px] bg-white">
            <option value="">Company (optional)</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={form.assignedUserId} onChange={(e) => setForm({ ...form, assignedUserId: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-[13px] bg-white">
            <option value="">Assign to (optional)</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
          </select>
          <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-[13px]" />
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-[13px] bg-white">
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select>
          <div className="sm:col-span-2 flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-[13px]">Cancel</button>
            <button onClick={save} className="rounded-lg border border-[#d4a017] bg-[rgba(212,160,23,0.12)] text-[#8a6a0f] px-3 py-1.5 text-[13px]">Save task</button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3 py-1.5 text-[13px] ${filter === f.key ? 'outline outline-2 outline-[#d4a017] bg-[rgba(212,160,23,0.12)] text-[#8a6a0f]' : 'bg-gray-100 text-gray-700'}`}>
            {f.label} <span className="opacity-60">{counts[f.key] || 0}</span>
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading && <div className="px-4 py-8 text-center text-[13px] text-gray-500">Loading tasks…</div>}
        {error && !loading && <div className="px-4 py-8 text-center text-[13px] text-red-700">{error}</div>}
        {!loading && !error && visible.length === 0 && (
          <div className="px-4 py-10 text-center text-[13px] text-gray-500">Nothing here. Add a task to get started.</div>
        )}
        {!loading && !error && visible.map((t) => {
          const overdue = t.status === 'open' && t.dueDate && t.dueDate < today;
          return (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 first:border-t-0">
              <button onClick={() => toggle(t)} className="flex-shrink-0 w-5 h-5 rounded border border-gray-300 flex items-center justify-center hover:border-[#d4a017]">
                {t.status === 'done' && <Check className="w-3.5 h-3.5 text-[#0f6e56]" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-[13px] truncate ${t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{t.title}</div>
                <div className="flex items-center gap-3 mt-0.5 text-[12px] text-gray-500">
                  {t.companyName && <span className="inline-flex items-center gap-1 truncate"><Building2 className="w-3 h-3" /> {t.companyName}</span>}
                  {t.assigneeName && <span className="truncate">{t.assigneeName}</span>}
                </div>
              </div>
              {t.dueDate && (
                <span className={`text-[12px] inline-flex items-center gap-1 ${overdue ? 'text-red-700' : 'text-gray-500'}`}>
                  <Calendar className="w-3 h-3" /> {dueLabel(t)}
                </span>
              )}
              <span className={`rounded px-2 py-0.5 text-[11px] ${PRIORITY[t.priority] || PRIORITY.medium}`}>
                {t.priority[0].toUpperCase() + t.priority.slice(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
