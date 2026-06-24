import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// --- Global "access paused" catch ------------------------------------------
// The app's screens each call the server independently, so rather than touch
// every call site we wrap fetch once here. When the server says an org is
// blocked (HTTP 402 with error 'subscription_required'), we fire a window event;
// App.jsx listens for it and shows the billing/pay screen full-screen. The
// response still flows through unchanged so individual callers behave normally.
const _origFetch = window.fetch.bind(window);
window.fetch = async (...args) => {
  const res = await _origFetch(...args);
  if (res.status === 402) {
    try {
      // Clone so the original caller can still read the body.
      const data = await res.clone().json();
      if (data && data.error === 'subscription_required') {
        window.dispatchEvent(new CustomEvent('wt:subscription-blocked', { detail: data }));
      }
    } catch {
      /* non-JSON 402 — ignore */
    }
  }
  return res;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
