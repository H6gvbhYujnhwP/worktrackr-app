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
  AlertTriangle, 
  Tag, 
  FileText, 
  MessageSquare,
  Paperclip,
  Timer
} from 'lucide-react';
import { priorities, categories } from '../data/mockData.js';

// Load saved template from localStorage
const getSavedTemplate = () => {
  const saved = localStorage.getItem('worktrackr_ticket_template');
  if (saved) {
    const template = JSON.parse(saved);
    // Convert to ordered array based on selection order
    const templateOrder = localStorage.getItem('worktrackr_ticket_template_order');
    if (templateOrder) {
      const order = JSON.parse(templateOrder);
      return { template, order };
    }
    return { template, order: Object.keys(template).filter(key => template[key]) };
  }
  // Default template
  return {
    template: { title: true, description: true, status: true, createdBy: true },
    order: ['title', 'description', 'status', 'createdBy']
  };
};

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
    comments: '',
    fileAttachments: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

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

  const validateForm = () => {
    const newErrors = {};
    
    // Only validate fields that are in the template
    if (savedTemplate.title && !formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (savedTemplate.description && !formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (savedTemplate.category && !formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (formData.dueDate && new Date(formData.dueDate) < new Date()) {
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
        createdBy: currentUser.id,
        assignedTo: formData.assignedTo || null,
        dueDate: formData.dueDate || null,
        status: formData.assignedTo ? 'assigned' : 'new'
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Create New Ticket</CardTitle>
              <CardDescription>
                Fill out the form below to create a new support ticket
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Template-based fields in order */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Create New Ticket</h3>
                <Badge variant="secondary" className="text-xs">
                  Using saved template ({fieldOrder.filter(field => savedTemplate[field]).length} fields)
                </Badge>
              </div>
              
              {fieldOrder.map(fieldKey => {
                if (!savedTemplate[fieldKey]) return null;
                
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
                    return (
                      <div key={fieldKey}>
                        <Label className="flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Categories
                        </Label>
                        <div className="space-y-2">
                          {formData.categories.map((category, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                value={category}
                                onChange={(e) => {
                                  const newCategories = [...formData.categories];
                                  newCategories[index] = e.target.value;
                                  handleInputChange('categories', newCategories);
                                }}
                                placeholder="Enter category name"
                                className="flex-1"
                              />
                              {formData.categories.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newCategories = formData.categories.filter((_, i) => i !== index);
                                    handleInputChange('categories', newCategories);
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleInputChange('categories', [...formData.categories, '']);
                            }}
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Category
                          </Button>
                        </div>
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
                          Assign to User
                        </Label>
                        <Select value={formData.assignedTo || ""} onValueChange={(value) => handleInputChange('assignedTo', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select user (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Unassigned</SelectItem>
                            {users && Array.isArray(users) && users.length > 0 ? (
                              users.map(user => (
                                <SelectItem key={user.id} value={String(user.id)}>
                                  {user.name} ({user.role})
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="" disabled>No users available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
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
                        <div className="bg-gray-50 border rounded-lg p-3">
                          <p className="text-sm text-gray-600">Time tracking will be available after ticket creation</p>
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

