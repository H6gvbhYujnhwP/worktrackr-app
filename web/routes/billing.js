const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getOrgContext } = require('@worktrackr/shared/db');

// Map plan → Stripe Price ID from env
const PLAN_TO_PRICE = {
  starter: process.env.PRICE_STARTER,
  pro: process.env.PRICE_PRO,
  enterprise: process.env.PRICE_ENTERPRISE,
};

// Additional seats price ID
const ADDITIONAL_SEATS_PRICE_ID = process.env.PRICE_ADDITIONAL_SEATS;

// Plan configurations
const PLAN_CONFIGS = {
  starter: {
    priceId: process.env.PRICE_STARTER,
    name: 'Starter',
    maxUsers: 5,
    price: 49
  },
  pro: {
    priceId: process.env.PRICE_PRO,
    name: 'Pro',
    maxUsers: 25,
    price: 99
  },
  enterprise: {
    priceId: process.env.PRICE_ENTERPRISE,
    name: 'Enterprise',
    maxUsers: Infinity,
    price: 299
  }
};

// Helper function to check if organization has existing Stripe customer and subscription
async function checkExistingStripeCustomer(orgId) {
  try {
    // This is a simplified check - you may need to adapt based on your database schema
    // The function should return { customerId, subscriptionId } if customer exists, null otherwise
    
    // Search for existing Stripe customers with this org ID in metadata
    const customers = await stripe.customers.search({
      query: `metadata['orgId']:'${orgId}'`,
      limit: 1
    });

    if (customers.data.length === 0) {
      console.log(`📭 No existing Stripe customer found for org ${orgId}`);
      return null;
    }

    const customer = customers.data[0];
    console.log(`👤 Found existing Stripe customer ${customer.id} for org ${orgId}`);

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      console.log(`📋 No active subscriptions found for customer ${customer.id}`);
      return { customerId: customer.id, subscriptionId: null };
    }

    const subscription = subscriptions.data[0];
    console.log(`📋 Found active subscription ${subscription.id} for customer ${customer.id}`);

    return {
      customerId: customer.id,
      subscriptionId: subscription.id
    };

  } catch (error) {
    console.error('❌ Error checking existing Stripe customer:', error);
    return null;
  }
}

// Middleware to ensure user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Get current subscription details
router.get('/subscription', requireAuth, async (req, res) => {
  try {
    const { user, membership } = req;
    
    if (!membership?.stripeCustomerId) {
      return res.json({
        plan: 'starter',
        additionalSeats: 0,
        status: 'trialing',
        currentPeriodEnd: null
      });
    }

    // Get customer's subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: membership.stripeCustomerId,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return res.json({
        plan: 'starter',
        additionalSeats: 0,
        status: 'canceled',
        currentPeriodEnd: null
      });
    }

    const subscription = subscriptions.data[0];
    
    // Parse subscription items to determine plan and additional seats
    let plan = 'starter';
    let additionalSeats = 0;

    subscription.items.data.forEach(item => {
      const priceId = item.price.id;
      
      // Check which plan this price ID belongs to
      for (const [planKey, config] of Object.entries(PLAN_CONFIGS)) {
        if (config.priceId === priceId) {
          plan = planKey;
          break;
        }
      }
      
      // Check if this is additional seats
      if (priceId === ADDITIONAL_SEATS_PRICE_ID) {
        additionalSeats = item.quantity;
      }
    });

    res.json({
      plan,
      additionalSeats,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      subscriptionId: subscription.id
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription details' });
  }
});

// Update additional seats for existing subscription
router.post('/update-seats', requireAuth, async (req, res) => {
  try {
    const { additionalSeats } = req.body;
    const { membership } = req;

    if (!membership?.stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    if (typeof additionalSeats !== 'number' || additionalSeats < 0) {
      return res.status(400).json({ error: 'Invalid additional seats count' });
    }

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: membership.stripeCustomerId,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const subscription = subscriptions.data[0];
    
    // Find existing additional seats item
    const existingSeatItem = subscription.items.data.find(item => 
      item.price.id === ADDITIONAL_SEATS_PRICE_ID
    );

    const subscriptionItems = [];

    if (additionalSeats > 0) {
      if (existingSeatItem) {
        // Update existing seat item
        subscriptionItems.push({
          id: existingSeatItem.id,
          quantity: additionalSeats,
        });
      } else {
        // Add new seat item
        subscriptionItems.push({
          price: ADDITIONAL_SEATS_PRICE_ID,
          quantity: additionalSeats,
        });
      }
    } else if (existingSeatItem) {
      // Remove seat item
      subscriptionItems.push({
        id: existingSeatItem.id,
        deleted: true,
      });
    }

    // Update subscription
    await stripe.subscriptions.update(subscription.id, {
      items: subscriptionItems,
      proration_behavior: 'always_invoice'
    });

    res.json({ success: true, message: 'Additional seats updated successfully' });

  } catch (error) {
    console.error('Error updating seats:', error);
    res.status(500).json({ error: 'Failed to update seats' });
  }
});

/**
 * POST /api/billing/checkout
 * Smart billing: New customers get 7-day trial, existing customers get immediate plan updates
 * body: { plan?: "starter"|"pro"|"enterprise", priceId?: string, orgId?: string, additionalSeats?: number }
 * Returns: { url } for new customers OR { success: true } for existing customers
 */
router.post('/checkout', async (req, res) => {
  try {
    const { plan, priceId, orgId: orgIdFromBody, additionalSeats = 0 } = req.body || {};

    // Resolve the Stripe Price
    const price = priceId || PLAN_TO_PRICE[(plan || '').toLowerCase()];
    if (!price) {
      return res.status(400).json({ error: 'Missing or invalid plan/priceId' });
    }

    // Prefer org from auth middleware, else accept client-provided orgId (from signup)
    const orgId =
      (req.orgContext && req.orgContext.organisationId) ||
      orgIdFromBody ||
      'unknown';

    console.log(`🔍 Processing billing request for org ${orgId}, plan: ${plan}, seats: ${additionalSeats}`);

    // Check if this organization has an existing Stripe customer and active subscription
    const existingCustomer = await checkExistingStripeCustomer(orgId);
    
    if (existingCustomer && existingCustomer.subscriptionId) {
      // EXISTING CUSTOMER - Update subscription immediately (no trial, no checkout)
      console.log(`🔄 Updating existing subscription ${existingCustomer.subscriptionId} for org ${orgId}`);
      
      try {
        const subscription = await stripe.subscriptions.retrieve(existingCustomer.subscriptionId);
        
        // Build new subscription items
        const subscriptionItems = [];
        
        // Update main plan item (always the first item)
        if (subscription.items.data.length > 0) {
          subscriptionItems.push({
            id: subscription.items.data[0].id,
            price: price,
          });
        }

        // Handle additional seats
        const existingSeatItem = subscription.items.data.find(item => 
          item.price.id === ADDITIONAL_SEATS_PRICE_ID
        );

        if (additionalSeats > 0) {
          if (existingSeatItem) {
            // Update existing seat item
            subscriptionItems.push({
              id: existingSeatItem.id,
              quantity: additionalSeats,
            });
          } else {
            // Add new seat item
            subscriptionItems.push({
              price: ADDITIONAL_SEATS_PRICE_ID,
              quantity: additionalSeats,
            });
          }
        } else if (existingSeatItem) {
          // Remove seat item if no additional seats needed
          subscriptionItems.push({
            id: existingSeatItem.id,
            deleted: true,
          });
        }

        // Update the subscription
        const updatedSubscription = await stripe.subscriptions.update(existingCustomer.subscriptionId, {
          items: subscriptionItems,
          proration_behavior: 'always_invoice', // Immediate prorated billing
          metadata: { 
            orgId: orgId.toString(), 
            additionalSeats: additionalSeats.toString(),
            plan: plan || 'unknown'
          }
        });

        console.log(`✅ Subscription updated successfully for org ${orgId}`);
        
        // Return success - frontend will refresh to show changes
        return res.json({ 
          success: true, 
          message: 'Plan updated successfully',
          subscriptionId: updatedSubscription.id,
          immediate: true
        });

      } catch (updateError) {
        console.error('❌ Failed to update existing subscription:', updateError);
        return res.status(500).json({ error: 'Failed to update subscription' });
      }

    } else {
      // NEW CUSTOMER - Create checkout session with 7-day trial
      console.log(`🆕 Creating new subscription with 7-day trial for org ${orgId}`);
      
      // Build line items
      const lineItems = [{ price, quantity: 1 }];
      
      // Add additional seats if requested
      if (additionalSeats > 0 && ADDITIONAL_SEATS_PRICE_ID) {
        lineItems.push({
          price: ADDITIONAL_SEATS_PRICE_ID,
          quantity: additionalSeats,
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_collection: 'always', // Collect payment method during trial
        allow_promotion_codes: true,
        subscription_data: {
          trial_period_days: 7, // 7-day trial for NEW customers only
          metadata: { orgId, additionalSeats: additionalSeats.toString() },
        },
        line_items: lineItems,
        success_url: `${process.env.APP_BASE_URL}/app/dashboard?checkout=success`,
        cancel_url: `${process.env.APP_BASE_URL}/app/dashboard?checkout=cancel`,
        metadata: { orgId, additionalSeats: additionalSeats.toString() },
      });

      console.log(`🔗 Created checkout session for new customer: ${session.id}`);
      return res.json({ url: session.url });
    }

  } catch (err) {
    console.error('❌ Stripe checkout/update error:', err);
    return res.status(500).json({ error: 'Billing request failed' });
  }
});

/**
 * POST /api/billing/portal
 * body: { stripeCustomerId: string }
 * Returns: { url }  // Stripe Billing Portal URL
 */
router.post('/portal', async (req, res) => {
  try {
    const { stripeCustomerId } = req.body || {};
    if (!stripeCustomerId) {
      return res.status(400).json({ error: 'Missing stripeCustomerId' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.APP_BASE_URL}/app/dashboard`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe portal error:', err);
    return res.status(500).json({ error: 'Portal creation failed' });
  }
});

module.exports = router;
