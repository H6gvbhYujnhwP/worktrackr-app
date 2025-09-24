// Central Contact Database for WorkTrackr
// Production-ready contact management system

// Contact Types
export const CONTACT_TYPES = {
  COMPANY: 'company',
  INDIVIDUAL: 'individual'
};

export const ADDRESS_TYPES = {
  BILLING: 'billing',
  SHIPPING: 'shipping',
  SERVICE: 'service',
  OFFICE: 'office'
};

export const CONTACT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  AT_RISK: 'at_risk',
  PROSPECT: 'prospect',
  ARCHIVED: 'archived'
};

export const PAYMENT_TERMS = {
  DUE_ON_RECEIPT: 'Due on Receipt',
  NET_7: 'Net 7',
  NET_15: 'Net 15',
  NET_30: 'Net 30',
  NET_60: 'Net 60',
  NET_90: 'Net 90'
};

export const CURRENCIES = {
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' }
};

// Contact Database Class
class ContactDatabase {
  constructor() {
    this.contacts = new Map();
    this.contactPersons = new Map();
    this.loadFromStorage();
  }

  // Generate unique ID
  generateId() {
    return 'contact_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Create new contact
  createContact(contactData) {
    const contact = {
      id: this.generateId(),
      type: contactData.type || CONTACT_TYPES.COMPANY,
      
      // Basic Information
      name: contactData.name || '',
      displayName: contactData.displayName || contactData.name || '',
      
      // Contact Details
      primaryContact: contactData.primaryContact || '',
      email: contactData.email || '',
      phone: contactData.phone || '',
      website: contactData.website || '',
      
      // Address Information
      addresses: contactData.addresses || [],
      
      // Accounting Integration
      accounting: {
        xeroContactId: contactData.accounting?.xeroContactId || null,
        quickbooksContactId: contactData.accounting?.quickbooksContactId || null,
        taxNumber: contactData.accounting?.taxNumber || '',
        paymentTerms: contactData.accounting?.paymentTerms || PAYMENT_TERMS.NET_30,
        currency: contactData.accounting?.currency || 'GBP',
        accountCode: contactData.accounting?.accountCode || '',
        creditLimit: contactData.accounting?.creditLimit || 0,
        discountRate: contactData.accounting?.discountRate || 0
      },
      
      // CRM Data
      crm: {
        status: contactData.crm?.status || CONTACT_STATUS.PROSPECT,
        lastActivity: contactData.crm?.lastActivity || null,
        nextCRMEvent: contactData.crm?.nextCRMEvent || null,
        renewalsCount: contactData.crm?.renewalsCount || 0,
        openOppsCount: contactData.crm?.openOppsCount || 0,
        totalProfit: contactData.crm?.totalProfit || 0,
        assignedTo: contactData.crm?.assignedTo || null,
        source: contactData.crm?.source || '',
        industry: contactData.crm?.industry || '',
        companySize: contactData.crm?.companySize || ''
      },
      
      // Additional Contact Persons
      contactPersons: contactData.contactPersons || [],
      
      // Metadata
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: contactData.createdBy || null,
      tags: contactData.tags || [],
      notes: contactData.notes || '',
      
      // Custom Fields (for extensibility)
      customFields: contactData.customFields || {}
    };

    this.contacts.set(contact.id, contact);
    this.saveToStorage();
    return contact;
  }

  // Update contact
  updateContact(contactId, updates) {
    const contact = this.contacts.get(contactId);
    if (!contact) {
      throw new Error(`Contact with ID ${contactId} not found`);
    }

    const updatedContact = {
      ...contact,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.contacts.set(contactId, updatedContact);
    this.saveToStorage();
    return updatedContact;
  }

  // Get contact by ID
  getContact(contactId) {
    return this.contacts.get(contactId);
  }

  // Get all contacts
  getAllContacts() {
    return Array.from(this.contacts.values());
  }

  // Search contacts
  searchContacts(query) {
    const searchTerm = query.toLowerCase();
    return this.getAllContacts().filter(contact => 
      contact.name.toLowerCase().includes(searchTerm) ||
      contact.email.toLowerCase().includes(searchTerm) ||
      contact.primaryContact.toLowerCase().includes(searchTerm) ||
      contact.phone.includes(searchTerm) ||
      contact.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  // Filter contacts by status
  getContactsByStatus(status) {
    return this.getAllContacts().filter(contact => contact.crm.status === status);
  }

  // Filter contacts by type
  getContactsByType(type) {
    return this.getAllContacts().filter(contact => contact.type === type);
  }

  // Delete contact
  deleteContact(contactId) {
    const deleted = this.contacts.delete(contactId);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  // Add address to contact
  addAddress(contactId, address) {
    const contact = this.getContact(contactId);
    if (!contact) {
      throw new Error(`Contact with ID ${contactId} not found`);
    }

    const newAddress = {
      id: this.generateId(),
      type: address.type || ADDRESS_TYPES.BILLING,
      line1: address.line1 || '',
      line2: address.line2 || '',
      city: address.city || '',
      state: address.state || '',
      postcode: address.postcode || '',
      country: address.country || 'United Kingdom',
      isPrimary: address.isPrimary || false
    };

    // If this is set as primary, unset other primary addresses of same type
    if (newAddress.isPrimary) {
      contact.addresses.forEach(addr => {
        if (addr.type === newAddress.type) {
          addr.isPrimary = false;
        }
      });
    }

    contact.addresses.push(newAddress);
    return this.updateContact(contactId, { addresses: contact.addresses });
  }

  // Add contact person
  addContactPerson(contactId, person) {
    const contact = this.getContact(contactId);
    if (!contact) {
      throw new Error(`Contact with ID ${contactId} not found`);
    }

    const newPerson = {
      id: this.generateId(),
      name: person.name || '',
      title: person.title || '',
      email: person.email || '',
      phone: person.phone || '',
      department: person.department || '',
      isPrimary: person.isPrimary || false,
      notes: person.notes || ''
    };

    // If this is set as primary, unset other primary contacts
    if (newPerson.isPrimary) {
      contact.contactPersons.forEach(cp => {
        cp.isPrimary = false;
      });
    }

    contact.contactPersons.push(newPerson);
    return this.updateContact(contactId, { contactPersons: contact.contactPersons });
  }

  // Get primary address of specific type
  getPrimaryAddress(contactId, addressType = ADDRESS_TYPES.BILLING) {
    const contact = this.getContact(contactId);
    if (!contact) return null;

    return contact.addresses.find(addr => 
      addr.type === addressType && addr.isPrimary
    ) || contact.addresses.find(addr => addr.type === addressType);
  }

  // Get primary contact person
  getPrimaryContactPerson(contactId) {
    const contact = this.getContact(contactId);
    if (!contact) return null;

    return contact.contactPersons.find(cp => cp.isPrimary) || 
           contact.contactPersons[0] || 
           null;
  }

  // Update CRM data
  updateCRMData(contactId, crmData) {
    const contact = this.getContact(contactId);
    if (!contact) {
      throw new Error(`Contact with ID ${contactId} not found`);
    }

    const updatedCRM = {
      ...contact.crm,
      ...crmData
    };

    return this.updateContact(contactId, { crm: updatedCRM });
  }

  // Update accounting data
  updateAccountingData(contactId, accountingData) {
    const contact = this.getContact(contactId);
    if (!contact) {
      throw new Error(`Contact with ID ${contactId} not found`);
    }

    const updatedAccounting = {
      ...contact.accounting,
      ...accountingData
    };

    return this.updateContact(contactId, { accounting: updatedAccounting });
  }

  // Get contacts for dropdown/selector
  getContactsForSelector() {
    return this.getAllContacts().map(contact => ({
      id: contact.id,
      name: contact.name,
      displayName: contact.displayName,
      email: contact.email,
      type: contact.type,
      status: contact.crm.status
    }));
  }

  // Get contact statistics
  getStatistics() {
    const contacts = this.getAllContacts();
    
    return {
      total: contacts.length,
      active: contacts.filter(c => c.crm.status === CONTACT_STATUS.ACTIVE).length,
      prospects: contacts.filter(c => c.crm.status === CONTACT_STATUS.PROSPECT).length,
      atRisk: contacts.filter(c => c.crm.status === CONTACT_STATUS.AT_RISK).length,
      companies: contacts.filter(c => c.type === CONTACT_TYPES.COMPANY).length,
      individuals: contacts.filter(c => c.type === CONTACT_TYPES.INDIVIDUAL).length,
      totalProfit: contacts.reduce((sum, c) => sum + (c.crm.totalProfit || 0), 0),
      totalRenewals: contacts.reduce((sum, c) => sum + (c.crm.renewalsCount || 0), 0),
      totalOpportunities: contacts.reduce((sum, c) => sum + (c.crm.openOppsCount || 0), 0)
    };
  }

  // Storage methods
  saveToStorage() {
    try {
      const data = {
        contacts: Array.from(this.contacts.entries()),
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('worktrackr_contacts', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save contacts to storage:', error);
    }
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('worktrackr_contacts');
      if (stored) {
        const data = JSON.parse(stored);
        this.contacts = new Map(data.contacts || []);
      }
    } catch (error) {
      console.error('Failed to load contacts from storage:', error);
      this.contacts = new Map();
    }
  }

  // Export/Import methods
  exportContacts() {
    return {
      contacts: Array.from(this.contacts.entries()),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  }

  importContacts(data) {
    try {
      if (data.contacts && Array.isArray(data.contacts)) {
        this.contacts = new Map(data.contacts);
        this.saveToStorage();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import contacts:', error);
      return false;
    }
  }

  // Clear all data (for testing/reset)
  clearAll() {
    this.contacts.clear();
    this.saveToStorage();
  }
}

// Create singleton instance
export const contactDB = new ContactDatabase();

// Helper functions for common operations
export const createContact = (data) => contactDB.createContact(data);
export const getContact = (id) => contactDB.getContact(id);
export const getAllContacts = () => contactDB.getAllContacts();
export const searchContacts = (query) => contactDB.searchContacts(query);
export const updateContact = (id, data) => contactDB.updateContact(id, data);
export const deleteContact = (id) => contactDB.deleteContact(id);
export const getContactsForSelector = () => contactDB.getContactsForSelector();
export const getContactStatistics = () => contactDB.getStatistics();

// Export the database instance as default
export default contactDB;
