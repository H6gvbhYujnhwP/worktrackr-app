// web/client/src/Pricing.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@app/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@app/components/ui/card.jsx'
import { Badge } from '@app/components/ui/badge.jsx'
import { CheckCircle, Star } from 'lucide-react'

// 1) Prefer environment variables (Vite exposes only VITE_* vars to the client)
// 2) Fallback to hard-coded placeholders so you can paste real IDs if you want
const PRICE_STARTER =
  import.meta.env.VITE_PRICE_STARTER || 'price_xxx_STARTER' // ← replace with your real Stripe price id if not using env
const PRICE_PRO =
  import.meta.env.VITE_PRICE_PRO || 'price_xxx_PRO'         // ← replace with your real Stripe price id if not using env
const PRICE_ENTERPRISE =
  import.meta.env.VITE_PRICE_ENTERPRISE || 'price_xxx_ENTERPRISE' // ← replace if not using env

export default function Pricing() {
  const nav = useNavigate()

  const choosePlan = (priceId, planName) => {
    // Persist selection so SignUp can read it and start checkout with the right price
    localStorage.setItem('selectedPriceId', String(priceId))
    localStorage.setItem('selectedPlanName', String(planName))
    nav('/signup')
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-3">Choose your plan</h1>
            <p className="text-gray-600">All plans include a 7-day free trial. Cancel anytime.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* STARTER */}
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
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />
                    Up to 5 users
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />
                    Basic ticketing
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />
                    Email notifications
                  </li>
                </ul>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => choosePlan(PRICE_STARTER, 'Starter')}
                >
                  Choose Starter
                </Button>
              </CardContent>
            </Card>

            {/* PRO */}
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
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />
                    Up to 25 users
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />
                    Workflow builder
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />
                    Reports & inspections
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />
                    Approvals
                  </li>
                </ul>
                <Button
                  className="w-full worktrackr-bg-yellow text-black hover:bg-yellow-400"
                  onClick={() => choosePlan(PRICE_PRO, 'Pro')}
                >
                  Choose Pro
                </Button>
              </CardContent>
            </Card>

            {/* ENTERPRISE */}
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
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />
                    Unlimited users
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />
                    Advanced workflows
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />
                    API access
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />
                    White-labeling
                  </li>
                </ul>
                <Button
                  className="w-full worktrackr-bg-black hover:bg-gray-800"
                  onClick={() => choosePlan(PRICE_ENTERPRISE, 'Enterprise')}
                >
                  Choose Enterprise
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Secondary CTA row */}
          <div className="text-center mt-10">
            <p className="text-gray-600 mb-3">Not sure which plan is right for you?</p>
            <Button variant="outline" onClick={() => nav('/')}>Back to Home</Button>
          </div>
        </div>
      </section>
    </div>
  )
}
