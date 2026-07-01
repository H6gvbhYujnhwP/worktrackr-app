// web/client/src/app/src/components/InvoicesList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import DatePicker from './DatePicker.jsx';
import { useNavigate } from 'react-router-dom';
import { Receipt, Plus, Search, ChevronRight, Loader2, X, Calendar } from 'lucide-react';
import PageHero, { HeroButtonPrimary } from './PageHero.jsx';

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
  draft:   'bg-[rgba(107,114,128,0.20)] text-[#cbd5e1]',
  sent:    'bg-[rgba(59,130,246,0.20)] text-[#93c5fd]',
  paid:    'bg-[rgba(16,185,129,0.20)] text-[#6ee7b7]',
  overdue: 'bg-[rgba(239,68,68,0.20)] text-[#fca5a5]',
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
          ? 'bg-[rgba(245,158,11,0.15)] border-[#f59e0b] text-[#fcd34d]'
          : 'bg-[#242438] border-[#2e2e4a] text-[#94a3b8] hover:bg-[#2a2a48]'
      }`}
    >
      <span className={`text-[18px] font-bold leading-none ${active ? 'text-[#fcd34d]' : 'text-white'}`}>{value}</span>
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

  const INPUT_CLS = 'w-full px-3 py-2 text-[13px] border border-[#2e2e4a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#f59e0b]';
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
      <div className="bg-[#242438] rounded-xl border border-[#2e2e4a] w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e2e4a]">
          <h2 className="text-[14px] font-semibold text-[#111113]">New Invoice</h2>
          <button onClick={onClose} className="p-1 text-[#9ca3af] hover:text-[#cbd5e1]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Issue Date</label>
              <DatePicker value={issueDate} onChange={setIssueDate} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Due Date</label>
              <DatePicker value={dueDate} onChange={setDueDate} className={INPUT_CLS} />
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
          <button onClick={onClose} className="px-3 py-2 text-[13px] text-[#6b7280] border border-[#2e2e4a] rounded-lg hover:bg-[#1f1f33]">
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

  const TH = 'py-3 px-4 text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider bg-[#1f1f33]';
  const TH_R = 'py-3 px-4 text-right text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider bg-[#1f1f33]';

  return (
    <div className="space-y-5 p-5 md:p-7 min-h-full bg-[#1a1a2e]">

      {/* Header */}
      <PageHero
        title="Invoices"
        icon={Receipt}
        meta={[{ label: `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}` }]}
        actions={<HeroButtonPrimary icon={Plus} onClick={() => setShowNewModal(true)}>New Invoice</HeroButtonPrimary>}
        compact
      />

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
        <div className="bg-[rgba(245,158,11,0.10)] border border-[rgba(245,158,11,0.30)] rounded-xl px-5 py-3 flex items-center justify-between">
          <span className="text-[13px] text-[#fcd34d] font-medium">
            Total value {statusFilter !== 'all' ? `(${statusFilter})` : '(all invoices)'}
          </span>
          <span className="text-[18px] font-bold text-[#f59e0b]">{fmt(totalValue)}</span>
        </div>
      )}

      {/* Search + table */}
      <div className="bg-[#242438] rounded-xl border border-[#2e2e4a] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2e2e4a] flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b7280]" />
            <input
              type="text"
              placeholder="Search invoices…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-[#2e2e4a] rounded-lg bg-[#1a1a2e] text-white placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/30 focus:border-[#f59e0b]"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FILTERS.slice(1).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  statusFilter === s
                    ? 'bg-[#f59e0b] text-[#1a1a2e] border-[#f59e0b]'
                    : 'text-[#94a3b8] border-[#2e2e4a] hover:bg-[#2a2a48]'
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
            <Receipt className="w-10 h-10 text-[#3a3a5c] mx-auto mb-3" />
            <p className="text-[14px] font-medium text-[#cbd5e1] mb-1">No invoices found</p>
            <p className="text-[13px] text-[#6b7280]">
              {invoices.length === 0 ? 'Create your first invoice to get started.' : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#2e2e4a]">
                  <th className={TH}>Invoice #</th>
                  <th className={TH}>Contact</th>
                  <th className={TH}>Project</th>
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
                    className="border-b border-[#2e2e4a] hover:bg-[#2a2a48] cursor-pointer transition-colors bg-[#242438]"
                  >
                    <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 text-[#cbd5e1]">{inv.contactName || <span className="text-[#6b7280] italic">No contact</span>}</td>
                    <td className="py-3 px-4">
                      {inv.jobNumber
                        ? <span className="text-[#94a3b8]">{inv.jobNumber}</span>
                        : <span className="text-[#6b7280]">—</span>}
                    </td>
                    <td className="py-3 px-4 text-[#94a3b8] whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-[#6b7280]" />
                        {fmtDate(inv.issueDate)}
                      </span>
                    </td>
                    <td className={`py-3 px-4 whitespace-nowrap ${inv.status === 'overdue' ? 'text-[#fca5a5] font-medium' : 'text-[#94a3b8]'}`}>
                      {fmtDate(inv.dueDate)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-white">{fmt(inv.total)}</td>
                    <td className="py-3 px-4"><StatusBadge status={inv.status} /></td>
                    <td className="py-3 px-4">
                      <ChevronRight className="w-4 h-4 text-[#f59e0b]" />
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
