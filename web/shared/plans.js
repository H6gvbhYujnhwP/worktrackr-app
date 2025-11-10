// Plan configuration and Stripe price mapping for WorkTrackr Cloud
// Phase 2: Individual plan + seat add-ons

const PLAN_INCLUDED = {
  individual: 1,
  starter: 1,
  pro: 10,
  enterprise: 50,
};

const PLAN_PRICES = {
  individual: 15,
  starter: 49,
  pro: 99,
  enterprise: 299,
};

const SEAT_ADDON_PRICE = 9; // £9 per additional seat/month

function planFromPriceId(priceId, env) {
  const map = {
    [env.PRICE_INDIVIDUAL_BASE]: 'individual',
    [env.PRICE_STARTER_BASE]: 'starter',
    [env.PRICE_PRO_BASE]: 'pro',
    [env.PRICE_ENTERPRISE_BASE]: 'enterprise',
  };
  return map[priceId] || null;
}

function priceIdFromPlan(plan, env) {
  const map = {
    individual: env.PRICE_INDIVIDUAL_BASE,
    starter: env.PRICE_STARTER_BASE,
    pro: env.PRICE_PRO_BASE,
    enterprise: env.PRICE_ENTERPRISE_BASE,
  };
  return map[plan] || null;
}

function getPlanDetails(plan) {
  return {
    name: plan.charAt(0).toUpperCase() + plan.slice(1),
    basePrice: PLAN_PRICES[plan],
    includedSeats: PLAN_INCLUDED[plan],
    seatAddonPrice: SEAT_ADDON_PRICE,
  };
}

function calculateMonthlyCost(plan, activeUsers) {
  const details = getPlanDetails(plan);
  if (!details) return 0;
  
  const additionalSeats = Math.max(0, activeUsers - details.includedSeats);
  return details.basePrice + (additionalSeats * SEAT_ADDON_PRICE);
}

function getAvailablePlans() {
  return Object.keys(PLAN_INCLUDED).map(plan => ({
    id: plan,
    ...getPlanDetails(plan)
  }));
}

module.exports = {
  PLAN_INCLUDED,
  PLAN_PRICES,
  SEAT_ADDON_PRICE,
  planFromPriceId,
  priceIdFromPlan,
  getPlanDetails,
  calculateMonthlyCost,
  getAvailablePlans
};
