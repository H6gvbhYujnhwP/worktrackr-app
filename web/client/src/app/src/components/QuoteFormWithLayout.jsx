import React from 'react';
import { useAuth } from '../../../context/AuthProvider.jsx';
import AppLayout from './AppLayout.jsx';
import QuoteForm from './QuoteForm.jsx';

export default function QuoteFormWithLayout({ mode = 'create' }) {
  const { user, membership } = useAuth();

  // Check if user is admin
  const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';

  return (
    <AppLayout
      user={user}
      isAdmin={isAdmin}
    >
      <QuoteForm mode={mode} />
    </AppLayout>
  );
}
