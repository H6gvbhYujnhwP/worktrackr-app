// web/client/src/SignUp.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';

export default function SignUp() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', orgId: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // (Optional) allow /signup?plan=starter as a fallback
  const PRICE_IDS = useMemo(() => ({
    starter: import.meta.env.VITE_STRIPE_PRICE_STARTER || '',
    pro: import.meta.env.VITE_STRIPE_PRICE_PRO || '',
    enterprise: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE || '',
  }), []);

  useEffect(() => {
    const qp = new URLSearchParams(window.location.search);
    const plan = qp.get('plan'); // 'starter'|'pro'|'enterprise'
    if (plan && PRICE_IDS[plan]) {
      localStorage.setItem('selectedPriceId', PRICE_IDS[plan]);
    }
  }, [PRICE_IDS]);

  const selectedPriceId = localStorage.getItem('selectedPriceId') || '';

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    if (!selectedPriceId) {
      setError('No plan selected. Please choose a plan first.');
      return;
    }
    if (!form.name || !form.email || !form.password || !form.orgId) {
      setError('Please complete all required fields.');
      return;
    }

    try {
      setBusy(true);
      const resp = await fetch('/api/auth/signup/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          org_slug: form.orgId.trim(),
          price_id: selectedPriceId, // pass chosen plan to backend
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.url) {
        throw new Error(data?.error || 'Failed to start checkout');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err.message || 'Unexpected error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="py-10 px-4 text-center">
        <h1 className="text-4xl font-bold">Start Your <span className="worktrackr-yellow">Free Trial</span></h1>
        <p className="text-gray-600 mt-2">Join thousands of teams already using WorkTrackr Cloud</p>
        <p className="text-gray-500">7-day free trial • Cancel anytime</p>
      </section>

      <section className="py-6 px-4">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <CardDescription>Then you’ll be taken to secure checkout</CardDescription>
            </CardHeader>
            <CardContent>
              {(!selectedPriceId) && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    No plan selected. Please choose a plan on the <Link to="/pricing" className="underline">pricing page</Link>.
                  </AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Optional tiny fallback picker if someone lands here directly */}
              {!selectedPriceId && (
                <div className="mb-5">
                  <p className="text-sm mb-2">Or pick a plan now:</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => { localStorage.setItem('selectedPriceId', PRICE_IDS.starter); nav(0); }}>Starter</Button>
                    <Button type="button" variant="outline" onClick={() => { localStorage.setItem('selectedPriceId', PRICE_IDS.pro); nav(0); }}>Pro</Button>
                    <Button type="button" variant="outline" onClick={() => { localStorage.setItem('selectedPriceId', PRICE_IDS.enterprise); nav(0); }}>Enterprise</Button>
                  </div>
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" name="name" value={form.name} onChange={onChange} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" name="email" type="email" value={form.email} onChange={onChange} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input id="password" name="password" type="password" minLength={8} value={form.password} onChange={onChange} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgId">Organization ID *</Label>
                  <Input id="orgId" name="orgId" value={form.orgId} onChange={onChange} required />
                </div>

                <Button
                  type="submit"
                  className="w-full worktrackr-bg-black hover:bg-gray-800 text-white"
                  disabled={busy || !selectedPriceId}
                >
                  {busy ? 'Preparing checkout…' : 'Continue to Checkout'}
                </Button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-4">
                Already have an account? <Link className="underline" to="/login">Sign in</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
