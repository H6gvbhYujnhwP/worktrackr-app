// web/client/src/app/src/components/AssignTicketsModal.jsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { X, User, Search } from 'lucide-react';
import { Input } from '@/components/ui/input.jsx';

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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">
            Assign {ticketIds.length} ticket{ticketIds.length > 1 ? 's' : ''}
          </h3>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded"
            disabled={assigning}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* User List */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No users found
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    selectedUserId === user.id
                      ? 'bg-blue-50 border-blue-500'
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    {user.role && (
                      <div className="text-xs text-gray-400 mt-1">
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </div>
                    )}
                  </div>
                  {selectedUserId === user.id && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
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

        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={assigning}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAssign}
            disabled={!selectedUserId || assigning}
          >
            {assigning ? 'Assigning...' : 'Assign Tickets'}
          </Button>
        </div>
      </div>
    </div>
  );
}
