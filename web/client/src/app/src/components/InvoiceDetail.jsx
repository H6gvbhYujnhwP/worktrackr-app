// web/client/src/app/src/components/InvoiceDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Receipt, Download, Trash2, CheckCircle, Send, AlertCircle, Loader2, User, Calendar, Briefcase } from 'lucide-react';

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

function toInputDate(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
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
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}>
      {label}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
const INPUT_CLS = 'w-full px-3 py-2 text-[13px] border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017]';
const LABEL_CLS = 'block text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [saving, setSaving]               = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Inline-edit state
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes]     = useState('');
  const [dirty, setDirty]     = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/invoices/${id}`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error('Failed to load invoice'); return r.json(); })
      .then(data => {
        const inv = mapInvoice(data.invoice);
        setInvoice(inv);
        setDueDate(toInputDate(inv.dueDate));
        setNotes(inv.notes || '');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaveEdits = async () => {
    setSaving(true);
    try {
      const r = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          due_date: dueDate || null,
          notes:    notes.trim() || null,
        }),
      });
      if (!r.ok) throw new Error('Save failed');
      const data = await r.json();
      const updated = mapInvoice(data.invoice);
      setInvoice(updated);
      setDueDate(toInputDate(updated.dueDate));
      setNotes(updated.notes || '');
      setDirty(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setStatusChanging(true);
    try {
      const r = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!r.ok) throw new Error('Failed to update status');
      const data = await r.json();
      setInvoice(mapInvoice(data.invoice));
    } catch (e) {
      alert(e.message);
    } finally {
      setStatusChanging(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) { setShowDeleteConfirm(true); return; }
    try {
      const r = await fetch(`/api/invoices/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!r.ok) throw new Error('Failed to delete');
      navigate('/app/invoices');
    } catch (e) {
      alert(e.message);
      setShowDeleteConfirm(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const r = await fetch(`/api/invoices/${id}/pdf`, { credentials: 'include' });
      if (!r.ok) throw new Error('PDF generation failed');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64 text-[13px] text-[#9ca3af]">Loading invoice…</div>;

  if (error || !invoice) {
    return (
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 text-center">
        <p className="text-[13px] text-red-600 mb-3">{error || 'Invoice not found'}</p>
        <button
          onClick={() => navigate('/app/invoices')}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa] mx-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </button>
      </div>
    );
  }

  const actionBtn = 'flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors';
  const metaLabel = 'text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider';

  // Context-sensitive status action buttons
  const statusActions = [];
  if (invoice.status === 'draft') {
    statusActions.push({ label: 'Mark as Sent', status: 'sent', icon: Send, cls: 'border border-[#bfdbfe] text-[#1d4ed8] hover:bg-[#eff6ff]' });
  }
  if (invoice.status === 'sent') {
    statusActions.push({ label: 'Mark as Paid',    status: 'paid',    icon: CheckCircle, cls: 'border border-[#bbf7d0] text-[#15803d] hover:bg-[#f0fdf4]' });
    statusActions.push({ label: 'Mark as Overdue', status: 'overdue', icon: AlertCircle, cls: 'border border-[#fecaca] text-[#dc2626] hover:bg-[#fef2f2]' });
  }
  if (invoice.status === 'overdue') {
    statusActions.push({ label: 'Mark as Paid', status: 'paid', icon: CheckCircle, cls: 'border border-[#bbf7d0] text-[#15803d] hover:bg-[#f0fdf4]' });
    statusActions.push({ label: 'Mark as Sent', status: 'sent', icon: Send,         cls: 'border border-[#bfdbfe] text-[#1d4ed8] hover:bg-[#eff6ff]' });
  }

  const TH = 'py-3 px-4 text-left text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider bg-[#fafafa]';
  const TH_R = 'py-3 px-4 text-right text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider bg-[#fafafa]';

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/invoices')}
            className="p-2 rounded-lg border border-[#e5e7eb] hover:bg-[#fafafa] text-[#6b7280]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[20px] font-bold text-[#111113]">{invoice.invoiceNumber}</h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-[12px] text-[#9ca3af] mt-0.5">
              Created {fmtDate(invoice.createdAt)}
              {invoice.contactName && ` · ${invoice.contactName}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {statusActions.map(({ label, status, icon: Icon, cls }) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              disabled={statusChanging}
              className={`${actionBtn} ${cls} disabled:opacity-50`}
            >
              {statusChanging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
              {label}
            </button>
          ))}
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className={`${actionBtn} bg-[#d4a017] text-[#111113] hover:bg-[#b8860b] disabled:opacity-50`}
          >
            {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {downloadingPdf ? 'Generating…' : 'Download PDF'}
          </button>
          <button
            onClick={handleDelete}
            className={`${actionBtn} ${
              showDeleteConfirm
                ? 'bg-red-600 text-white hover:bg-red-700 border border-red-600'
                : 'text-red-600 border border-red-200 hover:bg-red-50'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {showDeleteConfirm ? 'Confirm Delete' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left — lines + totals */}
        <div className="lg:col-span-2 space-y-5">

          {/* Info cards */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#9ca3af]" />
              <h3 className="text-[13px] font-semibold text-[#374151]">Invoice Details</h3>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <p className={metaLabel}>Contact</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <User className="w-3.5 h-3.5 text-[#9ca3af]" />
                  <p className="text-[14px] font-medium text-[#111113]">
                    {invoice.contactName || <span className="text-[#9ca3af] font-normal">No contact linked</span>}
                  </p>
                </div>
                {invoice.contactEmail && <p className="text-[12px] text-[#6b7280] mt-0.5 ml-5">{invoice.contactEmail}</p>}
                {invoice.contactPhone && <p className="text-[12px] text-[#6b7280] mt-0.5 ml-5">{invoice.contactPhone}</p>}
              </div>
              {invoice.jobNumber && (
                <div>
                  <p className={metaLabel}>Linked Job</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Briefcase className="w-3.5 h-3.5 text-[#9ca3af]" />
                    <p className="text-[14px] font-medium text-[#111113]">{invoice.jobNumber}</p>
                  </div>
                  {invoice.jobTitle && <p className="text-[12px] text-[#6b7280] mt-0.5 ml-5">{invoice.jobTitle}</p>}
                </div>
              )}
              <div>
                <p className={metaLabel}>Issue Date</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-[#9ca3af]" />
                  <p className="text-[13px] text-[#374151]">{fmtDate(invoice.issueDate)}</p>
                </div>
              </div>
              <div>
                <p className={metaLabel}>Due Date</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-[#9ca3af]" />
                  <p className={`text-[13px] font-medium ${invoice.status === 'overdue' ? 'text-red-600' : 'text-[#374151]'}`}>
                    {fmtDate(invoice.dueDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Lines table */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[13px] font-semibold text-[#374151]">Line Items</h3>
            </div>
            {invoice.lines.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-[#9ca3af]">No line items on this invoice</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#e5e7eb]">
                      <th className={TH}>Description</th>
                      <th className={TH_R}>Qty</th>
                      <th className={TH_R}>Unit Price</th>
                      <th className={TH}>VAT</th>
                      <th className={TH_R}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines.map((line, idx) => (
                      <tr
                        key={line.id}
                        className={`border-b border-[#f3f4f6] ${idx % 2 === 1 ? 'bg-[#fafbfc]' : 'bg-white'}`}
                      >
                        <td className="py-3 px-4 text-[#374151]">{line.description}</td>
                        <td className="py-3 px-4 text-right text-[#6b7280]">
                          {line.quantity % 1 === 0 ? line.quantity.toFixed(0) : line.quantity.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-[#6b7280]">{fmt(line.unitPrice)}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${line.vatApplicable ? 'bg-[#dbeafe] text-[#1d4ed8]' : 'bg-[#f3f4f6] text-[#9ca3af]'}`}>
                            {line.vatApplicable ? '20%' : 'No VAT'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-[#111113]">{fmt(line.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals panel */}
            <div className="border-t-2 border-[#e5e7eb] bg-[#fafafa]">
              <div className="flex justify-end px-5 py-4">
                <div className="space-y-2 min-w-[200px]">
                  <div className="flex justify-between gap-8 text-[13px] text-[#6b7280]">
                    <span>Subtotal</span>
                    <span className="font-medium text-[#374151]">{fmt(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between gap-8 text-[13px] text-[#6b7280]">
                    <span>VAT (20%)</span>
                    <span className="font-medium text-[#374151]">{fmt(invoice.vatTotal)}</span>
                  </div>
                  <div className="flex justify-between gap-8 text-[15px] font-bold text-[#111113] border-t border-[#e5e7eb] pt-2 mt-2">
                    <span>Total</span>
                    <span className="text-[#d4a017]">{fmt(invoice.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — edit fields */}
        <div className="space-y-5">

          {/* Invoice meta */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[13px] font-semibold text-[#374151]">Invoice Info</h3>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Invoice Number', value: invoice.invoiceNumber },
                { label: 'Created', value: fmtDate(invoice.createdAt) },
                { label: 'Last Modified', value: fmtDate(invoice.updatedAt) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className={metaLabel}>{label}</p>
                  <p className="text-[13px] font-medium text-[#374151] mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Editable fields */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[13px] font-semibold text-[#374151]">Edit Details</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={LABEL_CLS}>Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => { setDueDate(e.target.value); setDirty(true); }}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Notes</label>
                <textarea
                  value={notes}
                  onChange={e => { setNotes(e.target.value); setDirty(true); }}
                  rows={4}
                  placeholder="Payment terms, references, instructions…"
                  className={INPUT_CLS}
                />
              </div>
              {dirty && (
                <button
                  onClick={handleSaveEdits}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-[#111113] bg-[#d4a017] hover:bg-[#b8860b] rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              )}
            </div>
          </div>

          {/* Status actions (also in sidebar for easy access) */}
          {statusActions.length > 0 && (
            <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#e5e7eb]">
                <h3 className="text-[13px] font-semibold text-[#374151]">Change Status</h3>
              </div>
              <div className="p-5 space-y-2">
                {statusActions.map(({ label, status, icon: Icon, cls }) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={statusChanging}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium rounded-lg border transition-colors disabled:opacity-50 ${cls}`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
