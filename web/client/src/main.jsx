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
import { AuthProvider } from './context/AuthProvider.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppEntrypoint from './app/AppEntrypoint.jsx'; // Manus sandbox entry

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<App />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/welcome" element={<Welcome />} />

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
