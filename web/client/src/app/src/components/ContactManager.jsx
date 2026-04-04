import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  User, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Mail, 
  Phone,
  Users,
  DollarSign,
  Check,
  AlertCircle,
  Star,
  X,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { 
  contactDB, 
  CONTACT_TYPES, 
  CONTACT_STATUS, 
  ADDRESS_TYPES, 
  PAYMENT_TERMS, 
  CURRENCIES 
} from '../data/contactDatabase.js';

// ── Design tokens ──────────────────────────────────────────────────────────────
const STATUS_BADGE = {
  [CONTACT_STATUS.ACTIVE]:   'bg-[#dcfce7] text-[#166534]',
  [CONTACT_STATUS.PROSPECT]: 'bg-[#dbeafe] text-[#1e40af]',
  [CONTACT_STATUS.AT_RISK]:  'bg-[#fef3c7] text-[#92400e]',
  [CONTACT_STATUS.INACTIVE]: 'bg-[#f3f4f6] text-[#6b7280]',
  [CONTACT_STATUS.ARCHIVED]: 'bg-[#fee2e2] text-[#991b1b]',
};

const INPUT_CLS  = 'w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] text-[#111113] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017] transition-colors';
const LABEL_CLS  = 'block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5';
const SECTION_H  = 'text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2';
const GOLD_BTN   = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#d4a017] text-[#111113] text-[13px] font-semibold hover:bg-[#b8860b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const OUTLINE_BTN= 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#e5e7eb] bg-white text-[#374151] text-[13px] font-medium hover:bg-[#f9fafb] transition-colors';
const GHOST_BTN  = 'inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors';

// ── Tab nav component ─────────────────────────────────────────────────────────
function FormTabs({ tabs, active, onChange }) {
  return (
    <div className="flex border-b border-[#e5e7eb] overflow-x-auto">
      {tabs.map(t => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={`flex-shrink-0 px-5 py-3 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
            active === t.value
              ? 'border-[#d4a017] text-[#111113]'
              : 'border-transparent text-[#6b7280] hover:text-[#111113]'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

const FORM_TABS = [
  { value: 'basic',      label: 'Basic Info'   },
  { value: 'addresses',  label: 'Addresses'    },
  { value: 'accounting', label: 'Accounting'   },
  { value: 'crm',        label: 'CRM & Notes'  },
];

// ── Main component ─────────────────────────────────────────────────────────────
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
  const [activeCreateTab, setActiveCreateTab] = useState('basic');
  const [activeEditTab,   setActiveEditTab]   = useState('basic');

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

  // ── Data loading ─────────────────────────────────────────────────────────────
  useEffect(() => {
    loadContacts();
    const intervalId = setInterval(() => { loadContacts(); }, 10000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm, statusFilter, typeFilter]);

  const loadContacts = async () => {
    try {
      const response = await fetch('/api/contacts', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch contacts');
      const allContacts = await response.json();
      const statsResponse = await fetch('/api/contacts/statistics', { credentials: 'include' });
      const stats = statsResponse.ok ? await statsResponse.json() : {};
      setContacts(allContacts);
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const filterContacts = () => {
    let filtered = contacts;
    if (searchTerm) { filtered = contactDB.searchContacts(searchTerm); }
    if (statusFilter !== 'all') { filtered = filtered.filter(c => c.crm.status === statusFilter); }
    if (typeFilter   !== 'all') { filtered = filtered.filter(c => c.type   === typeFilter);       }
    setFilteredContacts(filtered);
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({
      type: CONTACT_TYPES.COMPANY, name: '', displayName: '', primaryContact: '',
      email: '', phone: '', website: '', addresses: [],
      accounting: { taxNumber: '', paymentTerms: PAYMENT_TERMS.NET_30, currency: 'GBP', accountCode: '', creditLimit: 0, discountRate: 0 },
      crm: { status: CONTACT_STATUS.PROSPECT, source: '', industry: '', companySize: '', assignedTo: null },
      contactPersons: [], tags: [], notes: ''
    });
  };

  const handleCreateContact = async () => {
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
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
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
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
        const response = await fetch(`/api/contacts/${contactId}`, { method: 'DELETE', credentials: 'include' });
        if (!response.ok) throw new Error('Failed to delete contact');
        await loadContacts();
        if (selectedContact && selectedContact.id === contactId) { setSelectedContact(null); }
      } catch (error) {
        console.error('Error deleting contact:', error);
        alert('Failed to delete contact. Please try again.');
      }
    }
  };

  const handleEditContact = (contact) => {
    setFormData({
      type: contact.type, name: contact.name, displayName: contact.displayName,
      primaryContact: contact.primaryContact, email: contact.email, phone: contact.phone,
      website: contact.website, addresses: contact.addresses, accounting: contact.accounting,
      crm: contact.crm, contactPersons: contact.contactPersons, tags: contact.tags, notes: contact.notes
    });
    setSelectedContact(contact);
    setShowEditForm(true);
    setActiveEditTab('basic');
  };

  const addAddress = () => {
    const newAddress = {
      id: Date.now().toString(), type: ADDRESS_TYPES.BILLING, line1: '', line2: '',
      city: '', state: '', postcode: '', country: 'United Kingdom',
      isPrimary: formData.addresses.length === 0
    };
    setFormData(prev => ({ ...prev, addresses: [...prev.addresses, newAddress] }));
  };

  const updateAddress = (index, field, value) => {
    const updatedAddresses = [...formData.addresses];
    updatedAddresses[index] = { ...updatedAddresses[index], [field]: value };
    setFormData(prev => ({ ...prev, addresses: updatedAddresses }));
  };

  const removeAddress = (index) => {
    setFormData(prev => ({ ...prev, addresses: formData.addresses.filter((_, i) => i !== index) }));
  };

  const addContactPerson = () => {
    const newPerson = {
      id: Date.now().toString(), name: '', title: '', email: '', phone: '',
      department: '', isPrimary: formData.contactPersons.length === 0, notes: ''
    };
    setFormData(prev => ({ ...prev, contactPersons: [...prev.contactPersons, newPerson] }));
  };

  const updateContactPerson = (index, field, value) => {
    const updatedPersons = [...formData.contactPersons];
    updatedPersons[index] = { ...updatedPersons[index], [field]: value };
    setFormData(prev => ({ ...prev, contactPersons: updatedPersons }));
  };

  const removeContactPerson = (index) => {
    setFormData(prev => ({ ...prev, contactPersons: formData.contactPersons.filter((_, i) => i !== index) }));
  };

  const getStatusBadge = (status) => STATUS_BADGE[status] || 'bg-[#f3f4f6] text-[#6b7280]';

  const formatCurrency = (amount, currency = 'GBP') =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);

  // ── Form tab content renderers ────────────────────────────────────────────────
  const BasicInfoContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className={LABEL_CLS}>Contact Type</label>
        <Select value={formData.type} onValueChange={(v) => setFormData(p => ({ ...p, type: v }))}>
          <SelectTrigger className="focus:ring-[#d4a017]/30 focus:border-[#d4a017]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={CONTACT_TYPES.COMPANY}>Company</SelectItem>
            <SelectItem value={CONTACT_TYPES.INDIVIDUAL}>Individual</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className={LABEL_CLS}>Company Name *</label>
        <input className={INPUT_CLS} value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Enter company name" />
      </div>
      <div>
        <label className={LABEL_CLS}>Primary Contact</label>
        <input className={INPUT_CLS} value={formData.primaryContact} onChange={(e) => setFormData(p => ({ ...p, primaryContact: e.target.value }))} placeholder="Main contact person" />
      </div>
      <div>
        <label className={LABEL_CLS}>Email</label>
        <input type="email" className={INPUT_CLS} value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="contact@company.com" />
      </div>
      <div>
        <label className={LABEL_CLS}>Phone</label>
        <input className={INPUT_CLS} value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="+44 20 7123 4567" />
      </div>
      <div>
        <label className={LABEL_CLS}>Website</label>
        <input className={INPUT_CLS} value={formData.website} onChange={(e) => setFormData(p => ({ ...p, website: e.target.value }))} placeholder="https://company.com" />
      </div>
    </div>
  );

  const AddressesContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#111113]">Addresses</span>
        <button type="button" onClick={addAddress} className={GOLD_BTN}><Plus className="w-4 h-4" /> Add Address</button>
      </div>
      {formData.addresses.length === 0 && (
        <p className="text-[13px] text-[#9ca3af] text-center py-6">No addresses added yet.</p>
      )}
      {formData.addresses.map((address, index) => (
        <div key={index} className="border border-[#e5e7eb] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <Select value={address.type} onValueChange={(v) => updateAddress(index, 'type', v)}>
              <SelectTrigger className="w-36 focus:ring-[#d4a017]/30 focus:border-[#d4a017]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ADDRESS_TYPES.BILLING}>Billing</SelectItem>
                <SelectItem value={ADDRESS_TYPES.SHIPPING}>Shipping</SelectItem>
                <SelectItem value={ADDRESS_TYPES.SERVICE}>Service</SelectItem>
                <SelectItem value={ADDRESS_TYPES.OFFICE}>Office</SelectItem>
              </SelectContent>
            </Select>
            <button type="button" onClick={() => removeAddress(index)} className="text-[13px] font-medium text-red-500 hover:text-red-700">Remove</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><label className={LABEL_CLS}>Address Line 1</label><input className={INPUT_CLS} value={address.line1} onChange={(e) => updateAddress(index, 'line1', e.target.value)} placeholder="123 Main Street" /></div>
            <div className="md:col-span-2"><label className={LABEL_CLS}>Address Line 2</label><input className={INPUT_CLS} value={address.line2} onChange={(e) => updateAddress(index, 'line2', e.target.value)} placeholder="Suite 100" /></div>
            <div><label className={LABEL_CLS}>City</label><input className={INPUT_CLS} value={address.city} onChange={(e) => updateAddress(index, 'city', e.target.value)} placeholder="London" /></div>
            <div><label className={LABEL_CLS}>State/Region</label><input className={INPUT_CLS} value={address.state} onChange={(e) => updateAddress(index, 'state', e.target.value)} placeholder="England" /></div>
            <div><label className={LABEL_CLS}>Postal Code</label><input className={INPUT_CLS} value={address.postcode} onChange={(e) => updateAddress(index, 'postcode', e.target.value)} placeholder="SW1A 1AA" /></div>
            <div><label className={LABEL_CLS}>Country</label><input className={INPUT_CLS} value={address.country} onChange={(e) => updateAddress(index, 'country', e.target.value)} placeholder="United Kingdom" /></div>
          </div>
        </div>
      ))}
    </div>
  );

  const AccountingContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className={LABEL_CLS}>Currency</label>
        <Select value={formData.accounting.currency} onValueChange={(v) => setFormData(p => ({ ...p, accounting: { ...p.accounting, currency: v } }))}>
          <SelectTrigger className="focus:ring-[#d4a017]/30 focus:border-[#d4a017]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(CURRENCIES).map(([code, info]) => (
              <SelectItem key={code} value={code}>{info.symbol} {info.name} ({code})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className={LABEL_CLS}>Payment Terms</label>
        <Select value={formData.accounting.paymentTerms} onValueChange={(v) => setFormData(p => ({ ...p, accounting: { ...p.accounting, paymentTerms: v } }))}>
          <SelectTrigger className="focus:ring-[#d4a017]/30 focus:border-[#d4a017]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(PAYMENT_TERMS).map(([key, value]) => (
              <SelectItem key={key} value={value}>{value}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div><label className={LABEL_CLS}>Tax Number / VAT ID</label><input className={INPUT_CLS} value={formData.accounting.taxNumber} onChange={(e) => setFormData(p => ({ ...p, accounting: { ...p.accounting, taxNumber: e.target.value } }))} placeholder="GB123456789" /></div>
      <div><label className={LABEL_CLS}>Account Code</label><input className={INPUT_CLS} value={formData.accounting.accountCode} onChange={(e) => setFormData(p => ({ ...p, accounting: { ...p.accounting, accountCode: e.target.value } }))} placeholder="4000" /></div>
      <div><label className={LABEL_CLS}>Credit Limit</label><input type="number" className={INPUT_CLS} value={formData.accounting.creditLimit} onChange={(e) => setFormData(p => ({ ...p, accounting: { ...p.accounting, creditLimit: parseFloat(e.target.value) || 0 } }))} placeholder="0" /></div>
      <div><label className={LABEL_CLS}>Discount Rate (%)</label><input type="number" className={INPUT_CLS} value={formData.accounting.discountRate} onChange={(e) => setFormData(p => ({ ...p, accounting: { ...p.accounting, discountRate: parseFloat(e.target.value) || 0 } }))} placeholder="0" /></div>
    </div>
  );

  const CRMContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLS}>Status</label>
          <Select value={formData.crm.status} onValueChange={(v) => setFormData(p => ({ ...p, crm: { ...p.crm, status: v } }))}>
            <SelectTrigger className="focus:ring-[#d4a017]/30 focus:border-[#d4a017]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={CONTACT_STATUS.PROSPECT}>Prospect</SelectItem>
              <SelectItem value={CONTACT_STATUS.ACTIVE}>Active</SelectItem>
              <SelectItem value={CONTACT_STATUS.AT_RISK}>At Risk</SelectItem>
              <SelectItem value={CONTACT_STATUS.INACTIVE}>Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><label className={LABEL_CLS}>Source</label><input className={INPUT_CLS} value={formData.crm.source} onChange={(e) => setFormData(p => ({ ...p, crm: { ...p.crm, source: e.target.value } }))} placeholder="Website, Referral, etc." /></div>
        <div><label className={LABEL_CLS}>Industry</label><input className={INPUT_CLS} value={formData.crm.industry} onChange={(e) => setFormData(p => ({ ...p, crm: { ...p.crm, industry: e.target.value } }))} placeholder="Technology, Healthcare, etc." /></div>
        <div><label className={LABEL_CLS}>Company Size</label><input className={INPUT_CLS} value={formData.crm.companySize} onChange={(e) => setFormData(p => ({ ...p, crm: { ...p.crm, companySize: e.target.value } }))} placeholder="1-10, 11-50, 51-200, etc." /></div>
      </div>
      <div>
        <label className={LABEL_CLS}>Notes</label>
        <textarea className={`${INPUT_CLS} min-h-[100px] resize-y`} value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes about this contact..." rows={4} />
      </div>
    </div>
  );

  const renderTabContent = (activeTab) => {
    if (activeTab === 'basic')      return <BasicInfoContent />;
    if (activeTab === 'addresses')  return <AddressesContent />;
    if (activeTab === 'accounting') return <AccountingContent />;
    if (activeTab === 'crm')        return <CRMContent />;
    return null;
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Stat strip ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { icon: Users,       bg: 'bg-[#eef2ff]', color: 'text-[#6366f1]', val: statistics.total || 0,     label: 'Total'       },
          { icon: Check,       bg: 'bg-[#dcfce7]', color: 'text-[#16a34a]', val: statistics.active || 0,    label: 'Active'      },
          { icon: Star,        bg: 'bg-[#ede9fe]', color: 'text-[#7c3aed]', val: statistics.prospects || 0, label: 'Prospects'   },
          { icon: AlertCircle, bg: 'bg-[#fef3c7]', color: 'text-[#d97706]', val: statistics.atRisk || 0,    label: 'At Risk'     },
          { icon: Building2,   bg: 'bg-[#cffafe]', color: 'text-[#0891b2]', val: statistics.companies || 0, label: 'Companies'   },
          { icon: DollarSign,  bg: 'bg-[#d1fae5]', color: 'text-[#059669]', val: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(statistics.totalProfit || 0), label: 'Total Value' },
        ].map(({ icon: Icon, bg, color, val, label }) => (
          <div key={label} className="bg-white rounded-xl border border-[#e5e7eb] p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[20px] font-bold text-[#111113] leading-none truncate">{val}</p>
              <p className="text-[11px] text-[#9ca3af] uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Contact list ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-[#e5e7eb] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-[#111113]">
              Contacts <span className="text-[#9ca3af] font-normal text-[14px]">({filteredContacts.length})</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
                <input
                  className="pl-9 pr-3 py-2 text-[13px] rounded-lg border border-[#e5e7eb] bg-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017] w-48 transition-colors"
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {/* Status */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 text-[13px] h-9 focus:ring-[#d4a017]/30 focus:border-[#d4a017]">
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
              {/* Type */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36 text-[13px] h-9 focus:ring-[#d4a017]/30 focus:border-[#d4a017]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value={CONTACT_TYPES.COMPANY}>Companies</SelectItem>
                  <SelectItem value={CONTACT_TYPES.INDIVIDUAL}>Individuals</SelectItem>
                </SelectContent>
              </Select>
              {/* Add */}
              <button type="button" onClick={() => { setShowCreateForm(true); setActiveCreateTab('basic'); }} className={GOLD_BTN}>
                <Plus className="w-4 h-4" /> Add Contact
              </button>
            </div>
          </div>

          {/* Table / empty */}
          {filteredContacts.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-12 h-12 mx-auto text-[#d1d5db] mb-3" />
              <p className="text-[15px] font-medium text-[#374151] mb-1">No contacts found</p>
              <p className="text-[13px] text-[#9ca3af] mb-5">
                {contacts.length === 0 ? 'Get started by adding your first contact.' : 'No contacts match your current search and filter criteria.'}
              </p>
              <button type="button" onClick={() => setShowCreateForm(true)} className={GOLD_BTN}>
                <Plus className="w-4 h-4" /> Add Contact
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#fafafa] border-b border-[#e5e7eb]">
                    {['Company', 'Status', 'Contact Info', 'Value', ''].map((h, i) => (
                      <th key={i} className={`px-5 py-2.5 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider ${i === 4 ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact, index) => (
                    <tr
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className={`border-b border-[#f3f4f6] cursor-pointer transition-colors ${
                        selectedContact?.id === contact.id
                          ? 'bg-[#fef9ee]'
                          : index % 2 === 1 ? 'bg-[#fafbfc] hover:bg-[#fef9ee]' : 'bg-white hover:bg-[#fef9ee]'
                      }`}
                    >
                      {/* Company */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#f3f4f6] flex items-center justify-center flex-shrink-0">
                            {contact.type === CONTACT_TYPES.COMPANY
                              ? <Building2 className="w-4 h-4 text-[#6b7280]" />
                              : <User      className="w-4 h-4 text-[#6b7280]" />}
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-[#111113]">{contact.name}</p>
                            {contact.primaryContact && <p className="text-[11px] text-[#9ca3af]">{contact.primaryContact}</p>}
                          </div>
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${getStatusBadge(contact.crm.status)}`}>
                          {contact.crm.status}
                        </span>
                      </td>
                      {/* Contact info */}
                      <td className="px-5 py-3">
                        <div className="space-y-0.5">
                          {contact.email && (
                            <div className="flex items-center gap-1.5 text-[12px] text-[#6b7280]">
                              <Mail className="w-3 h-3 text-[#9ca3af] flex-shrink-0" />
                              <span className="truncate max-w-[170px]">{contact.email}</span>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-1.5 text-[12px] text-[#6b7280]">
                              <Phone className="w-3 h-3 text-[#9ca3af] flex-shrink-0" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Value */}
                      <td className="px-5 py-3">
                        {contact.crm.totalProfit > 0
                          ? <span className="text-[13px] font-semibold text-[#059669]">{formatCurrency(contact.crm.totalProfit, contact.accounting.currency)}</span>
                          : <span className="text-[13px] text-[#d1d5db]">—</span>
                        }
                      </td>
                      {/* Actions */}
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleEditContact(contact); }} className={GHOST_BTN}>
                            <Edit className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteContact(contact.id); }} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#9ca3af] hover:bg-[#fee2e2] hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="px-5 py-2.5 bg-[#fafafa] border-t border-[#e5e7eb] text-[12px] text-[#9ca3af]">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
            {filteredContacts.length !== contacts.length && ` · ${filteredContacts.length} shown`}
          </div>
        </div>

        {/* ── Detail panel ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          {selectedContact ? (
            <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
              {/* Panel header */}
              <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#f3f4f6] flex items-center justify-center">
                    {selectedContact.type === CONTACT_TYPES.COMPANY
                      ? <Building2 className="w-4 h-4 text-[#6b7280]" />
                      : <User      className="w-4 h-4 text-[#6b7280]" />}
                  </div>
                  <span className="text-[15px] font-semibold text-[#111113]">Contact Details</span>
                </div>
                <button type="button" onClick={() => handleEditContact(selectedContact)} className={OUTLINE_BTN}>
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
              </div>

              <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-280px)]">
                {/* Name + status */}
                <div>
                  <h4 className="text-[16px] font-semibold text-[#111113] mb-2">{selectedContact.name}</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getStatusBadge(selectedContact.crm.status)}`}>
                    {selectedContact.crm.status}
                  </span>
                </div>

                {/* Contact info */}
                <div className="space-y-1.5">
                  <p className={SECTION_H}>Contact Info</p>
                  {selectedContact.primaryContact && <div className="text-[13px] text-[#374151]"><span className="text-[#9ca3af]">Contact: </span>{selectedContact.primaryContact}</div>}
                  {selectedContact.email && <div className="flex items-center gap-2 text-[13px] text-[#374151]"><Mail className="w-3.5 h-3.5 text-[#9ca3af]" />{selectedContact.email}</div>}
                  {selectedContact.phone && <div className="flex items-center gap-2 text-[13px] text-[#374151]"><Phone className="w-3.5 h-3.5 text-[#9ca3af]" />{selectedContact.phone}</div>}
                  {selectedContact.website && <div className="text-[13px] text-[#374151]"><span className="text-[#9ca3af]">Web: </span>{selectedContact.website}</div>}
                </div>

                {/* Addresses */}
                {selectedContact.addresses.length > 0 && (
                  <div>
                    <p className={SECTION_H}>Addresses</p>
                    <div className="space-y-2">
                      {selectedContact.addresses.map((address, index) => (
                        <div key={index} className="text-[12px] p-3 bg-[#fafafa] rounded-lg border border-[#e5e7eb]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">{address.type}</span>
                            {address.isPrimary && <span className="text-[11px] font-semibold text-[#d4a017]">Primary</span>}
                          </div>
                          <p className="text-[#374151]">{address.line1}</p>
                          {address.line2 && <p className="text-[#374151]">{address.line2}</p>}
                          <p className="text-[#374151]">{address.city}, {address.state} {address.postcode}</p>
                          <p className="text-[#374151]">{address.country}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CRM info */}
                <div>
                  <p className={SECTION_H}>CRM Information</p>
                  <div className="space-y-1.5 text-[13px]">
                    <div className="flex justify-between"><span className="text-[#9ca3af]">Total Profit</span><span className="font-semibold text-[#059669]">{formatCurrency(selectedContact.crm.totalProfit, selectedContact.accounting.currency)}</span></div>
                    <div className="flex justify-between"><span className="text-[#9ca3af]">Renewals</span><span className="text-[#374151]">{selectedContact.crm.renewalsCount}</span></div>
                    <div className="flex justify-between"><span className="text-[#9ca3af]">Open Opportunities</span><span className="text-[#374151]">{selectedContact.crm.openOppsCount}</span></div>
                    {selectedContact.crm.industry && <div className="flex justify-between"><span className="text-[#9ca3af]">Industry</span><span className="text-[#374151]">{selectedContact.crm.industry}</span></div>}
                    {selectedContact.crm.source   && <div className="flex justify-between"><span className="text-[#9ca3af]">Source</span><span className="text-[#374151]">{selectedContact.crm.source}</span></div>}
                  </div>
                </div>

                {/* Accounting */}
                <div>
                  <p className={SECTION_H}>Accounting</p>
                  <div className="space-y-1.5 text-[13px]">
                    <div className="flex justify-between"><span className="text-[#9ca3af]">Currency</span><span className="text-[#374151]">{selectedContact.accounting.currency}</span></div>
                    <div className="flex justify-between"><span className="text-[#9ca3af]">Payment Terms</span><span className="text-[#374151]">{selectedContact.accounting.paymentTerms}</span></div>
                    {selectedContact.accounting.taxNumber   && <div className="flex justify-between"><span className="text-[#9ca3af]">Tax Number</span><span className="text-[#374151]">{selectedContact.accounting.taxNumber}</span></div>}
                    {selectedContact.accounting.accountCode && <div className="flex justify-between"><span className="text-[#9ca3af]">Account Code</span><span className="text-[#374151]">{selectedContact.accounting.accountCode}</span></div>}
                  </div>
                </div>

                {/* Notes */}
                {selectedContact.notes && (
                  <div>
                    <p className={SECTION_H}>Notes</p>
                    <p className="text-[13px] text-[#374151] p-3 bg-[#fafafa] rounded-lg border border-[#e5e7eb]">{selectedContact.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#e5e7eb] py-16 text-center">
              <Users className="w-12 h-12 mx-auto text-[#d1d5db] mb-3" />
              <p className="text-[15px] font-medium text-[#374151] mb-1">Select a Contact</p>
              <p className="text-[13px] text-[#9ca3af]">Choose a contact from the list to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Create Contact Modal ──────────────────────────────────────────────── */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-10 overflow-y-auto">
          <div className="bg-white rounded-xl border border-[#e5e7eb] w-full max-w-3xl flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between flex-shrink-0">
              <h3 className="text-[16px] font-semibold text-[#111113]">Create New Contact</h3>
              <button type="button" onClick={() => { setShowCreateForm(false); resetForm(); }} className={GHOST_BTN}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-shrink-0">
              <FormTabs tabs={FORM_TABS} active={activeCreateTab} onChange={setActiveCreateTab} />
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {renderTabContent(activeCreateTab)}
            </div>
            <div className="px-6 py-4 border-t border-[#e5e7eb] flex justify-end gap-3 flex-shrink-0">
              <button type="button" onClick={() => { setShowCreateForm(false); resetForm(); }} className={OUTLINE_BTN}>Cancel</button>
              <button type="button" onClick={handleCreateContact} disabled={!formData.name} className={GOLD_BTN}>Create Contact</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Contact Modal ────────────────────────────────────────────────── */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-10 overflow-y-auto">
          <div className="bg-white rounded-xl border border-[#e5e7eb] w-full max-w-3xl flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between flex-shrink-0">
              <h3 className="text-[16px] font-semibold text-[#111113]">Edit Contact</h3>
              <button type="button" onClick={() => { setShowEditForm(false); resetForm(); }} className={GHOST_BTN}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-shrink-0">
              <FormTabs tabs={FORM_TABS} active={activeEditTab} onChange={setActiveEditTab} />
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {renderTabContent(activeEditTab)}
            </div>
            <div className="px-6 py-4 border-t border-[#e5e7eb] flex justify-end gap-3 flex-shrink-0">
              <button type="button" onClick={() => { setShowEditForm(false); resetForm(); }} className={OUTLINE_BTN}>Cancel</button>
              <button type="button" onClick={handleUpdateContact} disabled={!formData.name} className={GOLD_BTN}>Update Contact</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactManager;
