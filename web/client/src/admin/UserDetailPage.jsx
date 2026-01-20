import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@app/components/ui/button.jsx';
import { Input } from '@app/components/ui/input.jsx';
import { Textarea } from '@app/components/ui/textarea.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@app/components/ui/card.jsx';
import { Badge } from '@app/components/ui/badge.jsx';
import { ArrowLeft, Save, Ban, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import worktrackrLogo from '../assets/worktrackr_icon_only.png';

export default function UserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    admin_notes: '',
    newPassword: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState(''); // 'soft' or 'hard'
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }

      const data = await response.json();
      setUserData(data);
      setFormData({
        name: data.user.name || '',
        email: data.user.email || '',
        admin_notes: data.user.admin_notes || '',
        newPassword: ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Prepare data to send
      const dataToSend = {
        name: formData.name,
        email: formData.email,
        admin_notes: formData.admin_notes
      };
      
      // Only include password if it's been set and is at least 8 characters
      if (formData.newPassword && formData.newPassword.length >= 8) {
        dataToSend.password = formData.newPassword;
      }

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update user');
      }

      if (dataToSend.password) {
        setSuccess('User updated successfully! Password has been changed.');
      } else {
        setSuccess('User updated successfully');
      }
      await fetchUserDetails();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSuspendToggle = async () => {
    if (!confirm(`Are you sure you want to ${userData.user.is_suspended ? 'unsuspend' : 'suspend'} this user?`)) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const endpoint = userData.user.is_suspended ? 'unsuspend' : 'suspend';
      const response = await fetch(`/api/admin/users/${userId}/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${endpoint} user`);
      }

      setSuccess(`User ${endpoint}ed successfully`);
      await fetchUserDetails();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError('');
      setSuccess('');

      const endpoint = deleteType === 'soft' ? 'soft-delete' : 'hard-delete';
      const body = deleteType === 'soft' 
        ? { reason: deleteReason }
        : { confirmation: deleteConfirmation };

      const response = await fetch(`/api/admin/users/${userId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      const data = await response.json();
      setSuccess(data.message);
      setShowDeleteModal(false);

      // Redirect to dashboard after successful delete
      setTimeout(() => {
        navigate('/admin87476463/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteModal = (type) => {
    setDeleteType(type);
    setDeleteReason('');
    setDeleteConfirmation('');
    setShowDeleteModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading user details...</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700 mb-4">User not found</p>
          <Button onClick={() => navigate('/admin87476463/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const { user, membership, organisation, audit_logs } = userData;

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
                <p className="text-xs text-gray-500">User Details</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/admin87476463/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - User Info & Edit */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>User account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                  <div>
                    <span className="text-gray-600 block mb-1">User ID</span>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{user.id}</code>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-1">Created</span>
                    <p>{formatDate(user.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-1">Last Login</span>
                    <p>{formatDate(user.last_login)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-1">Status</span>
                    <Badge variant={user.is_suspended ? 'destructive' : 'success'}>
                      {user.is_suspended ? 'Suspended' : 'Active'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Admin Notes</label>
                    <Textarea
                      value={formData.admin_notes}
                      onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                      rows={4}
                      placeholder="Add internal notes about this user..."
                    />
                  </div>

                  {/* Password Change Section */}
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <label className="block text-sm font-medium">Change Password</label>
                    </div>
                    <Input
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      placeholder="Enter new password (min 8 characters, leave empty to keep current)"
                      minLength={8}
                    />
                    <p className="text-xs text-gray-600">
                      🔒 Leave empty to keep the current password. Minimum 8 characters required for new password.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleSave} disabled={saving}>
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>

                    <Button
                      variant={user.is_suspended ? 'outline' : 'destructive'}
                      onClick={handleSuspendToggle}
                      disabled={saving}
                    >
                      {user.is_suspended ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Unsuspend User
                        </>
                      ) : (
                        <>
                          <Ban className="w-4 h-4 mr-2" />
                          Suspend User
                        </>
                      )}
                    </Button>

                    <div className="ml-auto flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => openDeleteModal('soft')}
                        disabled={saving || deleting}
                        className="border-orange-300 text-orange-600 hover:bg-orange-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Disable Login
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={() => openDeleteModal('hard')}
                        disabled={saving || deleting}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Permanently
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organization Information */}
            {organisation && (
              <Card>
                <CardHeader>
                  <CardTitle>Organization</CardTitle>
                  <CardDescription>Subscription and billing details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 block mb-1">Organization Name</span>
                      <p className="font-medium">{organisation.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 block mb-1">Role</span>
                      <Badge variant="outline">{membership?.role || 'N/A'}</Badge>
                    </div>
                    <div>
                      <span className="text-gray-600 block mb-1">Plan</span>
                      <Badge>{organisation.plan}</Badge>
                    </div>
                    <div>
                      <span className="text-gray-600 block mb-1">Seats</span>
                      <p>{organisation.active_user_count || 0} / {organisation.included_seats || 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 block mb-1">Current Period End</span>
                      <p>{formatDate(organisation.current_period_end)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 block mb-1">Stripe Customer</span>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {organisation.stripe_customer_id || 'N/A'}
                      </code>
                    </div>
                  </div>

                  {organisation.cancelled_at && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="font-semibold text-yellow-800 mb-2">Subscription Cancelled</p>
                      <p className="text-sm text-yellow-700">Date: {formatDate(organisation.cancelled_at)}</p>
                      {organisation.cancellation_reason && (
                        <p className="text-sm text-yellow-700">Reason: {organisation.cancellation_reason}</p>
                      )}
                      {organisation.cancellation_comment && (
                        <p className="text-sm text-yellow-700 mt-2">{organisation.cancellation_comment}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Audit Logs */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Audit Log</CardTitle>
                <CardDescription>Recent admin actions</CardDescription>
              </CardHeader>
              <CardContent>
                {audit_logs && audit_logs.length > 0 ? (
                  <div className="space-y-3">
                    {audit_logs.map((log) => (
                      <div key={log.id} className="text-sm border-l-2 border-gray-300 pl-3 py-2">
                        <p className="font-medium">{log.action}</p>
                        <p className="text-gray-600 text-xs">
                          by {log.actor_name || log.actor_email}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {formatDate(log.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No audit logs available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">
              {deleteType === 'soft' ? 'Disable User Login' : 'Permanently Delete User'}
            </h3>
            
            {deleteType === 'soft' ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  This will disable the user's login while keeping all their data in the database for records.
                  The user will not be able to log in, but their information will remain accessible.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-2">Reason (optional)</label>
                  <Textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Enter reason for disabling this user..."
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <p className="text-sm text-red-800 font-medium mb-2">⚠️ Warning: This action cannot be undone!</p>
                  <p className="text-sm text-red-700">
                    This will permanently delete:
                  </p>
                  <ul className="text-sm text-red-700 list-disc list-inside mt-2">
                    <li>User account and login credentials</li>
                    <li>Organization membership</li>
                    <li>All associated data</li>
                    <li>Audit logs for this user</li>
                  </ul>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Type <code className="bg-gray-100 px-2 py-1 rounded">DELETE</code> to confirm
                  </label>
                  <Input
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || (deleteType === 'hard' && deleteConfirmation !== 'DELETE')}
                className="flex-1"
              >
                {deleting ? 'Processing...' : (deleteType === 'soft' ? 'Disable Login' : 'Delete Permanently')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
