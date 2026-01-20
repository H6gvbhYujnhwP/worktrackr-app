import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  User, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign,
  Users,
  FileText,
  Settings,
  Download,
  Upload,
  X,
  Check,
  AlertCircle,
  Star,
  Tag
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
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

const ContactManager = () => {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedContact, setSelectedContact] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [statistics, setStatistics] = useState({});
  const [activeTab, setActiveTab] = useState('overview');

  // Form state
  const [formData, setFormData] = useState({
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
      source: '',
      industry: '',
      companySize: '',
      assignedTo: null
    },
    contactPersons: [],
    tags: [],
    notes: ''
  });

  // Load contacts on component mount and set up auto-refresh
  useEffect(() => {
    loadContacts();
    
    // Auto-refresh every 10 seconds
    const intervalId = setInterval(() => {
      loadContacts();
    }, 10000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Filter contacts when search term or filters change
  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm, statusFilter, typeFilter]);

  const loadContacts = async () => {
    try {
      const response = await fetch('/api/contacts', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch contacts');
      const allContacts = await response.json();
      
      const statsResponse = await fetch('/api/contacts/statistics', {
        credentials: 'include'
      });
      const stats = statsResponse.ok ? await statsResponse.json() : {};
      
      setContacts(allContacts);
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const filterContacts = () => {
    let filtered = contacts;

    // Search filter
    if (searchTerm) {
      filtered = contactDB.searchContacts(searchTerm);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(contact => contact.crm.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(contact => contact.type === typeFilter);
    }

    setFilteredContacts(filtered);
  };

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
        source: '',
        industry: '',
        companySize: '',
        assignedTo: null
      },
      contactPersons: [],
      tags: [],
      notes: ''
    });
  };

  const handleCreateContact = async () => {
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Failed to create contact');
      const newContact = await response.json();
      await loadContacts();
      setShowCreateForm(false);
      resetForm();
      setSelectedContact(newContact);
    } catch (error) {
      console.error('Error creating contact:', error);
      alert('Failed to create contact. Please try again.');
    }
  };

  const handleUpdateContact = async () => {
    try {
      const response = await fetch(`/api/contacts/${selectedContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Failed to update contact');
      const updatedContact = await response.json();
      await loadContacts();
      setShowEditForm(false);
      setSelectedContact(updatedContact);
    } catch (error) {
      console.error('Error updating contact:', error);
      alert('Failed to update contact. Please try again.');
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (window.confirm('Are you sure you want to delete this contact? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/contacts/${contactId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to delete contact');
        await loadContacts();
        if (selectedContact && selectedContact.id === contactId) {
          setSelectedContact(null);
        }
      } catch (error) {
        console.error('Error deleting contact:', error);
        alert('Failed to delete contact. Please try again.');
      }
    }
  };

  const handleEditContact = (contact) => {
    setFormData({
      type: contact.type,
      name: contact.name,
      displayName: contact.displayName,
      primaryContact: contact.primaryContact,
      email: contact.email,
      phone: contact.phone,
      website: contact.website,
      addresses: contact.addresses,
      accounting: contact.accounting,
      crm: contact.crm,
      contactPersons: contact.contactPersons,
      tags: contact.tags,
      notes: contact.notes
    });
    setSelectedContact(contact);
    setShowEditForm(true);
  };

  const addAddress = () => {
    const newAddress = {
      id: Date.now().toString(),
      type: ADDRESS_TYPES.BILLING,
      line1: '',
      line2: '',
      city: '',
      state: '',
      postcode: '',
      country: 'United Kingdom',
      isPrimary: formData.addresses.length === 0
    };
    setFormData(prev => ({
      ...prev,
      addresses: [...prev.addresses, newAddress]
    }));
  };

  const updateAddress = (index, field, value) => {
    const updatedAddresses = [...formData.addresses];
    updatedAddresses[index] = {
      ...updatedAddresses[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      addresses: updatedAddresses
    }));
  };

  const removeAddress = (index) => {
    const updatedAddresses = formData.addresses.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      addresses: updatedAddresses
    }));
  };

  const addContactPerson = () => {
    const newPerson = {
      id: Date.now().toString(),
      name: '',
      title: '',
      email: '',
      phone: '',
      department: '',
      isPrimary: formData.contactPersons.length === 0,
      notes: ''
    };
    setFormData(prev => ({
      ...prev,
      contactPersons: [...prev.contactPersons, newPerson]
    }));
  };

  const updateContactPerson = (index, field, value) => {
    const updatedPersons = [...formData.contactPersons];
    updatedPersons[index] = {
      ...updatedPersons[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      contactPersons: updatedPersons
    }));
  };

  const removeContactPerson = (index) => {
    const updatedPersons = formData.contactPersons.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      contactPersons: updatedPersons
    }));
  };

  const getStatusColor = (status) => {
    const colors = {
      [CONTACT_STATUS.ACTIVE]: 'bg-green-100 text-green-800 border-green-200',
      [CONTACT_STATUS.PROSPECT]: 'bg-blue-100 text-blue-800 border-blue-200',
      [CONTACT_STATUS.AT_RISK]: 'bg-orange-100 text-orange-800 border-orange-200',
      [CONTACT_STATUS.INACTIVE]: 'bg-gray-100 text-gray-800 border-gray-200',
      [CONTACT_STATUS.ARCHIVED]: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatCurrency = (amount, currency = 'GBP') => {
    const currencyInfo = CURRENCIES[currency] || CURRENCIES.GBP;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-gray-900 flex items-center">
                <Users className="w-8 h-8 mr-3 text-blue-600" />
                Contact Management
              </CardTitle>
              <CardDescription className="text-lg mt-2">
                Central database for all customer and contact information
              </CardDescription>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Total Contacts</p>
                <p className="text-2xl font-bold text-blue-900">{statistics.total || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Active</p>
                <p className="text-2xl font-bold text-green-900">{statistics.active || 0}</p>
              </div>
              <Check className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Prospects</p>
                <p className="text-2xl font-bold text-purple-900">{statistics.prospects || 0}</p>
              </div>
              <Star className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">At Risk</p>
                <p className="text-2xl font-bold text-orange-900">{statistics.atRisk || 0}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-800">Companies</p>
                <p className="text-2xl font-bold text-emerald-900">{statistics.companies || 0}</p>
              </div>
              <Building2 className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Total Value</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(statistics.totalProfit || 0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <CardTitle>Contacts ({filteredContacts.length})</CardTitle>
                
                <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search contacts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full md:w-64"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value={CONTACT_STATUS.ACTIVE}>Active</SelectItem>
                      <SelectItem value={CONTACT_STATUS.PROSPECT}>Prospect</SelectItem>
                      <SelectItem value={CONTACT_STATUS.AT_RISK}>At Risk</SelectItem>
                      <SelectItem value={CONTACT_STATUS.INACTIVE}>Inactive</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value={CONTACT_TYPES.COMPANY}>Companies</SelectItem>
                      <SelectItem value={CONTACT_TYPES.INDIVIDUAL}>Individuals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredContacts.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No contacts found</h3>
                  <p className="text-gray-600 mb-6">
                    {contacts.length === 0 
                      ? "Get started by adding your first contact."
                      : "No contacts match your current search and filter criteria."
                    }
                  </p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Contact
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredContacts.map((contact) => (
                    <Card 
                      key={contact.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedContact?.id === contact.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedContact(contact)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              {contact.type === CONTACT_TYPES.COMPANY ? (
                                <Building2 className="w-5 h-5 text-gray-600" />
                              ) : (
                                <User className="w-5 h-5 text-gray-600" />
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="font-semibold text-gray-900">{contact.name}</h4>
                                <Badge className={getStatusColor(contact.crm.status)}>
                                  {contact.crm.status}
                                </Badge>
                              </div>
                              
                              <div className="text-sm text-gray-600 space-y-1">
                                {contact.primaryContact && (
                                  <p className="flex items-center">
                                    <User className="w-4 h-4 mr-2" />
                                    {contact.primaryContact}
                                  </p>
                                )}
                                {contact.email && (
                                  <p className="flex items-center">
                                    <Mail className="w-4 h-4 mr-2" />
                                    {contact.email}
                                  </p>
                                )}
                                {contact.phone && (
                                  <p className="flex items-center">
                                    <Phone className="w-4 h-4 mr-2" />
                                    {contact.phone}
                                  </p>
                                )}
                              </div>
                              
                              {contact.crm.totalProfit > 0 && (
                                <div className="mt-2">
                                  <span className="text-sm font-medium text-green-600">
                                    {formatCurrency(contact.crm.totalProfit, contact.accounting.currency)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditContact(contact);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteContact(contact.id);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contact Details */}
        <div className="lg:col-span-1">
          {selectedContact ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    {selectedContact.type === CONTACT_TYPES.COMPANY ? (
                      <Building2 className="w-5 h-5 mr-2" />
                    ) : (
                      <User className="w-5 h-5 mr-2" />
                    )}
                    Contact Details
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditContact(selectedContact)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">{selectedContact.name}</h4>
                  <div className="space-y-2 text-sm">
                    <Badge className={getStatusColor(selectedContact.crm.status)}>
                      {selectedContact.crm.status}
                    </Badge>
                    {selectedContact.primaryContact && (
                      <p><strong>Contact:</strong> {selectedContact.primaryContact}</p>
                    )}
                    {selectedContact.email && (
                      <p><strong>Email:</strong> {selectedContact.email}</p>
                    )}
                    {selectedContact.phone && (
                      <p><strong>Phone:</strong> {selectedContact.phone}</p>
                    )}
                    {selectedContact.website && (
                      <p><strong>Website:</strong> {selectedContact.website}</p>
                    )}
                  </div>
                </div>

                {/* Addresses */}
                {selectedContact.addresses.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Addresses</h5>
                    <div className="space-y-2">
                      {selectedContact.addresses.map((address, index) => (
                        <div key={index} className="text-sm p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline">{address.type}</Badge>
                            {address.isPrimary && (
                              <Badge className="bg-blue-100 text-blue-800">Primary</Badge>
                            )}
                          </div>
                          <p>{address.line1}</p>
                          {address.line2 && <p>{address.line2}</p>}
                          <p>{address.city}, {address.state} {address.postcode}</p>
                          <p>{address.country}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CRM Information */}
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">CRM Information</h5>
                  <div className="text-sm space-y-1">
                    <p><strong>Total Profit:</strong> {formatCurrency(selectedContact.crm.totalProfit, selectedContact.accounting.currency)}</p>
                    <p><strong>Renewals:</strong> {selectedContact.crm.renewalsCount}</p>
                    <p><strong>Open Opportunities:</strong> {selectedContact.crm.openOppsCount}</p>
                    {selectedContact.crm.industry && (
                      <p><strong>Industry:</strong> {selectedContact.crm.industry}</p>
                    )}
                    {selectedContact.crm.source && (
                      <p><strong>Source:</strong> {selectedContact.crm.source}</p>
                    )}
                  </div>
                </div>

                {/* Accounting Information */}
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Accounting</h5>
                  <div className="text-sm space-y-1">
                    <p><strong>Currency:</strong> {selectedContact.accounting.currency}</p>
                    <p><strong>Payment Terms:</strong> {selectedContact.accounting.paymentTerms}</p>
                    {selectedContact.accounting.taxNumber && (
                      <p><strong>Tax Number:</strong> {selectedContact.accounting.taxNumber}</p>
                    )}
                    {selectedContact.accounting.accountCode && (
                      <p><strong>Account Code:</strong> {selectedContact.accounting.accountCode}</p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {selectedContact.notes && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Notes</h5>
                    <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                      {selectedContact.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Contact</h3>
                <p className="text-gray-600">
                  Choose a contact from the list to view details
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Contact Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create New Contact</CardTitle>
                <Button variant="outline" onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
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
                        required
                      />
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
                      />
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
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Addresses</h4>
                    <Button onClick={addAddress} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Address
                    </Button>
                  </div>

                  {formData.addresses.map((address, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <Select 
                          value={address.type} 
                          onValueChange={(value) => updateAddress(index, 'type', value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ADDRESS_TYPES.BILLING}>Billing</SelectItem>
                            <SelectItem value={ADDRESS_TYPES.SHIPPING}>Shipping</SelectItem>
                            <SelectItem value={ADDRESS_TYPES.SERVICE}>Service</SelectItem>
                            <SelectItem value={ADDRESS_TYPES.OFFICE}>Office</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => removeAddress(index)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label>Address Line 1</Label>
                          <Input
                            value={address.line1}
                            onChange={(e) => updateAddress(index, 'line1', e.target.value)}
                            placeholder="123 Main Street"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Address Line 2</Label>
                          <Input
                            value={address.line2}
                            onChange={(e) => updateAddress(index, 'line2', e.target.value)}
                            placeholder="Suite 100"
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
                          <Label>State/Region</Label>
                          <Input
                            value={address.state}
                            onChange={(e) => updateAddress(index, 'state', e.target.value)}
                            placeholder="England"
                          />
                        </div>
                        <div>
                          <Label>Postal Code</Label>
                          <Input
                            value={address.postcode}
                            onChange={(e) => updateAddress(index, 'postcode', e.target.value)}
                            placeholder="SW1A 1AA"
                          />
                        </div>
                        <div>
                          <Label>Country</Label>
                          <Input
                            value={address.country}
                            onChange={(e) => updateAddress(index, 'country', e.target.value)}
                            placeholder="United Kingdom"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="accounting" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select 
                        value={formData.accounting.currency} 
                        onValueChange={(value) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            accounting: { ...prev.accounting, currency: value }
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CURRENCIES).map(([code, info]) => (
                            <SelectItem key={code} value={code}>
                              {info.symbol} {info.name} ({code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="paymentTerms">Payment Terms</Label>
                      <Select 
                        value={formData.accounting.paymentTerms} 
                        onValueChange={(value) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            accounting: { ...prev.accounting, paymentTerms: value }
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PAYMENT_TERMS).map(([key, value]) => (
                            <SelectItem key={key} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="taxNumber">Tax Number/VAT ID</Label>
                      <Input
                        id="taxNumber"
                        value={formData.accounting.taxNumber}
                        onChange={(e) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            accounting: { ...prev.accounting, taxNumber: e.target.value }
                          }))
                        }
                        placeholder="GB123456789"
                      />
                    </div>

                    <div>
                      <Label htmlFor="accountCode">Account Code</Label>
                      <Input
                        id="accountCode"
                        value={formData.accounting.accountCode}
                        onChange={(e) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            accounting: { ...prev.accounting, accountCode: e.target.value }
                          }))
                        }
                        placeholder="4000"
                      />
                    </div>

                    <div>
                      <Label htmlFor="creditLimit">Credit Limit</Label>
                      <Input
                        id="creditLimit"
                        type="number"
                        value={formData.accounting.creditLimit}
                        onChange={(e) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            accounting: { ...prev.accounting, creditLimit: parseFloat(e.target.value) || 0 }
                          }))
                        }
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="discountRate">Discount Rate (%)</Label>
                      <Input
                        id="discountRate"
                        type="number"
                        value={formData.accounting.discountRate}
                        onChange={(e) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            accounting: { ...prev.accounting, discountRate: parseFloat(e.target.value) || 0 }
                          }))
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="crm" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select 
                        value={formData.crm.status} 
                        onValueChange={(value) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            crm: { ...prev.crm, status: value }
                          }))
                        }
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
                        onChange={(e) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            crm: { ...prev.crm, source: e.target.value }
                          }))
                        }
                        placeholder="Website, Referral, etc."
                      />
                    </div>

                    <div>
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        value={formData.crm.industry}
                        onChange={(e) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            crm: { ...prev.crm, industry: e.target.value }
                          }))
                        }
                        placeholder="Technology, Healthcare, etc."
                      />
                    </div>

                    <div>
                      <Label htmlFor="companySize">Company Size</Label>
                      <Input
                        id="companySize"
                        value={formData.crm.companySize}
                        onChange={(e) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            crm: { ...prev.crm, companySize: e.target.value }
                          }))
                        }
                        placeholder="1-10, 11-50, 51-200, etc."
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes about this contact..."
                      rows={4}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-4 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button onClick={handleCreateContact} disabled={!formData.name}>
                  Create Contact
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Contact Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Edit Contact</CardTitle>
                <Button variant="outline" onClick={() => {
                  setShowEditForm(false);
                  resetForm();
                }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Same form structure as create, but with update handler */}
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="addresses">Addresses</TabsTrigger>
                  <TabsTrigger value="accounting">Accounting</TabsTrigger>
                  <TabsTrigger value="crm">CRM & Notes</TabsTrigger>
                </TabsList>

                {/* Same tab content as create form */}
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
                        required
                      />
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
                      />
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
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Addresses</h4>
                    <Button onClick={addAddress} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Address
                    </Button>
                  </div>

                  {formData.addresses.map((address, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <Select 
                          value={address.type} 
                          onValueChange={(value) => updateAddress(index, 'type', value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ADDRESS_TYPES.BILLING}>Billing</SelectItem>
                            <SelectItem value={ADDRESS_TYPES.SHIPPING}>Shipping</SelectItem>
                            <SelectItem value={ADDRESS_TYPES.SERVICE}>Service</SelectItem>
                            <SelectItem value={ADDRESS_TYPES.OFFICE}>Office</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => removeAddress(index)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label>Address Line 1</Label>
                          <Input
                            value={address.line1}
                            onChange={(e) => updateAddress(index, 'line1', e.target.value)}
                            placeholder="123 Main Street"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Address Line 2</Label>
                          <Input
                            value={address.line2}
                            onChange={(e) => updateAddress(index, 'line2', e.target.value)}
                            placeholder="Suite 100"
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
                          <Label>State/Region</Label>
                          <Input
                            value={address.state}
                            onChange={(e) => updateAddress(index, 'state', e.target.value)}
                            placeholder="England"
                          />
                        </div>
                        <div>
                          <Label>Postal Code</Label>
                          <Input
                            value={address.postcode}
                            onChange={(e) => updateAddress(index, 'postcode', e.target.value)}
                            placeholder="SW1A 1AA"
                          />
                        </div>
                        <div>
                          <Label>Country</Label>
                          <Input
                            value={address.country}
                            onChange={(e) => updateAddress(index, 'country', e.target.value)}
                            placeholder="United Kingdom"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="accounting" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select 
                        value={formData.accounting.currency} 
                        onValueChange={(value) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            accounting: { ...prev.accounting, currency: value }
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CURRENCIES).map(([code, info]) => (
                            <SelectItem key={code} value={code}>
                              {info.symbol} {info.name} ({code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="paymentTerms">Payment Terms</Label>
                      <Select 
                        value={formData.accounting.paymentTerms} 
                        onValueChange={(value) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            accounting: { ...prev.accounting, paymentTerms: value }
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PAYMENT_TERMS).map(([key, value]) => (
                            <SelectItem key={key} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="taxNumber">Tax Number/VAT ID</Label>
                      <Input
                        id="taxNumber"
                        value={formData.accounting.taxNumber}
                        onChange={(e) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            accounting: { ...prev.accounting, taxNumber: e.target.value }
                          }))
                        }
                        placeholder="GB123456789"
                      />
                    </div>

                    <div>
                      <Label htmlFor="accountCode">Account Code</Label>
                      <Input
                        id="accountCode"
                        value={formData.accounting.accountCode}
                        onChange={(e) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            accounting: { ...prev.accounting, accountCode: e.target.value }
                          }))
                        }
                        placeholder="4000"
                      />
                    </div>

                    <div>
                      <Label htmlFor="creditLimit">Credit Limit</Label>
                      <Input
                        id="creditLimit"
                        type="number"
                        value={formData.accounting.creditLimit}
                        onChange={(e) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            accounting: { ...prev.accounting, creditLimit: parseFloat(e.target.value) || 0 }
                          }))
                        }
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="discountRate">Discount Rate (%)</Label>
                      <Input
                        id="discountRate"
                        type="number"
                        value={formData.accounting.discountRate}
                        onChange={(e) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            accounting: { ...prev.accounting, discountRate: parseFloat(e.target.value) || 0 }
                          }))
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="crm" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select 
                        value={formData.crm.status} 
                        onValueChange={(value) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            crm: { ...prev.crm, status: value }
                          }))
                        }
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
                        onChange={(e) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            crm: { ...prev.crm, source: e.target.value }
                          }))
                        }
                        placeholder="Website, Referral, etc."
                      />
                    </div>

                    <div>
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        value={formData.crm.industry}
                        onChange={(e) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            crm: { ...prev.crm, industry: e.target.value }
                          }))
                        }
                        placeholder="Technology, Healthcare, etc."
                      />
                    </div>

                    <div>
                      <Label htmlFor="companySize">Company Size</Label>
                      <Input
                        id="companySize"
                        value={formData.crm.companySize}
                        onChange={(e) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            crm: { ...prev.crm, companySize: e.target.value }
                          }))
                        }
                        placeholder="1-10, 11-50, 51-200, etc."
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes about this contact..."
                      rows={4}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-4 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setShowEditForm(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateContact} disabled={!formData.name}>
                  Update Contact
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ContactManager;
