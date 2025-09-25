// web/client/src/SignUp.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@app/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@app/components/ui/card.jsx'
import { Input } from '@app/components/ui/input.jsx'
import { Label } from '@app/components/ui/label.jsx'
import { Alert, AlertDescription } from '@app/components/ui/alert.jsx'
import { CheckCircle2, Loader2, Star } from 'lucide-react'
import worktrackrLogo from './assets/worktrackr_icon_only.png'

/** Resolve Stripe price IDs:
 *  - Prefer Vite env vars (VITE_PRICE_STARTER/PRO/ENTERPRISE)
 *  - Else use any price ids saved in localStorage (price_id_starter/pro/enterprise)
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

const plans = [
  {
    key: 'starter',
    name: 'Starter',
    priceLabel: '£49',
    period: '/month',
    badge: null,
    features: [
      'Up to 5 users',
      'Smart ticketing',
      'Email notifications',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    priceLabel: '£99',
    period: '/month',
    badge: { text: 'Most Popular', icon: Star },
    features: [
      'Up to 25 users',
      'Workflow builder',
      'Reports & inspections',
      'Approvals',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    priceLabel: '£299',
    period: '/month',
    badge: null,
    features: [
      'Unlimited users',
      'Advanced workflows',
      'API access',
      'White-labeling',
    ],
  },
]

function PlanCard({ plan, active, disabled, onSelect }) {
  const BadgeIcon = plan.badge?.icon
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => !disabled && onSelect(plan.key)}
      className={[
        'w-full text-left rounded-2xl border p-5 transition focus:outline-none',
        disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md',
        active
          ? 'border-black ring-2 ring-black/10 shadow-lg bg-white'
          : 'border-gray-200 bg-white',
      ].join(' ')}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold">{plan.name}</div>
          <div className="mt-1 flex items-baseline gap-1">
            <div className="text-3xl font-bold">{plan.priceLabel}</div>
            <div className="text-gray-500">{plan.period}</div>
          </div>
        </div>
        {plan.badge && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium worktrackr-bg-yellow text-black">
            {BadgeIcon ? <BadgeIcon className="w-3 h-3" /> : null}
            {plan.badge.text}
          </span>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <CheckCircle2 className="w-4 h-4 worktrackr-yellow flex-shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        <span
          className={[
            'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
            active ? 'bg-black text-white' : 'bg-gray-100 text-gray-800',
          ].join(' ')}
        >
          {active ? 'Selected' : disabled ? 'Unavailable' : 'Select'}
        </span>
      </div>
    </button>
  )
}

export default function SignUp() {
  const nav = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', orgId: '' })
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState(null)
  const [busy, setBusy] = useState(false)

  const priceIds = useMemo(resolvePriceIds, [])
  const [selectedPlan, setSelectedPlan] = useState('') // 'starter' | 'pro' | 'enterprise' | ''
  const selectedPriceId = selectedPlan ? priceIds[selectedPlan] : ''

  // Load preselected plan from Pricing page (if any)
  useEffect(() => {
    const pre = localStorage.getItem('selectedPlan')
    if (pre && ['starter', 'pro', 'enterprise'].includes(pre)) setSelectedPlan(pre)
  }, [])

  function onChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
  }

  function validate() {
    const next = {}
    if (!selectedPlan || !selectedPriceId) next.plan = 'Please choose a plan.'
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

      localStorage.setItem('selectedPlan', selectedPlan)
      localStorage.setItem('orgId', form.orgId.trim())

      window.location.href = data.url
    } catch (err) {
      setGeneralError(err.message || 'Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
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

      {/* Plan cards */}
      <section className="px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map(p => {
              const disabled = !priceIds[p.key]
              return (
                <PlanCard
                  key={p.key}
                  plan={p}
                  active={selectedPlan === p.key}
                  disabled={disabled}
                  onSelect={(k) => setSelectedPlan(k)}
                />
              )
            })}
          </div>
          {(!selectedPlan || !selectedPriceId) && (
            <p className="mt-3 text-center text-sm text-gray-500">
              Select a plan above to continue. You can change plan later.
            </p>
          )}
        </div>
      </section>

      {/* Sign up form */}
      <section className="py-10 px-4">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <CardDescription>Then you’ll be taken to secure checkout</CardDescription>
            </CardHeader>
            <CardContent>
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
                    {errors.plan} (no price configured for the selected plan).
                  </AlertDescription>
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

                <p className="text-center text-xs text-gray-500">
                  By creating an account, you agree to our Terms of Service and Privacy Policy.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
