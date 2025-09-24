// Billing Integration Utilities
// Functions to integrate tickets, contacts, and billing

import { contactDB } from '../data/contactDatabase.js';

/**
 * Generate billing queue item from completed ticket
 * @param {Object} ticket - The completed ticket
 * @returns {Object} Billing queue item
 */
export const generateBillingQueueItem = (ticket) => {
  // Get contact information from central database
  const contact = ticket.contactId ? contactDB.getContact(ticket.contactId) : null;
  
  // Generate unique billing queue item ID
  const queueItemId = `billing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Extract billing information from ticket and contact
  const billingItem = {
    queueItemId,
    ticketId: ticket.id,
    status: 'pending_review',
    createdAt: new Date().toISOString(),
    processedAt: null,
    
    // Ticket Information
    ticketData: {
      title: ticket.title,
      description: ticket.description,
      completedAt: ticket.completedAt || new Date().toISOString(),
      assignedTo: ticket.assignedTo,
      
      // Customer Information from Contact Database
      customer: contact ? {
        id: contact.id,
        name: contact.name,
        displayName: contact.displayName,
        email: contact.email,
        phone: contact.phone,
        primaryContact: contact.primaryContact,
        type: contact.type
      } : {
        // Fallback to ticket data if no contact linked
        id: null,
        name: ticket.customerName || 'Unknown Customer',
        email: ticket.customerEmail || '',
        phone: ticket.customerPhone || '',
        primaryContact: ticket.customerName || '',
        type: 'individual'
      },
      
      // Service Information
      service: {
        description: ticket.title,
        category: ticket.category || 'General Service',
        location: ticket.location || '',
        priority: ticket.priority || 'medium'
      },
      
      // Billing Information from Contact's Accounting Data
      billing: contact ? {
        currency: contact.accounting?.currency || 'GBP',
        paymentTerms: contact.accounting?.paymentTerms || 'Net 30',
        taxNumber: contact.accounting?.taxNumber || '',
        accountCode: contact.accounting?.accountCode || '',
        
        // Calculate amounts (these would typically come from time tracking or service pricing)
        quantity: 1,
        unitRate: 0, // To be filled in during review
        subtotal: 0,
        taxRate: 0.20, // 20% VAT (UK standard)
        taxAmount: 0,
        totalAmount: 0,
        
        // Invoice details
        invoiceNumber: null, // Generated when invoice is created
        invoiceDate: null,
        dueDate: null
      } : {
        // Default billing information
        currency: 'GBP',
        paymentTerms: 'Net 30',
        taxNumber: '',
        accountCode: '',
        quantity: 1,
        unitRate: 0,
        subtotal: 0,
        taxRate: 0.20,
        taxAmount: 0,
        totalAmount: 0,
        invoiceNumber: null,
        invoiceDate: null,
        dueDate: null
      }
    },
    
    // Address Information from Contact
    billingAddress: contact ? contactDB.getPrimaryAddress(contact.id, 'billing') : null,
    
    // Integration Status
    integration: {
      xeroInvoiceId: null,
      quickbooksInvoiceId: null,
      syncStatus: 'pending',
      lastSyncAttempt: null,
      syncErrors: []
    },
    
    // Processing Notes
    notes: '',
    reviewedBy: null,
    reviewedAt: null
  };
  
  return billingItem;
};

/**
 * Auto-populate billing queue from completed tickets
 * @param {Array} tickets - Array of all tickets
 * @returns {Array} Array of billing queue items
 */
export const populateBillingQueueFromTickets = (tickets) => {
  const completedTickets = tickets.filter(ticket => 
    ticket.status === 'completed' || ticket.status === 'closed'
  );
  
  return completedTickets.map(ticket => generateBillingQueueItem(ticket));
};

/**
 * Update billing item with contact information
 * @param {Object} billingItem - The billing queue item
 * @param {string} contactId - The contact ID to link
 * @returns {Object} Updated billing item
 */
export const linkBillingItemToContact = (billingItem, contactId) => {
  const contact = contactDB.getContact(contactId);
  
  if (!contact) {
    throw new Error(`Contact with ID ${contactId} not found`);
  }
  
  return {
    ...billingItem,
    ticketData: {
      ...billingItem.ticketData,
      customer: {
        id: contact.id,
        name: contact.name,
        displayName: contact.displayName,
        email: contact.email,
        phone: contact.phone,
        primaryContact: contact.primaryContact,
        type: contact.type
      },
      billing: {
        ...billingItem.ticketData.billing,
        currency: contact.accounting?.currency || 'GBP',
        paymentTerms: contact.accounting?.paymentTerms || 'Net 30',
        taxNumber: contact.accounting?.taxNumber || '',
        accountCode: contact.accounting?.accountCode || ''
      }
    },
    billingAddress: contactDB.getPrimaryAddress(contact.id, 'billing')
  };
};

/**
 * Calculate billing amounts
 * @param {Object} billingItem - The billing queue item
 * @param {number} unitRate - Rate per unit/hour
 * @param {number} quantity - Quantity/hours
 * @returns {Object} Updated billing item with calculated amounts
 */
export const calculateBillingAmounts = (billingItem, unitRate, quantity) => {
  const subtotal = unitRate * quantity;
  const taxRate = billingItem.ticketData.billing.taxRate || 0.20;
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;
  
  return {
    ...billingItem,
    ticketData: {
      ...billingItem.ticketData,
      billing: {
        ...billingItem.ticketData.billing,
        unitRate,
        quantity,
        subtotal,
        taxAmount,
        totalAmount
      }
    }
  };
};

/**
 * Generate invoice data for accounting system integration
 * @param {Object} billingItem - The billing queue item
 * @returns {Object} Invoice data formatted for Xero/QuickBooks
 */
export const generateInvoiceData = (billingItem) => {
  const { customer, billing, service } = billingItem.ticketData;
  const billingAddress = billingItem.billingAddress;
  
  return {
    // Customer Information
    contact: {
      contactId: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      addresses: billingAddress ? [{
        type: 'POBOX',
        line1: billingAddress.line1,
        line2: billingAddress.line2,
        city: billingAddress.city,
        region: billingAddress.state,
        postalCode: billingAddress.postcode,
        country: billingAddress.country
      }] : []
    },
    
    // Invoice Details
    invoice: {
      type: 'ACCREC', // Accounts Receivable
      invoiceNumber: billing.invoiceNumber,
      reference: billingItem.ticketId,
      date: billing.invoiceDate || new Date().toISOString().split('T')[0],
      dueDate: billing.dueDate,
      currencyCode: billing.currency,
      status: 'DRAFT',
      
      // Line Items
      lineItems: [{
        description: `${service.description} - Ticket #${billingItem.ticketId}`,
        quantity: billing.quantity,
        unitAmount: billing.unitRate,
        accountCode: billing.accountCode,
        taxType: billing.taxRate > 0 ? 'OUTPUT2' : 'NONE', // UK VAT codes
        lineAmount: billing.subtotal
      }],
      
      // Totals
      subTotal: billing.subtotal,
      totalTax: billing.taxAmount,
      total: billing.totalAmount
    }
  };
};

/**
 * Export billing data in various formats
 * @param {Array} billingItems - Array of billing queue items
 * @param {string} format - Export format (csv, json, xero, quickbooks)
 * @returns {string|Object} Formatted export data
 */
export const exportBillingData = (billingItems, format = 'csv') => {
  switch (format.toLowerCase()) {
    case 'csv':
      return exportToCSV(billingItems);
    case 'json':
      return JSON.stringify(billingItems, null, 2);
    case 'xero':
      return billingItems.map(item => generateInvoiceData(item));
    case 'quickbooks':
      return billingItems.map(item => generateInvoiceData(item));
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
};

/**
 * Export billing items to CSV format
 * @param {Array} billingItems - Array of billing queue items
 * @returns {string} CSV formatted string
 */
const exportToCSV = (billingItems) => {
  const headers = [
    'Ticket ID',
    'Customer Name',
    'Customer Email',
    'Service Description',
    'Quantity',
    'Unit Rate',
    'Subtotal',
    'Tax Amount',
    'Total Amount',
    'Currency',
    'Status',
    'Created Date',
    'Completed Date'
  ];
  
  const rows = billingItems.map(item => [
    item.ticketId,
    item.ticketData.customer.name,
    item.ticketData.customer.email,
    item.ticketData.service.description,
    item.ticketData.billing.quantity,
    item.ticketData.billing.unitRate,
    item.ticketData.billing.subtotal,
    item.ticketData.billing.taxAmount,
    item.ticketData.billing.totalAmount,
    item.ticketData.billing.currency,
    item.status,
    item.createdAt,
    item.ticketData.completedAt
  ]);
  
  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
};

/**
 * Validate billing item before processing
 * @param {Object} billingItem - The billing queue item
 * @returns {Object} Validation result with errors array
 */
export const validateBillingItem = (billingItem) => {
  const errors = [];
  
  // Required customer information
  if (!billingItem.ticketData.customer.name) {
    errors.push('Customer name is required');
  }
  
  if (!billingItem.ticketData.customer.email) {
    errors.push('Customer email is required');
  }
  
  // Required billing information
  if (!billingItem.ticketData.billing.unitRate || billingItem.ticketData.billing.unitRate <= 0) {
    errors.push('Unit rate must be greater than 0');
  }
  
  if (!billingItem.ticketData.billing.quantity || billingItem.ticketData.billing.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }
  
  // Service description
  if (!billingItem.ticketData.service.description) {
    errors.push('Service description is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  generateBillingQueueItem,
  populateBillingQueueFromTickets,
  linkBillingItemToContact,
  calculateBillingAmounts,
  generateInvoiceData,
  exportBillingData,
  validateBillingItem
};
