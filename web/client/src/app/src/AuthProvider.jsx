// web/client/src/app/src/AuthProvider.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState(null);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        
        // If user has membership, get organization details
        if (data.membership) {
          await fetchOrganization(data.membership.orgId);
        }
      } else {
        setUser(null);
        setOrganization(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganization = async (orgId) => {
    try {
      const response = await fetch(`/api/organizations/${orgId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrganization(data.organization);
      }
    } catch (error) {
      console.error('Failed to fetch organization:', error);
    }
  };

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
        
        if (data.membership) {
          await fetchOrganization(data.membership.orgId);
        }
        
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
      setOrganization(null);
    }
  };

  const value = {
    user,
    organization,
    loading,
    login,
    logout,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
