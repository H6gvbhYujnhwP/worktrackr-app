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
  Mail, 
  User, 
  Clock, 
  MapPin, 
  Calendar, 
  MessageSquare, 
  AlertTriangle, 
  ChevronRight, 
  Loader2,
  ListChecks,
  ClipboardList
} from 'lucide-react';

const TICKET_FIELD_STAGES = [
  { id: 'details', label: 'Details', icon: ClipboardList },
  { id: 'assignment', label: 'Assignment', icon: User },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'notes', label: 'Notes', icon: MessageSquare },
];

const DEFAULT_TEMPLATE = {
  fields: {
    title: true,
    description: true,
    priority: true,
    category: true,
    location: true,
    assignee: true,
    dueDate: true,
    comments: true
  },
  required: {
    title: true,
    description: false,
    priority: false,
    category: false,
    location: false,
    assignee: false,
    dueDate: false,
    comments: false
  },
  defaults: {
    priority: 'medium',
    category: '',
    location: '',
    assignee: '',
    dueDate: '',
    comments: ''
  },
  comments: true
};

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
];

const CATEGORIES = [
  'General', 'IT Support', 'Maintenance', 'Installation', 'Repair', 'Inspection'
];

const LOCATIONS = [
  'On-site', 'Remote', 'Workshop', 'Office'
];

const getSavedTemplate = () => {
  try {
    const saved = localStorage.getItem('ticket_creation_template');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          template: { ...DEFAULT_TEMPLATE, ...parsed },
          order: JSON.parse(localStorage.getItem('ticket_field_order') || '[]')
        };
      }
    }
  } catch (e) {
    console.error('Error reading saved template:', e);
  }
  return { template: DEFAULT_TEMPLATE, order: [] };
};

const saveTemplate = (template) => {
  try {
    localStorage.setItem('ticket_creation_template', JSON.stringify(template));
  } catch (e) {
    console.error('Error saving template:', e);
  }
};

const saveFieldOrder = (order) => {
  try {
    localStorage.setItem('ticket_field_order', JSON.stringify(order));
  } catch (e) {
    console.error('Error saving field order:', e);
  }
};

const PriorityBadge = ({ priority }) => {
  const p = PRIORITIES.find(p => p.value === priority);
  if (!p) return null;
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${p.color}`}>
      {p.label}
    </span>
  );
};

const FieldRow = ({ children }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
    {children}
  </div>
);

const SectionHeader = ({ icon: Icon, title, description }) => (
  <div className="flex items-start gap-3 mb-4">
    <div className="p-2 rounded-md bg-gray-100">
      <Icon className="w-4 h-4 text-gray-700" />
    </div>
    <div>
      <h4 className="text-sm font-medium">{title}</h4>
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
  </div>
);

export default function CreateTicketModal({ onClose, users, currentUser }) {
  const { createTicket, addComment, updateTicket } = useSimulation();
  const { template: savedTemplate, order: fieldOrder } = getSavedTemplate();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: '',
    location: '',
    assignedTo: '',
    dueDate: '',
    comments: ''
  });
  
  const [template, setTemplate] = useState(savedTemplate);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStage, setActiveStage] = useState('details');

  useEffect(() => {
    // Pre-fill defaults
    setFormData(prev => ({
      ...prev,
      priority: template.defaults.priority || 'medium',
      category: template.defaults.category || '',
      location: template.defaults.location || '',
      assignedTo: template.defaults.assignee || '',
      dueDate: template.defaults.dueDate || '',
      comments: template.defaults.comments || ''
    }));
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (template.required.title && !formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (template.required.description && !formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (template.required.assignee && !formData.assignedTo) {
      newErrors.assignedTo = 'Assignee is required';
    }
    if (template.required.dueDate && !formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
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
      // Simulate small UX delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const ticketData = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        category: formData.category,
        location: formData.location,
        createdBy: currentUser.id,
        assignedTo: formData.assignedTo || null,
        dueDate: formData.dueDate || null,
        status: formData.assignedTo ? 'assigned' : 'new'
      };
      
      // IMPORTANT: persist to backend and wait for the created ticket (with id)
      const newTicket = await createTicket(ticketData);
      
      // Add initial comment if provided
      if (template.comments && formData.comments.trim()) {
        addComment(newTicket.id, currentUser.id, formData.comments);
      }
      
      // Optional: notify assigned user via console (UI already shows assigned state)
      if (formData.assignedTo && Array.isArray(users)) {
        const assignedUser = users.find(u => u.id === formData.assignedTo);
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

  const handleChange = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const StageNav = () => (
    <div className="flex items-center gap-2 mb-6">
      {TICKET_FIELD_STAGES.map((s, idx) => {
        const Icon = s.icon;
        const isActive = activeStage === s.id;
        return (
          <React.Fragment key={s.id}>
            <button
              type="button"
              onClick={() => setActiveStage(s.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm border ${
                isActive ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {s.label}
            </button>
            {idx < TICKET_FIELD_STAGES.length - 1 && (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Create New Ticket</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <StageNav />

          {/* Details */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
              <CardDescription>Provide the basic information for this ticket</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldRow>
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={formData.title} onChange={handleChange('title')} placeholder="Short summary" />
                  {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => handleChange('priority')(v)}>
                    <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </FieldRow>

              <div className="mb-4">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={handleChange('description')} rows={4} placeholder="Describe the issue" />
                {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
              <CardDescription>Choose who will handle this ticket</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldRow>
                <div>
                  <Label htmlFor="assignee">Assignee</Label>
                  <Select value={formData.assignedTo} onValueChange={(v) => handleChange('assignedTo')(v)}>
                    <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {Array.isArray(users) && users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(v) => handleChange('category')(v)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </FieldRow>

              <FieldRow>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Select value={formData.location} onValueChange={(v) => handleChange('location')(v)}>
                    <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      {LOCATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input id="dueDate" type="date" value={formData.dueDate} onChange={handleChange('dueDate')} />
                </div>
              </FieldRow>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Optional comment to include on creation</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="comments">Initial Comment</Label>
                <Textarea id="comments" value={formData.comments} onChange={handleChange('comments')} rows={3} placeholder="Optional note for assignee or requester" />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="worktrackr-bg-black hover:bg-gray-800" disabled={isSubmitting}>
              {isSubmitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>) : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
