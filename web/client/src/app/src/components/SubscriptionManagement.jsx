import React, { useState } from 'react';
import { useSimulation } from '../App.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { 
  CreditCard, 
  Users, 
  Plus, 
  Minus, 
  ArrowUp, 
  ArrowDown, 
  Check,
  AlertTriangle,
  X
} from 'lucide-react';
import { subscriptionPlans, additionalSeatPrice } from '../data/mockData.js';

export default function SubscriptionManagement({ isOpen, onClose }) {
  const { organization, updateOrganization, addEmailLog } = useSimulation();
  const [additionalSeats, setAdditionalSeats] = useState(organization.subscription.additionalSeats || 0);
  const [selectedPlan, setSelectedPlan] = useState(organization.subscription.plan);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);

  if (!isOpen) return null;

  const currentPlan = subscriptionPlans[organization.subscription.plan];
  const newPlan = subscriptionPlans[selectedPlan];
  const totalUsers = organization.subscription.currentUsers;
  const maxIncludedUsers = newPlan.maxUsers;
  const requiredAdditionalSeats = Math.max(0, totalUsers - maxIncludedUsers);
  const minAdditionalSeats = Math.max(requiredAdditionalSeats, 0);

  // Calculate pricing
  const basePlanCost = newPlan.price;
  const additionalSeatsCost = additionalSeats * additionalSeatPrice.price;
  const totalMonthlyCost = basePlanCost + additionalSeatsCost;

  const handleSeatChange = (change) => {
    const newSeats = Math.max(minAdditionalSeats, additionalSeats + change);
    setAdditionalSeats(newSeats);
  };

  const handlePlanChange = (planId) => {
    setSelectedPlan(planId);
    const plan = subscriptionPlans[planId];
    const required = Math.max(0, totalUsers - plan.maxUsers);
    setAdditionalSeats(Math.max(required, additionalSeats));
  };

  const handleSaveChanges = () => {
    const changes = {
      planChange: selectedPlan !== organization.subscription.plan,
      seatChange: additionalSeats !== (organization.subscription.additionalSeats || 0),
      oldPlan: currentPlan,
      newPlan: newPlan,
      oldSeats: organization.subscription.additionalSeats || 0,
      newSeats: additionalSeats,
      oldCost: currentPlan.price + ((organization.subscription.additionalSeats || 0) * additionalSeatPrice.price),
      newCost: totalMonthlyCost
    };

    setPendingChanges(changes);
    setShowConfirmation(true);
  };

  const confirmChanges = async () => {
    setIsProcessing(true);
    
    // Simulate Stripe API calls
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update organization subscription
    const updatedOrg = {
      ...organization,
      subscription: {
        ...organization.subscription,
        plan: selectedPlan,
        additionalSeats: additionalSeats,
        amount: totalMonthlyCost,
        maxUsers: newPlan.maxUsers + additionalSeats,
        lastUpdated: new Date().toISOString()
      }
    };

    updateOrganization(updatedOrg);

    // Add email notifications
    if (pendingChanges.planChange) {
      addEmailLog({
        to: 'admin@worktrackr.com',
        subject: `Subscription Plan ${pendingChanges.oldPlan.name === pendingChanges.newPlan.name ? 'Updated' : 'Changed'}`,
        body: `Your subscription has been ${pendingChanges.oldPlan.name === pendingChanges.newPlan.name ? 'updated' : `changed from ${pendingChanges.oldPlan.name} to ${pendingChanges.newPlan.name}`}. New monthly cost: £${totalMonthlyCost}`,
        timestamp: new Date().toISOString(),
        type: 'subscription_change'
      });
    }

    if (pendingChanges.seatChange) {
      addEmailLog({
        to: 'admin@worktrackr.com',
        subject: 'Additional Seats Updated',
        body: `Your additional seats have been updated from ${pendingChanges.oldSeats} to ${pendingChanges.newSeats}. Additional seat cost: £${additionalSeats * additionalSeatPrice.price}/month`,
        timestamp: new Date().toISOString(),
        type: 'seat_change'
      });
    }

    setIsProcessing(false);
    setShowConfirmation(false);
    setPendingChanges(null);
  };

  const hasChanges = selectedPlan !== organization.subscription.plan || 
                   additionalSeats !== (organization.subscription.additionalSeats || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Subscription Management</h2>
            <p className="text-gray-600">Manage your plan, seats, and billing</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Subscription Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Current Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Current Plan</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-semibold">{currentPlan.name}</span>
                    <Badge variant="secondary">£{currentPlan.price}/month</Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Users</Label>
                  <div className="mt-1">
                    <span className="text-lg font-semibold">{totalUsers} of {organization.subscription.maxUsers}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Monthly Cost</Label>
                  <div className="mt-1">
                    <span className="text-lg font-semibold">£{organization.subscription.amount}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Plan</CardTitle>
              <CardDescription>Select the plan that best fits your organization's needs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(subscriptionPlans).map(([planId, plan]) => (
                  <div
                    key={planId}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedPlan === planId 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePlanChange(planId)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                      {selectedPlan === planId && <Check className="w-5 h-5 text-blue-500" />}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      £{plan.price}<span className="text-sm font-normal text-gray-500">/month</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      Up to {plan.maxUsers} users included
                    </div>
                    <ul className="text-sm space-y-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {planId === organization.subscription.plan && (
                      <Badge variant="secondary" className="mt-2">Current Plan</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Additional Seats Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Additional Seats
              </CardTitle>
              <CardDescription>
                Add extra seats beyond your plan's included users for £{additionalSeatPrice.price}/month each
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {totalUsers > newPlan.maxUsers && (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      You currently have {totalUsers} users but the {newPlan.name} plan only includes {newPlan.maxUsers} users. 
                      You need at least {requiredAdditionalSeats} additional seats.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center gap-4">
                  <Label className="text-sm font-medium">Additional Seats:</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSeatChange(-1)}
                      disabled={additionalSeats <= minAdditionalSeats}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      type="number"
                      value={additionalSeats}
                      onChange={(e) => setAdditionalSeats(Math.max(minAdditionalSeats, parseInt(e.target.value) || 0))}
                      className="w-20 text-center"
                      min={minAdditionalSeats}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSeatChange(1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <span className="text-sm text-gray-600">
                    £{additionalSeats * additionalSeatPrice.price}/month
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  Total capacity: {newPlan.maxUsers + additionalSeats} users
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>{newPlan.name} Plan</span>
                  <span>£{basePlanCost}/month</span>
                </div>
                {additionalSeats > 0 && (
                  <div className="flex justify-between">
                    <span>{additionalSeats} Additional Seats</span>
                    <span>£{additionalSeatsCost}/month</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                  <span>Total Monthly Cost</span>
                  <span>£{totalMonthlyCost}</span>
                </div>
                {hasChanges && (
                  <div className="text-sm text-gray-600">
                    Current cost: £{organization.subscription.amount}/month
                    {totalMonthlyCost > organization.subscription.amount ? (
                      <span className="text-red-600 ml-2">
                        (+£{totalMonthlyCost - organization.subscription.amount})
                      </span>
                    ) : totalMonthlyCost < organization.subscription.amount ? (
                      <span className="text-green-600 ml-2">
                        (-£{organization.subscription.amount - totalMonthlyCost})
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveChanges}
              disabled={!hasChanges || isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmation && pendingChanges && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Confirm Subscription Changes</h3>
                
                <div className="space-y-3 mb-6">
                  {pendingChanges.planChange && (
                    <div className="flex justify-between">
                      <span>Plan Change:</span>
                      <span>{pendingChanges.oldPlan.name} → {pendingChanges.newPlan.name}</span>
                    </div>
                  )}
                  {pendingChanges.seatChange && (
                    <div className="flex justify-between">
                      <span>Additional Seats:</span>
                      <span>{pendingChanges.oldSeats} → {pendingChanges.newSeats}</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between font-semibold">
                    <span>New Monthly Cost:</span>
                    <span>£{pendingChanges.newCost}</span>
                  </div>
                </div>

                <Alert className="mb-4">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    Changes will take effect immediately. Your next billing cycle will reflect the new pricing.
                  </AlertDescription>
                </Alert>

                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowConfirmation(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={confirmChanges}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Confirm Changes'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

