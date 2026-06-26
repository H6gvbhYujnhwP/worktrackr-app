// web/client/src/app/src/components/JobsList.jsx
// Delivery › Projects — list of field-service projects (jobs). GET /api/jobs.
// Row/card → /app/jobs/:id; Create → /app/jobs/new.
//
// v3.9 — rebuilt to Manus's DARK card grid (batch_b/projects_list). Real data
// only: company/contact, title, status, single assignee, scheduled dates,
// project number. NOTE: the data model has no "progress %" or multi-assignee
// list, so Manus's progress bars + assignee stacks are NOT faked — cards show the
// real single assignee + status + due date instead.
//
// EVERYTHING preserved: load, search (number/title/contact/assignee), status
// filter (all six statuses — via quick tabs + the full dropdown), sort (now a
// dropdown), the stat strip, Create Project, open-project, loading/error/empty,
// and the "showing X of Y" count.
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronDown, Briefcase, PauseCircle, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';

const STATUS = {
  scheduled:   { label: 'Scheduled',   pill: 'bg-[rgba(59,130,246,0.20)] text-[#93c5fd]' },
  in_progress: { label: 'In progress', pill: 'bg-[rgba(245,158,11,0.20)] text-[#fcd34d]' },
  on_hold:     { label: 'On hold',     pill: 'bg-[rgba(107,114,128,0.20)] text-[#cbd5e1]' },
  completed:   { label: 'Completed',   pill: 'bg-[rgba(16,185,129,0.20)] text-[#6ee7b7]' },
  invoiced:    { label: 'Invoiced',    pill: 'bg-[rgba(139,92,246,0.20)] text-[#c4b5fd]' },
  cancelled:   { label: 'Cancelled',   pill: 'bg-[rgba(239,68,68,0.20)] text-[#fca5a5]' },
};
const statusInfo = (s) => STATUS[s] || STATUS.scheduled;

const AVATARS = ['#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#06b6d4'];
const avatarColor = (name) => { const s = String(name || ''); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return AVATARS[h % AVATARS.length]; };
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : null);

const SORTS = [
  { key: 'createdAt|desc',     label: 'Newest first' },
  { key: 'title|asc',          label: 'Title A–Z' },
  { key: 'scheduledStart|asc', label: 'Scheduled date' },
  { key: 'jobNumber|asc',      label: 'Project number' },
  { key: 'assignedToName|asc', label: 'Assignee' },
];

const TABS = [
  { key: 'all',         label: 'All' },
  { key: 'in_progress', label: 'Active' },
  { key: 'on_hold',     label: 'On hold' },
  { key: 'completed',   label: 'Completed' },
];

export default function JobsList() {
  const navigate = useNavigate();
  const [jobs, setJobs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort]             = useState('createdAt|desc');

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true); setError(null);
      try {
        const response = await fetch('/api/jobs', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch jobs');
        const data = await response.json();
        setJobs(data.jobs || []);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const now = Date.now();
  const isOverdue = (j) => j.scheduledEnd && new Date(j.scheduledEnd).getTime() < now && !['completed', 'invoiced', 'cancelled'].includes(j.status);

  const [sortBy, sortOrder] = sort.split('|');
  const filteredJobs = jobs
    .filter(j => {
      if (statusFilter !== 'all' && j.status !== statusFilter) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (
          j.jobNumber?.toLowerCase().includes(s) ||
          j.title?.toLowerCase().includes(s) ||
          j.contactName?.toLowerCase().includes(s) ||
          j.assignedToName?.toLowerCase().includes(s)
        );
      }
      return true;
    })
    .sort((a, b) => {
      let av = a[sortBy], bv = b[sortBy];
      if (['scheduledStart', 'scheduledEnd', 'createdAt'].includes(sortBy)) {
        av = new Date(av || 0).getTime(); bv = new Date(bv || 0).getTime();
      }
      return sortOrder === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const stats = [
    { label: 'In progress', value: jobs.filter(j => j.status === 'in_progress').length, Icon: Briefcase,   color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    { label: 'On hold',     value: jobs.filter(j => j.status === 'on_hold').length,     Icon: PauseCircle, color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
    { label: 'Overdue',     value: jobs.filter(isOverdue).length,                       Icon: AlertCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    { label: 'Completed',   value: jobs.filter(j => j.status === 'completed' || j.status === 'invoiced').length, Icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  ];

  if (loading) {
    return <div className="min-h-full bg-[#1a1a2e] flex justify-center items-center h-64 text-[13px] text-[#6b7280]">Loading projects…</div>;
  }
  if (error) {
    return (
      <div className="min-h-full bg-[#1a1a2e] p-5 md:p-7">
        <div className="bg-[#242438] rounded-xl border border-[#2e2e4a] p-6 max-w-md">
          <p className="text-[13px] text-[#fca5a5] mb-3">Error: {error}</p>
          <button onClick={() => window.location.reload()} className="px-3 py-1.5 text-[13px] border border-[#2e2e4a] text-[#cbd5e1] rounded-lg hover:bg-[#2a2a48]">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#1a1a2e] p-5 md:p-7">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="text-2xl font-semibold text-white">Projects</div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 border border-[#2e2e4a] rounded-lg px-3 h-9 bg-[#242438]">
            <Search className="w-4 h-4 text-[#6b7280]" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search projects…"
              className="text-[13px] outline-none w-48 bg-transparent text-white placeholder:text-[#6b7280]" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 appearance-none rounded-lg border border-[#2e2e4a] bg-[#242438] text-white text-[13px] pl-3 pr-8 outline-none">
              <option value="all">All status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In progress</option>
              <option value="on_hold">On hold</option>
              <option value="completed">Completed</option>
              <option value="invoiced">Invoiced</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown className="w-4 h-4 text-[#6b7280] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button onClick={() => navigate('/app/jobs/new')}
            className="h-9 inline-flex items-center gap-1.5 rounded-lg bg-[#f59e0b] text-[#1a1a2e] px-3.5 text-[13px] font-medium hover:bg-[#d97706]">
            <Plus className="w-4 h-4" /> New project
          </button>
        </div>
      </div>

      {/* Tabs + sort */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-[#2e2e4a] mb-5">
        <div className="flex gap-5 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setStatusFilter(t.key)}
              className={`text-[13px] whitespace-nowrap pb-2.5 -mb-px border-b-2 ${statusFilter === t.key ? 'border-[#f59e0b] text-white' : 'border-transparent text-[#94a3b8] hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative pb-2">
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="h-8 appearance-none rounded-lg border border-[#2e2e4a] bg-[#242438] text-[#cbd5e1] text-[12px] pl-3 pr-7 outline-none">
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#6b7280] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {stats.map(({ label, value, Icon, color, bg }) => (
          <div key={label} className="bg-[#242438] border border-[#2e2e4a] rounded-xl px-4 py-3.5 flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full" style={{ background: bg }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </span>
            <div>
              <div className="text-2xl font-semibold" style={{ color }}>{value}</div>
              <div className="text-[12px] text-[#94a3b8]">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Card grid */}
      {filteredJobs.length === 0 ? (
        <div className="bg-[#242438] border border-[#2e2e4a] rounded-xl text-center py-16">
          <Briefcase className="w-10 h-10 text-[#3a3a5c] mx-auto mb-3" />
          <h3 className="text-[14px] font-medium text-[#cbd5e1] mb-1">{jobs.length === 0 ? 'No projects yet' : 'No projects found'}</h3>
          <p className="text-[13px] text-[#6b7280] mb-4">{jobs.length === 0 ? 'Create your first project to get started' : 'Try adjusting your search or filters'}</p>
          {jobs.length === 0 && (
            <button onClick={() => navigate('/app/jobs/new')} className="px-4 py-2 text-[13px] font-medium text-[#1a1a2e] bg-[#f59e0b] hover:bg-[#d97706] rounded-lg">
              <Plus className="w-4 h-4 inline mr-1.5" /> Create project
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredJobs.map((job) => {
              const si = statusInfo(job.status);
              const overdue = isOverdue(job);
              const due = fmtDate(job.scheduledEnd) || fmtDate(job.scheduledStart);
              const dueLabel = job.scheduledEnd ? 'Due' : 'Starts';
              return (
                <button key={job.id} onClick={() => navigate(`/app/jobs/${job.id}`)}
                  className="text-left rounded-xl border border-[#2e2e4a] bg-[#242438] hover:bg-[#2a2a48] transition-colors p-4">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg text-[12px] font-semibold text-white" style={{ background: avatarColor(job.contactName || job.title) }}>
                      {initials(job.contactName || job.title)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[12px] text-[#94a3b8] truncate">{job.contactName || '—'}</div>
                        <span className={`shrink-0 inline-block rounded-md px-2 py-0.5 text-[11px] ${si.pill}`}>{si.label}</span>
                      </div>
                      <div className="text-[15px] font-semibold text-white truncate mt-0.5">{job.title}</div>
                      <div className="text-[11px] text-[#6b7280] mt-0.5">{job.jobNumber}</div>
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {job.assignedToName ? (
                        <>
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-semibold text-white" style={{ background: avatarColor(job.assignedToName) }}>{initials(job.assignedToName)}</span>
                          <span className="text-[12px] text-[#cbd5e1] truncate">{job.assignedToName}</span>
                        </>
                      ) : (
                        <span className="text-[12px] text-[#6b7280]">Unassigned</span>
                      )}
                    </div>
                    {due && (
                      <span className={`inline-flex items-center gap-1 text-[12px] ${overdue ? 'text-[#fca5a5]' : 'text-[#94a3b8]'}`}>
                        <Calendar className="w-3.5 h-3.5" /> {dueLabel}: {due}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* dashed new-project card */}
            <button onClick={() => navigate('/app/jobs/new')}
              className="rounded-xl border border-dashed border-[#33334f] text-[#6b7280] hover:text-[#94a3b8] hover:border-[#454567] flex flex-col items-center justify-center gap-2 py-10 min-h-[140px]">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-[#33334f]"><Plus className="w-5 h-5" /></span>
              <span className="text-[13px]">New project</span>
            </button>
          </div>

          <div className="mt-4 text-[12px] text-[#6b7280]">Showing {filteredJobs.length} of {jobs.length} projects</div>
        </>
      )}
    </div>
  );
}
