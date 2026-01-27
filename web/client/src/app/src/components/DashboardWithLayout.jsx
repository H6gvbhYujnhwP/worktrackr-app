import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../context/AuthProvider.jsx';
import AppLayout from './AppLayout.jsx';
import Dashboard from './Dashboard.jsx';

export default function DashboardWithLayout() {
  const { user, membership } = useAuth();
  const dashboardRef = useRef(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [currentView, setCurrentView] = useState('tickets');

  // Check if user is admin
  const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';

  // Auto-refresh timestamp every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle navigation from sidebar
  const handleSidebarNavigation = (view) => {
    console.log('[DashboardWithLayout] Navigation to:', view);
    
    // Update local state first
    setCurrentView(view);
    
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
      lastUpdate={lastUpdate}
      currentView={currentView}
    >
      <Dashboard ref={dashboardRef} />
    </AppLayout>
  );
}
