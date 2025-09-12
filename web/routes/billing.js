const express = require('express');
const { z } = require('zod');
const { query } = require('@worktrackr/shared/db');

const router = express.Router();

// Initialize Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Validation schemas
const checkoutSchema = z.object({
  orgId: z.string().uuid(),
  priceId: z.string()
});

const portalSchema = z.object({
  orgId: z.string().uuid()
});

// Create checkout session
router.post('/checkout', async (req, res) => {
  try {
    const { orgId, priceId } = checkoutSchema.parse(req.body);
    const { type, partnerId, organizationId } = req.orgContext;

    // Verify access to organization
    if (type === 'partner_admin') {
      const orgCheck = await query(
        'SELECT id, name FROM organisations WHERE id = $1 AND partner_id = $2',
        [orgId, partnerId]
      );
      if (orgCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (orgId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get organization details
    const orgResult = await query(
      'SELECT id, name, stripe_customer_id FROM organisations WHERE id = $1',
      [orgId]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const org = orgResult.rows[0];
    let customerId = org.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: {
          orgId: org.id
        }
      });
      customerId = customer.id;

      // Update organization with customer ID
      await query(
        'UPDATE organisations SET stripe_customer_id = $1 WHERE id = $2',
        [customerId, org.id]
      );
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_collection: 'always',
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          orgId: org.id
        }
      },
      success_url: `${process.env.APP_BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_BASE_URL}/billing/cancel`,
      metadata: {
        orgId: org.id
      }
    });

    res.json({ url: session.url });

  } catch (error) {
    console.error('Checkout error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create customer portal session
router.post('/portal', async (req, res) => {
  try {
    const { orgId } = portalSchema.parse(req.body);
    const { type, partnerId, organizationId } = req.orgContext;

    // Verify access to organization
    if (type === 'partner_admin') {
      const orgCheck = await query(
        'SELECT stripe_customer_id FROM organisations WHERE id = $1 AND partner_id = $2',
        [orgId, partnerId]
      );
      if (orgCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (orgId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get organization's Stripe customer ID
    const orgResult = await query(
      'SELECT stripe_customer_id FROM organisations WHERE id = $1',
      [orgId]
    );

    if (orgResult.rows.length === 0 || !orgResult.rows[0].stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: orgResult.rows[0].stripe_customer_id,
      return_url: `${process.env.APP_BASE_URL}/billing`,
    });

    res.json({ url: session.url });

  } catch (error) {
    console.error('Portal error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Get billing status
router.get('/status/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { type, partnerId, organizationId } = req.orgContext;

    // Verify access to organization
    if (type === 'partner_admin') {
      const orgCheck = await query(
        'SELECT * FROM organisations WHERE id = $1 AND partner_id = $2',
        [orgId, partnerId]
      );
      if (orgCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (orgId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get organization billing info
    const orgResult = await query(`
      SELECT stripe_customer_id, stripe_subscription_id, plan_price_id, 
             current_period_end, trial_start, trial_end
      FROM organisations 
      WHERE id = $1
    `, [orgId]);

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const org = orgResult.rows[0];

    // Get add-ons
    const addonsResult = await query(
      'SELECT * FROM organisation_addons WHERE organisation_id = $1',
      [orgId]
    );

    // Determine plan name from price ID
    let planName = 'Free';
    if (org.plan_price_id) {
      if (org.plan_price_id === process.env.PRICE_STARTER) planName = 'Starter';
      else if (org.plan_price_id === process.env.PRICE_PRO) planName = 'Pro';
      else if (org.plan_price_id === process.env.PRICE_ENTERPRISE) planName = 'Enterprise';
    }

    // Check if in trial
    const now = new Date();
    const inTrial = org.trial_start && org.trial_end && 
                   new Date(org.trial_start) <= now && 
                   now <= new Date(org.trial_end);

    res.json({
      plan: planName,
      priceId: org.plan_price_id,
      inTrial,
      trialEnd: org.trial_end,
      currentPeriodEnd: org.current_period_end,
      hasPaymentMethod: !!org.stripe_subscription_id,
      addons: addonsResult.rows
    });

  } catch (error) {
    console.error('Get billing status error:', error);
    res.status(500).json({ error: 'Failed to fetch billing status' });
  }
});

module.exports = router;

