import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useAuth } from '../../../context/AuthProvider.jsx';
import { useSimulation } from '../App.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.jsx';
import { 
  Building2, 
  LogOut, 
  Plus, 
  Search, 
  Filter, 
  Users, 
  Ticket, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Pause,
  X,
  XCircle,
  User,
  Mail,
  Settings,
  Workflow,
  Bell,
  RefreshCw,
  Calendar,
  Trash2,
  UserPlus,
  Flag,
  GitMerge,
  ChevronDown
} from 'lucide-react';
import { ticketStatuses, priorities, categories } from '../data/mockData.js';
import AppVersion from './AppVersion.jsx';
import TicketCard from './TicketCard.jsx';
import TicketDetailModal from './TicketDetailModal.jsx';
import CreateTicketModal from './CreateTicketModal.jsx';
import AssignTicketsModal from './AssignTicketsModal.jsx';
import EmailLogModal from './EmailLogModal.jsx';
import TicketFieldCustomizer from './TicketFieldCustomizer.jsx';

import UserManagementImproved from './UserManagementImproved.jsx';
import IntegratedCalendar from './IntegratedCalendar.jsx';
import XeroIntegration from './XeroIntegration.jsx';
import CRMDashboard from './CRMDashboard.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import CRMCalendar from './CRMCalendar.jsx';
import ContactManager from './ContactManager.jsx';
import SecuritySettings from './SecuritySettings.jsx';
import EmailIntakeSettings from './EmailIntakeSettings.jsx';
import TicketsTableView from './TicketsTableView.jsx';
import TicketDetailView from './TicketDetailViewTabbed.jsx';

const Dashboard = forwardRef((props, ref) => {
  const { user, membership, logout } = useAuth();
  const { tickets, users, emailLogs, bulkUpdateTickets, bulkDeleteTickets } = useSimulation();
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [viewingTicketId, setViewingTicketId] = useState(null);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showEmailLogs, setShowEmailLogs] = useState(false);
  const [showFieldCustomizer, setShowFieldCustomizer] = useState(false);
  const [showTicketCustomizer, setShowTicketCustomizer] = useState(false);

  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showXeroIntegration, setShowXeroIntegration] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState(() => {
    return localStorage.getItem('worktrackr-timezone') || 'Europe/London';
  });
  const [currentView, setCurrentView] = useState('tickets'); // tickets, calendar, billing
  const [ticketViewMode, setTicketViewMode] = useState(() => {
    return localStorage.getItem('worktrackr-ticket-view-mode') || 'table'; // 'cards' or 'table'
  });
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedTickets, setSelectedTickets] = useState(new Set());
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Expose setCurrentView to parent via ref
  useImperativeHandle(ref, () => ({
    setCurrentView: (view) => {
      setCurrentView(view);
    }
  }));

  // Show loading spinner while authentication data is being fetched
  if (user === undefined || membership === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update selectedTicket when tickets change to ensure modal shows latest data
  useEffect(() => {
    if (selectedTicket) {
      const updatedTicket = tickets.find(t => t.id === selectedTicket.id);
      if (updatedTicket && JSON.stringify(updatedTicket) !== JSON.stringify(selectedTicket)) {
        setSelectedTicket(updatedTicket);
      }
    }
  }, [tickets, selectedTicket]);

  // Handle timezone changes
  const handleTimezoneChange = (timezone) => {
    setSelectedTimezone(timezone);
    localStorage.setItem('worktrackr-timezone', timezone);
    // Trigger a refresh of calendar components
    setLastUpdate(new Date());
  };

  // Get list of common timezones
  const getTimezones = () => {
    return [
      { value: 'Europe/London', label: 'London (GMT/BST)' },
      { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
      { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
      { value: 'America/New_York', label: 'New York (EST/EDT)' },
      { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
      { value: 'America/Denver', label: 'Denver (MST/MDT)' },
      { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
      { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
      { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
      { value: 'Asia/Dubai', label: 'Dubai (GST)' },
      { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
      { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' }
    ];
  };

  // Bulk action handlers
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
      await bulkUpdateTickets(Array.from(selectedTickets), { assigneeId: userId });
      setSelectedTickets(new Set());
      setShowAssignModal(false);
    } catch (error) {
      console.error('Failed to assign tickets:', error);
      alert(`Failed to assign tickets: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSetStatus = async (status) => {
    setLoading(true);
    try {
      await bulkUpdateTickets(Array.from(selectedTickets), { status });
      setSelectedTickets(new Set());
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

  const filteredTickets = tickets.filter(ticket => {
    // Tab filter
    if (activeTab === 'open' && ticket.status !== 'open') {
      return false;
    }
    if (activeTab === 'in_progress' && ticket.status !== 'in_progress') {
      return false;
    }
    if (activeTab === 'pending' && ticket.status !== 'pending') {
      return false;
    }
    // Closed tickets: closed status (moved to closed queue)
    if (activeTab === 'closed' && ticket.status !== 'closed') {
      return false;
    }
    // Resolved tickets: resolved status (flagged for invoicing)
    if (activeTab === 'resolved' && ticket.status !== 'resolved') {
      return false;
    }
    if (activeTab === 'my_tickets' && ticket.assignedTo !== user?.id) {
      return false;
    }

    // Search filter
    if (searchTerm && !ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !ticket.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Status filter
    if (statusFilter === 'my_tickets' && ticket.assignedTo !== user?.id) {
      return false;
    } else if (statusFilter === 'open' && !['open', 'in_progress', 'pending'].includes(ticket.status)) {
      return false;
    } else if (statusFilter === 'closed' && ticket.status !== 'closed') {
      return false;
    } else if (statusFilter === 'resolved' && ticket.status !== 'resolved') {
      return false;
    } else if (statusFilter !== 'all' && statusFilter !== 'my_tickets' && statusFilter !== 'open' && statusFilter !== 'closed' && statusFilter !== 'resolved' && ticket.status !== statusFilter) {
      return false;
    }

    // Priority filter
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) {
      return false;
    }

    // Assignee filter
    if (assigneeFilter !== 'all' && ticket.assignedTo !== assigneeFilter) {
      return false;
    }

    return true;
  });

  // Get ticket counts for tabs
  const ticketCounts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    pending: tickets.filter(t => t.status === 'pending').length,
    closed: tickets.filter(t => t.status === 'closed').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    my_tickets: tickets.filter(t => {
      // Match by user ID (assignedTo transformed from assignee_id in API layer)
      return t.assignedTo === user?.id;
    }).length
  };

  const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
       <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center min-w-0 flex-1">
              <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="text-lg sm:text-xl font-bold min-w-0">
                <span className="hidden sm:inline">Work<span className="text-yellow-500">Trackr</span></span>
                <span className="sm:hidden">WT</span>

              </div>
              <Badge className="ml-2 sm:ml-3 flex-shrink-0" variant={isAdmin ? 'default' : 'secondary'}>
                {isAdmin ? 'Admin' : 'Staff'}
              </Badge>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <Button variant="ghost" size="sm" className="relative">
                <Mail className="w-4 h-4" />
                {emailLogs.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 text-xs p-0 flex items-center justify-center">
                    {emailLogs.length}
                  </Badge>
                )}
              </Button>
              <Button variant="ghost" size="sm">
                <Bell className="w-4 h-4" />
              </Button>
              <div className="text-sm font-medium text-gray-700 hidden sm:block max-w-[100px] truncate">
                {user?.name || 'User'}
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Main Content */}
        <div className="space-y-4">
          {/* Navigation Tabs - HIDDEN: Now in sidebar */}
          <Card className="hidden">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:space-x-8 space-y-4 lg:space-y-0">
                {/* Settings Section */}
                {isAdmin && (
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">Settings</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant={currentView === 'users' ? 'default' : 'outline'} 
                        onClick={() => setCurrentView('users')}
                        className="flex items-center space-x-2"
                      >
                        <Users className="w-4 h-4" />
                        <span>Manage Users</span>
                      </Button>
                      
                      <Button 
                        variant={currentView === 'billing' ? 'default' : 'outline'} 
                        onClick={() => setCurrentView('billing')}
                        className="flex items-center space-x-2"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Billing</span>
                      </Button>
                      
                      <Button 
                        variant={currentView === 'security' ? 'default' : 'outline'} 
                        onClick={() => setCurrentView('security')}
                        className="flex items-center space-x-2"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Security</span>
                      </Button>
                      
                      <Button 
                        variant={currentView === 'email-intake' ? 'default' : 'outline'} 
                        onClick={() => setCurrentView('email-intake')}
                        className="flex items-center space-x-2"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Email Intake</span>
                      </Button>
                    </div>
                    
                    {/* Timezone Setting */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <label className="block text-xs font-medium text-gray-500 mb-1">TIMEZONE</label>
                      <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
                        <SelectTrigger className="w-full max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getTimezones().map(tz => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Tickets Section */}
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">Tickets</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant={currentView === 'tickets' ? 'default' : 'outline'} 
                      onClick={() => setCurrentView('tickets')}
                      className="flex items-center space-x-2"
                    >
                      <Ticket className="w-4 h-4" />
                      <span>Tickets</span>
                    </Button>
                    
                    <Button 
                      variant={currentView === 'calendar' ? 'default' : 'outline'} 
                      onClick={() => setCurrentView('calendar')}
                      className="flex items-center space-x-2"
                    >
                      <Clock className="w-4 h-4" />
                      <span>Ticket Calendar</span>
                    </Button>
                  </div>
                </div>

                {/* CRM Section */}
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">CRM</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant={currentView === 'contacts' ? 'default' : 'outline'} 
                      onClick={() => setCurrentView('contacts')}
                      className="flex items-center space-x-2"
                    >
                      <Users className="w-4 h-4" />
                      <span>Contacts</span>
                    </Button>
                    
                    <Button 
                      variant={currentView === 'crm' ? 'default' : 'outline'} 
                      onClick={() => setCurrentView('crm')}
                      className="flex items-center space-x-2"
                    >
                      <Building2 className="w-4 h-4" />
                      <span>CRM</span>
                    </Button>
                    
                    <Button 
                      variant={currentView === 'crm-calendar' ? 'default' : 'outline'} 
                      onClick={() => setCurrentView('crm-calendar')}
                      className="flex items-center space-x-2"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>CRM Calendar</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>



          {/* View Content */}
          {currentView === 'tickets' && (
            <>
              {/* Compact Three-Row Layout */}
              <div className="bg-white rounded-lg border p-4 space-y-3">
                {/* Row 1: Buttons + Search + Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={() => setShowCreateModal(true)} size="sm" className="h-9">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Ticket
                  </Button>
                  
                  {isAdmin && (
                    <Button variant="outline" size="sm" onClick={() => setShowTicketCustomizer(true)} className="h-9">
                      <Workflow className="w-4 h-4 mr-2" />
                      Customize
                    </Button>
                  )}
                  
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search tickets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-9"
                    />
                  </div>
                  
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[130px] h-9">
                      <SelectValue placeholder="All Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      {Object.entries(priorities).map(([key, priority]) => (
                        <SelectItem key={key} value={key}>{priority.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Row 2: Stats Badges */}
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 cursor-pointer" onClick={() => setActiveTab('all')}>
                    All: {tickets.length}
                  </Badge>
                  <Badge className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 cursor-pointer" onClick={() => setActiveTab('my_tickets')}>
                    My: {ticketCounts.my_tickets}
                  </Badge>
                  <Badge className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 cursor-pointer" onClick={() => setActiveTab('open')}>
                    Open: {ticketCounts.open}
                  </Badge>
                  <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 cursor-pointer" onClick={() => setActiveTab('in_progress')}>
                    In Progress: {ticketCounts.in_progress}
                  </Badge>
                  <Badge className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 cursor-pointer" onClick={() => setActiveTab('pending')}>
                    Pending: {ticketCounts.pending}
                  </Badge>
                  <Badge className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 cursor-pointer" onClick={() => setActiveTab('resolved')}>
                    Resolved: {ticketCounts.resolved}
                  </Badge>
                  <Badge className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 cursor-pointer" onClick={() => setActiveTab('closed')}>
                    Closed: {ticketCounts.closed}
                  </Badge>
                </div>

                {/* Row 3: Bulk Actions */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button variant="ghost" size="sm" className="h-8 text-gray-600" onClick={handleBulkDelete} disabled={selectedTickets.size === 0 || loading}>
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Delete
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-gray-600" onClick={handleBulkAssign} disabled={selectedTickets.size === 0 || loading}>
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    Assign ticket
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 text-gray-600" disabled={selectedTickets.size === 0 || loading}>
                        <Settings className="w-4 h-4 mr-1.5" />
                        Set status
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleBulkSetStatus('open')}>Open</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkSetStatus('in_progress')}>In Progress</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkSetStatus('pending')}>Pending</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkSetStatus('resolved')}>Resolved</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkSetStatus('closed')}>Closed</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 text-gray-600" disabled={selectedTickets.size === 0 || loading}>
                        <Flag className="w-4 h-4 mr-1.5" />
                        Set priority
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {Object.entries(priorities).map(([key, priority]) => (
                        <DropdownMenuItem key={key} onClick={() => handleBulkSetPriority(key)}>
                          {priority.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <Button variant="ghost" size="sm" className="h-8 text-gray-600" onClick={handleMergeTickets} disabled={selectedTickets.size < 2 || loading}>
                    <GitMerge className="w-4 h-4 mr-1.5" />
                    Merge tickets
                  </Button>
                  {selectedTickets.size > 0 && (
                    <span className="ml-auto text-sm text-gray-600">
                      {selectedTickets.size} selected
                    </span>
                  )}
                </div>
              </div>

              {/* Tickets Display */}
              <div className="mt-6">
                {viewingTicketId ? (
                  <TicketDetailView
                    ticketId={viewingTicketId}
                    onBack={() => setViewingTicketId(null)}
                  />
                ) : ticketViewMode === 'table' ? (
                  <TicketsTableView
                    tickets={filteredTickets}
                    users={users}
                    selectedTickets={selectedTickets}
                    setSelectedTickets={setSelectedTickets}
                    onTicketClick={(ticket) => {
                      console.log('[Dashboard] onTicketClick called with ticket:', ticket.id);
                      setViewingTicketId(ticket.id);
                      console.log('[Dashboard] viewingTicketId set to:', ticket.id);
                    }}
                  />
                ) : filteredTickets.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
                    <p className="text-gray-600">
                      {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
                        ? 'Try adjusting your search or filter criteria'
                        : 'Create your first ticket to get started'
                      }
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredTickets.map((ticket) => (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        users={users}
                        currentUser={user}
                        onClick={() => setViewingTicketId(ticket.id)}
                      />
                    ))}
                  </div>
                )}
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
            </>
          )}

          {currentView === 'users' && isAdmin && (
            <UserManagementImproved users={users} currentUser={user} />
          )}
          {currentView === 'calendar' && (
            <IntegratedCalendar 
              currentUser={user}
              timezone={selectedTimezone}
              onTicketClick={(ticket) => setSelectedTicket(ticket)}
            />
          )}

          {currentView === 'billing' && isAdmin && (
            <XeroIntegration />
          )}

          {currentView === 'contacts' && (
            <ContactManager />
          )}

          {currentView === 'crm' && (
            <ErrorBoundary>
              <CRMDashboard timezone={selectedTimezone} />
            </ErrorBoundary>
          )}

          {currentView === 'quotes' && (
            <ErrorBoundary>
              <CRMDashboard timezone={selectedTimezone} defaultTab="quotes" />
            </ErrorBoundary>
          )}

          {currentView === 'crm-calendar' && (
            <CRMCalendar timezone={selectedTimezone} />
          )}

          {currentView === 'security' && (
            <SecuritySettings />
          )}

          {currentView === 'email-intake' && (
            <EmailIntakeSettings />
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          users={users}
          currentUser={user}
        />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticketId={selectedTicket.id}
          onClose={() => setSelectedTicket(null)}
        />
      )}

      {showEmailModal && (
        <EmailLogModal
          emailLogs={emailLogs}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {/* Ticket Field Customizer Modal */}
      <TicketFieldCustomizer 
        isOpen={showTicketCustomizer} 
        onClose={() => setShowTicketCustomizer(false)}
      />



      {showUserManagement && (
        <UserManagement
          isOpen={showUserManagement}
          onClose={() => setShowUserManagement(false)}
        />
      )}
      
      <AppVersion />
    </div>
  );
});

export default Dashboard;

