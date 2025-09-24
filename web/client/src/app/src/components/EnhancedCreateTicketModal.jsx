import React, { useState } from 'react';
import { X, Upload, MapPin, User, Calendar, Clock, DollarSign, Star, AlertTriangle, FileText, Image, Paperclip, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Badge } from '@/components/ui/badge.jsx';

const EnhancedCreateTicketModal = ({ isOpen, onClose, onCreateTicket, users }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    assignee: '',
    job_location: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    due_date: '',
    estimated_hours: '',
    work_type: '',
    service_category: '',
    estimated_cost: '',
    equipment_id: '',
    urgency_rating: 3,
    internal_notes: '',
    photos: [],
    attachments: []
  });

  const [uploadedFiles, setUploadedFiles] = useState({
    photos: [],
    attachments: []
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (type, files) => {
    const fileArray = Array.from(files);
    setUploadedFiles(prev => ({
      ...prev,
      [type]: [...prev[type], ...fileArray]
    }));
  };

  const removeFile = (type, index) => {
    setUploadedFiles(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newTicket = {
      id: `TKT-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      ...formData,
      status: 'New',
      created_date: new Date().toISOString().split('T')[0],
      photos: uploadedFiles.photos.map(file => file.name),
      attachments: uploadedFiles.attachments.map(file => file.name),
      reporter: 'Current User'
    };

    onCreateTicket(newTicket);
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      priority: 'Medium',
      assignee: '',
      job_location: '',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      due_date: '',
      estimated_hours: '',
      work_type: '',
      service_category: '',
      estimated_cost: '',
      equipment_id: '',
      urgency_rating: 3,
      internal_notes: '',
      photos: [],
      attachments: []
    });
    setUploadedFiles({ photos: [], attachments: [] });
    onClose();
  };

  const renderStarRating = () => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-6 h-6 cursor-pointer ${
              star <= formData.urgency_rating 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300'
            }`}
            onClick={() => handleInputChange('urgency_rating', star)}
          />
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[95vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Create New Ticket
              </CardTitle>
              <CardDescription>
                Fill in the details for your new work request or service ticket
              </CardDescription>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Basic Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-blue-600" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Ticket Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Brief description of the issue or request"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Detailed description of what needs to be done"
                      rows="4"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority Level</Label>
                      <select
                        id="priority"
                        value={formData.priority}
                        onChange={(e) => handleInputChange('priority', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="assignee">Assign To</Label>
                      <select
                        id="assignee"
                        value={formData.assignee}
                        onChange={(e) => handleInputChange('assignee', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Unassigned</option>
                        {users?.map(user => (
                          <option key={user.id} value={user.name}>{user.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="urgency_rating">Urgency Rating</Label>
                    <div className="mt-1">
                      {renderStarRating()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location & Customer Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-red-600" />
                    Location & Customer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="job_location">Job Location</Label>
                    <Input
                      id="job_location"
                      value={formData.job_location}
                      onChange={(e) => handleInputChange('job_location', e.target.value)}
                      placeholder="Building A - Room 101"
                    />
                  </div>

                  <div>
                    <Label htmlFor="customer_name">Customer Name</Label>
                    <Input
                      id="customer_name"
                      value={formData.customer_name}
                      onChange={(e) => handleInputChange('customer_name', e.target.value)}
                      placeholder="Customer or client name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="customer_email">Customer Email</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => handleInputChange('customer_email', e.target.value)}
                      placeholder="customer@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="customer_phone">Customer Phone</Label>
                    <Input
                      id="customer_phone"
                      type="tel"
                      value={formData.customer_phone}
                      onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                      placeholder="+44 7700 900123"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Technical & Scheduling */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-orange-600" />
                    Technical & Scheduling
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="work_type">Work Type</Label>
                      <select
                        id="work_type"
                        value={formData.work_type}
                        onChange={(e) => handleInputChange('work_type', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Type</option>
                        <option value="Repair">Repair</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Installation">Installation</option>
                        <option value="Inspection">Inspection</option>
                        <option value="Emergency">Emergency</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="service_category">Service Category</Label>
                      <select
                        id="service_category"
                        value={formData.service_category}
                        onChange={(e) => handleInputChange('service_category', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Category</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Plumbing">Plumbing</option>
                        <option value="HVAC">HVAC</option>
                        <option value="General Maintenance">General Maintenance</option>
                        <option value="IT Support">IT Support</option>
                        <option value="Security">Security</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="equipment_id">Equipment ID</Label>
                    <Input
                      id="equipment_id"
                      value={formData.equipment_id}
                      onChange={(e) => handleInputChange('equipment_id', e.target.value)}
                      placeholder="AC-001, PUMP-B2, etc."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="due_date">Due Date</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => handleInputChange('due_date', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="estimated_hours">Estimated Hours</Label>
                      <Input
                        id="estimated_hours"
                        type="number"
                        step="0.5"
                        value={formData.estimated_hours}
                        onChange={(e) => handleInputChange('estimated_hours', e.target.value)}
                        placeholder="2.5"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial & Files */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                    Financial & Files
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="estimated_cost">Estimated Cost (£)</Label>
                    <Input
                      id="estimated_cost"
                      type="number"
                      step="0.01"
                      value={formData.estimated_cost}
                      onChange={(e) => handleInputChange('estimated_cost', e.target.value)}
                      placeholder="150.00"
                    />
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <Label>Photos/Images</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleFileUpload('photos', e.target.files)}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label htmlFor="photo-upload" className="cursor-pointer">
                        <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to upload photos</p>
                        <p className="text-xs text-gray-500">PNG, JPG up to 10MB each</p>
                      </label>
                    </div>
                    {uploadedFiles.photos.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {uploadedFiles.photos.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile('photos', index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* File Attachments */}
                  <div>
                    <Label>File Attachments</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <input
                        type="file"
                        multiple
                        onChange={(e) => handleFileUpload('attachments', e.target.files)}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to upload files</p>
                        <p className="text-xs text-gray-500">PDF, DOC, XLS up to 25MB each</p>
                      </label>
                    </div>
                    {uploadedFiles.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {uploadedFiles.attachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile('attachments', index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-gray-600" />
                    Additional Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="internal_notes">Internal Notes</Label>
                    <textarea
                      id="internal_notes"
                      value={formData.internal_notes}
                      onChange={(e) => handleInputChange('internal_notes', e.target.value)}
                      placeholder="Internal notes not visible to customers..."
                      rows="3"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>

          <div className="border-t p-4 flex items-center justify-between bg-gray-50">
            <div className="text-sm text-gray-600">
              All required fields (*) must be completed
            </div>
            <div className="flex items-center space-x-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <Send className="w-4 h-4 mr-2" />
                Create Ticket
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EnhancedCreateTicketModal;

