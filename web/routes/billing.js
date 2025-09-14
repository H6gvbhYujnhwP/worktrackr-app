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

/**
 * POST /api/billing/checkout
 * body: { plan?: "starter"|"pro"|"enterprise", priceId?: string, orgId?: string }
 * Returns: { url }  // Stripe Checkout URL
 */
router.post('/checkout', async (req, res) => {
  try {
    const { plan, priceId, orgId: orgIdFromBody } = req.body || {};

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

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_collection: 'always',
      allow_promotion_codes: true, // <-- optional enhancement
      subscription_data: {
        trial_period_days: 7,
        metadata: { orgId }, // so webhooks can map subscription → organisation
      },
      line_items: [{ price, quantity: 1 }],
      success_url: `${process.env.APP_BASE_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.APP_BASE_URL}/?checkout=cancel`,
      metadata: { orgId },
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
