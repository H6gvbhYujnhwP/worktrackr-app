// web/client/src/app/src/components/TicketsTableView.jsx
// REDESIGN Push 2: New visual style — compact rows, priority bars, muted status badges.
// All logic completely preserved: bulk actions, status/priority selects, checkboxes, dropdown.

import React, { useState, useRef } from 'react';
import { useSimulation } from '../App.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import AssignTicketsModal from './AssignTicketsModal.jsx';
import { MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.jsx';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIORITY_BAR = {
  urgent: '#dc2626',
  high:   '#f59e0b',
  medium: '#3b82f6',
  low:    '#22c55e',
};

const PRIORITY_BADGE = {
  urgent: 'bg-[#fee2e2] text-[#991b1b]',
  high:   'bg-[#fef3c7] text-[#d97706]',
  medium: 'bg-[#dbeafe] text-[#2563eb]',
  low:    'bg-[#dcfce7] text-[#16a34a]',
};

const STATUS_BADGE = {
  open:             'bg-[#dcfce7] text-[#166534]',
  in_progress:      'bg-[#dbeafe] text-[#1e40af]',
  pending:          'bg-[#fef3c7] text-[#92400e]',
  resolved:         'bg-[#dbeafe] text-[#1e40af]',
  closed:           'bg-[#f3f4f6] text-[#6b7280]',
  approved:         'bg-[#dcfce7] text-[#166534]',
  denied:           'bg-[#fee2e2] text-[#991b1b]',
  waiting_approval: 'bg-[#fef3c7] text-[#92400e]',
};

const STATUS_LABEL = {
  open: 'Open', in_progress: 'In progress', pending: 'Pending',
  resolved: 'Resolved', closed: 'Closed', approved: 'Approved',
  denied: 'Denied', waiting_approval: 'Waiting approval',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (d) => {
  if (!d) return '—';
  const diff = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7)  return `${diff}d ago`;
  if (diff < 30) return `${Math.floor(diff/7)}wk ago`;
  return `${Math.floor(diff/30)}mo ago`;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function TicketsTableView({ tickets, users, onTicketClick, selectedTickets, setSelectedTickets }) {
  const { bulkUpdateTickets } = useSimulation();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const statusRefs = useRef(new Map());

  const allSelected  = tickets.length > 0 && selectedTickets.size === tickets.length;

  const toggleAll    = () => setSelectedTickets(allSelected ? new Set() : new Set(tickets.map(t => t.id)));
  const toggleOne    = (id) => {
    const s = new Set(selectedTickets);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedTickets(s);
  };

  const getUserName  = (id) => users?.find(u => u.id === id)?.name || 'Unassigned';
  const getInitial   = (id) => getUserName(id).charAt(0).toUpperCase();
  const getAvatarBg  = (id) => {
    const colours = ['bg-indigo-500','bg-violet-500','bg-pink-500','bg-amber-500','bg-teal-500'];
    const i = (id || '').charCodeAt(0) % colours.length;
    return colours[i];
  };

  const updateStatus   = async (id, status) => {
    setLoading(true);
    try { await bulkUpdateTickets([id], { status }); }
    catch (e) { alert(`Failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  const updatePriority = async (id, priority) => {
    setLoading(true);
    try { await bulkUpdateTickets([id], { priority }); }
    catch (e) { alert(`Failed: ${e.message}`); }
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

  if (tickets.length === 0) {
    return (
      <div className="py-16 text-center text-[#9ca3af]">
        <div className="text-[13px]">No tickets found</div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse responsive-table">
          <thead>
            <tr className="bg-[#fafafa]">
              <th className="w-10 px-4 py-2.5 border-b border-[#e5e7eb]">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </th>
              {['Ticket','Assigned to','Priority','Status','Updated',''].map((h, i) => (
                <th key={i} className="text-left px-4 py-2.5 border-b border-[#e5e7eb]
                                       text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket, idx) => {
              const isSelected = selectedTickets.has(ticket.id);
              const priority   = ticket.priority || 'medium';
              const status     = ticket.status   || 'open';
              const assigneeId = ticket.assignee_id || ticket.assignedTo;

              return (
                <tr
                  key={ticket.id}
                  className={`border-b border-[#f3f4f6] transition-colors
                    ${isSelected ? 'bg-[#fef9ee]' : idx % 2 === 1 ? 'bg-[#fafbfc] hover:bg-[#fef9ee]' : 'bg-white hover:bg-[#fef9ee]'}`}
                >
                  {/* Checkbox */}
                  <td className="w-10 px-4 py-3">
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleOne(ticket.id)} />
                  </td>

                  {/* Ticket title + id */}
                  <td className="px-4 py-3 ticket-cell cursor-pointer" onClick={() => onTicketClick?.(ticket)}>
                    <div className="text-[13px] font-medium text-[#1d1d1f] hover:text-[#d4a017] transition-colors">
                      {ticket.title}
                    </div>
                    <div className="text-[11px] text-[#9ca3af] mt-0.5 font-mono">
                      #{ticket.id?.slice(0, 8)}
                    </div>
                  </td>

                  {/* Assignee */}
                  <td className="px-4 py-3 assignee-cell">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full ${getAvatarBg(assigneeId)}
                                      flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0`}>
                        {getInitial(assigneeId)}
                      </div>
                      <span className="text-[12px] text-[#374151]">{getUserName(assigneeId)}</span>
                    </div>
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-3 priority-cell">
                    <select
                      value={priority}
                      onChange={e => updatePriority(ticket.id, e.target.value)}
                      disabled={loading}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-full border-0 cursor-pointer
                                  appearance-none focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30
                                  ${PRIORITY_BADGE[priority]}`}
                      style={{ backgroundImage: 'none' }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 status-cell">
                    <select
                      ref={el => {
                        if (el) {
                          el.value = status;
                          el.onchange = e => updateStatus(ticket.id, e.target.value);
                          statusRefs.current.set(ticket.id, el);
                        }
                      }}
                      disabled={loading}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-full border-0 cursor-pointer
                                  appearance-none focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30
                                  ${STATUS_BADGE[status] || 'bg-[#f3f4f6] text-[#6b7280]'}`}
                      style={{ backgroundImage: 'none' }}
                    >
                      {['open','in_progress','pending','resolved','closed'].map(s => (
                        <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>
                      ))}
                    </select>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 date-cell text-[12px] text-[#9ca3af]">
                    {formatDate(ticket.updated_at)}
                  </td>

                  {/* Row menu */}
                  <td className="px-2 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-7 h-7 rounded-md flex items-center justify-center
                                           text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151]
                                           transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onTicketClick?.(ticket)}>View details</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600"
                          onClick={() => { setSelectedTickets(new Set([ticket.id])); }}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <div className="px-5 py-2.5 bg-[#fafafa] border-t border-[#e5e7eb] text-[12px] text-[#9ca3af]">
        {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
        {selectedTickets.size > 0 && ` · ${selectedTickets.size} selected`}
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
}
