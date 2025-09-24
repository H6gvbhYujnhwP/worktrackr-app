import React, { useState, useEffect } from 'react';
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
  Building
} from 'lucide-react';
import { priorities, categories } from '../data/mockData.js';
import ContactSelector from './ContactSelector.jsx';

// Field definitions - ensure these match TicketFieldCustomizer
const fieldDefinitions = {
  title: { required: true },
  description: { required: true },
  priority: { required: true },
  status: { required: true },
  assignedUser: { required: false }, // This should NOT be required
  assignee: { required: false },
  dueDate: { required: false },
  location: { required: false },
  comments: { required: false },
  customer_name: { required: false },
  customer_email: { required: false },
  customer_phone: { required: false },
  building: { required: false },
  room_number: { required: false },
  job_location: { required: false }
};

// Load saved template from localStorage
const getSavedTemplate = () => {
  const saved = localStorage.getItem('ticketTemplate');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return { 
        template: parsed.template, 
        order: parsed.order, 
        configurations: parsed.configurations || {} 
      };
    } catch (error) {
      console.error('Error parsing saved template:', error);
    }
  }
  // Default template
  return {
    template: { title: true, description: true, status: true, assignedUser: true, createdBy: true },
    order: ['title', 'description', 'status', 'assignedUser', 'createdBy'],
    configurations: { category: ['General', 'Technical', 'Maintenance', 'Support'] }
  };
};

export default function CreateTicketModal({ onClose, users, currentUser }) {
  const { createTicket, addComment, updateTicket } = useSimulation();
  const [errors, setErrors] = useState({});
  
  // Safely get saved template with error handling
  const getSafeTemplate = () => {
    try {
      const template = getSavedTemplate();
      // Limit the number of fields to prevent performance issues
      const fieldCount = Object.keys(template.template || {}).length;
      if (fieldCount > 20) {
        console.warn(`Template has ${fieldCount} fields, limiting to prevent performance issues`);
        // Keep only the first 20 fields
        const limitedFields = Object.keys(template.template).slice(0, 20);
        const limitedTemplate = {};
        limitedFields.forEach(field => {
          limitedTemplate[field] = template.template[field];
        });
        return {
          ...template,
          template: limitedTemplate,
          order: template.order.slice(0, 20)
        };
      }
      return template;
    } catch (error) {
      console.error('Error loading template:', error);
      return {
        template: { title: true, description: true, status: true },
        order: ['title', 'description', 'status'],
        configurations: { category: ['General'] }
      };
    }
  };
  
  const { template: savedTemplate, order: fieldOrder, configurations: fieldConfigurations } = getSafeTemplate();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: '',
    categories: [''],
    location: '',
    assignedTo: '',
    dueDate: '',
    comments: '',
    fileAttachments: [],
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    building: '',
    roomNumber: '',
    jobLocation: '',
    status: 'new',
    selectedContactId: null,
    selectedContact: null,
    equipment_id: '',
    work_type: '',
    service_category: '',
    assignee: '',
    department: '',
    due_date: '',
    scheduled_date: '',
    estimated_hours: '',
    estimated_cost: '',
    budget_code: '',
    photos: [],
    attachments: [],
    urgency_rating: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field, value) => {
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

  const handleContactSelect = (contact) => {
    setFormData(prev => ({
      ...prev,
      selectedContactId: contact.id,
      selectedContact: contact,
      // Auto-populate customer fields if they exist in the template
      customerName: contact.name || prev.customerName,
      customerEmail: contact.email || prev.customerEmail,
      customerPhone: contact.phone || prev.customerPhone
    }));
  };

  const handleCreateNewContact = (searchTerm) => {
    // This could open a contact creation modal or navigate to contact manager
    console.log('Create new contact with name:', searchTerm);
    // For now, just show an alert
    alert('Contact creation feature - would open contact manager');
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Only validate fields that are in the template AND are required
    if (savedTemplate.title && fieldDefinitions.title?.required && !formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (savedTemplate.description && fieldDefinitions.description?.required && !formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    // assignedUser is NOT required according to fieldDefinitions
    if (savedTemplate.assignedUser && fieldDefinitions.assignedUser?.required && !formData.assignedTo) {
      newErrors.assignedTo = 'Assigned user is required';
    }
    
    if (savedTemplate.dueDate && formData.dueDate && new Date(formData.dueDate) < new Date()) {
      newErrors.dueDate = 'Due date cannot be in the past';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const ticketData = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        category: formData.category,
        location: formData.location,
        assignedTo: formData.assignedTo || null,
        dueDate: formData.dueDate || null,
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        status: formData.status || (formData.assignedTo ? 'assigned' : 'new'),
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        building: formData.building,
        roomNumber: formData.roomNumber,
        jobLocation: formData.jobLocation
      };
      
      const newTicket = createTicket(ticketData);
      
      // Add initial comment if provided
      if (savedTemplate.comments && formData.comments.trim()) {
        addComment(newTicket.id, currentUser.id, formData.comments);
      }
      
      // Send email notification if assigned
      if (formData.assignedTo && users && Array.isArray(users)) {
        const assignedUser = users.find(u => String(u.id) === String(formData.assignedTo));
        if (assignedUser) {
          console.log(`Email sent to ${assignedUser.name}: New ticket assigned - ${formData.title}`);
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating ticket:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2">
      <Card className="w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Create New Ticket</CardTitle>
              <CardDescription className="text-sm">
                Fill out the form below to create a new support ticket
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 overflow-y-auto flex-1 min-h-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Template-based fields in order */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-medium">Create New Ticket</h3>
                <Badge variant="secondary" className="text-xs">
                  Using saved template ({fieldOrder.filter(field => savedTemplate[field]).length            {/* Dynamic Fields */}
            <div className="space-y-4">
              {fieldOrder.slice(0, 20).map(fieldKey => {
                if (!savedTemplate[fieldKey]) return null;
                
                // Add error boundary for each field
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
                        {errors.title && (
                          <p className="text-sm text-red-600 mt-1">{errors.title}</p>
                        )}
                      </div>
                    );
                    
                  case 'description':
                    return (
                      <div key={fieldKey}>
                        <Label htmlFor="description" className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Description {savedTemplate.description ? '*' : ''}
                        </Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          placeholder="Detailed description of the issue"
                          rows={4}
                          className={errors.description ? 'border-red-500' : ''}
                        />
                        {errors.description && (
                          <p className="text-sm text-red-600 mt-1">{errors.description}</p>
                        )}
                      </div>
                    );
                    
                  case 'priority':
                    return (
                      <div key={fieldKey}>
                        <Label htmlFor="priority" className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Priority
                        </Label>
                        <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(priorities).map(([key, priority]) => (
                              <SelectItem key={key} value={key}>{priority.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                    
                  case 'category':
                    const categoryOptions = fieldConfigurations.category || ['General', 'Technical', 'Maintenance', 'Support'];
                    const validOptions = categoryOptions.filter(option => option && option.trim());
                    
                    return (
                      <div key={fieldKey}>
                        <Label className="flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Category
                        </Label>
                        <Select 
                          value={formData.category || ""} 
                          onValueChange={(value) => handleInputChange('category', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={validOptions.length > 0 ? "Select category" : "No categories configured"} />
                          </SelectTrigger>
                          <SelectContent>
                            {validOptions.length > 0 ? (
                              validOptions.map((option, index) => (
                                <SelectItem key={index} value={option}>
                                  {option}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="" disabled>
                                No categories available - configure in ticket customizer
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {errors.category && (
                          <p className="text-sm text-red-600 mt-1">{errors.category}</p>
                        )}
                      </div>
                    );
                    
                  case 'location':
                    return (
                      <div key={fieldKey}>
                        <Label htmlFor="location" className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Location
                        </Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          placeholder="Building, room, or address"
                        />
                      </div>
                    );
                    
                  case 'assignedUser':
                    return (
                      <div key={fieldKey}>
                        <Label htmlFor="assignedTo" className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Assigned User {fieldDefinitions.assignedUser?.required ? '*' : ''}
                        </Label>
                        <Select 
                          value={formData.assignedTo || ""} 
                          onValueChange={(value) => handleInputChange('assignedTo', value)}
                        >
                          <SelectTrigger className={errors.assignedTo ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Select user to assign ticket" />
                          </SelectTrigger>
                          <SelectContent>
                            {(users || []).map(user => (
                              <SelectItem key={user.id} value={String(user.id)}>
                                {user.name} ({user.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.assignedTo && (
                          <p className="text-sm text-red-600 mt-1">{errors.assignedTo}</p>
                        )}
                      </div>
                    );
                    
                  case 'dueDate':
                    return (
                      <div key={fieldKey}>
                        <Label htmlFor="dueDate" className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Due Date
                        </Label>
                        <Input
                          id="dueDate"
                          type="datetime-local"
                          value={formData.dueDate}
                          onChange={(e) => handleInputChange('dueDate', e.target.value)}
                          className={errors.dueDate ? 'border-red-500' : ''}
                        />
                        {errors.dueDate && (
                          <p className="text-sm text-red-600 mt-1">{errors.dueDate}</p>
                        )}
                      </div>
                    );
                    
                  case 'contact':
                    return (
                      <div key={fieldKey}>
                        <Label className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Contact
                        </Label>
                        <ContactSelector
                          selectedContactId={formData.selectedContactId}
                          onContactSelect={handleContactSelect}
                          onCreateNew={handleCreateNewContact}
                          placeholder="Select or search for a contact..."
                        />
                        {formData.selectedContact && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm font-medium">{formData.selectedContact.name}</div>
                            {formData.selectedContact.email && (
                              <div className="text-sm text-gray-600">{formData.selectedContact.email}</div>
                            )}
                            {formData.selectedContact.phone && (
                              <div className="text-sm text-gray-600">{formData.selectedContact.phone}</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                    
                  case 'comments':
                    return (
                      <div key={fieldKey}>
                        <Label htmlFor="comments" className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Initial Comment
                        </Label>
                        <Textarea
                          id="comments"
                          value={formData.comments}
                          onChange={(e) => handleInputChange('comments', e.target.value)}
                          placeholder="Add an initial comment (optional)"
                          rows={3}
                        />
                      </div>
                    );
                    
                  case 'fileAttachments':
                    return (
                      <div key={fieldKey}>
                        <Label className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4" />
                          File Attachments
                        </Label>
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                          <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">File upload functionality coming soon</p>
                        </div>
                      </div>
                    );
                    
                  case 'timeTracking':
                    return (
                      <div key={fieldKey}>
                        <Label className="flex items-center gap-2">
                          <Timer className="w-4 h-4" />
                          Time Tracking
                        </Label>
                        <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                          Time tracking will be available once the ticket is created and work begins.
                        </div>
                      </div>
                    );

                  case 'customer_name':
                    return (
                      <div key={fieldKey}>
                        <Label htmlFor="customerName" className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Customer Name
                        </Label>
                        <Input
                          id="customerName"
                          value={formData.customerName || ''}
                          onChange={(e) => handleInputChange('customerName', e.target.value)}
                          placeholder="Customer or client name"
                        />
                      </div>
                    );

                  case 'customer_email':
                    return (
                      <div key={fieldKey}>
                        <Label htmlFor="customerEmail" className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Customer Email
                        </Label>
                        <Input
                          id="customerEmail"
                          type="email"
                          value={formData.customerEmail || ''}
                          onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                          placeholder="customer@example.com"
                        />
                      </div>
                    );

                  case 'customer_phone':
                    return (
                      <div key={fieldKey}>
                        <Label htmlFor="customerPhone" className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Customer Phone
                        </Label>
                        <Input
                          id="customerPhone"
                          type="tel"
                          value={formData.customerPhone || ''}
                          onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                          placeholder="Phone number"
                        />
                      </div>
                    );

                  case 'building':
                    return (
                      <div key={fieldKey}>
                        <Label htmlFor="building" className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Building/Property
                        </Label>
                        <Input
                          id="building"
                          value={formData.building || ''}
                          onChange={(e) => handleInputChange('building', e.target.value)}
                          placeholder="Building or property name"
                        />
                      </div>
                    );

                  case 'room_number':
                    return (
                      <div key={fieldKey}>
                        <Label htmlFor="roomNumber" className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Room/Unit Number
                        </Label>
                        <Input
                          id="roomNumber"
                          value={formData.roomNumber || ''}
                          onChange={(e) => handleInputChange('roomNumber', e.target.value)}
                          placeholder="Room or unit number"
                        />
                      </div>
                    );

                  case 'job_location':
                    return (
                      <div key={fieldKey}>
                        <Label htmlFor="jobLocation" className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Job Location
                        </Label>
                        <Input
                          id="jobLocation"
                          value={formData.jobLocation || ''}
                          onChange={(e) => handleInputChange('jobLocation', e.target.value)}
                          placeholder="Physical location for work"
                        />
                      </div>
                    );

                  case 'equipment_id':
                    const equipmentOptions = fieldConfigurations.equipment_id || ['EQ-001', 'EQ-002', 'EQ-003'];
                    const validEquipmentOptions = equipmentOptions.filter(option => option && option.trim());
                    
                    return (
                      <div key={fieldKey}>
                        <Label className="flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Equipment ID
                        </Label>
                        <Select 
                          value={formData.equipment_id || ""} 
                          onValueChange={(value) => handleInputChange('equipment_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={validEquipmentOptions.length > 0 ? "Select equipment ID" : "No equipment IDs configured"} />
                          </SelectTrigger>
                          <SelectContent>
                            {validEquipmentOptions.length > 0 ? (
                              validEquipmentOptions.map((option, index) => (
                                <SelectItem key={index} value={option}>
                                  {option}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="" disabled>
                                No equipment IDs available - configure in ticket customizer
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    );

                  case 'work_type':
                    const workTypeOptions = fieldConfigurations.work_type || ['Maintenance', 'Repair', 'Installation', 'Inspection'];
                    const validWorkTypeOptions = workTypeOptions.filter(option => option && option.trim());
                    
                    return (
                      <div key={fieldKey}>
                        <Label className="flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Work Type
                        </Label>
                        <Select 
                          value={formData.work_type || ""} 
                          onValueChange={(value) => handleInputChange('work_type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={validWorkTypeOptions.length > 0 ? "Select work type" : "No work types configured"} />
                          </SelectTrigger>
                          <SelectContent>
                            {validWorkTypeOptions.length > 0 ? (
                              validWorkTypeOptions.map((option, index) => (
                                <SelectItem key={index} value={option}>
                                  {option}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="" disabled>
                                No work types available - configure in ticket customizer
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    );

                  case 'service_category':
                    const serviceCategoryOptions = fieldConfigurations.service_category || ['Standard', 'Premium', 'Emergency', 'Scheduled'];
                    const validServiceCategoryOptions = serviceCategoryOptions.filter(option => option && option.trim());
                    
                    return (
                      <div key={fieldKey}>
                        <Label className="flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Service Category
                        </Label>
                        <Select 
                          value={formData.service_category || ""} 
                          onValueChange={(value) => handleInputChange('service_category', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={validServiceCategoryOptions.length > 0 ? "Select service category" : "No service categories configured"} />
                          </SelectTrigger>
                          <SelectContent>
                            {validServiceCategoryOptions.length > 0 ? (
                              validServiceCategoryOptions.map((option, index) => (
                                <SelectItem key={index} value={option}>
                                  {option}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="" disabled>
                                No service categories available - configure in ticket customizer
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    );

                  case 'status':
                    return (
                      <div key={fieldKey}>
                        <Label htmlFor="status" className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Status
                        </Label>
                        <Select value={formData.status || 'new'} onValueChange={(value) => handleInputChange('status', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="assigned">Assigned</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="waiting_approval">Waiting Approval</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="parked">Parked</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );

                  case 'assignee':
                    return (
                      <div key={fieldKey}>
                        <Label htmlFor="assignee" className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Assigned To
                        </Label>
                        <Select 
                          value={formData.assignee || ""} 
                          onValueChange={(value) => handleInputChange('assignee', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select user to assign ticket" />
                          </SelectTrigger>
                          <SelectContent>
                            {(users || []).map(user => (
                              <SelectItem key={user.id} value={String(user.id)}>
                                {user.name} ({user.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );

                  case 'department':
                    return (
                      <div key={fieldKey}>
                        <Label className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          Department
                        </Label>
                        <Select 
                          value={formData.department || ""} 
                          onValueChange={(value) => handleInputChange('department', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Maintenance">Maintenance</SelectItem>
                            <SelectItem value="IT">IT</SelectItem>
                            <SelectItem value="Security">Security</SelectItem>
                            <SelectItem value="Facilities">Facilities</SelectItem>
                            <SelectItem value="Operations">Operations</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );

                  case 'due_date':
                    return (
                      <div key={fieldKey}>
                        <Label htmlFor="due_date" className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Due Date
                        </Label>
                        <Input
                          id="due_date"
                          type="date"
                          value={formData.due_date || ''}
                          onChange={(e) => handleInputChange('due_date', e.target.value)}
                        />
                      </div>
                    );

                  case 'scheduled_date':
                    return (
                      <div key={fieldKey}>
                        <Label htmlFor="scheduled_date" className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Scheduled Date
                        </Label>
                        <Input
                          id="scheduled_date"
                          type="datetime-local"
                          value={formData.scheduled_date || ''}
                          onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
                        />
                      </div>
                    );

                  case 'estimated_hours':
                    return (
                      <div key={fieldKey}>
                        <Label htmlFor="estimated_hours" className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Estimated Hours
                        </Label>
                        <Input
                          id="estimated_hours"
                          type="number"
                          min="0"
                          step="0.5"
                          value={formData.estimated_hours || ''}
                          onChange={(e) => handleInputChange('estimated_hours', e.target.value)}
                          placeholder="Hours to complete"
                        />
                      </div>
                    );

                  case 'estimated_cost':
                    return (
                      <div key={fieldKey}>
                        <Label htmlFor="estimated_cost" className="flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Estimated Cost
                        </Label>
                        <Input
                          id="estimated_cost"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.estimated_cost || ''}
                          onChange={(e) => handleInputChange('estimated_cost', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    );

                  case 'budget_code':
                    return (
                      <div key={fieldKey}>
                        <Label htmlFor="budget_code" className="flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Budget Code
                        </Label>
                        <Input
                          id="budget_code"
                          value={formData.budget_code || ''}
                          onChange={(e) => handleInputChange('budget_code', e.target.value)}
                          placeholder="Budget or cost center code"
                        />
                      </div>
                    );

                  case 'photos':
                    return (
                      <div key={fieldKey}>
                        <Label className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4" />
                          Photos/Images
                        </Label>
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                          <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Photo upload functionality coming soon</p>
                        </div>
                      </div>
                    );

                  case 'attachments':
                    return (
                      <div key={fieldKey}>
                        <Label className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4" />
                          File Attachments
                        </Label>
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                          <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">File upload functionality coming soon</p>
                        </div>
                      </div>
                    );

                  case 'urgency_rating':
                    return (
                      <div key={fieldKey}>
                        <Label className="flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Urgency Rating
                        </Label>
                        <Select 
                          value={formData.urgency_rating || ""} 
                          onValueChange={(value) => handleInputChange('urgency_rating', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Rate urgency (1-5)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 - Very Low</SelectItem>
                            <SelectItem value="2">2 - Low</SelectItem>
                            <SelectItem value="3">3 - Medium</SelectItem>
                            <SelectItem value="4">4 - High</SelectItem>
                            <SelectItem value="5">5 - Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );

                  case 'reporter':
                  case 'createdBy':
                    return (
                      <div key={fieldKey}>
                        <Label className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {fieldKey === 'reporter' ? 'Reported By' : 'Created By'}
                        </Label>
                        <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                          {currentUser ? `${currentUser.name} (${currentUser.email})` : 'Current user will be set automatically'}
                        </div>
                      </div>
                    );
                    
                  default:
                    return null;
                }
              })}
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

