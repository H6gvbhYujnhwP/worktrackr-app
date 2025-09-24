import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { mockUsers, mockTickets, mockWorkflows, mockOrganization } from './data/mockData.js';
import Dashboard from './components/Dashboard.jsx';
import WorkflowBuilder from './components/WorkflowBuilder.jsx';
import Login from './components/Login.jsx';
import './App.css';

// Auth context
const AuthContext = React.createContext();

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Simulation context for managing all data
const SimulationContext = React.createContext();

export const useSimulation = () => {
  const context = React.useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};

// Email simulation service
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
      sentAt: new Date().toISOString()
    };
    
    this.logs.unshift(email);
    
    // Simulate email notification in console
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
  }
};

// Simulation provider component
const SimulationProvider = ({ children }) => {
  const [tickets, setTickets] = useState(mockTickets);
  const [users, setUsers] = useState(mockUsers);
  const [workflows, setWorkflows] = useState(mockWorkflows);
  const [organization, setOrganization] = useState(mockOrganization);
  const [emailLogs, setEmailLogs] = useState([]);
  const [billingQueue, setBillingQueue] = useState([]);

  // Initialize booking calendar sync on component mount
  useEffect(() => {
    let cleanup = () => {};
    
    // Dynamically import and initialize booking sync
    import('./utils/initializeBookingSync.js').then(({ initializeBookingSync }) => {
      cleanup = initializeBookingSync();
    }).catch(error => {
      console.error('Error initializing booking sync:', error);
    });
    
    // Cleanup on unmount
    return cleanup;
  }, []);

  // Create booking calendar entry from ticket (following CRM calendar pattern)
  const createBookingFromTicket = (ticket) => {
    if (!ticket.scheduled_date) return;
    
    // Fix corrupted date format (50925-02-02 -> 2025-09-25)
    let dateString = ticket.scheduled_date;
    if (dateString.startsWith('50925-')) {
      dateString = dateString.replace('50925-', '2025-09-');
    }
    
    const scheduledDate = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(scheduledDate.getTime())) {
      console.error('[createBookingFromTicket] Invalid scheduled_date:', ticket.scheduled_date, 'corrected to:', dateString);
      return;
    }
    
    console.log('[createBookingFromTicket] Processing ticket with scheduled date:', dateString);
    
    const assignedUser = users?.find(u => u.id === ticket.assignedTo);
    
    const booking = {
      id: `BK-${ticket.id}`,
      ticketId: ticket.id,
      customerName: ticket.contactDetails?.companyName || ticket.contactDetails?.name || 'Unknown Customer',
      customerPhone: ticket.contactDetails?.phone || '',
      customerEmail: ticket.contactDetails?.email || '',
      service: ticket.title,
      date: scheduledDate.toISOString().split('T')[0],
      startTime: scheduledDate.toTimeString().slice(0, 5),
      endTime: new Date(scheduledDate.getTime() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5), // Default 2 hours
      duration: 120,
      location: ticket.contactDetails?.fullAddress || 'Location TBD',
      status: 'confirmed',
      price: 0, // Will be updated when billing is processed
      notes: ticket.description,
      invoiceStatus: 'pending',
      assignedTo: assignedUser?.name || 'Unassigned',
      priority: ticket.priority || 'medium'
    };
    
    // Save to localStorage following CRM calendar pattern
    const existingBookings = JSON.parse(localStorage.getItem('ticketBookings') || '[]');
    const updatedBookings = [...existingBookings, booking];
    localStorage.setItem('ticketBookings', JSON.stringify(updatedBookings));
    
    console.log('[App] Booking created from ticket:', booking);
  };

  // Update booking when ticket is updated
  const updateBookingFromTicket = (ticket) => {
    const existingBookings = JSON.parse(localStorage.getItem('ticketBookings') || '[]');
    const updatedBookings = existingBookings.map(booking => {
      if (booking.ticketId === ticket.id) {
        const scheduledDate = ticket.scheduled_date ? new Date(ticket.scheduled_date) : null;
        const assignedUser = users?.find(u => u.id === ticket.assignedTo);
        
        return {
          ...booking,
          customerName: ticket.contactDetails?.companyName || ticket.contactDetails?.name || booking.customerName,
          customerPhone: ticket.contactDetails?.phone || booking.customerPhone,
          customerEmail: ticket.contactDetails?.email || booking.customerEmail,
          service: ticket.title,
          date: scheduledDate ? scheduledDate.toISOString().split('T')[0] : booking.date,
          startTime: scheduledDate ? scheduledDate.toTimeString().slice(0, 5) : booking.startTime,
          endTime: scheduledDate ? new Date(scheduledDate.getTime() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5) : booking.endTime,
          location: ticket.contactDetails?.fullAddress || booking.location,
          notes: ticket.description,
          assignedTo: assignedUser?.name || 'Unassigned',
          priority: ticket.priority || booking.priority
        };
      }
      return booking;
    });
    
    localStorage.setItem('ticketBookings', JSON.stringify(updatedBookings));
  };

  // Create new ticket
  const createTicket = (ticketData) => {
    const newTicket = {
      id: `TKT-${String(tickets.length + 1).padStart(3, '0')}`,
      ...ticketData,
      status: ticketData.status || 'new', // Preserve status from ticketData
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
      attachments: [],
      workflowStage: ticketData.assignedTo ? 'awaiting_assignment' : 'awaiting_assignment'
    };
    
    setTickets(prev => [newTicket, ...prev]);
    
    // Create booking calendar entry if scheduled_date is provided
    if (ticketData.scheduled_date) {
      createBookingFromTicket(newTicket);
    }
    
    // Send email notification
    const email = emailService.sendEmail(
      'admin@worktrackr.com',
      `New Ticket Created: ${newTicket.title}`,
      'ticket_created',
      newTicket.id
    );
    setEmailLogs(prev => [email, ...prev]);
    
    return newTicket;
  };

  // Update ticket
  const updateTicket = (ticketId, updates) => {
    setTickets(prev => prev.map(ticket => {
      if (ticket.id === ticketId) {
        const updatedTicket = {
          ...ticket,
          ...updates,
          updatedAt: new Date().toISOString()
        };
        
        // Handle time tracking for work start/stop
        if (updates.workStarted && !ticket.workStarted) {
          updatedTicket.workSessions = ticket.workSessions || [];
          updatedTicket.currentWorkSession = {
            startTime: new Date().toISOString(),
            userId: updates.workStartedBy
          };
        }
        
        if (updates.workStopped && ticket.currentWorkSession) {
          const durationMs = Date.now() - new Date(ticket.currentWorkSession.startTime).getTime();
          const durationMinutes = Math.round(durationMs / (1000 * 60)); // Convert milliseconds to minutes
          
          const session = {
            ...ticket.currentWorkSession,
            endTime: new Date().toISOString(),
            duration: durationMinutes
          };
          updatedTicket.workSessions = [...(ticket.workSessions || []), session];
          updatedTicket.currentWorkSession = null;
          updatedTicket.totalWorkTime = (ticket.totalWorkTime || 0) + durationMinutes;
        }
        
        // Add to billing queue if ticket is completed
        if (updates.status === 'completed' && ticket.status !== 'completed') {
          const billingItem = {
            queueItemId: `billing-${ticketId}-${Date.now()}`,
            ticketId: ticketId,
            addedToQueueAt: new Date().toISOString(),
            ticketData: {
              customer: {
                name: updatedTicket.customerName || 'Unknown Customer',
                email: updatedTicket.customerEmail || 'unknown@example.com',
                phone: updatedTicket.customerPhone || 'N/A',
                address: {
                  line1: updatedTicket.customerAddress || 'N/A',
                  city: 'N/A',
                  postcode: 'N/A',
                  country: 'UK'
                }
              },
              service: {
                description: updatedTicket.title,
                category: updatedTicket.category || 'General',
                dateCompleted: updatedTicket.completedAt || new Date().toISOString(),
                timeSpent: updatedTicket.totalWorkTime ? `${Math.floor(updatedTicket.totalWorkTime / 60)}h ${updatedTicket.totalWorkTime % 60}m` : '0h 0m',
                hourlyRate: 75 // Default rate
              },
              billing: {
                laborCost: (updatedTicket.totalWorkTime || 0) * (75 / 60), // £75/hour
                materialCosts: [],
                travelCost: 0,
                totalBeforeTax: (updatedTicket.totalWorkTime || 0) * (75 / 60),
                taxRate: 20,
                taxAmount: ((updatedTicket.totalWorkTime || 0) * (75 / 60)) * 0.2,
                totalAmount: ((updatedTicket.totalWorkTime || 0) * (75 / 60)) * 1.2
              },
              customFields: {
                projectReference: updatedTicket.id
              }
            }
          };
          
          setBillingQueue(prev => [billingItem, ...prev]);
          console.log(`Ticket ${ticketId} added to billing queue`);
        }

        // Send email if status or assignment changed
        if (updates.status && updates.status !== ticket.status) {
          const assignee = users.find(u => u.id === updatedTicket.assignedTo);
          if (assignee) {
            const email = emailService.sendEmail(
              assignee.email,
              `Ticket Status Updated: ${updatedTicket.title}`,
              'status_changed',
              ticketId
            );
            setEmailLogs(prev => [email, ...prev]);
          }
        }
        
        if (updates.assignedTo && updates.assignedTo !== ticket.assignedTo) {
          const assignee = users.find(u => u.id === updates.assignedTo);
          if (assignee) {
            const email = emailService.sendEmail(
              assignee.email,
              `Ticket Assigned: ${updatedTicket.title}`,
              'ticket_assigned',
              ticketId
            );
            setEmailLogs(prev => [email, ...prev]);
          }
        }
        
        // Update booking calendar if scheduled_date is present
        if (updatedTicket.scheduled_date) {
          updateBookingFromTicket(updatedTicket);
        }
        
        return updatedTicket;
      }
      return ticket;
    }));
  };

  // Pass ticket to another user
  const passTicket = (ticketId, fromUserId, toUserId, reason = '') => {
    const ticket = tickets.find(t => t.id === ticketId);
    const fromUser = users.find(u => u.id === fromUserId);
    const toUser = users.find(u => u.id === toUserId);
    
    if (ticket && fromUser && toUser) {
      // Add comment about the pass
      const passComment = {
        id: `c-${Date.now()}`,
        author: fromUserId,
        authorName: fromUser.name,
        content: `Ticket passed to ${toUser.name}${reason ? `: ${reason}` : ''}`,
        createdAt: new Date().toISOString(),
        type: 'system'
      };
      
      updateTicket(ticketId, {
        assignedTo: toUserId,
        status: 'assigned',
        comments: [...ticket.comments, passComment]
      });
      
      // Send email to new assignee
      const email = emailService.sendEmail(
        toUser.email,
        `Ticket Passed to You: ${ticket.title}`,
        'ticket_passed',
        ticketId
      );
      setEmailLogs(prev => [email, ...prev]);
    }
  };

  // Add comment to ticket
  const addComment = (ticketId, authorId, content) => {
    const author = users.find(u => u.id === authorId);
    const comment = {
      id: `c-${Date.now()}`,
      author: authorId,
      authorName: author?.name || 'Unknown',
      content,
      createdAt: new Date().toISOString(),
      type: 'user'
    };
    
    setTickets(prev => prev.map(ticket => {
      if (ticket.id === ticketId) {
        const updatedComments = ticket.comments ? [...ticket.comments, comment] : [comment];
        return {
          ...ticket,
          comments: updatedComments,
          updatedAt: new Date().toISOString()
        };
      }
      return ticket;
    }));
    
    console.log('Comment added:', comment);
  };

  // Request approval
  const requestApproval = (ticketId, requesterId, reason = '') => {
    const ticket = tickets.find(t => t.id === ticketId);
    const requester = users.find(u => u.id === requesterId);
    const managers = users.filter(u => u.role === 'admin' || u.role === 'manager');
    
    if (ticket && requester && managers.length > 0) {
      updateTicket(ticketId, {
        status: 'waiting_approval',
        workflowStage: 'awaiting_authorization'
      });
      
      // Send approval request emails to all managers
      managers.forEach(manager => {
        const email = emailService.sendEmail(
          manager.email,
          `Approval Required: ${ticket.title}`,
          'approval_request',
          ticketId
        );
        setEmailLogs(prev => [email, ...prev]);
      });
      
      // Add system comment
      const approvalComment = {
        id: `c-${Date.now()}`,
        author: requesterId,
        authorName: requester.name,
        content: `Approval requested${reason ? `: ${reason}` : ''}`,
        createdAt: new Date().toISOString(),
        type: 'system'
      };
      
      addComment(ticketId, requesterId, approvalComment.content);
    }
  };

  // Approve/deny ticket
  const processApproval = (ticketId, approverId, decision, reason = '') => {
    const approver = users.find(u => u.id === approverId);
    const ticket = tickets.find(t => t.id === ticketId);
    
    if (ticket && approver) {
      const newStatus = decision === 'approved' ? 'assigned' : 'parked';
      const newStage = decision === 'approved' ? 'work_in_progress' : 'awaiting_authorization';
      
      updateTicket(ticketId, {
        status: newStatus,
        workflowStage: newStage
      });
      
      // Add approval comment
      const approvalComment = {
        id: `c-${Date.now()}`,
        author: approverId,
        authorName: approver.name,
        content: `Ticket ${decision}${reason ? `: ${reason}` : ''}`,
        createdAt: new Date().toISOString(),
        type: 'system'
      };
      
      addComment(ticketId, approverId, approvalComment.content);
      
      // Send email to original assignee
      if (ticket.assignedTo) {
        const assignee = users.find(u => u.id === ticket.assignedTo);
        if (assignee) {
          const email = emailService.sendEmail(
            assignee.email,
            `Ticket ${decision}: ${ticket.title}`,
            'approval_decision',
            ticketId
          );
          setEmailLogs(prev => [email, ...prev]);
        }
      }
    }
  };

  const updateOrganization = (updatedOrg) => {
    setOrganization(updatedOrg);
  };

  const value = {
    tickets,
    users,
    workflows,
    organization,
    emailLogs,
    billingQueue,
    setBillingQueue,
    createTicket,
    updateTicket,
    passTicket,
    addComment,
    requestApproval,
    processApproval,
    setWorkflows,
    setUsers,
    updateOrganization,
    addEmailLog: (email) => setEmailLogs(prev => [email, ...prev]),
    emailService
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};

// Auth provider component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = (email, password) => {
    setLoading(true);
    // Simulate login
    setTimeout(() => {
      const foundUser = mockUsers.find(u => u.email === email);
      if (foundUser) {
        setUser(foundUser);
      }
      setLoading(false);
    }, 1000);
  };

  const logout = () => {
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected route component
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && user.role !== requiredRole && !user.isOrgOwner) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <SimulationProvider>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/workflow-builder" 
                element={
                  <ProtectedRoute>
                    <WorkflowBuilder />
                  </ProtectedRoute>
                } 
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </SimulationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

