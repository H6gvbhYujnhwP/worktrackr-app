import React, { useState } from 'react';
import { useAuth, useSimulation } from '../App.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { 
  ArrowLeft,
  Building2,
  LogOut,
  Plus,
  Workflow,
  Settings,
  Play,
  Pause,
  Edit,
  Trash2,
  Copy,
  Zap,
  Mail,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  Wrench,
  Shield,
  Truck,
  Save,
  Eye
} from 'lucide-react';

const workflowTemplates = [
  {
    id: 'maintenance-request',
    name: 'Maintenance Request Workflow',
    description: 'Standard workflow for property maintenance requests with approval process',
    category: 'Maintenance',
    icon: <Wrench className="w-6 h-6" />,
    color: 'bg-blue-100 text-blue-800',
    triggers: [
      {
        type: 'ticket.created',
        conditions: [
          { field: 'category', operator: 'equals', value: 'Maintenance' }
        ]
      }
    ],
    actions: [
      { type: 'assign.team', target: 'maintenance_team', description: 'Auto-assign to maintenance team' },
      { type: 'request.approval', target: 'manager', threshold: '$500', description: 'Request approval for costs over $500' },
      { type: 'send.email', template: 'maintenance_created', description: 'Notify team of new maintenance request' }
    ],
    stages: ['New Request', 'Investigation', 'Authorization', 'Work in Progress', 'Completed']
  },
  {
    id: 'it-support',
    name: 'IT Support Ticket Workflow',
    description: 'Automated workflow for IT support requests with escalation',
    category: 'IT Support',
    icon: <Settings className="w-6 h-6" />,
    color: 'bg-green-100 text-green-800',
    triggers: [
      {
        type: 'ticket.created',
        conditions: [
          { field: 'category', operator: 'equals', value: 'IT Support' }
        ]
      }
    ],
    actions: [
      { type: 'assign.user', target: 'it_specialist', description: 'Assign to IT specialist' },
      { type: 'set.sla', hours: 4, description: 'Set 4-hour response SLA' },
      { type: 'schedule.escalation', hours: 8, description: 'Escalate if not resolved in 8 hours' }
    ],
    stages: ['New Ticket', 'Assigned', 'In Progress', 'Testing', 'Resolved']
  },
  {
    id: 'emergency-response',
    name: 'Emergency Response Workflow',
    description: 'High-priority workflow for emergency situations requiring immediate attention',
    category: 'Emergency',
    icon: <AlertTriangle className="w-6 h-6" />,
    color: 'bg-red-100 text-red-800',
    triggers: [
      {
        type: 'ticket.created',
        conditions: [
          { field: 'priority', operator: 'equals', value: 'critical' }
        ]
      }
    ],
    actions: [
      { type: 'assign.user', target: 'on_call_manager', description: 'Assign to on-call manager' },
      { type: 'send.sms', target: 'emergency_contacts', description: 'Send SMS to emergency contacts' },
      { type: 'send.email', template: 'emergency_alert', description: 'Send emergency email alert' }
    ],
    stages: ['Emergency Reported', 'Response Team Notified', 'On-Site Response', 'Situation Controlled', 'Resolved']
  },
  {
    id: 'security-incident',
    name: 'Security Incident Workflow',
    description: 'Workflow for handling security incidents and breaches',
    category: 'Security',
    icon: <Shield className="w-6 h-6" />,
    color: 'bg-purple-100 text-purple-800',
    triggers: [
      {
        type: 'ticket.created',
        conditions: [
          { field: 'category', operator: 'equals', value: 'Security' }
        ]
      }
    ],
    actions: [
      { type: 'assign.team', target: 'security_team', description: 'Assign to security team' },
      { type: 'notify.authorities', description: 'Notify relevant authorities if required' },
      { type: 'create.incident_report', description: 'Generate incident report' }
    ],
    stages: ['Incident Reported', 'Investigation', 'Containment', 'Resolution', 'Post-Incident Review']
  },
  {
    id: 'vendor-coordination',
    name: 'External Vendor Workflow',
    description: 'Workflow for coordinating with external contractors and vendors',
    category: 'Vendor Management',
    icon: <Truck className="w-6 h-6" />,
    color: 'bg-orange-100 text-orange-800',
    triggers: [
      {
        type: 'ticket.created',
        conditions: [
          { field: 'customFields.requiresVendor', operator: 'equals', value: 'Yes' }
        ]
      }
    ],
    actions: [
      { type: 'request.quotes', target: 'approved_vendors', description: 'Request quotes from approved vendors' },
      { type: 'schedule.site_visit', description: 'Schedule vendor site visit' },
      { type: 'track.vendor_progress', description: 'Monitor vendor work progress' }
    ],
    stages: ['Vendor Required', 'Quotes Requested', 'Vendor Selected', 'Work Scheduled', 'Work Completed']
  }
];

export default function WorkflowBuilder() {
  const { user, logout } = useAuth();
  const { workflows, setWorkflows } = useSimulation();
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customWorkflow, setCustomWorkflow] = useState({
    name: '',
    description: '',
    triggers: [],
    actions: [],
    stages: []
  });
  const [showPreview, setShowPreview] = useState(false);

  const handleBackToDashboard = () => {
    window.history.back();
  };

  const handleUseTemplate = (template) => {
    const newWorkflow = {
      id: `wf-${Date.now()}`,
      name: template.name,
      description: template.description,
      isActive: true,
      createdAt: new Date().toISOString(),
      triggers: template.triggers,
      actions: template.actions,
      stages: template.stages
    };
    
    setWorkflows(prev => [...prev, newWorkflow]);
    
    // Show success message
    alert(`Workflow "${template.name}" has been added to your organization!`);
  };

  const handleCustomizeTemplate = (template) => {
    setCustomWorkflow({
      name: `${template.name} (Custom)`,
      description: template.description,
      triggers: [...template.triggers],
      actions: [...template.actions],
      stages: [...template.stages]
    });
    setActiveTab('builder');
  };

  const handleSaveCustomWorkflow = () => {
    if (!customWorkflow.name.trim()) {
      alert('Please enter a workflow name');
      return;
    }
    
    const newWorkflow = {
      id: `wf-${Date.now()}`,
      ...customWorkflow,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    setWorkflows(prev => [...prev, newWorkflow]);
    
    // Reset form
    setCustomWorkflow({
      name: '',
      description: '',
      triggers: [],
      actions: [],
      stages: []
    });
    
    alert(`Custom workflow "${newWorkflow.name}" has been created!`);
    setActiveTab('templates');
  };

  const addTrigger = () => {
    setCustomWorkflow(prev => ({
      ...prev,
      triggers: [...prev.triggers, {
        type: 'ticket.created',
        conditions: [{ field: 'category', operator: 'equals', value: '' }]
      }]
    }));
  };

  const addAction = () => {
    setCustomWorkflow(prev => ({
      ...prev,
      actions: [...prev.actions, {
        type: 'send.email',
        template: 'notification',
        description: 'Send notification email'
      }]
    }));
  };

  const addStage = () => {
    setCustomWorkflow(prev => ({
      ...prev,
      stages: [...prev.stages, 'New Stage']
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button variant="ghost" size="sm" onClick={handleBackToDashboard} className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              
              <Building2 className="w-8 h-8 text-blue-600 mr-3" />
              <div className="text-xl font-bold">
                Work<span className="text-yellow-500">Trackr</span> 
                <span className="text-sm font-normal text-gray-500 ml-2">Workflow Builder</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {user.name}
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Workflow Builder
          </h1>
          <p className="text-gray-600 mt-2">
            Create and customize automated workflows to streamline your ticket management process
          </p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="builder">Custom Builder</TabsTrigger>
            <TabsTrigger value="active">Active Workflows</TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Workflow Templates</h2>
              <p className="text-gray-600">
                Choose from pre-built workflow templates designed for common use cases
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {workflowTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${template.color}`}>
                          {template.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <Badge variant="outline" className="mt-1">
                            {template.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="mt-3">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      {/* Triggers */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Triggers</h4>
                        <div className="space-y-2">
                          {template.triggers.map((trigger, index) => (
                            <div key={index} className="flex items-center text-sm text-gray-600">
                              <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                              When {trigger.type.replace('.', ' ')} 
                              {trigger.conditions.length > 0 && (
                                <span className="ml-1">
                                  ({trigger.conditions[0].field} = {trigger.conditions[0].value})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Actions</h4>
                        <div className="space-y-2">
                          {template.actions.slice(0, 3).map((action, index) => (
                            <div key={index} className="flex items-center text-sm text-gray-600">
                              {action.type.includes('email') ? (
                                <Mail className="w-4 h-4 mr-2 text-blue-500" />
                              ) : action.type.includes('assign') ? (
                                <User className="w-4 h-4 mr-2 text-green-500" />
                              ) : (
                                <Settings className="w-4 h-4 mr-2 text-purple-500" />
                              )}
                              {action.description}
                            </div>
                          ))}
                          {template.actions.length > 3 && (
                            <div className="text-sm text-gray-500">
                              +{template.actions.length - 3} more actions
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stages */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Workflow Stages</h4>
                        <div className="flex flex-wrap gap-2">
                          {template.stages.map((stage, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {stage}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-3 pt-4 border-t">
                        <Button onClick={() => handleUseTemplate(template)} className="flex-1">
                          <Plus className="w-4 h-4 mr-2" />
                          Use Template
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => handleCustomizeTemplate(template)}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Customize
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Custom Builder Tab */}
          <TabsContent value="builder" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Custom Workflow Builder</h2>
              <p className="text-gray-600">
                Build your own custom workflow from scratch or modify a template
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Workflow Configuration */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
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

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Triggers</CardTitle>
                      <Button size="sm" onClick={addTrigger}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Trigger
                      </Button>
                    </div>
                    <CardDescription>
                      Define when this workflow should be activated
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {customWorkflow.triggers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No triggers defined. Add a trigger to get started.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {customWorkflow.triggers.map((trigger, index) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              <Zap className="w-4 h-4 text-yellow-500" />
                              <span className="font-medium">Trigger {index + 1}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <Select value={trigger.type}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ticket.created">Ticket Created</SelectItem>
                                  <SelectItem value="ticket.updated">Ticket Updated</SelectItem>
                                  <SelectItem value="ticket.assigned">Ticket Assigned</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              <Input placeholder="Field" />
                              <Input placeholder="Value" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Actions</CardTitle>
                      <Button size="sm" onClick={addAction}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Action
                      </Button>
                    </div>
                    <CardDescription>
                      Define what happens when the workflow is triggered
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {customWorkflow.actions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No actions defined. Add an action to specify what should happen.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {customWorkflow.actions.map((action, index) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              <Settings className="w-4 h-4 text-blue-500" />
                              <span className="font-medium">Action {index + 1}</span>
                            </div>
                            <div className="space-y-3">
                              <Select value={action.type}>
                                <SelectTrigger>
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
                                onChange={(e) => {
                                  const newActions = [...customWorkflow.actions];
                                  newActions[index].description = e.target.value;
                                  setCustomWorkflow(prev => ({ ...prev, actions: newActions }));
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Preview Panel */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Workflow Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900">Name</h4>
                        <p className="text-sm text-gray-600">
                          {customWorkflow.name || 'Untitled Workflow'}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900">Triggers</h4>
                        <p className="text-sm text-gray-600">
                          {customWorkflow.triggers.length} trigger(s) defined
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900">Actions</h4>
                        <p className="text-sm text-gray-600">
                          {customWorkflow.actions.length} action(s) defined
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <Button onClick={handleSaveCustomWorkflow} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    Save Workflow
                  </Button>
                  
                  <Button variant="outline" className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    Test Workflow
                  </Button>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Workflows will automatically process tickets based on your defined triggers and actions.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </TabsContent>

          {/* Active Workflows Tab */}
          <TabsContent value="active" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Active Workflows</h2>
              <p className="text-gray-600">
                Manage your currently active workflows
              </p>
            </div>

            <div className="space-y-4">
              {workflows.map((workflow) => (
                <Card key={workflow.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Workflow className="w-5 h-5 text-blue-600" />
                          <h3 className="text-lg font-medium">{workflow.name}</h3>
                          <Badge variant={workflow.isActive ? 'default' : 'secondary'}>
                            {workflow.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 mb-3">{workflow.description}</p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Created: {new Date(workflow.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{workflow.triggers?.length || 0} triggers</span>
                          <span>•</span>
                          <span>{workflow.actions?.length || 0} actions</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          {workflow.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {workflows.length === 0 && (
                <Card className="p-8 text-center">
                  <Workflow className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No active workflows</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first workflow using templates or the custom builder
                  </p>
                  <Button onClick={() => setActiveTab('templates')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Browse Templates
                  </Button>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

