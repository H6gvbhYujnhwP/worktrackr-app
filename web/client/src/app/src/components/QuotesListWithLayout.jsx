import React from 'react';
import { useAuth } from '../../../context/AuthProvider.jsx';
import AppLayout from './AppLayout.jsx';
import QuotesList from './QuotesList.jsx';

export default function QuotesListWithLayout() {
  const { user, membership } = useAuth();

  // Check if user is admin
  const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';

  return (
    <AppLayout
      user={user}
      isAdmin={isAdmin}
    >
      <QuotesList />
    </AppLayout>
  );
}
