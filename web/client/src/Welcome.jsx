// web/client/src/Welcome.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Welcome() {
  const nav = useNavigate();
  const [status, setStatus] = useState('Completing signup…');

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const sessionId = sp.get('session_id');

    async function finish() {
      if (!sessionId) {
        setStatus('No Stripe session found. Please contact support.');
        return;
      }
      try {
        const resp = await fetch(`/api/auth/signup/complete?session_id=${encodeURIComponent(sessionId)}`, {
          method: 'POST',
          credentials: 'include'
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data?.error || 'Failed to complete signup');

        setStatus('All set! Redirecting to your dashboard…');
        setTimeout(() => nav('/dashboard'), 1200);
      } catch (e) {
        setStatus(`There was a problem completing signup: ${e.message}`);
      }
    }

    finish();
  }, [nav]);

  return (
    <main style={{ maxWidth: 600, margin: '4rem auto', padding: 20, textAlign: 'center' }}>
      <h1 className="text-3xl font-bold mb-2">Welcome to WorkTrackr Cloud</h1>
      <p className="text-gray-600">{status}</p>
    </main>
  );
}
