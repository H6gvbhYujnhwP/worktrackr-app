// web/client/src/app/src/components/JobsList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Briefcase, ArrowUpDown, Clock, User } from 'lucide-react';

// ── Module-level helpers ───────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Module-level status badge — not defined inside parent body
function StatusBadge({ status }) {
  const map = {
    scheduled:   'bg-[#dbeafe] text-[#1d4ed8]',
    in_progress: 'bg-[#fef3c7] text-[#92400e]',
    on_hold:     'bg-[#f3f4f6] text-[#6b7280]',
    completed:   'bg-[#dcfce7] text-[#15803d]',
    invoiced:    'bg-[#ede9fe] text-[#6d28d9]',
    cancelled:   'bg-[#fee2e2] text-[#dc2626]',
  };
  const label = status
    ? status.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())
    : 'Scheduled';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${map[status] || map.scheduled}`}>
      {label}
    </span>
  );
}

export default function JobsList() {
  const navigate = useNavigate();
  const [jobs, setJobs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy]         = useState('created_at');
  const [sortOrder, setSortOrder]   = useState('desc');

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      setError(null);
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
        av = new Date(av || 0).getTime();
        bv = new Date(bv || 0).getTime();
      }
      return sortOrder === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const toggleSort = (field) => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
  };

  // Plain render helper — NOT a React component (no capital letter)
  // Using const SortTh = () => ... inside a function body would cause full
  // unmount/remount on every render. This is a plain function returning JSX.
  const renderSortTh = (field, children) => (
    <th
      className="text-left py-3 px-4 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider bg-[#fafafa] cursor-pointer hover:text-[#374151] select-none"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1.5">
        {children}
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-[13px] text-[#9ca3af]">
        Loading jobs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-6">
        <p className="text-[13px] text-red-600 mb-3">Error: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 text-[13px] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#111113]">Jobs</h1>
          <p className="text-[13px] text-[#9ca3af] mt-0.5">Manage and track field service jobs</p>
        </div>
        <button
          onClick={() => navigate('/app/jobs/new')}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Job
        </button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Jobs',   value: jobs.length,                                                       color: 'text-[#111113]' },
          { label: 'Scheduled',    value: jobs.filter(j => j.status === 'scheduled').length,                 color: 'text-[#1d4ed8]' },
          { label: 'In Progress',  value: jobs.filter(j => j.status === 'in_progress').length,               color: 'text-[#92400e]' },
          { label: 'Completed',    value: jobs.filter(j => j.status === 'completed' || j.status === 'invoiced').length, color: 'text-[#15803d]' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-[#e5e7eb] px-4 py-3">
            <div className={`text-[22px] font-bold ${color}`}>{value}</div>
            <div className="text-[11px] text-[#9ca3af] uppercase tracking-wider mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Main table container */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 p-4 border-b border-[#e5e7eb]">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search by job number, title, contact, or assignee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-[13px] border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#9ca3af]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-[13px] border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017] bg-white"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="invoiced">Invoiced</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="w-10 h-10 text-[#e5e7eb] mx-auto mb-3" />
            <h3 className="text-[14px] font-medium text-[#374151] mb-1">
              {jobs.length === 0 ? 'No jobs yet' : 'No jobs found'}
            </h3>
            <p className="text-[13px] text-[#9ca3af] mb-4">
              {jobs.length === 0 ? 'Create your first job to get started' : 'Try adjusting your search or filters'}
            </p>
            {jobs.length === 0 && (
              <button
                onClick={() => navigate('/app/jobs/new')}
                className="px-4 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-1.5" />
                Create Job
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    {renderSortTh('jobNumber', 'Job #')}
                    {renderSortTh('title', 'Title')}
                    {renderSortTh('contactName', 'Contact')}
                    <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider bg-[#fafafa]">Status</th>
                    {renderSortTh('scheduledStart', <><Clock className="w-3 h-3 mr-0.5 inline" />Scheduled</>)}
                    {renderSortTh('assignedToName', <><User className="w-3 h-3 mr-0.5 inline" />Assigned To</>)}
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job, index) => (
                    <tr
                      key={job.id}
                      onClick={() => navigate(`/app/jobs/${job.id}`)}
                      className={`border-b border-[#f3f4f6] hover:bg-[#fef9ee] cursor-pointer transition-colors text-[13px] ${index % 2 === 1 ? 'bg-[#fafbfc]' : 'bg-white'}`}
                    >
                      <td className="py-3 px-4 font-medium text-[#d4a017] whitespace-nowrap">{job.jobNumber}</td>
                      <td className="py-3 px-4 text-[#111113] font-medium max-w-[220px] truncate">{job.title}</td>
                      <td className="py-3 px-4 text-[#374151]">{job.contactName || <span className="text-[#9ca3af]">—</span>}</td>
                      <td className="py-3 px-4"><StatusBadge status={job.status} /></td>
                      <td className="py-3 px-4 text-[#6b7280] whitespace-nowrap">{formatDate(job.scheduledStart)}</td>
                      <td className="py-3 px-4 text-[#374151]">{job.assignedToName || <span className="text-[#9ca3af]">Unassigned</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-[#f3f4f6] text-[12px] text-[#9ca3af]">
              Showing {filteredJobs.length} of {jobs.length} jobs
            </div>
          </>
        )}
      </div>
    </div>
  );
}
