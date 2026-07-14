// web/client/src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import App from './App.jsx';         // Landing page + existing content
import Pricing from './Pricing.jsx'; // Plan selection page
import SignUp from './SignUp.jsx';   // Account creation -> Stripe checkout
import Login from './Login.jsx';     // Sign in page (your existing file)
import Welcome from './Welcome.jsx'; // Post-checkout landing
import ForgotPassword from './pages/ForgotPassword.jsx'; // Password reset request
import ResetPassword from './pages/ResetPassword.jsx'; // Password reset form
import AdminLogin from './AdminLogin.jsx'; // Master admin login
import AdminDashboard from './admin/AdminDashboard.jsx'; // Admin dashboard
import UserDetailPage from './admin/UserDetailPage.jsx'; // Admin user detail page
import { AuthProvider } from './context/AuthProvider.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppEntrypoint from './app/AppEntrypoint.jsx'; // Manus sandbox entry

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public (wrapped in .wt-public so the dark in-app theme, which is
              bundled globally, can't bleed onto these light pages) */}
          <Route path="/" element={<div className="wt-public"><App /></div>} />
          <Route path="/pricing" element={<div className="wt-public"><Pricing /></div>} />
          <Route path="/signup" element={<div className="wt-public"><SignUp /></div>} />
          <Route path="/login" element={<div className="wt-public"><Login /></div>} />
          <Route path="/forgot-password" element={<div className="wt-public"><ForgotPassword /></div>} />
          <Route path="/reset-password" element={<div className="wt-public"><ResetPassword /></div>} />
          <Route path="/welcome" element={<div className="wt-public"><Welcome /></div>} />

          {/* Master Admin (secret URL) */}
          <Route path="/admin87476463" element={<AdminLogin />} />
          <Route path="/admin87476463/dashboard" element={<AdminDashboard />} />
          <Route path="/admin87476463/users/:userId" element={<UserDetailPage />} />

          {/* Protected app area */}
          <Route
            path="/app/*"
            element={
              <ProtectedRoute>
                <AppEntrypoint />
              </ProtectedRoute>
            }
          />

          {/* Helpful redirect */}
          <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
