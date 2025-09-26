import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const nav = useNavigate();
  const [ok, setOk] = useState(null); // null = loading

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch('/api/auth/session', { credentials: 'include' });
        if (!resp.ok) throw new Error('session failed');
        const data = await resp.json();
        if (!cancelled) {
          if (data?.user) {
            setOk(true);
          } else {
            setOk(false);
            nav('/login?next=' + encodeURIComponent(window.location.pathname), { replace: true });
          }
        }
      } catch {
        if (!cancelled) {
          setOk(false);
          nav('/login?next=' + encodeURIComponent(window.location.pathname), { replace: true });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [nav]);

  if (ok === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return ok ? children : null;
}
