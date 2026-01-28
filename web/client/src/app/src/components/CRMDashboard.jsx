import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { 
  Building2, 
  Users, 
  Coins, 
  Calendar,
  Search,
  Plus,
  Filter,
  Eye,
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
// Contacts are now fetched from the database API instead of localStorage

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
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' }
];

// Contacts are now fetched from the database API

// Products are now fetched from the database API

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
    name: '',
    category: '',
    defaultOurCost: '',
    defaultClientPrice: '',
    unit: '',
    defaultQuantity: 0,
    active: true
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
        const response = await fetch('/api/customer-services', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          // Convert array to object keyed by contact_id
          const servicesObj = {};
          data.forEach(service => {
            if (!servicesObj[service.contact_id]) {
              servicesObj[service.contact_id] = [];
            }
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
    
    // Auto-refresh every 10 seconds
    const intervalId = setInterval(loadCustomerServices, 10000);
    return () => clearInterval(intervalId);
  }, []);

  // Customer services are now saved to database via API calls

  // Load product catalog from database API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch('/api/products', {
          credentials: 'include'
        });
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
    
    // Auto-refresh every 10 seconds
    const intervalId = setInterval(loadProducts, 10000);
    return () => clearInterval(intervalId);
  }, []);

  // Product catalog is now saved to database via API calls

  // Get current currency symbol
  const getCurrentCurrencySymbol = () => {
    return worldCurrencies.find(c => c.code === selectedCurrency)?.symbol || '£';
  };

  // Load contacts from database API
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  
  useEffect(() => {
    const loadContacts = async () => {
      setContactsLoading(true);
      try {
        const response = await fetch('/api/contacts', {
          credentials: 'include'
        });
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
    
    // Auto-refresh every 10 seconds
    const intervalId = setInterval(loadContacts, 10000);
    return () => clearInterval(intervalId);
  }, []);

  // Fetch quotes from API
  useEffect(() => {
    console.log('[CRMDashboard] Fetching quotes from API...');
    const fetchQuotes = async () => {
      setQuotesLoading(true);
      try {
        const response = await fetch('/api/quotes', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          // API returns {quotes: [...], total, page, limit, totalPages}
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
    
    // Auto-refresh every 10 seconds
    const intervalId = setInterval(fetchQuotes, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const filteredCompanies = (Array.isArray(contacts) ? contacts : []).filter(contact => {
    // Sequential matching from the beginning of the contact name
    const matchesSearch = searchTerm === '' || 
      contact.name.toLowerCase().startsWith(searchTerm.toLowerCase());
    
    const matchesAlphabet = alphabetFilter === 'ALL' || 
      contact.name.charAt(0).toUpperCase() === alphabetFilter;
    
    return matchesSearch && matchesAlphabet;
  });

  const totalProfit = useMemo(() => {
    let total = 0;
    
    // Check if we have customer services data
    if (customerServices && Object.keys(customerServices).length > 0) {
      // Calculate from actual data using contacts
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
      // Calculate from contact CRM data
      total = (Array.isArray(contacts) ? contacts : []).reduce((sum, contact) => sum + (contact.crm?.totalProfit || 0), 0);
    }
    
    return total;
  }, [customerServices, contacts]);
  
  const totalRenewals = (Array.isArray(contacts) ? contacts : []).reduce((sum, contact) => sum + (contact.crm?.renewalsCount || 0), 0);
  const totalOpportunities = (Array.isArray(contacts) ? contacts : []).reduce((sum, contact) => sum + (contact.crm?.openOppsCount || 0), 0);

  const initializeCustomerServices = (companyId) => {
    // If customer doesn't have services initialized, create them from catalog
    if (!customerServices[companyId]) {
      const initialServices = productCatalog.map(product => ({
        id: product.id,
        name: product.name,
        category: product.category,
        ourCost: product.defaultOurCost,
        clientPrice: product.defaultClientPrice,
        quantity: 0,
        unit: product.unit,
        active: false
      }));
      
      setCustomerServices(prev => ({
        ...prev,
        [companyId]: initialServices
      }));
    }
  };

  const getCustomerServices = (companyId) => {
    try {
      if (!companyId) return [];
      
      // Get existing services from state (which should be loaded from localStorage)
      const existingServices = customerServices[companyId];
      
      // If no services exist for this company, initialize with defaults
      if (!existingServices || !Array.isArray(existingServices)) {
        initializeCustomerServices(companyId);
        // Return empty array to avoid calculation errors during initialization
        return [];
      }
      
      // Always ensure all catalog products are represented
      return productCatalog.map(product => {
        try {
          const existingService = existingServices.find(s => s && s.id === product.id);
          
          if (existingService) {
            return existingService;
          } else {
            // Add missing product to customer services
            const newService = {
              id: product.id,
              name: product.name,
              category: product.category,
              ourCost: product.defaultOurCost || 0,
              clientPrice: product.defaultClientPrice || 0,
              quantity: 0,
              unit: product.unit || 'unit',
              active: false
            };
            
            // Update the customer services to include this new product
            setCustomerServices(prev => ({
              ...prev,
              [companyId]: [...(prev[companyId] || []), newService]
            }));
            
            return newService;
          }
        } catch (productError) {
          console.warn('Error processing product:', product.id, productError);
          return {
            id: product.id,
            name: product.name || 'Unknown',
            category: product.category || 'General',
            ourCost: 0,
            clientPrice: 0,
            quantity: 0,
            unit: 'unit',
            active: false
          };
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
          if (service && 
              typeof service.clientPrice === 'number' && 
              typeof service.ourCost === 'number' && 
              typeof service.quantity === 'number' &&
              service.quantity > 0) {
            const profit = (service.clientPrice - service.ourCost) * service.quantity;
            return total + (isNaN(profit) ? 0 : profit);
          }
          return total;
        } catch (serviceError) {
          console.warn('Error calculating service profit:', serviceError);
          return total;
        }
      }, 0);
    } catch (error) {
      console.warn('Error calculating customer total profit for company:', companyId, error);
      return 0;
    }
  };

  const updateCustomerService = async (companyId, serviceId, updates) => {
    try {
      // Check if service assignment exists in database
      const servicesResponse = await fetch('/api/customer-services', { credentials: 'include' });
      const services = await servicesResponse.json();
      const existingService = services.find(s => s.contact_id === companyId && s.product_id === serviceId);
      
      if (existingService) {
        // Update existing service
        const response = await fetch(`/api/customer-services/${existingService.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            quantity: updates.quantity,
            our_cost: updates.ourCost,
            client_price: updates.clientPrice,
            active: updates.active
          })
        });
        if (!response.ok) throw new Error('Failed to update service');
      } else if (updates.active || updates.quantity > 0) {
        // Create new service assignment
        const response = await fetch('/api/customer-services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            contact_id: companyId,
            product_id: serviceId,
            quantity: updates.quantity || 0,
            our_cost: updates.ourCost || 0,
            client_price: updates.clientPrice || 0,
            active: updates.active || false
          })
        });
        if (!response.ok) throw new Error('Failed to create service');
      }
      
      // Refresh customer services from API
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
      email: contact.email,
      phone: contact.phone,
      address: contact.addresses?.[0] ? 
        `${contact.addresses[0].street || ''} ${contact.addresses[0].city || ''} ${contact.addresses[0].postalCode || ''}`.trim() :
        ''
    };
  };

  const updateContactInfo = (companyId, field, value) => {
    setContactInfo(prev => ({
      ...prev,
      [companyId]: {
        ...prev[companyId],
        [field]: value
      }
    }));
  };

  // Product catalog management
  const updateProduct = async (productId, updates) => {
    try {
      // Update in database via API
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update product');
      
      // Refresh products from API
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
      name: newProduct.name,
      type: newProduct.category,
      our_cost: parseFloat(newProduct.defaultOurCost) || 0,
      client_price: parseFloat(newProduct.defaultClientPrice) || 0,
      unit: newProduct.unit,
      default_quantity: parseInt(newProduct.defaultQuantity) || 0,
      tax_rate: 0,
      active: newProduct.active
    };
    
    try {
      // Save to database via API
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(productToAdd)
      });
      
      if (!response.ok) throw new Error('Failed to create product');
      
      // Refresh products from API
      const productsResponse = await fetch('/api/products', { credentials: 'include' });
      const productsData = await productsResponse.json();
      setProductCatalog(productsData.products || []);
      
      // Reset form
      setNewProduct({
        name: '',
        category: '',
        defaultOurCost: '',
        defaultClientPrice: '',
        unit: '',
        defaultQuantity: 0,
        active: true
      });
      setShowNewProductForm(false);
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product. Please try again.');
    }
  };

  const cancelNewProduct = () => {
    setNewProduct({
      name: '',
      category: '',
      defaultOurCost: '',
      defaultClientPrice: '',
      unit: '',
      defaultQuantity: 0,
      active: true
    });
    setShowNewProductForm(false);
  };

  const removeProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      // Delete from database via API
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to delete product');
      
      // Refresh products from API
      const productsResponse = await fetch('/api/products', { credentials: 'include' });
      const productsData = await productsResponse.json();
      setProductCatalog(productsData.products || []);
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    }
  };

  // Generate alphabet buttons
  const alphabetLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Notes and renewal management
  const openNotesModal = (companyId, serviceId) => {
    const noteKey = `${companyId}-${serviceId}`;
    setCurrentNote(serviceNotes[noteKey] || '');
    setShowNotesModal({ companyId, serviceId });
  };

  const saveNote = () => {
    if (showNotesModal) {
      const noteKey = `${showNotesModal.companyId}-${showNotesModal.serviceId}`;
      setServiceNotes(prev => ({
        ...prev,
        [noteKey]: currentNote
      }));
      
      // Also save to localStorage for CRM Calendar access
      const existingNotes = JSON.parse(localStorage.getItem('serviceNotes') || '{}');
      existingNotes[noteKey] = currentNote;
      localStorage.setItem('serviceNotes', JSON.stringify(existingNotes));
      
      setShowNotesModal(null);
      setCurrentNote('');
    }
  };
  const updateRenewalDate = (companyId, serviceId, date) => {
    const renewalKey = `${companyId}-${serviceId}`;
    setRenewalDates(prev => ({
      ...prev,
      [renewalKey]: date
    }));
    
    // Create CRM calendar entry if date is set
    if (date) {
      const company = contacts.find(c => c.id === companyId);
      const service = getCustomerServices(companyId).find(s => s.id === serviceId);
      
      // Create calendar entry for CRM Calendar
      const calendarEntry = {
        id: `renewal-${renewalKey}-${Date.now()}`,
        title: `${company?.name} - ${service?.name} Renewal`,
        date: date,
        time: '09:00',
        type: 'Follow-up',
        description: `Sell this to the customer! ${service?.name} renewal opportunity for ${company?.name}`,
        company: company?.name,
        service: service?.name
      };
      
      // Store in localStorage for CRM Calendar to pick up
      const existingEvents = JSON.parse(localStorage.getItem('crmCalendarEvents') || '[]');
      const updatedEvents = [...existingEvents.filter(e => e.id !== calendarEntry.id), calendarEntry];
      localStorage.setItem('crmCalendarEvents', JSON.stringify(updatedEvents));
      
      console.log(`Created CRM calendar entry for ${company?.name} - ${service?.name} on ${date}: "Sell this to the customer!"`);
    }
  };

  // CSV Export functionality
  const exportCRMData = () => {
    const csvData = [];
    
    // Add headers
    csvData.push([
      'Company Name',
      'Primary Contact',
      'Email',
      'Phone',
      'Address',
      'Status',
      'Total Profit',
      'Renewals Count',
      'Open Opportunities',
      'Last Activity',
      'Next CRM Event'
    ]);
    
    // Add company data
    contacts.forEach(company => {
      csvData.push([
        company.name,
        company.primaryContact,
        company.email,
        company.phone,
        company.address,
        company.status,
        calculateCustomerTotalProfit(company.id),
        company.renewalsCount,
        company.openOppsCount,
        company.lastActivity,
        company.nextCRMEvent
      ]);
    });
    
    // Add product catalog section
    csvData.push([]);
    csvData.push(['PRODUCT CATALOG']);
    csvData.push(['Product Name', 'Category', 'Default Our Cost', 'Default Client Price', 'Unit', 'Active']);
    
    productCatalog.forEach(product => {
      csvData.push([
        product.name,
        product.category,
        product.defaultOurCost,
        product.defaultClientPrice,
        product.unit,
        product.active ? 'Yes' : 'No'
      ]);
    });
    
    // Convert to CSV string
    const csvContent = csvData.map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');
    
    // Create and download file
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

  return (
    <div className="w-full p-2 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center space-x-2 responsive-text">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
            <span className="break-words">Customer Relationship Management</span>
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage customers, track services, and monitor renewals</p>
        </div>
        <Button className="flex items-center space-x-2 w-full sm:w-auto">
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span>Add Customer</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-1 sm:gap-4 lg:gap-6">
        <Card className="w-full h-10 sm:h-auto">
          <CardContent className="p-0.5 sm:p-6 h-full flex items-center justify-center">
            <div className="flex flex-col items-center text-center w-full">
              <Building2 className="w-3 h-3 sm:w-8 sm:h-8 text-blue-600 mb-0.5 sm:mb-2" />
              <p className="text-xs sm:text-2xl font-bold leading-none">{contacts.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full h-10 sm:h-auto">
          <CardContent className="p-0.5 sm:p-6 h-full flex items-center justify-center">
            <div className="flex flex-col items-center text-center w-full">
              <Coins className="w-3 h-3 sm:w-8 sm:h-8 text-green-600 mb-0.5 sm:mb-2" />
              <p className="text-xs sm:text-2xl font-bold leading-none">{getCurrentCurrencySymbol()}{totalProfit.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full h-10 sm:h-auto">
          <CardContent className="p-0.5 sm:p-6 h-full flex items-center justify-center">
            <div className="flex flex-col items-center text-center w-full">
              <AlertTriangle className="w-3 h-3 sm:w-8 sm:h-8 text-orange-600 mb-0.5 sm:mb-2" />
              <p className="text-xs sm:text-2xl font-bold leading-none">{totalRenewals}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full h-10 sm:h-auto">
          <CardContent className="p-0.5 sm:p-6 h-full flex items-center justify-center">
            <div className="flex flex-col items-center text-center w-full">
              <TrendingUp className="w-3 h-3 sm:w-8 sm:h-8 text-purple-600 mb-0.5 sm:mb-2" />
              <p className="text-xs sm:text-2xl font-bold leading-none">{totalOpportunities}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-1 text-xs sm:text-sm">
          <TabsTrigger value="customers" className="text-xs sm:text-sm">Customers</TabsTrigger>
          <TabsTrigger value="catalog" className="text-xs sm:text-sm">Product Catalog</TabsTrigger>
          <TabsTrigger value="quotes" className="text-xs sm:text-sm">Quotes</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs sm:text-sm">Quote Templates</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm col-span-2 sm:col-span-1">CRM Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4 sm:space-y-6">
          <Card className="w-full">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Customer Management</CardTitle>
              <CardDescription className="text-sm">Manage your customer relationships and track profitability</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by company name (starts with)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 mobile-input"
                    />
                  </div>
                  <Button className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>Add Customer</span>
                  </Button>
                </div>
                
                {/* Alphabet Navigation - Desktop Only */}
                <div className="hidden lg:block border rounded-lg p-4 bg-gray-50">
                  <div className="flex gap-1 justify-center">
                    <Button
                      variant={alphabetFilter === 'ALL' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAlphabetFilter('ALL')}
                      className="h-8 w-12 text-xs"
                    >
                      ALL
                    </Button>
                    {alphabetLetters.map(letter => {
                      const hasCompanies = (Array.isArray(contacts) ? contacts : []).some(company => 
                        company.name.charAt(0).toUpperCase() === letter
                      );
                      return (
                        <Button
                          key={letter}
                          variant={alphabetFilter === letter ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setAlphabetFilter(letter)}
                          disabled={!hasCompanies}
                          className="h-8 w-8 text-xs p-0"
                        >
                          {letter}
                        </Button>
                      );
                    })}
                  </div>
                  <p className="text-sm text-gray-600 mt-2 text-center">
                    Showing {filteredCompanies.length} of {contacts.length} customers
                    {alphabetFilter !== 'ALL' && ` starting with "${alphabetFilter}"`}
                  </p>
                </div>
                
                <div className="customer-list">
                  {filteredCompanies.map((company, index) => (
                    <Card 
                      key={company.id} 
                      className={`cursor-pointer hover:shadow-md transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      onClick={() => setSelectedCompany(company)}
                    >
                      <CardContent className="p-3">
                        {/* Mobile-responsive layout */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 sm:space-x-3">
                          {/* Company name */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate text-sm">
                              {company.name}
                            </h3>
                          </div>

                          {/* Status and badges - wrap on mobile */}
                          <div className="flex items-center flex-wrap gap-1 sm:gap-2 flex-shrink-0">
                            <Badge variant={company.status === 'Active' ? 'default' : 'destructive'} className="text-xs">
                              {company.status}
                            </Badge>
                            {company.renewalsCount > 0 && (
                              <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                                {company.renewalsCount} Renewals Due
                              </Badge>
                            )}
                            {company.openOppsCount > 0 && (
                              <Badge variant="outline" className="text-purple-600 border-purple-600 text-xs">
                                {company.openOppsCount} Open Opp{company.openOppsCount > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catalog" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product & Service Catalog</CardTitle>
              <CardDescription>Manage your master template of products and services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* New Product Form */}
                {showNewProductForm && (
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Add New Product/Service</h3>
                      <Button variant="outline" size="sm" onClick={cancelNewProduct}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Product Name</label>
                        <Input
                          value={newProduct.name}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter product name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Category</label>
                        <Input
                          value={newProduct.category}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                          placeholder="e.g., Maintenance"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Our Cost</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newProduct.defaultOurCost}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, defaultOurCost: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Client Price</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newProduct.defaultClientPrice}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, defaultClientPrice: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Unit</label>
                        <Input
                          value={newProduct.unit}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, unit: e.target.value }))}
                          placeholder="e.g., service, hour"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={newProduct.active}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, active: e.target.checked }))}
                            className="rounded"
                          />
                          <span className="text-sm">Active</span>
                        </label>
                        <div className="text-sm text-gray-600">
                          Margin: {getCurrentCurrencySymbol()}{((parseFloat(newProduct.defaultClientPrice) || 0) - (parseFloat(newProduct.defaultOurCost) || 0)).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" onClick={cancelNewProduct}>Cancel</Button>
                        <Button onClick={addNewProduct} disabled={!newProduct.name.trim()}>
                          Save Product
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Existing Products */}
                {productCatalog.map((product, index) => {
                  const isEditing = editingProduct === product.id;
                  const margin = product.client_price - product.our_cost;
                  
                  return (
                    <div key={product.id} className={`border rounded-lg p-3 sm:p-4 w-full ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          {isEditing ? (
                            <Input
                              value={editingProductData?.name !== undefined ? editingProductData.name : product.name}
                              onChange={(e) => setEditingProductData(prev => ({ ...prev, name: e.target.value }))}
                              className="font-semibold mobile-input"
                            />
                          ) : (
                            <h3 className="font-semibold text-sm sm:text-base break-words">{product.name}</h3>
                          )}
                          {isEditing ? (
                            <Input
                              value={editingProductData?.type !== undefined ? editingProductData.type : product.type}
                              onChange={(e) => setEditingProductData(prev => ({ ...prev, type: e.target.value }))}
                              className="mobile-input"
                            />
                          ) : (
                            <Badge variant="outline" className="text-xs w-fit">{product.type}</Badge>
                          )}
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editingProductData?.is_active !== undefined ? editingProductData.is_active : product.is_active}
                              onChange={(e) => setEditingProductData(prev => ({ ...prev, is_active: e.target.checked }))}
                              className="rounded"
                            />
                            <span className="text-xs sm:text-sm">Active</span>
                          </label>
                        </div>
                        <div className="flex items-center justify-end gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (isEditing) {
                                // Save changes
                                if (editingProductData) {
                                  // Convert empty strings to 0 for number fields before saving
                                  const dataToSave = { ...editingProductData };
                                  if (dataToSave.our_cost === '') dataToSave.our_cost = 0;
                                  if (dataToSave.client_price === '') dataToSave.client_price = 0;
                                  if (dataToSave.default_quantity === '') dataToSave.default_quantity = 0;
                                  await updateProduct(product.id, dataToSave);
                                }
                                setEditingProduct(null);
                                setEditingProductData(null);
                              } else {
                                // Start editing
                                setEditingProduct(product.id);
                                setEditingProductData({});
                              }
                            }}
                            className="text-xs px-2 py-1"
                          >
                            {isEditing ? 'Save' : <Edit className="w-3 h-3 sm:w-4 sm:h-4" />}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete "${product.name}"? This will remove it from all customer service lists.`)) {
                                removeProduct(product.id);
                              }
                            }}
                            className="text-xs px-2 py-1"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 text-xs sm:text-sm">
                        <div>
                          <span className="font-medium">Our Cost: </span>
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editingProductData?.our_cost !== undefined ? editingProductData.our_cost : product.our_cost}
                              onChange={(e) => setEditingProductData(prev => ({ ...prev, our_cost: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                              className="mt-1"
                            />
                          ) : (
                            <span>{getCurrentCurrencySymbol()}{product.our_cost}</span>
                          )}
                        </div>
                        <div>
                          <span className="font-medium">Client Price: </span>
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editingProductData?.client_price !== undefined ? editingProductData.client_price : product.client_price}
                              onChange={(e) => setEditingProductData(prev => ({ ...prev, client_price: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                              className="mt-1"
                            />
                          ) : (
                            <span>{getCurrentCurrencySymbol()}{product.client_price}</span>
                          )}
                        </div>
                        <div>
                          <span className="font-medium">Margin: </span>
                          <span className="text-green-600">
                            {getCurrentCurrencySymbol()}{margin.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Unit: </span>
                          {isEditing ? (
                            <Input
                              value={editingProductData?.unit !== undefined ? editingProductData.unit : product.unit}
                              onChange={(e) => setEditingProductData(prev => ({ ...prev, unit: e.target.value }))}
                              className="mt-1"
                            />
                          ) : (
                            <span>{product.unit}</span>
                          )}
                        </div>
                        <div>
                          <span className="font-medium">Default Qty: </span>
                          {isEditing ? (
                            <Input
                              type="number"
                              min="1"
                              value={editingProductData?.default_quantity !== undefined ? editingProductData.default_quantity : product.default_quantity}
                              onChange={(e) => setEditingProductData(prev => ({ ...prev, default_quantity: parseInt(e.target.value) || 1 }))}
                              className="mt-1"
                            />
                          ) : (
                            <span>{product.default_quantity}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex justify-between">
                <Button variant="outline">Import CSV</Button>
                <Button onClick={() => setShowNewProductForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product/Service
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quotes</CardTitle>
              <CardDescription>View and manage customer quotes</CardDescription>
            </CardHeader>
            <CardContent>
              {quotesLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="text-gray-500">Loading quotes...</div>
                </div>
              ) : quotes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No quotes found. Create your first quote to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Quote #</th>
                        <th className="text-left py-3 px-4 font-medium">Customer</th>
                        <th className="text-left py-3 px-4 font-medium">Date</th>
                        <th className="text-right py-3 px-4 font-medium">Amount</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.map((quote) => (
                        <tr 
                          key={quote.id} 
                          className="border-b hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/app/crm/quotes/${quote.id}`)}
                        >
                          <td className="py-3 px-4 font-medium">{quote.quote_number}</td>
                          <td className="py-3 px-4">{quote.customer_name}</td>
                          <td className="py-3 px-4">
                            {new Date(quote.quote_date).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            £{parseFloat(quote.total_amount).toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              quote.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                              quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                              quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              quote.status === 'declined' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <Button onClick={() => navigate('/app/crm/quotes/new')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Quote
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <QuoteTemplatesManager />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CRM Settings</CardTitle>
              <CardDescription>Configure your CRM preferences and renewal alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Renewal Alert Lead Time (Days)</label>
                <Input 
                  type="number" 
                  value={renewalAlertDays}
                  onChange={(e) => setRenewalAlertDays(parseInt(e.target.value) || 60)}
                  className="w-32" 
                />
                <p className="text-sm text-gray-500 mt-1">
                  How many days before renewal to create alerts and calendar events
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Default Currency</label>
                <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                  <SelectTrigger className="w-64">
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
                <p className="text-sm text-gray-500 mt-1">
                  Selected currency will be used throughout the CRM system
                </p>
              </div>
              <div className="flex space-x-4">
                <Button>Save Settings</Button>
                <Button variant="outline" onClick={exportCRMData} className="flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Export Data</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Customer Detail Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mobile-modal">
            <div className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-2xl font-semibold flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <span className="break-words">{selectedCompany.name}</span>
                    <Badge variant={selectedCompany.status === 'Active' ? 'default' : 'destructive'} className="w-fit">
                      {selectedCompany.status}
                    </Badge>
                  </h2>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base">Customer Details & Service Overview</p>
                </div>
                <Button variant="ghost" onClick={() => setSelectedCompany(null)} className="self-start sm:self-center">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4">
                    <Card className="w-full">
                      <CardContent className="p-2 sm:p-4 text-center">
                        <Coins className="w-4 h-4 sm:w-8 sm:h-8 mx-auto text-green-600 mb-1 sm:mb-2" />
                        <p className="text-base sm:text-2xl font-bold text-green-600">{getCurrentCurrencySymbol()}{calculateCustomerTotalProfit(selectedCompany.id).toLocaleString()}</p>
                        <p className="text-xs sm:text-sm text-gray-600">Company Total Profit</p>
                      </CardContent>
                    </Card>
                    <Card className="w-full">
                      <CardContent className="p-2 sm:p-4 text-center">
                        <AlertTriangle className="w-4 h-4 sm:w-8 sm:h-8 mx-auto text-orange-600 mb-1 sm:mb-2" />
                        <p className="text-base sm:text-2xl font-bold text-orange-600">{selectedCompany.renewalsCount}</p>
                        <p className="text-xs sm:text-sm text-gray-600">Renewals Due</p>
                      </CardContent>
                    </Card>
                    <Card className="w-full">
                      <CardContent className="p-2 sm:p-4 text-center">
                        <TrendingUp className="w-4 h-4 sm:w-8 sm:h-8 mx-auto text-purple-600 mb-1 sm:mb-2" />
                        <p className="text-base sm:text-2xl font-bold text-purple-600">{selectedCompany.openOppsCount}</p>
                        <p className="text-xs sm:text-sm text-gray-600">Open Opportunities</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Services & Products</CardTitle>
                      <CardDescription>Manage what this customer is purchasing from your catalog</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {getCustomerServices(selectedCompany.id).map((service) => {
                          const profit = (service.clientPrice - service.ourCost) * service.quantity;
                          const isEditing = editingService === service.id;
                          
                          return (
                            <div key={service.id} className="border rounded-lg p-3 sm:p-4 w-full">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-3">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                  <h4 className="font-medium text-sm sm:text-base break-words">{service.name}</h4>
                                  <Badge variant="outline" className="text-xs w-fit">{service.category}</Badge>
                                  <label className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={service.isActive}
                                      onChange={(e) => updateCustomerService(selectedCompany.id, service.id, { isActive: e.target.checked })}
                                      className="rounded"
                                    />
                                    <span className="text-xs sm:text-sm">Active</span>
                                  </label>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingService(isEditing ? null : service.id)}
                                  className="text-xs px-2 py-1 w-full sm:w-auto"
                                >
                                  {isEditing ? 'Save' : 'Edit'}
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 text-xs sm:text-sm">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Our Cost</label>
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={service.ourCost}
                                      onChange={(e) => updateCustomerService(selectedCompany.id, service.id, { ourCost: parseFloat(e.target.value) || 0 })}
                                      className="h-8"
                                    />
                                  ) : (
                                    <div className="p-2 bg-gray-50 rounded">{getCurrentCurrencySymbol()}{service.ourCost.toFixed(2)}</div>
                                  )}
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Client Price</label>
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={service.clientPrice}
                                      onChange={(e) => updateCustomerService(selectedCompany.id, service.id, { clientPrice: parseFloat(e.target.value) || 0 })}
                                      className="h-8"
                                    />
                                  ) : (
                                    <div className="p-2 bg-gray-50 rounded">{getCurrentCurrencySymbol()}{service.clientPrice.toFixed(2)}</div>
                                  )}
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={service.quantity}
                                      onChange={(e) => updateCustomerService(selectedCompany.id, service.id, { quantity: parseInt(e.target.value) || 0 })}
                                      onFocus={(e) => e.target.select()}
                                      className="h-8"
                                    />
                                  ) : (
                                    <div className="p-2 bg-gray-50 rounded">{service.quantity} {service.unit}</div>
                                  )}
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Unit Profit</label>
                                  <div className="p-2 bg-green-50 rounded text-green-700 font-medium">
                                    {getCurrentCurrencySymbol()}{(service.clientPrice - service.ourCost).toFixed(2)}
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Service Total Profit</label>
                                  <div className="p-2 bg-green-100 rounded text-green-800 font-bold">
                                    {getCurrentCurrencySymbol()}{profit.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Notes and Renewal Section */}
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center space-x-4">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openNotesModal(selectedCompany.id, service.id)}
                                  >
                                    <FileText className="w-4 h-4 mr-1" />
                                    Notes
                                    {serviceNotes[`${selectedCompany.id}-${service.id}`] && (
                                      <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                                    )}
                                  </Button>
                                  
                                  <div className="flex items-center space-x-2">
                                    <label className="text-sm text-gray-600">Renewal Date:</label>
                                    <Input
                                      type="date"
                                      value={renewalDates[`${selectedCompany.id}-${service.id}`] || ''}
                                      onChange={(e) => updateRenewalDate(selectedCompany.id, service.id, e.target.value)}
                                      className="w-40 h-8"
                                    />
                                  </div>
                                  
                                  {renewalDates[`${selectedCompany.id}-${service.id}`] && (
                                    <div className="text-xs text-green-600 flex items-center">
                                      <Calendar className="w-3 h-3 mr-1" />
                                      CRM reminder set
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Opportunities</CardTitle>
                      <CardDescription>Sales opportunities in progress</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <Target className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-500 mb-4">No opportunities yet</p>
                        <Button variant="outline">Create Opportunity</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Contact Information
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingContact(!editingContact)}
                        >
                          {editingContact ? 'Save' : 'Edit'}
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Users className="w-5 h-5 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">Primary Contact</p>
                          {editingContact ? (
                            <Input
                              value={getContactInfo(selectedCompany).name}
                              onChange={(e) => updateContactInfo(selectedCompany.id, 'name', e.target.value)}
                              className="mt-1"
                            />
                          ) : (
                            <p className="font-medium">{getContactInfo(selectedCompany).name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">Email</p>
                          {editingContact ? (
                            <Input
                              type="email"
                              value={getContactInfo(selectedCompany).email}
                              onChange={(e) => updateContactInfo(selectedCompany.id, 'email', e.target.value)}
                              className="mt-1"
                            />
                          ) : (
                            <p className="font-medium">{getContactInfo(selectedCompany).email}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">Phone</p>
                          {editingContact ? (
                            <Input
                              type="tel"
                              value={getContactInfo(selectedCompany).phone}
                              onChange={(e) => updateContactInfo(selectedCompany.id, 'phone', e.target.value)}
                              className="mt-1"
                            />
                          ) : (
                            <p className="font-medium">{getContactInfo(selectedCompany).phone}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">Address</p>
                          {editingContact ? (
                            <Textarea
                              value={getContactInfo(selectedCompany).address}
                              onChange={(e) => updateContactInfo(selectedCompany.id, 'address', e.target.value)}
                              className="mt-1"
                              rows={3}
                            />
                          ) : (
                            <p className="font-medium">{getContactInfo(selectedCompany).address}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium">Last Activity</p>
                            <p className="text-xs text-gray-600">{selectedCompany.lastActivity}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Clock className="w-4 h-4 text-orange-600" />
                          <div>
                            <p className="text-sm font-medium">Next CRM Event</p>
                            <p className="text-xs text-gray-600">{selectedCompany.nextCRMEvent}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <Phone className="w-4 h-4 mr-2" />
                        Call Customer
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Mail className="w-4 h-4 mr-2" />
                        Send Email
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Meeting
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Customer
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Service Notes</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotesModal(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <Textarea
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  placeholder="Add notes about this service for this customer..."
                  rows={6}
                  className="w-full"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNotesModal(null)}
                >
                  Cancel
                </Button>
                <Button onClick={saveNote}>
                  Save Notes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

