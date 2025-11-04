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
  const [quoteNumber, setQuoteNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [formData, setFormData] = useState({
    customer_id: '',
    quote_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft',
    tax_rate: 20,
    terms: 'Payment due within 30 days of invoice date.\nAll prices are in GBP (£).\nGoods remain the property of the company until paid in full.',
    notes: ''
  });
  const [lineItems, setLineItems] = useState([
    {
      item_name: '',
      description: '',
      quantity: 1,
      unit_price: 0
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
    fetchCustomers();
  }, []);

  // Fetch existing quote data in edit mode
  useEffect(() => {
    if (isEditMode && quoteId) {
      const fetchQuote = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/quotes/${quoteId}`, {
            credentials: 'include'
          });
          if (response.ok) {
            const data = await response.json();
            const quote = data.quote;
            
            // Set quote data
            setQuoteNumber(quote.quote_number);
            setCustomerName(quote.customer_name);
            setFormData({
              customer_id: quote.customer_id,
              quote_date: quote.quote_date.split('T')[0],
              valid_until: quote.valid_until.split('T')[0],
              status: quote.status,
              tax_rate: quote.tax_rate,
              terms: quote.terms || '',
              notes: quote.notes || ''
            });
            
            // Set line items
            if (data.line_items && data.line_items.length > 0) {
              setLineItems(data.line_items.map(item => ({
                id: item.id,
                item_name: item.item_name,
                description: item.description || '',
                quantity: item.quantity,
                unit_price: item.unit_price
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
    }
  }, [isEditMode, quoteId, navigate]);

  // Add new line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        item_name: '',
        description: '',
        quantity: 1,
        unit_price: 0
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
    updated[index] = {
      ...updated[index],
      [field]: field === 'quantity' || field === 'unit_price' ? parseFloat(value) || 0 : value
    };
    setLineItems(updated);
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
    return calculateSubtotal() * (formData.tax_rate / 100);
  };

  // Calculate total
  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  // Handle form submission
  const handleSubmit = async (sendToCustomer = false) => {
    // Validation
    if (!formData.customer_id) {
      alert('Please select a customer');
      return;
    }

    if (lineItems.length === 0 || !lineItems[0].item_name) {
      alert('Please add at least one line item');
      return;
    }

    if (new Date(formData.valid_until) <= new Date(formData.quote_date)) {
      alert('Valid until date must be after quote date');
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
        body: JSON.stringify({
          ...formData,
          line_items: lineItems,
          status: isEditMode ? formData.status : (sendToCustomer ? 'sent' : 'draft')
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Navigate to the quote details page
        const targetId = isEditMode ? quoteId : data.quote.id;
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
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              )}
            </div>

            {/* Quote Date */}
            <div className="space-y-2">
              <Label htmlFor="quote_date">Quote Date *</Label>
              <Input
                id="quote_date"
                type="date"
                value={formData.quote_date}
                onChange={(e) => setFormData({ ...formData, quote_date: e.target.value })}
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

            {/* Tax Rate */}
            <div className="space-y-2">
              <Label htmlFor="tax_rate">Tax Rate (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
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
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Item Name */}
                  <div className="md:col-span-3 space-y-2">
                    <Label htmlFor={`item_name_${index}`}>Item/Product *</Label>
                    <Input
                      id={`item_name_${index}`}
                      placeholder="Product name"
                      value={item.item_name}
                      onChange={(e) => updateLineItem(index, 'item_name', e.target.value)}
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-4 space-y-2">
                    <Label htmlFor={`description_${index}`}>Description</Label>
                    <Input
                      id={`description_${index}`}
                      placeholder="Brief description"
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
                <span>Tax ({formData.tax_rate}%):</span>
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
            value={formData.terms}
            onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
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
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any internal notes..."
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
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
            <Button
              variant="secondary"
              onClick={() => handleSubmit(true)}
              disabled={saving || loading}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save & Send'}
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              disabled={saving || loading}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save as Draft'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

