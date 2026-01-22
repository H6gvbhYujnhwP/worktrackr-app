import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { X, Building2, User, Mail, Phone, MapPin, Loader2 } from 'lucide-react';

export default function QuickAddCustomerModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    primary_contact: '',
    email: '',
    phone: '',
    addresses: []
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Please provide a company or contact name');
      return;
    }

    setSaving(true);

    try {
      // Map form data to contacts API format
      const contactData = {
        type: 'company',
        name: formData.name,
        primaryContact: formData.primary_contact || '',
        email: formData.email || '',
        phone: formData.phone || '',
        addresses: formData.addresses || [],
        crm: {
          status: 'prospect'
        }
      };

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(contactData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create customer');
      }

      const data = await response.json();
      
      // Reset form
      setFormData({
        name: '',
        primary_contact: '',
        email: '',
        phone: '',
        addresses: []
      });

      // Call onSave with the new contact (mapped to customer format)
      if (onSave) {
        const mappedContact = {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone
        };
        onSave(mappedContact);
      }

      onClose();
    } catch (err) {
      console.error('Error creating customer:', err);
      setError(err.message || 'Failed to create customer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setFormData({
        name: '',
        primary_contact: '',
        email: '',
        phone: '',
        addresses: []
      });
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">Add New Customer</h2>
            <p className="text-sm text-gray-500 mt-1">
              Quickly add a customer to create a quote
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                <Building2 className="w-4 h-4 inline mr-1" />
                Company/Contact Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Acme Corp"
                disabled={saving}
              />
            </div>

            {/* Contact Name */}
            <div className="space-y-2">
              <Label htmlFor="primary_contact">
                <User className="w-4 h-4 inline mr-1" />
                Primary Contact Person
              </Label>
              <Input
                id="primary_contact"
                value={formData.primary_contact}
                onChange={(e) => setFormData({ ...formData, primary_contact: e.target.value })}
                placeholder="e.g., John Smith"
                disabled={saving}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., john@acmecorp.com"
                disabled={saving}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., +44 20 1234 5678"
                disabled={saving}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">
              <MapPin className="w-4 h-4 inline mr-1" />
              Address
            </Label>
            <Textarea
              id="address"
              value={formData.addresses[0] || ''}
              onChange={(e) => setFormData({ ...formData, addresses: e.target.value ? [e.target.value] : [] })}
              placeholder="Full address including postcode"
              rows={3}
              disabled={saving}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4 mr-2" />
                  Create Customer
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
