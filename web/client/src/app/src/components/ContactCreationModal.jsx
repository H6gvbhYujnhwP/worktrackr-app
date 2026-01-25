import React, { useState, useEffect } from 'react';
import { X, Plus, Building2, User, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { 
  contactDB, 
  CONTACT_TYPES, 
  CONTACT_STATUS, 
  ADDRESS_TYPES, 
  PAYMENT_TERMS, 
  CURRENCIES 
} from '../data/contactDatabase.js';

const ContactCreationModal = ({ 
  isOpen, 
  onClose, 
  onContactCreated, 
  initialName = '',
  initialType = CONTACT_TYPES.COMPANY 
}) => {
  const [formData, setFormData] = useState({
    type: initialType,
    name: initialName,
    displayName: '',
    primaryContact: '',
    email: '',
    phone: '',
    website: '',
    addresses: [],
    accounting: {
      taxNumber: '',
      paymentTerms: PAYMENT_TERMS.NET_30,
      currency: 'GBP',
      accountCode: '',
      creditLimit: 0,
      discountRate: 0
    },
    crm: {
      status: CONTACT_STATUS.PROSPECT,
      source: 'Manual Entry',
      industry: '',
      companySize: '',
      assignedTo: null,
      tags: [],
      notes: '',
      priority: 'medium',
      lastContact: null,
      nextFollowUp: null
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        name: initialName,
        type: initialType
      }));
      setErrors({});
    }
  }, [isOpen, initialName, initialType]);

  const resetForm = () => {
    setFormData({
      type: CONTACT_TYPES.COMPANY,
      name: '',
      displayName: '',
      primaryContact: '',
      email: '',
      phone: '',
      website: '',
      addresses: [],
      accounting: {
        taxNumber: '',
        paymentTerms: PAYMENT_TERMS.NET_30,
        currency: 'GBP',
        accountCode: '',
        creditLimit: 0,
        discountRate: 0
      },
      crm: {
        status: CONTACT_STATUS.PROSPECT,
        source: 'Manual Entry',
        industry: '',
        companySize: '',
        assignedTo: null,
        tags: [],
        notes: '',
        priority: 'medium',
        lastContact: null,
        nextFollowUp: null
      }
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    
    console.log('[ContactCreationModal] Validating form with name:', formData.name);
    
    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required';
      console.log('[ContactCreationModal] Validation error: company name is required');
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      console.log('[ContactCreationModal] Validation error: invalid email');
    }
    
    console.log('[ContactCreationModal] Validation errors:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[ContactCreationModal] Submit handler called');
    console.log('[ContactCreationModal] Form data:', formData);
    
    if (!validateForm()) {
      console.log('[ContactCreationModal] Form validation failed');
      return;
    }
    
    console.log('[ContactCreationModal] Form validation passed, creating contact...');
    setIsSubmitting(true);
    
    try {
      // Create the contact object
      const newContact = {
        ...formData,
        displayName: formData.displayName || formData.name,
        addresses: formData.addresses.length > 0 ? formData.addresses : [{
          type: ADDRESS_TYPES.BILLING,
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'United Kingdom',
          isPrimary: true,
          fullAddress: ''
        }]
        // createdAt and updatedAt are automatically added by the backend
      };

      // Add contact to database via API
      console.log('[ContactCreationModal] Adding contact to database:', newContact);
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newContact)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create contact');
      }
      
      const createdContact = await response.json();
      console.log('[ContactCreationModal] Contact created successfully:', createdContact);
      
      // Call the callback with the created contact
      if (onContactCreated) {
        console.log('[ContactCreationModal] Calling onContactCreated callback');
        onContactCreated(createdContact);
      } else {
        console.log('[ContactCreationModal] No onContactCreated callback provided');
      }
      
      // Close modal and reset form
      console.log('[ContactCreationModal] Closing modal and resetting form');
      onClose();
      resetForm();
      
    } catch (error) {
      console.error('[ContactCreationModal] Error creating contact:', error);
      setErrors({ submit: 'Failed to create contact. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAddress = () => {
    setFormData(prev => ({
      ...prev,
      addresses: [...prev.addresses, {
        type: ADDRESS_TYPES.BILLING,
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United Kingdom',
        isPrimary: prev.addresses.length === 0,
        fullAddress: ''
      }]
    }));
  };

  const updateAddress = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.map((addr, i) => 
        i === index ? { ...addr, [field]: value } : addr
      )
    }));
  };

  const removeAddress = (index) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {formData.type === CONTACT_TYPES.COMPANY ? (
                <Building2 className="w-5 h-5" />
              ) : (
                <User className="w-5 h-5" />
              )}
              Create New Contact
            </CardTitle>
            <Button variant="outline" onClick={() => {
              onClose();
              resetForm();
            }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="addresses">Addresses</TabsTrigger>
                <TabsTrigger value="accounting">Accounting</TabsTrigger>
                <TabsTrigger value="crm">CRM & Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Contact Type</Label>
                    <Select value={formData.type} onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, type: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CONTACT_TYPES.COMPANY}>Company</SelectItem>
                        <SelectItem value={CONTACT_TYPES.INDIVIDUAL}>Individual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter company name"
                      className={errors.name ? 'border-red-500' : ''}
                      required
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="primaryContact">Primary Contact</Label>
                    <Input
                      id="primaryContact"
                      value={formData.primaryContact}
                      onChange={(e) => setFormData(prev => ({ ...prev, primaryContact: e.target.value }))}
                      placeholder="Main contact person"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="contact@company.com"
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+44 20 7123 4567"
                    />
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://company.com"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="addresses" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Addresses</h3>
                  <Button type="button" onClick={addAddress} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Address
                  </Button>
                </div>
                
                {formData.addresses.map((address, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Address {index + 1}</h4>
                      {formData.addresses.length > 1 && (
                        <Button 
                          type="button" 
                          onClick={() => removeAddress(index)} 
                          variant="outline" 
                          size="sm"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Street Address</Label>
                        <Input
                          value={address.street}
                          onChange={(e) => updateAddress(index, 'street', e.target.value)}
                          placeholder="123 Main Street"
                        />
                      </div>
                      <div>
                        <Label>City</Label>
                        <Input
                          value={address.city}
                          onChange={(e) => updateAddress(index, 'city', e.target.value)}
                          placeholder="London"
                        />
                      </div>
                      <div>
                        <Label>State/County</Label>
                        <Input
                          value={address.state}
                          onChange={(e) => updateAddress(index, 'state', e.target.value)}
                          placeholder="Greater London"
                        />
                      </div>
                      <div>
                        <Label>Postal Code</Label>
                        <Input
                          value={address.zipCode}
                          onChange={(e) => updateAddress(index, 'zipCode', e.target.value)}
                          placeholder="SW1A 1AA"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="accounting" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="taxNumber">Tax Number</Label>
                    <Input
                      id="taxNumber"
                      value={formData.accounting.taxNumber}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        accounting: { ...prev.accounting, taxNumber: e.target.value }
                      }))}
                      placeholder="VAT/Tax registration number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="paymentTerms">Payment Terms</Label>
                    <Select 
                      value={formData.accounting.paymentTerms} 
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        accounting: { ...prev.accounting, paymentTerms: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PAYMENT_TERMS.NET_30}>Net 30</SelectItem>
                        <SelectItem value={PAYMENT_TERMS.NET_15}>Net 15</SelectItem>
                        <SelectItem value={PAYMENT_TERMS.NET_7}>Net 7</SelectItem>
                        <SelectItem value={PAYMENT_TERMS.DUE_ON_RECEIPT}>Due on Receipt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="crm" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.crm.status} 
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        crm: { ...prev.crm, status: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CONTACT_STATUS.PROSPECT}>Prospect</SelectItem>
                        <SelectItem value={CONTACT_STATUS.ACTIVE}>Active</SelectItem>
                        <SelectItem value={CONTACT_STATUS.AT_RISK}>At Risk</SelectItem>
                        <SelectItem value={CONTACT_STATUS.INACTIVE}>Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="source">Source</Label>
                    <Input
                      id="source"
                      value={formData.crm.source}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        crm: { ...prev.crm, source: e.target.value }
                      }))}
                      placeholder="How did you find this contact?"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.crm.notes}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      crm: { ...prev.crm, notes: e.target.value }
                    }))}
                    placeholder="Additional notes about this contact..."
                    rows={4}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mt-4">
                <p className="text-red-600 text-sm">{errors.submit}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
              <Button type="button" variant="outline" onClick={() => {
                onClose();
                resetForm();
              }} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create Contact
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactCreationModal;
