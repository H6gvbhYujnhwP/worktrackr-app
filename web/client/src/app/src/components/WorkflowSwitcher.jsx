import React, { useState } from 'react';
import { X, Check, Plus, Workflow, Settings, Zap } from 'lucide-react';
import { workflowTemplates } from '../data/mockData';

const WorkflowSwitcher = ({ isOpen, onClose, currentWorkflow, onWorkflowChange }) => {
  const [availableWorkflows, setAvailableWorkflows] = useState([
    {
      id: 'default',
      name: 'Default Workflow',
      description: 'Standard ticket management workflow',
      icon: '📋',
      isActive: true,
      stages: ['New', 'In Progress', 'Completed']
    },
    {
      id: 'emergency-response-test',
      name: 'Emergency Response Test',
      description: 'Critical incident response with rapid deployment',
      icon: '🚨',
      isActive: true,
      stages: ['Alert Received', 'Dispatched', 'En Route', 'On Scene', 'Incident Resolved', 'Report Filed', 'Closed']
    },
    {
      id: 'maintenance-workflow',
      name: 'Maintenance Workflow',
      description: 'Comprehensive maintenance workflow with preventive scheduling',
      icon: '🔧',
      isActive: true,
      stages: ['New Request', 'Investigation', 'Authorization', 'Work in Progress', 'Completed']
    },
    {
      id: 'it-support-workflow',
      name: 'IT Support Workflow',
      description: 'Technical support workflow with escalation tiers',
      icon: '💻',
      isActive: true,
      stages: ['New Ticket', 'Assigned', 'In Progress', 'Testing', 'Resolved']
    }
  ]);

  if (!isOpen) return null;

  const handleWorkflowSelect = (workflow) => {
    onWorkflowChange(workflow);
    onClose();
  };

  const handleCreateNew = () => {
    // This would typically open the workflow customizer
    onClose();
    // You could add a callback here to open the workflow customizer
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#242438] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
              <Workflow className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Switch Workflow</h2>
              <p className="text-sm text-[#94a3b8]">Choose a workflow for your ticket management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#242438] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#94a3b8]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="space-y-6">
            {/* Current Workflow */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Current Workflow</h3>
              <div className="p-4 bg-teal-50 border-2 border-teal-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{currentWorkflow.icon || '📋'}</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white flex items-center">
                      {currentWorkflow.name}
                      <Check className="w-4 h-4 text-teal-600 ml-2" />
                    </h4>
                    <p className="text-sm text-[#94a3b8]">{currentWorkflow.description}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Available Workflows */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Available Workflows</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableWorkflows
                  .filter(workflow => workflow.id !== currentWorkflow.id)
                  .map((workflow) => (
                    <div
                      key={workflow.id}
                      onClick={() => handleWorkflowSelect(workflow)}
                      className="p-4 border-2 border-[#2e2e4a] rounded-lg cursor-pointer transition-all hover:shadow-md hover:border-teal-300 hover:bg-teal-50"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl">{workflow.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{workflow.name}</h4>
                          <p className="text-sm text-[#94a3b8] mb-3">{workflow.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {workflow.stages.slice(0, 3).map((stage, index) => (
                              <span key={index} className="text-xs bg-[#242438] text-[#94a3b8] px-2 py-1 rounded">
                                {stage}
                              </span>
                            ))}
                            {workflow.stages.length > 3 && (
                              <span className="text-xs text-[#94a3b8]">+{workflow.stages.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Create New Workflow */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Create New Workflow</h3>
              <div
                onClick={handleCreateNew}
                className="p-4 border-2 border-dashed border-[#2e2e4a] rounded-lg cursor-pointer transition-all hover:shadow-md hover:border-teal-400 hover:bg-teal-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#242438] rounded-lg flex items-center justify-center">
                    <Plus className="w-6 h-6 text-[#94a3b8]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Create Custom Workflow</h4>
                    <p className="text-sm text-[#94a3b8]">Build a new workflow from templates or start from scratch</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow Templates Preview */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Available Templates</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {workflowTemplates.slice(0, 6).map((template) => (
                  <div key={template.id} className="p-3 bg-[#1f1f33] rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="text-lg">{template.icon}</div>
                      <div>
                        <h5 className="text-sm font-medium text-white">{template.name}</h5>
                        <p className="text-xs text-[#94a3b8]">{template.industry}</p>
                      </div>
                    </div>
                    <p className="text-xs text-[#94a3b8]">{template.description}</p>
                  </div>
                ))}
              </div>
              {workflowTemplates.length > 6 && (
                <p className="text-sm text-[#94a3b8] mt-3 text-center">
                  +{workflowTemplates.length - 6} more templates available in Workflow Builder
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-[#1f1f33]">
          <div className="text-sm text-[#94a3b8]">
            Switch between workflows to change how tickets are processed and managed
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[#94a3b8] hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowSwitcher;

