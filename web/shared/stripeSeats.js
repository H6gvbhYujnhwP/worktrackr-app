// Stripe seat synchronization utilities for WorkTrackr Cloud
// Phase 2: Automatic seat quantity management

const { query } = require('../../shared/db.js');
const { PLAN_INCLUDED } = require('./plans.js');

/**
 * Count active users for an organization
 * Active = users with active membership (not pending/invited-only, not disabled)
 */
async function countActiveUsers(orgId) {
  try {
    const result = await query(`
      SELECT COUNT(*) as count 
      FROM memberships m 
      JOIN users u ON m.user_id = u.id 
      WHERE m.organization_id = $1 
        AND m.status = 'active'
        AND u.status != 'disabled'
    `, [orgId]);
    
    return parseInt(result.rows[0]?.count || 0);
  } catch (error) {
    console.error('Error counting active users:', error);
    return 0;
  }
}

/**
 * Synchronize seat quantity with Stripe for an organization
 * This is the core function that keeps Stripe in sync with actual user count
 */
async function syncSeatsForOrg(stripe, org, options = {}) {
  try {
    if (!stripe || !org) {
      console.warn('syncSeatsForOrg: Missing stripe client or org data');
      return;
    }

    // Count active users
    const activeUsers = options.activeUsers !== undefined 
      ? options.activeUsers 
      : await countActiveUsers(org.id);
    
    // Calculate seat overage
    const includedSeats = org.included_seats || PLAN_INCLUDED[org.plan] || 1;
    const seatOverage = Math.max(0, activeUsers - includedSeats);
    
    console.log(`Syncing seats for org ${org.id}: ${activeUsers} active users, ${includedSeats} included, ${seatOverage} additional`);
    
    // Skip if no Stripe subscription or seat item
    if (!org.stripe_subscription_id || !org.stripe_seat_item_id) {
      console.log('No Stripe subscription or seat item ID, skipping sync');
      
      // Update cached count even if we can't sync to Stripe
      await query(
        'UPDATE organizations SET active_user_count = $1 WHERE id = $2',
        [activeUsers, org.id]
      );
      return;
    }

    // Update seat quantity in Stripe
    await stripe.subscriptionItems.update(org.stripe_seat_item_id, {
      quantity: seatOverage,
      proration_behavior: 'create_prorations',
    });

    // Update cached values in database
    await query(`
      UPDATE organizations 
      SET active_user_count = $1, seat_overage_cached = $2 
      WHERE id = $3
    `, [activeUsers, seatOverage, org.id]);

    console.log(`Successfully synced seats for org ${org.id}: ${seatOverage} seat add-ons`);
    
  } catch (error) {
    console.error('Error syncing seats for org:', error);
    throw error;
  }
}

/**
 * Helper function to call after any membership state change
 * This ensures seat counts stay in sync automatically
 */
async function onMembershipStateChanged(stripe, orgId) {
  try {
    // Get organization data
    const orgResult = await query(`
      SELECT id, plan, included_seats, stripe_subscription_id, stripe_seat_item_id, active_user_count
      FROM organizations 
      WHERE id = $1
    `, [orgId]);
    
    const org = orgResult.rows[0];
    if (!org) {
      console.warn(`Organization ${orgId} not found for seat sync`);
      return;
    }

    await syncSeatsForOrg(stripe, org);
    
  } catch (error) {
    console.error('Error in onMembershipStateChanged:', error);
    throw error;
  }
}

/**
 * Find or create seat add-on item in a Stripe subscription
 */
async function ensureSeatAddonItem(stripe, subscriptionId, seatAddonPriceId) {
  try {
    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items']
    });
    
    // Look for existing seat add-on item
    const seatItem = subscription.items.data.find(item => 
      item.price.id === seatAddonPriceId
    );
    
    if (seatItem) {
      return seatItem.id;
    }
    
    // Create new seat add-on item with quantity 0
    const newItem = await stripe.subscriptionItems.create({
      subscription: subscriptionId,
      price: seatAddonPriceId,
      quantity: 0,
      proration_behavior: 'create_prorations',
    });
    
    console.log(`Created seat add-on item ${newItem.id} for subscription ${subscriptionId}`);
    return newItem.id;
    
  } catch (error) {
    console.error('Error ensuring seat add-on item:', error);
    throw error;
  }
}

/**
 * Initialize seat tracking for a new organization after signup
 */
async function initializeSeatTracking(stripe, org, subscriptionId) {
  try {
    if (!process.env.PRICE_SEAT_ADDON) {
      console.warn('PRICE_SEAT_ADDON not configured, skipping seat tracking initialization');
      return;
    }
    
    // Ensure seat add-on item exists
    const seatItemId = await ensureSeatAddonItem(
      stripe, 
      subscriptionId, 
      process.env.PRICE_SEAT_ADDON
    );
    
    // Update organization with seat item ID
    await query(`
      UPDATE organizations 
      SET stripe_seat_item_id = $1 
      WHERE id = $2
    `, [seatItemId, org.id]);
    
    // Perform initial seat sync
    const updatedOrg = { ...org, stripe_seat_item_id: seatItemId };
    await syncSeatsForOrg(stripe, updatedOrg);
    
    console.log(`Initialized seat tracking for org ${org.id}`);
    
  } catch (error) {
    console.error('Error initializing seat tracking:', error);
    throw error;
  }
}

module.exports = {
  countActiveUsers,
  syncSeatsForOrg,
  onMembershipStateChanged,
  ensureSeatAddonItem,
  initializeSeatTracking
};
