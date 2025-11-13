const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND);

// Email configuration
const FROM_EMAIL = 'WorkTrackr <hello@worktrackr.cloud>';
const SUPPORT_EMAIL = 'support@worktrackr.cloud';
const COMPANY_NAME = 'WorkTrackr Cloud';
const APP_URL = 'https://worktrackr.cloud';

/**
 * Send email using Resend
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @returns {Promise<Object>} Resend response
 */
async function sendEmail({ to, subject, html }) {
  try {
    console.log(`📧 Sending email to ${to}: ${subject}`);
    
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html
    });
    
    console.log(`✅ Email sent successfully to ${to}:`, response);
    return response;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
    throw error;
  }
}

/**
 * Generate email layout wrapper
 */
function emailLayout(content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${COMPANY_NAME}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .highlight-box {
      background-color: #f0f9ff;
      border-left: 4px solid #667eea;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .warning-box {
      background-color: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .success-box {
      background-color: #f0fdf4;
      border-left: 4px solid #22c55e;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    h2 {
      color: #1f2937;
      font-size: 24px;
      margin-top: 0;
    }
    p {
      margin: 16px 0;
      color: #4b5563;
    }
    .details {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .details-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .details-row:last-child {
      border-bottom: none;
    }
    .details-label {
      font-weight: 600;
      color: #374151;
    }
    .details-value {
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${COMPANY_NAME}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
      <p style="margin-top: 20px;">
        <a href="${APP_URL}">Dashboard</a> · 
        <a href="${APP_URL}/docs">Documentation</a> · 
        <a href="${APP_URL}/support">Support</a>
      </p>
      <p style="margin-top: 20px; font-size: 12px;">
        © ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 1. Welcome Email - After signup
 */
async function sendWelcomeEmail({ to, userName, organisationName }) {
  const content = `
    <h2>Welcome to ${COMPANY_NAME}! 🎉</h2>
    <p>Hi ${userName},</p>
    <p>Thank you for signing up! We're excited to have you and <strong>${organisationName}</strong> on board.</p>
    
    <div class="highlight-box">
      <p style="margin: 0;"><strong>Your account is ready!</strong> You can now start managing your workflow, creating tickets, and collaborating with your team.</p>
    </div>
    
    <p>Here are some quick tips to get started:</p>
    <ul>
      <li><strong>Create your first ticket</strong> - Start tracking work immediately</li>
      <li><strong>Invite team members</strong> - Collaborate with your colleagues</li>
      <li><strong>Customize workflows</strong> - Tailor the system to your needs</li>
      <li><strong>Set up notifications</strong> - Stay informed about updates</li>
    </ul>
    
    <a href="${APP_URL}/dashboard" class="button">Go to Dashboard</a>
    
    <p>If you have any questions, our support team is here to help!</p>
    <p>Best regards,<br>The ${COMPANY_NAME} Team</p>
  `;
  
  return sendEmail({
    to,
    subject: `Welcome to ${COMPANY_NAME}!`,
    html: emailLayout(content)
  });
}

/**
 * 2. Trial Started Email
 */
async function sendTrialStartedEmail({ to, userName, planName, trialEndDate }) {
  const daysRemaining = Math.ceil((new Date(trialEndDate) - new Date()) / (1000 * 60 * 60 * 24));
  
  const content = `
    <h2>Your 14-Day Free Trial Has Started! 🚀</h2>
    <p>Hi ${userName},</p>
    <p>Your <strong>${planName}</strong> plan trial is now active. You have full access to all features for the next ${daysRemaining} days.</p>
    
    <div class="success-box">
      <p style="margin: 0;"><strong>Trial Period:</strong> ${daysRemaining} days remaining (ends ${new Date(trialEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })})</p>
    </div>
    
    <p><strong>What's included in your trial:</strong></p>
    <ul>
      <li>Full access to all ${planName} features</li>
      <li>No credit card required during trial</li>
      <li>Cancel anytime, no questions asked</li>
      <li>Email reminders before trial ends</li>
    </ul>
    
    <p>Make the most of your trial by exploring all the features. We'll send you reminders before your trial ends.</p>
    
    <a href="${APP_URL}/dashboard" class="button">Start Exploring</a>
    
    <p>Happy tracking!<br>The ${COMPANY_NAME} Team</p>
  `;
  
  return sendEmail({
    to,
    subject: `Your ${planName} Trial Has Started - ${daysRemaining} Days Free!`,
    html: emailLayout(content)
  });
}

/**
 * 3. Trial Check-in Email (Day 2-3 of trial - feedback request)
 */
async function sendTrialCheckinEmail({ to, userName, planName, daysRemaining }) {
  const content = `
    <h2>How's Your Trial Going? 👋</h2>
    <p>Hi ${userName},</p>
    <p>You're a few days into your <strong>${planName}</strong> trial, and we wanted to check in!</p>
    
    <div class="highlight-box">
      <p style="margin: 0;"><strong>We'd love to hear from you!</strong> How are you finding WorkTrackr so far? What do you like? What could be better?</p>
      <p style="margin: 10px 0 0 0;">Simply reply to this email to share your thoughts - we read every response!</p>
    </div>
    
    <p><strong>Quick tips to get the most from your trial:</strong></p>
    <ul>
      <li>Create tickets to track your work</li>
      <li>Set up workflows to automate processes</li>
      <li>Invite team members to collaborate</li>
      <li>Explore the CRM features for customer management</li>
    </ul>
    
    <p>You have <strong>${daysRemaining} days remaining</strong> in your trial. Need help getting started? Just reply to this email!</p>
    
    <a href="${APP_URL}/dashboard" class="button">Continue Exploring</a>
    
    <p>We're here to help you succeed!<br>The ${COMPANY_NAME} Team</p>
  `;
  
  return sendEmail({
    to,
    subject: `How's your ${planName} trial going?`,
    html: emailLayout(content),
    reply_to: 'feedback@worktrackr.cloud'
  });
}

/**
 * 4. Trial Reminder Email (7, 3, 1 day before expiration)
 */
async function sendTrialReminderEmail({ to, userName, planName, daysRemaining, trialEndDate }) {
  const urgency = daysRemaining === 1 ? 'warning-box' : 'highlight-box';
  
  const content = `
    <h2>Your Trial Ends ${daysRemaining === 1 ? 'Tomorrow' : `in ${daysRemaining} Days`} ⏰</h2>
    <p>Hi ${userName},</p>
    <p>Just a friendly reminder that your <strong>${planName}</strong> trial will end on ${new Date(trialEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
    
    <div class="${urgency}">
      <p style="margin: 0;"><strong>${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining</strong> in your trial period.</p>
    </div>
    
    <p>To continue using ${COMPANY_NAME} without interruption, please add your payment details before your trial ends.</p>
    
    <a href="${APP_URL}/billing" class="button">Add Payment Details</a>
    
    <p><strong>What happens when my trial ends?</strong></p>
    <ul>
      <li>If you add payment details, you'll continue with uninterrupted service</li>
      <li>If no payment is added, your account will be paused</li>
      <li>Your data is safe and will be preserved</li>
      <li>You can reactivate anytime by adding payment</li>
    </ul>
    
    <p>Questions? We're here to help at ${SUPPORT_EMAIL}</p>
    <p>Best regards,<br>The ${COMPANY_NAME} Team</p>
  `;
  
  return sendEmail({
    to,
    subject: `Trial Reminder: ${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'} Left on Your ${planName} Trial`,
    html: emailLayout(content)
  });
}

/**
 * 4. Trial Expired Email
 */
async function sendTrialExpiredEmail({ to, userName, planName }) {
  const content = `
    <h2>Your Trial Has Ended</h2>
    <p>Hi ${userName},</p>
    <p>Your 14-day trial of the <strong>${planName}</strong> plan has ended.</p>
    
    <div class="warning-box">
      <p style="margin: 0;"><strong>Your account is now paused.</strong> Add payment details to continue using ${COMPANY_NAME}.</p>
    </div>
    
    <p>Don't worry - your data is safe and preserved. Simply add your payment details to reactivate your account and pick up where you left off.</p>
    
    <a href="${APP_URL}/billing" class="button">Reactivate Account</a>
    
    <p><strong>Why choose ${COMPANY_NAME}?</strong></p>
    <ul>
      <li>Streamlined workflow management</li>
      <li>Powerful ticketing system</li>
      <li>Team collaboration tools</li>
      <li>Dedicated support</li>
    </ul>
    
    <p>We'd love to have you back! If you have any questions or concerns, please reach out to us.</p>
    <p>Best regards,<br>The ${COMPANY_NAME} Team</p>
  `;
  
  return sendEmail({
    to,
    subject: `Your ${COMPANY_NAME} Trial Has Ended - Reactivate Today`,
    html: emailLayout(content)
  });
}

/**
 * 5. Payment Added / Subscription Activated Email
 */
async function sendSubscriptionActivatedEmail({ to, userName, planName, price, nextBillingDate }) {
  const content = `
    <h2>Subscription Activated! 🎉</h2>
    <p>Hi ${userName},</p>
    <p>Thank you for subscribing to ${COMPANY_NAME}! Your <strong>${planName}</strong> subscription is now active.</p>
    
    <div class="success-box">
      <p style="margin: 0;"><strong>Your subscription is active!</strong> You now have full access to all ${planName} features.</p>
    </div>
    
    <div class="details">
      <div class="details-row">
        <span class="details-label">Plan:</span>
        <span class="details-value">${planName}</span>
      </div>
      <div class="details-row">
        <span class="details-label">Price:</span>
        <span class="details-value">£${price}/month</span>
      </div>
      <div class="details-row">
        <span class="details-label">Next Billing Date:</span>
        <span class="details-value">${new Date(nextBillingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>
    </div>
    
    <a href="${APP_URL}/dashboard" class="button">Go to Dashboard</a>
    
    <p>You can manage your subscription, update payment details, or change your plan anytime from your account settings.</p>
    <p>Thank you for choosing ${COMPANY_NAME}!<br>The ${COMPANY_NAME} Team</p>
  `;
  
  return sendEmail({
    to,
    subject: `Subscription Activated - Welcome to ${planName}!`,
    html: emailLayout(content)
  });
}

/**
 * 6. Plan Upgraded Email
 */
async function sendPlanUpgradedEmail({ to, userName, oldPlan, newPlan, newPrice, effectiveDate }) {
  const content = `
    <h2>Plan Upgraded Successfully! 🚀</h2>
    <p>Hi ${userName},</p>
    <p>Great news! Your plan has been upgraded from <strong>${oldPlan}</strong> to <strong>${newPlan}</strong>.</p>
    
    <div class="success-box">
      <p style="margin: 0;"><strong>Upgrade Active:</strong> You now have access to all ${newPlan} features!</p>
    </div>
    
    <div class="details">
      <div class="details-row">
        <span class="details-label">Previous Plan:</span>
        <span class="details-value">${oldPlan}</span>
      </div>
      <div class="details-row">
        <span class="details-label">New Plan:</span>
        <span class="details-value">${newPlan}</span>
      </div>
      <div class="details-row">
        <span class="details-label">New Price:</span>
        <span class="details-value">£${newPrice}/month</span>
      </div>
      <div class="details-row">
        <span class="details-label">Effective:</span>
        <span class="details-value">Immediately</span>
      </div>
    </div>
    
    <p><strong>What's new with ${newPlan}:</strong></p>
    <ul>
      <li>Increased user limits</li>
      <li>Advanced features and capabilities</li>
      <li>Enhanced support</li>
    </ul>
    
    <a href="${APP_URL}/dashboard" class="button">Explore New Features</a>
    
    <p>Your next invoice will include a prorated charge for the upgrade.</p>
    <p>Enjoy your upgraded plan!<br>The ${COMPANY_NAME} Team</p>
  `;
  
  return sendEmail({
    to,
    subject: `Plan Upgraded to ${newPlan} - New Features Unlocked!`,
    html: emailLayout(content)
  });
}

/**
 * 7. Plan Downgraded Email
 */
async function sendPlanDowngradedEmail({ to, userName, oldPlan, newPlan, newPrice, effectiveDate }) {
  const content = `
    <h2>Plan Change Scheduled</h2>
    <p>Hi ${userName},</p>
    <p>Your plan change from <strong>${oldPlan}</strong> to <strong>${newPlan}</strong> has been scheduled.</p>
    
    <div class="highlight-box">
      <p style="margin: 0;"><strong>Effective Date:</strong> ${new Date(effectiveDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} (end of current billing period)</p>
    </div>
    
    <div class="details">
      <div class="details-row">
        <span class="details-label">Current Plan:</span>
        <span class="details-value">${oldPlan} (until ${new Date(effectiveDate).toLocaleDateString('en-GB')})</span>
      </div>
      <div class="details-row">
        <span class="details-label">New Plan:</span>
        <span class="details-value">${newPlan}</span>
      </div>
      <div class="details-row">
        <span class="details-label">New Price:</span>
        <span class="details-value">£${newPrice}/month</span>
      </div>
    </div>
    
    <p>You'll continue to have access to all ${oldPlan} features until ${new Date(effectiveDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. After that, your account will transition to the ${newPlan} plan.</p>
    
    <p>You can cancel this change anytime before the effective date from your account settings.</p>
    
    <a href="${APP_URL}/billing" class="button">Manage Subscription</a>
    
    <p>Best regards,<br>The ${COMPANY_NAME} Team</p>
  `;
  
  return sendEmail({
    to,
    subject: `Plan Change Scheduled - ${oldPlan} to ${newPlan}`,
    html: emailLayout(content)
  });
}

/**
 * 8. Additional Seats Added Email
 */
async function sendSeatsAddedEmail({ to, userName, seatsAdded, totalSeats, additionalCost, totalCost }) {
  const content = `
    <h2>Additional Seats Added</h2>
    <p>Hi ${userName},</p>
    <p>You've successfully added <strong>${seatsAdded}</strong> additional ${seatsAdded === 1 ? 'seat' : 'seats'} to your subscription.</p>
    
    <div class="success-box">
      <p style="margin: 0;"><strong>Total Seats:</strong> ${totalSeats} users can now access your account</p>
    </div>
    
    <div class="details">
      <div class="details-row">
        <span class="details-label">Seats Added:</span>
        <span class="details-value">${seatsAdded}</span>
      </div>
      <div class="details-row">
        <span class="details-label">Additional Cost:</span>
        <span class="details-value">£${additionalCost}/month</span>
      </div>
      <div class="details-row">
        <span class="details-label">New Total:</span>
        <span class="details-value">£${totalCost}/month</span>
      </div>
    </div>
    
    <p>You can now invite ${seatsAdded} more ${seatsAdded === 1 ? 'user' : 'users'} to join your team!</p>
    
    <a href="${APP_URL}/settings/users" class="button">Invite Team Members</a>
    
    <p>Your next invoice will include a prorated charge for the additional seats.</p>
    <p>Best regards,<br>The ${COMPANY_NAME} Team</p>
  `;
  
  return sendEmail({
    to,
    subject: `${seatsAdded} Additional ${seatsAdded === 1 ? 'Seat' : 'Seats'} Added to Your Account`,
    html: emailLayout(content)
  });
}

/**
 * 9. Seats Removed Email
 */
async function sendSeatsRemovedEmail({ to, userName, seatsRemoved, totalSeats, costSaved, totalCost }) {
  const content = `
    <h2>Seats Removed from Subscription</h2>
    <p>Hi ${userName},</p>
    <p>You've removed <strong>${seatsRemoved}</strong> ${seatsRemoved === 1 ? 'seat' : 'seats'} from your subscription.</p>
    
    <div class="highlight-box">
      <p style="margin: 0;"><strong>Total Seats:</strong> ${totalSeats} users can now access your account</p>
    </div>
    
    <div class="details">
      <div class="details-row">
        <span class="details-label">Seats Removed:</span>
        <span class="details-value">${seatsRemoved}</span>
      </div>
      <div class="details-row">
        <span class="details-label">Monthly Savings:</span>
        <span class="details-value">£${costSaved}</span>
      </div>
      <div class="details-row">
        <span class="details-label">New Total:</span>
        <span class="details-value">£${totalCost}/month</span>
      </div>
    </div>
    
    <p>A prorated credit will be applied to your next invoice.</p>
    
    <a href="${APP_URL}/billing" class="button">View Billing Details</a>
    
    <p>Best regards,<br>The ${COMPANY_NAME} Team</p>
  `;
  
  return sendEmail({
    to,
    subject: `${seatsRemoved} ${seatsRemoved === 1 ? 'Seat' : 'Seats'} Removed from Your Subscription`,
    html: emailLayout(content)
  });
}

/**
 * 10. Payment Failed Email
 */
async function sendPaymentFailedEmail({ to, userName, amount, retryDate }) {
  const content = `
    <h2>Payment Failed - Action Required</h2>
    <p>Hi ${userName},</p>
    <p>We were unable to process your payment of <strong>£${amount}</strong> for your ${COMPANY_NAME} subscription.</p>
    
    <div class="warning-box">
      <p style="margin: 0;"><strong>Action Required:</strong> Please update your payment method to avoid service interruption.</p>
    </div>
    
    <p><strong>What happens next?</strong></p>
    <ul>
      <li>We'll automatically retry the payment on ${new Date(retryDate).toLocaleDateString('en-GB')}</li>
      <li>If payment fails again, your account may be suspended</li>
      <li>Your data will be preserved and safe</li>
    </ul>
    
    <a href="${APP_URL}/billing" class="button">Update Payment Method</a>
    
    <p>If you've recently updated your card or have questions about this charge, please contact us at ${SUPPORT_EMAIL}.</p>
    <p>Best regards,<br>The ${COMPANY_NAME} Team</p>
  `;
  
  return sendEmail({
    to,
    subject: `Payment Failed - Update Payment Method`,
    html: emailLayout(content)
  });
}

/**
 * 11. Account Deletion Initiated Email
 */
async function sendAccountDeletionEmail({ to, userName, organisationName, deletionDate }) {
  const content = `
    <h2>Account Deletion Confirmed</h2>
    <p>Hi ${userName},</p>
    <p>We've received your request to delete your ${COMPANY_NAME} account for <strong>${organisationName}</strong>.</p>
    
    <div class="warning-box">
      <p style="margin: 0;"><strong>Account Deletion:</strong> Your account and all data will be permanently deleted on ${new Date(deletionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
    </div>
    
    <p><strong>What will be deleted:</strong></p>
    <ul>
      <li>All tickets and workflow data</li>
      <li>User accounts and team members</li>
      <li>Custom configurations and settings</li>
      <li>All uploaded files and attachments</li>
    </ul>
    
    <p><strong>Your subscription has been cancelled</strong> and you will not be charged again.</p>
    
    <p>If you deleted your account by mistake, please contact us immediately at ${SUPPORT_EMAIL} and we may be able to help.</p>
    
    <p>We're sorry to see you go. If you have any feedback about your experience, we'd love to hear it.</p>
    <p>Best regards,<br>The ${COMPANY_NAME} Team</p>
  `;
  
  return sendEmail({
    to,
    subject: `Account Deletion Confirmed - ${COMPANY_NAME}`,
    html: emailLayout(content)
  });
}

/**
 * 12. Cancellation Confirmed Email (Final goodbye)
 */
async function sendCancellationConfirmedEmail({ to, userName }) {
  const content = `
    <h2>Your Account Has Been Deleted</h2>
    <p>Hi ${userName},</p>
    <p>Your ${COMPANY_NAME} account has been permanently deleted as requested.</p>
    
    <p>All your data has been removed from our systems and your subscription has been cancelled. You will not receive any further charges.</p>
    
    <p><strong>Changed your mind?</strong> You're always welcome back! You can create a new account anytime at ${APP_URL}.</p>
    
    <p>Thank you for using ${COMPANY_NAME}. We wish you all the best!</p>
    
    <a href="${APP_URL}/signup" class="button">Create New Account</a>
    
    <p>If you have any questions, feel free to reach out to ${SUPPORT_EMAIL}.</p>
    <p>Best wishes,<br>The ${COMPANY_NAME} Team</p>
  `;
  
  return sendEmail({
    to,
    subject: `Goodbye from ${COMPANY_NAME}`,
    html: emailLayout(content)
  });
}

module.exports = {
  sendWelcomeEmail,
  sendTrialStartedEmail,
  sendTrialCheckinEmail,
  sendTrialReminderEmail,
  sendTrialExpiredEmail,
  sendSubscriptionActivatedEmail,
  sendPlanUpgradedEmail,
  sendPlanDowngradedEmail,
  sendSeatsAddedEmail,
  sendSeatsRemovedEmail,
  sendPaymentFailedEmail,
  sendAccountDeletionEmail,
  sendCancellationConfirmedEmail
};
