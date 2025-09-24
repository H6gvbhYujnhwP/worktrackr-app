import React, { useState } from 'react';
import { useAuth, useSimulation } from '../App.jsx';
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
  Settings
} from 'lucide-react';

export default function UserManagementSimple({ isOpen, onClose }) {
  const { user } = useAuth();
  const { users, setUsers, organization, updateOrganization, emailService } = useSimulation();
  const [activeTab, setActiveTab] = useState('users');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showSubscriptionManagement, setShowSubscriptionManagement] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    mobile: '',
    role: 'staff'
  });

  if (!isOpen) return null;

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) return;
    
    const userToAdd = {
      id: Date.now(),
      name: newUser.name,
      email: newUser.email,
      mobile: newUser.mobile,
      role: newUser.role,
      isOrgOwner: false,
      emailNotifications: true,
      department: 'General',
      status: 'active'
    };

    setUsers([...users, userToAdd]);
    
    // Send welcome email
    emailService.sendEmail({
      to: newUser.email,
      subject: 'Welcome to WorkTrackr',
      body: `Welcome ${newUser.name}! You've been added to the WorkTrackr team.`
    });

    setNewUser({ name: '', email: '', mobile: '', role: 'staff' });
    setShowAddUser(false);
  };

  const handleDeleteUser = (userId) => {
    setUsers(users.filter(u => u.id !== userId));
  };

  const toggleUserRole = (userId) => {
    setUsers(users.map(u => 
      u.id === userId 
        ? { ...u, role: u.role === 'admin' ? 'staff' : 'admin' }
        : u
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-4xl max-h-[95vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 px-4 sm:px-6">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg sm:text-xl">User Management</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <div className="px-4 sm:px-6 pb-4 sm:pb-6 overflow-y-auto max-h-[calc(95vh-120px)]">
          {/* Subscription Status - Clickable */}
          <Card className="mb-4 sm:mb-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowSubscriptionManagement(true)}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm sm:text-base">Pro Plan</h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {users.length} of 25 users
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="default" className="text-xs">
                    £49/month
                  </Badge>
                  <Settings className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <div className="flex space-x-1 mb-4 sm:mb-6">
            <Button
              variant={activeTab === 'users' ? 'default' : 'outline'}
              onClick={() => setActiveTab('users')}
              className="flex-1 text-xs sm:text-sm"
              size="sm"
            >
              <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Team Members
            </Button>
            <Button
              variant={activeTab === 'notifications' ? 'default' : 'outline'}
              onClick={() => setActiveTab('notifications')}
              className="flex-1 text-xs sm:text-sm"
              size="sm"
            >
              <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Notifications
            </Button>
          </div>

          {/* Users Tab */}
          {activeTab === 'users' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">Team Members</CardTitle>
                  <Button size="sm" onClick={() => setShowAddUser(true)} className="text-xs sm:text-sm">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 sm:p-4 border rounded-lg">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        {u.isOrgOwner ? (
                          <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                        ) : u.role === 'admin' ? (
                          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        ) : (
                          <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{u.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{u.email}</p>
                        <p className="text-xs text-gray-500">
                          {u.isOrgOwner ? 'Organization Owner' : u.role === 'admin' ? 'Admin' : 'Staff'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <Badge 
                        variant={u.isOrgOwner ? "default" : u.role === 'admin' ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {u.isOrgOwner ? 'Owner' : u.role === 'admin' ? 'Admin' : 'Staff'}
                      </Badge>
                      {!u.isOrgOwner && (
                        <div className="flex space-x-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => toggleUserRole(u.id)}
                            className="p-1 h-7 w-7"
                          >
                            <Shield className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1 h-7 w-7 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Email Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">Notification settings will be displayed here.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add User Modal */}
        {showAddUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Add New User</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddUser(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="mobile">Mobile Number (Optional)</Label>
                  <Input
                    id="mobile"
                    value={newUser.mobile}
                    onChange={(e) => setNewUser({...newUser, mobile: e.target.value})}
                    placeholder="Enter mobile number"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="admin-toggle">Admin Access</Label>
                  <Switch
                    id="admin-toggle"
                    checked={newUser.role === 'admin'}
                    onCheckedChange={(checked) => setNewUser({...newUser, role: checked ? 'admin' : 'staff'})}
                  />
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddUser(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleAddUser} className="flex-1" disabled={!newUser.name || !newUser.email}>
                    Add User
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Subscription Management Modal */}
        {showSubscriptionManagement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Subscription Management</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowSubscriptionManagement(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Plan */}
                <div>
                  <h3 className="font-medium mb-3">Current Plan</h3>
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Pro Plan</h4>
                          <p className="text-sm text-gray-600">Up to 25 users</p>
                        </div>
                        <Badge variant="default">£49/month</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Plan Options */}
                <div>
                  <h3 className="font-medium mb-3">Available Plans</h3>
                  <div className="space-y-3">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Starter Plan</h4>
                            <p className="text-sm text-gray-600">Up to 5 users</p>
                          </div>
                          <Badge variant="outline">£49/month</Badge>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Pro Plan (Current)</h4>
                            <p className="text-sm text-gray-600">Up to 25 users</p>
                          </div>
                          <Badge variant="default">£49/month</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Enterprise Plan</h4>
                            <p className="text-sm text-gray-600">Up to 100 users</p>
                          </div>
                          <Badge variant="outline">£299/month</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Additional Seats */}
                <div>
                  <h3 className="font-medium mb-3">Additional Seats</h3>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">Extra Users</h4>
                          <p className="text-sm text-gray-600">£7/month per additional user</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">-</Button>
                          <span className="w-8 text-center">0</span>
                          <Button size="sm" variant="outline">+</Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">Current usage: {users.length} of 25 users</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowSubscriptionManagement(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button className="flex-1">
                    Update Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}

