import React, { useState } from 'react';
import { useSimulation } from '../App.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { 
  X, 
  User, 
  Clock, 
  MapPin, 
  MessageSquare, 
  Send, 
  UserCheck, 
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Settings,
  ChevronDown,
  Mail,
  Calendar,
  Edit,
  Save,
  FileText,
  Tag,
  Wrench,
  Building,
  Star,
  Image,
  Paperclip
} from 'lucide-react';
import { ticketStatuses, priorities, categories } from '../data/mockData.js';
import { loadTemplate } from '../shared/template.js';
import ContactSelector from './ContactSelector.jsx';
import ContactCreationModal from './ContactCreationModal.jsx';

export default function TicketDetailModal({ ticket, users, currentUser, onClose }) {
  console.log('TicketDetailModal rendering with:', { ticket, users, currentUser });
  
  // Early return with error handling
  if (!ticket) {
    console.error('No ticket provided to TicketDetailModal');
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold mb-2">Error Loading Ticket</h3>
          <p className="text-gray-600 mb-4">No ticket data provided.</p>
          <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded">Close</button>
        </div>
      </div>
    );
  }
  
  if (!users || !Array.isArray(users)) {
    console.error('Missing or invalid users array in TicketDetailModal:', users);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold mb-2">Error Loading Users</h3>
          <p className="text-gray-600 mb-4">User data not available.</p>
          <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded">Close</button>
        </div>
      </div>
    );
  }
  
  if (!currentUser) {
    console.error('Missing currentUser in TicketDetailModal');
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold mb-2">Error Loading Current User</h3>
          <p className="text-gray-600 mb-4">Current user data not available.</p>
          <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded">Close</button>
        </div>
      </div>
    );
  }
  
  // Safely get simulation functions
  let updateTicket, passTicket, addComment, requestApproval, processApproval;
  try {
    const simulation = useSimulation();
    updateTicket = simulation.updateTicket;
    passTicket = simulation.passTicket;
    addComment = simulation.addComment;
    requestApproval = simulation.requestApproval;
    processApproval = simulation.processApproval;
  } catch (error) {
    console.error('Error accessing useSimulation:', error);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold mb-2">Error Loading Simulation</h3>
          <p className="text-gray-600 mb-4">Unable to access simulation functions.</p>
          <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded">Close</button>
        </div>
      </div>
    );
  }
  
  // Load template configuration to show all active fields
  const { template: savedTemplate, order: fieldOrder, configurations: fieldConfigurations } = loadTemplate();
  
  const [newComment, setNewComment] = useState('');
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [showApprovalDropdown, setShowApprovalDropdown] = useState(false);
  const [selectedApprovers, setSelectedApprovers] = useState([]);
  const [approvalReason, setApprovalReason] = useState('');
  const [passToUser, setPassToUser] = useState('');
  const [passReason, setPassReason] = useState('');
  const [showPassForm, setShowPassForm] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [buttonStates, setButtonStates] = useState({});
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    notes: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedTicket, setEditedTicket] = useState({
    title: ticket?.title || '',
    description: ticket?.description || '',
    status: ticket?.status || 'new',
    priority: ticket?.priority || 'medium',
    category: ticket?.category || '',
    dueDate: ticket?.dueDate || '',
    assignedTo: ticket?.assignedTo || null
  });
  const [editingField, setEditingField] = useState(null); // Track which field is being edited
  const [tempValue, setTempValue] = useState(''); // Temporary value for inline editing
  const [showContactCreationModal, setShowContactCreationModal] = useState(false);
  const [contactCreationInitialName, setContactCreationInitialName] = useState('');

  // Dynamic field renderer for Details tab
  const renderDetailField = (fieldKey, value) => {
    const getFieldIcon = (fieldKey) => {
      const iconMap = {
        title: FileText,
        description: FileText,
        contact: User,
        priority: AlertTriangle,
        status: CheckCircle,
        category: Tag,
        equipment_id: Wrench,
        work_type: Building,
        service_category: Star,
        scheduled_date: Calendar,
        photos: Image,
        attachments: Paperclip
      };
      return iconMap[fieldKey] || FileText;
    };

    const getFieldLabel = (fieldKey) => {
      const labelMap = {
        title: 'Title',
        description: 'Description',
        contact: 'Contact',
        priority: 'Priority',
        status: 'Status',
        category: 'Category',
        equipment_id: 'Equipment ID',
        work_type: 'Work Type',
        service_category: 'Service Category',
        scheduled_date: 'Scheduled Date',
        photos: 'Photos/Images',
        attachments: 'Attachments'
      };
      return labelMap[fieldKey] || fieldKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const IconComponent = getFieldIcon(fieldKey);
    const label = getFieldLabel(fieldKey);

    try {
      switch (fieldKey) {
        case 'title':
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 text-lg font-medium text-gray-900 mb-2">
                <IconComponent className="w-5 h-5" />
                {label}
              </Label>
              {editingField === 'title' ? (
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveField('title', tempValue);
                      if (e.key === 'Escape') cancelEditing();
                    }}
                    autoFocus
                    className="flex-1"
                  />
                  <Button size="sm" onClick={() => saveField('title', tempValue)}>
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEditing}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <p 
                  className="text-gray-700 mt-1 cursor-pointer hover:bg-gray-50 p-2 rounded border-2 border-transparent hover:border-gray-200"
                  onClick={() => startEditing('title', ticket.title)}
                >
                  {value || 'No title'}
                </p>
              )}
            </div>
          );

        case 'description':
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 text-lg font-medium text-gray-900 mb-2">
                <IconComponent className="w-5 h-5" />
                {label}
              </Label>
              {editingField === 'description' ? (
                <div className="space-y-2 mt-1">
                  <Textarea
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') cancelEditing();
                    }}
                    autoFocus
                    rows={3}
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => saveField('description', tempValue)}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEditing}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p 
                  className="text-gray-700 mt-1 cursor-pointer hover:bg-gray-50 p-2 rounded border-2 border-transparent hover:border-gray-200 min-h-[60px]"
                  onClick={() => startEditing('description', ticket.description)}
                >
                  {value || 'No description'}
                </p>
              )}
            </div>
          );

        case 'priority':
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 font-medium text-gray-900 mb-2">
                <IconComponent className="w-4 h-4" />
                {label}
              </Label>
              <div className="mt-1">
                <Select value={value || 'medium'} onValueChange={(newValue) => saveField('priority', newValue)}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          );

        case 'status':
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 font-medium text-gray-900 mb-2">
                <IconComponent className="w-4 h-4" />
                {label}
              </Label>
              <div className="mt-1">
                <Select value={value || 'new'} onValueChange={(newValue) => saveField('status', newValue)}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="parked">Parked</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          );

        case 'assignedUser':
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 font-medium text-gray-900 mb-2">
                <IconComponent className="w-4 h-4" />
                Assigned User
              </Label>
              <div className="mt-1">
                <Select 
                  value={ticket.assignedTo?.toString() || 'unassigned'} 
                  onValueChange={(selectedValue) => {
                    const userId = selectedValue === 'unassigned' ? null : parseInt(selectedValue);
                    const userName = userId ? users.find(u => u.id === userId)?.name : '';
                    saveField('assignedTo', userId);
                    saveField('assignedUser', userName);
                  }}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Select user to assign ticket">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>
                          {ticket.assignedTo ? users.find(u => u.id == ticket.assignedTo)?.name || `Unknown (ID: ${ticket.assignedTo})` : 'Unassigned'}
                        </span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );

        case 'category':
        case 'equipment_id':
        case 'work_type':
        case 'service_category':
          const options = fieldConfigurations?.[fieldKey] || [];
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 font-medium text-gray-900 mb-2">
                <IconComponent className="w-4 h-4" />
                {label}
              </Label>
              <div className="mt-1">
                <Select value={value || ''} onValueChange={(newValue) => saveField(fieldKey, newValue)}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.filter(opt => opt && opt.trim()).map((option, index) => (
                      <SelectItem key={index} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );

        case 'contact':
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 font-medium text-gray-900 mb-2">
                <IconComponent className="w-4 h-4" />
                {label}
              </Label>
              <div className="mt-1">
                {ticket.contactDetails ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="font-medium">{ticket.contactDetails.companyName}</div>
                      <div className="text-gray-600">{ticket.contactDetails.fullAddress}</div>
                      <div className="text-gray-600">{ticket.contactDetails.email}</div>
                      <div className="text-gray-600">{ticket.contactDetails.phone}</div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        // Clear contact and allow selection of new one
                        saveField('contact', '');
                        saveField('contactDetails', null);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Change Contact
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-500 italic">No contact selected</p>
                    <ContactSelector
                      selectedContactId={ticket.contact}
                      onContactSelect={(contact) => {
                        if (contact) {
                          saveField('contact', contact.id);
                          saveField('contactDetails', {
                            companyName: contact.name,
                            fullAddress: contact.addresses?.[0]?.fullAddress || 'No address available',
                            email: contact.email,
                            phone: contact.phone
                          });
                        }
                      }}
                      onCreateNew={(searchTerm) => {
                        console.log('[TicketDetailModal] onCreateNew called with searchTerm:', searchTerm);
                        setContactCreationInitialName(searchTerm || '');
                        setShowContactCreationModal(true);
                        console.log('[TicketDetailModal] Set showContactCreationModal to true');
                      }}
                      placeholder="Select or search for a contact..."
                    />
                  </div>
                )}
              </div>
            </div>
          );

        case 'scheduled_date':
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 font-medium text-gray-900 mb-2">
                <IconComponent className="w-4 h-4" />
                {label}
              </Label>
              <div className="mt-1">
                <Input
                  type="datetime-local"
                  value={value ? (value.includes('T') ? value.substring(0, 16) : value + 'T09:00') : ''}
                  onChange={(e) => saveField(fieldKey, e.target.value)}
                  className="cursor-pointer"
                  placeholder="Select date and time"
                />
              </div>
            </div>
          );

        case 'photos':
        case 'attachments':
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 font-medium text-gray-900 mb-2">
                <IconComponent className="w-4 h-4" />
                {label}
              </Label>
              <div className="mt-1">
                {value && Array.isArray(value) && value.length > 0 ? (
                  <div className="text-sm text-gray-600">
                    {value.length} file(s) attached
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No {label.toLowerCase()} attached</p>
                )}
              </div>
            </div>
          );

        default:
          return (
            <div key={fieldKey}>
              <Label className="flex items-center gap-2 font-medium text-gray-900 mb-2">
                <IconComponent className="w-4 h-4" />
                {label}
              </Label>
              <div className="mt-1">
                <p className="text-gray-700 p-2 bg-gray-50 rounded">
                  {value || `No ${label.toLowerCase()}`}
                </p>
              </div>
            </div>
          );
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

  // Button visual feedback helper
  const handleButtonClick = (buttonId, action) => {
    // Set button as active for visual feedback
    setButtonStates(prev => ({ ...prev, [buttonId]: 'active' }));
    
    // Execute the action
    action();
    
    // Reset button state after animation
    setTimeout(() => {
      setButtonStates(prev => ({ ...prev, [buttonId]: 'success' }));
      setTimeout(() => {
        setButtonStates(prev => ({ ...prev, [buttonId]: null }));
      }, 1000);
    }, 200);
  };

  // Enhanced button handlers with proper functionality
  const handleStartWork = () => {
    console.log('Starting work on ticket:', ticket.id);
    
    const updates = {
      status: 'in_progress',
      workStarted: true,
      workStartedBy: currentUser.id,
      workStartTime: new Date().toISOString(),
      assignedTo: currentUser.id
    };
    
    updateTicket(ticket.id, updates);
    
    // Show success feedback
    console.log('Work started successfully');
  };

  const handleStopWork = () => {
    console.log('Stopping work on ticket:', ticket.id);
    
    const updates = {
      workStopped: true,
      workStoppedBy: currentUser.id,
      workStopTime: new Date().toISOString()
    };
    
    updateTicket(ticket.id, updates);
    
    // Show success feedback
    console.log('Work stopped successfully');
  };

  const handleMarkComplete = () => {
    console.log('Marking ticket complete:', ticket.id);
    
    const updates = {
      status: 'completed',
      completedAt: new Date().toISOString(),
      completedBy: currentUser.id
    };
    
    updateTicket(ticket.id, updates);
    
    // Show success feedback
    console.log('Ticket marked as complete');
  };

  const handleRequestApproval = (approverIds) => {
    console.log('Requesting approval from:', approverIds);
    
    if (approverIds && approverIds.length > 0) {
      const updates = {
        status: 'waiting_approval',
        approvalRequested: true,
        approvalRequestedBy: currentUser.id,
        approvalRequestedAt: new Date().toISOString(),
        pendingApprovers: approverIds
      };
      
      updateTicket(ticket.id, updates);
      
      // Send approval request emails
      approverIds.forEach(approverId => {
        const approver = users.find(u => u.id === approverId);
        if (approver) {
          console.log(`Sending approval request email to ${approver.name}`);
        }
      });
      
      setShowApprovalDropdown(false);
      setSelectedApprovers([]);
    }
  };

  const handleAssignmentChange = (userId) => {
    console.log('Assigning ticket to user:', userId);
    
    const updates = {
      assignedTo: userId,
      status: userId ? 'assigned' : 'new',
      workflowStage: userId ? 'assigned' : 'awaiting_assignment',
      assignedAt: userId ? new Date().toISOString() : null,
      assignedBy: currentUser.id
    };
    
    updateTicket(ticket.id, updates);
    
    // Send assignment email
    if (userId) {
      const assignedUser = users.find(u => u.id === userId);
      if (assignedUser && assignedUser.emailNotifications !== false) {
        console.log(`Email notification sent to ${assignedUser.name} (${assignedUser.email}): New ticket assigned - ${ticket.title}`);
        // In a real app, this would trigger an actual email service
      }
    }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      console.log('Adding comment:', newComment);
      
      // Call addComment with correct parameters: ticketId, authorId, content
      addComment(ticket.id, currentUser.id, newComment.trim());
      setNewComment('');
      
      console.log('Comment added successfully');
    }
  };

  // Handle scheduling work for the ticket
  const handleScheduleWork = () => {
    if (!scheduleData.date || !scheduleData.startTime || !scheduleData.endTime) {
      return;
    }

    const updates = {
      scheduledWork: [
        ...(ticket.scheduledWork || []),
        {
          date: scheduleData.date,
          startTime: scheduleData.startTime,
          endTime: scheduleData.endTime,
          notes: scheduleData.notes,
          scheduledBy: currentUser.id,
          scheduledAt: new Date().toISOString()
        }
      ]
    };

    updateTicket(ticket.id, updates);
    setShowScheduleModal(false);
    setScheduleData({ date: '', startTime: '', endTime: '', notes: '' });
    
    console.log('Work scheduled successfully');
  };

  // Handle saving edited ticket
  const handleSaveEdit = () => {
    updateTicket(ticket.id, editedTicket);
    setIsEditing(false);
    console.log('Ticket updated successfully');
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditedTicket({
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      dueDate: ticket.dueDate || '',
      assignedTo: ticket.assignedTo
    });
    setIsEditing(false);
  };

  // Handle inline field editing
  const startEditing = (field, currentValue) => {
    setEditingField(field);
    setTempValue(currentValue || '');
  };

  const saveField = (field, value) => {
    if (field === 'assignedTo') {
      // Use the dedicated assignment handler for proper workflow updates
      handleAssignmentChange(value);
    } else {
      const updates = { [field]: value };
      updateTicket(ticket.id, updates);
      
      // If scheduled_date is being updated, sync with booking calendar
      if (field === 'scheduled_date') {
        // Import the sync function dynamically to avoid circular dependencies
        import('../utils/ticketToBookingConverter.js').then(({ updateTicketBooking }) => {
          const updatedTicket = { ...ticket, [field]: value };
          updateTicketBooking(updatedTicket);
        }).catch(error => {
          console.error('Error syncing ticket to booking calendar:', error);
        });
      }
    }
    setEditingField(null);
    setTempValue('');
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempValue('');
  };

  // Get button style based on state
  const getButtonStyle = (buttonId, baseStyle = '') => {
    const state = buttonStates[buttonId];
    let stateStyle = '';
    
    switch (state) {
      case 'active':
        stateStyle = 'transform scale-95 bg-blue-600 text-white';
        break;
      case 'success':
        stateStyle = 'bg-green-500 text-white';
        break;
      default:
        stateStyle = 'hover:bg-gray-100 hover:scale-105';
    }
    
    return `${baseStyle} ${stateStyle} transition-all duration-200 ease-in-out`;
  };

  // Get assignment button style
  const getAssignmentButtonStyle = (userId) => {
    const isAssigned = ticket.assignedTo === userId;
    const state = buttonStates[`assign-${userId}`];
    
    let baseStyle = 'w-full p-3 rounded-lg border text-left flex items-center gap-2 transition-all duration-200';
    
    if (isAssigned) {
      baseStyle += ' bg-black text-white border-black';
    } else {
      baseStyle += ' bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:scale-105';
    }
    
    if (state === 'active') {
      baseStyle += ' transform scale-95';
    }
    
    return baseStyle;
  };

  // Calculate work time
  const calculateWorkTime = () => {
    if (!ticket.workSessions || ticket.workSessions.length === 0) {
      return 'No time recorded';
    }
    
    const totalMinutes = ticket.workSessions.reduce((total, session) => {
      return total + (session.duration || 0);
    }, 0);
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours}h ${minutes}m`;
  };

  // Get work status
  const getWorkStatus = () => {
    if (ticket.currentWorkSession) {
      const startTime = new Date(ticket.currentWorkSession.startTime);
      const now = new Date();
      const elapsed = Math.floor((now - startTime) / 1000 / 60); // minutes
      return `Currently working (started ${elapsed}m ago)`;
    }
    
    if (ticket.workSessions && ticket.workSessions.length > 0) {
      return `Work completed - Total time: ${calculateWorkTime()}`;
    }
    
    return 'Work not started';
  };

  // Admin/Manager users for approval dropdown
  const approvalUsers = users ? users.filter(user => 
    user.role === 'admin' || user.role === 'manager'
  ) : [];

  // Wrap the main component in error boundary
  try {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{ticket?.title || 'Untitled Ticket'}</h2>
              <p className="text-sm text-gray-500">#{ticket?.id || 'N/A'} • Created {ticket?.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'Unknown'}</p>
            </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 p-4 border-b">
          <Badge variant={ticket.status === 'new' ? 'default' : 'secondary'}>
            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).replace('_', ' ')}
          </Badge>
          <Badge variant={ticket.priority === 'high' ? 'destructive' : ticket.priority === 'medium' ? 'default' : 'secondary'}>
            {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
          </Badge>
          <Badge variant="outline">{ticket.category}</Badge>
        </div>

        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'details'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'comments'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Comments
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'actions'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Actions
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Dynamic Fields based on Template Configuration */}
              {fieldOrder.map(fieldKey => {
                if (!savedTemplate[fieldKey]) return null;
                return renderDetailField(fieldKey, ticket[fieldKey]);
              })}
              
              {/* Always show system fields */}
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">System Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="font-medium text-gray-900 mb-2">Assigned to</Label>
                      <div className="mt-1">
                        <Select 
                          value={ticket.assignedTo?.toString() || 'unassigned'} 
                          onValueChange={(value) => {
                            const userId = value === 'unassigned' ? null : parseInt(value);
                            const userName = userId ? users.find(u => u.id === userId)?.name : '';
                            saveField('assignedTo', userId);
                            saveField('assignedUser', userName);
                          }}
                        >
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder="Click to assign user">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span>
                                  {ticket.assignedTo ? users.find(u => u.id == ticket.assignedTo)?.name || `Unknown (ID: ${ticket.assignedTo})` : 'Unassigned'}
                                </span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.map(user => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name} ({user.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="font-medium text-gray-900 mb-2">Due Date</Label>
                      <div className="mt-1">
                        <Input
                          type="datetime-local"
                          value={ticket.dueDate ? (ticket.dueDate.includes('T') ? ticket.dueDate.substring(0, 16) : ticket.dueDate + 'T09:00') : ''}
                          onChange={(e) => saveField('dueDate', e.target.value)}
                          className="cursor-pointer"
                          placeholder="Click to set due date and time"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="font-medium text-gray-900 mb-2">Created by</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">
                          {users.find(u => u.id === ticket.createdBy)?.name || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label className="font-medium text-gray-900 mb-2">Timeline</Label>
                      <div className="space-y-1 mt-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-600">Created:</span>
                          <span className="text-xs">
                            {new Date(ticket.createdAt).toLocaleDateString()}, {new Date(ticket.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-600">Updated:</span>
                          <span className="text-xs">
                            {new Date(ticket.updatedAt).toLocaleDateString()}, {new Date(ticket.updatedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Commenting as {currentUser.name}</span>
                </div>
                <Textarea
                  placeholder="Write your comment here..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="mb-3"
                />
                <Button
                  onClick={() => handleButtonClick('add-comment', handleAddComment)}
                  className={getButtonStyle('add-comment', 'bg-gray-900 text-white hover:bg-gray-800')}
                  disabled={!newComment.trim()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Add Comment
                </Button>
              </div>

              <div className="space-y-3">
                {ticket.comments && ticket.comments.length > 0 ? (
                  ticket.comments.map((comment) => (
                    <div key={comment.id} className="bg-white border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-sm">{comment.authorName || comment.author}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleDateString()} at {new Date(comment.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-700">{comment.content || comment.text}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No comments yet. Be the first to add a comment!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                  <CardDescription>Common ticket operations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button
                      onClick={() => handleButtonClick('schedule-work', () => setShowScheduleModal(true))}
                      className={getButtonStyle('schedule-work', 'bg-gray-900 text-white hover:bg-gray-800')}
                      data-action="schedule-work"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Work
                    </Button>
                    
                    {!ticket.currentWorkSession ? (
                      <Button
                        onClick={() => handleButtonClick('start-work', handleStartWork)}
                        className={getButtonStyle('start-work', 'bg-gray-900 text-white hover:bg-gray-800')}
                        data-action="start-work"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Start Work
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleButtonClick('stop-work', handleStopWork)}
                        className={getButtonStyle('stop-work', 'bg-gray-900 text-white hover:bg-gray-800')}
                        data-action="stop-work"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Stop Work
                      </Button>
                    )}

                    <div className="relative">
                      <Button
                        onClick={() => setShowApprovalDropdown(!showApprovalDropdown)}
                        className={getButtonStyle('request-approval', 'bg-gray-900 text-white hover:bg-gray-800')}
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Request Approval
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                      
                      {showApprovalDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-full bg-white border rounded-lg shadow-lg z-10">
                          <div className="p-3">
                            <p className="text-sm font-medium mb-2">Select approvers:</p>
                            {approvalUsers && approvalUsers.length > 0 ? approvalUsers.map(user => (
                              <label key={user.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedApprovers.includes(user.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedApprovers(prev => [...prev, user.id]);
                                    } else {
                                      setSelectedApprovers(prev => prev.filter(id => id !== user.id));
                                    }
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm">{user.name} ({user.role})</span>
                              </label>
                            )) : (
                              <p className="text-sm text-gray-500 p-2">No admin or manager users available</p>
                            )}
                            <div className="flex gap-2 mt-3">
                              <Button
                                onClick={() => handleButtonClick('send-approval', () => handleRequestApproval(selectedApprovers))}
                                className={getButtonStyle('send-approval', 'bg-gray-900 text-white hover:bg-gray-800')}
                                disabled={selectedApprovers.length === 0}
                                size="sm"
                              >
                                Send Request
                              </Button>
                              <Button
                                onClick={() => {
                                  setShowApprovalDropdown(false);
                                  setSelectedApprovers([]);
                                }}
                                variant="outline"
                                size="sm"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => handleButtonClick('mark-complete', handleMarkComplete)}
                      className={getButtonStyle('mark-complete', 'bg-gray-900 text-white hover:bg-gray-800')}
                      disabled={ticket.status === 'completed'}
                      data-action="mark-complete"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Complete
                    </Button>
                  </div>

                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Work Time Tracking</h4>
                    <p className="text-sm text-gray-600">{getWorkStatus()}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Assignment</CardTitle>
                  <CardDescription>Assign to team members</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {users.map(user => (
                      <button
                        key={user.id}
                        onClick={() => handleButtonClick(`assign-${user.id}`, () => handleAssignmentChange(user.id))}
                        className={getAssignmentButtonStyle(user.id)}
                        data-user-id={user.id}
                      >
                        <User className="w-4 h-4" />
                        <span>{user.name} ({user.role})</span>
                        {ticket.assignedTo === user.id && (
                          <CheckCircle className="w-4 h-4 ml-auto text-white" />
                        )}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => handleButtonClick('unassign', () => handleAssignmentChange(null))}
                      className={getButtonStyle('unassign', 'w-full p-3 rounded-lg border border-gray-200 text-left flex items-center gap-2 bg-white text-gray-700 hover:bg-gray-50')}
                    >
                      <X className="w-4 h-4" />
                      <span>Unassign Ticket</span>
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <Mail className="w-4 h-4" />
                <AlertDescription>
                  Email notifications are automatically sent when tickets are assigned, passed, or require approval. 
                  Check the email log in the main dashboard to see all notifications.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Work Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Schedule Work: {ticket.title}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowScheduleModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={scheduleData.date}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={scheduleData.startTime}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={scheduleData.endTime}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>
              
              <div>
                <Label>Notes (Optional)</Label>
                <Input
                  value={scheduleData.notes}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any notes about this work session"
                />
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button onClick={handleScheduleWork} className="flex-1">
                  Schedule Work
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contact Creation Modal */}
      {console.log('[TicketDetailModal] Rendering ContactCreationModal with isOpen:', showContactCreationModal)}
      <ContactCreationModal
        isOpen={showContactCreationModal}
        onClose={() => {
          console.log('[TicketDetailModal] ContactCreationModal onClose called');
          setShowContactCreationModal(false);
          setContactCreationInitialName('');
        }}
        onContactCreated={(newContact) => {
          console.log('[TicketDetailModal] Contact created:', newContact);
          // Update the ticket with the new contact
          saveField('contact', newContact.id);
          saveField('contactDetails', {
            companyName: newContact.name,
            fullAddress: newContact.addresses?.[0]?.fullAddress || 'No address available',
            email: newContact.email,
            phone: newContact.phone
          });
          // Close the modal
          setShowContactCreationModal(false);
          setContactCreationInitialName('');
        }}
        initialName={contactCreationInitialName}
      />
    </div>
  );
  
  } catch (error) {
    console.error('Error in TicketDetailModal:', error);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold mb-2">Error Loading Ticket</h3>
          <p className="text-gray-600 mb-4">There was an error displaying the ticket details. Please try again.</p>
          <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded">Close</button>
        </div>
      </div>
    );
  }
}

