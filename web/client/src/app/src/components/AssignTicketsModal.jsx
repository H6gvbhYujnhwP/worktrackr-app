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
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb]">
          <h3 className="text-[15px] font-semibold text-[#111113]">
            Assign {ticketIds.length} ticket{ticketIds.length > 1 ? 's' : ''}
          </h3>
          <button
            onClick={onClose}
            disabled={assigning}
            className="p-1.5 rounded-lg hover:bg-[#f5f5f7] text-[#6b7280] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-[13px] border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017]"
            />
          </div>

          {/* User list */}
          <div className="max-h-80 overflow-y-auto space-y-1.5">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-[13px] text-[#9ca3af]">
                No users found
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                    selectedUserId === user.id
                      ? 'bg-[#fef9ee] border-[#d4a017]'
                      : 'hover:bg-[#fafafa] border-[#e5e7eb]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#f3f4f6] flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-[#6b7280]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#111113] truncate">{user.name}</div>
                    <div className="text-[12px] text-[#9ca3af] truncate">{user.email}</div>
                    {user.role && (
                      <div className="text-[11px] text-[#9ca3af] mt-0.5 uppercase tracking-wider">
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </div>
                    )}
                  </div>
                  {selectedUserId === user.id && (
                    <div className="w-5 h-5 rounded-full bg-[#d4a017] flex items-center justify-center flex-shrink-0">
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
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#e5e7eb]">
          <button
            onClick={onClose}
            disabled={assigning}
            className="px-4 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedUserId || assigning}
            className="px-4 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {assigning ? 'Assigning...' : 'Assign Tickets'}
          </button>
        </div>
      </div>
    </div>
  );
}
