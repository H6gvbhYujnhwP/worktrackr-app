import React, { useState } from 'react';
import { useSimulation } from '../App.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
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
      
      // Create ticket
      const ticketData = {
        ...formData,
        createdBy: currentUser?.name || 'Unknown User',
        createdAt: new Date().toISOString()
      };
      
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
              <Label htmlFor="title" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Title *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Brief description of the issue"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>
          );

        case 'description':
          return (
            <div key={fieldKey}>
              <Label htmlFor="description" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Description *
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the issue in detail..."
                className={errors.description ? 'border-red-500' : ''}
                rows={20}
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>
          );

        case 'contact':
          return (
            <div key={fieldKey} className="mb-6">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Contact
              </Label>
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
                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm mb-4">
                  <div className="font-medium">{formData.contactDetails.companyName}</div>
                  <div className="text-gray-600">{formData.contactDetails.fullAddress}</div>
                  <div className="text-gray-600">{formData.contactDetails.email}</div>
                  <div className="text-gray-600">{formData.contactDetails.phone}</div>
                </div>
              )}
            </div>
          );

        case 'priority':
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Priority
              </Label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                <SelectTrigger>
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
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Status
              </Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
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
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Category
              </Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
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
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
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
                <SelectTrigger>
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
              <Label className="flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Equipment ID
              </Label>
              <Select value={formData.equipment_id} onValueChange={(value) => handleInputChange('equipment_id', value)}>
                <SelectTrigger>
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
              <Label className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                Work Type
              </Label>
              <Select value={formData.work_type} onValueChange={(value) => handleInputChange('work_type', value)}>
                <SelectTrigger>
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
              <Label className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                Service Category
              </Label>
              <Select value={formData.service_category} onValueChange={(value) => handleInputChange('service_category', value)}>
                <SelectTrigger>
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
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Scheduled Date
              </Label>
              <Input 
                type="datetime-local"
                value={formData.scheduled_date}
                onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
                placeholder="Select date and time"
              />
            </div>
          );

        case 'photos':
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                Photos/Images
              </Label>
              <Input 
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleInputChange('photos', Array.from(e.target.files || []))}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {formData.photos && formData.photos.length > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {formData.photos.length} file(s) selected
                </p>
              )}
            </div>
          );

        case 'attachments':
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                File Attachments
              </Label>
              <Input 
                type="file"
                multiple
                onChange={(e) => handleInputChange('attachments', Array.from(e.target.files || []))}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {formData.attachments && formData.attachments.length > 0 && (
                <p className="text-sm text-gray-600 mt-1">
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-5xl h-[90vh] flex flex-col">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b flex-shrink-0">
          <div>
            <CardTitle className="text-xl">Create New Ticket</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
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

            {/* Sidebar Layout: Main Content (70%) + Sidebar (30%) */}
            <div className="flex flex-col lg:flex-row h-full overflow-hidden">
              {/* Left Main Content Area */}
              <div className="flex-1 lg:w-[70%] p-6 overflow-y-auto">
                <div className="space-y-6">
                  {mainContentFields.map(fieldKey => {
                    if (!savedTemplate[fieldKey]) return null;
                    return renderField(fieldKey);
                  })}
                </div>
              </div>

              {/* Right Sidebar - Metadata Fields */}
              <div className="lg:w-[30%] bg-gray-50 border-t lg:border-t-0 lg:border-l p-6 overflow-y-auto">
                <div className="space-y-4">
                  {sidebarFields.map(fieldKey => {
                    return renderField(fieldKey);
                  })}
                </div>
              </div>
            </div>
          </form>
        </div>
        
        <div className="flex justify-end gap-2 p-4 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Ticket
              </>
            )}
          </Button>
        </div>
      </Card>

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
