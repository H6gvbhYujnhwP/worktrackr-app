import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';

export default function QuoteForm({ mode = 'create' }) {
  const navigate = useNavigate();
  const { id: quoteId } = useParams();
  const isEditMode = mode === 'edit' || quoteId;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  
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
  const [customerName, setCustomerName] = useState('');
  const [formData, setFormData] = useState({
    customer_id: '',
    title: '',
    description: '',
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft',
    terms_conditions: 'Payment due within 30 days of invoice date.\nAll prices are in GBP (£).\nGoods remain the property of the company until paid in full.',
    notes: '',
    internal_notes: ''
  });
  const [lineItems, setLineItems] = useState([
    {
      product_id: null,
      description: '',
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      tax_rate: 20
    }
  ]);

  // Fetch customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('/api/customers', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setCustomers(data.customers || []);
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
    };
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products?is_active=true&limit=1000', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    
    fetchCustomers();
    fetchProducts();
  }, []);

  // Fetch existing quote data in edit mode
  useEffect(() => {
    console.log('=== useEffect triggered ===', 'isEditMode:', isEditMode, 'quoteId:', quoteId);
    
    if (isEditMode && quoteId) {
      const fetchQuote = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/quotes/${quoteId}`, {
            credentials: 'include'
          });
          if (response.ok) {
            const data = await response.json();
            const quote = data; // API returns quote object directly, not wrapped
            
            // Set quote data
            setQuoteNumber(quote.quote_number);
            setCustomerName(quote.customer_name);
            setFormData({
              customer_id: quote.customer_id,
              title: quote.title || '',
              description: quote.description || '',
              valid_until: quote.valid_until ? quote.valid_until.split('T')[0] : '',
              status: quote.status,
              terms_conditions: quote.terms_conditions || '',
              notes: quote.notes || '',
              internal_notes: quote.internal_notes || ''
            });
            
            // Set line items
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
            navigate('/app/crm');
          }
        } catch (error) {
          console.error('Error fetching quote:', error);
          alert('Failed to load quote');
          navigate('/app/crm');
        } finally {
          setLoading(false);
        }
      };
      fetchQuote();
    } else {
      // In create mode, ensure loading is false
      console.log('=== CREATE MODE: Setting loading to false ===');
      setLoading(false);
      setTimeout(() => {
        console.log('=== CREATE MODE: Loading state after setLoading ===', loading);
      }, 100);
    }
  }, [isEditMode, quoteId, navigate]);

  // Add new line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        product_id: null,
        description: '',
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        tax_rate: 20
      }
    ]);
  };

  // Remove line item
  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  // Update line item
  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    const numericFields = ['quantity', 'unit_price', 'discount_percent', 'tax_rate'];
    updated[index] = {
      ...updated[index],
      [field]: numericFields.includes(field) ? parseFloat(value) || 0 : value
    };
    setLineItems(updated);
  };

  // Handle product selection
  const handleProductSelect = (index, productId) => {
    if (productId === 'custom') {
      // Clear product selection, allow manual entry
      updateLineItem(index, 'product_id', null);
      return;
    }
    
    const product = products.find(p => p.id === productId);
    if (product) {
      // Auto-fill fields from product
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

  // Calculate line total
  const calculateLineTotal = (item) => {
    return (item.quantity || 0) * (item.unit_price || 0);
  };

  // Calculate subtotal
  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  };

  // Calculate tax
  const calculateTax = () => {
    return lineItems.reduce((sum, item) => {
      const lineSubtotal = (item.quantity || 0) * (item.unit_price || 0);
      const lineTax = lineSubtotal * ((item.tax_rate || 20) / 100);
      return sum + lineTax;
    }, 0);
  };

  // Calculate total
  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  // Handle form submission
  const handleSubmit = async (sendToCustomer = false) => {
    alert('🎯 handleSubmit CALLED! sendToCustomer: ' + sendToCustomer);
    console.log('=== handleSubmit called ===');
    console.log('sendToCustomer:', sendToCustomer);
    console.log('formData:', formData);
    console.log('lineItems:', lineItems);
    console.log('loading:', loading);
    console.log('saving:', saving);
    
    // Validation
    if (!formData.customer_id) {
      alert('Please select a customer');
      return;
    }

    if (!formData.title) {
      alert('Please enter a quote title');
      return;
    }

    if (lineItems.length === 0 || !lineItems[0].description) {
      alert('Please add at least one line item with a description');
      return;
    }

    setSaving(true);

    try {
      const url = isEditMode ? `/api/quotes/${quoteId}` : '/api/quotes';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(isEditMode ? {
          ...formData,
          line_items: lineItems,
          status: sendToCustomer ? 'sent' : formData.status
        } : {
          customer_id: formData.customer_id,
          title: formData.title,
          description: formData.description || undefined,
          valid_until: formData.valid_until || undefined,
          terms_conditions: formData.terms_conditions || undefined,
          notes: formData.notes || undefined,
          internal_notes: formData.internal_notes || undefined,
          line_items: lineItems
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Navigate to the quote details page
        const targetId = isEditMode ? quoteId : data.id; // API returns quote directly
        navigate(`/app/crm/quotes/${targetId}`);
      } else {
        const error = await response.json();
        alert(`Error ${isEditMode ? 'updating' : 'creating'} quote: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} quote:`, error);
      alert(`Failed to ${isEditMode ? 'update' : 'create'} quote. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/app/dashboard')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to CRM
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">
              {isEditMode ? `Edit Quote ${quoteNumber}` : 'Create New Quote'}
            </h1>
            {isEditMode && quoteNumber && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {quoteNumber}
              </span>
            )}
          </div>
          <p className="text-muted-foreground">
            {isEditMode ? 'Update quote details and line items' : 'Fill in the details below to create a quote for your customer'}
          </p>
        </div>
      </div>

      {/* Quote Header Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quote Information</CardTitle>
          <CardDescription>Basic quote details and customer selection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="customer">Customer *</Label>
              {isEditMode ? (
                <Input
                  id="customer"
                  value={customerName}
                  disabled
                  className="bg-gray-50"
                  title="Cannot change customer after quote creation"
                />
              ) : (
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                >
                  <SelectTrigger id="customer">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.company_name || customer.contact_name || customer.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              )}
            </div>

            {/* Quote Title */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Quote Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Website Maintenance - January 2025"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Quote Description */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of the quote"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Valid Until */}
            <div className="space-y-2">
              <Label htmlFor="valid_until">Valid Until *</Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
            </div>

            {/* Status (Edit Mode Only) */}
            {isEditMode && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
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
        </CardContent>
      </Card>

      {/* Line Items Section - Will be implemented in next phase */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>Add products or services to this quote</CardDescription>
            </div>
            <Button onClick={addLineItem} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lineItems.map((item, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-4">
                  {/* Product Selector */}
                  <div className="space-y-2">
                    <Label htmlFor={`product_${index}`}>Select Product (Optional)</Label>
                    <Select
                      value={item.product_id || 'custom'}
                      onValueChange={(value) => {
                        handleProductSelect(index, value);
                        setProductSearch(''); // Clear search after selection
                      }}
                      onOpenChange={(open) => {
                        if (!open) setProductSearch(''); // Clear search when closing
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product or enter custom item" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Search Input */}
                        <div className="p-2 border-b">
                          <input
                            type="text"
                            placeholder="Search products..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>
                        
                        <SelectItem value="custom">✏️ Custom Item (Enter Manually)</SelectItem>
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - £{(parseFloat(product.client_price) || 0).toFixed(2)}
                              {product.unit && ` (${product.unit})`}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-4 text-sm text-gray-500 text-center">
                            No products found matching "{productSearch}"
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Line Item Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Description (Item Name) */}
                    <div className="md:col-span-5 space-y-2">
                    <Label htmlFor={`description_${index}`}>
                      Item Description *
                      {item.product_id && <span className="text-xs text-gray-500 ml-2">(Auto-filled, editable)</span>}
                    </Label>
                    <Input
                      id={`description_${index}`}
                      placeholder="e.g., Website Hosting - Annual Plan"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    />
                  </div>

                  {/* Quantity */}
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor={`quantity_${index}`}>Quantity *</Label>
                    <Input
                      id={`quantity_${index}`}
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor={`unit_price_${index}`}>Unit Price (£) *</Label>
                    <Input
                      id={`unit_price_${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                    />
                  </div>

                  {/* Line Total & Remove Button */}
                  <div className="md:col-span-1 space-y-2 flex flex-col justify-end">
                    <div className="text-sm font-medium text-right mb-2">
                      £{calculateLineTotal(item).toFixed(2)}
                    </div>
                    {lineItems.length > 1 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pricing Summary */}
          <div className="mt-6 flex justify-end">
            <div className="w-full md:w-1/3 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>£{calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (VAT):</span>
                <span>£{calculateTax().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>£{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terms & Conditions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Terms & Conditions</CardTitle>
          <CardDescription>Standard terms that will appear on the quote</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            value={formData.terms_conditions}
            onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
            placeholder="Enter terms and conditions..."
          />
        </CardContent>
      </Card>

      {/* Internal Notes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Internal Notes</CardTitle>
          <CardDescription>Notes for staff only (not visible to customer)</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            value={formData.internal_notes}
            onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
            placeholder="Add any internal notes..."
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        {console.log('=== RENDER: Button state ===', 'loading:', loading, 'saving:', saving, 'disabled:', saving || loading)}
        <Button
          variant="outline"
          onClick={() => navigate('/app/dashboard')}
          disabled={loading}
        >
          Cancel
        </Button>
        {isEditMode ? (
          <Button
            onClick={() => handleSubmit(false)}
            disabled={saving || loading}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Updating...' : 'Update Quote'}
          </Button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save & Send'}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

