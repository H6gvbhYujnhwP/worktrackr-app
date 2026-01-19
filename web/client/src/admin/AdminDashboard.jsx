import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@app/components/ui/button.jsx';
import { Input } from '@app/components/ui/input.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@app/components/ui/card.jsx';
import { Badge } from '@app/components/ui/badge.jsx';
import { Checkbox } from '@app/components/ui/checkbox.jsx';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@app/components/ui/table.jsx';
import { 
  Shield, 
  Users, 
  Search, 
  Download, 
  Ban, 
  CheckCircle,
  Eye,
  LogOut,
  Trash2
} from 'lucide-react';
import worktrackrLogo from '../assets/worktrackr_icon_only.png';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
    fetchUsers();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (!data.user?.is_master_admin) {
        navigate('/admin87476463');
        return;
      }
      
      setCurrentUser(data.user);
    } catch (error) {
      console.error('Access check failed:', error);
      navigate('/admin87476463');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.items || []);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users?query=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.items || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (userId) => {
    if (!confirm('Are you sure you want to suspend this user?')) return;
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        await fetchUsers();
        alert('User suspended successfully');
      }
    } catch (error) {
      console.error('Suspend error:', error);
      alert('Failed to suspend user');
    }
  };

  const handleUnsuspend = async (userId) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/unsuspend`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        await fetchUsers();
        alert('User unsuspended successfully');
      }
    } catch (error) {
      console.error('Unsuspend error:', error);
      alert('Failed to unsuspend user');
    }
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const toggleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) {
      alert('Please select users to delete');
      return;
    }

    const confirmMessage = `Are you sure you want to PERMANENTLY DELETE ${selectedUsers.length} user(s)? This action cannot be undone and will remove all associated data.`;
    
    if (!confirm(confirmMessage)) return;

    try {
      setIsDeleting(true);
      
      // Delete users one by one
      const deletePromises = selectedUsers.map(userId => 
        fetch(`/api/admin/users/${userId}/hard-delete`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ confirmation: 'DELETE' })
        })
      );

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.ok).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        alert(`Successfully deleted ${successCount} user(s)${failCount > 0 ? `, ${failCount} failed` : ''}`);
        setSelectedUsers([]);
        await fetchUsers();
      } else {
        alert('Failed to delete users');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('An error occurred during bulk delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/users/export', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `worktrackr-users-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export users');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      navigate('/admin87476463');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (user) => {
    if (user.is_suspended) {
      return <Badge variant="destructive">Suspended</Badge>;
    }
    if (user.status === 'active') {
      return <Badge variant="success" className="bg-green-600">Active</Badge>;
    }
    return <Badge variant="secondary">{user.status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img src={worktrackrLogo} alt="WorkTrackr" className="w-10 h-10" />
              <div>
                <h1 className="text-xl font-bold">WorkTrackr Admin</h1>
                <p className="text-xs text-gray-500">Master Admin Panel</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium">{currentUser?.name}</p>
                <p className="text-xs text-gray-500">{currentUser?.email}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>User Management</span>
                </CardTitle>
                <CardDescription>
                  Manage users, roles, and permissions
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                {selectedUsers.length > 0 && (
                  <Button 
                    onClick={handleBulkDelete} 
                    variant="destructive"
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected ({selectedUsers.length})
                  </Button>
                )}
                <Button onClick={handleExport} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search Bar */}
            <div className="flex space-x-2 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Search email or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>

            {/* Users Table */}
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading users...</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={selectedUsers.length === users.length && users.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-gray-500">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={() => toggleSelectUser(user.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {user.membership?.role || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.organisation?.name || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge>
                              {user.organisation?.plan || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(user)}</TableCell>
                          <TableCell>{formatDate(user.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {user.is_suspended ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUnsuspend(user.id)}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSuspend(user.id)}
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/admin87476463/users/${user.id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
