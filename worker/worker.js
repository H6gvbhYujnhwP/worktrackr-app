require('dotenv').config();
const PgBoss = require('pg-boss');
const { query } = require('@worktrackr/shared/db');

// Initialize Mailgun
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
  url: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net'
});

// Initialize PgBoss
const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  schema: process.env.BOSS_SCHEMA || 'pgboss'
});

async function startWorker() {
  try {
    await boss.start();
    console.log('🚀 WorkTrackr Worker started');

    // Register job handlers
    await boss.work('send-email', { teamSize: 5, teamConcurrency: 2 }, handleSendEmail);
    await boss.work('ticket-notification', { teamSize: 3 }, handleTicketNotification);
    await boss.work('sla-check', { teamSize: 2 }, handleSLACheck);
    await boss.work('workflow-trigger', { teamSize: 5 }, handleWorkflowTrigger);

    // Schedule recurring jobs
    await boss.schedule('sla-monitor', '*/5 * * * *', {}); // Every 5 minutes
    await boss.work('sla-monitor', handleSLAMonitor);

    console.log('✅ All job handlers registered');

  } catch (error) {
    console.error('❌ Worker startup failed:', error);
    process.exit(1);
  }
}

// Email sending handler
async function handleSendEmail(job) {
  const { to, subject, text, html, organizationId } = job.data;

  try {
    // Get organization branding
    const brandingResult = await query(
      'SELECT email_from_name FROM org_branding WHERE organisation_id = $1',
      [organizationId]
    );

    const fromName = brandingResult.rows.length > 0 
      ? brandingResult.rows[0].email_from_name 
      : 'WorkTrackr Support';

    const emailData = {
      from: `${fromName} <noreply@${process.env.MAILGUN_DOMAIN}>`,
      to,
      subject,
      text,
      html
    };

    const result = await mg.messages.create(process.env.MAILGUN_DOMAIN, emailData);
    
    console.log(`✅ Email sent to ${to}:`, result.id);
    return { success: true, messageId: result.id };

  } catch (error) {
    console.error('❌ Email send failed:', error);
    throw error;
  }
}

// Ticket notification handler
async function handleTicketNotification(job) {
  const { ticketId, type, userId } = job.data;

  try {
    // Get ticket details
    const ticketResult = await query(`
      SELECT t.*, o.name as org_name, u.email as assignee_email, u.name as assignee_name,
             creator.email as creator_email, creator.name as creator_name
      FROM tickets t
      JOIN organisations o ON t.organisation_id = o.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.id = $1
    `, [ticketId]);

    if (ticketResult.rows.length === 0) {
      console.log(`Ticket ${ticketId} not found`);
      return;
    }

    const ticket = ticketResult.rows[0];
    let emailTo, subject, text;

    switch (type) {
      case 'assigned':
        if (!ticket.assignee_email) return;
        emailTo = ticket.assignee_email;
        subject = `Ticket Assigned: ${ticket.title}`;
        text = `You have been assigned ticket #${ticket.id}: ${ticket.title}\n\nDescription: ${ticket.description}\n\nPriority: ${ticket.priority}`;
        break;

      case 'status_changed':
        if (!ticket.assignee_email) return;
        emailTo = ticket.assignee_email;
        subject = `Ticket Status Updated: ${ticket.title}`;
        text = `Ticket #${ticket.id} status changed to: ${ticket.status}\n\nTitle: ${ticket.title}`;
        break;

      case 'comment_added':
        // Notify assignee and creator
        const recipients = [ticket.assignee_email, ticket.creator_email].filter(Boolean);
        for (const email of recipients) {
          await boss.send('send-email', {
            to: email,
            subject: `New Comment: ${ticket.title}`,
            text: `A new comment was added to ticket #${ticket.id}: ${ticket.title}`,
            organizationId: ticket.organisation_id
          });
        }
        return;

      default:
        console.log(`Unknown notification type: ${type}`);
        return;
    }

    if (emailTo) {
      await boss.send('send-email', {
        to: emailTo,
        subject,
        text,
        organizationId: ticket.organisation_id
      });
    }

  } catch (error) {
    console.error('❌ Ticket notification failed:', error);
    throw error;
  }
}

// SLA check handler
async function handleSLACheck(job) {
  const { ticketId } = job.data;

  try {
    // Get ticket details
    const ticketResult = await query(`
      SELECT t.*, o.name as org_name
      FROM tickets t
      JOIN organisations o ON t.organisation_id = o.id
      WHERE t.id = $1 AND t.status IN ('open', 'pending')
    `, [ticketId]);

    if (ticketResult.rows.length === 0) {
      return; // Ticket closed or not found
    }

    const ticket = ticketResult.rows[0];
    const now = new Date();
    const createdAt = new Date(ticket.created_at);
    const hoursOpen = (now - createdAt) / (1000 * 60 * 60);

    // Define SLA thresholds based on priority
    const slaThresholds = {
      urgent: 2,   // 2 hours
      high: 8,     // 8 hours
      medium: 24,  // 24 hours
      low: 72      // 72 hours
    };

    const threshold = slaThresholds[ticket.priority] || 24;

    if (hoursOpen > threshold) {
      // SLA breach - escalate
      await boss.send('ticket-notification', {
        ticketId: ticket.id,
        type: 'sla_breach',
        hoursOpen: Math.round(hoursOpen)
      });

      console.log(`🚨 SLA breach for ticket ${ticket.id} (${hoursOpen.toFixed(1)}h open)`);
    }

  } catch (error) {
    console.error('❌ SLA check failed:', error);
    throw error;
  }
}

// Workflow trigger handler
async function handleWorkflowTrigger(job) {
  const { ticketId, trigger, organizationId } = job.data;

  try {
    // Get active workflows for organization
    const workflowsResult = await query(
      'SELECT * FROM workflows WHERE organisation_id = $1 AND is_active = true',
      [organizationId]
    );

    for (const workflow of workflowsResult.rows) {
      const definition = workflow.definition;
      
      // Check if workflow should trigger
      if (definition.triggers && definition.triggers.includes(trigger)) {
        console.log(`🔄 Triggering workflow ${workflow.name} for ticket ${ticketId}`);
        
        // Execute workflow actions
        await executeWorkflowActions(ticketId, definition.actions || []);
      }
    }

  } catch (error) {
    console.error('❌ Workflow trigger failed:', error);
    throw error;
  }
}

// SLA monitoring job (recurring)
async function handleSLAMonitor(job) {
  try {
    // Find tickets that might be approaching SLA breach
    const ticketsResult = await query(`
      SELECT id, priority, created_at
      FROM tickets 
      WHERE status IN ('open', 'pending')
      AND created_at < NOW() - INTERVAL '1 hour'
    `);

    for (const ticket of ticketsResult.rows) {
      // Schedule SLA check for each ticket
      await boss.send('sla-check', { ticketId: ticket.id });
    }

    console.log(`📊 SLA monitor checked ${ticketsResult.rows.length} tickets`);

  } catch (error) {
    console.error('❌ SLA monitor failed:', error);
    throw error;
  }
}

// Execute workflow actions
async function executeWorkflowActions(ticketId, actions) {
  for (const action of actions) {
    try {
      switch (action.type) {
        case 'assign':
          await query(
            'UPDATE tickets SET assignee_id = $1, updated_at = NOW() WHERE id = $2',
            [action.userId, ticketId]
          );
          await boss.send('ticket-notification', {
            ticketId,
            type: 'assigned'
          });
          break;

        case 'change_status':
          await query(
            'UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2',
            [action.status, ticketId]
          );
          await boss.send('ticket-notification', {
            ticketId,
            type: 'status_changed'
          });
          break;

        case 'change_priority':
          await query(
            'UPDATE tickets SET priority = $1, updated_at = NOW() WHERE id = $2',
            [action.priority, ticketId]
          );
          break;

        case 'send_email':
          await boss.send('send-email', {
            to: action.email,
            subject: action.subject,
            text: action.body,
            organizationId: action.organizationId
          });
          break;

        case 'schedule_escalation':
          await boss.send('sla-check', 
            { ticketId }, 
            { startAfter: new Date(Date.now() + action.delayHours * 60 * 60 * 1000) }
          );
          break;

        default:
          console.log(`Unknown workflow action: ${action.type}`);
      }
    } catch (error) {
      console.error(`❌ Workflow action failed:`, error);
    }
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Worker shutting down...');
  await boss.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Worker shutting down...');
  await boss.stop();
  process.exit(0);
});

// Start the worker
startWorker();

