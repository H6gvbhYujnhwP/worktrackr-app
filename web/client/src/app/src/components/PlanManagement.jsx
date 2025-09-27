import React, { useState } from 'react';
import { useAuth, useSimulation } from '../App.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { 
  CreditCard, 
  Users, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  Minus,
  X,
  Check,
  AlertTriangle,
  Crown,
  Zap
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.jsx';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert.jsx';

const PLAN_CONFIGS = {
  starter: {
    name: 'Starter',
    price: 49,
    maxUsers: 5,
    features: ['Basic ticketing', 'Email notifications', 'Up to 5 users']
  },
  pro: {
    name: 'Pro',
    price: 99,
    maxUsers: 25,
    features: ['Workflow builder', 'Reports & inspections', 'Approvals', 'Up to 25 users']
  },
  enterprise: {
    name: 'Enterprise',
    price: 299,
    maxUsers: Infinity,
    features: ['Advanced workflows', 'API access', 'White-labeling', 'Unlimited users']
  }
};

const ADDITIONAL_SEAT_PRICE = 9; // £9 per user per month

export default function PlanManagement({ currentPlan = 'pro', additionalSeats = 0, totalUsers = 5 }) {
  const { user, membership } = useAuth();
  const { users } = useSimulation();
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showSeatDialog, setShowSeatDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(currentPlan);
  const [seatChange, setSeatChange] = useState(0);
  const [loading, setLoading] = useState(false);

  const currentPlanConfig = PLAN_CONFIGS[currentPlan];
  const totalAllowedUsers = currentPlanConfig.maxUsers === Infinity 
    ? Infinity 
    : currentPlanConfig.maxUsers + additionalSeats;
  const currentUserCount = users?.length || 0;
  const seatsRemaining = totalAllowedUsers === Infinity 
    ? Infinity 
    : totalAllowedUsers - currentUserCount;

  const calculateNewPrice = (plan, seats) => {
    const planPrice = PLAN_CONFIGS[plan].price;
    const seatPrice = seats * ADDITIONAL_SEAT_PRICE;
    return planPrice + seatPrice;
  };

  const handlePlanChange = async (newPlan) => {
    setLoading(true);
    try {
      console.log(`Changing plan from ${currentPlan} to ${newPlan}`);
      
      // Create Stripe checkout session for plan change
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          plan: newPlan,
          additionalSeats: additionalSeats
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }
      
      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
      
    } catch (error) {
      console.error('Failed to change plan:', error);
      alert('Failed to change plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeatChange = async (change) => {
    const newSeatCount = Math.max(0, additionalSeats + change);
    setLoading(true);
    
    try {
      console.log(`Changing seats from ${additionalSeats} to ${newSeatCount}`);
      
      // Update seats via API
      const response = await fetch('/api/billing/update-seats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          additionalSeats: newSeatCount
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update seats');
      }
      
      // Success - refresh the page to show updated data
      window.location.reload();
      
    } catch (error) {
      console.error('Failed to update seats:', error);
      alert('Failed to update seats. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCombinedChange = async (newPlan, seatChange) => {
    setLoading(true);
    try {
      const newSeatCount = Math.max(0, additionalSeats + seatChange);
      
      console.log(`Changing plan to ${newPlan} and seats to ${newSeatCount}`);
      
      // Create checkout session with both plan and seats
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          plan: newPlan,
          additionalSeats: newSeatCount
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }
      
      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
      
    } catch (error) {
      console.error('Failed to update plan and seats:', error);
      alert('Failed to update plan and seats. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canAddUsers = () => {
    if (totalAllowedUsers === Infinity) return true;
    return currentUserCount < totalAllowedUsers;
  };

  const getUserLimitWarning = () => {
    if (totalAllowedUsers === Infinity) return null;
    if (seatsRemaining <= 0) {
      return {
        type: 'error',
        message: 'You have reached your user limit. Upgrade your plan or add more seats to add users.'
      };
    }
    if (seatsRemaining <= 2) {
      return {
        type: 'warning',
        message: `Only ${seatsRemaining} user slots remaining. Consider adding more seats.`
      };
    }
    return null;
  };

  const warning = getUserLimitWarning();

  return (
    <div className="space-y-6">
      {/* Current Plan Card - Clickable */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 border-blue-200 bg-blue-50" 
            onClick={() => setShowPlanDialog(true)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <div>
                <CardTitle className="text-lg">{currentPlanConfig.name} Plan</CardTitle>
                <CardDescription>
                  {currentUserCount} of {totalAllowedUsers === Infinity ? '∞' : totalAllowedUsers} users
                  {additionalSeats > 0 && (
                    <span className="ml-2 text-blue-600">
                      (+{additionalSeats} additional seats)
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="default" className="text-lg px-3 py-1">
                £{calculateNewPrice(currentPlan, additionalSeats)}/month
              </Badge>
              <p className="text-xs text-gray-500 mt-1">Click to manage</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* User Limit Warning */}
      {warning && (
        <Alert variant={warning.type === 'error' ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{warning.message}</AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button 
          variant="outline" 
          onClick={() => setShowSeatDialog(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Seats</span>
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => setShowPlanDialog(true)}
          className="flex items-center space-x-2"
        >
          <ArrowUp className="w-4 h-4" />
          <span>Upgrade Plan</span>
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => setShowPlanDialog(true)}
          className="flex items-center space-x-2"
        >
          <CreditCard className="w-4 h-4" />
          <span>Manage Billing</span>
        </Button>
      </div>

      {/* Plan Management Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Your Plan</DialogTitle>
            <DialogDescription>
              Choose a plan that fits your team size and needs
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            {Object.entries(PLAN_CONFIGS).map(([planKey, plan]) => (
              <Card 
                key={planKey}
                className={`cursor-pointer transition-all h-full ${
                  selectedPlan === planKey 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'hover:border-gray-300'
                } ${currentPlan === planKey ? 'ring-2 ring-green-500' : ''}`}
                onClick={() => setSelectedPlan(planKey)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      {planKey === 'enterprise' && <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                      {planKey === 'pro' && <Zap className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                      <span className="truncate">{plan.name}</span>
                    </CardTitle>
                    {currentPlan === planKey && (
                      <Badge variant="default" className="flex-shrink-0">Current</Badge>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-center">£{plan.price}/month</div>
                  <div className="text-sm text-gray-600 text-center">
                    {plan.maxUsers === Infinity ? 'Unlimited users' : `Up to ${plan.maxUsers} users`}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1.5">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <Check className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional Seats Section */}
          <div className="border-t pt-4">
            <h4 className="text-lg font-medium mb-3">Additional Seats</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium">Extra user seats</p>
                  <p className="text-sm text-gray-600">£{ADDITIONAL_SEAT_PRICE}/user/month</p>
                </div>
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSeatChange(Math.max(-additionalSeats, seatChange - 1))}
                    disabled={additionalSeats + seatChange <= 0}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  
                  <div className="text-center min-w-[80px]">
                    <p className="text-lg font-medium">
                      {additionalSeats + seatChange}
                    </p>
                    <p className="text-xs text-gray-500">seats</p>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSeatChange(seatChange + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {seatChange !== 0 && (
                <Alert className="mb-3">
                  <AlertDescription>
                    {seatChange > 0 
                      ? `Adding ${seatChange} seats will increase your monthly bill by £${seatChange * ADDITIONAL_SEAT_PRICE}`
                      : `Removing ${Math.abs(seatChange)} seats will decrease your monthly bill by £${Math.abs(seatChange) * ADDITIONAL_SEAT_PRICE}`
                    }
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex justify-between items-center text-sm">
                <span>Current additional seats: {additionalSeats}</span>
                <span className="font-medium">
                  Monthly cost: £{(additionalSeats + seatChange) * ADDITIONAL_SEAT_PRICE}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPlanDialog(false);
              setSeatChange(0);
            }}>
              Cancel
            </Button>
            
            {/* Plan Change Button */}
            {selectedPlan !== currentPlan && (
              <Button 
                onClick={() => handlePlanChange(selectedPlan)}
                disabled={loading}
              >
                {loading ? 'Processing...' : `Switch to ${PLAN_CONFIGS[selectedPlan].name}`}
              </Button>
            )}
            
            {/* Seat Change Button */}
            {seatChange !== 0 && selectedPlan === currentPlan && (
              <Button 
                onClick={() => handleSeatChange(seatChange)}
                disabled={loading}
              >
                {loading ? 'Processing...' : 
                  seatChange > 0 
                    ? `Add ${seatChange} Seats` 
                    : `Remove ${Math.abs(seatChange)} Seats`
                }
              </Button>
            )}
            
            {/* Combined Change Button */}
            {selectedPlan !== currentPlan && seatChange !== 0 && (
              <Button 
                onClick={() => handleCombinedChange(selectedPlan, seatChange)}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Update Plan & Seats'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seat Management Dialog */}
      <Dialog open={showSeatDialog} onOpenChange={setShowSeatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Additional Seats</DialogTitle>
            <DialogDescription>
              Add or remove additional user seats (£{ADDITIONAL_SEAT_PRICE}/user/month)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Current additional seats</p>
                <p className="text-sm text-gray-600">{additionalSeats} seats</p>
              </div>
              <div className="text-right">
                <p className="font-medium">£{additionalSeats * ADDITIONAL_SEAT_PRICE}/month</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSeatChange(seatChange - 1)}
                disabled={additionalSeats + seatChange <= 0}
              >
                <Minus className="w-4 h-4" />
              </Button>
              
              <div className="flex-1 text-center">
                <p className="text-lg font-medium">
                  {additionalSeats + seatChange} seats
                </p>
                <p className="text-sm text-gray-600">
                  £{(additionalSeats + seatChange) * ADDITIONAL_SEAT_PRICE}/month
                </p>
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSeatChange(seatChange + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {seatChange !== 0 && (
              <Alert>
                <AlertDescription>
                  {seatChange > 0 
                    ? `Adding ${seatChange} seats will increase your monthly bill by £${seatChange * ADDITIONAL_SEAT_PRICE}`
                    : `Removing ${Math.abs(seatChange)} seats will decrease your monthly bill by £${Math.abs(seatChange) * ADDITIONAL_SEAT_PRICE}`
                  }
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Additional Seats Section */}
          <div className="border-t pt-4">
            <h4 className="text-lg font-medium mb-3">Additional Seats</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium">Extra user seats</p>
                  <p className="text-sm text-gray-600">£{ADDITIONAL_SEAT_PRICE}/user/month</p>
                </div>
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSeatChange(Math.max(-additionalSeats, seatChange - 1))}
                    disabled={additionalSeats + seatChange <= 0}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  
                  <div className="text-center min-w-[80px]">
                    <p className="text-lg font-medium">
                      {additionalSeats + seatChange}
                    </p>
                    <p className="text-xs text-gray-500">seats</p>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSeatChange(seatChange + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {seatChange !== 0 && (
                <Alert className="mb-3">
                  <AlertDescription>
                    {seatChange > 0 
                      ? `Adding ${seatChange} seats will increase your monthly bill by £${seatChange * ADDITIONAL_SEAT_PRICE}`
                      : `Removing ${Math.abs(seatChange)} seats will decrease your monthly bill by £${Math.abs(seatChange) * ADDITIONAL_SEAT_PRICE}`
                    }
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex justify-between items-center text-sm">
                <span>Current additional seats: {additionalSeats}</span>
                <span className="font-medium">
                  Monthly cost: £{(additionalSeats + seatChange) * ADDITIONAL_SEAT_PRICE}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSeatDialog(false)}>
              Cancel
            </Button>
            {seatChange !== 0 && (
              <Button 
                onClick={() => handleSeatChange(seatChange)}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Update Seats'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
