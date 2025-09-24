import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  User, 
  Plus, 
  Search, 
  Check, 
  ChevronDown,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { 
  contactDB, 
  CONTACT_TYPES, 
  CONTACT_STATUS 
} from '../data/contactDatabase.js';

const ContactSelector = ({ 
  selectedContactId, 
  onContactSelect, 
  onCreateNew, 
  placeholder = "Select or search for a contact...",
  showCreateButton = true,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    if (selectedContactId) {
      const contact = contactDB.getContact(selectedContactId);
      setSelectedContact(contact);
    } else {
      setSelectedContact(null);
    }
  }, [selectedContactId]);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm]);

  const loadContacts = () => {
    const allContacts = contactDB.getAllContacts();
    setContacts(allContacts);
  };

  const filterContacts = () => {
    if (!searchTerm) {
      setFilteredContacts(contacts.slice(0, 10)); // Show first 10 contacts
      return;
    }

    const filtered = contactDB.searchContacts(searchTerm);
    setFilteredContacts(filtered.slice(0, 10)); // Limit to 10 results
  };

  const handleContactSelect = (contact) => {
    setSelectedContact(contact);
    onContactSelect(contact);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    if (onCreateNew) {
      onCreateNew(searchTerm); // Pass search term as potential name
    }
  };

  const getContactDisplayInfo = (contact) => {
    const primaryAddress = contact.addresses.find(addr => addr.isPrimary) || contact.addresses[0];
    const location = primaryAddress ? 
      `${primaryAddress.city}${primaryAddress.state ? ', ' + primaryAddress.state : ''}` : 
      '';

    return {
      name: contact.name,
      subtitle: contact.primaryContact || contact.email || contact.phone || '',
      location,
      type: contact.type,
      status: contact.crm.status
    };
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

  return (
    <div className={`relative ${className}`}>
      {/* Selected Contact Display / Search Input */}
      <div 
        className={`
          flex items-center justify-between p-3 border rounded-lg cursor-pointer
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}
          ${selectedContact ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}
        `}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedContact ? (
          <div className="flex items-center space-x-3 flex-1">
            <div className="p-2 bg-white rounded-lg border">
              {selectedContact.type === CONTACT_TYPES.COMPANY ? (
                <Building2 className="w-4 h-4 text-gray-600" />
              ) : (
                <User className="w-4 h-4 text-gray-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="font-medium text-gray-900 truncate">{selectedContact.name}</p>
                <Badge className={getStatusColor(selectedContact.crm.status)} size="sm">
                  {selectedContact.crm.status}
                </Badge>
              </div>
              {selectedContact.primaryContact && (
                <p className="text-sm text-gray-600 truncate">{selectedContact.primaryContact}</p>
              )}
              <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                {selectedContact.email && (
                  <span className="flex items-center">
                    <Mail className="w-3 h-3 mr-1" />
                    {selectedContact.email}
                  </span>
                )}
                {selectedContact.phone && (
                  <span className="flex items-center">
                    <Phone className="w-3 h-3 mr-1" />
                    {selectedContact.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3 flex-1">
            <Search className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">{placeholder}</span>
          </div>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          {/* Contact List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <div className="p-4 text-center">
                {searchTerm ? (
                  <div>
                    <p className="text-gray-600 mb-3">No contacts found for "{searchTerm}"</p>
                    {showCreateButton && (
                      <Button 
                        onClick={handleCreateNew}
                        size="sm"
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create "{searchTerm}" as new contact
                      </Button>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 mb-3">No contacts available</p>
                    {showCreateButton && (
                      <Button 
                        onClick={handleCreateNew}
                        size="sm"
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create new contact
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-2">
                {filteredContacts.map((contact) => {
                  const displayInfo = getContactDisplayInfo(contact);
                  const isSelected = selectedContact?.id === contact.id;
                  
                  return (
                    <div
                      key={contact.id}
                      className={`
                        flex items-center space-x-3 px-3 py-2 cursor-pointer hover:bg-gray-50
                        ${isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''}
                      `}
                      onClick={() => handleContactSelect(contact)}
                    >
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {contact.type === CONTACT_TYPES.COMPANY ? (
                          <Building2 className="w-4 h-4 text-gray-600" />
                        ) : (
                          <User className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900 truncate">{displayInfo.name}</p>
                          <Badge className={getStatusColor(contact.crm.status)} size="sm">
                            {contact.crm.status}
                          </Badge>
                        </div>
                        
                        {displayInfo.subtitle && (
                          <p className="text-sm text-gray-600 truncate">{displayInfo.subtitle}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          {contact.email && (
                            <span className="flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {contact.email}
                            </span>
                          )}
                          {contact.phone && (
                            <span className="flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {contact.phone}
                            </span>
                          )}
                          {displayInfo.location && (
                            <span className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {displayInfo.location}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  );
                })}
                
                {/* Create New Option */}
                {showCreateButton && searchTerm && !filteredContacts.some(c => 
                  c.name.toLowerCase() === searchTerm.toLowerCase()
                ) && (
                  <div className="border-t mt-2 pt-2">
                    <div
                      className="flex items-center space-x-3 px-3 py-2 cursor-pointer hover:bg-gray-50 text-blue-600"
                      onClick={handleCreateNew}
                    >
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Plus className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium">Create "{searchTerm}" as new contact</p>
                        <p className="text-xs text-gray-500">Add this as a new contact to your database</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Always show Create New Contact button at bottom when contacts exist */}
                {showCreateButton && (
                  <div className="border-t mt-2 pt-2">
                    <div
                      className="flex items-center space-x-3 px-3 py-2 cursor-pointer hover:bg-gray-50 text-blue-600"
                      onClick={handleCreateNew}
                    >
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Plus className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium">Create new contact</p>
                        <p className="text-xs text-gray-500">Add a new contact to your database</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ContactSelector;
