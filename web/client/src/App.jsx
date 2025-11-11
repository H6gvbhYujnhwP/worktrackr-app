// web/client/src/App.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@app/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@app/components/ui/card.jsx'
import { Badge } from '@app/components/ui/badge.jsx'
import { Ticket, Users, Workflow, CreditCard, CheckCircle, Star } from 'lucide-react'
import worktrackrLogo from './assets/worktrackr_icon_only.png'
import './App.css'

function App() {
  const [apiResult, setApiResult] = useState('')
  const [busy, setBusy] = useState(null) // 'starter' | 'pro' | 'enterprise' | null
  const navigate = useNavigate()

  const testAPI = async (endpoint, method = 'GET', data = null) => {
    setApiResult('Testing ' + endpoint + '...')
    try {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined
      }
      const response = await fetch(endpoint, options)
      const contentType = response.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      const result = isJson ? await response.json() : await response.text()

      if (response.ok) {
        setApiResult(`✅ ${endpoint} - Success:\n${isJson ? JSON.stringify(result, null, 2) : result}`)
      } else {
        setApiResult(`❌ ${endpoint} - Error:\n${isJson ? JSON.stringify(result, null, 2) : result}`)
      }
    } catch (error) {
      setApiResult(`❌ ${endpoint} - Network Error: ${error.message}`)
    }
  }

  async function startCheckout(plan) {
    try {
      setBusy(plan)
      const resp = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan, orgId: localStorage.getItem('orgId') }) // include orgId if present
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok || !data?.url) throw new Error(data?.error || 'Checkout failed')
      window.location.href = data.url // redirect to Stripe Checkout
    } catch (e) {
      console.error('Checkout error:', e)
      alert(e.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="logo-container">
              <img src={worktrackrLogo} alt="WorkTrackr Cloud" className="w-12 h-12" />
              <div className="logo-text">
                Work<span className="trackr">Trackr</span> CLOUD
              </div>
            </div>
            <div className="flex space-x-2 sm:space-x-4">
              <Button variant="outline" size="sm" className="sm:size-default" onClick={() => navigate('/login')}>Login</Button>
              <Button
                size="sm"
                className="sm:size-default worktrackr-bg-black hover:bg-gray-800"
                onClick={() => navigate('/pricing')}   // ⬅ go pick a plan first
                aria-label="Start free trial"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Custom Workflows. <span className="worktrackr-yellow">Zero Hassle.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            The complete workflow and ticketing system designed for IT support providers, maintenance teams, and service organizations.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:space-x-4">
            <Button
              size="lg"
              className="worktrackr-bg-black hover:bg-gray-800"
              onClick={() => navigate('/pricing')}    // ⬅ go pick a plan first
            >
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline">
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything you need to manage workflows
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card>
              <CardHeader>
                <Ticket className="w-8 h-8 worktrackr-yellow mb-2" />
                <CardTitle>Smart Ticketing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Create, assign, and track tickets with automated workflows and SLA monitoring.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-8 h-8 worktrackr-yellow mb-2" />
                <CardTitle>Multi-Tenant</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Partner accounts can manage multiple customer organizations with white-label branding.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Workflow className="w-8 h-8 worktrackr-yellow mb-2" />
                <CardTitle>Custom Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Build automated workflows with triggers, actions, and escalation rules.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CreditCard className="w-8 h-8 worktrackr-yellow mb-2" />
                <CardTitle>Billing Ready</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Integrated Stripe billing with subscription management and customer portals.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section (kept — lets users choose here too) */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Simple, transparent pricing</h2>
          <p className="text-center text-gray-600 mb-12">7-day free trial on all plans</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-6 max-w-6xl mx-auto">
            {/* Starter */}
            <Card>
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <CardDescription>Perfect for small teams</CardDescription>
                <div className="text-3xl font-bold">
                  £49<span className="text-lg font-normal text-gray-600">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />1 user included</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />Advanced ticketing</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />Email notifications</li>
                  <li className="flex items-center text-sm text-gray-600">+ £15/month per additional user</li>
                </ul>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={busy === 'starter'}
                  onClick={() => startCheckout('starter')}
                >
                  {busy === 'starter' ? 'Preparing…' : 'Choose Plan'}
                </Button>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="border-2 worktrackr-border-yellow relative">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 worktrackr-bg-yellow text-black">
                <Star className="w-3 h-3 mr-1" />
                Most Popular
              </Badge>
              <CardHeader>
                <CardTitle>Pro</CardTitle>
                <CardDescription>For growing organizations</CardDescription>
                <div className="text-3xl font-bold">
                  £99<span className="text-lg font-normal text-gray-600">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />5 users included</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />Workflow builder</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />Reports & inspections</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />Approvals</li>
                  <li className="flex items-center text-sm text-gray-600">+ £15/month per additional user</li>
                </ul>
                <Button
                  className="w-full worktrackr-bg-yellow text-black hover:bg-yellow-400"
                  disabled={busy === 'pro'}
                  onClick={() => startCheckout('pro')}
                >
                  {busy === 'pro' ? 'Preparing…' : 'Choose Plan'}
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise */}
            <Card>
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <CardDescription>For large organizations</CardDescription>
                <div className="text-3xl font-bold">
                  £299<span className="text-lg font-normal text-gray-600">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />50 users included</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />Advanced workflows</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />API access</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />White-labeling</li>
                  <li className="flex items-center text-sm text-gray-600">+ £15/month per additional user</li>
                </ul>
                <Button
                  className="w-full worktrackr-bg-black hover:bg-gray-800"
                  disabled={busy === 'enterprise'}
                  onClick={() => startCheckout('enterprise')}
                >
                  {busy === 'enterprise' ? 'Preparing…' : 'Choose Plan'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* API Testing Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">🧪 API Testing</h2>
          <p className="text-center text-gray-600 mb-8">Test the WorkTrackr Cloud API endpoints</p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Button onClick={() => testAPI('/health', 'GET')} variant="outline">Health Check</Button>
            <Button
              onClick={() => testAPI('/api/auth/register', 'POST', {
                email: 'test@example.com', name: 'Test User', password: 'password123', organizationName: 'Test Org'
              })}
              variant="outline"
            >
              Test Registration
            </Button>
            <Button onClick={() => testAPI('/api/tickets', 'GET')} variant="outline">List Tickets</Button>
          </div>

          {apiResult && (
            <Card>
              <CardHeader><CardTitle>API Response</CardTitle></CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto whitespace-pre-wrap">
                  {apiResult}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="logo-container mb-4">
                <img src={worktrackrLogo} alt="WorkTrackr Cloud" className="w-8 h-8" />
                <div className="text-lg font-bold text-white">
                  Work<span className="worktrackr-yellow">Trackr</span> CLOUD
                </div>
              </div>
              <p className="text-gray-400">Custom workflows. Zero hassle.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Features</li><li>Pricing</li><li>API</li><li>Documentation</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li>About</li><li>Blog</li><li>Careers</li><li>Contact</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li><li>Community</li><li>Status</li><li>Security</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 WorkTrackr Cloud. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
