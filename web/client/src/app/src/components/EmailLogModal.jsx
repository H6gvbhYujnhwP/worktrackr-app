import React, { useState } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { 
  X, 
  Mail, 
  Search, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  User,
  Ticket,
  Filter
} from 'lucide-react';

const emailTemplates = {
  ticket_created: {
    label: 'Ticket Created',
    color: 'bg-blue-100 text-blue-800',
    icon: <Ticket className="w-3 h-3" />
  },
  ticket_assigned: {
    label: 'Ticket Assigned',
    color: 'bg-green-100 text-green-800',
    icon: <User className="w-3 h-3" />
  },
  ticket_passed: {
    label: 'Ticket Passed',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <User className="w-3 h-3" />
  },
  status_changed: {
    label: 'Status Changed',
    color: 'bg-purple-100 text-purple-800',
    icon: <AlertCircle className="w-3 h-3" />
  },
  approval_request: {
    label: 'Approval Request',
    color: 'bg-orange-100 text-orange-800',
    icon: <AlertCircle className="w-3 h-3" />
  },
  approval_decision: {
    label: 'Approval Decision',
    color: 'bg-indigo-100 text-indigo-800',
    icon: <CheckCircle className="w-3 h-3" />
  }
};

export default function EmailLogModal({ emailLogs, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [templateFilter, setTemplateFilter] = useState('all');

  const filteredEmails = emailLogs.filter(email => {
    // Search filter
    if (searchTerm && !email.to.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !email.subject.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Template filter
    if (templateFilter !== 'all' && email.template !== templateFilter) {
      return false;
    }

    return true;
  });

  const getTemplateInfo = (template) => {
    return emailTemplates[template] || {
      label: template,
      color: 'bg-gray-100 text-gray-800',
      icon: <Mail className="w-3 h-3" />
    };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Email Notifications Log
              </CardTitle>
              <CardDescription>
                View all email notifications sent by the system ({emailLogs.length} total)
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <div className="p-6">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by recipient or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={templateFilter}
              onChange={(e) => setTemplateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {Object.entries(emailTemplates).map(([key, template]) => (
                <option key={key} value={key}>{template.label}</option>
              ))}
            </select>
          </div>

          {/* Email List */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {filteredEmails.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No emails found</h3>
                <p className="text-gray-600">
                  {searchTerm || templateFilter !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Email notifications will appear here when tickets are created or updated'
                  }
                </p>
              </div>
            ) : (
              filteredEmails.map((email) => {
                const templateInfo = getTemplateInfo(email.template);
                
                return (
                  <Card key={email.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Badge className={`${templateInfo.color} border flex items-center space-x-1`}>
                              {templateInfo.icon}
                              <span>{templateInfo.label}</span>
                            </Badge>
                            
                            <Badge 
                              variant={email.status === 'sent' ? 'default' : 'destructive'}
                              className="flex items-center space-x-1"
                            >
                              {email.status === 'sent' ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : (
                                <AlertCircle className="w-3 h-3" />
                              )}
                              <span>{email.status}</span>
                            </Badge>
                          </div>
                          
                          <h4 className="font-medium text-gray-900 mb-1">
                            {email.subject}
                          </h4>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-2" />
                              <span><strong>To:</strong> {email.to}</span>
                            </div>
                            
                            {email.ticketId && (
                              <div className="flex items-center">
                                <Ticket className="w-4 h-4 mr-2" />
                                <span><strong>Ticket:</strong> {email.ticketId}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2" />
                              <span><strong>Sent:</strong> {new Date(email.sentAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4 text-right">
                          <div className="text-xs text-gray-500">
                            {new Date(email.sentAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      
                      {/* Email Preview */}
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                        <div className="text-sm">
                          <div className="font-medium text-gray-700 mb-1">Email Preview:</div>
                          <div className="text-gray-600">
                            {getEmailPreview(email)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Summary Stats */}
          {emailLogs.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{emailLogs.length}</div>
                  <div className="text-sm text-gray-600">Total Sent</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {emailLogs.filter(e => e.status === 'sent').length}
                  </div>
                  <div className="text-sm text-gray-600">Delivered</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {emailLogs.filter(e => e.template === 'approval_request').length}
                  </div>
                  <div className="text-sm text-gray-600">Approvals</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {emailLogs.filter(e => e.template === 'ticket_assigned').length}
                  </div>
                  <div className="text-sm text-gray-600">Assignments</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// Helper function to generate email preview content
function getEmailPreview(email) {
  switch (email.template) {
    case 'ticket_created':
      return `A new ticket has been created and requires attention. Please review the details and assign it to the appropriate team member.`;
    
    case 'ticket_assigned':
      return `You have been assigned a new ticket. Please review the details and begin work as soon as possible.`;
    
    case 'ticket_passed':
      return `A ticket has been passed to you from another team member. Please review the previous comments and continue the work.`;
    
    case 'status_changed':
      return `The status of your ticket has been updated. Please check the ticket details for the latest information.`;
    
    case 'approval_request':
      return `A team member is requesting approval for a ticket. Please review the details and provide your decision.`;
    
    case 'approval_decision':
      return `Your approval request has been processed. Please check the ticket for the decision and any additional comments.`;
    
    default:
      return `This is an automated notification from WorkTrackr Cloud regarding your ticket.`;
  }
}

