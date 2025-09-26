import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

// user/membership:
//   undefined = loading
//   null      = known empty (not logged in / no membership)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [membership, setMembership] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/session', { credentials: 'include' });
        const d = await r.json();
        if (!cancelled) {
          setUser(d?.user ?? null);
          setMembership(d?.membership ?? null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setMembership(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setMembership(data.membership);
        return { success: true, user: data.user };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setMembership(null);
    }
  };

  const value = { 
    user, 
    membership, 
    setUser, 
    setMembership,
    login,
    logout,
    loading: user === undefined || membership === undefined
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
