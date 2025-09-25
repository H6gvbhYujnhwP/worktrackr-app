// web/client/src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

import App from './App.jsx';         // Landing page + existing content
import Pricing from './Pricing.jsx'; // Plan selection page
import SignUp from './SignUp.jsx';   // Account creation -> Stripe checkout
import Login from './Login.jsx';     // Sign in page (your existing file)
import Welcome from './Welcome.jsx'; // Post-checkout landing

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<App />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/welcome" element={<Welcome />} />

        {/* You can add /dashboard or other protected routes inside App or here */}
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
