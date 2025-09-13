import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SignUp() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', organisationName: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const resp = await fetch('/api/public-auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || 'Registration failed');

      // persist orgId for checkout metadata
      if (data?.organisation?.id) {
        localStorage.setItem('orgId', data.organisation.id);
      }
      // Logged in via HttpOnly cookie — go to pricing
      nav('/pricing');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 560, margin: '4rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Create your account</h1>
      <p style={{ color: '#555', marginBottom: 24 }}>Start your 7-day free trial.</p>

      {err && <div role="alert" style={{ background:'#fff4f4', border:'1px solid #ffd7d7', color:'#a40000', padding:12, borderRadius:8, marginBottom:12 }}>{err}</div>}

      <form onSubmit={onSubmit} style={{ display:'grid', gap:12 }}>
        <label>
          <div>Name</div>
          <input name="name" value={form.name} onChange={onChange} required style={{ width:'100%', padding:10, borderRadius:8, border:'1px solid #ddd' }} />
        </label>
        <label>
          <div>Email</div>
          <input name="email" type="email" value={form.email} onChange={onChange} required style={{ width:'100%', padding:10, borderRadius:8, border:'1px solid #ddd' }} />
        </label>
        <label>
          <div>Password</div>
          <input name="password" type="password" value={form.password} onChange={onChange} required minLength={8} style={{ width:'100%', padding:10, borderRadius:8, border:'1px solid #ddd' }} />
        </label>
        <label>
          <div>Organisation name</div>
          <input name="organisationName" value={form.organisationName} onChange={onChange} required style={{ width:'100%', padding:10, borderRadius:8, border:'1px solid #ddd' }} />
        </label>

        <button type="submit" disabled={busy} style={{ marginTop:8, padding:'12px 16px', border:'none', borderRadius:10, background: busy ? '#9ca3af' : '#111827', color:'#fff', fontWeight:700, cursor: busy ? 'not-allowed' : 'pointer' }}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </main>
  );
}
