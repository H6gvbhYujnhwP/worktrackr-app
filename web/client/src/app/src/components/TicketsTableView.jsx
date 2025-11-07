// web/client/src/app/src/components/TicketsTableView.jsx
import React, { useState, useMemo } from 'react';
import { useSimulation } from '../App.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import AssignTicketsModal from './AssignTicketsModal.jsx';
import { 
  Trash2, 
  UserPlus, 
  Settings, 
  Flag,
  Merge,
  MoreVertical,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx';

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  urgent: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function TicketsTableView({ tickets, users, onTicketClick }) {
  const { bulkUpdateTickets, bulkDeleteTickets } = useSimulation();
  const [selectedTickets, setSelectedTickets] = useState(new Set());
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const allSelected = tickets.length > 0 && selectedTickets.size === tickets.length;
  const someSelected = selectedTickets.size > 0 && selectedTickets.size < tickets.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(tickets.map(t => t.id)));
    }
  };

  const toggleTicket = (ticketId) => {
    const newSelected = new Set(selectedTickets);
    if (newSelected.has(ticketId)) {
      newSelected.delete(ticketId);
    } else {
      newSelected.add(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedTickets.size} ticket(s)? This action cannot be undone.`)) {
      return;
    }
    setLoading(true);
    try {
      await bulkDeleteTickets(Array.from(selectedTickets));
      setSelectedTickets(new Set());
      alert('Tickets deleted successfully!');
    } catch (error) {
      console.error('Failed to delete tickets:', error);
      alert('Failed to delete tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssign = () => {
    setShowAssignModal(true);
  };

  const handleAssignConfirm = async (userId) => {
    setLoading(true);
    try {
      await bulkUpdateTickets(Array.from(selectedTickets), { assignee_id: userId });
      setSelectedTickets(new Set());
      alert('Tickets assigned successfully!');
    } catch (error) {
      console.error('Failed to assign tickets:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSetStatus = async (status) => {
    setLoading(true);
    try {
      await bulkUpdateTickets(Array.from(selectedTickets), { status });
      setSelectedTickets(new Set());
      alert('Status updated successfully!');
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSetPriority = async (priority) => {
    setLoading(true);
    try {
      await bulkUpdateTickets(Array.from(selectedTickets), { priority });
      setSelectedTickets(new Set());
      alert('Priority updated successfully!');
    } catch (error) {
      console.error('Failed to update priority:', error);
      alert('Failed to update priority. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMergeTickets = () => {
    if (selectedTickets.size < 2) {
      alert('Please select at least 2 tickets to merge');
      return;
    }
    alert('Merge functionality coming soon!');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getUserName = (userId) => {
    if (!userId) return 'Unassigned';
    const user = users?.find(u => u.id === userId);
    return user ? user.name : 'Unknown';
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBulkDelete}
          disabled={selectedTickets.size === 0 || loading}
          className="gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleBulkAssign}
          disabled={selectedTickets.size === 0 || loading}
          className="gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Assign ticket
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedTickets.size === 0 || loading}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Set status
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleBulkSetStatus('open')}>
              Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkSetStatus('in_progress')}>
              In Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkSetStatus('pending')}>
              Pending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkSetStatus('completed')}>
              Completed
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedTickets.size === 0 || loading}
              className="gap-2"
            >
              <Flag className="w-4 h-4" />
              Set priority
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleBulkSetPriority('low')}>
              Low
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkSetPriority('medium')}>
              Medium
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkSetPriority('high')}>
              High
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkSetPriority('urgent')}>
              Urgent
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          onClick={handleMergeTickets}
          disabled={selectedTickets.size < 2 || loading}
          className="gap-2"
        >
          <Merge className="w-4 h-4" />
          Merge tickets
        </Button>

        {selectedTickets.size > 0 && (
          <span className="ml-auto text-sm text-gray-600">
            {selectedTickets.size} selected
          </span>
        )}
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="w-12 p-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all tickets"
                  />
                </th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Details</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700 w-32">SLA</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700 w-48">Assigned technician</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700 w-32">Priority</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700 w-48">Activity status</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700 w-32">Status</th>
                <th className="w-12 p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-gray-500">
                    No tickets found
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      selectedTickets.has(ticket.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="p-3">
                      <Checkbox
                        checked={selectedTickets.has(ticket.id)}
                        onCheckedChange={() => toggleTicket(ticket.id)}
                        aria-label={`Select ticket ${ticket.id}`}
                      />
                    </td>
                    <td className="p-3">
                      <div 
                        className="cursor-pointer"
                        onClick={() => {
                          console.log('[TicketsTableView] Ticket clicked:', ticket.id);
                          console.log('[TicketsTableView] onTicketClick exists?', !!onTicketClick);
                          onTicketClick?.(ticket);
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-500 font-mono">
                            #{ticket.id.slice(0, 8)}
                          </span>
                          <span className="font-medium text-gray-900 hover:text-blue-600">
                            {ticket.title}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {ticket.company_name || 'No company'}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Created {formatDate(ticket.created_at)} • Modified {formatDate(ticket.updated_at)}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">
                        No SLA
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                          {getUserName(ticket.assignee_id).charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700">
                          {getUserName(ticket.assignee_id)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`w-full justify-start gap-2 ${
                              PRIORITY_COLORS[ticket.priority || 'medium']
                            } border`}
                          >
                            {(ticket.priority || 'medium').charAt(0).toUpperCase() + 
                             (ticket.priority || 'medium').slice(1)}
                            <ChevronDown className="w-3 h-3 ml-auto" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => console.log('Set priority low')}>
                            Low
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => console.log('Set priority medium')}>
                            Medium
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => console.log('Set priority high')}>
                            High
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => console.log('Set priority urgent')}>
                            Urgent
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          ticket.status === 'completed' ? 'bg-green-500' :
                          ticket.status === 'in_progress' ? 'bg-purple-500' :
                          ticket.status === 'pending' ? 'bg-yellow-500' :
                          'bg-gray-400'
                        }`} />
                        <span className="text-sm text-gray-700">
                          {ticket.activity_status || 'Awaiting response'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`w-full justify-start gap-2 ${
                              STATUS_COLORS[ticket.status || 'open']
                            } border`}
                          >
                            {(ticket.status || 'open').replace('_', ' ').charAt(0).toUpperCase() + 
                             (ticket.status || 'open').replace('_', ' ').slice(1)}
                            <ChevronDown className="w-3 h-3 ml-auto" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => console.log('Set status open')}>
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => console.log('Set status in_progress')}>
                            In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => console.log('Set status pending')}>
                            Pending
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => console.log('Set status completed')}>
                            Completed
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onTicketClick?.(ticket)}>
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => console.log('Edit ticket')}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => console.log('Delete ticket')}
                            className="text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t text-sm text-gray-600">
          Displaying {tickets.length} of {tickets.length} tickets
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <AssignTicketsModal
          users={users}
          ticketIds={Array.from(selectedTickets)}
          onAssign={handleAssignConfirm}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </div>
  );
}
