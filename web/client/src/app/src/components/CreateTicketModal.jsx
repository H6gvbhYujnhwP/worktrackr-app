import React, { useState } from 'react';
import { useSimulation } from '../App.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { 
  X, 
  Plus, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  Tag,
  Paperclip,
  Search,
  Clock,
  Building,
  Camera,
  Image,
  Upload,
  Star,
  DollarSign,
  Wrench
} from 'lucide-react';
import { priorities, categories } from '../data/mockData.js';
import ContactSelector from './ContactSelector.jsx';
import ContactCreationModal from './ContactCreationModal.jsx';
import { loadTemplate, getRenderableFieldCount, RENDERABLE_FIELDS } from '../shared/template.js';

export default function CreateTicketModal({ onClose, users, currentUser }) {
  const { createTicket } = useSimulation();
  const [errors, setErrors] = useState({});
  
  // Load template using shared loader
  const { template: savedTemplate, order: fieldOrder, configurations: fieldConfigurations } = loadTemplate();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: '',
    status: 'new',
    assignedUser: '',
    assignedTo: null,
    createdBy: currentUser?.name || '',
    contact: '',
    contactDetails: null,
    equipment_id: '',
    work_type: '',
    service_category: '',
    scheduled_date: '',
    photos: '',
    attachments: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContactCreationModal, setShowContactCreationModal] = useState(false);
  const [contactCreationInitialName, setContactCreationInitialName] = useState('');

  const handleInputChange = (field, value) => {
    console.log('[CreateTicket] handleInputChange called:', { field, value });
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    console.log('[CreateTicket] Submit handler called', { formData, isSubmitting });
    console.log('[CreateTicket] Full formData object:', JSON.stringify(formData, null, 2));
    
    if (isSubmitting) {
      console.log('[CreateTicket] Already submitting, ignoring');
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      console.log('[CreateTicket] Creating ticket with data:', formData);
      
      // Validate required fields
      const newErrors = {};
      if (!formData.title?.trim()) {
        newErrors.title = 'Title is required';
      }
      if (!formData.description?.trim()) {
        newErrors.description = 'Description is required';
      }

      if (Object.keys(newErrors).length > 0) {
        console.log('[CreateTicket] Validation errors:', newErrors);
        setErrors(newErrors);
        setIsSubmitting(false);
        return;
      }

      console.log('[CreateTicket] Creating ticket with data:', formData);
      
      // Create ticket - remove empty string fields that should be null
      const ticketData = {
        ...formData,
        createdBy: currentUser?.name || 'Unknown User',
        createdAt: new Date().toISOString()
      };
      
      // Clean up empty fields - convert empty strings to null or remove them
      if (!ticketData.scheduled_date || ticketData.scheduled_date === '') {
        delete ticketData.scheduled_date;
      } else {
        // Convert datetime-local format (2026-01-28T16:50) to ISO datetime
        ticketData.scheduled_date = new Date(ticketData.scheduled_date).toISOString();
      }
      if (!ticketData.equipment_id || ticketData.equipment_id === '') {
        delete ticketData.equipment_id;
      }
      if (!ticketData.work_type || ticketData.work_type === '') {
        delete ticketData.work_type;
      }
      if (!ticketData.service_category || ticketData.service_category === '') {
        delete ticketData.service_category;
      }
      if (!ticketData.photos || ticketData.photos === '') {
        delete ticketData.photos;
      }
      if (!ticketData.attachments || ticketData.attachments === '') {
        delete ticketData.attachments;
      }
      
      const result = await createTicket(ticketData);
      
      console.log('[CreateTicket] Ticket created successfully:', result);
      
      // If ticket has scheduled date, sync with booking calendar
      if (formData.scheduled_date) {
        try {
          const { updateTicketBooking } = await import('../utils/ticketToBookingConverter.js');
          updateTicketBooking({ ...ticketData, id: result.id });
          console.log('[CreateTicket] Synced ticket to booking calendar');
        } catch (error) {
          console.error('[CreateTicket] Error syncing to booking calendar:', error);
        }
      }
      
      onClose();
    } catch (error) {
      console.error('[CreateTicket] Error creating ticket:', error);
      setErrors({ submit: 'Failed to create ticket. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe field renderer with error handling
  const renderField = (fieldKey) => {
    try {
      switch (fieldKey) {
        case 'title':
          return (
            <div key={fieldKey}>
              <Label htmlFor="title" className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5">
                <FileText className="w-3.5 h-3.5" />
                Title *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Brief description of the issue"
                className={`border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017] ${errors.title ? 'border-red-400' : ''}`}
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>
          );

        case 'description':
          return (
            <div key={fieldKey}>
              <Label htmlFor="description" className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5">
                <FileText className="w-3.5 h-3.5" />
                Description *
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the issue in detail..."
                className={`border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017] ${errors.description ? 'border-red-400' : ''}`}
                rows={20}
              />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>
          );

        case 'contact':
          return (
            <div key={fieldKey} className="mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <Label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">
                  <User className="w-3.5 h-3.5" />
                  Contact
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setContactCreationInitialName('');
                    setShowContactCreationModal(true);
                  }}
                  className="text-[11px] font-medium text-[#d4a017] hover:text-[#b8860b] flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  New Contact
                </button>
              </div>
              <ContactSelector
                selectedContactId={formData.contact}
                onContactSelect={(contact) => {
                  handleInputChange('contact', contact ? contact.id : '');
                  if (contact) {
                    setFormData(prev => ({
                      ...prev,
                      contact: contact.id,
                      contactDetails: {
                        companyName: contact.name,
                        fullAddress: contact.addresses?.[0]?.fullAddress || 'No address available',
                        email: contact.email,
                        phone: contact.phone
                      }
                    }));
                  }
                }}
                onCreateNew={(searchTerm) => {
                  setContactCreationInitialName(searchTerm || '');
                  setShowContactCreationModal(true);
                }}
                placeholder="Select or search for a contact..."
              />
              {formData.contactDetails && (
                <div className="mt-2 p-3 bg-[#fafafa] border border-[#e5e7eb] rounded-lg text-[13px] mb-4">
                  <div className="font-medium text-[#111113]">{formData.contactDetails.companyName}</div>
                  <div className="text-[#6b7280] mt-0.5">{formData.contactDetails.fullAddress}</div>
                  <div className="text-[#6b7280]">{formData.contactDetails.email}</div>
                  <div className="text-[#6b7280]">{formData.contactDetails.phone}</div>
                </div>
              )}
            </div>
          );

        case 'priority':
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Priority
              </Label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                <SelectTrigger className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );

        case 'status':
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5">
                <Tag className="w-3.5 h-3.5" />
                Status
              </Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );

        case 'category':
          const categoryOptions = fieldConfigurations?.category || ['General', 'Technical', 'Maintenance', 'Support'];
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5">
                <Tag className="w-3.5 h-3.5" />
                Category
              </Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.filter(cat => cat && cat.trim()).map((cat, index) => (
                    <SelectItem key={index} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );

        case 'assignedUser':
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5">
                <User className="w-3.5 h-3.5" />
                Assigned User
              </Label>
              <Select value={formData.assignedUser} onValueChange={(value) => {
                handleInputChange('assignedUser', value);
                // Also set assignedTo for consistency with ticket details
                const selectedUser = users?.find(u => u.name === value);
                if (selectedUser) {
                  handleInputChange('assignedTo', selectedUser.id);
                }
              }}>
                <SelectTrigger className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]">
                  <SelectValue placeholder="Select user to assign ticket" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map(user => (
                    <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );

        case 'equipment_id':
          const equipmentOptions = fieldConfigurations?.equipment_id || ['EQ-001', 'EQ-002', 'EQ-003'];
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5">
                <Wrench className="w-3.5 h-3.5" />
                Equipment ID
              </Label>
              <Select value={formData.equipment_id} onValueChange={(value) => handleInputChange('equipment_id', value)}>
                <SelectTrigger className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]">
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentOptions.filter(eq => eq && eq.trim()).map((eq, index) => (
                    <SelectItem key={index} value={eq}>{eq}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );

        case 'work_type':
          const workTypeOptions = fieldConfigurations?.work_type || ['Maintenance', 'Repair', 'Installation', 'Inspection'];
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5">
                <Building className="w-3.5 h-3.5" />
                Work Type
              </Label>
              <Select value={formData.work_type} onValueChange={(value) => handleInputChange('work_type', value)}>
                <SelectTrigger className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]">
                  <SelectValue placeholder="Select work type" />
                </SelectTrigger>
                <SelectContent>
                  {workTypeOptions.filter(wt => wt && wt.trim()).map((wt, index) => (
                    <SelectItem key={index} value={wt}>{wt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );

        case 'service_category':
          const serviceCategoryOptions = fieldConfigurations?.service_category || ['Standard', 'Premium', 'Emergency', 'Scheduled'];
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5">
                <Star className="w-3.5 h-3.5" />
                Service Category
              </Label>
              <Select value={formData.service_category} onValueChange={(value) => handleInputChange('service_category', value)}>
                <SelectTrigger className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]">
                  <SelectValue placeholder="Select service category" />
                </SelectTrigger>
                <SelectContent>
                  {serviceCategoryOptions.filter(sc => sc && sc.trim()).map((sc, index) => (
                    <SelectItem key={index} value={sc}>{sc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );

        case 'scheduled_date':
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Scheduled Date
              </Label>
              <Input 
                type="datetime-local"
                step="900"
                value={formData.scheduled_date}
                onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
                placeholder="Select date and time"
                className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]"
              />
            </div>
          );

        case 'photos':
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5">
                <Image className="w-3.5 h-3.5" />
                Photos/Images
              </Label>
              <Input 
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleInputChange('photos', Array.from(e.target.files || []))}
                className="border-[#e5e7eb] file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#fef9ee] file:text-[#b8860b] hover:file:bg-[#fef3c7]"
              />
              {formData.photos && formData.photos.length > 0 && (
                <p className="text-xs text-[#6b7280] mt-1">
                  {formData.photos.length} file(s) selected
                </p>
              )}
            </div>
          );

        case 'attachments':
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                File Attachments
              </Label>
              <Input 
                type="file"
                multiple
                onChange={(e) => handleInputChange('attachments', Array.from(e.target.files || []))}
                className="border-[#e5e7eb] file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#fef9ee] file:text-[#b8860b] hover:file:bg-[#fef3c7]"
              />
              {formData.attachments && formData.attachments.length > 0 && (
                <p className="text-xs text-[#6b7280] mt-1">
                  {formData.attachments.length} file(s) selected
                </p>
              )}
            </div>
          );

        default:
          return null;
      }
    } catch (error) {
      console.error(`Error rendering field ${fieldKey}:`, error);
      return (
        <div key={fieldKey} className="p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-red-600 text-sm">Error rendering field: {fieldKey}</p>
        </div>
      );
    }
  };

  // Separate fields into main content and sidebar metadata
  const mainContentFields = ['contact', 'title', 'description'];
  const sidebarFields = fieldOrder.filter(field => !mainContentFields.includes(field) && savedTemplate[field]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      {/* Modal container — Modern Enterprise white card */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] flex-shrink-0">
          <h2 className="text-[15px] font-semibold text-[#111113]">Create New Ticket</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-[#111113] hover:bg-[#f3f4f6] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          <form id="create-ticket-form" onSubmit={handleSubmit} className="h-full">
            {/* Error display */}
            {errors.submit && (
              <Alert variant="destructive" className="m-4">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{errors.submit}</AlertDescription>
              </Alert>
            )}

            {/* Two-column layout: Main (70%) + Sidebar (30%) */}
            <div className="flex flex-col lg:flex-row h-full overflow-hidden">
              {/* Left — main fields */}
              <div className="flex-1 lg:w-[70%] p-6 overflow-y-auto">
                <div className="space-y-6">
                  {mainContentFields.map(fieldKey => {
                    if (!savedTemplate[fieldKey]) return null;
                    return renderField(fieldKey);
                  })}
                </div>
              </div>

              {/* Right — metadata sidebar */}
              <div className="lg:w-[30%] bg-[#fafafa] border-t lg:border-t-0 lg:border-l border-[#e5e7eb] p-6 overflow-y-auto">
                <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-4">Details</p>
                <div className="space-y-4">
                  {sidebarFields.map(fieldKey => renderField(fieldKey))}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#e5e7eb] flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#374151] bg-white border border-[#e5e7eb] rounded-lg hover:bg-[#f9fafb] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8860b] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-[#111113]" />
                Creating…
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Create Ticket
              </>
            )}
          </button>
        </div>
      </div>

      {/* Contact Creation Modal */}
      <ContactCreationModal
        isOpen={showContactCreationModal}
        onClose={() => {
          setShowContactCreationModal(false);
          setContactCreationInitialName('');
        }}
        onContactCreated={(newContact) => {
          console.log('[CreateTicketModal] New contact created:', newContact);
          // Automatically select the newly created contact
          handleInputChange('contact', newContact.id);
          setFormData(prev => ({
            ...prev,
            contact: newContact.id,
            contactDetails: {
              companyName: newContact.name,
              fullAddress: newContact.addresses?.[0]?.fullAddress || 'No address available',
              email: newContact.email,
              phone: newContact.phone
            }
          }));
          setShowContactCreationModal(false);
          setContactCreationInitialName('');
        }}
        initialName={contactCreationInitialName}
      />
    </div>
  );
}
