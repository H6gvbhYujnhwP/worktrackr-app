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

  // Handle navigation from sidebar OR from Dashboard child component
  // This is now the SINGLE SOURCE OF TRUTH for navigation state
  const handleSidebarNavigation = (view) => {
    console.log('[DashboardWithLayout] Navigation to:', view);
    
    // Update the single source of truth
    setCurrentView(view);
    
    // Clear any viewing ticket when navigating
    if (dashboardRef.current && dashboardRef.current.clearViewingTicket) {
      dashboardRef.current.clearViewingTicket();
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
      {/* Dashboard is now a CONTROLLED COMPONENT */}
      {/* It receives currentView as a prop and calls onViewChange to request changes */}
      <Dashboard 
        ref={dashboardRef}
        currentView={currentView}
        onViewChange={handleSidebarNavigation}
      />
    </AppLayout>
  );
}
