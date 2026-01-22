import React from 'react';
import { useAuth } from '../../../context/AuthProvider.jsx';
import AppLayout from './AppLayout.jsx';
import QuoteDetails from './QuoteDetails.jsx';

export default function QuoteDetailsWithLayout() {
  const { user, membership } = useAuth();

  // Check if user is admin
  const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';

  return (
    <AppLayout
      user={user}
      isAdmin={isAdmin}
    >
      <QuoteDetails />
    </AppLayout>
  );
}
