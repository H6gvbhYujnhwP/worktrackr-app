// web/client/src/app/src/App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { mockUsers, mockTickets, mockWorkflows, mockOrganization } from './data/mockData.js';
import Dashboard from './components/Dashboard.jsx';
import WorkflowBuilder from './components/WorkflowBuilder.jsx';
import Login from '../../Login.jsx';
import './App.css';

// ✅ Corrected imports: api.ts and map.ts live one level up from /src/
import { TicketsAPI } from '../api';
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

  // Load tickets from backend on mount
  useEffect(() => {
    (async () => {
      try {
        const { tickets: serverTickets } = await TicketsAPI.list();
        setTickets(serverTickets || []);
      } catch (e) {
        console.error('[SimulationProvider] Failed to load tickets from API', e);
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
    createTicket,
    updateTicket,
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
        
        // If user has membership, get organization details
        if (data.membership) {
          await fetchOrganization();
        }
      } else {
        setUser(null);
        setOrganization(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
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
        
        if (data.membership) {
          await fetchOrganization(data.membership.organisation_id);
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
      setOrganization(null);
    }
  };

  const value = {
    user,
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
            <Route path="/login" element={<Login />} />
            <Route
              path="/app/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/workflow-builder"
              element={
                <ProtectedRoute>
                  <WorkflowBuilder />
                </ProtectedRoute>
              }
            />
            <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
            <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
          </Routes>
        </div>
      </SimulationProvider>
    </AuthProvider>
  );
}
