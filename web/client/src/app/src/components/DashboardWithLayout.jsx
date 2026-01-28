import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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

  // Handle navigation state from routes (e.g., coming back from quote editing)
  const location = useLocation();
  useEffect(() => {
    if (location.state?.view) {
      console.log('[DashboardWithLayout] Received navigation state:', location.state.view);
      setCurrentView(location.state.view);
      
      // Clear viewing ticket when navigating via state
      if (dashboardRef.current && dashboardRef.current.clearViewingTicket) {
        dashboardRef.current.clearViewingTicket();
      }
      
      // Clear the state to prevent re-triggering on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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
