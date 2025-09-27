// Billing Service for Stripe Integration
class BillingService {
  constructor() {
    this.baseUrl = '/api/billing';
  }

  // Get current subscription details
  async getCurrentSubscription() {
    try {
      const response = await fetch(`${this.baseUrl}/subscription`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching subscription:', error);
      throw error;
    }
  }

  // Create checkout session for plan upgrade/change
  async createCheckoutSession(planId, additionalSeats = 0) {
    try {
      const response = await fetch(`${this.baseUrl}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          planId,
          additionalSeats,
          mode: 'subscription'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }
      
      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  // Update existing subscription (plan change)
  async updateSubscription(planId, additionalSeats = 0) {
    try {
      const response = await fetch(`${this.baseUrl}/update-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          planId,
          additionalSeats
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update subscription');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  // Add/remove additional seats
  async updateAdditionalSeats(seatCount) {
    try {
      const response = await fetch(`${this.baseUrl}/update-seats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          additionalSeats: seatCount
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update seats');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating seats:', error);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(reason = '') {
    try {
      const response = await fetch(`${this.baseUrl}/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reason })
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  // Get billing portal URL
  async createPortalSession() {
    try {
      const response = await fetch(`${this.baseUrl}/create-portal-session`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }
      
      const { url } = await response.json();
      
      // Open billing portal in new tab
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw error;
    }
  }

  // Get available plans
  getAvailablePlans() {
    return {
      starter: {
        id: process.env.REACT_APP_STRIPE_STARTER_PRICE_ID || 'price_starter',
        name: 'Starter',
        price: 49,
        maxUsers: 5,
        features: ['Basic ticketing', 'Email notifications', 'Up to 5 users']
      },
      pro: {
        id: process.env.REACT_APP_STRIPE_PRO_PRICE_ID || 'price_pro',
        name: 'Pro',
        price: 99,
        maxUsers: 25,
        features: ['Workflow builder', 'Reports & inspections', 'Approvals', 'Up to 25 users']
      },
      enterprise: {
        id: process.env.REACT_APP_STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise',
        name: 'Enterprise',
        price: 299,
        maxUsers: Infinity,
        features: ['Advanced workflows', 'API access', 'White-labeling', 'Unlimited users']
      }
    };
  }

  // Get additional seats product
  getAdditionalSeatsProduct() {
    return {
      id: process.env.REACT_APP_STRIPE_ADDITIONAL_SEATS_PRICE_ID || 'price_additional_seats',
      name: 'Additional Seats',
      price: 9, // £9 per user per month
      description: 'Extra user seats for your plan'
    };
  }
}

export const billingService = new BillingService();
export default billingService;
