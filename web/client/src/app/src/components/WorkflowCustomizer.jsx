import React, { useState } from 'react';
import { useAuth, useSimulation } from '../App.jsx';
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
  Plus,
  Workflow,
  Settings,
  Zap,
  Mail,
  User,
  AlertTriangle,
  CheckCircle,
  Wrench,
  Shield,
  Truck,
  Save,
  Eye,
  Trash2,
  Edit3,
  ArrowRight,
  Target,
  Play
} from 'lucide-react';

import { workflowTemplates } from '../data/mockData';

export default function WorkflowCustomizer({ isOpen, onClose }) {
  const { user } = useAuth();
  const { workflows, setWorkflows } = useSimulation();
  const [activeStep, setActiveStep] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customWorkflow, setCustomWorkflow] = useState({
    name: '',
    description: '',
    triggers: [],
    actions: [],
    stages: []
  });

  if (!isOpen) return null;

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setCustomWorkflow({
      name: template.name,
      description: template.description,
      triggers: [...template.triggers],
      actions: [...template.actions],
      stages: [...template.stages]
    });
    setActiveStep('customize');
  };

  const handleCreateFromScratch = () => {
    setSelectedTemplate(null);
    setCustomWorkflow({
      name: '',
      description: '',
      triggers: [{ type: 'ticket.created', field: 'category', value: '' }],
      actions: [{ type: 'send.email', template: 'notification', description: 'Send notification email' }],
      stages: ['New', 'In Progress', 'Completed']
    });
    setActiveStep('customize');
  };

  const handleSaveWorkflow = () => {
    if (!customWorkflow.name.trim()) {
      alert('Please enter a workflow name');
      return;
    }
    
    const newWorkflow = {
      id: `wf-${Date.now()}`,
      ...customWorkflow,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: user.id
    };
    
    setWorkflows(prev => [...prev, newWorkflow]);
    
    alert(`Workflow "${newWorkflow.name}" has been created successfully!`);
    onClose();
  };

  const addTrigger = () => {
    setCustomWorkflow(prev => ({
      ...prev,
      triggers: [...prev.triggers, { type: 'ticket.created', field: 'category', value: '' }]
    }));
  };

  const addAction = () => {
    setCustomWorkflow(prev => ({
      ...prev,
      actions: [...prev.actions, { type: 'send.email', template: 'notification', description: 'New action' }]
    }));
  };

  const addStage = () => {
    setCustomWorkflow(prev => ({
      ...prev,
      stages: [...prev.stages, 'New Stage']
    }));
  };

  const updateTrigger = (index, field, value) => {
    setCustomWorkflow(prev => ({
      ...prev,
      triggers: prev.triggers.map((trigger, i) => 
        i === index ? { ...trigger, [field]: value } : trigger
      )
    }));
  };

  const updateAction = (index, field, value) => {
    setCustomWorkflow(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => 
        i === index ? { ...action, [field]: value } : action
      )
    }));
  };

  const updateStage = (index, value) => {
    setCustomWorkflow(prev => ({
      ...prev,
      stages: prev.stages.map((stage, i) => 
        i === index ? value : stage
      )
    }));
  };

  const removeTrigger = (index) => {
    setCustomWorkflow(prev => ({
      ...prev,
      triggers: prev.triggers.filter((_, i) => i !== index)
    }));
  };

  const removeAction = (index) => {
    setCustomWorkflow(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const removeStage = (index) => {
    setCustomWorkflow(prev => ({
      ...prev,
      stages: prev.stages.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg sm:text-xl flex items-center">
                <Workflow className="w-5 h-5 mr-2" />
                Workflow Customizer
              </CardTitle>
              <CardDescription className="text-sm">
                Create and customize automated workflows for your organization
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-120px)]">
          {/* Step Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-6">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              activeStep === 'templates' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <Target className="w-4 h-4" />
              <span className="font-medium text-sm">1. Choose Template</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 hidden sm:block" />
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              activeStep === 'customize' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <Edit3 className="w-4 h-4" />
              <span className="font-medium text-sm">2. Customize</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 hidden sm:block" />
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              activeStep === 'preview' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <Eye className="w-4 h-4" />
              <span className="font-medium text-sm">3. Preview & Save</span>
            </div>
          </div>

          {/* Templates Step */}
          {activeStep === 'templates' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Choose a Starting Point</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {workflowTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleSelectTemplate(template)}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${template.color}`}>
                          {template.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{template.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                          <Badge variant="outline" className="mt-2">
                            {template.category}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="text-center">
                <Button variant="outline" onClick={handleCreateFromScratch} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Start from Scratch
                </Button>
              </div>
            </div>
          )}

          {/* Customize Step */}
          {activeStep === 'customize' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Customize Your Workflow</h3>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setActiveStep('templates')}>
                    Back
                  </Button>
                  <Button size="sm" onClick={() => setActiveStep('preview')}>
                    Preview
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="workflow-name">Workflow Name</Label>
                      <Input
                        id="workflow-name"
                        value={customWorkflow.name}
                        onChange={(e) => setCustomWorkflow(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter workflow name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="workflow-description">Description</Label>
                      <Textarea
                        id="workflow-description"
                        value={customWorkflow.description}
                        onChange={(e) => setCustomWorkflow(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe what this workflow does"
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Workflow Stages */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Workflow Stages</CardTitle>
                      <Button size="sm" variant="outline" onClick={addStage}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {customWorkflow.stages.map((stage, index) => (
                        <div key={index} className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                          <Input
                            value={stage}
                            onChange={(e) => updateStage(index, e.target.value)}
                            placeholder="Stage name"
                            className="flex-1"
                          />
                          {customWorkflow.stages.length > 1 && (
                            <Button size="sm" variant="ghost" onClick={() => removeStage(index)} className="w-full sm:w-auto">
                              <Trash2 className="w-4 h-4 sm:mr-0 mr-2" />
                              <span className="sm:hidden">Remove Stage</span>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Triggers */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Triggers</CardTitle>
                      <Button size="sm" variant="outline" onClick={addTrigger}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    <CardDescription>
                      Define when this workflow should activate
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {customWorkflow.triggers.map((trigger, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm font-medium">Trigger {index + 1}</span>
                            {customWorkflow.triggers.length > 1 && (
                              <Button size="sm" variant="ghost" onClick={() => removeTrigger(index)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <Select value={trigger.type} onValueChange={(value) => updateTrigger(index, 'type', value)}>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ticket.created">Ticket Created</SelectItem>
                                <SelectItem value="ticket.updated">Ticket Updated</SelectItem>
                                <SelectItem value="ticket.assigned">Ticket Assigned</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Input 
                              placeholder="Field" 
                              value={trigger.field}
                              onChange={(e) => updateTrigger(index, 'field', e.target.value)}
                              className="w-full"
                            />
                            <Input 
                              placeholder="Value" 
                              value={trigger.value}
                              onChange={(e) => updateTrigger(index, 'value', e.target.value)}
                              className="w-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Actions</CardTitle>
                      <Button size="sm" variant="outline" onClick={addAction}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    <CardDescription>
                      Define what happens when triggered
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {customWorkflow.actions.map((action, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <Settings className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium">Action {index + 1}</span>
                            {customWorkflow.actions.length > 1 && (
                              <Button size="sm" variant="ghost" onClick={() => removeAction(index)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Select value={action.type} onValueChange={(value) => updateAction(index, 'type', value)}>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="send.email">Send Email</SelectItem>
                                <SelectItem value="assign.user">Assign to User</SelectItem>
                                <SelectItem value="assign.team">Assign to Team</SelectItem>
                                <SelectItem value="request.approval">Request Approval</SelectItem>
                                <SelectItem value="set.status">Set Status</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Input 
                              placeholder="Description" 
                              value={action.description}
                              onChange={(e) => updateAction(index, 'description', e.target.value)}
                              className="w-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {activeStep === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Preview & Save</h3>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setActiveStep('customize')}>
                    Back to Edit
                  </Button>
                  <Button size="sm" onClick={handleSaveWorkflow}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Workflow
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{customWorkflow.name || 'Untitled Workflow'}</CardTitle>
                  <CardDescription>{customWorkflow.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Workflow Stages</h4>
                    <div className="flex flex-wrap gap-2">
                      {customWorkflow.stages.map((stage, index) => (
                        <Badge key={index} variant="secondary">
                          {index + 1}. {stage}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Triggers ({customWorkflow.triggers.length})</h4>
                    <div className="space-y-2">
                      {customWorkflow.triggers.map((trigger, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600">
                          <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                          When {trigger.type.replace('.', ' ')} and {trigger.field} = "{trigger.value}"
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Actions ({customWorkflow.actions.length})</h4>
                    <div className="space-y-2">
                      {customWorkflow.actions.map((action, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600">
                          <Settings className="w-4 h-4 mr-2 text-blue-500" />
                          {action.description}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  This workflow will automatically process tickets based on your defined triggers and actions. 
                  You can edit or disable it anytime from the workflow management page.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

