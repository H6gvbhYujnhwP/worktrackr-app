import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, Plus, Trash2, Save, FileText } from 'lucide-react';
import QuickAddContactModal from './QuickAddContactModal';

// ── Design tokens ──────────────────────────────────────────────────────────────
const INPUT_CLS  = 'w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] text-[#111113] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017] transition-colors';
const LABEL_CLS  = 'block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5';
const SECTION_WRAP = 'bg-white rounded-xl border border-[#e5e7eb] overflow-hidden mb-5';
const SECTION_HEAD = 'px-6 py-4 border-b border-[#e5e7eb]';
const SECTION_BODY = 'px-6 py-5';
const GOLD_BTN   = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#d4a017] text-[#111113] text-[13px] font-semibold hover:bg-[#b8860b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const OUTLINE_BTN= 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#e5e7eb] bg-white text-[#374151] text-[13px] font-medium hover:bg-[#f9fafb] transition-colors disabled:opacity-50';

const STATUS_BADGE = {
  draft:    'bg-[#f3f4f6] text-[#6b7280]',
  sent:     'bg-[#dbeafe] text-[#1e40af]',
  accepted: 'bg-[#dcfce7] text-[#166534]',
  declined: 'bg-[#fee2e2] text-[#991b1b]',
};

export default function QuoteForm({ mode = 'create', initialData = null, onClearDraft = null }) {
  const navigate = useNavigate();
  const { id: quoteId } = useParams();
  const isEditMode = mode === 'edit' || quoteId;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [templates, setTemplates] = useState([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Filter products based on search
  const filteredProducts = products.filter(product => {
    if (!productSearch) return true;
    const searchLower = productSearch.toLowerCase();
    return (
      product.name?.toLowerCase().includes(searchLower) ||
      product.description?.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower)
    );
  });

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
  const [lineItems, setLineItems] = useState([
    { product_id: null, description: '', quantity: 1, unit_price: 0, discount_percent: 0, tax_rate: 20 }
  ]);

  // Fetch contacts on mount
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await fetch('/api/contacts', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          const mappedContacts = (data || []).map(contact => ({
            id: contact.id, name: contact.name, email: contact.email, phone: contact.phone
          }));
          setContacts(mappedContacts);
        }
      } catch (error) { console.error('Error fetching contacts:', error); }
    };

    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products?is_active=true&limit=1000', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        }
      } catch (error) { console.error('Error fetching products:', error); }
    };

    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/quote-templates?is_active=true', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setTemplates(data || []);
        }
      } catch (error) { console.error('Error fetching templates:', error); }
    };

    fetchContacts();
    fetchProducts();
    fetchTemplates();
  }, []);

  // Populate form with AI-generated draft data
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
          product_id: null,
          description: item.description || '',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          discount_percent: 0,
          tax_rate: item.tax_rate || 20,
          item_type: item.item_type || 'parts',
          hours: item.hours || null,
          hourly_rate: item.hourly_rate || null,
          recurrence: item.recurrence || null
        })));
      }
    }
  }, [initialData, isEditMode]);

  // Fetch existing quote data in edit mode
  useEffect(() => {
    console.log('=== useEffect triggered ===', 'isEditMode:', isEditMode, 'quoteId:', quoteId);
    if (isEditMode && quoteId) {
      const fetchQuote = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/quotes/${quoteId}`, { credentials: 'include' });
          if (response.ok) {
            const data = await response.json();
            const quote = data;
            setQuoteNumber(quote.quote_number);
            setContactName(quote.contact_name);
            setFormData({
              contact_id: quote.contact_id,
              title: quote.title || '',
              description: quote.description || '',
              valid_until: quote.valid_until ? quote.valid_until.split('T')[0] : '',
              status: quote.status,
              terms_conditions: quote.terms_conditions || '',
              notes: quote.notes || '',
              internal_notes: quote.internal_notes || ''
            });
            if (data.line_items && data.line_items.length > 0) {
              setLineItems(data.line_items.map(item => ({
                id: item.id,
                description: item.description || '',
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_percent: item.discount_percent || 0,
                tax_rate: item.tax_rate || 20
              })));
            }
          } else {
            alert('Failed to load quote');
            navigate('/app/dashboard', { state: { view: 'quotes' } });
          }
        } catch (error) {
          console.error('Error fetching quote:', error);
          alert('Failed to load quote');
          navigate('/app/dashboard', { state: { view: 'quotes' } });
        } finally {
          setLoading(false);
        }
      };
      fetchQuote();
    } else {
      console.log('=== CREATE MODE: Setting loading to false ===');
      setLoading(false);
      setTimeout(() => { console.log('=== CREATE MODE: Loading state after setLoading ===', loading); }, 100);
    }
  }, [isEditMode, quoteId, navigate]);

  // Add new line item
  const addLineItem = () => {
    setLineItems([...lineItems, { product_id: null, description: '', quantity: 1, unit_price: 0, discount_percent: 0, tax_rate: 20 }]);
  };

  // Remove line item
  const removeLineItem = (index) => {
    if (lineItems.length > 1) { setLineItems(lineItems.filter((_, i) => i !== index)); }
  };

  // Update line item
  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    const numericFields = ['quantity', 'unit_price', 'discount_percent', 'tax_rate'];
    updated[index] = { ...updated[index], [field]: numericFields.includes(field) ? parseFloat(value) || 0 : value };
    setLineItems(updated);
  };

  // Handle product selection
  const handleProductSelect = (index, productId) => {
    if (productId === 'custom') { updateLineItem(index, 'product_id', null); return; }
    const product = products.find(p => p.id === productId);
    if (product) {
      const updatedItems = [...lineItems];
      updatedItems[index] = {
        ...updatedItems[index],
        product_id: product.id,
        description: `${product.name}${product.description ? ' - ' + product.description : ''}`,
        quantity: product.default_quantity || 1,
        unit_price: product.client_price,
        tax_rate: product.tax_rate || 20
      };
      setLineItems(updatedItems);
    }
  };

  // Load template into quote
  const handleLoadTemplate = async (templateId) => {
    try {
      const response = await fetch(`/api/quote-templates/${templateId}`, { credentials: 'include' });
      if (response.ok) {
        const template = await response.json();
        const templateLineItems = template.default_line_items || [];
        const loadedLineItems = await Promise.all(
          templateLineItems.map(async (item) => {
            let unitPrice = 0;
            if (item.product_id) {
              const product = products.find(p => p.id === item.product_id);
              if (product) unitPrice = product.client_price || 0;
            }
            return { product_id: item.product_id || null, description: item.description || '', quantity: item.default_quantity || 1, unit_price: unitPrice, discount_percent: 0, tax_rate: 20 };
          })
        );
        if (loadedLineItems.length > 0) setLineItems(loadedLineItems);
        if (template.terms_and_conditions) {
          setFormData(prev => ({ ...prev, terms_conditions: template.terms_and_conditions }));
        }
        setShowTemplateSelector(false);
        alert(`Template "${template.name}" loaded successfully!`);
      } else { alert('Failed to load template'); }
    } catch (error) { console.error('Error loading template:', error); alert('Error loading template'); }
  };

  const calculateLineTotal   = (item)  => (item.quantity || 0) * (item.unit_price || 0);
  const calculateSubtotal    = ()      => lineItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  const calculateTax         = ()      => lineItems.reduce((sum, item) => { const ls = (item.quantity || 0) * (item.unit_price || 0); return sum + ls * ((item.tax_rate || 20) / 100); }, 0);
  const calculateTotal       = ()      => calculateSubtotal() + calculateTax();

  // Handle form submission
  const handleSubmit = useCallback(async (sendToContact = false) => {
    console.log('🎯 handleSubmit CALLED!', { sendToContact, formData, lineItems, loading, saving, timestamp: new Date().toISOString() });
    if (!formData.contact_id) { alert('Please select a contact'); return; }
    if (!formData.title) { alert('Please enter a quote title'); return; }
    const validLineItems = lineItems.filter(item => item.description && item.description.trim().length > 0);
    if (validLineItems.length === 0) { alert('Please add at least one line item with a description'); return; }
    setSaving(true);
    try {
      const sanitizedLineItems = validLineItems.map(item => ({
        product_id: item.product_id || undefined,
        description: item.description.trim(),
        quantity: parseFloat(item.quantity) || 1,
        unit_price: parseFloat(item.unit_price) || 0,
        discount_percent: parseFloat(item.discount_percent) || 0,
        tax_rate: parseFloat(item.tax_rate) || 20,
        sort_order: item.sort_order
      }));
      console.log('Sanitized line items:', sanitizedLineItems);
      const url    = isEditMode ? `/api/quotes/${quoteId}` : '/api/quotes';
      const method = isEditMode ? 'PUT' : 'POST';
      const payload = isEditMode ? {
        ...formData,
        line_items: sanitizedLineItems,
        status: sendToContact ? 'sent' : formData.status
      } : {
        contact_id: formData.contact_id,
        title: formData.title,
        description: formData.description || undefined,
        valid_until: formData.valid_until || undefined,
        terms_conditions: formData.terms_conditions || undefined,
        notes: formData.notes || undefined,
        internal_notes: formData.internal_notes || undefined,
        line_items: sanitizedLineItems
      };
      console.log('API payload:', JSON.stringify(payload, null, 2));
      const response = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const data = await response.json();
        const targetId = isEditMode ? quoteId : data.id;
        navigate(`/app/crm/quotes/${targetId}`);
      } else {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('API Error Response:', error);
        alert(`Error ${isEditMode ? 'updating' : 'creating'} quote: ${error.message || error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} quote:`, error);
      alert(`Failed to ${isEditMode ? 'update' : 'create'} quote. Please try again. Check console for details.`);
    } finally { setSaving(false); }
  }, [formData, lineItems, loading, saving, isEditMode, quoteId, navigate]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate('/app/dashboard', { state: { view: 'quotes' } })}
          className={OUTLINE_BTN}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Quotes
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[20px] font-bold text-[#111113]">
              {isEditMode ? `Edit Quote` : 'Create New Quote'}
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
            {/* Contact */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={LABEL_CLS} style={{ marginBottom: 0 }}>Contact *</label>
                {!isEditMode && (
                  <button
                    type="button"
                    onClick={() => setShowCreateContact(true)}
                    className="text-[12px] font-medium text-[#d4a017] hover:text-[#b8860b] transition-colors"
                  >
                    + Create New Contact
                  </button>
                )}
              </div>
              {isEditMode ? (
                <input className={`${INPUT_CLS} bg-[#fafafa] cursor-not-allowed`} value={contactName} disabled title="Cannot change contact after quote creation" />
              ) : (
                <Select value={formData.contact_id} onValueChange={(v) => setFormData({ ...formData, contact_id: v })}>
                  <SelectTrigger className="focus:ring-[#d4a017]/30 focus:border-[#d4a017]">
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.length === 0
                      ? <div className="p-2 text-[12px] text-[#9ca3af]">No contacts found. Create one first.</div>
                      : contacts.map(contact => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.company_name || contact.contact_name || contact.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Title */}
            <div>
              <label className={LABEL_CLS}>Quote Title *</label>
              <input className={INPUT_CLS} placeholder="e.g., Website Maintenance - January 2025" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className={LABEL_CLS}>Description</label>
              <textarea
                className={`${INPUT_CLS} min-h-[80px] resize-y`}
                placeholder="Brief description of the quote"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Valid Until */}
            <div>
              <label className={LABEL_CLS}>Valid Until *</label>
              <input type="date" className={INPUT_CLS} value={formData.valid_until} onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })} />
            </div>

            {/* Status (edit only) */}
            {isEditMode && (
              <div>
                <label className={LABEL_CLS}>Status</label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
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
            <p className="text-[12px] text-[#9ca3af] mt-0.5">Add products or services to this quote</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowTemplateSelector(!showTemplateSelector)}
              className={OUTLINE_BTN}
            >
              <FileText className="w-4 h-4" /> Load Template
            </button>
            <button type="button" onClick={addLineItem} className={GOLD_BTN}>
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
        </div>
        <div className={SECTION_BODY}>
          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <div key={index} className="border border-[#e5e7eb] rounded-xl p-4 bg-[#fafafa]">
                {/* Product selector */}
                <div className="mb-3">
                  <label className={LABEL_CLS}>Select Product (Optional)</label>
                  <Select
                    value={item.product_id || 'custom'}
                    onValueChange={(value) => { handleProductSelect(index, value); setProductSearch(''); }}
                    onOpenChange={(open) => { if (!open) setProductSearch(''); }}
                  >
                    <SelectTrigger className="focus:ring-[#d4a017]/30 focus:border-[#d4a017]">
                      <SelectValue placeholder="Select a product or enter custom item" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2 border-b border-[#e5e7eb]">
                        <input
                          type="text"
                          placeholder="Search products..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="w-full px-3 py-2 text-[13px] border border-[#e5e7eb] rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017]"
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                      <SelectItem value="custom">✏️ Custom Item (Enter Manually)</SelectItem>
                      {filteredProducts.length > 0
                        ? filteredProducts.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - £{(parseFloat(product.client_price) || 0).toFixed(2)}
                            {product.unit && ` (${product.unit})`}
                          </SelectItem>
                        ))
                        : <div className="px-2 py-4 text-[12px] text-[#9ca3af] text-center">No products found matching "{productSearch}"</div>
                      }
                    </SelectContent>
                  </Select>
                </div>

                {/* Item fields */}
                <div className="space-y-3">
                  <div>
                    <label className={LABEL_CLS}>
                      Item Description *
                      {item.product_id && <span className="ml-2 normal-case text-[#9ca3af]">(Auto-filled, editable)</span>}
                    </label>
                    <textarea
                      className={`${INPUT_CLS} min-h-[70px] resize-y`}
                      placeholder="e.g., Website Hosting - Annual Plan"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className={LABEL_CLS}>Quantity *</label>
                      <input type="number" min="1" step="1" className={INPUT_CLS} value={item.quantity} onChange={(e) => updateLineItem(index, 'quantity', e.target.value)} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Unit Price (£) *</label>
                      <input type="number" min="0" step="0.01" className={INPUT_CLS} value={item.unit_price} onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Tax Rate (%)</label>
                      <input type="number" min="0" max="100" step="1" className={INPUT_CLS} value={item.tax_rate} onChange={(e) => updateLineItem(index, 'tax_rate', e.target.value)} />
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1">Line Total</p>
                        <p className="text-[15px] font-bold text-[#111113]">£{calculateLineTotal(item).toFixed(2)}</p>
                      </div>
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#9ca3af] hover:bg-[#fee2e2] hover:text-red-600 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Template selector */}
          {showTemplateSelector && (
            <div className="mt-4 border border-[#e5e7eb] rounded-xl bg-[#fafafa] p-4">
              <h4 className="text-[13px] font-semibold text-[#111113] mb-3">Select a Template</h4>
              {templates.length === 0 ? (
                <p className="text-[13px] text-[#9ca3af]">No templates available. Create templates in CRM → Quote Templates.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {templates.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleLoadTemplate(template.id)}
                      className="w-full text-left p-3 hover:bg-[#fef9ee] rounded-lg border border-[#e5e7eb] flex items-center justify-between transition-colors"
                    >
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

          {/* Pricing summary */}
          <div className="mt-5 flex justify-end">
            <div className="w-full sm:w-72 space-y-2 bg-[#fafafa] rounded-xl border border-[#e5e7eb] p-4">
              <div className="flex justify-between text-[13px] text-[#6b7280]">
                <span>Subtotal</span>
                <span>£{calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[13px] text-[#6b7280]">
                <span>Tax (VAT)</span>
                <span>£{calculateTax().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[16px] font-bold text-[#111113] pt-2 border-t border-[#e5e7eb]">
                <span>Total</span>
                <span>£{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Terms & Conditions ─────────────────────────────────────────────── */}
      <div className={SECTION_WRAP}>
        <div className={SECTION_HEAD}>
          <h2 className="text-[15px] font-semibold text-[#111113]">Terms & Conditions</h2>
          <p className="text-[12px] text-[#9ca3af] mt-0.5">Standard terms that will appear on the quote</p>
        </div>
        <div className={SECTION_BODY}>
          <textarea
            rows={4}
            className={`${INPUT_CLS} min-h-[100px] resize-y`}
            value={formData.terms_conditions}
            onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
            placeholder="Enter terms and conditions..."
          />
        </div>
      </div>

      {/* ── Internal Notes ─────────────────────────────────────────────────── */}
      <div className={SECTION_WRAP}>
        <div className={SECTION_HEAD}>
          <h2 className="text-[15px] font-semibold text-[#111113]">Internal Notes</h2>
          <p className="text-[12px] text-[#9ca3af] mt-0.5">Notes for staff only (not visible to contact)</p>
        </div>
        <div className={SECTION_BODY}>
          <textarea
            rows={3}
            className={`${INPUT_CLS} min-h-[80px] resize-y`}
            value={formData.internal_notes}
            onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
            placeholder="Add any internal notes..."
          />
        </div>
      </div>

      {/* ── Action buttons ─────────────────────────────────────────────────── */}
      {console.log('=== RENDER: Button state ===', 'loading:', loading, 'saving:', saving, 'disabled:', saving || loading)}
      <div className="flex flex-col sm:flex-row gap-2.5 justify-end mb-8">
        <button
          type="button"
          onClick={() => navigate('/app/dashboard')}
          disabled={loading}
          className={OUTLINE_BTN}
        >
          Cancel
        </button>
        {isEditMode ? (
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={saving || loading}
            className={GOLD_BTN}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Updating...' : 'Update Quote'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={(e) => { console.log('🟢 Save & Send button clicked'); e.preventDefault(); e.stopPropagation(); handleSubmit(true); }}
              onMouseDown={() => console.log('🟡 Save & Send mouseDown')}
              disabled={saving}
              className={OUTLINE_BTN}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save & Send'}
            </button>
            <button
              type="button"
              onClick={(e) => { console.log('🟢 Save as Draft button clicked'); e.preventDefault(); e.stopPropagation(); handleSubmit(false); }}
              onMouseDown={() => console.log('🟡 Save as Draft mouseDown')}
              disabled={saving}
              className={GOLD_BTN}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>
          </>
        )}
      </div>

      {/* Quick Add Contact Modal */}
      <QuickAddContactModal
        isOpen={showCreateContact}
        onClose={() => setShowCreateContact(false)}
        onSave={async (newContact) => {
          try {
            const response = await fetch('/api/contacts', { credentials: 'include' });
            if (response.ok) {
              const data = await response.json();
              const mappedContacts = (data || []).map(contact => ({
                id: contact.id, name: contact.name, email: contact.email, phone: contact.phone
              }));
              setContacts(mappedContacts);
              if (newContact && newContact.id) {
                setFormData({ ...formData, contact_id: newContact.id });
              }
            }
          } catch (error) { console.error('Error refreshing contacts:', error); }
        }}
      />
    </div>
  );
}
