import React, { useState } from 'react';
import { X, Plus, Settings, Eye, Save, Upload, MapPin, FileText, User, Mail, Phone, Calendar, Clock, Hash, CheckSquare, List, Image, Paperclip, DollarSign, Star, AlertTriangle, Building, Wrench, Zap, Move, GripVertical, Trash2, Tag, Briefcase } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { loadTemplate, saveTemplate, DEFAULT_TEMPLATE, TEMPLATE_VERSION, RENDERABLE_FIELDS, getRenderableFieldCount } from '../shared/template.js';

const TicketFieldCustomizer = ({ isOpen, onClose }) => {

  const [selectedFields, setSelectedFields] = useState(() => {
    const savedData = loadTemplate();
    return Object.keys(savedData.template).filter(key => savedData.template[key]);
  });
  const [fieldOrder, setFieldOrder] = useState(() => {
    const savedData = loadTemplate();
    return savedData.order;
  });
  const [customFields, setCustomFields] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [fieldConfigurations, setFieldConfigurations] = useState(() => {
    const savedData = loadTemplate();
    return savedData.configurations;
  });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showEquipmentIdModal, setShowEquipmentIdModal] = useState(false);
  const [showWorkTypeModal, setShowWorkTypeModal] = useState(false);
  const [showServiceCategoryModal, setShowServiceCategoryModal] = useState(false);


  // Available field types with comprehensive options
  const availableFields = {
    // Basic Fields
    title: { 
      icon: FileText, 
      label: 'Title', 
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
    equipment_id: { 
      icon: Wrench, 
      label: 'Equipment ID', 
      type: 'configurable_select', 
      required: false, 
      category: 'technical',
      options: ['EQ-001', 'EQ-002', 'EQ-003'],
      description: 'Equipment identifier',
      configurable: true
    },
    work_type: { 
      icon: Building, 
      label: 'Work Type', 
      type: 'configurable_select', 
      required: false, 
      category: 'technical',
      options: ['Maintenance', 'Repair', 'Installation', 'Inspection'],
      description: 'Type of work to be performed',
      configurable: true
    },
    service_category: { 
      icon: Star, 
      label: 'Service Category', 
      type: 'configurable_select', 
      required: false, 
      category: 'technical',
      options: ['Standard', 'Premium', 'Emergency', 'Scheduled'],
      description: 'Service category level',
      configurable: true
    },
    
    // Keep assignedUser for Create Ticket modal, but remove from customizer
    assignedUser: { 
      icon: User, 
      label: 'Assigned User', 
      type: 'user_select', 
      required: false,
      category: 'hidden', // Hide from customizer but keep for modal
      description: 'Team member responsible for this ticket'
    },
    
    // Contact Fields
    contact: { 
      icon: User, 
      label: 'Contact', 
      type: 'contact_select', 
      required: true, 
      category: 'basic',
      description: 'Select customer/contact from database with company name, address, email, and phone'
    },
    
    // Date & Time Fields
    scheduled_date: { 
      icon: Calendar, 
      label: 'Scheduled Date', 
      type: 'datetime', 
      required: false, 
      category: 'scheduling',
      description: 'When the work is scheduled to start'
    },
    
    // Technical Fields
    

    
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
    

    

  };

  const fieldCategories = {
    basic: { label: 'Basic Information', icon: FileText, color: 'blue' },
    scheduling: { label: 'Dates & Scheduling', icon: Calendar, color: 'orange' },
    technical: { label: 'Technical Details', icon: Wrench, color: 'indigo' },
    media: { label: 'Files & Media', icon: Image, color: 'pink' }
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

  const updateCategoryOption = (fieldKey, index, value) => {
    const currentOptions = fieldConfigurations[fieldKey] || [];
    const newOptions = [...currentOptions];
    newOptions[index] = value;
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
    
    // Create a set of selected fields for efficient lookup
    const selectedSet = new Set(selectedFields);
    
    const templateData = {
      template: selectedFields.reduce((acc, field) => {
        acc[field] = true;
        return acc;
      }, {}),
      order: fieldOrder.filter(f => selectedSet.has(f)), // Remove disabled fields from order
      configurations: cleanedConfigurations
    };
    
    const success = saveTemplate(templateData);
    if (success) {
      console.log('Template saved successfully:', templateData);
    } else {
      console.error('Failed to save template');
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
                    <p>Preview mode - showing configured fields</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            // Edit Mode
            <Tabs defaultValue="fields" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="fields">Available Fields</TabsTrigger>
                <TabsTrigger value="configuration">Field Configuration</TabsTrigger>
                <TabsTrigger value="layout">Field Layout & Order</TabsTrigger>
              </TabsList>

              <TabsContent value="fields" className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Select Fields for Your Tickets</h3>
                    <Badge variant="outline">
                      {(() => {
                        const saved = loadTemplate();
                        return getRenderableFieldCount(saved.template, saved.order);
                      })()} renderable fields selected
                    </Badge>
                  </div>

                  {Object.entries(fieldCategories).map(([categoryKey, category]) => {
                    // Get fields for this category and sort them by fieldOrder
                    const categoryFields = Object.entries(availableFields)
                      .filter(([_, field]) => field.category === categoryKey)
                      .sort(([fieldKeyA], [fieldKeyB]) => {
                        const indexA = fieldOrder.indexOf(fieldKeyA);
                        const indexB = fieldOrder.indexOf(fieldKeyB);
                        
                        // If both fields are in fieldOrder, sort by their position
                        if (indexA !== -1 && indexB !== -1) {
                          return indexA - indexB;
                        }
                        
                        // If only one field is in fieldOrder, prioritize it
                        if (indexA !== -1) return -1;
                        if (indexB !== -1) return 1;
                        
                        // If neither is in fieldOrder, maintain original order
                        return 0;
                      });

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
                                  } else if (fieldKey === 'equipment_id') {
                                    if (!selectedFields.includes(fieldKey)) {
                                      // Add field first, then show modal
                                      setSelectedFields([...selectedFields, fieldKey]);
                                      setFieldOrder([...fieldOrder, fieldKey]);
                                      
                                      // Initialize equipment_id options if they don't exist
                                      if (!fieldConfigurations.equipment_id || fieldConfigurations.equipment_id.length === 0) {
                                        setFieldConfigurations(prev => ({
                                          ...prev,
                                          equipment_id: ['EQ-001', 'EQ-002', 'EQ-003']
                                        }));
                                      }
                                      
                                      setShowEquipmentIdModal(true);
                                    } else {
                                      // Remove field if already selected
                                      setSelectedFields(selectedFields.filter(f => f !== fieldKey));
                                      setFieldOrder(fieldOrder.filter(f => f !== fieldKey));
                                    }
                                  } else if (fieldKey === 'work_type') {
                                    if (!selectedFields.includes(fieldKey)) {
                                      // Add field first, then show modal
                                      setSelectedFields([...selectedFields, fieldKey]);
                                      setFieldOrder([...fieldOrder, fieldKey]);
                                      
                                      // Initialize work_type options if they don't exist
                                      if (!fieldConfigurations.work_type || fieldConfigurations.work_type.length === 0) {
                                        setFieldConfigurations(prev => ({
                                          ...prev,
                                          work_type: ['Maintenance', 'Repair', 'Installation', 'Inspection']
                                        }));
                                      }
                                      
                                      setShowWorkTypeModal(true);
                                    } else {
                                      // Remove field if already selected
                                      setSelectedFields(selectedFields.filter(f => f !== fieldKey));
                                      setFieldOrder(fieldOrder.filter(f => f !== fieldKey));
                                    }
                                  } else if (fieldKey === 'service_category') {
                                    if (!selectedFields.includes(fieldKey)) {
                                      // Add field first, then show modal
                                      setSelectedFields([...selectedFields, fieldKey]);
                                      setFieldOrder([...fieldOrder, fieldKey]);
                                      
                                      // Initialize service_category options if they don't exist
                                      if (!fieldConfigurations.service_category || fieldConfigurations.service_category.length === 0) {
                                        setFieldConfigurations(prev => ({
                                          ...prev,
                                          service_category: ['Standard', 'Premium', 'Emergency', 'Scheduled']
                                        }));
                                      }
                                      
                                      setShowServiceCategoryModal(true);
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
                </div>
              </TabsContent>

              <TabsContent value="configuration" className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Configure Field Options</h3>
                    <Badge variant="outline">
                      Configure dropdown options for selected fields
                    </Badge>
                  </div>

                  {/* Category Configuration */}
                  {selectedFields.includes('category') && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center">
                          <Tag className="w-5 h-5 mr-2 text-blue-600" />
                          Category Options
                        </CardTitle>
                        <CardDescription>
                          Configure the categories that will appear in the dropdown
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(fieldConfigurations.category || ['General', 'Technical', 'Maintenance', 'Support']).map((option, index) => (
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
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addCategoryOption('category')}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Category
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Equipment ID Configuration */}
                  {selectedFields.includes('equipment_id') && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center">
                          <Wrench className="w-5 h-5 mr-2 text-indigo-600" />
                          Equipment ID Options
                        </CardTitle>
                        <CardDescription>
                          Configure the equipment IDs that will appear in the dropdown
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(fieldConfigurations.equipment_id || ['EQ-001', 'EQ-002', 'EQ-003']).map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={option}
                              onChange={(e) => updateCategoryOption('equipment_id', index, e.target.value)}
                              placeholder="Enter equipment ID"
                              className="flex-1"
                            />
                            {(fieldConfigurations.equipment_id || ['EQ-001', 'EQ-002', 'EQ-003']).length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeCategoryOption('equipment_id', index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addCategoryOption('equipment_id')}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Equipment ID
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Work Type Configuration */}
                  {selectedFields.includes('work_type') && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center">
                          <Building className="w-5 h-5 mr-2 text-indigo-600" />
                          Work Type Options
                        </CardTitle>
                        <CardDescription>
                          Configure the work types that will appear in the dropdown
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(fieldConfigurations.work_type || ['Maintenance', 'Repair', 'Installation', 'Inspection']).map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={option}
                              onChange={(e) => updateCategoryOption('work_type', index, e.target.value)}
                              placeholder="Enter work type"
                              className="flex-1"
                            />
                            {(fieldConfigurations.work_type || ['Maintenance', 'Repair', 'Installation', 'Inspection']).length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeCategoryOption('work_type', index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addCategoryOption('work_type')}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Work Type
                        </Button>
                      </CardContent>
                    </Card>
                  )}



                  {/* Service Category Configuration */}
                  {selectedFields.includes('service_category') && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center">
                          <Star className="w-5 h-5 mr-2 text-yellow-600" />
                          Service Category Options
                        </CardTitle>
                        <CardDescription>
                          Configure the service categories that will appear in the dropdown
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(fieldConfigurations.service_category || ['Standard', 'Premium', 'Emergency', 'Scheduled']).map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={option}
                              onChange={(e) => updateCategoryOption('service_category', index, e.target.value)}
                              placeholder="Enter service category"
                              className="flex-1"
                            />
                            {(fieldConfigurations.service_category || ['Standard', 'Premium', 'Emergency', 'Scheduled']).length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeCategoryOption('service_category', index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addCategoryOption('service_category')}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Service Category
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {selectedFields.filter(field => ['category', 'equipment_id', 'work_type', 'service_category'].includes(field)).length === 0 && (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <Settings className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Configurable Fields Selected</h3>
                        <p className="text-gray-600">
                          Select Category, Equipment ID, Work Type, or Service Category fields from the Available Fields tab to configure their options here.
                        </p>
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
            {selectedFields.filter(fieldKey => availableFields[fieldKey]?.category !== 'hidden').length} fields selected • Form ready for use
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                if (confirm('Reset all field configurations to defaults? This will clear all customizations.')) {
                  localStorage.removeItem(STORAGE_KEY);
                  window.location.reload();
                }
              }}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Reset Fields
            </Button>
            <Button onClick={() => {
              handleSave();
              onClose();
            }} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Save Ticket Form
            </Button>
          </div>
        </div>
      </Card>

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

      {/* Equipment ID Configuration Modal */}
      {showEquipmentIdModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Wrench className="w-5 h-5 mr-2 text-indigo-600" />
                Configure Equipment IDs
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEquipmentIdModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Add your own equipment IDs that will appear as dropdown options when creating tickets.
            </p>
            
            <div className="space-y-3 mb-4">
              {(fieldConfigurations.equipment_id && fieldConfigurations.equipment_id.length > 0 
                ? fieldConfigurations.equipment_id 
                : ['EQ-001', 'EQ-002', 'EQ-003']
              ).map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option}
                    onChange={(e) => updateCategoryOption('equipment_id', index, e.target.value)}
                    placeholder="Enter equipment ID"
                    className="flex-1"
                  />
                  {(fieldConfigurations.equipment_id || ['EQ-001', 'EQ-002', 'EQ-003']).length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeCategoryOption('equipment_id', index)}
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
                onClick={() => addCategoryOption('equipment_id')}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Equipment ID
              </Button>
              <Button
                onClick={() => {
                  handleSave();
                  setShowEquipmentIdModal(false);
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                Save Equipment IDs
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Work Type Configuration Modal */}
      {showWorkTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Building className="w-5 h-5 mr-2 text-indigo-600" />
                Configure Work Types
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWorkTypeModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Add your own work types that will appear as dropdown options when creating tickets.
            </p>
            
            <div className="space-y-3 mb-4">
              {(fieldConfigurations.work_type && fieldConfigurations.work_type.length > 0 
                ? fieldConfigurations.work_type 
                : ['Maintenance', 'Repair', 'Installation', 'Inspection']
              ).map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option}
                    onChange={(e) => updateCategoryOption('work_type', index, e.target.value)}
                    placeholder="Enter work type"
                    className="flex-1"
                  />
                  {(fieldConfigurations.work_type || ['Maintenance', 'Repair', 'Installation', 'Inspection']).length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeCategoryOption('work_type', index)}
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
                onClick={() => addCategoryOption('work_type')}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Work Type
              </Button>
              <Button
                onClick={() => {
                  handleSave();
                  setShowWorkTypeModal(false);
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                Save Work Types
              </Button>
            </div>
          </div>
        </div>
      )}



      {/* Service Category Configuration Modal */}
      {showServiceCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Star className="w-5 h-5 mr-2 text-yellow-600" />
                Configure Service Categories
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowServiceCategoryModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Add your own service categories that will appear as dropdown options when creating tickets.
            </p>
            
            <div className="space-y-3 mb-4">
              {(fieldConfigurations.service_category && fieldConfigurations.service_category.length > 0 
                ? fieldConfigurations.service_category 
                : ['Standard', 'Premium', 'Emergency', 'Scheduled']
              ).map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option}
                    onChange={(e) => updateCategoryOption('service_category', index, e.target.value)}
                    placeholder="Enter service category"
                    className="flex-1"
                  />
                  {(fieldConfigurations.service_category || ['Standard', 'Premium', 'Emergency', 'Scheduled']).length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeCategoryOption('service_category', index)}
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
                onClick={() => addCategoryOption('service_category')}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Service Category
              </Button>
              <Button
                onClick={() => {
                  handleSave();
                  setShowServiceCategoryModal(false);
                }}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              >
                Save Service Categories
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketFieldCustomizer;
