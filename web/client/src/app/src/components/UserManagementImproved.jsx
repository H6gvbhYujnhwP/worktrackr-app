// web/client/src/app/src/components/UserManagementImproved.jsx
import React, { useState } from 'react';
import { useAuth, useSimulation } from '../App.jsx';
import PlanManagement from './PlanManagement.jsx';
import useUserLimits from '../hooks/useUserLimits.js';
import { Switch } from '@/components/ui/switch.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
  X, Plus, Users, Mail, Trash2, Crown,
  User, Edit, Save, AlertTriangle, Phone, Settings
} from 'lucide-react';

export default function UserManagementImproved({ users, currentUser }) {
  const { setUsers, organization, updateOrganization, emailService } = useSimulation();
  const {
    validateUserAddition, canAddUsers, getUpgradeRecommendation,
    refreshSubscription, loading: limitsLoading,
    isAtLimit, isNearLimit, seatsRemaining, totalAllowedUsers
  } = useUserLimits();

  const [activeTab, setActiveTab] = useState('users');
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    name: '', email: '', mobile: '', role: 'staff',
    emailNotifications: true, password: '', sendInvitation: true
  });

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email) return;
    if (!newUser.sendInvitation && (!newUser.password || newUser.password.length < 8)) {
      alert('Password must be at least 8 characters long');
      return;
    }
    const validation = validateUserAddition(1);
    if (!validation.allowed) {
      const upgradeRecommendation = getUpgradeRecommendation();
      let message = validation.message;
      if (upgradeRecommendation) message += `\n\nRecommendation: ${upgradeRecommendation.reason}`;
      else message += '\n\nYou can add more seats or upgrade your plan in the Plan Management section.';
      alert(message);
      return;
    }
    try {
      const response = await fetch(`/api/organizations/${organization.id}/users/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUser.name, email: newUser.email, mobile: newUser.mobile,
          role: newUser.role, emailNotifications: newUser.emailNotifications,
          password: newUser.sendInvitation ? null : newUser.password,
          sendInvitation: newUser.sendInvitation
        }),
      });
      if (!response.ok) { const error = await response.json(); alert(error.error || 'Failed to add user'); return; }
      setNewUser({ name: '', email: '', mobile: '', role: 'staff', emailNotifications: true, password: '', sendInvitation: true });
      setShowAddUser(false);
      if (typeof refreshSubscription === 'function') {
        try { await refreshSubscription(); } catch (err) { console.warn('Failed to refresh subscription:', err); }
      }
      try {
        const usersResponse = await fetch(`/api/organizations/${organization.id}/users`, { credentials: 'include' });
        if (usersResponse.ok) { const usersData = await usersResponse.json(); setUsers(usersData); }
      } catch (err) { console.warn('Failed to reload users:', err); }
      alert('User added successfully!');
    } catch (error) {
      console.error('Add user error:', error);
      alert('Failed to add user. Please try again.');
    }
  };

  const handleDeleteUser = (userId) => {
    if (userId === currentUser.id) return;
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleToggleRole = (userId) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: u.role === 'admin' ? 'staff' : 'admin' } : u));
  };

  const handleToggleEmailNotifications = (userId) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, emailNotifications: !u.emailNotifications } : u));
  };

  const handleEditUser = (user) => setEditingUser({ ...user });

  const handleSaveUser = async () => {
    try {
      const updateData = {
        name: editingUser.name, email: editingUser.email,
        mobile: editingUser.mobile, department: editingUser.department, role: editingUser.role
      };
      if (editingUser.newPassword && editingUser.newPassword.length >= 8) updateData.password = editingUser.newPassword;
      const response = await fetch(`/api/organizations/${organization.id}/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(updateData)
      });
      if (!response.ok) throw new Error('Failed to update user');
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...editingUser, newPassword: undefined } : u));
      setEditingUser(null);
      alert(updateData.password ? 'User updated! Password has been changed.' : 'User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user. Please try again.');
    }
  };

  const inputClass = "w-full px-3 py-2 text-[13px] border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017]";
  const labelClass = "block text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-[#9ca3af]" />
        <div>
          <h2 className="text-[22px] font-bold text-[#111113]">User Management</h2>
          <p className="text-[13px] text-[#9ca3af]">Manage team members and notification preferences</p>
        </div>
      </div>

      {/* Plan management */}
      <PlanManagement currentPlan="pro" additionalSeats={0} totalUsers={users.length} />

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
        <div className="flex border-b border-[#e5e7eb]">
          {[
            { id: 'users', label: 'Team Members', icon: Users },
            { id: 'notifications', label: 'Notifications', icon: Mail },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-[13px] font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-[#d4a017] text-[#d4a017]'
                  : 'border-transparent text-[#6b7280] hover:text-[#374151]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* Team Members tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">

              {/* Seat usage */}
              {!limitsLoading && (
                <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-[#9ca3af]" />
                      <div>
                        <p className="text-[13px] font-semibold text-[#374151]">
                          {users.length} of {totalAllowedUsers === Infinity ? '∞' : totalAllowedUsers} users
                        </p>
                        <p className="text-[12px] text-[#9ca3af]">
                          {seatsRemaining === Infinity ? 'Unlimited seats available' : `${seatsRemaining} seats remaining`}
                        </p>
                      </div>
                    </div>
                    {(isAtLimit || isNearLimit) && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${isAtLimit ? 'bg-[#fee2e2] text-[#dc2626]' : 'bg-[#fef3c7] text-[#92400e]'}`}>
                        {isAtLimit ? 'Limit Reached' : 'Near Limit'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {isAtLimit && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-[13px] text-red-800">You've reached your user limit. Upgrade your plan or add additional seats above.</p>
                </div>
              )}
              {isNearLimit && !isAtLimit && (
                <div className="flex items-start gap-3 bg-[#fef3c7] border border-yellow-200 rounded-lg px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-[#92400e] mt-0.5 flex-shrink-0" />
                  <p className="text-[13px] text-[#92400e]">You're approaching your user limit ({seatsRemaining} seats remaining).</p>
                </div>
              )}

              <div className="flex justify-between items-center">
                <h3 className="text-[13px] font-semibold text-[#374151]">Team Members</h3>
                <button
                  onClick={() => setShowAddUser(true)}
                  disabled={!canAddUsers || limitsLoading}
                  className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title={!canAddUsers ? "User limit reached." : ""}
                >
                  <Plus className="w-4 h-4" />
                  Add User
                  {!canAddUsers && <span className="text-[11px] opacity-75">(Limit Reached)</span>}
                </button>
              </div>

              {/* User list */}
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="border border-[#e5e7eb] rounded-lg p-4">
                    {editingUser && editingUser.id === user.id ? (
                      // Edit mode
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div><label className={labelClass}>Name</label><input className={inputClass} value={editingUser.name} onChange={e => setEditingUser(p => ({...p, name: e.target.value}))} /></div>
                          <div><label className={labelClass}>Email</label><input className={inputClass} value={editingUser.email} onChange={e => setEditingUser(p => ({...p, email: e.target.value}))} /></div>
                          <div><label className={labelClass}>Mobile</label><input className={inputClass} value={editingUser.mobile || ''} onChange={e => setEditingUser(p => ({...p, mobile: e.target.value}))} /></div>
                          <div><label className={labelClass}>Department</label><input className={inputClass} value={editingUser.department || ''} onChange={e => setEditingUser(p => ({...p, department: e.target.value}))} /></div>
                        </div>
                        <div className="bg-[#fef9ee] border border-[#d4a017]/30 rounded-lg p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-[#d4a017]" />
                            <label className={labelClass + " mb-0"}>Change Password</label>
                          </div>
                          <input
                            type="password"
                            className={inputClass}
                            value={editingUser.newPassword || ''}
                            onChange={e => setEditingUser(p => ({...p, newPassword: e.target.value}))}
                            placeholder="New password (min 8 chars — leave empty to keep current)"
                            minLength={8}
                          />
                          <p className="text-[11px] text-[#9ca3af]">Leave empty to keep the current password.</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSaveUser} className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg">
                            <Save className="w-4 h-4" /> Save
                          </button>
                          <button onClick={() => setEditingUser(null)} className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa]">
                            <X className="w-4 h-4" /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#fef9ee] border border-[#d4a017]/20 flex items-center justify-center flex-shrink-0">
                            {user.isOrgOwner ? <Crown className="w-5 h-5 text-[#d4a017]" /> : <User className="w-5 h-5 text-[#9ca3af]" />}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-[#111113]">{user.name}</p>
                            <p className="text-[12px] text-[#9ca3af]">{user.email}</p>
                            {user.mobile && <p className="text-[12px] text-[#9ca3af]">{user.mobile}</p>}
                            <p className="text-[11px] text-[#9ca3af] uppercase tracking-wider">{user.department || 'General'}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex flex-col items-center gap-1">
                            <span className={labelClass + " mb-0"}>Role</span>
                            <Switch checked={user.role === 'admin'} onCheckedChange={() => handleToggleRole(user.id)} disabled={user.isOrgOwner || user.id === currentUser.id} />
                            <span className="text-[11px] text-[#374151] font-medium">{user.role === 'admin' ? 'Admin' : 'Staff'}</span>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className={labelClass + " mb-0"}>Emails</span>
                            <Switch checked={user.emailNotifications} onCheckedChange={() => handleToggleEmailNotifications(user.id)} />
                            <span className="text-[11px] text-[#374151] font-medium">{user.emailNotifications ? 'On' : 'Off'}</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditUser(user)} className="p-2 rounded-lg border border-[#e5e7eb] hover:bg-[#fafafa] text-[#6b7280]">
                              <Edit className="w-4 h-4" />
                            </button>
                            {!user.isOrgOwner && user.id !== currentUser.id && (
                              <button onClick={() => handleDeleteUser(user.id)} className="p-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          {user.isOrgOwner && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#fef9ee] text-[#d4a017]">Owner</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-3">
              <h3 className="text-[13px] font-semibold text-[#374151]">Email Notification Settings</h3>
              <p className="text-[12px] text-[#9ca3af]">Manage email notification preferences for each team member.</p>
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between border border-[#e5e7eb] rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#f3f4f6] flex items-center justify-center">
                      <User className="w-4 h-4 text-[#9ca3af]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#374151]">{user.name}</p>
                      <p className="text-[12px] text-[#9ca3af]">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={user.emailNotifications} onCheckedChange={() => handleToggleEmailNotifications(user.id)} />
                    <span className="text-[12px] font-medium text-[#374151]">{user.emailNotifications ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[15px] font-semibold text-[#111113]">Add New User</h3>
              <button onClick={() => setShowAddUser(false)} className="p-1.5 rounded-lg hover:bg-[#f5f5f7] text-[#6b7280]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className={labelClass}>Name *</label><input className={inputClass} value={newUser.name} onChange={e => setNewUser(p => ({...p, name: e.target.value}))} placeholder="Enter full name" /></div>
              <div><label className={labelClass}>Email *</label><input type="email" className={inputClass} value={newUser.email} onChange={e => setNewUser(p => ({...p, email: e.target.value}))} placeholder="Enter email address" /></div>
              <div><label className={labelClass}>Mobile</label><input className={inputClass} value={newUser.mobile} onChange={e => setNewUser(p => ({...p, mobile: e.target.value}))} placeholder="Enter mobile number" /></div>
              <div>
                <label className={labelClass}>Role</label>
                <select className={inputClass} value={newUser.role} onChange={e => setNewUser(p => ({...p, role: e.target.value}))}>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className={labelClass + " mb-0"}>Password Setup</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[#9ca3af]">{newUser.sendInvitation ? 'Send invitation email' : 'Set password now'}</span>
                    <Switch checked={!newUser.sendInvitation} onCheckedChange={checked => setNewUser(p => ({...p, sendInvitation: !checked, password: ''}))} />
                  </div>
                </div>
                {newUser.sendInvitation ? (
                  <p className="text-[12px] text-[#9ca3af]">User will receive an email with a link to set their password</p>
                ) : (
                  <div>
                    <label className={labelClass}>Password *</label>
                    <input type="password" className={inputClass} value={newUser.password} onChange={e => setNewUser(p => ({...p, password: e.target.value}))} placeholder="Enter password (min 8 characters)" minLength={8} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={newUser.emailNotifications} onCheckedChange={checked => setNewUser(p => ({...p, emailNotifications: checked}))} />
                <label className="text-[13px] text-[#374151]">Enable email notifications</label>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-[#e5e7eb]">
              <button onClick={handleAddUser} className="flex-1 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg transition-colors">Add User</button>
              <button onClick={() => setShowAddUser(false)} className="flex-1 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa] transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
