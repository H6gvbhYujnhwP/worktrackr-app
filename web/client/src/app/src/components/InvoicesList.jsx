// web/client/src/app/src/components/InvoicesList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Plus, Search, ChevronRight, Loader2, X, Calendar } from 'lucide-react';

// ── Normalisers ────────────────────────────────────────────────────────────────
function mapInvoiceLine(raw) {
  return {
    id:            raw.id,
    description:   raw.description,
    quantity:      parseFloat(raw.quantity || 0),
    unitPrice:     parseFloat(raw.unit_price || 0),
    lineTotal:     parseFloat(raw.line_total || 0),
    vatApplicable: raw.vat_applicable !== false,
    sortOrder:     raw.sort_order || 0,
  };
}

function mapInvoice(raw) {
  if (!raw) return null;
  return {
    id:            raw.id,
    invoiceNumber: raw.invoice_number,
    status:        raw.status,
    issueDate:     raw.issue_date,
    dueDate:       raw.due_date,
    subtotal:      parseFloat(raw.subtotal || 0),
    vatTotal:      parseFloat(raw.vat_total || 0),
    total:         parseFloat(raw.total || 0),
    notes:         raw.notes || '',
    contactName:   raw.contact_name || '',
    contactEmail:  raw.contact_email || '',
    contactPhone:  raw.contact_phone || '',
    jobNumber:     raw.job_number || '',
    jobTitle:      raw.job_title || '',
    jobId:         raw.job_id || null,
    contactId:     raw.contact_id || null,
    createdAt:     raw.created_at,
    updatedAt:     raw.updated_at,
    lines:         (raw.lines || []).map(mapInvoiceLine),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(amount) {
  return `£${parseFloat(amount || 0).toFixed(2)}`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_STYLES = {
  draft:   'bg-[#f3f4f6] text-[#6b7280]',
  sent:    'bg-[#dbeafe] text-[#1d4ed8]',
  paid:    'bg-[#dcfce7] text-[#15803d]',
  overdue: 'bg-[#fee2e2] text-[#dc2626]',
};

// ── Module-level StatusBadge ───────────────────────────────────────────────────
function StatusBadge({ status }) {
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}>
      {label}
    </span>
  );
}

// ── Module-level StatPill ──────────────────────────────────────────────────────
function StatPill({ label, value, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center px-4 py-2.5 rounded-xl border transition-colors ${
        active
          ? 'bg-[#fef9ee] border-[#d4a017]/40 text-[#b8860b]'
          : 'bg-white border-[#e5e7eb] text-[#6b7280] hover:bg-[#fafafa]'
      }`}
    >
      <span className={`text-[18px] font-bold leading-none ${active ? 'text-[#d4a017]' : 'text-[#111113]'}`}>{value}</span>
      <span className="text-[11px] mt-1 font-medium">{label}</span>
    </button>
  );
}

// ── Module-level NewInvoiceModal ───────────────────────────────────────────────
function NewInvoiceModal({ onClose, onCreated }) {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate]     = useState(thirtyDays);
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState('');

  const INPUT_CLS = 'w-full px-3 py-2 text-[13px] border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017]';
  const LABEL_CLS = 'block text-[11px] font-semibold text-[#6b7280] mb-1';

  const handleCreate = async () => {
    setSaving(true);
    setErr('');
    try {
      const r = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          issue_date: issueDate || null,
          due_date:   dueDate   || null,
          notes:      notes.trim() || null,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to create invoice');
      }
      const data = await r.json();
      onCreated(mapInvoice(data.invoice));
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-[#e5e7eb] w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb]">
          <h2 className="text-[14px] font-semibold text-[#111113]">New Invoice</h2>
          <button onClick={onClose} className="p-1 text-[#9ca3af] hover:text-[#374151]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Issue Date</label>
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={INPUT_CLS} />
            </div>
          </div>
          <div>
            <label className={LABEL_CLS}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Payment terms, project reference…"
              className={INPUT_CLS}
            />
          </div>
          {err && <p className="text-[12px] text-red-500">{err}</p>}
        </div>
        <div className="px-5 pb-5 flex items-center gap-2">
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-[#111113] bg-[#d4a017] hover:bg-[#b8860b] rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {saving ? 'Creating…' : 'Create Invoice'}
          </button>
          <button onClick={onClose} className="px-3 py-2 text-[13px] text-[#6b7280] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa]">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
const STATUS_FILTERS = ['all', 'draft', 'sent', 'paid', 'overdue'];

export default function InvoicesList() {
  const navigate = useNavigate();
  const [invoices, setInvoices]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch]           = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const fetchInvoices = useCallback(async (status) => {
    setLoading(true);
    setError(null);
    try {
      const qs = status && status !== 'all' ? `?status=${status}` : '';
      const r = await fetch(`/api/invoices${qs}`, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to load invoices');
      const data = await r.json();
      setInvoices((data.invoices || []).map(mapInvoice));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(statusFilter); }, [fetchInvoices, statusFilter]);

  // Stat counts (always computed against full list fetched for 'all' — but we
  // display them from local state so they reflect the current filter context).
  const counts = invoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {});
  const totalValue = invoices.reduce((sum, inv) => sum + inv.total, 0);

  const filtered = invoices.filter(inv => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.contactName.toLowerCase().includes(q) ||
      inv.jobNumber.toLowerCase().includes(q) ||
      inv.jobTitle.toLowerCase().includes(q)
    );
  });

  const handleCreated = (inv) => {
    setShowNewModal(false);
    navigate(`/app/invoices/${inv.id}`);
  };

  const TH = 'py-3 px-4 text-left text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider bg-[#fafafa]';
  const TH_R = 'py-3 px-4 text-right text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider bg-[#fafafa]';

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#fef9ee] rounded-lg flex items-center justify-center">
            <Receipt className="w-4 h-4 text-[#d4a017]" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-[#111113] leading-none">Invoices</h1>
            <p className="text-[12px] text-[#9ca3af] mt-0.5">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-[#111113] bg-[#d4a017] hover:bg-[#b8860b] rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatPill label="All"     value={invoices.length}          active={statusFilter === 'all'}     onClick={() => setStatusFilter('all')} />
        <StatPill label="Draft"   value={counts.draft   || 0}      active={statusFilter === 'draft'}   onClick={() => setStatusFilter('draft')} />
        <StatPill label="Sent"    value={counts.sent    || 0}      active={statusFilter === 'sent'}    onClick={() => setStatusFilter('sent')} />
        <StatPill label="Paid"    value={counts.paid    || 0}      active={statusFilter === 'paid'}    onClick={() => setStatusFilter('paid')} />
        <StatPill label="Overdue" value={counts.overdue || 0}      active={statusFilter === 'overdue'} onClick={() => setStatusFilter('overdue')} />
      </div>

      {/* Total value banner */}
      {!loading && invoices.length > 0 && (
        <div className="bg-[#fef9ee] border border-[#d4a017]/30 rounded-xl px-5 py-3 flex items-center justify-between">
          <span className="text-[13px] text-[#b8860b] font-medium">
            Total value {statusFilter !== 'all' ? `(${statusFilter})` : '(all invoices)'}
          </span>
          <span className="text-[18px] font-bold text-[#d4a017]">{fmt(totalValue)}</span>
        </div>
      )}

      {/* Search + table */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#e5e7eb] flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search invoices…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017]"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FILTERS.slice(1).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  statusFilter === s
                    ? 'bg-[#d4a017] text-[#111113] border-[#d4a017]'
                    : 'text-[#6b7280] border-[#e5e7eb] hover:bg-[#fafafa]'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-[#9ca3af]" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-[13px] text-red-500 mb-3">{error}</p>
            <button onClick={() => fetchInvoices(statusFilter)} className="text-[13px] text-[#d4a017] hover:underline">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="w-10 h-10 text-[#e5e7eb] mx-auto mb-3" />
            <p className="text-[14px] font-medium text-[#374151] mb-1">No invoices found</p>
            <p className="text-[13px] text-[#9ca3af]">
              {invoices.length === 0 ? 'Create your first invoice to get started.' : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className={TH}>Invoice #</th>
                  <th className={TH}>Contact</th>
                  <th className={TH}>Job</th>
                  <th className={TH}>Issue Date</th>
                  <th className={TH}>Due Date</th>
                  <th className={TH_R}>Total</th>
                  <th className={TH}>Status</th>
                  <th className={TH}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, idx) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/app/invoices/${inv.id}`)}
                    className={`border-b border-[#f3f4f6] hover:bg-[#fef9ee] cursor-pointer transition-colors ${idx % 2 === 1 ? 'bg-[#fafbfc]' : 'bg-white'}`}
                  >
                    <td className="py-3 px-4 font-semibold text-[#111113] whitespace-nowrap">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 text-[#374151]">{inv.contactName || <span className="text-[#9ca3af] italic">No contact</span>}</td>
                    <td className="py-3 px-4">
                      {inv.jobNumber
                        ? <span className="text-[#6b7280]">{inv.jobNumber}</span>
                        : <span className="text-[#9ca3af]">—</span>}
                    </td>
                    <td className="py-3 px-4 text-[#6b7280] whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-[#9ca3af]" />
                        {fmtDate(inv.issueDate)}
                      </span>
                    </td>
                    <td className={`py-3 px-4 whitespace-nowrap ${inv.status === 'overdue' ? 'text-red-600 font-medium' : 'text-[#6b7280]'}`}>
                      {fmtDate(inv.dueDate)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[#111113]">{fmt(inv.total)}</td>
                    <td className="py-3 px-4"><StatusBadge status={inv.status} /></td>
                    <td className="py-3 px-4">
                      <ChevronRight className="w-4 h-4 text-[#d4a017]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNewModal && (
        <NewInvoiceModal onClose={() => setShowNewModal(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
