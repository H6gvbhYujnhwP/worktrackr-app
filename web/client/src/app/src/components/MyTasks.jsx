// web/client/src/app/src/components/MyTasks.jsx
// Sales/Workspace › My Tasks — the signed-in user's tasks across all companies
// (GET /api/tasks?mine=1). Tick to complete (PUT), or add a task linked to a
// company + assignee.
//
// v3.7 — rebuilt to Manus's DARK design (full-width). Table with Task name /
// Company / Due date / Priority / Status / Assignee, time tabs (All · Today ·
// This Week · Overdue), an "All tasks" status dropdown, and a friendly
// all-caught-up empty state.
//
// EVERYTHING from the old screen is preserved: load, the Add-task form
// (company/assignee/due/priority → POST /api/tasks), tick-to-complete (PUT
// /api/tasks/:id), the Completed view (now via the status dropdown), priority
// pills, company + assignee + due (overdue red), loading/error/empty.
// Status is DERIVED from the real model (open/done) — Done / Overdue / To do —
// with no invented "in progress" state the backend can't store.
import React, { useEffect, useState } from 'react';
import { Plus, Calendar, Building2, Check, ChevronDown, CheckCircle2, ListChecks } from 'lucide-react';
import PageHero, { HeroButtonPrimary } from './PageHero.jsx';

const PRIORITY = {
  high:   'bg-[rgba(239,68,68,0.20)] text-[#fca5a5]',
  medium: 'bg-[rgba(245,158,11,0.20)] text-[#fcd34d]',
  low:    'bg-[rgba(107,114,128,0.20)] text-[#cbd5e1]',
};
const todayStr = () => new Date().toISOString().slice(0, 10);

// time-bucket tabs (Manus)
const TABS = [
  { key: 'all',     label: 'All' },
  { key: 'today',   label: 'Today' },
  { key: 'week',    label: 'This Week' },
  { key: 'overdue', label: 'Overdue' },
];

// deterministic avatar colour from a name
const AVATARS = ['#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#06b6d4'];
const avatarColor = (name) => {
  const s = String(name || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATARS[h % AVATARS.length];
};
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all | todo | completed
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
  const weekEnd = (() => { const d = new Date(); d.setDate(d.getDate() + 6); return d.toISOString().slice(0, 10); })();
  const isOverdue = (t) => t.status === 'open' && t.dueDate && t.dueDate < today;

  // time bucket (independent of completion)
  const inTab = (t) => {
    if (tab === 'all') return true;
    if (tab === 'overdue') return isOverdue(t);
    if (tab === 'today') return t.dueDate === today;
    if (tab === 'week') return t.dueDate && t.dueDate >= today && t.dueDate <= weekEnd;
    return true;
  };
  const inStatus = (t) => {
    if (statusFilter === 'completed') return t.status === 'done';
    if (statusFilter === 'todo') return t.status !== 'done';
    return true;
  };

  const counts = {
    all:     tasks.filter(inStatus).length,
    today:   tasks.filter((t) => t.dueDate === today && inStatus(t)).length,
    week:    tasks.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate <= weekEnd && inStatus(t)).length,
    overdue: tasks.filter((t) => isOverdue(t) && inStatus(t)).length,
  };

  const visible = tasks.filter((t) => inTab(t) && inStatus(t));
  // in "All", show non-overdue first then an Overdue group (Manus)
  const mainRows = tab === 'all' ? visible.filter((t) => !isOverdue(t)) : visible;
  const overdueRows = tab === 'all' ? visible.filter(isOverdue) : [];

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
    if (t.status === 'open' && t.dueDate < today) return t.dueDate === today ? 'Today' : new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    if (t.dueDate === today) return 'Today';
    const d = new Date(t.dueDate); const tm = new Date(); tm.setDate(tm.getDate() + 1);
    if (t.dueDate === tm.toISOString().slice(0, 10)) return 'Tomorrow';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const statusPill = (t) => {
    if (t.status === 'done') return { cls: 'bg-[rgba(16,185,129,0.20)] text-[#6ee7b7]', label: 'Done' };
    if (isOverdue(t)) return { cls: 'bg-[rgba(239,68,68,0.20)] text-[#fca5a5]', label: 'Overdue' };
    return { cls: 'bg-[rgba(107,114,128,0.20)] text-[#cbd5e1]', label: 'To do' };
  };

  const GRID = 'grid grid-cols-[28px_minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_90px_90px_44px] gap-3';

  const Row = ({ t }) => {
    const overdue = isOverdue(t);
    const sp = statusPill(t);
    return (
      <div className={`${GRID} items-center px-4 py-3 border-t border-[#2e2e4a] ${t.status === 'done' ? 'opacity-60' : 'hover:bg-[#2a2a48]'}`}>
        <button onClick={() => toggle(t)} className="w-5 h-5 rounded border border-[#3a3a5c] flex items-center justify-center hover:border-[#f59e0b]">
          {t.status === 'done' && <Check className="w-3.5 h-3.5 text-[#10b981]" />}
        </button>
        <div className={`text-sm truncate ${t.status === 'done' ? 'line-through text-[#6b7280]' : 'text-white'}`}>{t.title}</div>
        <div className="text-[13px] text-[#94a3b8] truncate inline-flex items-center gap-1.5">
          {t.companyName ? <><Building2 className="w-3.5 h-3.5 text-[#6b7280] shrink-0" />{t.companyName}</> : <span className="text-[#6b7280]">—</span>}
        </div>
        <div className={`text-[13px] inline-flex items-center gap-1.5 ${overdue ? 'text-[#fca5a5]' : 'text-[#94a3b8]'}`}>
          {t.dueDate ? <><Calendar className="w-3.5 h-3.5 shrink-0" />{dueLabel(t)}</> : <span className="text-[#6b7280]">—</span>}
        </div>
        <div><span className={`rounded-md px-2 py-0.5 text-[11px] ${PRIORITY[t.priority] || PRIORITY.medium}`}>{t.priority[0].toUpperCase() + t.priority.slice(1)}</span></div>
        <div><span className={`rounded-md px-2 py-0.5 text-[11px] ${sp.cls}`}>{sp.label}</span></div>
        <div className="flex justify-end">
          {t.assigneeName
            ? <span title={t.assigneeName} className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-semibold text-white" style={{ background: avatarColor(t.assigneeName) }}>{initials(t.assigneeName)}</span>
            : <span className="text-[#6b7280] text-[12px]">—</span>}
        </div>
      </div>
    );
  };

  const inputCls = 'border border-[#2e2e4a] bg-[#242438] text-white rounded-lg px-3 py-2 text-[13px] outline-none placeholder:text-[#6b7280]';

  const heroActions = (
    <>
      <div className="relative">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 appearance-none rounded-lg border border-[#2e2e4a] bg-[#242438] text-white text-[13px] pl-3 pr-8 outline-none">
          <option value="all">All tasks</option>
          <option value="todo">To do</option>
          <option value="completed">Completed</option>
        </select>
        <ChevronDown className="w-4 h-4 text-[#6b7280] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
      <HeroButtonPrimary icon={Plus} onClick={() => setAdding((v) => !v)}>New task</HeroButtonPrimary>
    </>
  );

  return (
    <div className="p-5 md:p-7 min-h-full bg-[#1a1a2e]">
      <div className="mb-4">
        <PageHero
          title="My Tasks"
          icon={ListChecks}
          meta={[{ label: `${counts.all} ${counts.all === 1 ? 'task' : 'tasks'}` }, { label: `${counts.overdue} overdue` }]}
          actions={heroActions}
          compact
        />
      </div>

      {/* tabs */}
      <div className="flex gap-5 border-b border-[#2e2e4a] mb-4 overflow-x-auto">
        {TABS.map((f) => (
          <button key={f.key} onClick={() => setTab(f.key)}
            className={`text-[13px] whitespace-nowrap pb-2.5 -mb-px border-b-2 ${tab === f.key ? 'border-[#f59e0b] text-white' : 'border-transparent text-[#94a3b8] hover:text-white'}`}>
            {f.label} <span className="opacity-60">{counts[f.key] ?? ''}</span>
          </button>
        ))}
      </div>

      {/* add form */}
      {adding && (
        <div className="bg-[#242438] border border-[#2e2e4a] rounded-xl p-4 mb-4 grid gap-2 sm:grid-cols-2">
          <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="What needs doing?" className={`sm:col-span-2 ${inputCls}`} />
          <select value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })} className={inputCls}>
            <option value="">Company (optional)</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={form.assignedUserId} onChange={(e) => setForm({ ...form, assignedUserId: e.target.value })} className={inputCls}>
            <option value="">Assign to (optional)</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
          </select>
          <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputCls} />
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select>
          <div className="sm:col-span-2 flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="rounded-lg border border-[#2e2e4a] text-[#94a3b8] px-3 py-1.5 text-[13px] hover:bg-[#2a2a48]">Cancel</button>
            <button onClick={save} className="rounded-lg bg-[#f59e0b] text-[#1a1a2e] font-medium px-3 py-1.5 text-[13px] hover:bg-[#d97706]">Save task</button>
          </div>
        </div>
      )}

      {/* table */}
      <div className="border border-[#2e2e4a] rounded-xl overflow-hidden bg-[#242438]">
        <div className={`${GRID} px-4 py-2.5 bg-[#1f1f33] text-[11px] uppercase tracking-wide text-[#6b7280]`}>
          <div />
          <div>Task name</div><div>Company</div><div>Due date</div><div>Priority</div><div>Status</div>
          <div className="text-right">Owner</div>
        </div>

        {loading && <div className="px-4 py-8 text-center text-[13px] text-[#94a3b8]">Loading tasks…</div>}
        {error && !loading && <div className="px-4 py-8 text-center text-[13px] text-[#fca5a5]">{error}</div>}

        {!loading && !error && visible.length === 0 && (
          <div className="px-4 py-14 text-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgba(16,185,129,0.15)] mb-3">
              <CheckCircle2 className="w-6 h-6 text-[#10b981]" />
            </span>
            <div className="text-[15px] font-medium text-white">No more tasks — you are all caught up</div>
            <div className="text-[13px] text-[#6b7280] mt-1">Great job! Enjoy your day.</div>
          </div>
        )}

        {!loading && !error && mainRows.map((t) => <Row key={t.id} t={t} />)}

        {!loading && !error && overdueRows.length > 0 && (
          <>
            <div className="px-4 py-2 bg-[#1f1f33] border-t border-[#2e2e4a] text-[11px] uppercase tracking-wide text-[#fca5a5]">Overdue</div>
            {overdueRows.map((t) => <Row key={t.id} t={t} />)}
          </>
        )}
      </div>
    </div>
  );
}
