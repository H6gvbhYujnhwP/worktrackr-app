// web/client/src/SignUp.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@app/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@app/components/ui/card.jsx'
import { Input } from '@app/components/ui/input.jsx'
import { Label } from '@app/components/ui/label.jsx'
import { Alert, AlertDescription } from '@app/components/ui/alert.jsx'
import { Loader2 } from 'lucide-react'
import worktrackrLogo from './assets/worktrackr_icon_only.png'

/**
 * Price ID resolution:
 * 1) Prefer Vite env vars if present (production-friendly)
 * 2) Else, use any localStorage overrides set by Pricing.jsx (e.g. "price_id_starter")
 * 3) Else, leave blank (and the UI will prevent submission)
 */
function resolvePriceIds() {
  const ls = typeof window !== 'undefined' ? window.localStorage : null
  const fromEnv = {
    starter: import.meta.env.VITE_PRICE_STARTER || '',
    pro: import.meta.env.VITE_PRICE_PRO || '',
    enterprise: import.meta.env.VITE_PRICE_ENTERPRISE || '',
  }
  const fromLocal = {
    starter: ls?.getItem('price_id_starter') || '',
    pro: ls?.getItem('price_id_pro') || '',
    enterprise: ls?.getItem('price_id_enterprise') || '',
  }
  return {
    starter: fromEnv.starter || fromLocal.starter || '',
    pro: fromEnv.pro || fromLocal.pro || '',
    enterprise: fromEnv.enterprise || fromLocal.enterprise || '',
  }
}

export default function SignUp() {
  const nav = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', orgId: '' })
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState(null)
  const [busy, setBusy] = useState(false)

  // plan picking
  const [selectedPlan, setSelectedPlan] = useState('') // 'starter' | 'pro' | 'enterprise' | ''
  const priceIds = useMemo(resolvePriceIds, [])
  const selectedPriceId = selectedPlan ? priceIds[selectedPlan] : ''

  // If Pricing page set a plan in storage, auto-load it
  useEffect(() => {
    const preselected = localStorage.getItem('selectedPlan')
    if (preselected && ['starter', 'pro', 'enterprise'].includes(preselected)) {
      setSelectedPlan(preselected)
    }
  }, [])

  function onChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
  }

  function validate() {
    const next = {}
    if (!selectedPlan || !selectedPriceId) {
      next.plan = 'Please choose a plan above.'
    }
    if (!form.name.trim()) next.name = 'Name is required.'
    if (!form.email.trim()) next.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Email is invalid.'
    if (!form.password || form.password.length < 8) next.password = 'Password must be at least 8 characters.'
    if (!form.orgId.trim()) next.orgId = 'Organization ID is required.'
    return next
  }

  async function onSubmit(e) {
    e.preventDefault()
    setGeneralError(null)
    const v = validate()
    if (Object.keys(v).length) {
      setErrors(v)
      return
    }

    setBusy(true)
    try {
      // Kick off Stripe checkout (Option B)
      // Server expects: full_name, email, password, org_slug, price_id
      const resp = await fetch('/api/auth/signup/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          org_slug: form.orgId.trim(),
          price_id: selectedPriceId,
        }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok || !data?.url) {
        // show server-side field errors if provided
        if (data?.details && Array.isArray(data.details)) {
          const backend = {}
          data.details.forEach(d => {
            if (d?.path?.[0]) backend[d.path[0]] = d.message
          })
          setErrors(backend)
        } else if (data?.error) {
          setGeneralError(data.error)
        } else {
          setGeneralError('Failed to start checkout')
        }
        return
      }

      // Persist selection for later pages (optional)
      localStorage.setItem('selectedPlan', selectedPlan)
      localStorage.setItem('orgId', form.orgId.trim())

      // Off you go to Stripe Checkout
      window.location.href = data.url
    } catch (err) {
      setGeneralError(err.message || 'Network error')
    } finally {
      setBusy(false)
    }
  }

  const PlanButton = ({ planKey, children }) => {
    const active = selectedPlan === planKey
    const hasId = priceIds[planKey]
    const common = 'px-4 py-2 rounded border transition text-sm'
    const inactive = 'border-gray-300 text-gray-700 hover:bg-gray-50'
    const activeCls = 'bg-black text-white border-black'
    const disabledCls = 'opacity-60 cursor-not-allowed'
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={() => hasId && setSelectedPlan(planKey)}
        className={`${common} ${active ? activeCls : inactive} ${!hasId ? disabledCls : ''}`}
        title={!hasId ? 'Price ID not configured' : ''}
      >
        {children}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav (logo + back) */}
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="logo-container cursor-pointer" onClick={() => nav('/')}>
              <img src={worktrackrLogo} alt="WorkTrackr Cloud" className="w-10 h-10" />
              <div className="logo-text">
                Work<span className="trackr">Trackr</span> CLOUD
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="underline">Sign in</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Heading */}
      <section className="py-10 text-center">
        <h1 className="text-4xl font-bold">
          Start Your <span className="worktrackr-yellow">Free Trial</span>
        </h1>
        <p className="mt-3 text-gray-600">
          Join thousands of teams already using WorkTrackr Cloud
        </p>
        <p className="text-gray-500">7-day free trial • Cancel anytime</p>
      </section>

      {/* Main card */}
      <section className="px-4 pb-16">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <CardDescription>Then you’ll be taken to secure checkout</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Error banners */}
              {generalError && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {generalError}
                  </AlertDescription>
                </Alert>
              )}
              {errors.plan && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {errors.plan} <Link to="/pricing" className="underline">pricing page</Link>.
                  </AlertDescription>
                </Alert>
              )}

              {/* Inline plan picker */}
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-2">Pick a plan now:</p>
                <div className="flex gap-2">
                  <PlanButton planKey="starter">Starter</PlanButton>
                  <PlanButton planKey="pro">Pro</PlanButton>
                  <PlanButton planKey="enterprise">Enterprise</PlanButton>
                </div>
                {!selectedPlan && (
                  <p className="mt-2 text-xs text-gray-500">
                    Or choose on the <Link to="/pricing" className="underline">pricing page</Link>.
                  </p>
                )}
              </div>

              {/* Sign up form */}
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    placeholder="Enter your full name"
                    className={errors.name ? 'border-red-500' : ''}
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
                    className={errors.email ? 'border-red-500' : ''}
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
                    className={errors.password ? 'border-red-500' : ''}
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
                    className={errors.orgId ? 'border-red-500' : ''}
                    required
                  />
                  {errors.orgId && <p className="text-sm text-red-600">{errors.orgId}</p>}
                </div>

                <Button
                  type="submit"
                  className="w-full worktrackr-bg-black hover:bg-gray-800 text-white"
                  disabled={busy || !selectedPlan || !selectedPriceId}
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
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
