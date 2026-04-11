import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, Plus, Trash2, Save, FileText, Package, Wrench, StickyNote, Sparkles, Tag } from 'lucide-react';
import QuickAddContactModal from './QuickAddContactModal';

// ── Design tokens ──────────────────────────────────────────────────────────────
const INPUT_CLS   = 'w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] text-[#111113] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017] transition-colors';
const LABEL_CLS   = 'block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5';
const SECTION_WRAP = 'bg-white rounded-xl border border-[#e5e7eb] overflow-hidden mb-5';
const SECTION_HEAD = 'px-6 py-4 border-b border-[#e5e7eb]';
const SECTION_BODY = 'px-6 py-5';
const GOLD_BTN    = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#d4a017] text-[#111113] text-[13px] font-semibold hover:bg-[#b8860b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const OUTLINE_BTN = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#e5e7eb] bg-white text-[#374151] text-[13px] font-medium hover:bg-[#f9fafb] transition-colors disabled:opacity-50';

const STATUS_BADGE = {
  draft:    'bg-[#f3f4f6] text-[#6b7280]',
  sent:     'bg-[#dbeafe] text-[#1e40af]',
  accepted: 'bg-[#dcfce7] text-[#166534]',
  declined: 'bg-[#fee2e2] text-[#991b1b]',
};

// ── Line item helpers ──────────────────────────────────────────────────────────
const ITEM_TYPES = [
  { value: 'material',      label: 'Material' },
  { value: 'labour',        label: 'Labour' },
  { value: 'expense',       label: 'Expense' },
  { value: 'subcontractor', label: 'Subcontractor' },
];

const UNIT_OPTIONS = ['hrs', 'days', 'ea', 'm', 'm²', 'm³', 'kg', 'set', 'lot', 'pack', 'visit'];

function isMaterialType(type) {
  return type === 'material' || type === 'parts';
}

function calcLineTotal(item) {
  const base = (item.quantity || 0) * (item.unit_price || 0);
  const disc = item.discount_percent || 0;
  return base * (1 - disc / 100);
}

function calcLineProfit(item) {
  const sellAfterDisc = (item.unit_price || 0) * (1 - (item.discount_percent || 0) / 100);
  return (sellAfterDisc - (item.buy_price || 0)) * (item.quantity || 0);
}

function newItem(type) {
  return {
    product_id:        null,
    description:       '',
    supplier:          '',
    item_type:         type,
    quantity:          1,
    unit:              '',
    buy_price:         0,
    unit_price:        0,
    discount_percent:  0,
    vat_enabled:       false,
    line_notes:        '',
    _showNotes:        false,
    // Badge / lock state — frontend-only, never sent to API
    ai_generated:      false,
    catalogue_sourced: false,
    locked:            false,
  };
}

// ── Module-level sub-components (sub-component rule) ──────────────────────────

function VatPill({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      title={enabled ? 'VAT included — click to remove' : 'No VAT — click to add 20%'}
      className={`inline-flex items-center justify-center w-full px-1.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
        enabled
          ? 'bg-[#d4a017] text-[#111113] hover:bg-[#b8860b]'
          : 'bg-[#f3f4f6] text-[#9ca3af] hover:bg-[#e5e7eb]'
      }`}
    >
      {enabled ? '+VAT' : 'Ex'}
    </button>
  );
}

const CELL_IN   = 'w-full bg-transparent text-[13px] text-[#111113] placeholder-[#d1d5db] focus:outline-none p-0 min-w-0';
const CELL_IN_R = `${CELL_IN} text-right`;

// Returns a React Fragment with a data row + optional notes sub-row
function LineItemRows({ item, globalIndex, onUpdate, onRemove, canRemove }) {
  const lineTotal = calcLineTotal(item);
  const profit    = calcLineProfit(item);
  const belowCost = item.unit_price > 0 && item.unit_price < item.buy_price;
  const hasNotes  = !!(item.line_notes && item.line_notes.trim());
  const hasBadges = item.ai_generated || item.catalogue_sourced;

  return (
    <>
      <tr className="border-b border-[#f3f4f6] hover:bg-[#fefcf5] group transition-colors">
        {/* Description — includes AI / Catalogue badges when present */}
        <td className="px-3 py-2 min-w-[140px]">
          {hasBadges && (
            <div className="flex items-center gap-1 mb-1">
              {item.ai_generated && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-[#fef9ee] text-[#b8860b] border border-[#d4a017]/30 px-1.5 py-0.5 rounded"
                  title="AI-generated — edit any field to clear">
                  <Sparkles className="w-2.5 h-2.5" /> AI
                </span>
              )}
              {item.catalogue_sourced && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded"
                  title="Price from product catalogue — edit any field to clear">
                  <Tag className="w-2.5 h-2.5" /> Catalogue
                </span>
              )}
            </div>
          )}
          <input
            className={CELL_IN}
            placeholder="Description…"
            value={item.description}
            onChange={e => onUpdate(globalIndex, 'description', e.target.value)}
          />
        </td>
        {/* Supplier */}
        <td className="px-2 py-2 w-20 hidden sm:table-cell">
          <input
            className={CELL_IN}
            placeholder="Supplier"
            value={item.supplier}
            onChange={e => onUpdate(globalIndex, 'supplier', e.target.value)}
          />
        </td>
        {/* Type */}
        <td className="px-2 py-2 w-28 hidden md:table-cell">
          <select
            className="w-full bg-transparent text-[12px] text-[#374151] focus:outline-none cursor-pointer"
            value={item.item_type}
            onChange={e => onUpdate(globalIndex, 'item_type', e.target.value)}
          >
            {ITEM_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </td>
        {/* Qty */}
        <td className="px-2 py-2 w-12">
          <input
            type="number" min="0" step="any"
            className={CELL_IN_R}
            value={item.quantity}
            onChange={e => onUpdate(globalIndex, 'quantity', e.target.value)}
          />
        </td>
        {/* Unit */}
        <td className="px-2 py-2 w-16 hidden sm:table-cell">
          <input
            list="unit-options"
            className={CELL_IN}
            placeholder="hrs"
            value={item.unit}
            onChange={e => onUpdate(globalIndex, 'unit', e.target.value)}
          />
          <datalist id="unit-options">
            {UNIT_OPTIONS.map(u => <option key={u} value={u} />)}
          </datalist>
        </td>
        {/* Buy £ */}
        <td className="px-2 py-2 w-18 hidden lg:table-cell">
          <input
            type="number" min="0" step="0.01"
            className={CELL_IN_R}
            placeholder="0.00"
            value={item.buy_price || ''}
            onChange={e => onUpdate(globalIndex, 'buy_price', e.target.value)}
          />
        </td>
        {/* Sell £ */}
        <td className="px-2 py-2 w-18">
          <input
            type="number" min="0" step="0.01"
            className={`${CELL_IN_R} ${belowCost ? 'text-red-600 font-semibold' : ''}`}
            placeholder="0.00"
            value={item.unit_price || ''}
            onChange={e => onUpdate(globalIndex, 'unit_price', e.target.value)}
          />
        </td>
        {/* Disc % */}
        <td className="px-2 py-2 w-12 hidden md:table-cell">
          <input
            type="number" min="0" max="100" step="1"
            className={CELL_IN_R}
            placeholder="0"
            value={item.discount_percent || ''}
            onChange={e => onUpdate(globalIndex, 'discount_percent', e.target.value)}
          />
        </td>
        {/* Total */}
        <td className="px-2 py-2 w-20 text-right text-[13px] font-semibold text-[#111113] select-none">
          £{lineTotal.toFixed(2)}
        </td>
        {/* Profit */}
        <td className={`px-2 py-2 w-20 text-right text-[12px] font-medium select-none hidden lg:table-cell ${
          profit > 0 ? 'text-emerald-600' : profit < 0 ? 'text-red-600' : 'text-[#c9cdd6]'
        }`}>
          {profit !== 0 ? `£${profit.toFixed(2)}` : '—'}
        </td>
        {/* VAT */}
        <td className="px-2 py-2 w-12 hidden sm:table-cell">
          <VatPill
            enabled={item.vat_enabled}
            onChange={v => onUpdate(globalIndex, 'vat_enabled', v)}
          />
        </td>
        {/* Notes toggle + Delete */}
        <td className="px-1 py-2 w-14">
          <div className="flex items-center justify-end gap-0.5">
            <button
              type="button"
              onClick={() => onUpdate(globalIndex, '_showNotes', !item._showNotes)}
              title="Toggle line notes"
              className={`p-1 rounded transition-colors ${
                hasNotes || item._showNotes
                  ? 'text-[#d4a017] hover:bg-[#fef9ee]'
                  : 'opacity-0 group-hover:opacity-100 text-[#9ca3af] hover:bg-[#f3f4f6]'
              }`}
            >
              <StickyNote className="w-3.5 h-3.5" />
            </button>
            {canRemove && (
              <button
                type="button"
                onClick={() => onRemove(globalIndex)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#9ca3af] hover:text-red-500 hover:bg-[#fee2e2] transition-all"
                title="Remove line"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Notes sub-row */}
      {item._showNotes && (
        <tr className="border-b border-[#f3f4f6] bg-[#fffdf5]">
          <td colSpan={20} className="px-3 pb-2 pt-0">
            <textarea
              className="w-full text-[12px] text-[#374151] bg-transparent border border-[#e5e7eb] rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#d4a017]/40 focus:border-[#d4a017] resize-none placeholder-[#c9cdd6]"
              rows={2}
              placeholder="Line notes — shown on quote and PDF (e.g. installation details, part numbers, access requirements)"
              value={item.line_notes}
              onChange={e => onUpdate(globalIndex, 'line_notes', e.target.value)}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function SectionHeaderRow({ icon: Icon, title, count, onAdd, addLabel }) {
  return (
    <tr className="bg-[#fafafa] border-y border-[#e5e7eb]">
      <td colSpan={20} className="px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-3.5 h-3.5 text-[#9ca3af]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">{title}</span>
            {count > 0 && (
              <span className="text-[11px] text-[#b0b7c3]">{count} item{count !== 1 ? 's' : ''}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#d4a017] hover:text-[#b8860b] hover:bg-[#fef9ee] rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            {addLabel}
          </button>
        </div>
      </td>
    </tr>
  );
}

function EmptySectionRow({ message }) {
  return (
    <tr>
      <td colSpan={20} className="px-4 py-3 text-[12px] text-[#c9cdd6] italic select-none">
        {message}
      </td>
    </tr>
  );
}

function QuoteTotals({ lineItems }) {
  const totalBuyIn    = lineItems.reduce((s, i) => s + (i.buy_price || 0) * (i.quantity || 0), 0);
  const subtotalExVat = lineItems.reduce((s, i) => s + calcLineTotal(i), 0);
  const vatTotal      = lineItems.reduce((s, i) => i.vat_enabled ? s + calcLineTotal(i) * 0.2 : s, 0);
  const totalIncVat   = subtotalExVat + vatTotal;
  const totalProfit   = subtotalExVat - totalBuyIn;
  const marginPct     = subtotalExVat > 0 ? (totalProfit / subtotalExVat) * 100 : 0;
  const hasBuyPrices  = lineItems.some(i => (i.buy_price || 0) > 0);

  return (
    <div className="mt-5 flex justify-end">
      <div className="w-full sm:w-80 bg-[#fafafa] rounded-xl border border-[#e5e7eb] overflow-hidden text-[13px]">
        {hasBuyPrices && (
          <div className="px-4 py-2.5 border-b border-[#e5e7eb] flex justify-between text-[#9ca3af]">
            <span>Total buy-in</span>
            <span>£{totalBuyIn.toFixed(2)}</span>
          </div>
        )}
        <div className="px-4 py-2.5 border-b border-[#e5e7eb] flex justify-between text-[#374151]">
          <span>Subtotal ex VAT</span>
          <span className="font-medium">£{subtotalExVat.toFixed(2)}</span>
        </div>
        <div className="px-4 py-2.5 border-b border-[#e5e7eb] flex justify-between text-[#9ca3af]">
          <span>VAT (20%)</span>
          <span>£{vatTotal.toFixed(2)}</span>
        </div>
        <div className="px-4 py-3 border-b border-[#e5e7eb] flex justify-between font-bold text-[15px] text-[#111113]">
          <span>Total inc VAT</span>
          <span>£{totalIncVat.toFixed(2)}</span>
        </div>
        {hasBuyPrices && (
          <div className={`px-4 py-2.5 flex justify-between text-[12px] font-semibold ${
            totalProfit >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
          }`}>
            <span>
              Profit
              {subtotalExVat > 0 && (
                <span className="font-normal ml-1 opacity-70">({marginPct.toFixed(1)}% margin)</span>
              )}
            </span>
            <span>£{totalProfit.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function QuoteForm({ mode = 'create', initialData = null, onClearDraft = null }) {
  const navigate = useNavigate();
  const { id: quoteId } = useParams();
  const isEditMode = mode === 'edit' || !!quoteId;
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [contacts, setContacts]   = useState([]);
  const [products, setProducts]   = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState('');
  const [contactName, setContactName] = useState('');

  const [formData, setFormData] = useState({
    contact_id: '',
    title: '',
    description: '',
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft',
    terms_conditions: 'Payment due within 30 days of invoice date.\nAll prices are in GBP (£).\nGoods remain the property of the company until paid in full.',
    notes: '',
    internal_notes: ''
  });

  const [lineItems, setLineItems] = useState([newItem('material')]);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const r = await fetch('/api/contacts', { credentials: 'include' });
        if (r.ok) {
          const data = await r.json();
          setContacts((data || []).map(c => ({ id: c.id, name: c.name, email: c.email, phone: c.phone })));
        }
      } catch (e) { console.error('Error fetching contacts:', e); }
    };
    const fetchProducts = async () => {
      try {
        const r = await fetch('/api/products?is_active=true&limit=1000', { credentials: 'include' });
        if (r.ok) { const d = await r.json(); setProducts(d.products || []); }
      } catch (e) { console.error('Error fetching products:', e); }
    };
    const fetchTemplates = async () => {
      try {
        const r = await fetch('/api/quote-templates?is_active=true', { credentials: 'include' });
        if (r.ok) { const d = await r.json(); setTemplates(d || []); }
      } catch (e) { console.error('Error fetching templates:', e); }
    };
    fetchContacts();
    fetchProducts();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (initialData && !isEditMode) {
      setFormData(prev => ({
        ...prev,
        title: initialData.title || '',
        description: initialData.description || '',
        terms_conditions: initialData.terms_conditions || prev.terms_conditions,
        notes: initialData.notes || ''
      }));
      if (initialData.line_items && initialData.line_items.length > 0) {
        setLineItems(initialData.line_items.map(item => ({
          ...newItem(item.item_type || 'material'),
          description:       item.description || '',
          supplier:          item.supplier || '',
          item_type:         item.item_type || 'material',
          quantity:          item.quantity || 1,
          unit:              item.unit || '',
          buy_price:         parseFloat(item.buy_price || item.buy_cost) || 0,
          unit_price:        parseFloat(item.unit_price) || 0,
          discount_percent:  parseFloat(item.discount_percent) || 0,
          vat_enabled:       (item.tax_rate || 0) > 0,
          line_notes:        item.line_notes || '',
          _showNotes:        !!(item.line_notes),
          // Badge / lock state from AI prefill
          ai_generated:      item.ai_generated      === true,
          catalogue_sourced: item.catalogue_sourced === true,
          locked:            item.locked            === true,
        })));
      }
    }
  }, [initialData, isEditMode]);

  useEffect(() => {
    if (isEditMode && quoteId) {
      setLoading(true);
      fetch(`/api/quotes/${quoteId}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
          setQuoteNumber(data.quote_number);
          setContactName(data.contact_name);
          setFormData({
            contact_id: data.contact_id,
            title: data.title || '',
            description: data.description || '',
            valid_until: data.valid_until ? data.valid_until.split('T')[0] : '',
            status: data.status,
            terms_conditions: data.terms_conditions || '',
            notes: data.notes || '',
            internal_notes: data.internal_notes || ''
          });
          if (data.line_items && data.line_items.length > 0) {
            setLineItems(data.line_items.map(item => ({
              id: item.id,
              product_id: item.product_id || null,
              description: item.description || '',
              supplier: item.supplier || '',
              item_type: item.item_type || 'parts',
              quantity: item.quantity,
              unit: item.unit || '',
              buy_price: parseFloat(item.buy_cost) || 0,
              unit_price: item.unit_price,
              discount_percent: parseFloat(item.discount_percent) || 0,
              vat_enabled: (item.tax_rate || 0) > 0,
              line_notes: item.line_notes || '',
              _showNotes: !!(item.line_notes),
            })));
          }
        })
        .catch(() => navigate('/app/dashboard', { state: { view: 'quotes' } }))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isEditMode, quoteId, navigate]);

  const addMaterialItem = () => setLineItems(prev => [...prev, newItem('material')]);
  const addLabourItem   = () => setLineItems(prev => [...prev, newItem('labour')]);

  const removeLineItem = (index) => {
    setLineItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };

  const updateLineItem = (index, field, value) => {
    setLineItems(prev => {
      const updated = [...prev];
      const current = updated[index];
      const numericFields = ['quantity', 'unit_price', 'buy_price', 'discount_percent'];

      // If the row carries AI or Catalogue badges and the user touches a real field,
      // permanently clear both badges and mark the row locked.
      const badgeFields = ['description','supplier','item_type','quantity','unit','buy_price','unit_price','discount_percent','vat_enabled','line_notes'];
      const clearBadges = (current.ai_generated || current.catalogue_sourced) && badgeFields.includes(field);

      updated[index] = {
        ...current,
        [field]: numericFields.includes(field) ? (parseFloat(value) || 0) : value,
        ...(clearBadges ? { ai_generated: false, catalogue_sourced: false, locked: true } : {}),
      };
      return updated;
    });
  };

  const handleLoadTemplate = async (templateId) => {
    try {
      const r = await fetch(`/api/quote-templates/${templateId}`, { credentials: 'include' });
      if (!r.ok) return;
      const template = await r.json();
      const items = (template.default_line_items || []).map(item => {
        let unitPrice = 0;
        if (item.product_id) {
          const product = products.find(p => p.id === item.product_id);
          if (product) unitPrice = product.client_price || 0;
        }
        return {
          ...newItem(item.item_type || 'material'),
          description: item.description || '',
          quantity: item.default_quantity || 1,
          unit_price: unitPrice,
        };
      });
      if (items.length > 0) setLineItems(items);
      if (template.terms_and_conditions) {
        setFormData(prev => ({ ...prev, terms_conditions: template.terms_and_conditions }));
      }
      setShowTemplateSelector(false);
    } catch (e) { console.error('Error loading template:', e); }
  };

  const handleSubmit = useCallback(async (sendToContact = false) => {
    if (!formData.contact_id) { alert('Please select a contact'); return; }
    if (!formData.title)      { alert('Please enter a quote title'); return; }
    const validItems = lineItems.filter(i => i.description && i.description.trim().length > 0);
    if (validItems.length === 0) { alert('Please add at least one line item with a description'); return; }

    setSaving(true);
    try {
      const sanitizedLineItems = validItems.map((item, i) => ({
        id:               item.id || undefined,
        product_id:       item.product_id || undefined,
        description:      item.description.trim(),
        quantity:         parseFloat(item.quantity) || 1,
        unit:             item.unit || undefined,
        unit_price:       parseFloat(item.unit_price) || 0,
        buy_cost:         parseFloat(item.buy_price) || 0,
        supplier:         item.supplier || undefined,
        item_type:        item.item_type || 'material',
        tax_rate:         item.vat_enabled ? 20 : 0,
        discount_percent: parseFloat(item.discount_percent) || 0,
        line_notes:       item.line_notes || undefined,
        sort_order:       i,
        // ai_generated, catalogue_sourced, locked are frontend-only — never sent to API
      }));

      const url    = isEditMode ? `/api/quotes/${quoteId}` : '/api/quotes';
      const method = isEditMode ? 'PUT' : 'POST';
      const payload = isEditMode
        ? { ...formData, line_items: sanitizedLineItems, status: sendToContact ? 'sent' : formData.status }
        : {
            contact_id: formData.contact_id,
            title: formData.title,
            description: formData.description || undefined,
            valid_until: formData.valid_until || undefined,
            terms_conditions: formData.terms_conditions || undefined,
            notes: formData.notes || undefined,
            internal_notes: formData.internal_notes || undefined,
            ticket_id: initialData?.ticket_id || undefined,
            ai_generated: initialData?.created_via === 'ai' ? true : undefined,
            ai_context: initialData?.ai_context_used || undefined,
            line_items: sanitizedLineItems,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        navigate(`/app/crm/quotes/${isEditMode ? quoteId : data.id}`);
      } else {
        const err = await res.json().catch(() => ({ message: 'Unknown error' }));
        alert(`Error ${isEditMode ? 'updating' : 'creating'} quote: ${err.message || err.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('Error saving quote:', e);
      alert('Failed to save quote. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [formData, lineItems, isEditMode, quoteId, navigate, initialData]);

  const materialItems = lineItems.map((item, i) => ({ item, i })).filter(({ item }) => isMaterialType(item.item_type));
  const labourItems   = lineItems.map((item, i) => ({ item, i })).filter(({ item }) => !isMaterialType(item.item_type));

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <div className="w-8 h-8 border-2 border-[#d4a017] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[#9ca3af] text-sm">Loading quote…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <button type="button" onClick={() => navigate('/app/dashboard', { state: { view: 'quotes' } })} className={OUTLINE_BTN}>
          <ArrowLeft className="w-4 h-4" /> Back to Quotes
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[20px] font-bold text-[#111113]">
              {isEditMode ? 'Edit Quote' : 'Create New Quote'}
            </h1>
            {isEditMode && quoteNumber && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${STATUS_BADGE[formData.status] || 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                {quoteNumber}
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#9ca3af] mt-0.5">
            {isEditMode ? 'Update quote details and line items' : 'Fill in the details below to create a quote for your contact'}
          </p>
        </div>
      </div>

      {/* ── Quote Information ──────────────────────────────────────────────── */}
      <div className={SECTION_WRAP}>
        <div className={SECTION_HEAD}>
          <h2 className="text-[15px] font-semibold text-[#111113]">Quote Information</h2>
          <p className="text-[12px] text-[#9ca3af] mt-0.5">Basic quote details and contact selection</p>
        </div>
        <div className={SECTION_BODY}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={LABEL_CLS} style={{ marginBottom: 0 }}>Contact *</label>
                {!isEditMode && (
                  <button type="button" onClick={() => setShowCreateContact(true)}
                    className="text-[12px] font-medium text-[#d4a017] hover:text-[#b8860b] transition-colors">
                    + Create New Contact
                  </button>
                )}
              </div>
              {isEditMode ? (
                <input className={`${INPUT_CLS} bg-[#fafafa] cursor-not-allowed`} value={contactName} disabled />
              ) : (
                <Select value={formData.contact_id} onValueChange={v => setFormData({ ...formData, contact_id: v })}>
                  <SelectTrigger className="focus:ring-[#d4a017]/30 focus:border-[#d4a017]">
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.length === 0
                      ? <div className="p-2 text-[12px] text-[#9ca3af]">No contacts found. Create one first.</div>
                      : contacts.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.company_name || c.contact_name || c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <label className={LABEL_CLS}>Quote Title *</label>
              <input className={INPUT_CLS} placeholder="e.g., Network Installation — June 2025"
                value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
            </div>

            <div className="md:col-span-2">
              <label className={LABEL_CLS}>Description</label>
              <textarea className={`${INPUT_CLS} min-h-[80px] resize-y`}
                placeholder="Brief description of the work covered by this quote"
                value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </div>

            <div>
              <label className={LABEL_CLS}>Valid Until *</label>
              <input type="date" className={INPUT_CLS} value={formData.valid_until}
                onChange={e => setFormData({ ...formData, valid_until: e.target.value })} />
            </div>

            {isEditMode && (
              <div>
                <label className={LABEL_CLS}>Status</label>
                <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="focus:ring-[#d4a017]/30 focus:border-[#d4a017]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Line Items ─────────────────────────────────────────────────────── */}
      <div className={SECTION_WRAP}>
        <div className={`${SECTION_HEAD} flex items-center justify-between`}>
          <div>
            <h2 className="text-[15px] font-semibold text-[#111113]">Line Items</h2>
            <p className="text-[12px] text-[#9ca3af] mt-0.5">
              Materials &amp; parts · Labour &amp; other charges ·
              <span className="text-[#c9cdd6] ml-1">🗒 note icon per row · sell price turns red if below buy-in</span>
            </p>
          </div>
          <button type="button" onClick={() => setShowTemplateSelector(!showTemplateSelector)} className={OUTLINE_BTN}>
            <FileText className="w-4 h-4" /> Load Template
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px] border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                <th className="px-3 py-2 text-left   text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Description</th>
                <th className="px-2 py-2 text-left   text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] w-20  hidden sm:table-cell">Supplier</th>
                <th className="px-2 py-2 text-left   text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] w-28  hidden md:table-cell">Type</th>
                <th className="px-2 py-2 text-right  text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] w-12">Qty</th>
                <th className="px-2 py-2 text-left   text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] w-16  hidden sm:table-cell">Unit</th>
                <th className="px-2 py-2 text-right  text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] w-18  hidden lg:table-cell">Buy £</th>
                <th className="px-2 py-2 text-right  text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] w-18">Sell £</th>
                <th className="px-2 py-2 text-right  text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] w-12  hidden md:table-cell">Disc%</th>
                <th className="px-2 py-2 text-right  text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] w-20">Total</th>
                <th className="px-2 py-2 text-right  text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] w-20  hidden lg:table-cell">Profit</th>
                <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] w-12  hidden sm:table-cell">VAT</th>
                <th className="w-14"></th>
              </tr>
            </thead>
            <tbody>
              <SectionHeaderRow icon={Package} title="Materials & parts"
                count={materialItems.length} onAdd={addMaterialItem} addLabel="Add material" />
              {materialItems.map(({ item, i }) => (
                <LineItemRows key={i} item={item} globalIndex={i}
                  onUpdate={updateLineItem} onRemove={removeLineItem} canRemove={lineItems.length > 1} />
              ))}
              {materialItems.length === 0 && (
                <EmptySectionRow message="No materials or parts yet — click 'Add material' above" />
              )}

              <SectionHeaderRow icon={Wrench} title="Labour & other charges"
                count={labourItems.length} onAdd={addLabourItem} addLabel="Add charge" />
              {labourItems.map(({ item, i }) => (
                <LineItemRows key={i} item={item} globalIndex={i}
                  onUpdate={updateLineItem} onRemove={removeLineItem} canRemove={lineItems.length > 1} />
              ))}
              {labourItems.length === 0 && (
                <EmptySectionRow message="No labour or charges yet — click 'Add charge' above" />
              )}
            </tbody>
          </table>
        </div>

        <div className={SECTION_BODY}>
          {showTemplateSelector && (
            <div className="mb-5 border border-[#e5e7eb] rounded-xl bg-[#fafafa] p-4">
              <h4 className="text-[13px] font-semibold text-[#111113] mb-3">Select a Template</h4>
              {templates.length === 0 ? (
                <p className="text-[13px] text-[#9ca3af]">No templates available. Create templates in CRM → Quote Templates.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {templates.map(template => (
                    <button key={template.id} type="button" onClick={() => handleLoadTemplate(template.id)}
                      className="w-full text-left p-3 hover:bg-[#fef9ee] rounded-lg border border-[#e5e7eb] flex items-center justify-between transition-colors">
                      <div>
                        <p className="text-[13px] font-medium text-[#111113]">{template.name}</p>
                        {template.sector && <p className="text-[12px] text-[#9ca3af]">{template.sector}</p>}
                        <p className="text-[11px] text-[#9ca3af] mt-0.5">{template.default_line_items?.length || 0} items</p>
                      </div>
                      <FileText className="w-4 h-4 text-[#9ca3af] flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <QuoteTotals lineItems={lineItems} />
        </div>
      </div>

      {/* ── Terms & Conditions ─────────────────────────────────────────────── */}
      <div className={SECTION_WRAP}>
        <div className={SECTION_HEAD}>
          <h2 className="text-[15px] font-semibold text-[#111113]">Terms & Conditions</h2>
          <p className="text-[12px] text-[#9ca3af] mt-0.5">Standard terms that will appear on the quote</p>
        </div>
        <div className={SECTION_BODY}>
          <textarea rows={4} className={`${INPUT_CLS} min-h-[100px] resize-y`}
            value={formData.terms_conditions} placeholder="Enter terms and conditions…"
            onChange={e => setFormData({ ...formData, terms_conditions: e.target.value })} />
        </div>
      </div>

      {/* ── Internal Notes ─────────────────────────────────────────────────── */}
      <div className={SECTION_WRAP}>
        <div className={SECTION_HEAD}>
          <h2 className="text-[15px] font-semibold text-[#111113]">Internal Notes</h2>
          <p className="text-[12px] text-[#9ca3af] mt-0.5">Staff only — not visible to the contact</p>
        </div>
        <div className={SECTION_BODY}>
          <textarea rows={3} className={`${INPUT_CLS} min-h-[80px] resize-y`}
            value={formData.internal_notes} placeholder="Add any internal notes…"
            onChange={e => setFormData({ ...formData, internal_notes: e.target.value })} />
        </div>
      </div>

      {/* ── Action buttons ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2.5 justify-end mb-8">
        <button type="button" onClick={() => navigate('/app/dashboard')} className={OUTLINE_BTN}>
          Cancel
        </button>
        {isEditMode ? (
          <button type="button" onClick={() => handleSubmit(false)} disabled={saving} className={GOLD_BTN}>
            <Save className="w-4 h-4" />
            {saving ? 'Updating…' : 'Update Quote'}
          </button>
        ) : (
          <>
            <button type="button" onClick={() => handleSubmit(true)} disabled={saving} className={OUTLINE_BTN}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save & Send'}
            </button>
            <button type="button" onClick={() => handleSubmit(false)} disabled={saving} className={GOLD_BTN}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save as Draft'}
            </button>
          </>
        )}
      </div>

      <QuickAddContactModal
        isOpen={showCreateContact}
        onClose={() => setShowCreateContact(false)}
        onSave={async (newContact) => {
          try {
            const r = await fetch('/api/contacts', { credentials: 'include' });
            if (r.ok) {
              const data = await r.json();
              setContacts((data || []).map(c => ({ id: c.id, name: c.name, email: c.email, phone: c.phone })));
              if (newContact?.id) setFormData(prev => ({ ...prev, contact_id: newContact.id }));
            }
          } catch (e) { console.error('Error refreshing contacts:', e); }
        }}
      />
    </div>
  );
}
