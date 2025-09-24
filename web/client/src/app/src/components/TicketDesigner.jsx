import React, { useState } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { 
  X, 
  Save, 
  ArrowLeft,
  Check,
  User,
  Clock,
  MapPin,
  MessageSquare,
  FileText,
  Calendar,
  AlertTriangle,
  Tag,
  Settings,
  Mail,
  Timer,
  CheckCircle,
  Users,
  Paperclip
} from 'lucide-react';

// All available ticket elements
const TICKET_ELEMENTS = {
  // Basic Fields
  title: { 
    name: 'Title', 
    icon: FileText, 
    category: 'Basic Fields',
    required: true,
    description: 'Ticket title/subject'
  },
  description: { 
    name: 'Description', 
    icon: MessageSquare, 
    category: 'Basic Fields',
    required: true,
    description: 'Detailed ticket description'
  },
  
  // Classification
  priority: { 
    name: 'Priority', 
    icon: AlertTriangle, 
    category: 'Classification',
    description: 'Ticket priority level'
  },
  status: { 
    name: 'Status', 
    icon: Settings, 
    category: 'Classification',
    required: true,
    description: 'Current ticket status'
  },
  category: { 
    name: 'Category', 
    icon: Tag, 
    category: 'Classification',
    description: 'Ticket category/type'
  },
  
  // Assignment & Users
  assignedUser: { 
    name: 'Assigned User', 
    icon: User, 
    category: 'Assignment & Users',
    required: false, // NOT REQUIRED - should be optional
    description: 'Who is assigned to work on this ticket'
  },
  createdBy: { 
    name: 'Created By', 
    icon: User, 
    category: 'Assignment & Users',
    required: true,
    description: 'Who created the ticket'
  },
  
  // Location & Time
  location: { 
    name: 'Location', 
    icon: MapPin, 
    category: 'Location & Time',
    description: 'Physical location or address'
  },
  dueDate: { 
    name: 'Due Date', 
    icon: Calendar, 
    category: 'Location & Time',
    description: 'When the ticket should be completed'
  },
  
  // Communication
  comments: { 
    name: 'Comments', 
    icon: MessageSquare, 
    category: 'Communication',
    description: 'Timestamped comments and notes'
  },
  emailNotifications: { 
    name: 'Email Notifications', 
    icon: Mail, 
    category: 'Communication',
    description: 'Automatic email alerts'
  },
  
  // Attachments & Files
  fileAttachments: { 
    name: 'File Attachments', 
    icon: Paperclip, 
    category: 'Attachments & Files',
    description: 'Upload files, images, documents'
  },
  
  // Time Tracking
  timeTracking: { 
    name: 'Time Tracking', 
    icon: Timer, 
    category: 'Time Tracking',
    description: 'Start/stop work timer'
  },
  workSessions: { 
    name: 'Work Sessions', 
    icon: Clock, 
    category: 'Time Tracking',
    description: 'Record of work time sessions'
  },
  
  // Workflow & Actions
  quickActions: { 
    name: 'Quick Actions', 
    icon: CheckCircle, 
    category: 'Workflow & Actions',
    description: 'Start Work, Complete, etc.'
  },
  approvalSystem: { 
    name: 'Approval System', 
    icon: Users, 
    category: 'Workflow & Actions',
    description: 'Request approval workflow'
  },
  quickAssignment: { 
    name: 'Quick Assignment', 
    icon: User, 
    category: 'Workflow & Actions',
    description: 'One-click user assignment'
  }
};

// Default template with required fields
const DEFAULT_TEMPLATE = {
  title: true,
  description: true,
  status: true,
  createdBy: true
};

export default function TicketDesigner({ onClose, onSave }) {
  // Load saved template and order from localStorage
  const loadSavedData = () => {
    const savedTemplate = localStorage.getItem('worktrackr_ticket_template');
    const savedOrder = localStorage.getItem('worktrackr_ticket_template_order');
    
    if (savedTemplate && savedOrder) {
      return {
        template: JSON.parse(savedTemplate),
        order: JSON.parse(savedOrder)
      };
    }
    
    // Default template with required fields
    const defaultTemplate = { ...DEFAULT_TEMPLATE };
    const defaultOrder = Object.keys(defaultTemplate).filter(key => defaultTemplate[key]);
    
    return { template: defaultTemplate, order: defaultOrder };
  };

  const { template: initialTemplate, order: initialOrder } = loadSavedData();
  const [selectedElements, setSelectedElements] = useState(initialTemplate);
  const [elementOrder, setElementOrder] = useState(initialOrder);
  const [isSaving, setIsSaving] = useState(false);

  // Group elements by category
  const elementsByCategory = Object.entries(TICKET_ELEMENTS).reduce((acc, [key, element]) => {
    if (!acc[element.category]) {
      acc[element.category] = [];
    }
    acc[element.category].push({ key, ...element });
    return acc;
  }, {});

  // Toggle element in template with order tracking
  const toggleElement = (elementKey) => {
    const element = TICKET_ELEMENTS[elementKey];
    
    // Don't allow removing required elements
    if (element.required && selectedElements[elementKey]) {
      return;
    }
    
    setSelectedElements(prev => {
      const newSelected = {
        ...prev,
        [elementKey]: !prev[elementKey]
      };
      
      // Update order based on selection
      if (!prev[elementKey]) {
        // Adding element - add to end of order only if not already present
        setElementOrder(prevOrder => {
          if (!prevOrder.includes(elementKey)) {
            return [...prevOrder, elementKey];
          }
          return prevOrder;
        });
      } else {
        // Removing element - remove from order
        setElementOrder(prevOrder => prevOrder.filter(key => key !== elementKey));
      }
      
      return newSelected;
    });
  };

  // Save template and order
  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem('worktrackr_ticket_template', JSON.stringify(selectedElements));
    localStorage.setItem('worktrackr_ticket_template_order', JSON.stringify(elementOrder));
    
    setTimeout(() => {
      setIsSaving(false);
      if (onSave) onSave(selectedElements);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customize Your Ticket</h1>
          <p className="text-gray-600">Design your ticket template by selecting the elements you need</p>
        </div>
        <Button variant="ghost" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Element Library */}
        <div className="w-1/2 bg-gray-50 overflow-y-auto border-r">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Available Elements</h3>
            <p className="text-sm text-gray-600 mb-6">
              Click elements to add/remove them from your ticket template. Order matters - first clicked appears first.
            </p>
            
            {Object.entries(elementsByCategory).map(([categoryName, elements]) => (
              <div key={categoryName} className="mb-6">
                <h4 className="font-medium text-gray-700 mb-3 text-sm uppercase tracking-wide">
                  {categoryName}
                </h4>
                <div className="space-y-2">
                  {elements.map(({ key, name, icon: Icon, required, description }) => (
                    <button
                      key={key}
                      onClick={() => toggleElement(key)}
                      disabled={required && selectedElements[key]}
                      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                        selectedElements[key]
                          ? 'bg-blue-50 border-blue-200 text-blue-900'
                          : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      } ${required && selectedElements[key] ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${selectedElements[key] ? 'text-blue-600' : 'text-gray-400'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{name}</span>
                              {required && (
                                <Badge variant="secondary" className="text-xs">Required</Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{description}</p>
                          </div>
                        </div>
                        {selectedElements[key] && (
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-blue-600" />
                            <Badge variant="outline" className="text-xs">
                              #{elementOrder.indexOf(key) + 1}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Ticket Preview */}
        <div className="w-1/2 bg-white overflow-y-auto">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Ticket Template Preview</h3>
            <p className="text-sm text-gray-600 mb-6">
              This is how your ticket will look with the selected elements (in order of selection)
            </p>
            
            {/* Ticket Preview Card */}
            <Card className="border-2 border-dashed border-gray-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-gray-400">
                      Ticket Preview
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      #TKT-XXX • {elementOrder.filter(key => selectedElements[key]).length} fields selected
                    </CardDescription>
                  </div>
                  <X className="w-5 h-5 text-gray-300" />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Render elements in order */}
                {elementOrder.map((elementKey, index) => {
                  if (!selectedElements[elementKey]) return null;
                  
                  const element = TICKET_ELEMENTS[elementKey];
                  const Icon = element.icon;
                  
                  return (
                    <div key={elementKey} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600">
                              {element.name}
                            </span>
                            {element.required && (
                              <Badge variant="secondary" className="text-xs">Required</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {element.description}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs text-gray-500">
                        #{index + 1}
                      </Badge>
                    </div>
                  );
                })}
                
                {elementOrder.filter(key => selectedElements[key]).length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No elements selected</p>
                    <p className="text-xs">Click elements on the left to add them</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Template Summary */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Template Summary</h4>
              <div className="text-sm text-blue-700">
                <p className="mb-1">
                  <strong>{elementOrder.filter(key => selectedElements[key]).length}</strong> elements selected
                </p>
                <p className="text-xs">
                  Elements will appear in tickets in the order you select them
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="bg-white border-t p-4">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

