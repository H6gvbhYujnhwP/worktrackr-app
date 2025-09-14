import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SignUp() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', orgId: '' });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);

  function onChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Clear field-specific error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  }

  function validateForm() {
    const newErrors = {};
    
    // Name validation
    if (!form.name.trim()) {
      newErrors.name = 'Name is required.';
    }
    
    // Email validation
    if (!form.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Email is invalid.';
    }
    
    // Password validation
    if (!form.password) {
      newErrors.password = 'Password is required.';
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }
    
    // Organization ID validation
    if (!form.orgId.trim()) {
      newErrors.orgId = 'Organization ID is required.';
    }
    
    return newErrors;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setGeneralError(null);
    setErrors({});
    
    // Client-side validation
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setBusy(true);
    try {
      const resp = await fetch('/api/public-auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          orgId: form.orgId.trim()
        }),
      });
      
      const data = await resp.json().catch(() => ({}));
      
      if (!resp.ok) {
        // Handle validation errors from backend
        if (data.errors && Array.isArray(data.errors)) {
          const backendErrors = {};
          data.errors.forEach(error => {
            backendErrors[error.field] = error.message;
          });
          setErrors(backendErrors);
        } else {
          setGeneralError(data.error || 'Registration failed');
        }
        return;
      }

      // persist orgId for checkout metadata
      if (data?.user?.orgId) {
        localStorage.setItem('orgId', data.user.orgId);
      }
      
      // Logged in via HttpOnly cookie — go to pricing
      nav('/pricing');
    } catch (e2) {
      setGeneralError(e2.message || 'Network error occurred');
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 16,
  };

  const errorInputStyle = {
    ...inputStyle,
    border: '1px solid #dc2626',
    backgroundColor: '#fef2f2',
  };

  const errorTextStyle = {
    color: '#dc2626',
    fontSize: 14,
    marginTop: 4,
  };

  return (
    <main style={{ maxWidth: 560, margin: '4rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Create your account</h1>
      <p style={{ color: '#555', marginBottom: 24 }}>Start your 7-day free trial.</p>

      {generalError && (
        <div role="alert" style={{ 
          background: '#fff4f4', 
          border: '1px solid #ffd7d7', 
          color: '#a40000', 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 12 
        }}>
          {generalError}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>Name *</div>
          <input 
            name="name" 
            value={form.name} 
            onChange={onChange} 
            required 
            style={errors.name ? errorInputStyle : inputStyle}
            placeholder="Enter your full name"
          />
          {errors.name && <div style={errorTextStyle}>{errors.name}</div>}
        </label>

        <label>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>Email *</div>
          <input 
            name="email" 
            type="email" 
            value={form.email} 
            onChange={onChange} 
            required 
            style={errors.email ? errorInputStyle : inputStyle}
            placeholder="Enter your email address"
          />
          {errors.email && <div style={errorTextStyle}>{errors.email}</div>}
        </label>

        <label>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>Password *</div>
          <input 
            name="password" 
            type="password" 
            value={form.password} 
            onChange={onChange} 
            required 
            minLength={8}
            style={errors.password ? errorInputStyle : inputStyle}
            placeholder="Enter a password (min. 8 characters)"
          />
          {errors.password && <div style={errorTextStyle}>{errors.password}</div>}
        </label>

        <label>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>Organization ID *</div>
          <input 
            name="orgId" 
            value={form.orgId} 
            onChange={onChange} 
            required 
            style={errors.orgId ? errorInputStyle : inputStyle}
            placeholder="Enter your organization ID"
          />
          {errors.orgId && <div style={errorTextStyle}>{errors.orgId}</div>}
        </label>

        <button 
          type="submit" 
          disabled={busy} 
          style={{ 
            marginTop: 8, 
            padding: '12px 16px', 
            border: 'none', 
            borderRadius: 10, 
            background: busy ? '#9ca3af' : '#111827', 
            color: '#fff', 
            fontWeight: 700, 
            cursor: busy ? 'not-allowed' : 'pointer',
            fontSize: 16,
          }}
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p style={{ 
        marginTop: 16, 
        fontSize: 14, 
        color: '#666', 
        textAlign: 'center' 
      }}>
        * All fields are required
      </p>
    </main>
  );
}
