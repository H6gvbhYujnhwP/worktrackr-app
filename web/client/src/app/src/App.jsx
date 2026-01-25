// web/client/src/app/src/App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { mockUsers, mockTickets, mockWorkflows, mockOrganization } from './data/mockData.js';
import DashboardWithLayout from './components/DashboardWithLayout.jsx';
import WorkflowBuilder from './components/WorkflowBuilder.jsx';
import QuoteDetails from './components/QuoteDetails.jsx';
import QuoteForm from './components/QuoteForm.jsx';
import QuotesList from './components/QuotesList.jsx';
import QuotesListWithLayout from './components/QuotesListWithLayout.jsx';
import QuoteFormWithLayout from './components/QuoteFormWithLayout.jsx';
import QuoteDetailsWithLayout from './components/QuoteDetailsWithLayout.jsx';
import PricingConfigWithLayout from './components/PricingConfigWithLayout.jsx';
import Login from '../../Login.jsx';
import './App.css';

// ✅ Corrected imports: api.ts and map.ts live one level up from /src/
import { TicketsAPI, UsersAPI } from '../api';
import { toApiTicket } from '../map';

// ---------------- Auth context ----------------
const AuthContext = React.createContext();
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// ---------------- Simulation context ----------------
const SimulationContext = React.createContext();
export const useSimulation = () => {
  const context = React.useContext(SimulationContext);
  if (!context) throw new Error('useSimulation must be used within a SimulationProvider');
  return context;
};

// ---------------- Email simulation (unchanged) ----------------
const emailService = {
  logs: [],
  sendEmail(to, subject, template, ticketId = null) {
    const email = {
      id: `email-${Date.now()}`,
      ticketId,
      to,
      subject,
      template,
      status: 'sent',
      sentAt: new Date().toISOString(),
    };
    this.logs.unshift(email);
    console.log(`📧 EMAIL SENT:
To: ${to}
Subject: ${subject}
Template: ${template}
Ticket: ${ticketId || 'N/A'}
Time: ${new Date().toLocaleString()}`);
    return email;
  },
  getLogs() {
    return this.logs;
  },
};

// ---------------- Simulation provider ----------------
const SimulationProvider = ({ children }) => {
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState(mockUsers);
  const [workflows, setWorkflows] = useState(mockWorkflows);
  const [organization, setOrganization] = useState(mockOrganization);
  const [emailLogs, setEmailLogs] = useState([]);
  const [billingQueue, setBillingQueue] = useState([]);

  // Load tickets, users, and organization from backend on mount
  useEffect(() => {
    (async () => {
      try {
        const { tickets: serverTickets } = await TicketsAPI.list();
        // Transform API response: assignee_id → assignedTo for frontend compatibility
        const transformedTickets = (serverTickets || []).map(ticket => ({
          ...ticket,
          assignedTo: ticket.assignee_id,
          assignedUser: ticket.assignee_name
        }));
        setTickets(transformedTickets);
        console.log('✅ Loaded tickets from API:', transformedTickets?.length);
      } catch (e) {
        console.error('[SimulationProvider] Failed to load tickets from API', e);
      }
      
      try {
        const { users: serverUsers } = await UsersAPI.list();
        setUsers(serverUsers || []);
        console.log('✅ Loaded users from API:', serverUsers?.length, serverUsers);
      } catch (e) {
        console.error('[SimulationProvider] Failed to load users from API', e);
        console.log('⚠️ Falling back to mock users');
      }
      
      // Load real organization data from backend
      try {
        const response = await fetch('/api/organizations/current');
        if (response.ok) {
          const orgData = await response.json();
          setOrganization(orgData.organization);
          console.log('✅ Loaded organization from API:', orgData.organization);
        } else {
          console.error('[SimulationProvider] Failed to load organization:', response.status);
          console.log('⚠️ Falling back to mock organization');
        }
      } catch (e) {
        console.error('[SimulationProvider] Failed to load organization from API', e);
        console.log('⚠️ Falling back to mock organization');
      }
    })();
  }, []);

  // Initialize booking calendar sync
  useEffect(() => {
    let cleanup = () => {};
    import('./utils/initializeBookingSync.js')
      .then(({ initializeBookingSync }) => {
        cleanup = initializeBookingSync();
      })
      .catch((error) => {
        console.error('Error initializing booking sync:', error);
      });
    return cleanup;
  }, []);

  // Create booking from ticket
  const createBookingFromTicket = (ticket) => {
    if (!ticket.scheduled_date) return;

    let dateString = ticket.scheduled_date;
    if (dateString.startsWith('50925-')) {
      dateString = dateString.replace('50925-', '2025-09-');
    }
    const scheduledDate = new Date(dateString);
    if (isNaN(scheduledDate.getTime())) {
      console.error(
        '[createBookingFromTicket] Invalid scheduled_date:',
        ticket.scheduled_date,
        'corrected to:',
        dateString
      );
      return;
    }

    console.log('[createBookingFromTicket] Processing ticket with scheduled date:', dateString);

    const assignedUser = users?.find((u) => u.id === ticket.assignedTo);

    const booking = {
      id: `BK-${ticket.id}`,
      ticketId: ticket.id,
      customerName: ticket.contactDetails?.companyName || ticket.contactDetails?.name || 'Unknown Customer',
      customerPhone: ticket.contactDetails?.phone || '',
      customerEmail: ticket.contactDetails?.email || '',
      service: ticket.title,
      date: scheduledDate.toISOString().split('T')[0],
      time: '09:00',
      duration: ticket.scheduled_duration_mins || 60,
      location: ticket.location || 'On-site',
      priority: ticket.priority || 'medium',
      status: 'scheduled',
      notes: ticket.description,
      assignedTo: assignedUser?.name || 'Unassigned',
      metadata: {
        sector: ticket.sector || 'General',
        reference: ticket.id,
      },
    };

    const existingBookings = JSON.parse(localStorage.getItem('ticketBookings') || '[]');
    const updatedBookings = [...existingBookings, booking];
    localStorage.setItem('ticketBookings', JSON.stringify(updatedBookings));

    console.log('[App] Booking created from ticket:', booking);
  };

  // Update booking from ticket
  const updateBookingFromTicket = (ticket) => {
    if (!ticket.scheduled_date) return;
    const assignedUser = users?.find((u) => u.id === ticket.assignedTo);
    const existingBookings = JSON.parse(localStorage.getItem('ticketBookings') || '[]');
    const updatedBookings = existingBookings.map((booking) => {
      if (booking.ticketId === ticket.id) {
        return {
          ...booking,
          date: new Date(ticket.scheduled_date).toISOString().split('T')[0],
          duration: ticket.scheduled_duration_mins || booking.duration,
          notes: ticket.description,
          assignedTo: assignedUser?.name || 'Unassigned',
          priority: ticket.priority || booking.priority,
        };
      }
      return booking;
    });

    localStorage.setItem('ticketBookings', JSON.stringify(updatedBookings));
  };

  // Create ticket (persist to backend)
  const createTicket = async (ticketData) => {
    try {
      const payload = toApiTicket(ticketData);
      const { ticket } = await TicketsAPI.create(payload);
      setTickets((prev) => [ticket, ...prev]);
      if (ticket.scheduled_date) {
        createBookingFromTicket(ticket);
      }
      return ticket;
    } catch (e) {
      console.error('[createTicket] API error', e);
      throw e;
    }
  };

  // Update ticket (persist to backend)
  const updateTicket = async (ticketId, updates) => {
    try {
      const { ticket: updatedFromServer } = await TicketsAPI.update(ticketId, updates);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, ...updatedFromServer } : t)));
      if (updatedFromServer?.scheduled_date) {
        updateBookingFromTicket(updatedFromServer);
      }
    } catch (e) {
      console.error('[updateTicket] API error', e);
      throw e;
    }
  };

  // Delete ticket (persist to backend)
  const deleteTicket = async (ticketId) => {
    try {
      await TicketsAPI.delete(ticketId);
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    } catch (e) {
      console.error('[deleteTicket] API error', e);
      throw e;
    }
  };

  // Bulk update tickets
  const bulkUpdateTickets = async (ticketIds, updates) => {
    console.log('🔧 bulkUpdateTickets called:', { ticketIds, updates, updatesType: typeof updates, updatesKeys: Object.keys(updates) });
    try {
      await TicketsAPI.bulkUpdate(ticketIds, updates);
      // Refresh tickets list
      const { tickets: serverTickets } = await TicketsAPI.list();
      setTickets(serverTickets || []);
    } catch (e) {
      console.error('[bulkUpdateTickets] API error', e);
      throw e;
    }
  };

  // Bulk delete tickets
  const bulkDeleteTickets = async (ticketIds) => {
    try {
      await TicketsAPI.bulkDelete(ticketIds);
      setTickets((prev) => prev.filter((t) => !ticketIds.includes(t.id)));
    } catch (e) {
      console.error('[bulkDeleteTickets] API error', e);
      throw e;
    }
  };

  // Add comment to ticket
  const addComment = (ticketId, authorId, content, type = 'comment') => {
    setTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.id === ticketId) {
          const newComment = {
            id: `CMT-${Date.now()}`,
            author: authorId,
            authorName: users.find((u) => u.id === authorId)?.name || 'Unknown User',
            content,
            createdAt: new Date().toISOString(),
            type,
          };

          return {
            ...ticket,
            comments: [newComment, ...(ticket.comments || [])],
            updatedAt: new Date().toISOString(),
          };
        }
        return ticket;
      })
    );
  };

  // Assign ticket
  const assignTicket = (ticketId, userId) => {
    updateTicket(ticketId, {
      assignedTo: userId,
      status: 'awaiting_assignment',
    });

    const user = users.find((u) => u.id === userId);
    if (user) {
      const ticket = tickets.find((t) => t.id === ticketId);
      const email = emailService.sendEmail(
        user.email,
        `Ticket Assigned: ${ticket?.title || 'Unknown Ticket'}`,
        'ticket_assigned',
        ticketId
      );
      setEmailLogs((prev) => [email, ...prev]);
    }
  };

  // Request approval
  const requestApproval = (ticketId, requesterId, reason = '') => {
    const ticket = tickets.find((t) => t.id === ticketId);
    const requester = users.find((u) => u.id === requesterId);
    const managers = users.filter((u) => u.role === 'admin' || u.role === 'manager');

    if (ticket && requester && managers.length > 0) {
      updateTicket(ticketId, {
        status: 'waiting_approval',
        workflowStage: 'awaiting_authorization',
      });

      managers.forEach((manager) => {
        const email = emailService.sendEmail(manager.email, `Approval Request: ${ticket.title}`, 'approval_request', ticketId);
        setEmailLogs((prev) => [email, ...prev]);
      });

      addComment(ticketId, requesterId, `Approval requested${reason ? `: ${reason}` : ''}`, 'system');
    }
  };

  // Approve/deny
  const processApproval = (ticketId, approverId, decision, reason = '') => {
    const approver = users.find((u) => u.role === 'admin' || u.role === 'manager');
    const ticket = tickets.find((t) => t.id === ticketId);

    if (ticket && approver) {
      const status = decision === 'approve' ? 'approved' : 'denied';
      updateTicket(ticketId, {
        status,
        approverId,
        approvalDecision: decision,
        approvalReason: reason,
      });

      const email = emailService.sendEmail(
        ticket.requester?.email || 'notifications@worktrackr.cloud',
        `Ticket ${decision.toUpperCase()}: ${ticket.title}`,
        'approval_result',
        ticketId
      );
      setEmailLogs((prev) => [email, ...prev]);

      addComment(ticketId, approverId, `Ticket ${decision}${reason ? `: ${reason}` : ''}`, 'system');
    }
  };

  const simulationValue = {
    tickets,
    users,
    workflows,
    organization,
    emailLogs,
    billingQueue,
    setUsers,
    setOrganization,
    updateOrganization: setOrganization,
    emailService,
    createTicket,
    updateTicket,
    deleteTicket,
    bulkUpdateTickets,
    bulkDeleteTickets,
    addComment,
    assignTicket,
    requestApproval,
    processApproval,
  };

  return <SimulationContext.Provider value={simulationValue}>{children}</SimulationContext.Provider>;
};

// ---------------- Auth provider (real API) ----------------
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState(null);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setMembership(data.membership);
        
        // If user has membership, get organization details
        if (data.membership) {
          await fetchOrganization();
        }
      } else {
        setUser(null);
        setMembership(null);
        setOrganization(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setMembership(null);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganization = async () => {
    try {
      const response = await fetch('/api/organizations/current', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrganization(data.organization);
      }
    } catch (error) {
      console.error('Failed to fetch organization:', error);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setMembership(data.membership);
        
        if (data.membership) {
          await fetchOrganization(data.membership.orgId);
        }
        
        return { success: true, user: data.user };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setMembership(null);
      setOrganization(null);
    }
  };

  const value = {
    user,
    membership,
    organization,
    loading,
    login,
    logout,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ---------------- Protected route ----------------
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// ---------------- Main Manus App (NO BrowserRouter here) ----------------
export default function App() {
  return (
    <AuthProvider>
      <SimulationProvider>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route
              path="dashboard"
              element={<DashboardWithLayout />}
            />
            <Route
              path="workflow-builder"
              element={<WorkflowBuilder />}
            />
            <Route
              path="crm/quotes"
              element={<QuotesListWithLayout />}
            />
            <Route
              path="crm/quotes/new"
              element={<QuoteFormWithLayout mode="create" />}
            />
            <Route
              path="crm/quotes/:id"
              element={<QuoteDetailsWithLayout />}
            />
            <Route
              path="crm/quotes/:id/edit"
              element={<QuoteFormWithLayout mode="edit" />}
            />
            <Route
              path="settings/pricing-config"
              element={<PricingConfigWithLayout />}
            />
            <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
          </Routes>
        </div>
      </SimulationProvider>
    </AuthProvider>
  );
}
