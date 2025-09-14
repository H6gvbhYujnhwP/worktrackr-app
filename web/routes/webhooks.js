// web/routes/webhooks.js
const express = require('express');
const { query } = require('@worktrackr/shared/db');

const router = express.Router();

// Initialize Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// NOTE: server.js mounts express.raw on /webhooks/stripe BEFORE json()

// Stripe webhook handler
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// (Legacy) Mailgun inbound webhook handler
router.post('/mailgun-inbound', async (req, res) => {
  try {
    const { recipient, sender, subject, 'body-plain': body } = req.body;

    const recipientMatch = recipient?.match(/^(.+)@tickets\.worktrackr\.cloud$/);
    if (!recipientMatch) {
      console.log('Invalid recipient format:', recipient);
      return res.status(400).json({ error: 'Invalid recipient' });
    }

    // For now, create ticket in first available organization
    const orgResult = await query(
      'SELECT id FROM organisations ORDER BY created_at LIMIT 1'
    );
    if (orgResult.rows.length === 0) {
      console.log('No organizations found');
      return res.status(404).json({ error: 'No organizations found' });
    }
    const organizationId = orgResult.rows[0].id;

    // Get default queue
    const queueResult = await query(
      'SELECT id FROM queues WHERE organisation_id = $1 AND is_default = true LIMIT 1',
      [organizationId]
    );
    const queueId = queueResult.rows.length > 0 ? queueResult.rows[0].id : null;

    // Create ticket from email
    const ticketResult = await query(
      `INSERT INTO tickets (organisation_id, queue_id, title, description, status, priority)
       VALUES ($1, $2, $3, $4, 'open', 'medium')
       RETURNING id`,
      [organizationId, queueId, subject || 'Email Ticket', body || '']
    );

    console.log(`Created ticket ${ticketResult.rows[0].id} from email`);
    res.json({ ticketId: ticketResult.rows[0].id });
  } catch (error) {
    console.error('Mailgun webhook error:', error);
    res.status(500).json({ error: 'Failed to process email' });
  }
});

/* ========== Stripe helpers ========== */

async function handleCheckoutCompleted(session) {
  const orgId = session.metadata?.orgId;
  if (!orgId) return;

  await query(
    `UPDATE organisations 
       SET stripe_customer_id = $1, stripe_subscription_id = $2
     WHERE id = $3`,
    [session.customer, session.subscription, orgId]
  );

  console.log(`Checkout completed for org ${orgId}`);
}

async function handleSubscriptionUpdated(subscription) {
  // FIX: must be 'let' because we may set it later
  let orgId = subscription.metadata?.orgId;
  if (!orgId) {
    const orgResult = await query(
      'SELECT id FROM organisations WHERE stripe_customer_id = $1',
      [subscription.customer]
    );
    if (orgResult.rows.length === 0) return;
    orgId = orgResult.rows[0].id;
  }

  const mainItem = subscription.items.data.find((item) =>
    [process.env.PRICE_STARTER, process.env.PRICE_PRO, process.env.PRICE_ENTERPRISE]
      .includes(item.price.id)
  );
  const planPriceId = mainItem ? mainItem.price.id : null;

  await query(
    `UPDATE organisations 
        SET stripe_subscription_id = $1,
            plan_price_id       = $2,
            current_period_end  = $3,
            trial_start         = $4,
            trial_end           = $5
      WHERE id = $6`,
    [
      subscription.id,
      planPriceId,
      new Date(subscription.current_period_end * 1000),
      subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      orgId,
    ]
  );

  // Refresh add-ons
  await query('DELETE FROM organisation_addons WHERE organisation_id = $1', [orgId]);

  const addOnItems = subscription.items.data.filter(
    (item) =>
      ![process.env.PRICE_STARTER, process.env.PRICE_PRO, process.env.PRICE_ENTERPRISE]
        .includes(item.price.id)
  );

  for (const item of addOnItems) {
    let addonName = 'Unknown Add-on';
    if (item.price.id === process.env.PRICE_STORAGE_100) addonName = 'Storage Boost 100GB';
    else if (item.price.id === process.env.PRICE_SMS250) addonName = 'SMS Pack 250';
    else if (item.price.id === process.env.PRICE_SMS1000) addonName = 'SMS Pack 1000';

    await query(
      'INSERT INTO organisation_addons (organisation_id, price_id, name) VALUES ($1, $2, $3)',
      [orgId, item.price.id, addonName]
    );
  }

  console.log(`Subscription updated for org ${orgId}`);
}

async function handleSubscriptionDeleted(subscription) {
  const orgResult = await query(
    'SELECT id FROM organisations WHERE stripe_subscription_id = $1',
    [subscription.id]
  );
  if (orgResult.rows.length === 0) return;

  const orgId = orgResult.rows[0].id;

  await query(
    `UPDATE organisations 
        SET stripe_subscription_id = NULL,
            plan_price_id          = NULL,
            current_period_end     = NULL,
            trial_start            = NULL,
            trial_end              = NULL
      WHERE id = $1`,
    [orgId]
  );

  await query('DELETE FROM organisation_addons WHERE organisation_id = $1', [orgId]);

  console.log(`Subscription cancelled for org ${orgId}`);
}

async function handlePaymentSucceeded(invoice) {
  console.log(`Payment succeeded for subscription ${invoice.subscription}`);
}

async function handlePaymentFailed(invoice) {
  console.log(`Payment failed for subscription ${invoice.subscription}`);
}

module.exports = router;
