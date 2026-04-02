// web/client/src/app/src/components/Dashboard.jsx
// REDESIGN Push 2: Removed duplicate inner header (now in AppLayout TopBar).
// Replaced coloured badge pills with compact tab chips.
// Compact inline stats row replaces nothing (was never big cards — those were in spec for future).
// All logic, state, modals, and child components completely unchanged.

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useAuth } from '../../../context/AuthProvider.jsx';
import { useSimulation } from '../App.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.jsx';
import {
  Plus, Search, Users, Ticket, Clock, CheckCircle, AlertCircle,
  X, User, Mail, Settings, Workflow, Bell, RefreshCw, Calendar,
  Trash2, UserPlus, Flag, GitMerge, ChevronDown, Package, LogOut,
  Building2
} from 'lucide-react';
import { priorities } from '../data/mockData.js';
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

// ─── Status chip style ────────────────────────────────────────────────────────
const chipBase = 'text-[12px] font-medium px-3 py-1.5 rounded-md border transition-colors cursor-pointer whitespace-nowrap';
const chipActive = 'bg-[#f9fafb] text-[#1d1d1f] border-[#e5e7eb]';
const chipInactive = 'text-[#6b7280] border-transparent hover:bg-[#f9fafb]';

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, count, iconBg, iconColor, Icon, onClick, active }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-2.5 px-4 py-3 bg-white rounded-xl border cursor-pointer
                transition-all flex-1 min-w-[120px]
                ${active ? 'border-[#d4a017] shadow-sm' : 'border-[#e5e7eb] hover:border-[#d4a017]'}`}
  >
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
      <Icon className={`w-[16px] h-[16px] ${iconColor}`} />
    </div>
    <div>
      <div className="text-[20px] font-bold text-[#1d1d1f] leading-none">{count}</div>
      <div className="text-[11px] font-medium text-[#9ca3af] mt-0.5">{label}</div>
    </div>
  </div>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = forwardRef(({ currentView, onViewChange }, ref) => {
  const { user, membership, logout } = useAuth();
  const { tickets, users, emailLogs, bulkUpdateTickets, bulkDeleteTickets } = useSimulation();

  const [activeTab, setActiveTab]             = useState('all_open');
  const [searchTerm, setSearchTerm]           = useState('');
  const [priorityFilter, setPriorityFilter]   = useState('all');
  const [assigneeFilter, setAssigneeFilter]   = useState('all');
  const [selectedTicket, setSelectedTicket]   = useState(null);
  const [viewingTicketId, setViewingTicketId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEmailModal, setShowEmailModal]   = useState(false);
  const [showTicketCustomizer, setShowTicketCustomizer] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState(new Set());
  const [loading, setLoading]                 = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState(
    () => localStorage.getItem('worktrackr-timezone') || 'Europe/London'
  );
  const [ticketViewMode] = useState(
    () => localStorage.getItem('worktrackr-ticket-view-mode') || 'table'
  );

  useImperativeHandle(ref, () => ({
    clearViewingTicket: () => setViewingTicketId(null)
  }));

  // Loading guard
  if (user === undefined || membership === undefined) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4a017] mx-auto" />
          <p className="mt-2 text-[#9ca3af] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';

  // ── Ticket counts ──────────────────────────────────────────────────────────
  const ticketCounts = {
    all:        tickets.length,
    open:       tickets.filter(t => t.status === 'open').length,
    in_progress:tickets.filter(t => t.status === 'in_progress').length,
    pending:    tickets.filter(t => t.status === 'pending').length,
    closed:     tickets.filter(t => t.status === 'closed').length,
    resolved:   tickets.filter(t => t.status === 'resolved').length,
    all_open:   tickets.filter(t => ['open','in_progress','pending'].includes(t.status)).length,
    my_tickets: tickets.filter(t => t.assignedTo === user?.id).length,
  };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredTickets = tickets.filter(ticket => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        ticket.title?.toLowerCase().includes(q) ||
        ticket.description?.toLowerCase().includes(q) ||
        ticket.contactDetails?.contact_name?.toLowerCase().includes(q) ||
        ticket.contactDetails?.company_name?.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'open'        && ticket.status !== 'open')        return false;
    if (activeTab === 'in_progress' && ticket.status !== 'in_progress') return false;
    if (activeTab === 'pending'     && ticket.status !== 'pending')     return false;
    if (activeTab === 'closed'      && ticket.status !== 'closed')      return false;
    if (activeTab === 'resolved'    && ticket.status !== 'resolved')    return false;
    if (activeTab === 'all_open'    && !['open','in_progress','pending'].includes(ticket.status)) return false;
    if (activeTab === 'my_tickets'  && ticket.assignedTo !== user?.id)  return false;
    if (priorityFilter !== 'all'    && ticket.priority !== priorityFilter) return false;
    if (assigneeFilter !== 'all'    && ticket.assignedTo !== assigneeFilter) return false;
    return true;
  });

  // ── Bulk actions ───────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedTickets.size} ticket(s)? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await bulkDeleteTickets(Array.from(selectedTickets));
      setSelectedTickets(new Set());
    } catch (e) { alert('Failed to delete tickets.'); }
    finally { setLoading(false); }
  };

  const handleAssignConfirm = async (userId) => {
    setLoading(true);
    try {
      await bulkUpdateTickets(Array.from(selectedTickets), { assigneeId: userId });
      setSelectedTickets(new Set());
      setShowAssignModal(false);
    } catch (e) { alert(`Failed to assign: ${e.message}`); }
    finally { setLoading(false); }
  };

  const handleBulkSetStatus = async (status) => {
    setLoading(true);
    try { await bulkUpdateTickets(Array.from(selectedTickets), { status }); setSelectedTickets(new Set()); }
    catch (e) { alert('Failed to update status.'); }
    finally { setLoading(false); }
  };

  const handleBulkSetPriority = async (priority) => {
    setLoading(true);
    try { await bulkUpdateTickets(Array.from(selectedTickets), { priority }); setSelectedTickets(new Set()); }
    catch (e) { alert('Failed to update priority.'); }
    finally { setLoading(false); }
  };

  const handleMergeTickets = () => {
    if (selectedTickets.size < 2) { alert('Select at least 2 tickets to merge'); return; }
    alert('Merge functionality coming soon!');
  };

  const setTab = (tab) => { setActiveTab(tab); setSearchTerm(''); setViewingTicketId(null); };

  // ── Tickets view ───────────────────────────────────────────────────────────
  const TicketsView = () => (
    <>
      {/* ── Inline stat cards ── */}
      <div className="flex flex-wrap gap-3 mb-5">
        <StatCard label="All open"   count={ticketCounts.all_open}   Icon={Ticket}       iconBg="bg-[#f3f4f6]"  iconColor="text-[#6b7280]" onClick={() => setTab('all_open')}   active={activeTab==='all_open'} />
        <StatCard label="Open"       count={ticketCounts.open}       Icon={CheckCircle}  iconBg="bg-[#dcfce7]"  iconColor="text-[#16a34a]" onClick={() => setTab('open')}       active={activeTab==='open'} />
        <StatCard label="In progress"count={ticketCounts.in_progress}Icon={Clock}        iconBg="bg-[#dbeafe]"  iconColor="text-[#1d4ed8]" onClick={() => setTab('in_progress')} active={activeTab==='in_progress'} />
        <StatCard label="Pending"    count={ticketCounts.pending}    Icon={AlertCircle}  iconBg="bg-[#fef3c7]"  iconColor="text-[#d97706]" onClick={() => setTab('pending')}    active={activeTab==='pending'} />
        <StatCard label="Resolved"   count={ticketCounts.resolved}   Icon={CheckCircle}  iconBg="bg-[#dbeafe]"  iconColor="text-[#1d4ed8]" onClick={() => setTab('resolved')}   active={activeTab==='resolved'} />
        <StatCard label="Closed"     count={ticketCounts.closed}     Icon={X}            iconBg="bg-[#f3f4f6]"  iconColor="text-[#6b7280]" onClick={() => setTab('closed')}     active={activeTab==='closed'} />
      </div>

      {/* ── Table container ── */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-3.5 border-b border-[#e5e7eb]">
          {/* Tab pills */}
          {[
            { key: 'all_open',    label: 'All open',    count: ticketCounts.all_open },
            { key: 'my_tickets',  label: 'My tickets',  count: ticketCounts.my_tickets },
            { key: 'in_progress', label: 'In progress', count: ticketCounts.in_progress },
            { key: 'pending',     label: 'Pending',     count: ticketCounts.pending },
            { key: 'resolved',    label: 'Resolved',    count: ticketCounts.resolved },
            { key: 'closed',      label: 'Closed',      count: ticketCounts.closed },
            { key: 'all',         label: 'All',         count: ticketCounts.all },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={`${chipBase} ${activeTab === tab.key ? chipActive : chipInactive}`}
            >
              {tab.label}
              <span className={`ml-1 text-[10px] ${activeTab === tab.key ? 'text-[#d4a017] font-bold' : 'text-[#9ca3af]'}`}>
                {tab.count}
              </span>
            </button>
          ))}

          {/* Right tools */}
          <div className="ml-auto flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af]" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search tickets..."
                className="pl-8 pr-3 py-1.5 text-[12px] border border-[#e5e7eb] rounded-md bg-white
                           text-[#1d1d1f] placeholder:text-[#9ca3af] focus:outline-none
                           focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017] w-[180px]"
              />
            </div>

            {isAdmin && (
              <button
                onClick={() => setShowTicketCustomizer(true)}
                className="text-[12px] text-[#6b7280] border border-[#e5e7eb] bg-white px-3 py-1.5
                           rounded-md flex items-center gap-1 hover:border-[#d1d5db] transition-colors"
              >
                <Workflow className="w-3.5 h-3.5" /> Customize
              </button>
            )}

            <button
              onClick={() => setShowCreateModal(true)}
              className="text-[13px] font-semibold bg-[#d4a017] text-[#111] px-4 py-1.5 rounded-md
                         hover:bg-[#c4920f] transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> New ticket
            </button>
          </div>
        </div>

        {/* Bulk action bar — only shown when rows selected */}
        {selectedTickets.size > 0 && (
          <div className="flex items-center gap-2 px-5 py-2 bg-[#fef9ee] border-b border-[#e5e7eb]">
            <span className="text-[12px] font-medium text-[#92400e]">{selectedTickets.size} selected</span>
            <div className="flex items-center gap-1 ml-2">
              <button onClick={handleBulkDelete} disabled={loading}
                className="text-[12px] text-[#6b7280] hover:text-red-600 px-2 py-1 rounded flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button onClick={() => setShowAssignModal(true)} disabled={loading}
                className="text-[12px] text-[#6b7280] hover:text-[#1d1d1f] px-2 py-1 rounded flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5" /> Assign
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button disabled={loading}
                    className="text-[12px] text-[#6b7280] hover:text-[#1d1d1f] px-2 py-1 rounded flex items-center gap-1">
                    <Settings className="w-3.5 h-3.5" /> Status <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {['open','in_progress','pending','resolved','closed'].map(s => (
                    <DropdownMenuItem key={s} onClick={() => handleBulkSetStatus(s)}>
                      {s.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button disabled={loading}
                    className="text-[12px] text-[#6b7280] hover:text-[#1d1d1f] px-2 py-1 rounded flex items-center gap-1">
                    <Flag className="w-3.5 h-3.5" /> Priority <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {Object.entries(priorities).map(([key, p]) => (
                    <DropdownMenuItem key={key} onClick={() => handleBulkSetPriority(key)}>
                      {p.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <button onClick={handleMergeTickets} disabled={selectedTickets.size < 2 || loading}
                className="text-[12px] text-[#6b7280] hover:text-[#1d1d1f] px-2 py-1 rounded flex items-center gap-1">
                <GitMerge className="w-3.5 h-3.5" /> Merge
              </button>
            </div>
            <button onClick={() => setSelectedTickets(new Set())}
              className="ml-auto text-[#9ca3af] hover:text-[#6b7280]">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tickets table or detail view */}
        {viewingTicketId ? (
          <div className="p-6">
            <TicketDetailView
              ticketId={viewingTicketId}
              onBack={() => { setViewingTicketId(null); setActiveTab('all_open'); }}
            />
          </div>
        ) : (
          <TicketsTableView
            tickets={filteredTickets}
            users={users}
            selectedTickets={selectedTickets}
            setSelectedTickets={setSelectedTickets}
            onTicketClick={(ticket) => setViewingTicketId(ticket.id)}
          />
        )}
      </div>

      {showAssignModal && (
        <AssignTicketsModal
          users={users}
          ticketIds={Array.from(selectedTickets)}
          onAssign={handleAssignConfirm}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </>
  );

  // ── Render by view ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-0">
      {currentView === 'tickets'        && <TicketsView />}
      {currentView === 'users' && isAdmin && <UserManagementImproved users={users} currentUser={user} />}
      {currentView === 'calendar'       && (
        <IntegratedCalendar
          currentUser={user}
          timezone={selectedTimezone}
          onTicketClick={(ticket) => { setViewingTicketId(ticket.id); onViewChange('tickets'); }}
        />
      )}
      {currentView === 'billing' && isAdmin && <XeroIntegration />}
      {currentView === 'contacts'       && <ContactManager />}
      {currentView === 'crm'            && <ErrorBoundary><CRMDashboard timezone={selectedTimezone} /></ErrorBoundary>}
      {currentView === 'product-catalog'&& <ErrorBoundary><CRMDashboard timezone={selectedTimezone} defaultTab="catalog" /></ErrorBoundary>}
      {currentView === 'quotes'         && <ErrorBoundary><CRMDashboard timezone={selectedTimezone} defaultTab="quotes" /></ErrorBoundary>}
      {currentView === 'crm-calendar'   && <CRMCalendar timezone={selectedTimezone} />}
      {currentView === 'security'       && <SecuritySettings />}
      {currentView === 'email-intake'   && <EmailIntakeSettings />}
      {currentView === 'pricing-config' && (
        <ErrorBoundary>
          <div className="bg-white rounded-xl border border-[#e5e7eb] p-8 text-center">
            <Settings className="w-10 h-10 text-[#d4a017] mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-[#1d1d1f] mb-2">Pricing Configuration</h2>
            <p className="text-[#9ca3af] text-sm">Configure your organisation's pricing settings and tiers. Feature under active development.</p>
          </div>
        </ErrorBoundary>
      )}

      {/* ── Modals ── */}
      {showCreateModal && (
        <CreateTicketModal onClose={() => setShowCreateModal(false)} users={users} currentUser={user} />
      )}
      {selectedTicket && (
        <TicketDetailModal ticketId={selectedTicket.id} onClose={() => setSelectedTicket(null)} />
      )}
      {showEmailModal && (
        <EmailLogModal emailLogs={emailLogs} onClose={() => setShowEmailModal(false)} />
      )}
      <TicketFieldCustomizer isOpen={showTicketCustomizer} onClose={() => setShowTicketCustomizer(false)} />
      <AppVersion />
    </div>
  );
});

export default Dashboard;
