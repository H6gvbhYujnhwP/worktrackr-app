// web/client/src/SignUp.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Loader2, CheckCircle, ArrowLeft, BadgeCheck } from 'lucide-react'
import worktrackrLogo from './assets/worktrackr_icon_only.png'

/**
 * Map your Stripe Price IDs to a friendly label shown on the form.
 * Replace the placeholder values with your live price IDs (or keep as-is if you’re
 * already writing them from Pricing.jsx via localStorage).
 */
const PRICE_META = {
  // Example:
  // 'price_123STARTER': { name: 'Starter', amount: '£49', suffix: '/month' },
  // 'price_123PRO':     { name: 'Pro',     amount: '£99', suffix: '/month' },
  // 'price_123ENT':     { name: 'Enterprise', amount: '£299', suffix: '/month' },
}

export default function SignUp() {
  const nav = useNavigate()
  const [qs] = useSearchParams()

  const [form, setForm] = useState({ full_name: '', email: '', password: '', org_slug: '' })
  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [generalError, setGeneralError] = useState(null)
  const [selectedPriceId, setSelectedPriceId] = useState('')

  // Resolve the selected plan (URL param takes precedence, otherwise localStorage)
  useEffect(() => {
    const urlPrice = qs.get('price')
    const stored = localStorage.getItem('selectedPriceId') || ''
    const chosen = urlPrice || stored || ''
    setSelectedPriceId(chosen)
  }, [qs])

  const selectedPlanMeta = useMemo(() => {
    if (!selectedPriceId) return null
    return PRICE_META[selectedPriceId] || { name: 'Selected plan', amount: '', suffix: '' }
  }, [selectedPriceId])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((s) => ({ ...s, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors((s) => ({ ...s, [name]: null }))
    }
    setGeneralError(null)
  }

  const validate = () => {
    const errs = {}
    if (!selectedPriceId) errs.price = 'Please choose a plan on the pricing page first.'
    if (!form.full_name.trim()) errs.full_name = 'Full name is required.'
    if (!form.email.trim()) errs.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email.'
    if (!form.password || form.password.length < 8) errs.password = 'Password must be at least 8 characters.'
    if (!form.org_slug.trim()) errs.org_slug = 'Organization ID is required.'
    return errs
  }

  const submit = async (e) => {
    e.preventDefault()
    setGeneralError(null)
    setFieldErrors({})
    const errs = validate()
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }

    try {
      setBusy(true)
      // keep what Pricing wrote so /welcome/flows can still read it if needed
      localStorage.setItem('selectedPriceId', selectedPriceId)

      const resp = await fetch('/api/auth/signup/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          org_slug: form.org_slug.trim(),
          price_id: selectedPriceId,
        }),
      })

      const data = await resp.json().catch(() => ({}))
      if (!resp.ok || !data?.url) {
        // surface validation-style messages if present
        if (data?.error) setGeneralError(data.error)
        else setGeneralError('Failed to start checkout. Please try again.')
        return
      }

      // Off to Stripe 🎟️
      window.location.href = data.url
    } catch (err) {
      setGeneralError(err.message || 'Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="logo-container cursor-pointer" onClick={() => nav('/')}>
              <img src={worktrackrLogo} alt="WorkTrackr Cloud" className="w-10 h-10" />
              <div className="logo-text">
                Work<span className="trackr">Trackr</span> CLOUD
              </div>
            </div>

            <div className="text-sm">
              Already have an account?{' '}
              <button className="underline hover:opacity-80" onClick={() => nav('/login')}>
                Sign in
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Title */}
      <section className="py-10 px-4 text-center">
        <h1 className="text-4xl font-bold">
          Start Your <span className="worktrackr-yellow">Free Trial</span>
        </h1>
        <p className="text-gray-600 mt-2">7-day free trial • Cancel anytime</p>
      </section>

      <section className="px-4 pb-16">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <CardDescription>You’ll be taken to secure checkout next</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Plan status */}
              {!selectedPriceId ? (
                <Alert className="mb-6 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    No plan selected. Please choose a plan on the{' '}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => nav('/pricing')}
                    >
                      pricing page
                    </button>
                    .
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="mb-6 flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <BadgeCheck className="w-5 h-5 worktrackr-yellow" />
                    <div>
                      <div className="font-medium">
                        {selectedPlanMeta?.name || 'Selected plan'}
                      </div>
                      {(selectedPlanMeta?.amount || selectedPlanMeta?.suffix) && (
                        <div className="text-sm text-gray-600">
                          {selectedPlanMeta?.amount}
                          {selectedPlanMeta?.suffix ? (
                            <span className="text-gray-500">{selectedPlanMeta.suffix}</span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-sm underline"
                    onClick={() => nav('/pricing')}
                  >
                    Change plan
                  </button>
                </div>
              )}

              {generalError && (
                <Alert className="mb-6 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{generalError}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={form.full_name}
                    onChange={onChange}
                    placeholder="Enter your full name"
                    className={fieldErrors.full_name ? 'border-red-500' : ''}
                  />
                  {fieldErrors.full_name && (
                    <p className="text-sm text-red-600">{fieldErrors.full_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={onChange}
                    placeholder="you@company.com"
                    className={fieldErrors.email ? 'border-red-500' : ''}
                  />
                  {fieldErrors.email && (
                    <p className="text-sm text-red-600">{fieldErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={onChange}
                    placeholder="Minimum 8 characters"
                    className={fieldErrors.password ? 'border-red-500' : ''}
                  />
                  {fieldErrors.password && (
                    <p className="text-sm text-red-600">{fieldErrors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org_slug">Organization ID *</Label>
                  <Input
                    id="org_slug"
                    name="org_slug"
                    value={form.org_slug}
                    onChange={onChange}
                    placeholder="e.g. acme-ltd"
                    className={fieldErrors.org_slug ? 'border-red-500' : ''}
                  />
                  {fieldErrors.org_slug && (
                    <p className="text-sm text-red-600">{fieldErrors.org_slug}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full worktrackr-bg-black hover:bg-gray-800 text-white"
                  disabled={busy || !selectedPriceId}
                  size="lg"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Continuing…
                    </>
                  ) : (
                    'Continue to Checkout'
                  )}
                </Button>

                <div className="text-center text-xs text-gray-500">
                  By creating an account you agree to our Terms & Privacy Policy
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mt-8 flex justify-center">
            <Button variant="ghost" onClick={() => nav('/')} className="flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>

          {/* trust bullets */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center">
              <CheckCircle className="w-8 h-8 worktrackr-yellow mb-2" />
              <p className="text-sm text-gray-600">Secure & Private</p>
            </div>
            <div className="flex flex-col items-center">
              <CheckCircle className="w-8 h-8 worktrackr-yellow mb-2" />
              <p className="text-sm text-gray-600">Trusted by Teams</p>
            </div>
            <div className="flex flex-col items-center">
              <CheckCircle className="w-8 h-8 worktrackr-yellow mb-2" />
              <p className="text-sm text-gray-600">Quick Setup</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
