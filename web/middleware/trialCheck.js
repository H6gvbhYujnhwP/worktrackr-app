const { query } = require('@worktrackr/shared/db');

/**
 * Decide whether an organisation may use the protected API right now.
 *
 * Returns a plain decision object (NOT an Express middleware) so it can be
 * called from inside the auth step, where we already know the org and can read
 * the real request URL. Order of checks matters:
 *
 *   1. billing_exempt  -> always allowed (owner safety hatch).
 *   2. explicit "bad" subscription statuses -> always blocked (a failed payment
 *      blocks immediately; a cancelled sub stays blocked). This takes precedence
 *      over everything below, so a past_due org with a still-future period is
 *      still blocked.
 *   3. explicit "good" subscription statuses (active / trialing) -> allowed.
 *   4. legacy fallback for orgs that paid BEFORE this column existed: a stored
 *      subscription id with a period that hasn't ended -> allowed.
 *   5. a genuine trial still in its window -> allowed.
 *   6. otherwise -> blocked.
 *
 * @param {string} orgId
 * @returns {Promise<{allowed: boolean, status?: number, body?: object}>}
 */
async function assertAccess(orgId) {
  // No org resolved (e.g. partner admin not yet scoped to an org) -> don't block;
  // other middleware/handlers deal with it.
  if (!orgId) return { allowed: true };

  let org;
  try {
    const result = await query(
      `SELECT billing_exempt,
              subscription_status,
              stripe_subscription_id,
              current_period_end,
              trial_end
         FROM organisations
        WHERE id = $1`,
      [orgId]
    );
    if (result.rows.length === 0) return { allowed: true };
    org = result.rows[0];
  } catch (err) {
    // Never hard-fail a request because the gate's own query errored — log and allow.
    console.error('❌ assertAccess query error:', err.message);
    return { allowed: true };
  }

  const now = new Date();

  // 1) Owner / comped safety hatch.
  if (org.billing_exempt === true) return { allowed: true };

  const status = (org.subscription_status || '').toLowerCase();

  const blocked = () => ({
    allowed: false,
    status: 402,
    body: {
      error: 'subscription_required',
      reason: status || 'no_active_subscription',
      message: 'Your access is paused. Please add or update payment to continue.',
      redirectTo: '/billing',
    },
  });

  // 2) Explicit bad states block immediately, whatever else is true.
  const BAD = ['past_due', 'unpaid', 'canceled', 'cancelled', 'incomplete_expired'];
  if (BAD.includes(status)) return blocked();

  // 3) Explicit good states.
  if (status === 'active' || status === 'trialing') return { allowed: true };

  // 4) Legacy: a real subscription id with a period that hasn't ended yet.
  //    (Cancelled orgs have their subscription id cleared, so they don't reach here.)
  if (org.stripe_subscription_id) {
    if (!org.current_period_end || new Date(org.current_period_end) > now) {
      return { allowed: true };
    }
  }

  // 5) A genuine, still-running trial.
  if (org.trial_end && new Date(org.trial_end) > now) {
    return { allowed: true };
  }

  // 6) Nothing valid.
  return blocked();
}

/**
 * GET /api/trial/status — used by the frontend to show the trial/subscription banner.
 * Always answers (this route is exempt from the wall) so a blocked org can still
 * learn why it's blocked and render the billing screen.
 */
async function getTrialStatus(req, res) {
  try {
    const orgId = req.orgContext?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const result = await query(
      `SELECT trial_start,
              trial_end,
              stripe_subscription_id,
              stripe_customer_id,
              subscription_status,
              billing_exempt,
              plan,
              included_seats
         FROM organisations
        WHERE id = $1`,
      [orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const org = result.rows[0];
    const now = new Date();
    const status = (org.subscription_status || '').toLowerCase();

    // Exempt orgs always read as active.
    if (org.billing_exempt === true) {
      return res.json({
        status: 'active',
        hasSubscription: true,
        isTrialing: false,
        exempt: true,
        plan: org.plan,
        includedSeats: org.included_seats,
      });
    }

    // A payment problem the user must fix.
    if (['past_due', 'unpaid'].includes(status)) {
      return res.json({
        status: 'past_due',
        hasSubscription: true,
        isTrialing: false,
        isExpired: true,
        plan: org.plan,
        includedSeats: org.included_seats,
        message: 'Your last payment failed. Please update your card to continue.',
      });
    }

    if (['canceled', 'cancelled'].includes(status)) {
      return res.json({
        status: 'canceled',
        hasSubscription: false,
        isTrialing: false,
        isExpired: true,
        plan: org.plan,
        includedSeats: org.included_seats,
        message: 'Your subscription was cancelled. Add payment to continue.',
      });
    }

    // Healthy subscription.
    if (status === 'active' || status === 'trialing' || org.stripe_subscription_id) {
      return res.json({
        status: 'active',
        hasSubscription: true,
        isTrialing: status === 'trialing',
        plan: org.plan,
        includedSeats: org.included_seats,
      });
    }

    // Trial accounting.
    if (org.trial_end) {
      const trialEnd = new Date(org.trial_end);
      const trialStart = new Date(org.trial_start);
      const isExpired = now > trialEnd;
      const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      const totalTrialDays = Math.ceil((trialEnd - trialStart) / (1000 * 60 * 60 * 24));

      if (isExpired) {
        return res.json({
          status: 'trial_expired',
          hasSubscription: false,
          isTrialing: false,
          isExpired: true,
          trialStart: org.trial_start,
          trialEnd: org.trial_end,
          daysRemaining: 0,
          plan: org.plan,
          includedSeats: org.included_seats,
          message: 'Your free trial has ended. Add payment details to continue.',
        });
      }

      return res.json({
        status: 'trialing',
        hasSubscription: false,
        isTrialing: true,
        isExpired: false,
        trialStart: org.trial_start,
        trialEnd: org.trial_end,
        daysRemaining,
        totalTrialDays,
        plan: org.plan,
        includedSeats: org.included_seats,
        message: `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining in your free trial`,
      });
    }

    // No trial, no subscription.
    return res.json({
      status: 'no_subscription',
      hasSubscription: false,
      isTrialing: false,
      plan: org.plan,
      includedSeats: org.included_seats,
    });
  } catch (error) {
    console.error('❌ Error getting trial status:', error);
    res.status(500).json({ error: 'Failed to get trial status' });
  }
}

module.exports = {
  assertAccess,
  getTrialStatus,
};
