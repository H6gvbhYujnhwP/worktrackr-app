/**
 * Cron Job Endpoints
 * These endpoints are called by external cron services (Render Cron Jobs, cron-job.org, etc.)
 * to perform scheduled tasks
 */

const express = require('express');
const router = express.Router();
const trialReminderService = require('../services/trialReminderService');

// Simple authentication middleware for cron jobs
// Uses a secret token to prevent unauthorized access
function cronAuth(req, res, next) {
  const cronSecret = process.env.CRON_SECRET || 'default-cron-secret-change-me';
  const providedSecret = req.headers['x-cron-secret'] || req.query.secret;
  
  if (providedSecret !== cronSecret) {
    console.error('❌ Unauthorized cron job attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
}

/**
 * POST /api/cron/trial-reminders
 * Send trial reminder emails (7, 3, 1 day before expiration)
 * 
 * Should be called daily at a specific time (e.g., 9:00 AM UTC)
 * 
 * Headers:
 *   x-cron-secret: <CRON_SECRET from environment>
 * 
 * Or Query Parameter:
 *   ?secret=<CRON_SECRET from environment>
 */
router.post('/trial-reminders', cronAuth, async (req, res) => {
  try {
    console.log('\n📅 [Cron] Trial reminder job triggered');
    
    const results = await trialReminderService.runTrialJobs();
    
    res.json({
      success: true,
      message: 'Trial reminder jobs completed',
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [Cron] Trial reminder job failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Trial reminder job failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/cron/health
 * Health check endpoint for cron service
 * No authentication required
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'WorkTrackr Cron Jobs',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/cron/test
 * Test endpoint to verify cron authentication
 * Requires authentication
 */
router.get('/test', cronAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Cron authentication successful',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
