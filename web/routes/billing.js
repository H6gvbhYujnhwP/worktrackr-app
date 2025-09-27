// web/routes/billing.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      stripeSubscriptionId: subscription.id
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Update additional seats only
router.post('/update-seats', requireAuth, async (req, res) => {
  try {
    const { additionalSeats } = req.body;
    const { membership } = req;

    if (!membership?.stripeCustomerId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Get current subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: membership.stripeCustomerId,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const subscription = subscriptions.data[0];
    
    // Find existing seats item
    const existingSeatsItem = subscription.items.data.find(
      item => item.price.id === ADDITIONAL_SEATS_PRICE_ID
    );

    let updatedSubscription;

    if (additionalSeats > 0) {
      if (existingSeatsItem) {
        // Update existing seats
        updatedSubscription = await stripe.subscriptions.update(subscription.id, {
          items: [{
            id: existingSeatsItem.id,
            quantity: additionalSeats,
          }],
          proration_behavior: 'create_prorations',
        });
      } else {
        // Add new seats item
        updatedSubscription = await stripe.subscriptions.update(subscription.id, {
          items: [{
            price: ADDITIONAL_SEATS_PRICE_ID,
            quantity: additionalSeats,
          }],
          proration_behavior: 'create_prorations',
        });
      }
    } else if (existingSeatsItem) {
      // Remove seats item
      await stripe.subscriptionItems.del(existingSeatsItem.id, {
        proration_behavior: 'create_prorations',
      });
      updatedSubscription = await stripe.subscriptions.retrieve(subscription.id);
    }

    res.json({
      success: true,
      subscription: updatedSubscription
    });

  } catch (error) {
    console.error('Error updating seats:', error);
    res.status(500).json({ error: 'Failed to update seats' });
  }
});

/**
 * POST /api/billing/checkout
 * body: { plan?: "starter"|"pro"|"enterprise", priceId?: string, orgId?: string, additionalSeats?: number }
 * Returns: { url }  // Stripe Checkout URL
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
      payment_method_collection: 'always',
      allow_promotion_codes: true, // <-- optional enhancement
      subscription_data: {
        trial_period_days: 7,
        metadata: { orgId, additionalSeats: additionalSeats.toString() }, // so webhooks can map subscription → organisation
      },
      line_items: lineItems,
      success_url: `${process.env.APP_BASE_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.APP_BASE_URL}/?checkout=cancel`,
      metadata: { orgId, additionalSeats: additionalSeats.toString() },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: 'Checkout failed' });
  }
});

/**
 * POST /api/billing/portal
 * body: { stripeCustomerId: string }
 * Returns: { url }  // Stripe Billing Portal URL
 */
router.post('/portal', async (req, res) => {
  try {
    const { stripeCustomerId } = (req.body || {});
    if (!stripeCustomerId) {
      return res.status(400).json({ error: 'Missing stripeCustomerId' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.APP_BASE_URL}/dashboard`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe portal error:', err);
    return res.status(500).json({ error: 'Portal failed' });
  }
});

module.exports = router;
