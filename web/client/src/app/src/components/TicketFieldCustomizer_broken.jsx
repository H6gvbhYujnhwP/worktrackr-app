import React, { useState } from 'react';
import { X, Plus, Settings, Eye, Save, Upload, MapPin, FileText, User, Mail, Phone, Calendar, Clock, Hash, CheckSquare, List, Image, Paperclip, DollarSign, Star, AlertTriangle, Building, Wrench, Zap, Move, GripVertical, Trash2, Tag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';

const TicketFieldCustomizer = ({ isOpen, onClose }) => {
  // Load saved template from localStorage
  const loadSavedTemplate = () => {
    const saved = localStorage.getItem('ticketTemplate');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          template: parsed.template || {},
          order: parsed.order || [],
          configurations: parsed.configurations || { category: ['General', 'Technical', 'Maintenance', 'Support'] }
        };
      } catch (error) {
        console.error('Error parsing saved template:', error);
      }
    }
    return {
      template: { title: true, description: true, priority: true, assignee: true, status: true },
      order: ['title', 'description', 'priority', 'assignee', 'status'],
      configurations: { category: ['General', 'Technical', 'Maintenance', 'Support'] }
    };
  };

  const [selectedFields, setSelectedFields] = useState(() => {
    const savedData = loadSavedTemplate();
    return Object.keys(savedData.template).filter(key => savedData.template[key]);
  });
  const [fieldOrder, setFieldOrder] = useState(() => {
    const savedData = loadSavedTemplate();
    return savedData.order;
  });
  const [customFields, setCustomFields] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [fieldConfigurations, setFieldConfigurations] = useState(() => {
    const savedData = loadSavedTemplate();
    return savedData.configurations;
  });
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Available field types with comprehensive options
  const availableFields = {
    // Basic Fields
    title: { 
      icon: FileText, 
      label: 'Ticket Title', 
      type: 'text', 
      required: true, 
      category: 'basic',
      description: 'Main title/subject of the ticket'
    },
    description: { 
      icon: FileText, 
      label: 'Description', 
      type: 'textarea', 
      required: true, 
      category: 'basic',
      description: 'Detailed description of the issue or request'
    },
    priority: { 
      icon: AlertTriangle, 
      label: 'Priority Level', 
      type: 'select', 
      required: true, 
      category: 'basic',
      options: ['Low', 'Medium', 'High', 'Critical'],
      description: 'Urgency level of the ticket'
    },
    status: { 
      icon: CheckSquare, 
      label: 'Status', 
      type: 'select', 
      required: true, 
      category: 'basic',
      options: ['New', 'Assigned', 'In Progress', 'Waiting Approval', 'Completed', 'Parked'],
      description: 'Current status of the ticket'
    },
    category: { 
      icon: Tag, 
      label: 'Category', 
      type: 'configurable_select', 
      required: false, 
      category: 'basic',
      options: ['General', 'Technical', 'Maintenance', 'Support'],
      description: 'Ticket category/type',
      configurable: true
    },
    
    // Assignment Fields
    assignee: { 
      icon: User, 
      label: 'Assigned To', 
      type: 'user_select', 
      required: false, 
      category: 'assignment',
      description: 'Team member responsible for this ticket'
    },
    assignedUser: { 
      icon: User, 
      label: 'Assigned User', 
      type: 'user_select', 
      required: false, // EXPLICITLY NOT REQUIRED
      category: 'assignment',
      description: 'Team member responsible for this ticket'
    },
    reporter: { 
      icon: User, 
      label: 'Reported By', 
      type: 'user_select', 
      required: false, 
      category: 'assignment',
      description: 'Person who created/reported the ticket'
    },
    createdBy: { 
      icon: User, 
      label: 'Created By', 
      type: 'user_select', 
      required: false, 
      category: 'assignment',
      description: 'Who created the ticket'
    },
    department: { 
      icon: Building, 
      label: 'Department', 
      type: 'select', 
      required: false, 
      category: 'assignment',
      options: ['Maintenance', 'IT', 'Security', 'Facilities', 'Operations'],
      description: 'Department responsible for handling this ticket'
    },
    
    // Location & Contact Fields
    job_location: { 
      icon: MapPin, 
      label: 'Job Location', 
      type: 'text', 
      required: false, 
      category: 'location',
      description: 'Physical location where work needs to be performed'
    },
    building: { 
      icon: Building, 
      label: 'Building/Property', 
      type: 'text', 
      required: false, 
      category: 'location',
      description: 'Building or property identifier'
    },
    room_number: { 
      icon: Hash, 
      label: 'Room/Unit Number', 
      type: 'text', 
      required: false, 
      category: 'location',
      description: 'Specific room or unit number'
    },
    customer_name: { 
      icon: User, 
      label: 'Customer Name', 
      type: 'text', 
      required: false, 
      category: 'contact',
      description: 'Name of the customer or client'
    },
    customer_email: { 
      icon: Mail, 
      label: 'Customer Email', 
      type: 'email', 
      required: false, 
      category: 'contact',
      description: 'Customer email address for updates'
    },
    customer_phone: { 
      icon: Phone, 
      label: 'Customer Phone', 
      type: 'tel', 
      required: false, 
      category: 'contact',
      description: 'Customer phone number'
    },
    
    // Date & Time Fields
    due_date: { 
      icon: Calendar, 
      label: 'Due Date', 
      type: 'date', 
      required: false, 
      category: 'scheduling',
      description: 'When the work should be completed'
    },
    scheduled_date: { 
      icon: Calendar, 
      label: 'Scheduled Date', 
      type: 'datetime', 
      required: false, 
      category: 'scheduling',
      description: 'When the work is scheduled to start'
    },
    estimated_hours: { 
      icon: Clock, 
      label: 'Estimated Hours', 
      type: 'number', 
      required: false, 
      category: 'scheduling',
      description: 'Estimated time to complete the work'
    },
    
    // Technical Fields
    equipment_id: { 
      icon: Wrench, 
      label: 'Equipment ID', 
      type: 'text', 
      required: false, 
      category: 'technical',
      description: 'Equipment or asset identifier'
    },
    work_type: { 
      icon: Wrench, 
      label: 'Work Type', 
      type: 'select', 
      required: false, 
      category: 'technical',
      options: ['Repair', 'Maintenance', 'Installation', 'Inspection', 'Emergency'],
      description: 'Type of work to be performed'
    },
    service_category: { 
      icon: List, 
      label: 'Service Category', 
      type: 'select', 
      required: false, 
      category: 'technical',
      options: ['Electrical', 'Plumbing', 'HVAC', 'General Maintenance', 'IT Support', 'Security'],
      description: 'Category of service required'
    },
    
    // Financial Fields
    estimated_cost: { 
      icon: DollarSign, 
      label: 'Estimated Cost', 
      type: 'currency', 
      required: false, 
      category: 'financial',
      description: 'Estimated cost for the work'
    },
    budget_code: { 
      icon: Hash, 
      label: 'Budget Code', 
      type: 'text', 
      required: false, 
      category: 'financial',
      description: 'Budget or cost center code'
    },
    
    // File & Media Fields
    photos: { 
      icon: Image, 
      label: 'Photos/Images', 
      type: 'file_upload', 
      required: false, 
      category: 'media',
      accept: 'image/*',
      multiple: true,
      description: 'Upload photos related to the ticket'
    },
    attachments: { 
      icon: Paperclip, 
      label: 'File Attachments', 
      type: 'file_upload', 
      required: false, 
      category: 'media',
      multiple: true,
      description: 'Upload documents, PDFs, or other files'
    },
    
    // Custom Rating/Feedback
    urgency_rating: { 
      icon: Star, 
      label: 'Urgency Rating', 
      type: 'rating', 
      required: false, 
      category: 'assessment',
      max: 5,
      description: 'Rate the urgency from 1-5 stars'
    },
    
    // Additional Notes
    internal_notes: { 
      icon: FileText, 
      label: 'Internal Notes', 
      type: 'textarea', 
      required: false, 
      category: 'notes',
      description: 'Internal notes not visible to customers'
    },
    customer_notes: { 
      icon: FileText, 
      label: 'Customer Notes', 
      type: 'textarea', 
      required: false, 
      category: 'notes',
      description: 'Notes visible to customers'
    }
  };

  const fieldCategories = {
    basic: { label: 'Basic Information', icon: FileText, color: 'blue' },
    assignment: { label: 'Assignment & Responsibility', icon: User, color: 'green' },
    location: { label: 'Location & Property', icon: MapPin, color: 'red' },
    contact: { label: 'Customer Contact', icon: Mail, color: 'purple' },
    scheduling: { label: 'Dates & Scheduling', icon: Calendar, color: 'orange' },
    technical: { label: 'Technical Details', icon: Wrench, color: 'indigo' },
    financial: { label: 'Financial Information', icon: DollarSign, color: 'emerald' },
    media: { label: 'Files & Media', icon: Image, color: 'pink' },
    assessment: { label: 'Assessment & Rating', icon: Star, color: 'yellow' },
    notes: { label: 'Notes & Comments', icon: FileText, color: 'gray' }
  };

  const toggleField = (fieldKey) => {
    const field = availableFields[fieldKey];
    
    if (selectedFields.includes(fieldKey)) {
      // Check if field is truly required (not assignedUser which should be removable)
      if (field && field.required && fieldKey !== 'assignedUser') {
        // Don't allow removing truly required fields
        console.log(`Cannot remove required field: ${fieldKey}`);
        return;
      }
      
      // Remove field
      setSelectedFields(selectedFields.filter(f => f !== fieldKey));
      setFieldOrder(fieldOrder.filter(f => f !== fieldKey));
    } else {
      // Add field
      setSelectedFields([...selectedFields, fieldKey]);
      setFieldOrder([...fieldOrder, fieldKey]);
    }
  };

  const moveField = (fieldKey, direction) => {
    const currentIndex = fieldOrder.indexOf(fieldKey);
    if (direction === 'up' && currentIndex > 0) {
      const newOrder = [...fieldOrder];
      [newOrder[currentIndex], newOrder[currentIndex - 1]] = [newOrder[currentIndex - 1], newOrder[currentIndex]];
      setFieldOrder(newOrder);
    } else if (direction === 'down' && currentIndex < fieldOrder.length - 1) {
      const newOrder = [...fieldOrder];
      [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
      setFieldOrder(newOrder);
    }
  };

  const updateFieldConfiguration = (fieldKey, config) => {
    setFieldConfigurations(prev => ({
      ...prev,
      [fieldKey]: config
    }));
  };

  const addCategoryOption = (fieldKey) => {
    const currentOptions = fieldConfigurations[fieldKey] || [];
    updateFieldConfiguration(fieldKey, [...currentOptions, '']);
  };

  const removeCategoryOption = (fieldKey, index) => {
    const currentOptions = fieldConfigurations[fieldKey] || [];
    const newOptions = currentOptions.filter((_, i) => i !== index);
    updateFieldConfiguration(fieldKey, newOptions);
  };

  const handleSave = () => {
    // Filter out empty category options before saving
    const cleanedConfigurations = { ...fieldConfigurations };
    if (cleanedConfigurations.category) {
      cleanedConfigurations.category = cleanedConfigurations.category.filter(option => option.trim() !== '');
      // Ensure at least one default category exists
      if (cleanedConfigurations.category.length === 0) {
        cleanedConfigurations.category = ['General'];
      }
    }
    
    const templateData = {
      template: selectedFields.reduce((acc, field) => {
        acc[field] = true;
        return acc;
      }, {}),
      order: fieldOrder,
      configurations: cleanedConfigurations
    };
    
    localStorage.setItem('ticketTemplate', JSON.stringify(templateData));
    console.log('Saved template with configurations:', templateData);
  };

  const updateCategoryOption = (fieldKey, index, value) => {
    const currentOptions = fieldConfigurations[fieldKey] || [];
    const newOptions = [...currentOptions];
    newOptions[index] = value;
    updateFieldConfiguration(fieldKey, newOptions);
  };

  const renderFieldPreview = (fieldKey) => {
    const field = availableFields[fieldKey];
    if (!field) return null;

    const commonProps = {
      className: "w-full",
      placeholder: `Enter ${field.label.toLowerCase()}...`
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return <Input {...commonProps} type={field.type} />;
      case 'textarea':
        return <textarea {...commonProps} rows="3" className="w-full p-2 border border-gray-300 rounded-md" />;
      case 'select':
        return (
          <select className="w-full p-2 border border-gray-300 rounded-md">
            <option>Select {field.label}</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'date':
        return <Input {...commonProps} type="date" />;
      case 'datetime':
        return <Input {...commonProps} type="datetime-local" />;
      case 'number':
      case 'currency':
        return <Input {...commonProps} type="number" step="0.01" />;
      case 'file_upload':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
            <p className="text-xs text-gray-500">{field.accept || 'Any file type'}</p>
          </div>
        );
      case 'rating':
        return (
          <div className="flex space-x-1">
            {[...Array(field.max || 5)].map((_, i) => (
              <Star key={i} className="w-6 h-6 text-gray-300 hover:text-yellow-400 cursor-pointer" />
            ))}
          </div>
        );
      case 'user_select':
        return (
          <select className="w-full p-2 border border-gray-300 rounded-md">
            <option>Select User</option>
            <option>John Admin</option>
            <option>Sarah Manager</option>
            <option>Mike Technician</option>
          </select>
        );
      default:
        return <Input {...commonProps} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-6xl max-h-[95vh] overflow-hidden ticket-customizer-modal">
        <CardHeader className="border-b p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <CardTitle className="text-lg sm:text-2xl flex items-center">
                <Settings className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-blue-600 flex-shrink-0" />
                <span className="truncate">Customize Your Ticket</span>
              </CardTitle>
              <CardDescription className="mt-1 sm:mt-2 text-xs sm:text-sm">
                Design your ticket template by selecting the elements you need
              </CardDescription>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <Button 
                variant="outline" 
                onClick={() => setPreviewMode(!previewMode)}
                className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-2 sm:px-3"
                size="sm"
              >
                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{previewMode ? 'Edit' : 'Preview'}</span>
              </Button>
              <Button onClick={onClose} variant="ghost" size="sm">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-y-auto max-h-[calc(95vh-120px)]">
          {previewMode ? (
            // Preview Mode
            <div className="p-6">
              <div className="max-w-2xl mx-auto">
                <h3 className="text-xl font-semibold mb-6 text-center">Ticket Form Preview</h3>
                <Card>
                  <CardContent className="p-6 space-y-6">
                    {fieldOrder.map((fieldKey) => {
                      const field = availableFields[fieldKey];
                      if (!field) return null;
                      
                      return (
                        <div key={fieldKey} className="space-y-2">
                          <Label className="text-sm font-medium flex items-center">
                            <field.icon className="w-4 h-4 mr-2" />
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          {renderFieldPreview(fieldKey)}
                          {field.description && (
                            <p className="text-xs text-gray-500">{field.description}</p>
                          )}
                        </div>
                      );
                    })}
                    
                    <div className="flex justify-end space-x-3 pt-4 border-t">
                      <Button variant="outline">Save as Draft</Button>
                      <Button>Create Ticket</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            // Edit Mode
            <Tabs defaultValue="fields" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fields">Available Fields</TabsTrigger>
                <TabsTrigger value="layout">Field Layout & Order</TabsTrigger>
              </TabsList>

              <TabsContent value="fields" className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Select Fields for Your Tickets</h3>
                    <Badge variant="outline">
                      {selectedFields.length} fields selected
                    </Badge>
                  </div>

                  {Object.entries(fieldCategories).map(([categoryKey, category]) => {
                    const categoryFields = Object.entries(availableFields).filter(
                      ([_, field]) => field.category === categoryKey
                    );

                    if (categoryFields.length === 0) return null;

                    return (
                      <Card key={categoryKey}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center">
                            <category.icon className={`w-5 h-5 mr-2 text-${category.color}-600`} />
                            {category.label}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {categoryFields.map(([fieldKey, field]) => (
                              <Card 
                                key={fieldKey} 
                                className={`cursor-pointer transition-all mobile-field-card ${
                                  selectedFields.includes(fieldKey) 
                                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                                    : 'hover:shadow-md'
                                }`}
                                onClick={() => {
                                  if (fieldKey === 'category') {
                                    if (!selectedFields.includes(fieldKey)) {
                                      // Add field first, then show modal
                                      setSelectedFields([...selectedFields, fieldKey]);
                                      setFieldOrder([...fieldOrder, fieldKey]);
                                      
                                      // Initialize category options if they don't exist
                                      if (!fieldConfigurations.category || fieldConfigurations.category.length === 0) {
                                        setFieldConfigurations(prev => ({
                                          ...prev,
                                          category: ['General', 'Technical', 'Maintenance', 'Support']
                                        }));
                                      }
                                      
                                      setShowCategoryModal(true);
                                    } else {
                                      // Remove field if already selected
                                      setSelectedFields(selectedFields.filter(f => f !== fieldKey));
                                      setFieldOrder(fieldOrder.filter(f => f !== fieldKey));
                                    }
                                  } else {
                                    toggleField(fieldKey);
                                  }
                                }}
                              >
                                <CardContent className="p-3 sm:p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0 pr-2">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <field.icon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 flex-shrink-0" />
                                        <span className="font-medium text-xs sm:text-sm">{field.label}</span>
                                        {field.required && fieldKey !== 'assignedUser' && (
                                          <Badge variant="destructive" className="text-xs px-1 py-0 flex-shrink-0">
                                            Required
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-600 mb-2">{field.description}</p>
                                      <Badge variant="outline" className="text-xs">
                                        {field.type.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                    <div className="ml-2 flex-shrink-0">
                                      {selectedFields.includes(fieldKey) ? (
                                        <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                      ) : (
                                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-300 rounded"></div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}



                </div>
              </TabsContent>

              <TabsContent value="layout" className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Arrange Field Order</h3>
                    <p className="text-sm text-gray-600">Drag fields to reorder them in your ticket form</p>
                  </div>

                  {fieldOrder.length === 0 ? (
                    <Card className="p-8 text-center">
                      <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No fields selected</h3>
                      <p className="text-gray-600">Go to the "Available Fields" tab to select fields for your ticket form</p>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {fieldOrder.map((fieldKey, index) => {
                        const field = availableFields[fieldKey];
                        if (!field) return null;

                        return (
                          <Card key={fieldKey} className="border-l-4 border-l-blue-500">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                                  <field.icon className="w-5 h-5 text-gray-600" />
                                  <div>
                                    <span className="font-medium">{field.label}</span>
                                    {field.required && fieldKey !== 'assignedUser' && (
                                      <Badge variant="destructive" className="ml-2 text-xs px-1 py-0">
                                        Required
                                      </Badge>
                                    )}
                                    <p className="text-sm text-gray-600">{field.description}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => moveField(fieldKey, 'up')}
                                    disabled={index === 0}
                                  >
                                    ↑
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => moveField(fieldKey, 'down')}
                                    disabled={index === fieldOrder.length - 1}
                                  >
                                    ↓
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => toggleField(fieldKey)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {/* Configuration Interface for Category Field */}
                  {selectedFields.includes('category') && (
                    <Card className="mt-6 border-blue-200 bg-blue-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center">
                          <Tag className="w-5 h-5 mr-2 text-blue-600" />
                          Configure Category Options
                        </CardTitle>
                        <CardDescription>
                          Add your own categories that will appear as dropdown options when creating tickets
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {(fieldConfigurations.category || []).map((option, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                value={option}
                                onChange={(e) => updateCategoryOption('category', index, e.target.value)}
                                placeholder="Enter category name"
                                className="flex-1"
                              />
                              {fieldConfigurations.category.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeCategoryOption('category', index)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => addCategoryOption('category')}
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Your Own Categories
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
        
        <div className="border-t p-4 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedFields.length} fields selected • Form ready for use
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Use the handleSave function to ensure proper cleaning and validation
              handleSave();
              onClose();
            }} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Save Ticket Form
            </Button>
          </div>
        </div>
      </Card>
    </div>

      {/* Category Configuration Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Tag className="w-5 h-5 mr-2 text-blue-600" />
                Configure Categories
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCategoryModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Add your own categories that will appear as dropdown options when creating tickets.
            </p>
            
            <div className="space-y-3 mb-4">
              {(fieldConfigurations.category && fieldConfigurations.category.length > 0 
                ? fieldConfigurations.category 
                : ['General', 'Technical', 'Maintenance', 'Support']
              ).map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option}
                    onChange={(e) => updateCategoryOption('category', index, e.target.value)}
                    placeholder="Enter category name"
                    className="flex-1"
                  />
                  {(fieldConfigurations.category || ['General', 'Technical', 'Maintenance', 'Support']).length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeCategoryOption('category', index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => addCategoryOption('category')}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
              <Button
                onClick={() => {
                  handleSave();
                  setShowCategoryModal(false);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Save Categories
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketFieldCustomizer;

