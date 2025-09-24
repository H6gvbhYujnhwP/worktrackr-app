import React, { useState } from 'react';
import { useAuth, useSimulation } from '../App.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { 
  X,
  Plus,
  Users,
  Mail,
  Trash2,
  Edit3,
  Crown,
  Shield,
  User,
  AlertTriangle,
  CheckCircle,
  Settings,
  Bell,
  UserPlus,
  CreditCard,
  Zap
} from 'lucide-react';
import { subscriptionPlans, additionalSeatPrice } from '../data/mockData.js';
import SubscriptionManagement from './SubscriptionManagement.jsx';

export default function UserManagement({ isOpen, onClose }) {
  const { user } = useAuth();
  const { users, setUsers, emailService, organization } = useSimulation();
  const [activeTab, setActiveTab] = useState('users');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showSubscriptionManagement, setShowSubscriptionManagement] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'staff',
    emailNotifications: true,
    department: ''
  });
  const [editingUser, setEditingUser] = useState(null);

  if (!isOpen) return null;

  const subscription = subscriptionPlans[organization.subscription.plan];
  const currentUserCount = organization.subscription.currentUsers;
  const maxUsers = organization.subscription.maxUsers;
  const canAddMoreUsers = currentUserCount < maxUsers;

  const handleAddUser = () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (!canAddMoreUsers) {
      alert(`You've reached your subscription limit of ${maxUsers} users. Please upgrade your plan or add additional seats.`);
      return;
    }

    if (users.some(u => u.email === newUser.email)) {
      alert('A user with this email already exists');
      return;
    }

    const userToAdd = {
      id: `user-${Date.now()}`,
      ...newUser,
      isOrgOwner: false,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      status: 'invited'
    };

    setUsers(prev => [...prev, userToAdd]);

    // Send invitation email
    emailService.sendEmail(
      newUser.email,
      'Welcome to WorkTrackr - Account Created',
      'user_invitation',
      null
    );

    // Reset form
    setNewUser({
      name: '',
      email: '',
      role: 'staff',
      emailNotifications: true,
      department: ''
    });
    setShowAddUser(false);

    alert(`User ${newUser.name} has been added successfully! An invitation email has been sent.`);
  };

  const handleDeleteUser = (userId) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    if (userToDelete.isOrgOwner) {
      alert('Cannot delete the organization owner');
      return;
    }

    if (confirm(`Are you sure you want to delete ${userToDelete.name}? This action cannot be undone.`)) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      alert(`User ${userToDelete.name} has been deleted successfully`);
    }
  };

  const handleToggleRole = (userId) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId && !u.isOrgOwner) {
        const newRole = u.role === 'admin' ? 'staff' : 'admin';
        
        // Send notification email
        emailService.sendEmail(
          u.email,
          `Role Updated: You are now ${newRole === 'admin' ? 'an Administrator' : 'a Staff Member'}`,
          'role_updated',
          null
        );
        
        return { ...u, role: newRole };
      }
      return u;
    }));
  };

  const handleToggleNotifications = (userId) => {
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, emailNotifications: !u.emailNotifications } : u
    ));
  };

  const handleEditUser = (user) => {
    setEditingUser({ ...user });
  };

  const handleSaveEdit = () => {
    if (!editingUser.name.trim() || !editingUser.email.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setUsers(prev => prev.map(u => 
      u.id === editingUser.id ? editingUser : u
    ));
    setEditingUser(null);
    alert('User updated successfully');
  };

  const getRoleIcon = (role, isOrgOwner) => {
    if (isOrgOwner) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (role === 'admin') return <Shield className="w-4 h-4 text-blue-500" />;
    return <User className="w-4 h-4 text-gray-500" />;
  };

  const getRoleBadge = (role, isOrgOwner) => {
    if (isOrgOwner) return <Badge className="bg-yellow-100 text-yellow-800">Owner</Badge>;
    if (role === 'admin') return <Badge className="bg-blue-100 text-blue-800">Admin</Badge>;
    return <Badge variant="outline">Staff</Badge>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg sm:text-xl flex items-center">
                <Users className="w-5 h-5 mr-2" />
                User Management
              </CardTitle>
              <CardDescription className="text-sm">
                Manage team members, roles, and subscription limits
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-120px)]">
          {/* Subscription Status */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">{subscription.name} Plan</h3>
                    <p className="text-sm text-gray-600">
                      {currentUserCount} of {maxUsers} users
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        currentUserCount >= maxUsers ? 'bg-red-500' : 
                        currentUserCount >= maxUsers * 0.8 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min((currentUserCount / maxUsers) * 100, 100)}%` }}
                    />
                  </div>
                  <Badge variant={canAddMoreUsers ? "default" : "destructive"}>
                    £{organization.subscription.amount}/month
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowSubscriptionManagement(true)}
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Manage Plan
                  </Button>
                </div>
              </div>
              {!canAddMoreUsers && (
                <Alert className="mt-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You've reached your user limit. Upgrade your plan to add more team members.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'users' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Team Members
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'notifications' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Bell className="w-4 h-4 inline mr-2" />
              Notifications
            </button>
          </div>

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Add User Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                <h3 className="text-lg font-semibold">Team Members ({currentUserCount})</h3>
                <Button 
                  onClick={() => setShowAddUser(true)} 
                  disabled={!canAddMoreUsers}
                  className="w-full sm:w-auto"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </div>

              {/* Add User Form */}
              {showAddUser && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Add New User</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="user-name">Full Name *</Label>
                        <Input
                          id="user-name"
                          value={newUser.name}
                          onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter full name"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="user-email">Email Address *</Label>
                        <Input
                          id="user-email"
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Enter email address"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="user-role">Role</Label>
                        <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">Staff Member</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="user-department">Department</Label>
                        <Input
                          id="user-department"
                          value={newUser.department}
                          onChange={(e) => setNewUser(prev => ({ ...prev, department: e.target.value }))}
                          placeholder="e.g., Maintenance, IT, Security"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newUser.emailNotifications}
                        onCheckedChange={(checked) => setNewUser(prev => ({ ...prev, emailNotifications: checked }))}
                      />
                      <Label>Enable email notifications</Label>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button onClick={handleAddUser}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add User
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddUser(false)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Users List */}
              <div className="space-y-3">
                {users.map((u) => (
                  <Card key={u.id}>
                    <CardContent className="p-4">
                      {editingUser && editingUser.id === u.id ? (
                        // Edit Mode
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label>Full Name</Label>
                              <Input
                                value={editingUser.name}
                                onChange={(e) => setEditingUser(prev => ({ ...prev, name: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label>Email Address</Label>
                              <Input
                                type="email"
                                value={editingUser.email}
                                onChange={(e) => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
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
                          <div className="flex space-x-2">
                            <Button size="sm" onClick={handleSaveEdit}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingUser(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="space-y-3">
                          <div className="flex items-start space-x-3">
                            {getRoleIcon(u.role, u.isOrgOwner)}
                            <div className="flex-1 min-w-0">
                              <div className="space-y-1">
                                <div className="flex flex-col space-y-1">
                                  <h4 className="font-medium text-gray-900 truncate">{u.name}</h4>
                                  <div className="flex items-center space-x-2">
                                    {getRoleBadge(u.role, u.isOrgOwner)}
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 truncate">{u.email}</p>
                                {u.department && (
                                  <p className="text-xs text-gray-500 truncate">{u.department}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Mail className={`w-4 h-4 flex-shrink-0 ${u.emailNotifications ? 'text-green-500' : 'text-gray-400'}`} />
                              <span className="text-xs text-gray-500">
                                Email Alerts: {u.emailNotifications ? 'On' : 'Off'}
                              </span>
                            </div>
                            
                            {!u.isOrgOwner && (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditUser(u)}
                                  className="flex-shrink-0 text-xs px-2 py-1"
                                >
                                  <Edit3 className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleRole(u.id)}
                                  className="flex-shrink-0 text-xs px-2 py-1"
                                >
                                  {u.role === 'admin' ? (
                                    <>
                                      <User className="w-3 h-3 mr-1" />
                                      Make Staff
                                    </>
                                  ) : (
                                    <>
                                      <Shield className="w-3 h-3 mr-1" />
                                      Make Admin
                                    </>
                                  )}
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleNotifications(u.id)}
                                  className="flex-shrink-0 text-xs px-2 py-1"
                                >
                                  <Bell className={`w-3 h-3 mr-1 ${u.emailNotifications ? 'text-green-500' : 'text-gray-400'}`} />
                                  {u.emailNotifications ? 'Disable' : 'Enable'}
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="text-red-600 hover:text-red-700 flex-shrink-0 text-xs px-2 py-1"
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Email Notification Settings</h3>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Organization-wide Settings</CardTitle>
                  <CardDescription>
                    Configure default notification preferences for all users
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>New Ticket Notifications</Label>
                        <p className="text-sm text-gray-600">Send email when new tickets are created</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Assignment Notifications</Label>
                        <p className="text-sm text-gray-600">Send email when tickets are assigned</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Status Change Notifications</Label>
                        <p className="text-sm text-gray-600">Send email when ticket status changes</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Approval Request Notifications</Label>
                        <p className="text-sm text-gray-600">Send email when approval is required</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Daily Summary Reports</Label>
                        <p className="text-sm text-gray-600">Send daily summary of ticket activity</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">User Notification Status</CardTitle>
                  <CardDescription>
                    Quick overview of notification preferences by user
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {users.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getRoleIcon(u.role, u.isOrgOwner)}
                          <div>
                            <p className="font-medium text-gray-900">{u.name}</p>
                            <p className="text-sm text-gray-600">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={u.emailNotifications ? "default" : "outline"}>
                            {u.emailNotifications ? 'Enabled' : 'Disabled'}
                          </Badge>
                          {!u.isOrgOwner && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleNotifications(u.id)}
                            >
                              <Settings className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </Card>

      {/* Subscription Management Modal */}
      <SubscriptionManagement 
        isOpen={showSubscriptionManagement}
        onClose={() => setShowSubscriptionManagement(false)}
      />
    </div>
  );
}

