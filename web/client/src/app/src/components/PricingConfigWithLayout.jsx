import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import AppLayout from './AppLayout.jsx';
import PricingConfig from './PricingConfig.jsx';

export default function PricingConfigWithLayout() {
  const { user, membership } = useAuth();
  const navigate = useNavigate();

  // Check if user is admin
  const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';

  // Navigation handler - always navigate to dashboard with state
  // This ensures consistent navigation behavior across the app
  const handleNavigate = (view) => {
    navigate('/app/dashboard', { 
      state: { view: view },
      replace: false
    });
  };

  return (
    <AppLayout
      user={user}
      isAdmin={isAdmin}
      onNavigate={handleNavigate}
    >
      <PricingConfig />
    </AppLayout>
  );
}
