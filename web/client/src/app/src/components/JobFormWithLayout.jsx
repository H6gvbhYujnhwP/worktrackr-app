// web/client/src/app/src/components/JobFormWithLayout.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthProvider.jsx';
import AppLayout from './AppLayout.jsx';
import JobForm from './JobForm.jsx';

export default function JobFormWithLayout() {
  const { user, membership } = useAuth();
  const navigate = useNavigate();

  const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';

  const handleNavigate = (view) => {
    navigate('/app/dashboard', {
      state: { view },
      replace: false,
    });
  };

  return (
    <AppLayout
      user={user}
      isAdmin={isAdmin}
      onNavigate={handleNavigate}
      currentView="jobs"
    >
      <JobForm />
    </AppLayout>
  );
}
