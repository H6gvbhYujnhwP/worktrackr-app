import React from 'react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { 
  Clock, 
  User, 
  MapPin, 
  AlertCircle, 
  CheckCircle, 
  Plus, 
  Pause,
  X
} from 'lucide-react';
import { ticketStatuses, priorities } from '../data/mockData.js';

const getStatusIcon = (status) => {
  switch (status) {
    case 'new': return <Plus className="w-4 h-4" />;
    case 'assigned': return <User className="w-4 h-4" />;
    case 'in_progress': return <Clock className="w-4 h-4" />;
    case 'waiting_approval': return <AlertCircle className="w-4 h-4" />;
    case 'parked': return <Pause className="w-4 h-4" />;
    case 'completed': return <CheckCircle className="w-4 h-4" />;
    case 'closed': return <X className="w-4 h-4" />;
    default: return <AlertCircle className="w-4 h-4" />;
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'high': return 'bg-red-100 text-red-800 border-red-200';
    case 'critical': return 'bg-red-200 text-red-900 border-red-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'new': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'assigned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'in_progress': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'waiting_approval': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'parked': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'closed': return 'bg-slate-100 text-slate-800 border-slate-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function TicketCard({ ticket, users, currentUser, onClick }) {
  const assignee = users.find(u => u.id === ticket.assignedTo);
  const creator = users.find(u => u.id === ticket.createdBy);
  
  const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date();
  const isAssignedToMe = ticket.assignedTo === currentUser.id;

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-all duration-200 ${
        isAssignedToMe ? 'ring-1 ring-blue-200 bg-blue-50/30' : ''
      } ${isOverdue ? 'border-red-300' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        {/* Single line layout */}
        <div className="flex items-center justify-between space-x-3">
          {/* Left side - Title and ID */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-gray-900 truncate text-sm">
                {ticket.title}
              </h3>
              <span className="text-xs text-gray-500 flex-shrink-0">#{ticket.id}</span>
            </div>
          </div>

          {/* Right side - Status, Priority, Assignment */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Assignment info - only show if assigned */}
            {assignee && (
              <span className={`text-xs px-2 py-1 rounded ${isAssignedToMe ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                {assignee.name}
              </span>
            )}
            
            {/* Priority badge */}
            <Badge className={`${getPriorityColor(ticket.priority)} border text-xs`}>
              {priorities[ticket.priority]?.label || ticket.priority}
            </Badge>
            
            {/* Status badge */}
            <Badge className={`${getStatusColor(ticket.status)} border text-xs`}>
              {getStatusIcon(ticket.status)}
              <span className="ml-1">{ticketStatuses[ticket.status]?.label || ticket.status}</span>
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

