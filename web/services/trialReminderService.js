/**
 * Trial Reminder Service
 * Sends reminder emails to users at 7, 3, and 1 day before trial expiration
 */

const { Pool } = require('pg');
const emailService = require('../../shared/emailService');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Check and send trial reminder emails
 * Should be run daily via cron job
 */
async function sendTrialReminders() {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  
  console.log(`\n🔔 [Trial Reminders] Starting trial reminder check at ${now.toISOString()}`);
  
  try {
    // Find all active trial accounts
    const { rows: trialAccounts } = await pool.query(`
      SELECT 
        o.id as org_id,
        o.name as org_name,
        o.plan,
        o.trial_start,
        o.trial_end,
        o.trial_reminder_7_sent,
        o.trial_reminder_3_sent,
        o.trial_reminder_1_sent,
        u.email,
        u.full_name
      FROM organisations o
      JOIN users u ON u.organisation_id = o.id AND u.is_admin = TRUE
      WHERE o.trial_end IS NOT NULL
        AND o.trial_end > NOW()
        AND o.stripe_subscription_id IS NULL
      ORDER BY o.trial_end ASC
    `);
    
    console.log(`📊 Found ${trialAccounts.length} active trial accounts`);
    
    let sent7Day = 0;
    let sent3Day = 0;
    let sent1Day = 0;
    
    for (const account of trialAccounts) {
      const trialEnd = new Date(account.trial_end);
      const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      
      // Send 7-day reminder
      if (daysRemaining <= 7 && daysRemaining > 6 && !account.trial_reminder_7_sent) {
        console.log(`📧 Sending 7-day reminder to ${account.email} (${account.org_name})`);
        
        try {
          await emailService.sendTrialReminderEmail({
            to: account.email,
            userName: account.full_name,
            planName: account.plan,
            daysRemaining: 7,
            trialEndDate: account.trial_end
          });
          
          await pool.query(
            'UPDATE organisations SET trial_reminder_7_sent = TRUE WHERE id = $1',
            [account.org_id]
          );
          
          sent7Day++;
          console.log(`✅ 7-day reminder sent to ${account.email}`);
        } catch (error) {
          console.error(`❌ Failed to send 7-day reminder to ${account.email}:`, error.message);
        }
      }
      
      // Send 3-day reminder
      if (daysRemaining <= 3 && daysRemaining > 2 && !account.trial_reminder_3_sent) {
        console.log(`📧 Sending 3-day reminder to ${account.email} (${account.org_name})`);
        
        try {
          await emailService.sendTrialReminderEmail({
            to: account.email,
            userName: account.full_name,
            planName: account.plan,
            daysRemaining: 3,
            trialEndDate: account.trial_end
          });
          
          await pool.query(
            'UPDATE organisations SET trial_reminder_3_sent = TRUE WHERE id = $1',
            [account.org_id]
          );
          
          sent3Day++;
          console.log(`✅ 3-day reminder sent to ${account.email}`);
        } catch (error) {
          console.error(`❌ Failed to send 3-day reminder to ${account.email}:`, error.message);
        }
      }
      
      // Send 1-day reminder
      if (daysRemaining <= 1 && daysRemaining > 0 && !account.trial_reminder_1_sent) {
        console.log(`📧 Sending 1-day reminder to ${account.email} (${account.org_name})`);
        
        try {
          await emailService.sendTrialReminderEmail({
            to: account.email,
            userName: account.full_name,
            planName: account.plan,
            daysRemaining: 1,
            trialEndDate: account.trial_end
          });
          
          await pool.query(
            'UPDATE organisations SET trial_reminder_1_sent = TRUE WHERE id = $1',
            [account.org_id]
          );
          
          sent1Day++;
          console.log(`✅ 1-day reminder sent to ${account.email}`);
        } catch (error) {
          console.error(`❌ Failed to send 1-day reminder to ${account.email}:`, error.message);
        }
      }
    }
    
    console.log(`\n✅ [Trial Reminders] Completed:`);
    console.log(`   - 7-day reminders sent: ${sent7Day}`);
    console.log(`   - 3-day reminders sent: ${sent3Day}`);
    console.log(`   - 1-day reminders sent: ${sent1Day}`);
    console.log(`   - Total reminders sent: ${sent7Day + sent3Day + sent1Day}\n`);
    
    return {
      success: true,
      sent7Day,
      sent3Day,
      sent1Day,
      total: sent7Day + sent3Day + sent1Day
    };
    
  } catch (error) {
    console.error('❌ [Trial Reminders] Error:', error);
    throw error;
  }
}

/**
 * Check and send trial expired emails
 * Should be run daily via cron job
 */
async function sendTrialExpiredEmails() {
  const now = new Date();
  
  console.log(`\n⏰ [Trial Expired] Checking for expired trials at ${now.toISOString()}`);
  
  try {
    // Find trials that expired in the last 24 hours and haven't been notified
    const { rows: expiredTrials } = await pool.query(`
      SELECT 
        o.id as org_id,
        o.name as org_name,
        o.plan,
        o.trial_end,
        u.email,
        u.full_name
      FROM organisations o
      JOIN users u ON u.organisation_id = o.id AND u.is_admin = TRUE
      WHERE o.trial_end IS NOT NULL
        AND o.trial_end < NOW()
        AND o.trial_end > NOW() - INTERVAL '24 hours'
        AND o.stripe_subscription_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM audit_logs 
          WHERE action = 'TRIAL_EXPIRED_EMAIL_SENT' 
          AND user_id = u.id
        )
    `);
    
    console.log(`📊 Found ${expiredTrials.length} newly expired trials`);
    
    let sentCount = 0;
    
    for (const trial of expiredTrials) {
      console.log(`📧 Sending trial expired email to ${trial.email} (${trial.org_name})`);
      
      try {
        await emailService.sendTrialExpiredEmail({
          to: trial.email,
          userName: trial.full_name,
          planName: trial.plan
        });
        
        // Log that we sent the expired email
        await pool.query(`
          INSERT INTO audit_logs (user_id, action, details, created_at)
          VALUES (
            (SELECT id FROM users WHERE email = $1 LIMIT 1),
            'TRIAL_EXPIRED_EMAIL_SENT',
            $2,
            NOW()
          )
        `, [trial.email, JSON.stringify({ org_id: trial.org_id, plan: trial.plan })]);
        
        sentCount++;
        console.log(`✅ Trial expired email sent to ${trial.email}`);
      } catch (error) {
        console.error(`❌ Failed to send trial expired email to ${trial.email}:`, error.message);
      }
    }
    
    console.log(`\n✅ [Trial Expired] Sent ${sentCount} trial expired emails\n`);
    
    return {
      success: true,
      sentCount
    };
    
  } catch (error) {
    console.error('❌ [Trial Expired] Error:', error);
    throw error;
  }
}

/**
 * Run all trial-related cron jobs
 */
async function runTrialJobs() {
  console.log('\n========================================');
  console.log('🚀 Running Trial Reminder Jobs');
  console.log('========================================');
  
  try {
    const reminderResults = await sendTrialReminders();
    const expiredResults = await sendTrialExpiredEmails();
    
    console.log('\n========================================');
    console.log('✅ Trial Jobs Completed Successfully');
    console.log('========================================\n');
    
    return {
      success: true,
      reminders: reminderResults,
      expired: expiredResults
    };
  } catch (error) {
    console.error('\n========================================');
    console.error('❌ Trial Jobs Failed');
    console.error('========================================\n');
    throw error;
  }
}

// If run directly (for testing or manual execution)
if (require.main === module) {
  runTrialJobs()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  sendTrialReminders,
  sendTrialExpiredEmails,
  runTrialJobs
};
