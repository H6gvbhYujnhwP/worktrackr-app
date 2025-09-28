import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthProvider.jsx';
import { useSimulation } from '../App.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
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
  User,
  Mail,
  Settings,
  Workflow,
  Bell,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { ticketStatuses, priorities, categories } from '../data/mockData.js';
import AppVersion from './AppVersion.jsx';
import TicketCard from './TicketCard.jsx';
import TicketDetailModal from './TicketDetailModal.jsx';
import CreateTicketModal from './CreateTicketModal.jsx';
import EmailLogModal from './EmailLogModal.jsx';
import TicketFieldCustomizer from './TicketFieldCustomizer.jsx';

import UserManagementImproved from './UserManagementImproved.jsx';
import IntegratedCalendar from './IntegratedCalendar.jsx';
import XeroIntegration from './XeroIntegration.jsx';
import CRMDashboard from './CRMDashboard.jsx';
import CRMCalendar from './CRMCalendar.jsx';
import ContactManager from './ContactManager.jsx';
import SecuritySettings from './SecuritySettings.jsx';

export default function Dashboard() {
  const { user, membership, logout } = useAuth();
  const { tickets, users, emailLogs } = useSimulation();
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
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
  const [lastUpdate, setLastUpdate] = useState(new Date());

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

  const filteredTickets = tickets.filter(ticket => {
    // Tab filter
    if (activeTab === 'open' && !['new', 'assigned', 'in_progress', 'waiting_approval'].includes(ticket.status)) {
      return false;
    }
    if (activeTab === 'completed' && ticket.status !== 'completed') {
      return false;
    }
    if (activeTab === 'parked' && ticket.status !== 'parked') {
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
    } else if (statusFilter === 'open' && !['new', 'assigned', 'in_progress', 'waiting_approval'].includes(ticket.status)) {
      return false;
    } else if (statusFilter === 'completed' && ticket.status !== 'completed') {
      return false;
    } else if (statusFilter === 'parked' && ticket.status !== 'parked') {
      return false;
    } else if (statusFilter !== 'all' && statusFilter !== 'my_tickets' && statusFilter !== 'open' && statusFilter !== 'completed' && statusFilter !== 'parked' && ticket.status !== statusFilter) {
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
    open: tickets.filter(t => ['new', 'assigned', 'in_progress', 'waiting_approval'].includes(t.status)).length,
    completed: tickets.filter(t => t.status === 'completed').length,
    parked: tickets.filter(t => t.status === 'parked').length,
    my_tickets: tickets.filter(t => t.assignedTo === user?.id).length
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
                <span className="text-xs sm:text-sm font-normal text-gray-500 ml-1 sm:ml-2 hidden sm:inline">Simulation</span>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name || 'User'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isAdmin ? 'Manage your organization and workflows' : 'View and manage your assigned tickets'}
          </p>
          <div className="text-xs text-gray-500 mt-1">
            Last updated: {lastUpdate.toLocaleTimeString()}
            <RefreshCw className="w-3 h-3 inline ml-1" />
          </div>
        </div>



        {/* Main Content */}
        <div className="space-y-6">
          {/* Navigation Tabs */}
          <Card>
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
                      <span>Booking Calendar</span>
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
              {/* Actions Bar */}
              <div className="space-y-4">
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Ticket
                  </Button>
                  
                  {isAdmin && (
                    <>
                      <Button variant="outline" onClick={() => setShowTicketCustomizer(true)} className="w-full sm:w-auto">
                        <Workflow className="w-4 h-4 mr-2" />
                        Customize your tickets
                      </Button>
                    </>
                  )}
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search tickets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full sm:w-64"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="flex-1 sm:w-32">
                        <SelectValue placeholder="My Tickets" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="my_tickets">My Tickets</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="parked">Parked</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="flex-1 sm:w-32">
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
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-1 sm:gap-3">
                  {/* My Tickets */}
                  <Card className="mobile-ticket-card">
                    <CardContent className="p-1 sm:p-4">
                      <div className="flex flex-col text-center">
                        <User className="w-3 h-3 sm:w-6 sm:h-6 text-purple-600 mx-auto mb-1 hidden sm:block" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-600 leading-none block sm:hidden">My Tickets</p>
                          <p className="text-xs font-medium text-gray-600 leading-none hidden sm:block">My Tickets</p>
                          <p className="text-xs sm:text-lg font-bold leading-none">{ticketCounts.my_tickets}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Open */}
                  <Card className="mobile-ticket-card">
                    <CardContent className="p-1 sm:p-4">
                      <div className="flex flex-col text-center">
                        <AlertCircle className="w-3 h-3 sm:w-6 sm:h-6 text-red-600 mx-auto mb-1 hidden sm:block" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-600 leading-none block sm:hidden">Open</p>
                          <p className="text-xs font-medium text-gray-600 leading-none hidden sm:block">Open</p>
                          <p className="text-xs sm:text-lg font-bold leading-none">{ticketCounts.open}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Parked */}
                  <Card className="mobile-ticket-card">
                    <CardContent className="p-1 sm:p-4">
                      <div className="flex flex-col text-center">
                        <Pause className="w-3 h-3 sm:w-6 sm:h-6 text-orange-600 mx-auto mb-1 hidden sm:block" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-600 leading-none block sm:hidden">Parked</p>
                          <p className="text-xs font-medium text-gray-600 leading-none hidden sm:block">Parked</p>
                          <p className="text-xs sm:text-lg font-bold leading-none">{ticketCounts.parked}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Completed */}
                  <Card className="mobile-ticket-card">
                    <CardContent className="p-1 sm:p-4">
                      <div className="flex flex-col text-center">
                        <CheckCircle className="w-3 h-3 sm:w-6 sm:h-6 text-green-600 mx-auto mb-1 hidden sm:block" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-600 leading-none block sm:hidden">Completed</p>
                          <p className="text-xs font-medium text-gray-600 leading-none hidden sm:block">Completed</p>
                          <p className="text-xs sm:text-lg font-bold leading-none">{ticketCounts.completed}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Tickets Display */}
              <div className="mt-6">
                {filteredTickets.length === 0 ? (
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
                        onClick={() => setSelectedTicket(ticket)}
                      />
                    ))}
                  </div>
                )}
              </div>
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
            <CRMDashboard timezone={selectedTimezone} />
          )}

          {currentView === 'crm-calendar' && (
            <CRMCalendar timezone={selectedTimezone} />
          )}

          {currentView === 'security' && (
            <SecuritySettings />
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
          ticket={selectedTicket}
          users={users}
          currentUser={user}
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
}

