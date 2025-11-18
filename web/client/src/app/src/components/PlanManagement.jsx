import React, { useState, useEffect, useMemo } from 'react';
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
  Zap,
  Trash2
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
    maxUsers: 1,
    features: ['Basic ticketing', 'Email notifications', 'Up to 1 user']
  },
  pro: {
    name: 'Pro',
    price: 99,
    maxUsers: 5,
    features: ['Workflow builder', 'Reports & inspections', 'Approvals', 'Up to 5 users']
  },
  enterprise: {
    name: 'Enterprise',
    price: 299,
    maxUsers: 50,
    features: ['Unlimited users', 'Custom branding', 'Partner admin access', 'Dedicated support']
  }
};

const ADDITIONAL_SEAT_PRICE = 15;

export default function PlanManagement({ totalUsers }) {
  const [currentPlan, setCurrentPlan] = useState('pro');
  const [additionalSeats, setAdditionalSeats] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSeatDialog, setShowSeatDialog] = useState(false);
  const [seatChange, setSeatChange] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Fetch organization plan data on mount
  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        const response = await fetch('/api/billing/subscription', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.plan) {
            setCurrentPlan(data.plan);
          }
          if (data.additionalSeats !== undefined) {
            setAdditionalSeats(data.additionalSeats);
          }
        }
      } catch (error) {
        console.error('Failed to fetch organization data:', error);
      }
    };
    fetchOrgData();
  }, []);

  const totalAllowedUsers = useMemo(() => {
    const baseLimit = PLAN_CONFIGS[currentPlan]?.maxUsers || 0;
    return baseLimit === Infinity ? Infinity : baseLimit + additionalSeats;
  }, [currentPlan, additionalSeats]);

  const calculatePrice = (plan, seats) => {
    const planPrice = PLAN_CONFIGS[plan]?.price || 0;
    const seatPrice = seats * ADDITIONAL_SEAT_PRICE;
    return planPrice + seatPrice;
  };

  const handlePlanChange = async (newPlan) => {
    setLoading(true);
    try {
      console.log(`Changing plan from ${currentPlan} to ${newPlan}`);
      
      // First try immediate update for existing customers
      const updateResponse = await fetch('/api/billing/update-subscription', {
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
      
      if (updateResponse.ok) {
        const updateData = await updateResponse.json();
        if (updateData.immediate) {
          // Existing customer - plan updated immediately
          alert('Plan updated successfully!');
          window.location.reload();
          return;
        }
      }
      
      // Fallback to checkout flow for new customers or if immediate update fails
      const checkoutResponse = await fetch('/api/billing/checkout', {
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
      
      if (!checkoutResponse.ok) {
        throw new Error('Failed to create checkout session');
      }
      
      const checkoutData = await checkoutResponse.json();
      
      if (checkoutData.immediate) {
        // Existing customer - plan updated immediately
        alert('Plan updated successfully!');
        window.location.reload();
      } else {
        // New customer - redirect to Stripe Checkout
        window.location.href = checkoutData.url;
      }
      
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
      console.log(`Updating seats from ${additionalSeats} to ${newSeatCount}`);
      
      const response = await fetch('/api/billing/update-seats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ additionalSeats: newSeatCount })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update seats');
      }
      
      alert('Seats updated successfully!');
      setAdditionalSeats(newSeatCount);
      setShowSeatDialog(false);
      setSeatChange(0);
      
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
      
      // First try immediate update for existing customers
      const updateResponse = await fetch('/api/billing/update-subscription', {
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
      
      if (updateResponse.ok) {
        const updateData = await updateResponse.json();
        if (updateData.immediate) {
          // Existing customer - plan updated immediately
          alert('Plan and seats updated successfully!');
          window.location.reload();
          return;
        }
      }
      
      // Fallback to checkout flow for new customers or if immediate update fails
      const checkoutResponse = await fetch('/api/billing/checkout', {
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
      
      if (!checkoutResponse.ok) {
        throw new Error('Failed to create checkout session');
      }
      
      const checkoutData = await checkoutResponse.json();
      
      if (checkoutData.immediate) {
        // Existing customer - plan updated immediately
        alert('Plan and seats updated successfully!');
        window.location.reload();
      } else {
        // New customer - redirect to Stripe Checkout
        window.location.href = checkoutData.url;
      }
      
    } catch (error) {
      console.error('Failed to update plan and seats:', error);
      alert('Failed to update plan and seats. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canAddUsers = () => {
    if (totalAllowedUsers === Infinity) return true;
    return totalUsers < totalAllowedUsers;
  };

  return (
    <Card className="w-full bg-gray-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <CardTitle>Plan & Billing</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={() => alert('Redirecting to billing portal...')}>
            Manage Billing
          </Button>
        </div>
        <CardDescription>Manage your subscription plan and billing details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(PLAN_CONFIGS).map(([planId, config]) => (
            <Card 
              key={planId} 
              className={`flex flex-col ${currentPlan === planId ? 'border-2 border-blue-500 shadow-lg' : ''}`}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    {planId === 'enterprise' && <Crown className="w-5 h-5 text-yellow-500" />}
                    {planId === 'pro' && <Zap className="w-5 h-5 text-blue-500" />}
                    <span>{config.name}</span>
                  </CardTitle>
                  {currentPlan === planId && <Badge>Current Plan</Badge>}
                </div>
                <p className="text-3xl font-bold">£{config.price}<span className="text-sm font-normal">/month</span></p>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <ul className="space-y-2 text-sm text-gray-600">
                  {config.features.map((feature, i) => (
                    <li key={i} className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <div className="p-6 pt-0">
                {currentPlan === planId ? (
                  <Button className="w-full" disabled>Your Current Plan</Button>
                ) : (
                  <Button 
                    className="w-full" 
                    onClick={() => handlePlanChange(planId)}
                    disabled={loading}
                  >
                    {loading ? 'Changing...' : 'Switch to ' + config.name}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Additional Seats</span>
            </CardTitle>
            <CardDescription>
              Add more users to your plan for £{ADDITIONAL_SEAT_PRICE}/user/month. 
              Your current plan includes {PLAN_CONFIGS[currentPlan]?.maxUsers} users.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <p className="font-medium">Current additional seats: <Badge>{additionalSeats}</Badge></p>
              <p className="font-medium">Total users allowed: <Badge>{totalAllowedUsers === Infinity ? 'Unlimited' : totalAllowedUsers}</Badge></p>
            </div>
            <Dialog open={showSeatDialog} onOpenChange={setShowSeatDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">Manage Seats</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manage Additional Seats</DialogTitle>
                  <DialogDescription>
                    Add or remove seats from your subscription. Each additional seat costs £{ADDITIONAL_SEAT_PRICE}/month.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-center space-x-4">
                    <Button variant="outline" size="icon" onClick={() => setSeatChange(c => Math.max(c - 1, -additionalSeats))}>
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-2xl font-bold w-20 text-center">{additionalSeats + seatChange}</span>
                    <Button variant="outline" size="icon" onClick={() => setSeatChange(c => c + 1)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex justify-center space-x-2">
                    <Button size="sm" variant="secondary" onClick={() => setSeatChange(c => c + 1)}>+1</Button>
                    <Button size="sm" variant="secondary" onClick={() => setSeatChange(c => c + 5)}>+5</Button>
                    <Button size="sm" variant="secondary" onClick={() => setSeatChange(c => c + 10)}>+10</Button>
                  </div>
                  {seatChange !== 0 && (
                    <Alert variant={seatChange > 0 ? "default" : "destructive"}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        You are about to {seatChange > 0 ? 'add' : 'remove'} {Math.abs(seatChange)} seat(s).
                        Your new monthly cost for additional seats will be £{(additionalSeats + seatChange) * ADDITIONAL_SEAT_PRICE}.
                        Your total monthly bill will be £{calculatePrice(currentPlan, additionalSeats + seatChange)}.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => { setShowSeatDialog(false); setSeatChange(0); }}>Cancel</Button>
                  <Button 
                    onClick={() => handleSeatChange(seatChange)}
                    disabled={loading || seatChange === 0}
                  >
                    {loading ? 'Updating...' : 'Confirm Change'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Danger Zone - Account Deletion */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <span>Danger Zone</span>
            </CardTitle>
            <CardDescription className="text-red-600">
              Permanently delete your account and all associated data. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-red-700 flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Delete Account Permanently</span>
                  </DialogTitle>
                  <DialogDescription className="space-y-3 pt-4">
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Warning: This action cannot be undone!</strong>
                      </AlertDescription>
                    </Alert>
                    
                    <p className="text-sm text-gray-700">
                      This will permanently delete:
                    </p>
                    <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                      <li>Your account and all user data</li>
                      <li>All tickets and workflows</li>
                      <li>Team members and settings</li>
                      <li>Files and attachments</li>
                      <li>Your subscription will be cancelled</li>
                    </ul>
                    
                    <div className="pt-4">
                      <Label htmlFor="delete-confirm" className="text-sm font-semibold">
                        Type <span className="font-mono bg-gray-100 px-1">DELETE</span> to confirm:
                      </Label>
                      <Input
                        id="delete-confirm"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="DELETE"
                        className="mt-2"
                        disabled={deleting}
                      />
                    </div>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex space-x-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setShowDeleteDialog(false);
                      setDeleteConfirmation('');
                    }}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmation !== 'DELETE' || deleting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deleting ? 'Deleting...' : 'Delete Permanently'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const response = await fetch('/api/billing/delete-account', {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete account');
      }
      
      const data = await response.json();
      
      // Show success message
      alert('Your account has been deleted. You will now be logged out.');
      
      // Redirect to home page
      window.location.href = data.redirect || '/';
      
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account: ' + error.message);
      setDeleting(false);
    }
  }
}

