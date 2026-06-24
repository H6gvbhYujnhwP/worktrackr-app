import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthProvider.jsx';
import AppLayout from './AppLayout.jsx';
import Dashboard from './Dashboard.jsx';

export default function DashboardWithLayout() {
  const { user, membership } = useAuth();
  const dashboardRef = useRef(null);

  // Role-based home: a Salesman/Engineer lands on their personal pay page; everyone
  // else lands on Tickets. Lazy-init covers the case where membership is already
  // cached at mount; the one-shot effect below covers the async-load case.
  const roleHome = (role) => (role === 'salesman' || role === 'engineer') ? 'my-pay' : 'tickets';
  const [currentView, setCurrentView] = useState(() => roleHome(membership?.role));
  const homeAppliedRef = useRef(false);

  // Check if user is admin
  const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';
  const isManager = ['admin', 'owner', 'manager'].includes(membership?.role);
  const isEngineer = membership?.role === 'engineer';

  // lastUpdate removed — was triggering a full DashboardWithLayout re-render every
  // 10 seconds for no visible purpose. Nothing in AppLayout uses it meaningfully.

  // Handle navigation state from routes (e.g., coming back from quote editing)
  const location = useLocation();

  // Apply the role-based home exactly once, after membership resolves — unless the
  // user arrived via a deep-link (location.state.view) or has already navigated.
  useEffect(() => {
    if (homeAppliedRef.current) return;
    if (location.state?.view) { homeAppliedRef.current = true; return; }
    if (membership === undefined) return; // still loading — wait for the role
    homeAppliedRef.current = true;
    setCurrentView(roleHome(membership?.role));
  }, [membership, location.state]);

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
      isManager={isManager}
      isEngineer={isEngineer}
      onNavigate={handleSidebarNavigation}
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
