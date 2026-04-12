// web/client/src/app/src/components/JobDetailWithLayout.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthProvider.jsx';
import AppLayout from './AppLayout.jsx';
import JobDetail from './JobDetail.jsx';

export default function JobDetailWithLayout() {
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
      <JobDetail />
    </AppLayout>
  );
}
