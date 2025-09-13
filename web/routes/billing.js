const express = require('express');
const router = express.Router();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Helper: map short plan name -> env price id
const PLAN_TO_PRICE = {
  starter: process.env.PRICE_STARTER,
  pro: process.env.PRICE_PRO,
  enterprise: process.env.PRICE_ENTERPRISE,
};

router.post('/checkout', async (req, res) => {
  try {
    const { plan, priceId } = req.body || {};
    const price = priceId || PLAN_TO_PRICE[(plan || '').toLowerCase()];
    if (!price) return res.status(400).json({ error: 'Missing or invalid plan/priceId' });

    // You can derive orgId from req.user / req.orgContext if your auth is live.
    const orgId = req.orgContext?.organisationId || 'unknown';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_collection: 'always',
      subscription_data: {
        trial_period_days: 7,
        metadata: { orgId }
      },
      line_items: [{ price, quantity: 1 }],
      success_url: `${process.env.APP_BASE_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.APP_BASE_URL}/?checkout=cancel`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: 'Checkout failed' });
  }
});

router.post('/portal', async (req, res) => {
  try {
    const { stripeCustomerId } = req.body || {};
    if (!stripeCustomerId) return res.status(400).json({ error: 'Missing stripeCustomerId' });

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
