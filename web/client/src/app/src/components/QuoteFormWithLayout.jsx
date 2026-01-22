import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthProvider.jsx';
import AppLayout from './AppLayout.jsx';
import QuoteForm from './QuoteForm.jsx';

export default function QuoteFormWithLayout({ mode = 'create' }) {
  const { user, membership } = useAuth();
  const navigate = useNavigate();

  // Check if user is admin
  const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';

  // Navigation handler that maps view names to routes
  const handleNavigate = (view) => {
    const routeMap = {
      'tickets': '/app/tickets',
      'calendar': '/app/calendar',
      'contacts': '/app/contacts',
      'crm': '/app/crm',
      'crm-calendar': '/app/crm/calendar',
      'quotes': '/app/crm/quotes',
      'users': '/app/users',
      'billing': '/app/billing',
      'security': '/app/security',
      'email-intake': '/app/email-intake'
    };

    const route = routeMap[view];
    if (route) {
      navigate(route);
    }
  };

  return (
    <AppLayout
      user={user}
      isAdmin={isAdmin}
      onNavigate={handleNavigate}
    >
      <QuoteForm mode={mode} />
    </AppLayout>
  );
}
