import React from 'react';
import { useAuth } from '../../../context/AuthProvider.jsx';
import AppLayout from './AppLayout.jsx';
import Dashboard from './Dashboard.jsx';

export default function DashboardWithLayout() {
  const { user, membership } = useAuth();

  // Determine current page based on URL or state
  const getCurrentPage = () => {
    const path = window.location.pathname;
    if (path.includes('/crm')) return 'crm';
    if (path.includes('/calendar')) return 'ticket-calendar';
    if (path.includes('/settings')) return 'settings';
    return 'tickets';
  };

  // Check if user is admin
  const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';

  return (
    <AppLayout
      currentPage={getCurrentPage()}
      user={user}
      isAdmin={isAdmin}
    >
      <Dashboard />
    </AppLayout>
  );
}
