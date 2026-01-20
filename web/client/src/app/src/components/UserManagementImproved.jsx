import React, { useState } from 'react';
import { useAuth, useSimulation } from '../App.jsx';
import PlanManagement from './PlanManagement.jsx';
import useUserLimits from '../hooks/useUserLimits.js';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { 
  X,
  Plus,
  Users,
  Mail,
  Trash2,
  Crown,
  Shield,
  User,
  CreditCard,
  Phone,
  Settings,
  Edit,
  Save,
  AlertTriangle
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert.jsx';

export default function UserManagementImproved({ users, currentUser }) {
  const { setUsers, organization, updateOrganization, emailService } = useSimulation();
  const { 
    validateUserAddition, 
    canAddUsers, 
    getUpgradeRecommendation, 
    refreshSubscription,
    loading: limitsLoading,
    isAtLimit,
    isNearLimit,
    seatsRemaining,
    totalAllowedUsers
  } = useUserLimits();
  const [activeTab, setActiveTab] = useState('users');
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    mobile: '',
    role: 'staff',
    emailNotifications: true,
    password: '',
    sendInvitation: true // Toggle: true = send email invitation, false = admin sets password
  });

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email) return;
    
    // Validate password if admin is setting it
    if (!newUser.sendInvitation && (!newUser.password || newUser.password.length < 8)) {
      alert('Password must be at least 8 characters long');
      return;
    }
    
    // Validate user limit
    const validation = validateUserAddition(1);
    if (!validation.allowed) {
      // Show more detailed error with upgrade options
      const upgradeRecommendation = getUpgradeRecommendation();
      let message = validation.message;
      
      if (upgradeRecommendation) {
        message += `\n\nRecommendation: ${upgradeRecommendation.reason}`;
      } else {
        message += '\n\nYou can add more seats or upgrade your plan in the Plan Management section.';
      }
      
      alert(message);
      return;
    }
    
    try {
      // Call backend API to create user
      const response = await fetch(`/api/organizations/${organization.id}/users/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          mobile: newUser.mobile,
          role: newUser.role,
          emailNotifications: newUser.emailNotifications,
          password: newUser.sendInvitation ? null : newUser.password,
          sendInvitation: newUser.sendInvitation
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to add user');
        return;
      }

      // Reset form and close modal
      setNewUser({ name: '', email: '', mobile: '', role: 'staff', emailNotifications: true, password: '', sendInvitation: true });
      setShowAddUser(false);
      
      // Refresh subscription data to get updated limits
      if (typeof refreshSubscription === 'function') {
        try {
          await refreshSubscription();
        } catch (err) {
          console.warn('Failed to refresh subscription data:', err);
        }
      }
      
      // Reload users from API to get the updated list
      try {
        const usersResponse = await fetch(`/api/organizations/${organization.id}/users`, {
          credentials: 'include'
        });
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        }
      } catch (err) {
        console.warn('Failed to reload users:', err);
      }
      
      alert('User added successfully!');
    } catch (error) {
      console.error('Add user error:', error);
      alert('Failed to add user. Please try again.');
    }
  };

  const handleDeleteUser = (userId) => {
    if (userId === currentUser.id) return; // Can't delete yourself
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleToggleRole = (userId) => {
    setUsers(prev => prev.map(u => 
      u.id === userId 
        ? { ...u, role: u.role === 'admin' ? 'staff' : 'admin' }
        : u
    ));
  };

  const handleToggleEmailNotifications = (userId) => {
    setUsers(prev => prev.map(u => 
      u.id === userId 
        ? { ...u, emailNotifications: !u.emailNotifications }
        : u
    ));
  };

  const handleEditUser = (user) => {
    setEditingUser({ ...user });
  };

  const handleSaveUser = async () => {
    try {
      const updateData = {
        name: editingUser.name,
        email: editingUser.email,
        mobile: editingUser.mobile,
        department: editingUser.department,
        role: editingUser.role
      };
      
      // Add password if it was changed
      if (editingUser.newPassword && editingUser.newPassword.length >= 8) {
        updateData.password = editingUser.newPassword;
      }
      
      const response = await fetch(`/api/organizations/${organization.id}/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === editingUser.id ? { ...editingUser, newPassword: undefined } : u
      ));
      setEditingUser(null);
      
      // Show success message
      if (updateData.password) {
        alert('User updated successfully! Password has been changed.');
      } else {
        alert('User updated successfully!');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5" />
          <CardTitle>User Management</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Plan Management */}
        <PlanManagement 
          currentPlan="pro"
          additionalSeats={0}
          totalUsers={users.length}
        />

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <Button
            variant={activeTab === 'users' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('users')}
            className="flex-1"
          >
            <Users className="w-4 h-4 mr-2" />
            Team Members
          </Button>
          <Button
            variant={activeTab === 'notifications' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('notifications')}
            className="flex-1"
          >
            <Mail className="w-4 h-4 mr-2" />
            Notifications
          </Button>
        </div>

        {/* Team Members Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* User Limit Status */}
            {!limitsLoading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">
                        {users.length} of {totalAllowedUsers === Infinity ? '∞' : totalAllowedUsers} users
                      </p>
                      <p className="text-sm text-blue-700">
                        {seatsRemaining === Infinity 
                          ? 'Unlimited seats available' 
                          : `${seatsRemaining} seats remaining`
                        }
                      </p>
                    </div>
                  </div>
                  {(isAtLimit || isNearLimit) && (
                    <div className="text-right">
                      {isAtLimit && (
                        <Badge variant="destructive" className="mb-1">
                          Limit Reached
                        </Badge>
                      )}
                      {isNearLimit && !isAtLimit && (
                        <Badge variant="secondary" className="mb-1">
                          Near Limit
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* User Limit Warning */}
            {isAtLimit && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You've reached your user limit. To add more users, upgrade your plan or add additional seats in the Plan Management section above.
                </AlertDescription>
              </Alert>
            )}

            {isNearLimit && !isAtLimit && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You're approaching your user limit ({seatsRemaining} seats remaining). Consider upgrading your plan or adding more seats.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Team Members</h3>
              <Button 
                onClick={() => setShowAddUser(true)}
                disabled={!canAddUsers || limitsLoading}
                title={!canAddUsers ? "User limit reached. Upgrade plan or add more seats." : ""}
                className={!canAddUsers ? "opacity-50 cursor-not-allowed" : ""}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add User
                {!canAddUsers && (
                  <span className="ml-2 text-xs">(Limit Reached)</span>
                )}
              </Button>
            </div>

            {/* User List */}
            <div className="space-y-3">
              {users.map((user) => (
                <Card key={user.id} className="p-4 user-management-card">
                  {editingUser && editingUser.id === user.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={editingUser.name}
                            onChange={(e) => setEditingUser(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input
                            value={editingUser.email}
                            onChange={(e) => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Mobile</Label>
                          <Input
                            value={editingUser.mobile || ''}
                            onChange={(e) => setEditingUser(prev => ({ ...prev, mobile: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Department</Label>
                          <Input
                            value={editingUser.department || ''}
                            onChange={(e) => setEditingUser(prev => ({ ...prev, department: e.target.value }))}
                          />
                        </div>
                      </div>
                      
                      {/* Change Password Section */}
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <Label className="font-medium">Change Password</Label>
                        </div>
                        <Input
                          type="password"
                          value={editingUser.newPassword || ''}
                          onChange={(e) => setEditingUser(prev => ({ ...prev, newPassword: e.target.value }))}
                          placeholder="Enter new password (min 8 characters, leave empty to keep current)"
                          minLength={8}
                        />
                        <p className="text-xs text-gray-600">
                          🔒 Leave empty to keep the current password. Minimum 8 characters required for new password.
                        </p>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button onClick={handleSaveUser} size="sm">
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                        <Button onClick={handleCancelEdit} variant="outline" size="sm">
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          {user.isOrgOwner ? (
                            <Crown className="w-5 h-5 text-yellow-600" />
                          ) : (
                            <User className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          {user.mobile && (
                            <p className="text-sm text-gray-500">{user.mobile}</p>
                          )}
                          <p className="text-xs text-gray-500">{user.department || 'General'}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                        {/* Role Toggle */}
                        <div className="flex flex-col items-center space-y-1">
                          <Label className="text-xs text-gray-500">Admin/Staff</Label>
                          <Switch
                            checked={user.role === 'admin'}
                            onCheckedChange={() => handleToggleRole(user.id)}
                            disabled={user.isOrgOwner || user.id === currentUser.id}
                          />
                          <span className="text-xs font-medium">
                            {user.role === 'admin' ? 'Admin' : 'Staff'}
                          </span>
                        </div>

                        {/* Email Notifications Toggle */}
                        <div className="flex flex-col items-center space-y-1">
                          <Label className="text-xs text-gray-500">Email Alerts</Label>
                          <Switch
                            checked={user.emailNotifications}
                            onCheckedChange={() => handleToggleEmailNotifications(user.id)}
                          />
                          <span className="text-xs font-medium">
                            {user.emailNotifications ? 'On' : 'Off'}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-2 justify-center sm:justify-start">
                          <Button
                            onClick={() => handleEditUser(user)}
                            variant="outline"
                            size="sm"
                            className="mobile-user-button"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          {!user.isOrgOwner && user.id !== currentUser.id && (
                            <Button
                              onClick={() => handleDeleteUser(user.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 mobile-user-button"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        {/* Status Badge */}
                        {user.isOrgOwner && (
                          <Badge variant="secondary" className="self-center sm:self-auto">Owner</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Email Notification Settings</h3>
            <p className="text-gray-600">Manage email notification preferences for each team member.</p>
            
            <div className="space-y-3">
              {users.map((user) => (
                <Card key={user.id} className="p-4 user-management-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={user.emailNotifications}
                        onCheckedChange={() => handleToggleEmailNotifications(user.id)}
                      />
                      <span className="text-sm font-medium">
                        {user.emailNotifications ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Add User Modal */}
        {showAddUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Add New User
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddUser(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter full name"
                  />
                </div>
                
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                  />
                </div>
                
                <div>
                  <Label>Mobile</Label>
                  <Input
                    value={newUser.mobile}
                    onChange={(e) => setNewUser(prev => ({ ...prev, mobile: e.target.value }))}
                    placeholder="Enter mobile number"
                  />
                </div>
                
                <div>
                  <Label>Role</Label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                {/* Password Setup Toggle */}
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Password Setup</Label>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-600">
                        {newUser.sendInvitation ? 'Send invitation email' : 'Set password now'}
                      </span>
                      <Switch
                        checked={!newUser.sendInvitation}
                        onCheckedChange={(checked) => setNewUser(prev => ({ ...prev, sendInvitation: !checked, password: '' }))}
                      />
                    </div>
                  </div>
                  
                  {newUser.sendInvitation ? (
                    <p className="text-xs text-gray-600">
                      ✉️ User will receive an email with a link to set their password
                    </p>
                  ) : (
                    <div>
                      <Label>Password *</Label>
                      <Input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Enter password (min 8 characters)"
                        minLength={8}
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        🔒 User can log in immediately with this password
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newUser.emailNotifications}
                    onCheckedChange={(checked) => setNewUser(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                  <Label>Enable email notifications</Label>
                </div>
                
                <div className="flex space-x-2 pt-4">
                  <Button onClick={handleAddUser} className="flex-1">
                    Add User
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddUser(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
