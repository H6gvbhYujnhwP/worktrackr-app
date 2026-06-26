// web/client/src/app/src/components/AssignTicketsModal.jsx
import React, { useState } from 'react';
import { X, User, Search } from 'lucide-react';

export default function AssignTicketsModal({ users, ticketIds, onAssign, onClose }) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [assigning, setAssigning] = useState(false);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssign = async () => {
    if (!selectedUserId) {
      alert('Please select a user');
      return;
    }
    setAssigning(true);
    try {
      await onAssign(selectedUserId);
      onClose();
    } catch (error) {
      console.error('Failed to assign tickets:', error);
      alert('Failed to assign tickets. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#242438] rounded-xl border border-[#2e2e4a] shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e2e4a]">
          <h3 className="text-[15px] font-semibold text-white">
            Assign {ticketIds.length} ticket{ticketIds.length > 1 ? 's' : ''}
          </h3>
          <button
            onClick={onClose}
            disabled={assigning}
            className="p-1.5 rounded-lg hover:bg-[#f5f5f7] text-[#94a3b8] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-[13px] border border-[#2e2e4a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/30 focus:border-[#f59e0b]"
            />
          </div>

          {/* User list */}
          <div className="max-h-80 overflow-y-auto space-y-1.5">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-[13px] text-[#6b7280]">
                No users found
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                    selectedUserId === user.id
                      ? 'bg-[rgba(245,158,11,0.08)] border-[#f59e0b]'
                      : 'hover:bg-[#1f1f33] border-[#2e2e4a]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#1f1f33] flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-[#94a3b8]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-white truncate">{user.name}</div>
                    <div className="text-[12px] text-[#6b7280] truncate">{user.email}</div>
                    {user.role && (
                      <div className="text-[11px] text-[#6b7280] mt-0.5 uppercase tracking-wider">
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </div>
                    )}
                  </div>
                  {selectedUserId === user.id && (
                    <div className="w-5 h-5 rounded-full bg-[#f59e0b] flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#2e2e4a]">
          <button
            onClick={onClose}
            disabled={assigning}
            className="px-4 py-2 text-[13px] font-medium text-[#cbd5e1] border border-[#2e2e4a] rounded-lg hover:bg-[#1f1f33] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedUserId || assigning}
            className="px-4 py-2 text-[13px] font-medium text-white bg-[#f59e0b] hover:bg-[#d97706] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {assigning ? 'Assigning...' : 'Assign Tickets'}
          </button>
        </div>
      </div>
    </div>
  );
}
