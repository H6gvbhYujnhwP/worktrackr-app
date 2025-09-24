// web/client/src/SignUp.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// IMPORTANT: use @app/* (your app alias) so we don't collide with Manus '@/'
import { Button } from '@app/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@app/components/ui/card.jsx';
import { Input } from '@app/components/ui/input.jsx';
import { Label } from '@app/components/ui/label.jsx';
import { Alert, AlertDescription } from '@app/components/ui/alert.jsx';

import { CheckCircle, ArrowLeft, Loader2, Shield, Users, Zap } from 'lucide-react';
import worktrackrLogo from './assets/worktrackr_icon_only.png';

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
          orgId: form.orgId.trim(),
        }),
      });

      // Be tolerant to non-JSON errors
      const contentType = resp.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await resp.json().catch(() => ({}))
        : { error: await resp.text().catch(() => 'Registration failed') };

      if (!resp.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          const backendErrors = {};
          data.errors.forEach((error) => {
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

      // Logged in via HttpOnly cookie — go to pricing (or change to /app/dashboard if you prefer)
      nav('/pricing');
    } catch (e2) {
      setGeneralError(e2.message || 'Network error occurred');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="logo-container cursor-pointer" onClick={() => nav('/')}>
              <img src={worktrackrLogo} alt="WorkTrackr Cloud" className="w-12 h-12" />
              <div className="logo-text">
                Work<span className="trackr">Trackr</span> CLOUD
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => nav('/')} className="flex items-center">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">
            Start Your <span className="worktrackr-yellow">Free Trial</span>
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Join thousands of teams already using WorkTrackr Cloud
          </p>
          <p className="text-gray-500">No credit card required • 7-day free trial • Cancel anytime</p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <CardDescription>Get started with your workflow management platform</CardDescription>
            </CardHeader>
            <CardContent>
              {generalError && (
                <Alert className="mb-6 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{generalError}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    placeholder="Enter your full name"
                    className={errors.name ? 'border-red-500 focus:border-red-500' : ''}
                    required
                  />
                  {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={onChange}
                    placeholder="Enter your email address"
                    className={errors.email ? 'border-red-500 focus:border-red-500' : ''}
                    required
                  />
                  {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={onChange}
                    placeholder="Create a secure password (min. 8 characters)"
                    className={errors.password ? 'border-red-500 focus:border-red-500' : ''}
                    minLength={8}
                    required
                  />
                  {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgId">Organization ID *</Label>
                  <Input
                    id="orgId"
                    name="orgId"
                    value={form.orgId}
                    onChange={onChange}
                    placeholder="Enter your organization identifier"
                    className={errors.orgId ? 'border-red-500 focus:border-red-500' : ''}
                    required
                  />
                  {errors.orgId && <p className="text-sm text-red-600">{errors.orgId}</p>}
                </div>

                <Button
                  type="submit"
                  className="w-full worktrackr-bg-black hover:bg-gray-800 text-white"
                  disabled={busy}
                  size="lg"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-4">
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardContent>
          </Card>

          {/* Trust Indicators */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center">
              <Shield className="w-8 h-8 worktrackr-yellow mb-2" />
              <p className="text-sm text-gray-600">Secure & Private</p>
            </div>
            <div className="flex flex-col items-center">
              <Users className="w-8 h-8 worktrackr-yellow mb-2" />
              <p className="text-sm text-gray-600">Trusted by Teams</p>
            </div>
            <div className="flex flex-col items-center">
              <Zap className="w-8 h-8 worktrackr-yellow mb-2" />
              <p className="text-sm text-gray-600">Quick Setup</p>
            </div>
          </div>

          {/* Features Preview */}
          <Card className="mt-8 bg-gray-50">
            <CardHeader>
              <CardTitle className="text-lg text-center">What you'll get:</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 worktrackr-yellow mr-3 flex-shrink-0" />
                  <span className="text-sm">Complete workflow management system</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 worktrackr-yellow mr-3 flex-shrink-0" />
                  <span className="text-sm">Smart ticketing with automation</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 worktrackr-yellow mr-3 flex-shrink-0" />
                  <span className="text-sm">Multi-tenant organization support</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 worktrackr-yellow mr-3 flex-shrink-0" />
                  <span className="text-sm">7-day free trial on all plans</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
