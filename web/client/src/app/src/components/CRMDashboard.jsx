import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { 
  Building2, 
  Users, 
  Coins, 
  Calendar,
  Search,
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  TrendingUp,
  X,
  Target,
  Clock,
  Download,
  FileText
} from 'lucide-react';
import QuoteTemplatesManager from './QuoteTemplatesManager';

// ── Design tokens ──────────────────────────────────────────────────────────────
const INPUT_CLS   = 'w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] text-[#111113] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017] transition-colors';
const LABEL_CLS   = 'block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5';
const SECTION_H   = 'text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider';
const GOLD_BTN    = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#d4a017] text-[#111113] text-[13px] font-semibold hover:bg-[#b8860b] transition-colors disabled:opacity-50';
const OUTLINE_BTN = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#e5e7eb] bg-white text-[#374151] text-[13px] font-medium hover:bg-[#f9fafb] transition-colors';
const GHOST_BTN   = 'inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors';

const QUOTE_STATUS_BADGE = {
  draft:    'bg-[#f3f4f6] text-[#6b7280]',
  sent:     'bg-[#dbeafe] text-[#1e40af]',
  accepted: 'bg-[#dcfce7] text-[#166534]',
  declined: 'bg-[#fee2e2] text-[#991b1b]',
};

// World currencies data
const worldCurrencies = [
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
];

export default function CRMDashboard({ defaultTab = 'customers' }) {
  console.log('[CRMDashboard] Component mounting...');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(defaultTab);
  console.log('[CRMDashboard] State initialized');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [editingContact, setEditingContact] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingProductData, setEditingProductData] = useState(null);
  const [customerServices, setCustomerServices] = useState({});
  const [contactInfo, setContactInfo] = useState({});
  const [selectedCurrency, setSelectedCurrency] = useState('GBP');
  const [productCatalog, setProductCatalog] = useState([]);
  const [renewalAlertDays, setRenewalAlertDays] = useState(60);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', category: '', defaultOurCost: '', defaultClientPrice: '', unit: '', defaultQuantity: 0, active: true
  });
  const [alphabetFilter, setAlphabetFilter] = useState('ALL');
  const [serviceNotes, setServiceNotes] = useState({});
  const [renewalDates, setRenewalDates] = useState({});
  const [showNotesModal, setShowNotesModal] = useState(null);
  const [currentNote, setCurrentNote] = useState('');
  const [quotes, setQuotes] = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Load customer services from database API
  useEffect(() => {
    const loadCustomerServices = async () => {
      try {
        const response = await fetch('/api/customer-services', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          const servicesObj = {};
          data.forEach(service => {
            if (!servicesObj[service.contact_id]) servicesObj[service.contact_id] = [];
            servicesObj[service.contact_id].push(service);
          });
          setCustomerServices(servicesObj);
          console.log('[CRMDashboard] Customer services loaded:', data.length);
        }
      } catch (error) {
        console.error('[CRMDashboard] Error loading customer services:', error);
      }
    };
    loadCustomerServices();
    const intervalId = setInterval(loadCustomerServices, 10000);
    return () => clearInterval(intervalId);
  }, []);

  // Load product catalog from database API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch('/api/products', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setProductCatalog(data.products || []);
          console.log('[CRMDashboard] Products loaded:', data.products?.length || 0);
        }
      } catch (error) {
        console.error('[CRMDashboard] Error loading products:', error);
      }
    };
    loadProducts();
    const intervalId = setInterval(loadProducts, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const getCurrentCurrencySymbol = () =>
    worldCurrencies.find(c => c.code === selectedCurrency)?.symbol || '£';

  // Load contacts from database API
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  useEffect(() => {
    const loadContacts = async () => {
      setContactsLoading(true);
      try {
        const response = await fetch('/api/contacts', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setContacts(data);
          console.log('[CRMDashboard] Contacts loaded:', data.length);
        } else {
          console.error('[CRMDashboard] Failed to fetch contacts:', response.statusText);
          setContacts([]);
        }
      } catch (error) {
        console.error('[CRMDashboard] Error fetching contacts:', error);
        setContacts([]);
      } finally {
        setContactsLoading(false);
      }
    };
    loadContacts();
    const intervalId = setInterval(loadContacts, 10000);
    return () => clearInterval(intervalId);
  }, []);

  // Fetch quotes from API
  useEffect(() => {
    console.log('[CRMDashboard] Fetching quotes from API...');
    const fetchQuotes = async () => {
      setQuotesLoading(true);
      try {
        const response = await fetch('/api/quotes', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setQuotes(data.quotes || []);
          console.log('[CRMDashboard] Quotes loaded:', data.quotes?.length || 0);
        } else {
          console.error('[CRMDashboard] Failed to fetch quotes:', response.statusText);
          setQuotes([]);
        }
      } catch (error) {
        console.error('[CRMDashboard] Error fetching quotes:', error);
        setQuotes([]);
      } finally {
        setQuotesLoading(false);
      }
    };
    fetchQuotes();
    const intervalId = setInterval(fetchQuotes, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const filteredCompanies = (Array.isArray(contacts) ? contacts : []).filter(contact => {
    const matchesSearch = searchTerm === '' || contact.name.toLowerCase().startsWith(searchTerm.toLowerCase());
    const matchesAlphabet = alphabetFilter === 'ALL' || contact.name.charAt(0).toUpperCase() === alphabetFilter;
    return matchesSearch && matchesAlphabet;
  });

  const totalProfit = useMemo(() => {
    let total = 0;
    if (customerServices && Object.keys(customerServices).length > 0) {
      total = (Array.isArray(contacts) ? contacts : []).reduce((sum, contact) => {
        const services = customerServices[contact.id] || [];
        const contactProfit = services.reduce((contactSum, service) => {
          if (service && service.quantity > 0) {
            return contactSum + ((service.clientPrice - service.ourCost) * service.quantity);
          }
          return contactSum;
        }, 0);
        return sum + contactProfit;
      }, 0);
    } else {
      total = (Array.isArray(contacts) ? contacts : []).reduce((sum, contact) => sum + (contact.crm?.totalProfit || 0), 0);
    }
    return total;
  }, [customerServices, contacts]);

  const totalRenewals     = (Array.isArray(contacts) ? contacts : []).reduce((sum, c) => sum + (c.crm?.renewalsCount || 0), 0);
  const totalOpportunities= (Array.isArray(contacts) ? contacts : []).reduce((sum, c) => sum + (c.crm?.openOppsCount || 0), 0);

  const initializeCustomerServices = (companyId) => {
    if (!customerServices[companyId]) {
      const initialServices = productCatalog.map(product => ({
        id: product.id, name: product.name, category: product.category,
        ourCost: product.defaultOurCost, clientPrice: product.defaultClientPrice,
        quantity: 0, unit: product.unit, active: false
      }));
      setCustomerServices(prev => ({ ...prev, [companyId]: initialServices }));
    }
  };

  const getCustomerServices = (companyId) => {
    try {
      if (!companyId) return [];
      const existingServices = customerServices[companyId];
      if (!existingServices || !Array.isArray(existingServices)) {
        initializeCustomerServices(companyId);
        return [];
      }
      return productCatalog.map(product => {
        try {
          const existingService = existingServices.find(s => s && s.id === product.id);
          if (existingService) return existingService;
          const newService = {
            id: product.id, name: product.name, category: product.category,
            ourCost: product.defaultOurCost || 0, clientPrice: product.defaultClientPrice || 0,
            quantity: 0, unit: product.unit || 'unit', active: false
          };
          setCustomerServices(prev => ({ ...prev, [companyId]: [...(prev[companyId] || []), newService] }));
          return newService;
        } catch (productError) {
          console.warn('Error processing product:', product.id, productError);
          return { id: product.id, name: product.name || 'Unknown', category: product.category || 'General', ourCost: 0, clientPrice: 0, quantity: 0, unit: 'unit', active: false };
        }
      });
    } catch (error) {
      console.warn('Error in getCustomerServices mapping:', error);
      return [];
    }
  };

  const calculateCustomerTotalProfit = (companyId) => {
    try {
      if (!companyId) return 0;
      const services = getCustomerServices(companyId);
      if (!services || !Array.isArray(services)) return 0;
      return services.reduce((total, service) => {
        try {
          if (service && typeof service.clientPrice === 'number' && typeof service.ourCost === 'number' && typeof service.quantity === 'number' && service.quantity > 0) {
            const profit = (service.clientPrice - service.ourCost) * service.quantity;
            return total + (isNaN(profit) ? 0 : profit);
          }
          return total;
        } catch (serviceError) { console.warn('Error calculating service profit:', serviceError); return total; }
      }, 0);
    } catch (error) { console.warn('Error calculating customer total profit for company:', companyId, error); return 0; }
  };

  const updateCustomerService = async (companyId, serviceId, updates) => {
    try {
      const servicesResponse = await fetch('/api/customer-services', { credentials: 'include' });
      const services = await servicesResponse.json();
      const existingService = services.find(s => s.contact_id === companyId && s.product_id === serviceId);
      if (existingService) {
        const response = await fetch(`/api/customer-services/${existingService.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ quantity: updates.quantity, our_cost: updates.ourCost, client_price: updates.clientPrice, active: updates.active })
        });
        if (!response.ok) throw new Error('Failed to update service');
      } else if (updates.active || updates.quantity > 0) {
        const response = await fetch('/api/customer-services', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ contact_id: companyId, product_id: serviceId, quantity: updates.quantity || 0, our_cost: updates.ourCost || 0, client_price: updates.clientPrice || 0, active: updates.active || false })
        });
        if (!response.ok) throw new Error('Failed to create service');
      }
      const refreshResponse = await fetch('/api/customer-services', { credentials: 'include' });
      const refreshedServices = await refreshResponse.json();
      const servicesObj = {};
      refreshedServices.forEach(service => {
        if (!servicesObj[service.contact_id]) servicesObj[service.contact_id] = [];
        servicesObj[service.contact_id].push(service);
      });
      setCustomerServices(servicesObj);
    } catch (error) {
      console.error('Error updating customer service:', error);
      alert('Failed to update service. Please try again.');
    }
  };

  const getContactInfo = (contact) => {
    return contactInfo[contact.id] || {
      name: contact.primaryContact || contact.name,
      email: contact.email, phone: contact.phone,
      address: contact.addresses?.[0] ? `${contact.addresses[0].street || ''} ${contact.addresses[0].city || ''} ${contact.addresses[0].postalCode || ''}`.trim() : ''
    };
  };

  const updateContactInfo = (companyId, field, value) => {
    setContactInfo(prev => ({ ...prev, [companyId]: { ...prev[companyId], [field]: value } }));
  };

  const updateProduct = async (productId, updates) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update product');
      const productsResponse = await fetch('/api/products', { credentials: 'include' });
      const productsData = await productsResponse.json();
      setProductCatalog(productsData.products || []);
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product. Please try again.');
    }
  };

  const addNewProduct = async () => {
    if (!newProduct.name.trim()) return;
    const productToAdd = {
      name: newProduct.name, type: newProduct.category,
      our_cost: parseFloat(newProduct.defaultOurCost) || 0,
      client_price: parseFloat(newProduct.defaultClientPrice) || 0,
      unit: newProduct.unit,
      default_quantity: parseInt(newProduct.defaultQuantity) || 0,
      tax_rate: 0, active: newProduct.active
    };
    try {
      const response = await fetch('/api/products', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(productToAdd)
      });
      if (!response.ok) throw new Error('Failed to create product');
      const productsResponse = await fetch('/api/products', { credentials: 'include' });
      const productsData = await productsResponse.json();
      setProductCatalog(productsData.products || []);
      setNewProduct({ name: '', category: '', defaultOurCost: '', defaultClientPrice: '', unit: '', defaultQuantity: 0, active: true });
      setShowNewProductForm(false);
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product. Please try again.');
    }
  };

  const cancelNewProduct = () => {
    setNewProduct({ name: '', category: '', defaultOurCost: '', defaultClientPrice: '', unit: '', defaultQuantity: 0, active: true });
    setShowNewProductForm(false);
  };

  const removeProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const response = await fetch(`/api/products/${productId}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) throw new Error('Failed to delete product');
      const productsResponse = await fetch('/api/products', { credentials: 'include' });
      const productsData = await productsResponse.json();
      setProductCatalog(productsData.products || []);
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    }
  };

  const alphabetLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const openNotesModal = (companyId, serviceId) => {
    const noteKey = `${companyId}-${serviceId}`;
    setCurrentNote(serviceNotes[noteKey] || '');
    setShowNotesModal({ companyId, serviceId });
  };

  const saveNote = () => {
    if (showNotesModal) {
      const noteKey = `${showNotesModal.companyId}-${showNotesModal.serviceId}`;
      setServiceNotes(prev => ({ ...prev, [noteKey]: currentNote }));
      const existingNotes = JSON.parse(localStorage.getItem('serviceNotes') || '{}');
      existingNotes[noteKey] = currentNote;
      localStorage.setItem('serviceNotes', JSON.stringify(existingNotes));
      setShowNotesModal(null);
      setCurrentNote('');
    }
  };

  const updateRenewalDate = (companyId, serviceId, date) => {
    const renewalKey = `${companyId}-${serviceId}`;
    setRenewalDates(prev => ({ ...prev, [renewalKey]: date }));
    if (date) {
      const company = contacts.find(c => c.id === companyId);
      const service = getCustomerServices(companyId).find(s => s.id === serviceId);
      const calendarEntry = {
        id: `renewal-${renewalKey}-${Date.now()}`,
        title: `${company?.name} - ${service?.name} Renewal`,
        date, time: '09:00', type: 'Follow-up',
        description: `Sell this to the customer! ${service?.name} renewal opportunity for ${company?.name}`,
        company: company?.name, service: service?.name
      };
      const existingEvents = JSON.parse(localStorage.getItem('crmCalendarEvents') || '[]');
      const updatedEvents = [...existingEvents.filter(e => e.id !== calendarEntry.id), calendarEntry];
      localStorage.setItem('crmCalendarEvents', JSON.stringify(updatedEvents));
      console.log(`Created CRM calendar entry for ${company?.name} - ${service?.name} on ${date}: "Sell this to the customer!"`);
    }
  };

  const exportCRMData = () => {
    const csvData = [];
    csvData.push(['Company Name','Primary Contact','Email','Phone','Address','Status','Total Profit','Renewals Count','Open Opportunities','Last Activity','Next CRM Event']);
    contacts.forEach(company => {
      csvData.push([company.name, company.primaryContact, company.email, company.phone, company.address, company.status, calculateCustomerTotalProfit(company.id), company.renewalsCount, company.openOppsCount, company.lastActivity, company.nextCRMEvent]);
    });
    csvData.push([]);
    csvData.push(['PRODUCT CATALOG']);
    csvData.push(['Product Name','Category','Default Our Cost','Default Client Price','Unit','Active']);
    productCatalog.forEach(product => {
      csvData.push([product.name, product.category, product.defaultOurCost, product.defaultClientPrice, product.unit, product.active ? 'Yes' : 'No']);
    });
    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `crm_backup_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-[#111113] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#d4a017]" />
            Customer Relationship Management
          </h1>
          <p className="text-[13px] text-[#9ca3af] mt-0.5">Manage customers, track services, and monitor renewals</p>
        </div>
        <button type="button" className={GOLD_BTN}>
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* ── Stat strip ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Building2,    bg: 'bg-[#dbeafe]', color: 'text-[#2563eb]', val: contacts.length,      label: 'Customers'      },
          { icon: Coins,        bg: 'bg-[#dcfce7]', color: 'text-[#16a34a]', val: `${getCurrentCurrencySymbol()}${totalProfit.toLocaleString()}`, label: 'Total Profit' },
          { icon: AlertTriangle,bg: 'bg-[#fef3c7]', color: 'text-[#d97706]', val: totalRenewals,        label: 'Renewals Due'   },
          { icon: TrendingUp,   bg: 'bg-[#ede9fe]', color: 'text-[#7c3aed]', val: totalOpportunities,  label: 'Open Opps'      },
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

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex border-b border-[#e5e7eb] bg-transparent h-auto p-0 w-full rounded-none overflow-x-auto">
            {[
              { value: 'customers', label: 'Customers'       },
              { value: 'catalog',   label: 'Product Catalog' },
              { value: 'quotes',    label: 'Quotes'          },
              { value: 'templates', label: 'Quote Templates' },
              { value: 'settings',  label: 'CRM Settings'    },
            ].map(t => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="flex-shrink-0 rounded-none px-5 py-3 text-[13px] font-medium border-b-2 -mb-px
                           data-[state=active]:border-[#d4a017] data-[state=active]:text-[#111113] data-[state=active]:bg-transparent data-[state=active]:shadow-none
                           data-[state=inactive]:border-transparent data-[state=inactive]:text-[#6b7280]
                           hover:text-[#111113] transition-colors"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Customers tab ─────────────────────────────────────────────── */}
          <TabsContent value="customers" className="p-5 space-y-4">
            {/* Search + filter bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
                <input
                  className="pl-9 pr-3 py-2 text-[13px] rounded-lg border border-[#e5e7eb] bg-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017] w-full transition-colors"
                  placeholder="Search by company name (starts with)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button type="button" className={GOLD_BTN}>
                <Plus className="w-4 h-4" /> Add Customer
              </button>
            </div>

            {/* Alphabet nav */}
            <div className="hidden lg:block bg-[#fafafa] rounded-lg border border-[#e5e7eb] p-3">
              <div className="flex flex-wrap gap-1 justify-center">
                <button
                  onClick={() => setAlphabetFilter('ALL')}
                  className={`h-7 px-2.5 rounded text-[11px] font-semibold transition-colors ${alphabetFilter === 'ALL' ? 'bg-[#d4a017] text-[#111113]' : 'bg-white border border-[#e5e7eb] text-[#6b7280] hover:border-[#d4a017] hover:text-[#111113]'}`}
                >
                  ALL
                </button>
                {alphabetLetters.map(letter => {
                  const hasCompanies = (Array.isArray(contacts) ? contacts : []).some(c => c.name.charAt(0).toUpperCase() === letter);
                  return (
                    <button
                      key={letter}
                      onClick={() => setAlphabetFilter(letter)}
                      disabled={!hasCompanies}
                      className={`h-7 w-7 rounded text-[11px] font-semibold transition-colors ${
                        alphabetFilter === letter
                          ? 'bg-[#d4a017] text-[#111113]'
                          : hasCompanies
                            ? 'bg-white border border-[#e5e7eb] text-[#6b7280] hover:border-[#d4a017] hover:text-[#111113]'
                            : 'bg-white border border-[#e5e7eb] text-[#d1d5db] cursor-not-allowed'
                      }`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
              <p className="text-[12px] text-[#9ca3af] mt-2 text-center">
                Showing {filteredCompanies.length} of {contacts.length} customers
                {alphabetFilter !== 'ALL' && ` starting with "${alphabetFilter}"`}
              </p>
            </div>

            {/* Customer list */}
            <div className="space-y-1">
              {filteredCompanies.map((company, index) => (
                <div
                  key={company.id}
                  onClick={() => setSelectedCompany(company)}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border border-[#e5e7eb] cursor-pointer transition-colors ${
                    index % 2 === 0 ? 'bg-white hover:bg-[#fef9ee]' : 'bg-[#fafafa] hover:bg-[#fef9ee]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#f3f4f6] flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-[#6b7280]" />
                    </div>
                    <span className="text-[13px] font-medium text-[#111113]">{company.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2 sm:mt-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${company.status === 'Active' ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'}`}>
                      {company.status}
                    </span>
                    {company.renewalsCount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef3c7] text-[#92400e]">
                        {company.renewalsCount} Renewals Due
                      </span>
                    )}
                    {company.openOppsCount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ede9fe] text-[#7c3aed]">
                        {company.openOppsCount} Open Opp{company.openOppsCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {filteredCompanies.length === 0 && (
                <div className="py-12 text-center">
                  <Building2 className="w-10 h-10 mx-auto text-[#d1d5db] mb-3" />
                  <p className="text-[14px] font-medium text-[#374151] mb-1">No customers found</p>
                  <p className="text-[13px] text-[#9ca3af]">
                    {contacts.length === 0 ? 'Add your first customer to get started.' : 'No customers match your current filter.'}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Product Catalog tab ───────────────────────────────────────── */}
          <TabsContent value="catalog" className="p-5 space-y-4">
            {/* New product form */}
            {showNewProductForm && (
              <div className="border border-[#d4a017]/30 rounded-xl bg-[#fef9ee] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[14px] font-semibold text-[#111113]">Add New Product / Service</h3>
                  <button type="button" onClick={cancelNewProduct} className={GHOST_BTN}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                  <div><label className={LABEL_CLS}>Product Name</label><input className={INPUT_CLS} value={newProduct.name} onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))} placeholder="Enter product name" /></div>
                  <div><label className={LABEL_CLS}>Category</label><input className={INPUT_CLS} value={newProduct.category} onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))} placeholder="e.g., Maintenance" /></div>
                  <div><label className={LABEL_CLS}>Our Cost</label><input type="number" step="0.01" className={INPUT_CLS} value={newProduct.defaultOurCost} onChange={(e) => setNewProduct(prev => ({ ...prev, defaultOurCost: e.target.value }))} placeholder="0.00" /></div>
                  <div><label className={LABEL_CLS}>Client Price</label><input type="number" step="0.01" className={INPUT_CLS} value={newProduct.defaultClientPrice} onChange={(e) => setNewProduct(prev => ({ ...prev, defaultClientPrice: e.target.value }))} placeholder="0.00" /></div>
                  <div><label className={LABEL_CLS}>Unit</label><input className={INPUT_CLS} value={newProduct.unit} onChange={(e) => setNewProduct(prev => ({ ...prev, unit: e.target.value }))} placeholder="e.g., service, hour" /></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-[13px] text-[#374151] cursor-pointer">
                      <input type="checkbox" checked={newProduct.active} onChange={(e) => setNewProduct(prev => ({ ...prev, active: e.target.checked }))} className="rounded" />
                      Active
                    </label>
                    <span className="text-[13px] text-[#6b7280]">
                      Margin: {getCurrentCurrencySymbol()}{((parseFloat(newProduct.defaultClientPrice) || 0) - (parseFloat(newProduct.defaultOurCost) || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={cancelNewProduct} className={OUTLINE_BTN}>Cancel</button>
                    <button type="button" onClick={addNewProduct} disabled={!newProduct.name.trim()} className={GOLD_BTN}>Save Product</button>
                  </div>
                </div>
              </div>
            )}

            {/* Products table */}
            <div className="border border-[#e5e7eb] rounded-xl overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#fafafa] border-b border-[#e5e7eb]">
                    {['Product', 'Category', 'Our Cost', 'Client Price', 'Margin', 'Unit', 'Def. Qty', ''].map((h, i) => (
                      <th key={i} className={`px-4 py-2.5 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider ${i === 7 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {productCatalog.map((product, index) => {
                    const isEditing = editingProduct === product.id;
                    const margin = product.client_price - product.our_cost;
                    return (
                      <tr key={product.id} className={`border-b border-[#f3f4f6] transition-colors ${index % 2 === 1 ? 'bg-[#fafbfc] hover:bg-[#fef9ee]' : 'bg-white hover:bg-[#fef9ee]'}`}>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input className={INPUT_CLS} value={editingProductData?.name !== undefined ? editingProductData.name : product.name} onChange={(e) => setEditingProductData(prev => ({ ...prev, name: e.target.value }))} />
                          ) : (
                            <div>
                              <p className="text-[13px] font-medium text-[#111113]">{product.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <label className="flex items-center gap-1.5 text-[11px] text-[#9ca3af] cursor-pointer">
                                  <input type="checkbox" checked={editingProductData?.is_active !== undefined ? editingProductData.is_active : product.is_active} onChange={(e) => setEditingProductData(prev => ({ ...prev, is_active: e.target.checked }))} className="rounded" />
                                  Active
                                </label>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input className={INPUT_CLS} value={editingProductData?.type !== undefined ? editingProductData.type : product.type} onChange={(e) => setEditingProductData(prev => ({ ...prev, type: e.target.value }))} />
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#f3f4f6] text-[#6b7280]">{product.type}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#374151]">
                          {isEditing ? (
                            <input type="number" step="0.01" className={INPUT_CLS} value={editingProductData?.our_cost !== undefined ? editingProductData.our_cost : product.our_cost} onChange={(e) => setEditingProductData(prev => ({ ...prev, our_cost: e.target.value === '' ? '' : parseFloat(e.target.value) }))} />
                          ) : `${getCurrentCurrencySymbol()}${product.our_cost}`}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#374151]">
                          {isEditing ? (
                            <input type="number" step="0.01" className={INPUT_CLS} value={editingProductData?.client_price !== undefined ? editingProductData.client_price : product.client_price} onChange={(e) => setEditingProductData(prev => ({ ...prev, client_price: e.target.value === '' ? '' : parseFloat(e.target.value) }))} />
                          ) : `${getCurrentCurrencySymbol()}${product.client_price}`}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[13px] font-semibold ${margin >= 0 ? 'text-[#059669]' : 'text-red-600'}`}>
                            {getCurrentCurrencySymbol()}{margin.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#374151]">
                          {isEditing ? (
                            <input className={INPUT_CLS} value={editingProductData?.unit !== undefined ? editingProductData.unit : product.unit} onChange={(e) => setEditingProductData(prev => ({ ...prev, unit: e.target.value }))} />
                          ) : product.unit}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#374151]">
                          {isEditing ? (
                            <input type="number" min="1" className={INPUT_CLS} value={editingProductData?.default_quantity !== undefined ? editingProductData.default_quantity : product.default_quantity} onChange={(e) => setEditingProductData(prev => ({ ...prev, default_quantity: parseInt(e.target.value) || 1 }))} />
                          ) : product.default_quantity}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={async () => {
                                if (isEditing) {
                                  if (editingProductData) {
                                    const dataToSave = { ...editingProductData };
                                    if (dataToSave.our_cost === '') dataToSave.our_cost = 0;
                                    if (dataToSave.client_price === '') dataToSave.client_price = 0;
                                    if (dataToSave.default_quantity === '') dataToSave.default_quantity = 0;
                                    await updateProduct(product.id, dataToSave);
                                  }
                                  setEditingProduct(null);
                                  setEditingProductData(null);
                                } else {
                                  setEditingProduct(product.id);
                                  setEditingProductData({});
                                }
                              }}
                              className={GHOST_BTN}
                            >
                              {isEditing ? <span className="text-[11px] font-semibold text-[#d4a017] px-1">Save</span> : <Edit className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => { if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) removeProduct(product.id); }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#9ca3af] hover:bg-[#fee2e2] hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {productCatalog.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-[#9ca3af]">
                        No products in catalog yet. Add your first product above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <button type="button" className={OUTLINE_BTN}>Import CSV</button>
              <button type="button" onClick={() => setShowNewProductForm(true)} className={GOLD_BTN}>
                <Plus className="w-4 h-4" /> Add Product / Service
              </button>
            </div>
          </TabsContent>

          {/* ── Quotes tab ────────────────────────────────────────────────── */}
          <TabsContent value="quotes" className="p-5 space-y-4">
            {quotesLoading ? (
              <div className="py-12 text-center text-[13px] text-[#9ca3af]">Loading quotes...</div>
            ) : quotes.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="w-10 h-10 mx-auto text-[#d1d5db] mb-3" />
                <p className="text-[14px] font-medium text-[#374151] mb-1">No quotes yet</p>
                <p className="text-[13px] text-[#9ca3af]">Create your first quote to get started.</p>
              </div>
            ) : (
              <div className="border border-[#e5e7eb] rounded-xl overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#fafafa] border-b border-[#e5e7eb]">
                      {['Quote #', 'Customer', 'Date', 'Amount', 'Status'].map((h, i) => (
                        <th key={i} className={`px-5 py-2.5 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((quote, index) => (
                      <tr
                        key={quote.id}
                        onClick={() => navigate(`/app/crm/quotes/${quote.id}/edit`)}
                        className={`border-b border-[#f3f4f6] cursor-pointer transition-colors ${index % 2 === 1 ? 'bg-[#fafbfc] hover:bg-[#fef9ee]' : 'bg-white hover:bg-[#fef9ee]'}`}
                      >
                        <td className="px-5 py-3 text-[13px] font-semibold text-[#111113]">{quote.quote_number}</td>
                        <td className="px-5 py-3 text-[13px] text-[#374151]">{quote.customer_name}</td>
                        <td className="px-5 py-3 text-[13px] text-[#6b7280]">
                          {quote.created_at ? new Date(quote.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </td>
                        <td className="px-5 py-3 text-right text-[13px] font-semibold text-[#111113]">£{parseFloat(quote.total_amount).toFixed(2)}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${QUOTE_STATUS_BADGE[quote.status] || 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                            {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end">
              <button type="button" onClick={() => navigate('/app/crm/quotes/new')} className={GOLD_BTN}>
                <Plus className="w-4 h-4" /> Create Quote
              </button>
            </div>
          </TabsContent>

          {/* ── Templates tab ─────────────────────────────────────────────── */}
          <TabsContent value="templates" className="p-5">
            <QuoteTemplatesManager />
          </TabsContent>

          {/* ── Settings tab ──────────────────────────────────────────────── */}
          <TabsContent value="settings" className="p-5 space-y-6">
            <div>
              <h3 className="text-[15px] font-semibold text-[#111113] mb-1">CRM Settings</h3>
              <p className="text-[13px] text-[#9ca3af]">Configure your CRM preferences and renewal alerts</p>
            </div>
            <div className="space-y-5 max-w-md">
              <div>
                <label className={LABEL_CLS}>Renewal Alert Lead Time (Days)</label>
                <input
                  type="number"
                  className={`${INPUT_CLS} w-32`}
                  value={renewalAlertDays}
                  onChange={(e) => setRenewalAlertDays(parseInt(e.target.value) || 60)}
                />
                <p className="text-[12px] text-[#9ca3af] mt-1.5">How many days before renewal to create alerts and calendar events</p>
              </div>
              <div>
                <label className={LABEL_CLS}>Default Currency</label>
                <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                  <SelectTrigger className="w-64 focus:ring-[#d4a017]/30 focus:border-[#d4a017]">
                    <SelectValue>
                      {worldCurrencies.find(c => c.code === selectedCurrency)?.symbol} {selectedCurrency} - {worldCurrencies.find(c => c.code === selectedCurrency)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {worldCurrencies.map(currency => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[12px] text-[#9ca3af] mt-1.5">Selected currency will be used throughout the CRM system</p>
              </div>
              <div className="flex gap-3">
                <button type="button" className={GOLD_BTN}>Save Settings</button>
                <button type="button" onClick={exportCRMData} className={OUTLINE_BTN}>
                  <Download className="w-4 h-4" /> Export Data
                </button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Customer Detail Modal ─────────────────────────────────────────────── */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-6 overflow-y-auto">
          <div className="bg-white rounded-xl border border-[#e5e7eb] w-full max-w-5xl">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-[#e5e7eb] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-[18px] font-semibold text-[#111113]">{selectedCompany.name}</h2>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${selectedCompany.status === 'Active' ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'}`}>
                    {selectedCompany.status}
                  </span>
                </div>
                <p className="text-[13px] text-[#9ca3af] mt-0.5">Customer Details & Service Overview</p>
              </div>
              <button type="button" onClick={() => setSelectedCompany(null)} className={GHOST_BTN}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Left: services & stats ─────────────────────────────── */}
                <div className="lg:col-span-2 space-y-5">
                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: Coins, bg: 'bg-[#dcfce7]', color: 'text-[#059669]', val: `${getCurrentCurrencySymbol()}${calculateCustomerTotalProfit(selectedCompany.id).toLocaleString()}`, label: 'Total Profit' },
                      { icon: AlertTriangle, bg: 'bg-[#fef3c7]', color: 'text-[#d97706]', val: selectedCompany.renewalsCount, label: 'Renewals Due' },
                      { icon: TrendingUp, bg: 'bg-[#ede9fe]', color: 'text-[#7c3aed]', val: selectedCompany.openOppsCount, label: 'Open Opps' },
                    ].map(({ icon: Icon, bg, color, val, label }) => (
                      <div key={label} className="bg-[#fafafa] rounded-xl border border-[#e5e7eb] p-3 text-center">
                        <Icon className={`w-5 h-5 mx-auto ${color} mb-1`} />
                        <p className={`text-[18px] font-bold ${color} leading-none`}>{val}</p>
                        <p className="text-[11px] text-[#9ca3af] mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Services */}
                  <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-[#e5e7eb]">
                      <p className="text-[14px] font-semibold text-[#111113]">Services & Products</p>
                      <p className="text-[12px] text-[#9ca3af] mt-0.5">Manage what this customer is purchasing from your catalog</p>
                    </div>
                    <div className="divide-y divide-[#f3f4f6]">
                      {getCustomerServices(selectedCompany.id).map((service) => {
                        const profit = (service.clientPrice - service.ourCost) * service.quantity;
                        const isEditing = editingService === service.id;
                        return (
                          <div key={service.id} className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[13px] font-medium text-[#111113]">{service.name}</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#f3f4f6] text-[#6b7280]">{service.category}</span>
                                <label className="flex items-center gap-1.5 text-[12px] text-[#6b7280] cursor-pointer">
                                  <input type="checkbox" checked={service.isActive} onChange={(e) => updateCustomerService(selectedCompany.id, service.id, { isActive: e.target.checked })} className="rounded" />
                                  Active
                                </label>
                              </div>
                              <button type="button" onClick={() => setEditingService(isEditing ? null : service.id)} className={OUTLINE_BTN}>
                                {isEditing ? 'Save' : 'Edit'}
                              </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-[12px]">
                              {[
                                { label: 'Our Cost',            value: isEditing ? null : `${getCurrentCurrencySymbol()}${service.ourCost.toFixed(2)}`,        editInput: <input type="number" step="0.01" className={INPUT_CLS} value={service.ourCost} onChange={(e) => updateCustomerService(selectedCompany.id, service.id, { ourCost: parseFloat(e.target.value) || 0 })} /> },
                                { label: 'Client Price',        value: isEditing ? null : `${getCurrentCurrencySymbol()}${service.clientPrice.toFixed(2)}`,    editInput: <input type="number" step="0.01" className={INPUT_CLS} value={service.clientPrice} onChange={(e) => updateCustomerService(selectedCompany.id, service.id, { clientPrice: parseFloat(e.target.value) || 0 })} /> },
                                { label: 'Quantity',            value: isEditing ? null : `${service.quantity} ${service.unit}`,                                editInput: <input type="number" min="0" step="1" className={INPUT_CLS} value={service.quantity} onChange={(e) => updateCustomerService(selectedCompany.id, service.id, { quantity: parseInt(e.target.value) || 0 })} onFocus={(e) => e.target.select()} /> },
                                { label: 'Unit Profit',         value: `${getCurrentCurrencySymbol()}${(service.clientPrice - service.ourCost).toFixed(2)}`,   className: 'text-[#059669] font-semibold' },
                                { label: 'Service Total Profit',value: `${getCurrentCurrencySymbol()}${profit.toFixed(2)}`,                                    className: 'text-[#059669] font-bold'   },
                              ].map(({ label, value, editInput, className: cls }) => (
                                <div key={label}>
                                  <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1">{label}</p>
                                  {isEditing && editInput
                                    ? editInput
                                    : <div className={`p-2 bg-[#fafafa] rounded-lg ${cls || 'text-[#374151]'}`}>{value}</div>
                                  }
                                </div>
                              ))}
                            </div>

                            {/* Notes and renewal */}
                            <div className="mt-3 pt-3 border-t border-[#f3f4f6] flex flex-wrap items-center gap-3">
                              <button type="button" onClick={() => openNotesModal(selectedCompany.id, service.id)} className={OUTLINE_BTN}>
                                <FileText className="w-3.5 h-3.5" />
                                Notes
                                {serviceNotes[`${selectedCompany.id}-${service.id}`] && (
                                  <span className="w-2 h-2 bg-[#d4a017] rounded-full" />
                                )}
                              </button>
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] text-[#6b7280]">Renewal Date:</span>
                                <input
                                  type="date"
                                  value={renewalDates[`${selectedCompany.id}-${service.id}`] || ''}
                                  onChange={(e) => updateRenewalDate(selectedCompany.id, service.id, e.target.value)}
                                  className="text-[12px] rounded-md border border-[#e5e7eb] px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017]"
                                />
                              </div>
                              {renewalDates[`${selectedCompany.id}-${service.id}`] && (
                                <span className="text-[12px] text-[#059669] flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> CRM reminder set
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Opportunities */}
                  <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
                    <p className="text-[14px] font-semibold text-[#111113] mb-1">Opportunities</p>
                    <p className="text-[12px] text-[#9ca3af] mb-4">Sales opportunities in progress</p>
                    <div className="py-8 text-center">
                      <Target className="w-10 h-10 mx-auto text-[#d1d5db] mb-2" />
                      <p className="text-[13px] text-[#9ca3af] mb-3">No opportunities yet</p>
                      <button type="button" className={OUTLINE_BTN}>Create Opportunity</button>
                    </div>
                  </div>
                </div>

                {/* ── Right: contact info & activity ─────────────────────── */}
                <div className="space-y-4">
                  {/* Contact info */}
                  <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-[#e5e7eb] flex items-center justify-between">
                      <p className="text-[14px] font-semibold text-[#111113]">Contact Information</p>
                      <button type="button" onClick={() => setEditingContact(!editingContact)} className={OUTLINE_BTN}>
                        {editingContact ? 'Save' : 'Edit'}
                      </button>
                    </div>
                    <div className="p-5 space-y-4">
                      {[
                        { icon: Users,  label: 'Primary Contact', field: 'name',    type: 'text'  },
                        { icon: Mail,   label: 'Email',           field: 'email',   type: 'email' },
                        { icon: Phone,  label: 'Phone',           field: 'phone',   type: 'tel'   },
                        { icon: MapPin, label: 'Address',         field: 'address', type: 'text', textarea: true },
                      ].map(({ icon: Icon, label, field, type, textarea }) => (
                        <div key={field} className="flex items-start gap-3">
                          <Icon className="w-4 h-4 text-[#9ca3af] mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1">{label}</p>
                            {editingContact ? (
                              textarea ? (
                                <textarea className={`${INPUT_CLS} min-h-[70px]`} value={getContactInfo(selectedCompany)[field]} onChange={(e) => updateContactInfo(selectedCompany.id, field, e.target.value)} rows={3} />
                              ) : (
                                <input type={type} className={INPUT_CLS} value={getContactInfo(selectedCompany)[field]} onChange={(e) => updateContactInfo(selectedCompany.id, field, e.target.value)} />
                              )
                            ) : (
                              <p className="text-[13px] font-medium text-[#111113]">{getContactInfo(selectedCompany)[field] || '—'}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent activity */}
                  <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-[#e5e7eb]">
                      <p className="text-[14px] font-semibold text-[#111113]">Recent Activity</p>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <Calendar className="w-4 h-4 text-[#6366f1] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[12px] font-semibold text-[#374151]">Last Activity</p>
                          <p className="text-[12px] text-[#9ca3af]">{selectedCompany.lastActivity || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-[#d97706] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[12px] font-semibold text-[#374151]">Next CRM Event</p>
                          <p className="text-[12px] text-[#9ca3af]">{selectedCompany.nextCRMEvent || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-[#e5e7eb]">
                      <p className="text-[14px] font-semibold text-[#111113]">Quick Actions</p>
                    </div>
                    <div className="p-4 space-y-2">
                      {[
                        { icon: Phone,    label: 'Call Customer'    },
                        { icon: Mail,     label: 'Send Email'       },
                        { icon: Calendar, label: 'Schedule Meeting' },
                        { icon: Edit,     label: 'Edit Customer'    },
                      ].map(({ icon: Icon, label }) => (
                        <button key={label} type="button" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-[#e5e7eb] text-[13px] text-[#374151] hover:bg-[#fef9ee] hover:border-[#d4a017]/50 transition-colors">
                          <Icon className="w-4 h-4 text-[#9ca3af]" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Notes Modal ───────────────────────────────────────────────────────── */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl border border-[#e5e7eb] w-full max-w-md">
            <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#111113]">Service Notes</h3>
              <button type="button" onClick={() => setShowNotesModal(null)} className={GHOST_BTN}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={LABEL_CLS}>Notes</label>
                <textarea
                  className={`${INPUT_CLS} min-h-[140px] resize-y`}
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  placeholder="Add notes about this service for this customer..."
                  rows={6}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowNotesModal(null)} className={OUTLINE_BTN}>Cancel</button>
                <button type="button" onClick={saveNote} className={GOLD_BTN}>Save Notes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
