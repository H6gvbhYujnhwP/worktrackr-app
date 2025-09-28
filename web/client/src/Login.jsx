import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './context/AuthProvider.jsx';
import { Button } from '@app/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@app/components/ui/card.jsx';
import { Input } from '@app/components/ui/input.jsx';
import { Label } from '@app/components/ui/label.jsx';
import { Alert, AlertDescription } from '@app/components/ui/alert.jsx';
import { Loader2, ArrowLeft } from 'lucide-react';
import worktrackrLogo from './assets/worktrackr_icon_only.png';

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/app/dashboard';
  const { login } = useAuth();
  
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mfaStep, setMfaStep] = useState(false);
  const [challengeId, setChallengeId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (error) setError(null);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    
    try {
      if (mfaStep) {
        // Step 2: Verify MFA code
        const response = await fetch('/api/auth/mfa/verify', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challenge_id: challengeId,
            code: mfaCode
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // MFA successful, navigate to dashboard
          navigate(next, { replace: true });
        } else {
          setError(data.error || 'Invalid MFA code');
        }
      } else {
        // Step 1: Email/password login
        const result = await login(form.email.trim().toLowerCase(), form.password);
        
        if (result.success) {
          // Regular login successful
          navigate(next, { replace: true });
        } else if (result.requires_mfa) {
          // MFA required, switch to MFA step
          setMfaStep(true);
          setChallengeId(result.challenge_id);
          setError(null);
        } else {
          setError(result.error || 'Login failed');
        }
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setBusy(false);
    }
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    try {
      setBusy(true);
      const response = await fetch('/api/auth/mfa/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: challengeId }) // This needs to be fixed - we need user_id not challenge_id
      });
      
      if (response.ok) {
        setResendCooldown(60);
        const timer = setInterval(() => {
          setResendCooldown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err) {
      setError('Failed to resend code');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="logo-container cursor-pointer" onClick={() => navigate('/')}>
              <img src={worktrackrLogo} alt="WorkTrackr Cloud" className="w-12 h-12" />
              <div className="logo-text">
                Work<span className="trackr">Trackr</span> CLOUD
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/')} className="flex items-center text-sm">
                <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Back to </span>Home
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Body */}
      <section className="py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                {mfaStep ? 'Enter verification code' : 'Welcome back'}
              </CardTitle>
              <CardDescription>
                {mfaStep 
                  ? 'We sent a 6-digit code to your email address' 
                  : 'Sign in to access your dashboard'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-6 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={onSubmit} className="space-y-4">
                {mfaStep ? (
                  // MFA Code Step
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="mfaCode">Verification Code</Label>
                      <Input
                        id="mfaCode"
                        name="mfaCode"
                        type="text"
                        maxLength="6"
                        autoComplete="one-time-code"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="text-center text-2xl tracking-widest"
                        required
                      />
                      <p className="text-sm text-gray-500 text-center">
                        Enter the 6-digit code sent to {form.email}
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={resendCooldown > 0}
                        className="text-sm text-indigo-600 hover:text-indigo-500 disabled:text-gray-400"
                      >
                        {resendCooldown > 0 
                          ? `Resend code in ${resendCooldown}s` 
                          : 'Resend code'
                        }
                      </button>
                    </div>
                  </div>
                ) : (
                  // Email/Password Step
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={onChange}
                        placeholder="you@company.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="password">Password</Label>
                        <button
                          type="button"
                          onClick={() => navigate('/forgot-password')}
                          className="text-sm text-indigo-600 hover:text-indigo-500"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        value={form.password}
                        onChange={onChange}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </>
                )}

                <Button type="submit" className="w-full worktrackr-bg-black hover:bg-gray-800" disabled={busy}>
                  {busy ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {mfaStep ? 'Verifying…' : 'Signing in…'}
                    </>
                  ) : (
                    mfaStep ? 'Verify Code' : 'Sign In'
                  )}
                </Button>

                <p className="text-center text-sm text-gray-500 mt-3">
                  New here?{' '}
                  <button className="underline" type="button" onClick={() => navigate('/signup')}>
                    Create an account
                  </button>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
