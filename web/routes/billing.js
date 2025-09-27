const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getOrgContext, query } = require('@worktrackr/shared/db');

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
    console.log(`🔍 Checking for existing Stripe customer for org ${orgId}`);
    
    // First check our database for stored Stripe customer ID
    const dbResult = await query(
      'SELECT stripe_customer_id, stripe_subscription_id FROM organisations WHERE id = $1',
      [orgId]
    );
    
    if (dbResult.rows.length > 0 && dbResult.rows[0].stripe_customer_id) {
      const { stripe_customer_id, stripe_subscription_id } = dbResult.rows[0];
      console.log(`💾 Found stored Stripe customer ${stripe_customer_id} for org ${orgId}`);
      
      // Verify the customer still exists in Stripe
      try {
        const customer = await stripe.customers.retrieve(stripe_customer_id);
        
        // Check for active subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: stripe_customer_id,
          status: 'active',
          limit: 1
        });
        
        const activeSubscription = subscriptions.data.length > 0 ? subscriptions.data[0] : null;
        
        return {
          customerId: stripe_customer_id,
          subscriptionId: activeSubscription ? activeSubscription.id : stripe_subscription_id,
          isExistingCustomer: true
        };
        
      } catch (stripeError) {
        console.log(`⚠️ Stored customer ${stripe_customer_id} not found in Stripe, searching...`);
      }
    }
    
    // Fallback: Search for existing Stripe customers with this org ID in metadata
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

    // Update our database with the found customer ID
    await query(
      'UPDATE organisations SET stripe_customer_id = $1 WHERE id = $2',
      [customer.id, orgId]
    );

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      console.log(`📋 No active subscriptions found for customer ${customer.id}`);
      return { 
        customerId: customer.id, 
        subscriptionId: null,
        isExistingCustomer: true
      };
    }

    const subscription = subscriptions.data[0];
    console.log(`📋 Found active subscription ${subscription.id} for customer ${customer.id}`);

    // Update our database with the subscription ID
    await query(
      'UPDATE organisations SET stripe_subscription_id = $1 WHERE id = $2',
      [subscription.id, orgId]
    );

    return {
      customerId: customer.id,
      subscriptionId: subscription.id,
      isExistingCustomer: true
    };

  } catch (error) {
    console.error('❌ Error checking existing Stripe customer:', error);
    return null;
  }
}

// Helper function to determine if user is new vs existing customer
async function determineCustomerStatus(orgId, userId) {
  try {
    // Check if organization has any billing history
    const orgResult = await query(
      'SELECT created_at, stripe_customer_id, stripe_subscription_id FROM organisations WHERE id = $1',
      [orgId]
    );
    
    if (orgResult.rows.length === 0) {
      return { isNewCustomer: true, reason: 'Organization not found' };
    }
    
    const org = orgResult.rows[0];
    const orgAge = Date.now() - new Date(org.created_at).getTime();
    const orgAgeInDays = orgAge / (1000 * 60 * 60 * 24);
    
    // If organization is older than 30 days, consider existing
    if (orgAgeInDays > 30) {
      return { 
        isNewCustomer: false, 
        reason: `Organization is ${Math.floor(orgAgeInDays)} days old` 
      };
    }
    
    // If organization has Stripe customer/subscription, consider existing
    if (org.stripe_customer_id || org.stripe_subscription_id) {
      return { 
        isNewCustomer: false, 
        reason: 'Organization has existing Stripe billing' 
      };
    }
    
    // Check if user has made any previous subscription attempts
    const stripeCustomer = await checkExistingStripeCustomer(orgId);
    if (stripeCustomer && stripeCustomer.isExistingCustomer) {
      return { 
        isNewCustomer: false, 
        reason: 'Found existing Stripe customer' 
      };
    }
    
    // Default to new customer
    return { 
      isNewCustomer: true, 
      reason: 'No billing history found' 
    };
    
  } catch (error) {
    console.error('❌ Error determining customer status:', error);
    // Default to existing customer to avoid giving unintended trials
    return { 
      isNewCustomer: false, 
      reason: 'Error occurred, defaulting to existing customer' 
    };
  }
}



// Get current subscription details
router.get('/subscription', async (req, res) => {
  try {
    const { user, membership } = req;
    const orgId = req.orgContext?.organisationId;
    
    console.log(`📋 Fetching subscription for user ${user.id}, org ${orgId}`);
    
    // Check for existing customer first
    const existingCustomer = await checkExistingStripeCustomer(orgId);
    
    if (!existingCustomer || !existingCustomer.customerId) {
      console.log(`📭 No Stripe customer found for org ${orgId}`);
      return res.json({
        plan: 'starter',
        additionalSeats: 0,
        status: 'no_subscription',
        currentPeriodEnd: null,
        isNewCustomer: true,
        trialEligible: true
      });
    }

    // Get customer's subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: existingCustomer.customerId,
      limit: 3 // Get active, trialing, and past_due
    });

    if (subscriptions.data.length === 0) {
      console.log(`📋 No subscriptions found for customer ${existingCustomer.customerId}`);
      
      // Determine if this is a new or existing customer
      const customerStatus = await determineCustomerStatus(orgId, user.id);
      
      return res.json({
        plan: 'starter',
        additionalSeats: 0,
        status: 'no_subscription',
        currentPeriodEnd: null,
        isNewCustomer: customerStatus.isNewCustomer,
        trialEligible: customerStatus.isNewCustomer,
        customerId: existingCustomer.customerId
      });
    }

    // Find the most relevant subscription (active > trialing > past_due)
    const activeSubscription = subscriptions.data.find(sub => sub.status === 'active') ||
                              subscriptions.data.find(sub => sub.status === 'trialing') ||
                              subscriptions.data.find(sub => sub.status === 'past_due') ||
                              subscriptions.data[0];

    console.log(`📋 Found subscription ${activeSubscription.id} with status ${activeSubscription.status}`);
    
    // Parse subscription items to determine plan and additional seats
    let plan = 'starter';
    let additionalSeats = 0;

    activeSubscription.items.data.forEach(item => {
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

    // Determine customer status for trial eligibility
    const customerStatus = await determineCustomerStatus(orgId, user.id);

    const subscriptionData = {
      plan,
      additionalSeats,
      status: activeSubscription.status,
      currentPeriodEnd: new Date(activeSubscription.current_period_end * 1000).toISOString(),
      subscriptionId: activeSubscription.id,
      customerId: existingCustomer.customerId,
      isNewCustomer: customerStatus.isNewCustomer,
      trialEligible: customerStatus.isNewCustomer && activeSubscription.status !== 'active',
      trialEnd: activeSubscription.trial_end ? new Date(activeSubscription.trial_end * 1000).toISOString() : null,
      cancelAtPeriodEnd: activeSubscription.cancel_at_period_end
    };

    console.log(`✅ Subscription data:`, subscriptionData);
    res.json(subscriptionData);

  } catch (error) {
    console.error('❌ Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription details' });
  }
});

// Update additional seats for existing subscription
router.post('/update-seats', async (req, res) => {
  try {
    const { additionalSeats } = req.body;
    const { user } = req;
    const orgId = req.orgContext?.organisationId;

    console.log(`💺 Updating seats for org ${orgId} to ${additionalSeats}`);

    if (typeof additionalSeats !== 'number' || additionalSeats < 0) {
      return res.status(400).json({ error: 'Invalid additional seats count' });
    }

    // Check for existing customer and subscription
    const existingCustomer = await checkExistingStripeCustomer(orgId);
    
    if (!existingCustomer || !existingCustomer.customerId) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: existingCustomer.customerId,
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
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: subscriptionItems,
      proration_behavior: 'always_invoice'
    });

    console.log(`✅ Seats updated successfully for subscription ${subscription.id}`);
    res.json({ 
      success: true, 
      message: 'Additional seats updated successfully',
      subscriptionId: updatedSubscription.id
    });

  } catch (error) {
    console.error('❌ Error updating seats:', error);
    res.status(500).json({ error: 'Failed to update seats' });
  }
});

// Immediate subscription update for existing customers
router.post('/update-subscription', async (req, res) => {
  try {
    const { plan, additionalSeats = 0 } = req.body;
    const { user } = req;
    const orgId = req.orgContext?.organisationId;

    console.log(`🔄 Immediate subscription update for org ${orgId}: plan=${plan}, seats=${additionalSeats}`);

    // Validate plan
    const priceId = PLAN_TO_PRICE[plan?.toLowerCase()];
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan specified' });
    }

    // Check for existing customer and subscription
    const existingCustomer = await checkExistingStripeCustomer(orgId);
    
    if (!existingCustomer || !existingCustomer.customerId) {
      return res.status(400).json({ error: 'No existing customer found' });
    }

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: existingCustomer.customerId,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const subscription = subscriptions.data[0];
    
    // Build new subscription items
    const subscriptionItems = [];
    
    // Update main plan item (always the first item)
    if (subscription.items.data.length > 0) {
      subscriptionItems.push({
        id: subscription.items.data[0].id,
        price: priceId,
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

    // Update the subscription immediately with prorated billing
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: subscriptionItems,
      proration_behavior: 'always_invoice', // Immediate prorated billing
      metadata: { 
        orgId: orgId.toString(), 
        additionalSeats: additionalSeats.toString(),
        plan: plan || 'unknown',
        updatedAt: new Date().toISOString()
      }
    });

    console.log(`✅ Subscription updated immediately for org ${orgId}`);
    
    res.json({ 
      success: true, 
      message: 'Subscription updated successfully',
      subscriptionId: updatedSubscription.id,
      immediate: true
    });

  } catch (error) {
    console.error('❌ Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
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

    const userId = req.user ? req.user.id : null;

    console.log(`🔍 Processing billing request for org ${orgId}, user ${userId}, plan: ${plan}, seats: ${additionalSeats}`);

    // Determine if this is a new or existing customer
    const customerStatus = await determineCustomerStatus(orgId, userId);
    console.log(`👤 Customer status: ${customerStatus.isNewCustomer ? 'NEW' : 'EXISTING'} - ${customerStatus.reason}`);

    // Check for existing Stripe customer and subscription
    const existingCustomer = await checkExistingStripeCustomer(orgId);
    
    if (existingCustomer && existingCustomer.subscriptionId && !customerStatus.isNewCustomer) {
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
      // NEW CUSTOMER - Create checkout session with appropriate trial period
      const trialDays = customerStatus.isNewCustomer ? 7 : 0;
      console.log(`🆕 Creating ${customerStatus.isNewCustomer ? 'new' : 'existing'} customer subscription with ${trialDays} day trial for org ${orgId}`);
      
      // Build line items
      const lineItems = [{ price, quantity: 1 }];
      
      // Add additional seats if requested
      if (additionalSeats > 0 && ADDITIONAL_SEATS_PRICE_ID) {
        lineItems.push({
          price: ADDITIONAL_SEATS_PRICE_ID,
          quantity: additionalSeats,
        });
      }

      const sessionConfig = {
        mode: 'subscription',
        payment_method_collection: 'always', // Always collect payment method
        allow_promotion_codes: true,
        line_items: lineItems,
        success_url: `${process.env.APP_BASE_URL}/app/dashboard?checkout=success`,
        cancel_url: `${process.env.APP_BASE_URL}/app/dashboard?checkout=cancel`,
        metadata: { 
          orgId: orgId.toString(), 
          additionalSeats: additionalSeats.toString(),
          plan: plan || 'unknown',
          customerType: customerStatus.isNewCustomer ? 'new' : 'existing'
        },
      };

      // Only add trial for new customers
      if (trialDays > 0) {
        sessionConfig.subscription_data = {
          trial_period_days: trialDays,
          metadata: { 
            orgId: orgId.toString(), 
            additionalSeats: additionalSeats.toString(),
            plan: plan || 'unknown'
          },
        };
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      console.log(`🔗 Created checkout session for ${customerStatus.isNewCustomer ? 'new' : 'existing'} customer: ${session.id}`);
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

