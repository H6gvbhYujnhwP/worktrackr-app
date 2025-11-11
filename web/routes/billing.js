const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getOrgContext, query } = require('@worktrackr/shared/db');

// Import Phase 2 plan configuration
const { 
  PLAN_INCLUDED, 
  PLAN_PRICES, 
  planFromPriceId, 
  priceIdFromPlan, 
  getPlanDetails,
  calculateMonthlyCost 
} = require('../shared/plans.js');

const { 
  syncSeatsForOrg, 
  onMembershipStateChanged,
  initializeSeatTracking 
} = require('../shared/stripeSeats.js');

// Map plan → Stripe Price ID from env
const PLAN_TO_PRICE = {
  starter: process.env.PRICE_STARTER,
  pro: process.env.PRICE_PRO,
  enterprise: process.env.PRICE_ENTERPRISE,
};

// Seat add-on price ID
const SEAT_ADDON_PRICE_ID = process.env.PRICE_ADDITIONAL_SEATS;
const ADDITIONAL_SEATS_PRICE_ID = process.env.PRICE_ADDITIONAL_SEATS;

// Plan configurations - updated to match new pricing
const PLAN_CONFIGS = {
  starter: {
    priceId: process.env.PRICE_STARTER,
    name: 'Starter',
    maxUsers: 1,
    includedSeats: 1,
    price: 49,
    tier: 1  // For upgrade/downgrade comparison
  },
  pro: {
    priceId: process.env.PRICE_PRO,
    name: 'Pro',
    maxUsers: 5,
    includedSeats: 5,
    price: 99,
    tier: 2
  },
  enterprise: {
    priceId: process.env.PRICE_ENTERPRISE,
    name: 'Enterprise',
    maxUsers: 50,
    includedSeats: 50,
    price: 299,
    tier: 3
  }
};

/**
 * Determine if a plan change is an upgrade or downgrade
 * @param {string} currentPlan - Current plan name
 * @param {string} newPlan - New plan name
 * @returns {string} 'upgrade', 'downgrade', or 'same'
 */
function getPlanChangeType(currentPlan, newPlan) {
  const currentTier = PLAN_CONFIGS[currentPlan]?.tier || 0;
  const newTier = PLAN_CONFIGS[newPlan]?.tier || 0;
  
  if (newTier > currentTier) return 'upgrade';
  if (newTier < currentTier) return 'downgrade';
  return 'same';
}

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
      
      // Check database for plan (for non-Stripe accounts)
      const orgResult = await query(
        'SELECT plan, included_seats FROM organisations WHERE id = $1',
        [orgId]
      );
      
      const dbPlan = orgResult.rows[0]?.plan || 'starter';
      const dbIncludedSeats = orgResult.rows[0]?.included_seats || 1;
      
      console.log(`📋 Using database plan: ${dbPlan} with ${dbIncludedSeats} seats`);
      
      return res.json({
        plan: dbPlan,
        includedSeats: dbIncludedSeats,
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
      
      const orgResult = await query(
        'SELECT plan, included_seats FROM organisations WHERE id = $1',
        [orgId]
      );
      
      const dbPlan = orgResult.rows[0]?.plan || 'starter';
      const dbIncludedSeats = orgResult.rows[0]?.included_seats || 1;
      
      console.log(`📋 No Stripe subscription, using database plan: ${dbPlan} with ${dbIncludedSeats} seats`);
      
      return res.json({
        plan: dbPlan,
        includedSeats: dbIncludedSeats,
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
    let baseItem = null;
    let seatItem = null;

    activeSubscription.items.data.forEach(item => {
      const priceId = item.price.id;
      
      // Check which plan this price ID belongs to
      for (const [planName, config] of Object.entries(PLAN_CONFIGS)) {
        if (config.priceId === priceId) {
          plan = planName;
          baseItem = item;
          break;
        }
      }
      
      // Check if this is the additional seats item
      if (priceId === ADDITIONAL_SEATS_PRICE_ID) {
        additionalSeats = item.quantity;
        seatItem = item;
      }
    });

    const includedSeats = PLAN_CONFIGS[plan]?.includedSeats || 1;
    
    // Check for scheduled changes (downgrades)
    const schedule = activeSubscription.schedule ? 
      await stripe.subscriptionSchedules.retrieve(activeSubscription.schedule) : null;
    
    let scheduledPlan = null;
    let scheduledChangeDate = null;
    
    if (schedule && schedule.phases && schedule.phases.length > 1) {
      const nextPhase = schedule.phases[schedule.phases.length - 1];
      if (nextPhase.items && nextPhase.items.length > 0) {
        const scheduledPriceId = nextPhase.items[0].price;
        for (const [planName, config] of Object.entries(PLAN_CONFIGS)) {
          if (config.priceId === scheduledPriceId) {
            scheduledPlan = planName;
            scheduledChangeDate = new Date(schedule.phases[1].start_date * 1000).toISOString();
            break;
          }
        }
      }
    }

    res.json({
      plan,
      includedSeats,
      additionalSeats,
      status: activeSubscription.status,
      currentPeriodEnd: new Date(activeSubscription.current_period_end * 1000).toISOString(),
      trialEnd: activeSubscription.trial_end ? 
        new Date(activeSubscription.trial_end * 1000).toISOString() : null,
      cancelAtPeriodEnd: activeSubscription.cancel_at_period_end,
      scheduledPlan,
      scheduledChangeDate,
      subscriptionId: activeSubscription.id,
      customerId: existingCustomer.customerId
    });

  } catch (error) {
    console.error('❌ Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * POST /api/billing/update-subscription
 * Handle plan upgrades (immediate with proration) and downgrades (scheduled for end of period)
 * body: { plan: string, additionalSeats?: number }
 */
router.post('/update-subscription', async (req, res) => {
  try {
    const { plan, additionalSeats = 0 } = req.body;
    const { user } = req;
    const orgId = req.orgContext?.organisationId;

    console.log(`🔄 Subscription change request for org ${orgId}: plan=${plan}, seats=${additionalSeats}`);

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
    
    // Determine current plan
    let currentPlan = 'starter';
    for (const item of subscription.items.data) {
      for (const [planName, config] of Object.entries(PLAN_CONFIGS)) {
        if (config.priceId === item.price.id) {
          currentPlan = planName;
          break;
        }
      }
    }
    
    // Determine if this is an upgrade or downgrade
    const changeType = getPlanChangeType(currentPlan, plan);
    console.log(`📊 Plan change type: ${changeType} (${currentPlan} → ${plan})`);
    
    if (changeType === 'same') {
      // Just updating seats, not changing plan
      return await handleSeatUpdate(subscription, additionalSeats, orgId, res);
    }
    
    if (changeType === 'upgrade') {
      // UPGRADE: Immediate with proration
      return await handleUpgrade(subscription, plan, priceId, additionalSeats, orgId, res);
    } else {
      // DOWNGRADE: Schedule for end of period
      return await handleDowngrade(subscription, plan, priceId, additionalSeats, orgId, res);
    }

  } catch (error) {
    console.error('❌ Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

/**
 * Handle immediate upgrade with proration
 */
async function handleUpgrade(subscription, newPlan, newPriceId, additionalSeats, orgId, res) {
  try {
    console.log(`⬆️ Processing UPGRADE to ${newPlan} for org ${orgId}`);
    
    // Build new subscription items
    const subscriptionItems = [];
    
    // Update main plan item (always the first item)
    if (subscription.items.data.length > 0) {
      subscriptionItems.push({
        id: subscription.items.data[0].id,
        price: newPriceId,
      });
    }

    // Handle additional seats
    const existingSeatItem = subscription.items.data.find(item => 
      item.price.id === ADDITIONAL_SEATS_PRICE_ID
    );

    if (additionalSeats > 0) {
      if (existingSeatItem) {
        subscriptionItems.push({
          id: existingSeatItem.id,
          quantity: additionalSeats,
        });
      } else {
        subscriptionItems.push({
          price: ADDITIONAL_SEATS_PRICE_ID,
          quantity: additionalSeats,
        });
      }
    } else if (existingSeatItem) {
      subscriptionItems.push({
        id: existingSeatItem.id,
        deleted: true,
      });
    }

    // Cancel any existing schedule (in case there was a pending downgrade)
    if (subscription.schedule) {
      await stripe.subscriptionSchedules.release(subscription.schedule);
      console.log(`🗓️ Released existing subscription schedule`);
    }

    // Update the subscription immediately with prorated billing
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: subscriptionItems,
      proration_behavior: 'always_invoice', // Immediate prorated billing
      billing_cycle_anchor: 'unchanged', // Keep the same billing date
      metadata: { 
        orgId: orgId.toString(), 
        additionalSeats: additionalSeats.toString(),
        plan: newPlan,
        updatedAt: new Date().toISOString()
      }
    });

    console.log(`✅ UPGRADE completed immediately for org ${orgId}`);
    
    return res.json({ 
      success: true, 
      message: `Upgraded to ${newPlan} plan successfully. You've been charged the prorated difference.`,
      subscriptionId: updatedSubscription.id,
      changeType: 'upgrade',
      immediate: true
    });

  } catch (error) {
    console.error('❌ Error processing upgrade:', error);
    throw error;
  }
}

/**
 * Handle downgrade scheduled for end of billing period
 */
async function handleDowngrade(subscription, newPlan, newPriceId, additionalSeats, orgId, res) {
  try {
    console.log(`⬇️ Processing DOWNGRADE to ${newPlan} for org ${orgId}`);
    
    // Build items for the new plan
    const newPhaseItems = [
      {
        price: newPriceId,
        quantity: 1
      }
    ];
    
    // Add additional seats if needed
    if (additionalSeats > 0 && ADDITIONAL_SEATS_PRICE_ID) {
      newPhaseItems.push({
        price: ADDITIONAL_SEATS_PRICE_ID,
        quantity: additionalSeats
      });
    }
    
    // Create or update subscription schedule
    const currentPeriodEnd = subscription.current_period_end;
    
    // Check if there's already a schedule
    if (subscription.schedule) {
      // Update existing schedule
      const schedule = await stripe.subscriptionSchedules.retrieve(subscription.schedule);
      
      const updatedSchedule = await stripe.subscriptionSchedules.update(subscription.schedule, {
        phases: [
          {
            items: subscription.items.data.map(item => ({
              price: item.price.id,
              quantity: item.quantity
            })),
            start_date: schedule.phases[0].start_date,
            end_date: currentPeriodEnd
          },
          {
            items: newPhaseItems,
            start_date: currentPeriodEnd
          }
        ],
        metadata: {
          orgId: orgId.toString(),
          scheduledPlan: newPlan,
          scheduledSeats: additionalSeats.toString()
        }
      });
      
      console.log(`🗓️ Updated existing schedule ${updatedSchedule.id}`);
    } else {
      // Create new schedule
      const schedule = await stripe.subscriptionSchedules.create({
        from_subscription: subscription.id,
        phases: [
          {
            items: subscription.items.data.map(item => ({
              price: item.price.id,
              quantity: item.quantity
            })),
            start_date: subscription.current_period_start,
            end_date: currentPeriodEnd
          },
          {
            items: newPhaseItems,
            start_date: currentPeriodEnd
          }
        ],
        metadata: {
          orgId: orgId.toString(),
          scheduledPlan: newPlan,
          scheduledSeats: additionalSeats.toString()
        }
      });
      
      console.log(`🗓️ Created new schedule ${schedule.id}`);
    }
    
    const changeDate = new Date(currentPeriodEnd * 1000).toISOString();
    console.log(`✅ DOWNGRADE scheduled for ${changeDate}`);
    
    return res.json({ 
      success: true, 
      message: `Downgrade to ${newPlan} plan scheduled. Change will take effect on ${new Date(currentPeriodEnd * 1000).toLocaleDateString()}.`,
      subscriptionId: subscription.id,
      changeType: 'downgrade',
      immediate: false,
      scheduledDate: changeDate
    });

  } catch (error) {
    console.error('❌ Error processing downgrade:', error);
    throw error;
  }
}

/**
 * Handle seat quantity updates (no plan change)
 */
async function handleSeatUpdate(subscription, additionalSeats, orgId, res) {
  try {
    console.log(`👥 Updating seats to ${additionalSeats} for org ${orgId}`);
    
    const subscriptionItems = [];
    
    // Keep the main plan item unchanged
    if (subscription.items.data.length > 0) {
      const mainItem = subscription.items.data[0];
      subscriptionItems.push({
        id: mainItem.id,
        price: mainItem.price.id,
      });
    }

    // Handle additional seats
    const existingSeatItem = subscription.items.data.find(item => 
      item.price.id === ADDITIONAL_SEATS_PRICE_ID
    );

    if (additionalSeats > 0) {
      if (existingSeatItem) {
        subscriptionItems.push({
          id: existingSeatItem.id,
          quantity: additionalSeats,
        });
      } else {
        subscriptionItems.push({
          price: ADDITIONAL_SEATS_PRICE_ID,
          quantity: additionalSeats,
        });
      }
    } else if (existingSeatItem) {
      subscriptionItems.push({
        id: existingSeatItem.id,
        deleted: true,
      });
    }

    // Update seats immediately with proration
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: subscriptionItems,
      proration_behavior: 'always_invoice',
      metadata: { 
        orgId: orgId.toString(), 
        additionalSeats: additionalSeats.toString(),
        updatedAt: new Date().toISOString()
      }
    });

    console.log(`✅ Seats updated for org ${orgId}`);
    
    return res.json({ 
      success: true, 
      message: 'Seat count updated successfully',
      subscriptionId: updatedSubscription.id,
      changeType: 'seats_only',
      immediate: true
    });

  } catch (error) {
    console.error('❌ Error updating seats:', error);
    throw error;
  }
}

/**
 * POST /api/billing/update-seats
 * Update additional seats only (legacy endpoint, redirects to update-subscription)
 */
router.post('/update-seats', async (req, res) => {
  // Redirect to update-subscription endpoint
  req.body.plan = null; // No plan change, just seats
  return router.handle(req, res);
});

/**
 * POST /api/billing/checkout
 * Smart billing: New customers get 14-day trial, existing customers get immediate plan updates
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
      // EXISTING CUSTOMER - Use update-subscription endpoint logic
      console.log(`🔄 Existing customer, redirecting to subscription update logic`);
      
      // Redirect to update logic
      req.body = { plan, additionalSeats };
      return router.handle(req, res);

    } else {
      // NEW CUSTOMER - Create checkout session with 14-day trial
      const trialDays = customerStatus.isNewCustomer ? 14 : 0; // UPDATED: 14 days instead of 7
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
        payment_method_collection: 'always',
        allow_promotion_codes: true,
        line_items: lineItems,
        success_url: `${process.env.APP_BASE_URL}/app/dashboard?checkout=success`,
        cancel_url: `${process.env.APP_BASE_URL}/app/dashboard?checkout=cancel`,
        // Note: statement_descriptor not allowed in subscription mode
        // Statement descriptor is set on the Stripe product level instead
        metadata: { 
          orgId: orgId.toString(), 
          additionalSeats: additionalSeats.toString(),
          plan: plan || 'unknown',
          customerType: customerStatus.isNewCustomer ? 'new' : 'existing'
        },
      };

      // Add 14-day trial for new customers
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
    const orgId = req.orgContext?.organisationId;
    
    // Check for existing customer
    const existingCustomer = await checkExistingStripeCustomer(orgId);
    
    if (!existingCustomer || !existingCustomer.customerId) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: existingCustomer.customerId,
      return_url: `${process.env.APP_BASE_URL}/app/dashboard`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('❌ Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

/**
 * POST /api/billing/admin/update-plan
 * Admin endpoint to manually update organization plan
 */
router.post('/admin/update-plan', async (req, res) => {
  try {
    const { orgId, plan, includedSeats } = req.body;
    
    if (!orgId || !plan) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const seats = includedSeats || PLAN_CONFIGS[plan]?.includedSeats || 1;
    
    await query(
      'UPDATE organisations SET plan = $1, included_seats = $2 WHERE id = $3',
      [plan, seats, orgId]
    );
    
    console.log(`✅ Admin updated org ${orgId} to plan ${plan} with ${seats} seats`);
    
    res.json({ success: true, message: 'Plan updated successfully' });
  } catch (error) {
    console.error('❌ Error updating plan:', error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

module.exports = router;
