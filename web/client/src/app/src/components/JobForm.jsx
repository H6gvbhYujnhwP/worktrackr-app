// web/client/src/app/src/components/JobForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, Loader2, Save } from 'lucide-react';

// ── Design system constants ────────────────────────────────────────────────────
const INPUT_CLS = 'w-full px-3 py-2 text-[13px] border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017]';
const LABEL_CLS = 'block text-[12px] font-semibold text-[#374151] mb-1';

const JOB_STATUSES = [
  { value: 'scheduled',   label: 'Scheduled'   },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold',     label: 'On Hold'     },
  { value: 'completed',   label: 'Completed'   },
  { value: 'invoiced',    label: 'Invoiced'    },
];

// Convert ISO datetime string to datetime-local input format (YYYY-MM-DDTHH:MM)
function isoToDatetimeLocal(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function JobForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: jobId } = useParams();         // present when route is jobs/:id/edit
  const isEditMode = Boolean(jobId);

  const [contacts, setContacts]     = useState([]);
  const [users, setUsers]           = useState([]);
  const [saving, setSaving]         = useState(false);
  const [loadingJob, setLoadingJob] = useState(isEditMode);
  const [errors, setErrors]         = useState({});

  const [formData, setFormData] = useState({
    title:           '',
    description:     '',
    status:          'scheduled',
    contact_id:      '',
    assigned_to:     '',
    scheduled_start: '',
    scheduled_end:   '',
    notes:           '',
  });

  // Load contacts + users
  useEffect(() => {
    fetch('/api/contacts', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setContacts(data.contacts || data || []))
      .catch(err => console.error('Error fetching contacts:', err));

    fetch('/api/users', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setUsers(data.users || data || []))
      .catch(err => console.error('Error fetching users:', err));

    // Pre-fill contact if passed via query param (create mode only)
    if (!isEditMode) {
      const contactId = searchParams.get('contact_id');
      if (contactId) setFormData(prev => ({ ...prev, contact_id: contactId }));
    }
  }, []);

  // In edit mode: fetch existing job and pre-populate form
  useEffect(() => {
    if (!isEditMode || !jobId) return;
    setLoadingJob(true);
    fetch(`/api/jobs/${jobId}`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error('Failed to fetch job'); return r.json(); })
      .then(data => {
        const job = data.job;
        setFormData({
          title:           job.title || '',
          description:     job.description || '',
          status:          job.status || 'scheduled',
          contact_id:      job.contactId || '',
          assigned_to:     job.assignedTo || '',
          scheduled_start: isoToDatetimeLocal(job.scheduledStart),
          scheduled_end:   isoToDatetimeLocal(job.scheduledEnd),
          notes:           job.notes || '',
        });
      })
      .catch(err => {
        console.error('[JobForm] Failed to load job for edit:', err);
        alert('Failed to load job. Returning to jobs list.');
        navigate('/app/dashboard', { state: { view: 'jobs' } });
      })
      .finally(() => setLoadingJob(false));
  }, [jobId, isEditMode]);

  const set = (field) => (e) =>
    setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) errs.title = 'Title is required';
    if (formData.scheduled_start && formData.scheduled_end) {
      if (new Date(formData.scheduled_end) < new Date(formData.scheduled_start)) {
        errs.scheduled_end = 'End must be after start';
      }
    }
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);

    const payload = {
      title:       formData.title.trim(),
      description: formData.description.trim() || null,
      status:      formData.status,
      contact_id:  formData.contact_id || null,
      assigned_to: formData.assigned_to || null,
      notes:       formData.notes.trim() || null,
    };

    if (formData.scheduled_start) {
      payload.scheduled_start = new Date(formData.scheduled_start).toISOString();
    } else {
      payload.scheduled_start = null;
    }
    if (formData.scheduled_end) {
      payload.scheduled_end = new Date(formData.scheduled_end).toISOString();
    } else {
      payload.scheduled_end = null;
    }

    try {
      let r, data;
      if (isEditMode) {
        r = await fetch(`/api/jobs/${jobId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const errData = await r.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to update job');
        }
        data = await r.json();
        console.log('[JobForm] Updated job:', data.job?.jobNumber);
        navigate(`/app/jobs/${jobId}`);
      } else {
        r = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const errData = await r.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to create job');
        }
        data = await r.json();
        console.log('[JobForm] Created job:', data.job?.jobNumber);
        navigate(`/app/jobs/${data.job.id}`);
      }
    } catch (err) {
      console.error('[JobForm] Submit error:', err);
      alert(err.message || `Failed to ${isEditMode ? 'update' : 'create'} job. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const backTarget = isEditMode
    ? () => navigate(`/app/jobs/${jobId}`)
    : () => navigate('/app/dashboard', { state: { view: 'jobs' } });

  if (loadingJob) {
    return (
      <div className="flex items-center justify-center h-64 text-[13px] text-[#9ca3af]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading job…
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={backTarget}
            className="p-2 rounded-lg border border-[#e5e7eb] hover:bg-[#fafafa] text-[#6b7280]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#d4a017]" />
              <h1 className="text-[20px] font-bold text-[#111113]">
                {isEditMode ? 'Edit Job' : 'Create Job'}
              </h1>
            </div>
            <p className="text-[13px] text-[#9ca3af] mt-0.5">
              {isEditMode
                ? 'Update the fields below and save your changes'
                : 'Fill in the details below to create a new job'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving
            ? (isEditMode ? 'Saving…' : 'Creating…')
            : (isEditMode ? 'Save Changes' : 'Create Job')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left — main fields */}
        <div className="lg:col-span-2 space-y-5">

          {/* Job details */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[13px] font-semibold text-[#374151]">Job Details</h3>
              <p className="text-[12px] text-[#9ca3af] mt-0.5">Core job information</p>
            </div>
            <div className="p-5 space-y-4">

              {/* Title */}
              <div>
                <label className={LABEL_CLS}>Job Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={set('title')}
                  placeholder="e.g. Boiler service — 12 High Street"
                  className={`${INPUT_CLS} ${errors.title ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : ''}`}
                />
                {errors.title && <p className="text-[12px] text-red-500 mt-1">{errors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label className={LABEL_CLS}>Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={set('description')}
                  placeholder="Describe the work to be carried out…"
                  className={`${INPUT_CLS} resize-none`}
                />
              </div>

              {/* Status */}
              <div>
                <label className={LABEL_CLS}>{isEditMode ? 'Status' : 'Initial Status'}</label>
                <select
                  value={formData.status}
                  onChange={set('status')}
                  className={INPUT_CLS}
                >
                  {JOB_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Scheduling */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[13px] font-semibold text-[#374151]">Scheduling</h3>
              <p className="text-[12px] text-[#9ca3af] mt-0.5">When is this job planned?</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Scheduled Start</label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_start}
                  onChange={set('scheduled_start')}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Scheduled End</label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_end}
                  onChange={set('scheduled_end')}
                  className={`${INPUT_CLS} ${errors.scheduled_end ? 'border-red-400' : ''}`}
                />
                {errors.scheduled_end && <p className="text-[12px] text-red-500 mt-1">{errors.scheduled_end}</p>}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[13px] font-semibold text-[#374151]">Internal Notes</h3>
              <p className="text-[12px] text-[#9ca3af] mt-0.5">Staff only — not visible to the contact</p>
            </div>
            <div className="p-5">
              <textarea
                rows={4}
                value={formData.notes}
                onChange={set('notes')}
                placeholder="Add any internal notes, special instructions, or access details…"
                className={`${INPUT_CLS} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Right — contact + assignment */}
        <div className="space-y-5">

          {/* Contact */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[13px] font-semibold text-[#374151]">Contact</h3>
            </div>
            <div className="p-5">
              <label className={LABEL_CLS}>Link to Contact</label>
              <select
                value={formData.contact_id}
                onChange={set('contact_id')}
                className={INPUT_CLS}
              >
                <option value="">— No contact —</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.company_name || c.contact_name || c.name || c.id}
                  </option>
                ))}
              </select>
              {contacts.length === 0 && (
                <p className="text-[12px] text-[#9ca3af] mt-2">No contacts found. Create one in the Contacts section first.</p>
              )}
            </div>
          </div>

          {/* Assignment */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[13px] font-semibold text-[#374151]">Assignment</h3>
            </div>
            <div className="p-5">
              <label className={LABEL_CLS}>Assigned To</label>
              <select
                value={formData.assigned_to}
                onChange={set('assigned_to')}
                className={INPUT_CLS}
              >
                <option value="">— Unassigned —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Save button repeated for convenience */}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving
              ? (isEditMode ? 'Saving…' : 'Creating…')
              : (isEditMode ? 'Save Changes' : 'Create Job')}
          </button>
          <button
            onClick={backTarget}
            className="w-full px-4 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
