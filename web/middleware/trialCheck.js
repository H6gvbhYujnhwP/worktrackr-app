const { query } = require('@worktrackr/shared/db');

/**
 * Middleware to check if organization's trial has expired
 * Restricts access to certain routes if trial is expired and no payment added
 */
async function checkTrialStatus(req, res, next) {
  try {
    // Skip check for auth, billing, and public routes
    const publicPaths = ['/api/auth', '/api/billing', '/api/webhooks', '/health'];
    if (publicPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const orgId = req.orgContext?.organisationId;
    
    // If no org context, let other middleware handle it
    if (!orgId) {
      return next();
    }

    // Get organization trial and subscription status
    const result = await query(`
      SELECT 
        trial_start,
        trial_end,
        stripe_subscription_id,
        plan
      FROM organisations 
      WHERE id = $1
    `, [orgId]);

    if (result.rows.length === 0) {
      return next();
    }

    const org = result.rows[0];
    const now = new Date();

    // If has active Stripe subscription, trial doesn't matter
    if (org.stripe_subscription_id) {
      req.trialStatus = {
        hasSubscription: true,
        isTrialing: false,
        isExpired: false
      };
      return next();
    }

    // Check if trial exists and is still valid
    if (org.trial_end) {
      const trialEnd = new Date(org.trial_end);
      const isExpired = now > trialEnd;
      const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

      req.trialStatus = {
        hasSubscription: false,
        isTrialing: !isExpired,
        isExpired: isExpired,
        trialEnd: org.trial_end,
        daysRemaining: isExpired ? 0 : daysRemaining
      };

      // If trial expired, restrict access
      if (isExpired) {
        console.log(`⏰ Trial expired for org ${orgId}`);
        
        // Allow access to billing routes to add payment
        if (req.path.startsWith('/api/billing')) {
          return next();
        }

        // For API routes, return 402 Payment Required
        if (req.path.startsWith('/api/')) {
          return res.status(402).json({
            error: 'Trial expired',
            message: 'Your free trial has ended. Please add payment details to continue.',
            trialEnd: org.trial_end,
            redirectTo: '/billing'
          });
        }

        // For page routes, let frontend handle the redirect
        return next();
      }
    }

    next();
  } catch (error) {
    console.error('❌ Error checking trial status:', error);
    // Don't block request on error, just log it
    next();
  }
}

/**
 * Get trial status for current organization
 * Used by frontend to display trial information
 */
async function getTrialStatus(req, res) {
  try {
    const orgId = req.orgContext?.organisationId;
    
    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const result = await query(`
      SELECT 
        trial_start,
        trial_end,
        stripe_subscription_id,
        stripe_customer_id,
        plan,
        included_seats
      FROM organisations 
      WHERE id = $1
    `, [orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const org = result.rows[0];
    const now = new Date();

    // Has active subscription
    if (org.stripe_subscription_id) {
      return res.json({
        status: 'active',
        hasSubscription: true,
        isTrialing: false,
        plan: org.plan,
        includedSeats: org.included_seats
      });
    }

    // Check trial status
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
          message: 'Your free trial has ended. Add payment details to continue.'
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
        message: `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining in your free trial`
      });
    }

    // No trial, no subscription (shouldn't happen in normal flow)
    return res.json({
      status: 'no_subscription',
      hasSubscription: false,
      isTrialing: false,
      plan: org.plan,
      includedSeats: org.included_seats
    });

  } catch (error) {
    console.error('❌ Error getting trial status:', error);
    res.status(500).json({ error: 'Failed to get trial status' });
  }
}

module.exports = {
  checkTrialStatus,
  getTrialStatus
};
