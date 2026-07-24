// web/client/src/app/src/components/AddCompanyPage.jsx
// v3.3 redesign — the full-page "Add company" form (fixes the previously dead
// "Add company" button). Creates a company via POST /api/contacts using the
// existing contactSchema: type='company', name (required), email/phone/website,
// crm.salesStage + crm.source, and contactPersons[]. On success it calls
// onCreated(newId) so the Dashboard opens the new company's record.
// Props: onCancel(), onCreated(id).
import React, { useState } from 'react';
import { ArrowLeft, Plus, X, Building2 } from 'lucide-react';
import PageHero, { HeroButtonOutline, HeroButtonPrimary } from './PageHero.jsx';

const STAGES = [
  { key: 'new',          label: 'Suspect' },
  { key: 'contacted',    label: 'Contacted' },
  { key: 'prospect',     label: 'Prospect' },
  { key: 'hot_prospect', label: 'Hot prospect' },
  { key: 'customer',     label: 'Customer' },
];
const SOURCES = ['Telesales', 'Door knocking', 'E-shot', 'Social media', 'Website', 'Referral'];

const T = {
  base: 'var(--wt-bg-base, #1a1a2e)',
  card: 'var(--wt-bg-card, #242438)',
  border: 'var(--wt-border, #2e2e4a)',
  accent: 'var(--wt-accent, #f59e0b)',
  text: 'var(--wt-text-primary, #ffffff)',
  sub: 'var(--wt-text-secondary, #94a3b8)',
  muted: 'var(--wt-text-muted, #6b7280)',
  red: 'var(--wt-red, #ef4444)',
};
const cardStyle = {
  background: T.card, border: `1px solid ${T.border}`,
  borderRadius: 'var(--wt-radius-lg, 12px)', padding: '16px 18px',
};
const label = { fontSize: 12, color: T.sub, display: 'block', marginBottom: 4 };
const input = {
  background: T.base, border: `1px solid ${T.border}`, color: T.text,
  borderRadius: 'var(--wt-radius-md, 8px)', padding: '9px 11px', fontSize: 13, width: '100%',
};
const emptyContact = { name: '', role: '', phone: '', email: '', isDecisionMaker: false };
const normalizeUrl = (w) => {
  const s = (w || '').trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

export default function AddCompanyPage({ onCancel, onCreated }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [source, setSource] = useState('');
  const [stage, setStage] = useState('new');
  const [contacts, setContacts] = useState([{ ...emptyContact }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const setContact = (i, patch) => setContacts((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const addContact = () => setContacts((cs) => [...cs, { ...emptyContact }]);
  const removeContact = (i) => setContacts((cs) => (cs.length === 1 ? cs : cs.filter((_, idx) => idx !== i)));

  const submit = async () => {
    if (!name.trim()) { setError('Company name is required.'); return; }
    setSaving(true); setError(null);
    const people = contacts
      .filter((c) => c.name.trim())
      .map((c) => ({
        name: c.name.trim(), role: c.role.trim(),
        phone: c.phone.trim(), email: c.email.trim(),
        isDecisionMaker: !!c.isDecisionMaker,
      }));
    const primary = people.find((p) => p.isDecisionMaker)?.name || people[0]?.name || '';
    const payload = {
      type: 'company',
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      website: normalizeUrl(website),
      primaryContact: primary,
      crm: { salesStage: stage || undefined, source: source || undefined },
      contactPersons: people,
    };
    try {
      const r = await fetch('/api/contacts', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        let msg = `HTTP ${r.status}`;
        try { const d = await r.json(); if (d?.error) msg = d.error; } catch { /* ignore */ }
        throw new Error(msg);
      }
      const created = await r.json();
      onCreated && onCreated(created.id);
    } catch (e) {
      setError(e.message === 'Invalid input' ? 'Please check the email and website are valid.' : (e.message || 'Could not create company'));
    } finally {
      setSaving(false);
    }
  };

  const heroActions = (
    <>
      <HeroButtonOutline icon={X} onClick={() => onCancel && onCancel()}>Cancel</HeroButtonOutline>
      <HeroButtonPrimary icon={Plus} onClick={submit}>Create company</HeroButtonPrimary>
    </>
  );

  return (
    <div style={{ background: T.base, minHeight: '100%', padding: '16px 20px', color: T.text }}>
      <button onClick={() => onCancel && onCancel()}
        style={{ background: 'transparent', border: 'none', color: T.sub, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
        <ArrowLeft size={16} /> Back to companies
      </button>

      <PageHero title="Add company" icon={Building2} compact actions={heroActions} />

      {/* Company details */}
      <div style={{ ...cardStyle, marginTop: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Company details</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div>
            <span style={label}>Company name *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ABC Ltd" style={input} autoFocus />
          </div>
          <div>
            <span style={label}>Telephone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01564 555 210" style={input} />
          </div>
          <div>
            <span style={label}>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@abcltd.com" style={input} />
          </div>
          <div>
            <span style={label}>Website</span>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="abcltd.com" style={input} />
          </div>
          <div>
            <span style={label}>Source</span>
            <select value={source} onChange={(e) => setSource(e.target.value)} style={input}>
              <option value="">—</option>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <span style={label}>Stage</span>
            <select value={stage} onChange={(e) => setStage(e.target.value)} style={input}>
              {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Contacts */}
      <div style={{ ...cardStyle, marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Contacts</span>
          <button onClick={addContact}
            style={{ background: 'transparent', border: 'none', color: T.accent, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Plus size={14} /> Add another
          </button>
        </div>

        {contacts.map((c, i) => (
          <div key={i} style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: T.muted }}>Person {i + 1}</span>
              {contacts.length > 1 && (
                <button onClick={() => removeContact(i)} style={{ background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer' }}><X size={15} /></button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              <div><span style={label}>Name</span><input value={c.name} onChange={(e) => setContact(i, { name: e.target.value })} placeholder="Full name" style={input} /></div>
              <div><span style={label}>Role</span><input value={c.role} onChange={(e) => setContact(i, { role: e.target.value })} placeholder="e.g. Director" style={input} /></div>
              <div><span style={label}>Phone</span><input value={c.phone} onChange={(e) => setContact(i, { phone: e.target.value })} placeholder="07700 900 311" style={input} /></div>
              <div><span style={label}>Email</span><input value={c.email} onChange={(e) => setContact(i, { email: e.target.value })} placeholder="name@abcltd.com" style={input} /></div>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.sub, marginTop: 10 }}>
              <input type="checkbox" checked={c.isDecisionMaker} onChange={(e) => setContact(i, { isDecisionMaker: e.target.checked })} /> Primary contact / decision maker
            </label>
          </div>
        ))}
        <div style={{ fontSize: 12, color: T.muted }}>Leave a person blank to skip them — only named people are saved.</div>
      </div>

      {error && <div style={{ fontSize: 13, color: T.red, marginTop: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={() => onCancel && onCancel()}
          style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.sub, borderRadius: 8, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
        <button onClick={submit} disabled={saving || !name.trim()}
          style={{ background: T.accent, color: T.base, border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (saving || !name.trim()) ? 0.6 : 1 }}>
          {saving ? 'Creating…' : 'Create company'}
        </button>
      </div>
    </div>
  );
}
