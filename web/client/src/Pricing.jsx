// web/client/src/Pricing.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';

export default function Pricing() {
  const nav = useNavigate();

  // Configure these env vars in Render → Environment:
  // VITE_STRIPE_PRICE_STARTER, VITE_STRIPE_PRICE_PRO, VITE_STRIPE_PRICE_ENTERPRISE
  const PRICE_IDS = {
    starter: import.meta.env.VITE_STRIPE_PRICE_STARTER || '',
    pro: import.meta.env.VITE_STRIPE_PRICE_PRO || '',
    enterprise: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE || '',
  };

  function choosePlan(planKey) {
    const id = PRICE_IDS[planKey];
    if (!id) {
      alert('This plan is not configured yet. Please contact support.');
      return;
    }
    localStorage.setItem('selectedPriceId', id);
    nav('/signup');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold mb-2">Choose Your Plan</h1>
        <p className="text-gray-600">7-day free trial • Cancel anytime</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Starter */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Starter</CardTitle>
            <CardDescription>Perfect for small teams</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-4">£49/mo</p>
            <Button
              className="w-full worktrackr-bg-black hover:bg-gray-800 text-white"
              onClick={() => choosePlan('starter')}
            >
              Start Free Trial
            </Button>
          </CardContent>
        </Card>

        {/* Pro */}
        <Card className="shadow-lg border-2 worktrackr-border-yellow">
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <CardDescription>For growing organizations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-4">£99/mo</p>
            <Button
              className="w-full worktrackr-bg-black hover:bg-gray-800 text-white"
              onClick={() => choosePlan('pro')}
            >
              Start Free Trial
            </Button>
          </CardContent>
        </Card>

        {/* Enterprise */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Enterprise</CardTitle>
            <CardDescription>Advanced workflows & support</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-4">£299/mo</p>
            <Button
              className="w-full worktrackr-bg-black hover:bg-gray-800 text-white"
              onClick={() => choosePlan('enterprise')}
            >
              Start Free Trial
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
