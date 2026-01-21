import React, { useState, useRef } from 'react';
import { useAuth } from '../../../context/AuthProvider.jsx';
import AppLayout from './AppLayout.jsx';
import Dashboard from './Dashboard.jsx';

export default function DashboardWithLayout() {
  const { user, membership } = useAuth();
  const dashboardRef = useRef(null);

  // Check if user is admin
  const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';

  // Handle navigation from sidebar
  const handleSidebarNavigation = (view) => {
    // Call Dashboard's setCurrentView if available
    if (dashboardRef.current && dashboardRef.current.setCurrentView) {
      dashboardRef.current.setCurrentView(view);
    }
  };

  return (
    <AppLayout
      user={user}
      isAdmin={isAdmin}
      onNavigate={handleSidebarNavigation}
    >
      <Dashboard ref={dashboardRef} />
    </AppLayout>
  );
}
