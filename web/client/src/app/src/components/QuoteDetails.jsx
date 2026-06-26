import PageHero from './PageHero.jsx';
// web/client/src/app/src/components/QuoteDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Send, Download, Trash2, Calendar, FileText, Sparkles, Loader2, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import SendQuoteModal from './SendQuoteModal';

// ── Module-level helpers ───────────────────────────────────────────────────────
function fmt(amount) { return `£${parseFloat(amount || 0).toFixed(2)}`; }

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }) {
  const map = {
    draft:    'bg-[#1f1f33] text-[#94a3b8]',
    sent:     'bg-[#dbeafe] text-[#1d4ed8]',
    accepted: 'bg-[#dcfce7] text-[#15803d]',
    declined: 'bg-[#fee2e2] text-[#dc2626]',
    expired:  'bg-[#fff7ed] text-[#9a3412]',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${map[status] || map.draft}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft'}
    </span>
  );
}

// Line items table (customer-facing view) — module-level
function LineItemsTable({ lineItems }) {
  if (!lineItems || lineItems.length === 0) {
    return <p className="py-6 text-center text-[13px] text-[#6b7280]">No items found</p>;
  }

  // Group by section
  const materials = lineItems.filter(i => i.item_type === 'material' || i.item_type === 'parts');
  const labour    = lineItems.filter(i => i.item_type !== 'material' && i.item_type !== 'parts');

  const renderSection = (title, items) => {
    if (items.length === 0) return null;
    return (
      <>
        <tr className="bg-[#1f1f33] border-y border-[#2e2e4a]">
          <td colSpan={6} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
            {title}
          </td>
        </tr>
        {items.map((item, idx) => {
          const qty   = parseFloat(item.quantity || 0);
          const price = parseFloat(item.unit_price || 0);
          const disc  = parseFloat(item.discount_percent || 0);
          const total = qty * price * (1 - disc / 100);
          const hasVat = (item.tax_rate || 0) > 0;

          return (
            <React.Fragment key={item.id || idx}>
              <tr className={`border-b border-[#2e2e4a] text-[13px] ${idx % 2 === 1 ? 'bg-[#1f1f33]' : 'bg-[#242438]'}`}>
                <td className="py-3 px-4 text-white font-medium">
                  {item.description}
                  {hasVat && <span className="ml-1.5 text-[10px] font-semibold text-[#f59e0b] bg-[rgba(245,158,11,0.08)] px-1 py-0.5 rounded">+VAT</span>}
                </td>
                <td className="py-3 px-4 text-[#6b7280] text-[12px] hidden sm:table-cell">
                  {item.unit || '—'}
                </td>
                <td className="py-3 px-4 text-right text-[#cbd5e1]">{qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2)}</td>
                <td className="py-3 px-4 text-right text-[#cbd5e1]">
                  {fmt(price)}
                  {disc > 0 && <span className="ml-1 text-[11px] text-emerald-600">-{disc}%</span>}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-white">{fmt(total)}</td>
              </tr>
              {item.line_notes && (
                <tr className={idx % 2 === 1 ? 'bg-[#1f1f33]' : 'bg-[#242438]'}>
                  <td colSpan={5} className="px-4 pb-2 pt-0 text-[12px] text-[#6b7280] italic pl-6">
                    {item.line_notes}
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#2e2e4a]">
            {[
              { label: 'Item',    cls: 'text-left' },
              { label: 'Unit',    cls: 'text-left hidden sm:table-cell' },
              { label: 'Qty',     cls: 'text-right' },
              { label: 'Price',   cls: 'text-right' },
              { label: 'Total',   cls: 'text-right' },
            ].map(h => (
              <th key={h.label} className={`py-3 px-4 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider bg-[#1f1f33] ${h.cls}`}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {renderSection('Materials & Parts', materials)}
          {renderSection('Labour & Other Charges', labour)}
        </tbody>
      </table>
    </div>
  );
}

// Internal margin analysis panel — module-level (staff-only, collapsible)
function MarginPanel({ lineItems }) {
  const [open, setOpen] = useState(false);

  const rows = (lineItems || []).map(item => {
    const qty       = parseFloat(item.quantity || 0);
    const sell      = parseFloat(item.unit_price || 0);
    const buy       = parseFloat(item.buy_cost || 0);
    const disc      = parseFloat(item.discount_percent || 0);
    const sellNet   = sell * (1 - disc / 100);
    const lineRev   = qty * sellNet;
    const lineCost  = qty * buy;
    const lineProfit = lineRev - lineCost;
    const margin    = lineRev > 0 ? (lineProfit / lineRev) * 100 : null;
    return { ...item, lineRev, lineCost, lineProfit, margin };
  });

  const totalRev    = rows.reduce((s, r) => s + r.lineRev, 0);
  const totalCost   = rows.reduce((s, r) => s + r.lineCost, 0);
  const totalProfit = totalRev - totalCost;
  const totalMargin = totalRev > 0 ? (totalProfit / totalRev) * 100 : null;
  const hasBuyCosts = rows.some(r => r.lineCost > 0);

  return (
    <div className="bg-[#242438] rounded-xl border border-[#2e2e4a] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#1f1f33] transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#6b7280]" />
          <span className="text-[13px] font-semibold text-[#cbd5e1]">Internal — Margin Analysis</span>
          <span className="text-[11px] text-[#6b7280]">Staff only</span>
        </div>
        <div className="flex items-center gap-3">
          {totalMargin !== null && (
            <span className={`text-[12px] font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {totalMargin.toFixed(1)}% margin · {fmt(totalProfit)} profit
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-[#6b7280]" /> : <ChevronDown className="w-4 h-4 text-[#6b7280]" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-[#2e2e4a] overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[#1f1f33] border-b border-[#2e2e4a]">
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Item</th>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280] hidden sm:table-cell">Supplier</th>
                <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Revenue</th>
                {hasBuyCosts && <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Cost</th>}
                <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Profit</th>
                <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">Margin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className={`border-b border-[#2e2e4a] ${idx % 2 === 1 ? 'bg-[#1f1f33]' : ''}`}>
                  <td className="px-4 py-2 text-[#cbd5e1]">{row.description}</td>
                  <td className="px-4 py-2 text-[#6b7280] hidden sm:table-cell">{row.supplier || '—'}</td>
                  <td className="px-4 py-2 text-right text-[#cbd5e1]">{fmt(row.lineRev)}</td>
                  {hasBuyCosts && <td className="px-4 py-2 text-right text-[#6b7280]">{row.lineCost > 0 ? fmt(row.lineCost) : '—'}</td>}
                  <td className={`px-4 py-2 text-right font-medium ${row.lineProfit > 0 ? 'text-emerald-600' : row.lineProfit < 0 ? 'text-red-600' : 'text-[#6b7280]'}`}>
                    {row.lineCost > 0 ? fmt(row.lineProfit) : '—'}
                  </td>
                  <td className={`px-4 py-2 text-right font-medium ${row.margin !== null && row.margin > 0 ? 'text-emerald-600' : row.margin < 0 ? 'text-red-600' : 'text-[#6b7280]'}`}>
                    {row.margin !== null && row.lineCost > 0 ? `${row.margin.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#2e2e4a] bg-[#1f1f33] font-semibold">
                <td className="px-4 py-2.5 text-[#cbd5e1]">Total</td>
                <td className="hidden sm:table-cell"></td>
                <td className="px-4 py-2.5 text-right text-[#cbd5e1]">{fmt(totalRev)}</td>
                {hasBuyCosts && <td className="px-4 py-2.5 text-right text-[#6b7280]">{fmt(totalCost)}</td>}
                <td className={`px-4 py-2.5 text-right ${totalProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(totalProfit)}</td>
                <td className={`px-4 py-2.5 text-right ${totalMargin !== null && totalMargin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {totalMargin !== null ? `${totalMargin.toFixed(1)}%` : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function QuoteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [summary, setSummary]           = useState('');
  const [summarising, setSummarising]   = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/quotes/${id}`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error('Failed to fetch quote'); return r.json(); })
      .then(data => setQuote(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      const r = await fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      if (!r.ok) throw new Error('Failed');
      setQuote(await r.json());
    } catch { alert('Failed to update quote status.'); }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) { setShowDeleteConfirm(true); return; }
    try {
      const r = await fetch(`/api/quotes/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      navigate('/app/dashboard', { state: { view: 'quotes' } });
    } catch { alert('Failed to delete quote.'); setShowDeleteConfirm(false); }
  };

  const handleSummarise = async () => {
    setSummarising(true); setSummary('');
    try {
      const res = await fetch(`/api/summaries/quote/${id}`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSummary(data.summary);
    } catch { setSummary('Could not generate summary. Please try again.'); }
    finally { setSummarising(false); }
  };

  const handleDuplicate = async () => {
    try {
      const orig = quote;
      const payload = {
        contact_id: orig.contact_id,
        title: `${orig.title} (Copy)`,
        description: orig.description,
        valid_until: orig.valid_until,
        terms_conditions: orig.terms_conditions,
        internal_notes: orig.internal_notes,
        line_items: (orig.line_items || []).map(item => ({
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          buy_cost: item.buy_cost,
          supplier: item.supplier,
          discount_percent: item.discount_percent,
          tax_rate: item.tax_rate,
          item_type: item.item_type,
          line_notes: item.line_notes,
        }))
      };
      const r = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error('Failed');
      const newQ = await r.json();
      navigate(`/app/crm/quotes/${newQ.id}/edit`);
    } catch { alert('Failed to duplicate quote.'); }
  };

  if (loading) return <div className="flex justify-center items-center h-64 text-[13px] text-[#6b7280]">Loading quote…</div>;

  if (error || !quote) {
    return (
      <div className="bg-[#242438] rounded-xl border border-[#2e2e4a] p-6 text-center">
        <p className="text-[13px] text-red-600 mb-3">{error || 'Quote not found'}</p>
        <button onClick={() => navigate('/app/dashboard', { state: { view: 'quotes' } })}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#cbd5e1] border border-[#2e2e4a] rounded-lg hover:bg-[#1f1f33] mx-auto">
          <ArrowLeft className="w-4 h-4" /> Back to Quotes
        </button>
      </div>
    );
  }

  const actionBtn = "flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#cbd5e1] border border-[#2e2e4a] rounded-lg hover:bg-[#1f1f33] transition-colors";
  const metaLabel = "text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider";

  // Compute totals for footer
  const lineItems  = quote.line_items || [];
  const subtotalEx = lineItems.reduce((s, i) => {
    const qty = parseFloat(i.quantity||0), sell = parseFloat(i.unit_price||0), disc = parseFloat(i.discount_percent||0);
    return s + qty * sell * (1 - disc/100);
  }, 0);
  const vatTotal = lineItems.reduce((s, i) => {
    const qty = parseFloat(i.quantity||0), sell = parseFloat(i.unit_price||0), disc = parseFloat(i.discount_percent||0);
    const net = qty * sell * (1 - disc/100);
    return s + ((i.tax_rate||0) > 0 ? net * 0.2 : 0);
  }, 0);
  const totalIncVat = subtotalEx + vatTotal;

  return (
    <div className="p-5 md:p-7 min-h-full bg-[#1a1a2e]">
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/app/dashboard', { state: { view: 'quotes' } })}
            className="p-2 rounded-lg border border-[#2e2e4a] hover:bg-[#1f1f33] text-[#94a3b8]">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-bold text-white">{quote.quote_number}</h1>
              <StatusBadge status={quote.status} />
            </div>
            <p className="text-[13px] text-[#6b7280] mt-0.5">{quote.title}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate(`/app/crm/quotes/${id}/edit`)} className={actionBtn}><Edit className="w-4 h-4" /> Edit</button>
          <button onClick={() => setShowSendModal(true)} className={actionBtn}><Send className="w-4 h-4" /> Send</button>
          <button onClick={() => window.open(`/api/quotes/${id}/pdf`, '_blank')} className={actionBtn}><Download className="w-4 h-4" /> PDF</button>
          <button onClick={handleDelete}
            className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${
              showDeleteConfirm ? 'bg-red-600 text-white hover:bg-red-700 border border-red-600' : 'text-red-600 border border-red-200 hover:bg-red-50'
            }`}>
            <Trash2 className="w-4 h-4" />
            {showDeleteConfirm ? 'Confirm Delete' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left — main content */}
        <div className="lg:col-span-2 space-y-5">

          {/* Customer */}
          <div className="bg-[#242438] rounded-xl border border-[#2e2e4a] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2e2e4a]">
              <h3 className="text-[13px] font-semibold text-[#cbd5e1]">Customer Information</h3>
            </div>
            <div className="p-5 space-y-1.5">
              <p className="text-[15px] font-semibold text-white">{quote.customer_name || quote.company_name || quote.contact_name}</p>
              {quote.customer_email && <p className="text-[13px] text-[#94a3b8]"><span className="font-medium text-[#cbd5e1]">Email:</span> {quote.customer_email}</p>}
              {quote.customer_phone && <p className="text-[13px] text-[#94a3b8]"><span className="font-medium text-[#cbd5e1]">Phone:</span> {quote.customer_phone}</p>}
              {quote.customer_address && <p className="text-[13px] text-[#94a3b8]"><span className="font-medium text-[#cbd5e1]">Address:</span> {quote.customer_address}</p>}
            </div>
          </div>

          {/* Line items */}
          <div className="bg-[#242438] rounded-xl border border-[#2e2e4a] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2e2e4a]">
              <h3 className="text-[13px] font-semibold text-[#cbd5e1]">Items</h3>
              {quote.description && <p className="text-[12px] text-[#6b7280] mt-0.5">{quote.description}</p>}
            </div>

            <LineItemsTable lineItems={quote.line_items} />

            {/* Totals footer */}
            <div className="border-t border-[#2e2e4a] flex justify-end">
              <div className="w-full sm:w-72 p-4 space-y-1.5">
                <div className="flex justify-between text-[13px] text-[#94a3b8]">
                  <span>Subtotal ex VAT</span>
                  <span>{fmt(subtotalEx)}</span>
                </div>
                <div className="flex justify-between text-[13px] text-[#6b7280]">
                  <span>VAT (20%)</span>
                  <span>{fmt(vatTotal)}</span>
                </div>
                <div className="flex justify-between text-[16px] font-bold text-white pt-2 border-t border-[#2e2e4a]">
                  <span>Total inc VAT</span>
                  <span>{fmt(totalIncVat)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Internal margin analysis */}
          <MarginPanel lineItems={quote.line_items} />

          {/* Terms */}
          {quote.terms_conditions && (
            <div className="bg-[#242438] rounded-xl border border-[#2e2e4a] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#2e2e4a]">
                <h3 className="text-[13px] font-semibold text-[#cbd5e1]">Terms & Conditions</h3>
              </div>
              <div className="p-5 text-[13px] text-[#94a3b8] whitespace-pre-wrap">{quote.terms_conditions}</div>
            </div>
          )}

          {/* Internal notes */}
          {quote.internal_notes && (
            <div className="bg-[#242438] rounded-xl border border-[#2e2e4a] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#2e2e4a]">
                <h3 className="text-[13px] font-semibold text-[#cbd5e1]">Internal Notes</h3>
                <p className="text-[11px] text-[#6b7280] mt-0.5">Only visible to staff</p>
              </div>
              <div className="p-5 text-[13px] text-[#94a3b8] whitespace-pre-wrap">{quote.internal_notes}</div>
            </div>
          )}
        </div>

        {/* Right — meta + actions */}
        <div className="space-y-5">
          <div className="bg-[#242438] rounded-xl border border-[#2e2e4a] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2e2e4a]">
              <h3 className="text-[13px] font-semibold text-[#cbd5e1]">Quote Details</h3>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Quote Date',    value: fmtDate(quote.quote_date || quote.created_at) },
                { label: 'Valid Until',   value: fmtDate(quote.valid_until) },
                { label: 'Created By',    value: quote.created_by_name || '—' },
                { label: 'Last Modified', value: fmtDate(quote.updated_at) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className={metaLabel}>{label}</p>
                  <p className="text-[13px] font-medium text-[#cbd5e1] mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#242438] rounded-xl border border-[#2e2e4a] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2e2e4a]">
              <h3 className="text-[13px] font-semibold text-[#cbd5e1]">Quick Actions</h3>
            </div>
            <div className="p-5 space-y-2">
              {[
                { label: 'Mark as Sent',     status: 'sent' },
                { label: 'Mark as Accepted', status: 'accepted' },
                { label: 'Mark as Declined', status: 'declined' },
              ].map(({ label, status }) => (
                <button key={status} onClick={() => handleStatusChange(status)} disabled={quote.status === status}
                  className="w-full text-left px-3 py-2 text-[13px] font-medium text-[#cbd5e1] border border-[#2e2e4a] rounded-lg hover:bg-[#1f1f33] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {label}
                </button>
              ))}
              <button onClick={handleDuplicate}
                className="w-full text-left px-3 py-2 text-[13px] font-medium text-[#cbd5e1] border border-[#2e2e4a] rounded-lg hover:bg-[#1f1f33] transition-colors">
                Duplicate Quote
              </button>

              <div className="border-t border-[#2e2e4a] pt-3 mt-1">
                <button onClick={handleSummarise} disabled={summarising}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-[#f59e0b] text-[#f59e0b] hover:bg-[rgba(245,158,11,0.08)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {summarising
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Summarising…</>
                    : <><Sparkles className="w-4 h-4" /> Summarise for Customer</>}
                </button>
                {summary && (
                  <div className="mt-3 bg-[rgba(245,158,11,0.08)] border border-[#f59e0b]/30 rounded-xl p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#f59e0b] mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> AI Summary
                    </p>
                    <p className="text-[13px] text-[#cbd5e1] leading-relaxed">{summary}</p>
                  </div>
                )}
              </div>

              {quote.status === 'accepted' && (
                <>
                  <div className="border-t border-[#2e2e4a] pt-3 mt-3">
                    <p className={`${metaLabel} mb-2`}>Workflow</p>
                  </div>
                  <button className="w-full text-left flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-white bg-[#f59e0b] hover:bg-[#d97706] rounded-lg transition-colors"
                    onClick={() => {
                      const uid = prompt('Enter assigned user ID:');
                      const dt  = prompt('Enter scheduled date (YYYY-MM-DD):');
                      if (uid && dt) {
                        fetch(`/api/quotes/${id}/schedule-work`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ assigned_user_id: uid, scheduled_date: dt }) })
                          .then(() => window.location.reload())
                          .catch(() => alert('Failed to schedule work'));
                      }
                    }}>
                    <Calendar className="w-4 h-4" /> Schedule Work
                  </button>
                  <button className="w-full text-left flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[#cbd5e1] border border-[#2e2e4a] rounded-lg hover:bg-[#1f1f33] transition-colors"
                    onClick={() => {
                      if (confirm('Create invoice from this quote?')) {
                        fetch(`/api/quotes/${id}/create-invoice`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({}) })
                          .then(() => window.location.reload())
                          .catch(() => alert('Failed to create invoice'));
                      }
                    }}>
                    <FileText className="w-4 h-4" /> Create Invoice
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSendModal && (
        <SendQuoteModal quote={quote} onClose={() => setShowSendModal(false)} onSend={() => window.location.reload()} />
      )}
    </div>
    </div>
  );
}
