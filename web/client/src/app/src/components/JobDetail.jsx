// web/client/src/app/src/components/JobDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, Clock, Package, User, Calendar, Edit, Trash2, ChevronDown, ChevronUp, Plus, X, Loader2, FileText } from 'lucide-react';

// ── Module-level helpers ───────────────────────────────────────────────────────
function fmt(amount) { return `£${parseFloat(amount || 0).toFixed(2)}`; }

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtMinutes(mins) {
  if (!mins && mins !== 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const INPUT_CLS = 'w-full px-3 py-2 text-[13px] border border-[#2e2e4a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/30 focus:border-[#f59e0b]';
const LABEL_CLS = 'block text-[11px] font-semibold text-[#94a3b8] mb-1';

// ── Module-level StatusBadge ───────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    scheduled:   'bg-[rgba(59,130,246,0.20)] text-[#93c5fd]',
    in_progress: 'bg-[rgba(245,158,11,0.20)] text-[#fcd34d]',
    on_hold:     'bg-[rgba(107,114,128,0.20)] text-[#94a3b8]',
    completed:   'bg-[rgba(16,185,129,0.20)] text-[#6ee7b7]',
    invoiced:    'bg-[rgba(139,92,246,0.20)] text-[#c4b5fd]',
    cancelled:   'bg-[rgba(239,68,68,0.20)] text-[#fca5a5]',
  };
  const label = status
    ? status.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())
    : 'Scheduled';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${map[status] || map.scheduled}`}>
      {label}
    </span>
  );
}

// ── Module-level AddTimeEntryForm ──────────────────────────────────────────────
function AddTimeEntryForm({ jobId, onSuccess, onCancel }) {
  const [form, setForm]   = useState({ description: '', hours: '', billable: true });
  const [saving, setSaving] = useState(false);
  const [err, setErr]     = useState('');

  const setField = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = async () => {
    const rawHours = parseFloat(form.hours);
    if (!form.hours || isNaN(rawHours) || rawHours <= 0) {
      setErr('Please enter a valid duration greater than zero.');
      return;
    }
    setErr('');
    setSaving(true);
    const durationMinutes = Math.round(rawHours * 60);
    try {
      const r = await fetch(`/api/jobs/${jobId}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          description:      form.description.trim() || null,
          duration_minutes: durationMinutes,
          billable:         form.billable,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to log time');
      }
      onSuccess();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-[#2e2e4a] bg-[#1f1f33] px-5 py-4">
      <p className="text-[12px] font-semibold text-[#cbd5e1] mb-3">Log Time Entry</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div className="sm:col-span-2">
          <label className={LABEL_CLS}>Description (optional)</label>
          <input
            type="text"
            value={form.description}
            onChange={setField('description')}
            placeholder="e.g. Initial diagnosis and repair"
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Duration (hours) <span className="text-[#fca5a5]">*</span></label>
          <input
            type="number"
            min="0.1"
            step="0.25"
            value={form.hours}
            onChange={setField('hours')}
            placeholder="e.g. 1.5"
            className={INPUT_CLS}
          />
        </div>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.billable}
            onChange={setField('billable')}
            className="w-4 h-4 rounded border-[#2e2e4a] accent-[#d4a017]"
          />
          <span className="text-[13px] text-[#cbd5e1]">Billable</span>
        </label>
      </div>
      {err && <p className="text-[12px] text-[#fca5a5] mb-2">{err}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#1a1a2e] bg-[#f59e0b] hover:bg-[#d97706] rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {saving ? 'Logging…' : 'Log Time'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 text-[13px] text-[#94a3b8] border border-[#2e2e4a] rounded-lg hover:bg-[#1f1f33] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Module-level AddPartForm ───────────────────────────────────────────────────
function AddPartForm({ jobId, onSuccess, onCancel }) {
  const [form, setForm]   = useState({ description: '', quantity: '1', unit: '', unit_cost: '', unit_price: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr]     = useState('');

  const setField = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.description.trim()) {
      setErr('Description is required.');
      return;
    }
    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty < 0) {
      setErr('Quantity must be a positive number.');
      return;
    }
    setErr('');
    setSaving(true);
    const payload = {
      description: form.description.trim(),
      quantity:    qty,
    };
    if (form.unit.trim())       payload.unit       = form.unit.trim();
    if (form.unit_cost !== '')  payload.unit_cost  = parseFloat(form.unit_cost) || 0;
    if (form.unit_price !== '') payload.unit_price = parseFloat(form.unit_price) || 0;

    try {
      const r = await fetch(`/api/jobs/${jobId}/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to add part');
      }
      onSuccess();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-[#2e2e4a] bg-[#1f1f33] px-5 py-4">
      <p className="text-[12px] font-semibold text-[#cbd5e1] mb-3">Add Part / Material</p>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
        <div className="sm:col-span-2">
          <label className={LABEL_CLS}>Description <span className="text-[#fca5a5]">*</span></label>
          <input
            type="text"
            value={form.description}
            onChange={setField('description')}
            placeholder="e.g. 22mm copper pipe"
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Qty</label>
          <input
            type="number"
            min="0"
            step="1"
            value={form.quantity}
            onChange={setField('quantity')}
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Unit</label>
          <input
            type="text"
            value={form.unit}
            onChange={setField('unit')}
            placeholder="e.g. m, each"
            className={INPUT_CLS}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className={LABEL_CLS}>Buy Price (£ per unit)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.unit_cost}
            onChange={setField('unit_cost')}
            placeholder="0.00"
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Sell Price (£ per unit)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.unit_price}
            onChange={setField('unit_price')}
            placeholder="0.00"
            className={INPUT_CLS}
          />
        </div>
      </div>
      {err && <p className="text-[12px] text-[#fca5a5] mb-2">{err}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#1a1a2e] bg-[#f59e0b] hover:bg-[#d97706] rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {saving ? 'Adding…' : 'Add Part'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 text-[13px] text-[#94a3b8] border border-[#2e2e4a] rounded-lg hover:bg-[#1f1f33] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Module-level TimeEntriesSection ───────────────────────────────────────────
function TimeEntriesSection({ jobId }) {
  const [entries, setEntries]         = useState([]);
  const [totalMinutes, setTotal]      = useState(0);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshKey, setRefreshKey]   = useState(0);
  const [deletingId, setDeletingId]   = useState(null);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    fetch(`/api/jobs/${jobId}/time-entries`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setEntries(data.timeEntries || []);
        setTotal(data.totalMinutes || 0);
      })
      .catch(err => console.error('[TimeEntriesSection]', err))
      .finally(() => setLoading(false));
  }, [jobId, refreshKey]);

  const refresh = () => setRefreshKey(k => k + 1);

  const handleDelete = async (entryId) => {
    if (!window.confirm('Remove this time entry?')) return;
    setDeletingId(entryId);
    try {
      const r = await fetch(`/api/jobs/${jobId}/time-entries/${entryId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!r.ok) throw new Error('Failed to delete');
      refresh();
    } catch {
      alert('Failed to remove time entry.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-[#242438] rounded-xl border border-[#2e2e4a] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#1f1f33] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#6b7280]" />
          <span className="text-[13px] font-semibold text-[#cbd5e1]">Time Entries</span>
          {!loading && (
            <span className="text-[11px] text-[#6b7280] ml-1">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'} · {fmtMinutes(totalMinutes)} total
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[#6b7280]" /> : <ChevronDown className="w-4 h-4 text-[#6b7280]" />}
      </button>

      {expanded && (
        <div className="border-t border-[#2e2e4a]">
          {/* Add entry button row */}
          {!showAddForm && (
            <div className="px-5 py-3 border-b border-[#2e2e4a]">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#f59e0b] border border-[#f59e0b]/30 rounded-lg hover:bg-[#2a2a48] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Log Time
              </button>
            </div>
          )}

          {/* Add form */}
          {showAddForm && (
            <AddTimeEntryForm
              jobId={jobId}
              onSuccess={() => { setShowAddForm(false); refresh(); }}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {/* Entries list */}
          {loading ? (
            <p className="py-6 text-center text-[13px] text-[#6b7280]">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[#6b7280]">No time entries logged yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#2e2e4a]">
                    {['Staff Member', 'Description', 'Date', 'Duration', 'Billable', ''].map(h => (
                      <th key={h} className="py-3 px-4 text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider bg-[#1f1f33]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr
                      key={entry.id}
                      className={`border-b border-[#2e2e4a] hover:bg-[#2a2a48] transition-colors ${idx % 2 === 1 ? 'bg-[#20203a]' : 'bg-[#242438]'}`}
                    >
                      <td className="py-3 px-4 font-medium text-[#cbd5e1]">{entry.userName || '—'}</td>
                      <td className="py-3 px-4 text-[#94a3b8]">{entry.description || <span className="text-[#6b7280] italic">No description</span>}</td>
                      <td className="py-3 px-4 text-[#94a3b8] whitespace-nowrap">
                        {entry.startedAt ? fmtDateTime(entry.startedAt) : fmtDate(entry.createdAt)}
                      </td>
                      <td className="py-3 px-4 font-medium text-white whitespace-nowrap">{fmtMinutes(entry.durationMinutes)}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${entry.billable ? 'bg-[rgba(16,185,129,0.20)] text-[#6ee7b7]' : 'bg-[rgba(107,114,128,0.20)] text-[#94a3b8]'}`}>
                          {entry.billable ? 'Billable' : 'Non-billable'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={deletingId === entry.id}
                          className="p-1 text-[#6b7280] hover:text-[#fca5a5] transition-colors disabled:opacity-40"
                          title="Remove entry"
                        >
                          {deletingId === entry.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <X className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#2e2e4a] bg-[#1f1f33]">
                    <td className="px-4 py-2.5 text-[12px] font-semibold text-[#cbd5e1]" colSpan={3}>Total</td>
                    <td className="px-4 py-2.5 text-[13px] font-bold text-white">{fmtMinutes(totalMinutes)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Module-level PartsSection ──────────────────────────────────────────────────
function PartsSection({ jobId }) {
  const [parts, setParts]             = useState([]);
  const [totalCost, setTotalCost]     = useState(0);
  const [totalValue, setTotalValue]   = useState(0);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshKey, setRefreshKey]   = useState(0);
  const [deletingId, setDeletingId]   = useState(null);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    fetch(`/api/jobs/${jobId}/parts`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setParts(data.parts || []);
        setTotalCost(data.totalCost || 0);
        setTotalValue(data.totalValue || 0);
      })
      .catch(err => console.error('[PartsSection]', err))
      .finally(() => setLoading(false));
  }, [jobId, refreshKey]);

  const refresh = () => setRefreshKey(k => k + 1);

  const handleDelete = async (partId) => {
    if (!window.confirm('Remove this part?')) return;
    setDeletingId(partId);
    try {
      const r = await fetch(`/api/jobs/${jobId}/parts/${partId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!r.ok) throw new Error('Failed to delete');
      refresh();
    } catch {
      alert('Failed to remove part.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-[#242438] rounded-xl border border-[#2e2e4a] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#1f1f33] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-[#6b7280]" />
          <span className="text-[13px] font-semibold text-[#cbd5e1]">Parts Used</span>
          {!loading && (
            <span className="text-[11px] text-[#6b7280] ml-1">
              {parts.length} {parts.length === 1 ? 'part' : 'parts'} · {fmt(totalValue)} value
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[#6b7280]" /> : <ChevronDown className="w-4 h-4 text-[#6b7280]" />}
      </button>

      {expanded && (
        <div className="border-t border-[#2e2e4a]">
          {/* Add part button row */}
          {!showAddForm && (
            <div className="px-5 py-3 border-b border-[#2e2e4a]">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#f59e0b] border border-[#f59e0b]/30 rounded-lg hover:bg-[#2a2a48] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Part
              </button>
            </div>
          )}

          {/* Add form */}
          {showAddForm && (
            <AddPartForm
              jobId={jobId}
              onSuccess={() => { setShowAddForm(false); refresh(); }}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {/* Parts list */}
          {loading ? (
            <p className="py-6 text-center text-[13px] text-[#6b7280]">Loading…</p>
          ) : parts.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[#6b7280]">No parts logged yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#2e2e4a]">
                    {['Description', 'Qty', 'Unit', 'Buy £', 'Sell £', 'Line Value', ''].map(h => (
                      <th key={h} className={`py-3 px-4 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider bg-[#1f1f33] ${h === 'Description' || h === '' ? 'text-left' : 'text-right'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parts.map((part, idx) => {
                    const qty = parseFloat(part.quantity || 0);
                    const lineValue = qty * (parseFloat(part.unitPrice || 0));
                    return (
                      <tr
                        key={part.id}
                        className={`border-b border-[#2e2e4a] hover:bg-[#2a2a48] transition-colors ${idx % 2 === 1 ? 'bg-[#20203a]' : 'bg-[#242438]'}`}
                      >
                        <td className="py-3 px-4 text-white font-medium">{part.description}</td>
                        <td className="py-3 px-4 text-right text-[#cbd5e1]">{qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-[#6b7280]">{part.unit || '—'}</td>
                        <td className="py-3 px-4 text-right text-[#6b7280]">{part.unitCost != null ? fmt(part.unitCost) : '—'}</td>
                        <td className="py-3 px-4 text-right text-[#cbd5e1]">{part.unitPrice != null ? fmt(part.unitPrice) : '—'}</td>
                        <td className="py-3 px-4 text-right font-semibold text-white">{part.unitPrice != null ? fmt(lineValue) : '—'}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleDelete(part.id)}
                            disabled={deletingId === part.id}
                            className="p-1 text-[#6b7280] hover:text-[#fca5a5] transition-colors disabled:opacity-40"
                            title="Remove part"
                          >
                            {deletingId === part.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <X className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#2e2e4a] bg-[#1f1f33]">
                    <td className="px-4 py-2.5 text-[12px] font-semibold text-[#cbd5e1]" colSpan={3}>Totals</td>
                    <td className="px-4 py-2.5 text-right text-[12px] text-[#6b7280]">{fmt(totalCost)}</td>
                    <td />
                    <td className="px-4 py-2.5 text-right text-[13px] font-bold text-white">{fmt(totalValue)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
const JOB_STATUSES = ['scheduled', 'in_progress', 'on_hold', 'completed', 'invoiced', 'cancelled'];

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob]                         = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const [statusChanging, setStatusChanging]   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [linkedInvoice, setLinkedInvoice]     = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/jobs/${id}`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error('Failed to fetch project'); return r.json(); })
      .then(data => setJob(data.job))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch linked invoice number when convertedToInvoiceId is set
  useEffect(() => {
    if (!job?.convertedToInvoiceId) { setLinkedInvoice(null); return; }
    fetch(`/api/invoices/${job.convertedToInvoiceId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.invoice) {
          setLinkedInvoice({ id: data.invoice.id, invoiceNumber: data.invoice.invoice_number });
        }
      })
      .catch(() => {}); // silent — the link is informational only
  }, [job?.convertedToInvoiceId]);

  const handleCreateInvoice = async () => {
    setCreatingInvoice(true);
    try {
      const r = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ job_id: id }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to create invoice');
      }
      const data = await r.json();
      navigate(`/app/invoices/${data.invoice.id}`);
    } catch (e) {
      alert(e.message);
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setStatusChanging(true);
    try {
      const r = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!r.ok) throw new Error('Failed');
      const data = await r.json();
      setJob(data.job);
    } catch {
      alert('Failed to update project status.');
    } finally {
      setStatusChanging(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) { setShowDeleteConfirm(true); return; }
    try {
      const r = await fetch(`/api/jobs/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      navigate('/app/dashboard', { state: { view: 'jobs' } });
    } catch {
      alert('Failed to cancel project.');
      setShowDeleteConfirm(false);
    }
  };

  if (loading) return <div className="min-h-full flex justify-center items-center h-64 text-[13px] text-[#6b7280]">Loading project…</div>;

  if (error || !job) {
    return (
      <div className="bg-[#242438] rounded-xl border border-[#2e2e4a] p-6 text-center m-5 md:m-7">
        <p className="text-[13px] text-[#fca5a5] mb-3">{error || 'Project not found'}</p>
        <button
          onClick={() => navigate('/app/dashboard', { state: { view: 'jobs' } })}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#cbd5e1] border border-[#2e2e4a] rounded-lg hover:bg-[#1f1f33] mx-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>
      </div>
    );
  }

  const metaLabel = 'text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider';
  const actionBtn = 'flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#cbd5e1] border border-[#2e2e4a] rounded-lg hover:bg-[#1f1f33] transition-colors';
  const statusLabel = (s) => s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase());

  return (
    <div className="space-y-5 p-5 md:p-7 max-w-[1600px] mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/dashboard', { state: { view: 'jobs' } })}
            className="p-2 rounded-lg border border-[#2e2e4a] hover:bg-[#1f1f33] text-[#94a3b8]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-bold text-white">{job.jobNumber}</h1>
              <StatusBadge status={job.status} />
            </div>
            <p className="text-[13px] text-[#6b7280] mt-0.5">{job.title}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate(`/app/jobs/${id}/edit`)} className={actionBtn}>
            <Edit className="w-4 h-4" /> Edit
          </button>
          {/* Invoice: show linked badge OR create button depending on state */}
          {job.convertedToInvoiceId ? (
            <button
              onClick={() => navigate(`/app/invoices/${job.convertedToInvoiceId}`)}
              className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium bg-[#2a2a48] text-[#fcd34d] border border-[#f59e0b]/40 rounded-lg hover:bg-[rgba(245,158,11,0.15)] transition-colors"
            >
              <FileText className="w-4 h-4" />
              {linkedInvoice ? `Invoice: ${linkedInvoice.invoiceNumber}` : 'View Invoice'} →
            </button>
          ) : (job.status === 'completed' || job.status === 'invoiced') ? (
            <button
              onClick={handleCreateInvoice}
              disabled={creatingInvoice}
              className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-[#1a1a2e] bg-[#f59e0b] hover:bg-[#d97706] rounded-lg transition-colors disabled:opacity-50"
            >
              {creatingInvoice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              {creatingInvoice ? 'Creating…' : 'Create Invoice'}
            </button>
          ) : null}
          <button
            onClick={handleDelete}
            disabled={job.status === 'invoiced'}
            className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${
              showDeleteConfirm
                ? 'bg-[#ef4444] text-white hover:bg-[#dc2626] border border-[#ef4444]'
                : 'text-[#fca5a5] border border-[rgba(239,68,68,0.4)] hover:bg-[rgba(239,68,68,0.15)]'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Trash2 className="w-4 h-4" />
            {showDeleteConfirm ? 'Confirm Cancel' : 'Cancel Project'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left — main content */}
        <div className="lg:col-span-2 space-y-5">

          {/* Job details card */}
          <div className="bg-[#242438] rounded-xl border border-[#2e2e4a] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2e2e4a] flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#6b7280]" />
              <h3 className="text-[13px] font-semibold text-[#cbd5e1]">Project Information</h3>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {job.description && (
                <div className="sm:col-span-2">
                  <p className={metaLabel}>Description</p>
                  <p className="text-[13px] text-[#cbd5e1] mt-1 whitespace-pre-wrap">{job.description}</p>
                </div>
              )}
              <div>
                <p className={metaLabel}>Contact</p>
                <p className="text-[14px] font-medium text-white mt-0.5">{job.contactName || <span className="text-[#6b7280]">Not linked</span>}</p>
              </div>
              <div>
                <p className={metaLabel}>Assigned To</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <User className="w-3.5 h-3.5 text-[#6b7280]" />
                  <p className="text-[13px] font-medium text-[#cbd5e1]">{job.assignedToName || <span className="text-[#6b7280]">Unassigned</span>}</p>
                </div>
              </div>
              <div>
                <p className={metaLabel}>Scheduled Start</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-[#6b7280]" />
                  <p className="text-[13px] text-[#cbd5e1]">{fmtDateTime(job.scheduledStart)}</p>
                </div>
              </div>
              <div>
                <p className={metaLabel}>Scheduled End</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-[#6b7280]" />
                  <p className="text-[13px] text-[#cbd5e1]">{fmtDateTime(job.scheduledEnd)}</p>
                </div>
              </div>
              {(job.actualStart || job.actualEnd) && (
                <>
                  <div>
                    <p className={metaLabel}>Actual Start</p>
                    <p className="text-[13px] text-[#cbd5e1] mt-0.5">{fmtDateTime(job.actualStart)}</p>
                  </div>
                  <div>
                    <p className={metaLabel}>Actual End</p>
                    <p className="text-[13px] text-[#cbd5e1] mt-0.5">{fmtDateTime(job.actualEnd)}</p>
                  </div>
                </>
              )}
              {job.quoteNumber && (
                <div>
                  <p className={metaLabel}>Linked Quote</p>
                  <p className="text-[13px] text-[#f59e0b] font-medium mt-0.5">{job.quoteNumber}</p>
                </div>
              )}
              {job.notes && (
                <div className="sm:col-span-2">
                  <p className={metaLabel}>Notes</p>
                  <p className="text-[13px] text-[#94a3b8] mt-1 whitespace-pre-wrap">{job.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Time entries */}
          <TimeEntriesSection jobId={id} />

          {/* Parts */}
          <PartsSection jobId={id} />
        </div>

        {/* Right — meta + status actions */}
        <div className="space-y-5">
          <div className="bg-[#242438] rounded-xl border border-[#2e2e4a] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2e2e4a]">
              <h3 className="text-[13px] font-semibold text-[#cbd5e1]">Project Details</h3>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Project Number', value: job.jobNumber },
                { label: 'Created',    value: fmtDate(job.createdAt) },
                { label: 'Created By', value: job.createdByName || '—' },
                { label: 'Last Modified', value: fmtDate(job.updatedAt) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className={metaLabel}>{label}</p>
                  <p className="text-[13px] font-medium text-[#cbd5e1] mt-0.5">{value}</p>
                </div>
              ))}
              {job.totalTimeMinutes != null && (
                <div>
                  <p className={metaLabel}>Total Time Logged</p>
                  <p className="text-[13px] font-medium text-[#cbd5e1] mt-0.5">{fmtMinutes(job.totalTimeMinutes)}</p>
                </div>
              )}
              {job.totalPartsValue != null && (
                <div>
                  <p className={metaLabel}>Total Parts Value</p>
                  <p className="text-[13px] font-medium text-[#cbd5e1] mt-0.5">{fmt(job.totalPartsValue)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#242438] rounded-xl border border-[#2e2e4a] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2e2e4a]">
              <h3 className="text-[13px] font-semibold text-[#cbd5e1]">Change Status</h3>
            </div>
            <div className="p-5 space-y-2">
              {JOB_STATUSES.filter(s => s !== 'cancelled').map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={job.status === s || statusChanging}
                  className="w-full text-left px-3 py-2 text-[13px] font-medium text-[#cbd5e1] border border-[#2e2e4a] rounded-lg hover:bg-[#1f1f33] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {job.status === s ? `✓ ${statusLabel(s)}` : `Mark as ${statusLabel(s)}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
