// web/client/src/Pricing.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@app/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@app/components/ui/card.jsx'
import { Badge } from '@app/components/ui/badge.jsx'
import { CheckCircle, Star } from 'lucide-react'

// Updated pricing structure: Starter (1 seat), Pro (5 seats), Enterprise (50 seats)
// WorkTrackr Cloud - New Stripe Account Price IDs
const PRICE_STARTER = 'price_1SSGjt6Ze1BRGAeTmazBu65E'
const PRICE_PRO = 'price_1SSGm26Ze1BRGAeT0LfRaGks'
const PRICE_ENTERPRISE = 'price_1SSGo86Ze1BRGAeTr5sHeR0k'

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
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Choose your plan</h1>
            <p className="text-gray-600">All plans include a 7-day free trial. Cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-6 max-w-6xl mx-auto">
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
                    1 user included
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />
                    Advanced ticketing
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 worktrackr-yellow mr-2" />
                    Email notifications
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    + £15/month per additional user
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
                    5 users included
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
                  <li className="flex items-center text-sm text-gray-600">
                    + £15/month per additional user
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
                    50 users included
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
                  <li className="flex items-center text-sm text-gray-600">
                    + £15/month per additional user
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
