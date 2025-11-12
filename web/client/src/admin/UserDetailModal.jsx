import { useState, useEffect } from 'react';

export default function UserDetailModal({ user, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    is_suspended: user?.is_suspended || false,
    admin_notes: user?.admin_notes || ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        is_suspended: user.is_suspended || false,
        admin_notes: user.admin_notes || ''
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update user');
      }

      setSuccess('User updated successfully');
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendToggle = async () => {
    setLoading(true);
    setError('');

    try {
      const endpoint = user.is_suspended ? 'unsuspend' : 'suspend';
      const response = await fetch(`/api/admin/users/${user.id}/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${endpoint} user`);
      }

      setSuccess(`User ${endpoint}ed successfully`);
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">User Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">
              {success}
            </div>
          )}

          {/* User Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">User Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">User ID:</span>
                <p className="font-mono text-xs">{user.id}</p>
              </div>
              <div>
                <span className="text-gray-600">Created:</span>
                <p>{new Date(user.created_at).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-600">Last Login:</span>
                <p>{user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</p>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <p>
                  <span className={`px-2 py-1 rounded text-xs ${
                    user.is_suspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {user.is_suspended ? 'Suspended' : 'Active'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Organization Information */}
          {user.organisation && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Organization</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <p>{user.organisation.name}</p>
                </div>
                <div>
                  <span className="text-gray-600">Role:</span>
                  <p className="capitalize">{user.membership?.role || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Plan:</span>
                  <p className="capitalize">{user.organisation.plan}</p>
                </div>
                <div>
                  <span className="text-gray-600">Stripe Subscription:</span>
                  <p className="font-mono text-xs">{user.organisation.stripe_subscription_id || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Current Period End:</span>
                  <p>{user.organisation.current_period_end ? new Date(user.organisation.current_period_end).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Seats:</span>
                  <p>{user.organisation.active_user_count || 0} / {user.organisation.included_seats || 0} ({user.organisation.seat_overage_cached || 0} overage)</p>
                </div>
              </div>

              {/* Cancellation Info */}
              {user.organisation.cancelled_at && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm font-semibold text-yellow-800">Cancelled</p>
                  <p className="text-sm text-yellow-700">Date: {new Date(user.organisation.cancelled_at).toLocaleDateString()}</p>
                  {user.organisation.cancellation_reason && (
                    <p className="text-sm text-yellow-700">Reason: {user.organisation.cancellation_reason}</p>
                  )}
                  {user.organisation.cancellation_comment && (
                    <p className="text-sm text-yellow-700">Comment: {user.organisation.cancellation_comment}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Edit Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Notes
              </label>
              <textarea
                value={formData.admin_notes}
                onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add internal notes about this user..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                type="button"
                onClick={handleSuspendToggle}
                disabled={loading}
                className={`px-4 py-2 rounded text-white ${
                  user.is_suspended
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {user.is_suspended ? 'Unsuspend User' : 'Suspend User'}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
