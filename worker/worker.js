require('dotenv').config();
const PgBoss = require('pg-boss');
const { query } = require('@worktrackr/shared/db');

// --- Resend (outbound/inbound) ----------------------------------------------
let resend = null;
if (process.env.RESEND_API_KEY) {
  try {
    const { Resend } = require('resend');
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('📧 Resend initialized');
  } catch (error) {
    console.warn('⚠️ Resend initialization failed:', error.message);
    console.log('📧 Email functionality will be disabled');
  }
} else {
  console.log('📧 Resend API key not provided - email functionality disabled');
}

// --- pg-boss (background jobs) ----------------------------------------------
const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  schema: process.env.BOSS_SCHEMA || 'pgboss',
  // optional retention tuning:
  archiveCompletedAfterSeconds: 3600,   // archive after 1 hour
  deleteArchivedAfterSeconds: 604800,   // purge after 7 days
});

boss.on('error', (err) => {
  console.error('pg-boss error:', err);
});

async function startWorker() {
  try {
    await boss.start();
    console.log('🗃️ pg-boss started');
    console.log('🚀 WorkTrackr Worker started');

    // ---- Job processors -----------------------------------------------------
    await boss.work('send-email', { teamSize: 5, teamConcurrency: 2 }, handleSendEmail);
    await boss.work('ticket-notification', { teamSize: 3 }, handleTicketNotification);
    await boss.work('sla-check', { teamSize: 2 }, handleSLACheck);
    await boss.work('workflow-trigger', { teamSize: 5 }, handleWorkflowTrigger);

    // Recurring monitor (every 5 minutes)
    await boss.schedule('sla-monitor', '*/5 * * * *', {});
    await boss.work('sla-monitor', handleSLAMonitor);

    // Optional smoke test processor (publish jobs via SQL or a script)
    await boss.work('smoke-job', async (job) => {
      console.log('🔥 smoke-job received', job.id, job.data);
    });

    console.log('✅ All job handlers registered');
  } catch (error) {
    console.error('❌ Worker startup failed:', error);
    process.exit(1);
  }
}

// --- Handlers ---------------------------------------------------------------
async function handleSendEmail(job) {
  const { to, subject, text, html, organizationId } = job.data;

  try {
    if (!resend) {
      console.log(`📧 Email queued but not sent (Resend not configured): ${subject} to ${to}`);
      return { success: true, messageId: 'disabled', note: 'Resend not configured' };
    }

    // Load org branding for From-Name
    const brandingResult = await query(
      'SELECT email_from_name FROM org_branding WHERE organisation_id = $1',
      [organizationId]
    );
    const fromName = brandingResult.rows.length > 0
      ? brandingResult.rows[0].email_from_name
      : 'WorkTrackr Support';

    // Use your verified domain in Resend if set; fallback to onboarding
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const emailData = {
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      text,
      html,
    };

    const result = await resend.emails.send(emailData);
    console.log(`✅ Email sent to ${to}:`, result.data?.id);
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('❌ Email send failed:', error);
    throw error;
  }
}

async function handleTicketNotification(job) {
  const { ticketId, type } = job.data;

  try {
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

    if (type === 'assigned' && ticket.assignee_email) {
      await boss.send('send-email', {
        to: ticket.assignee_email,
        subject: `Ticket Assigned: ${ticket.title}`,
        text: `You have been assigned ticket #${ticket.id}: ${ticket.title}\n\nDescription: ${ticket.description}\n\nPriority: ${ticket.priority}`,
        organizationId: ticket.organisation_id
      });
      return;
    }

    if (type === 'status_changed' && ticket.assignee_email) {
      await boss.send('send-email', {
        to: ticket.assignee_email,
        subject: `Ticket Status Updated: ${ticket.title}`,
        text: `Ticket #${ticket.id} status changed to: ${ticket.status}\n\nTitle: ${ticket.title}`,
        organizationId: ticket.organisation_id
      });
      return;
    }

    if (type === 'comment_added') {
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
    }

    if (type === 'sla_breach') {
      // escalate notification as needed
      console.log(`🚨 SLA breach notification queued for ticket ${ticket.id}`);
      return;
    }

    console.log(`Unknown notification type: ${type}`);
  } catch (error) {
    console.error('❌ Ticket notification failed:', error);
    throw error;
  }
}

async function handleSLACheck(job) {
  const { ticketId } = job.data;

  try {
    const ticketResult = await query(`
      SELECT t.*, o.name as org_name
      FROM tickets t
      JOIN organisations o ON t.organisation_id = o.id
      WHERE t.id = $1 AND t.status IN ('open', 'pending')
    `, [ticketId]);

    if (ticketResult.rows.length === 0) return;

    const ticket = ticketResult.rows[0];
    const now = new Date();
    const createdAt = new Date(ticket.created_at);
    const hoursOpen = (now - createdAt) / (1000 * 60 * 60);

    const slaThresholds = { urgent: 2, high: 8, medium: 24, low: 72 };
    const threshold = slaThresholds[ticket.priority] || 24;

    if (hoursOpen > threshold) {
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

async function handleWorkflowTrigger(job) {
  const { ticketId, trigger, organizationId } = job.data;

  try {
    const workflowsResult = await query(
      'SELECT * FROM workflows WHERE organisation_id = $1 AND is_active = true',
      [organizationId]
    );

    for (const workflow of workflowsResult.rows) {
      const definition = workflow.definition;
      if (definition.triggers && definition.triggers.includes(trigger)) {
        console.log(`🔄 Triggering workflow ${workflow.name} for ticket ${ticketId}`);
        await executeWorkflowActions(ticketId, definition.actions || []);
      }
    }
  } catch (error) {
    console.error('❌ Workflow trigger failed:', error);
    throw error;
  }
}

async function handleSLAMonitor() {
  try {
    const ticketsResult = await query(`
      SELECT id, priority, created_at
      FROM tickets 
      WHERE status IN ('open', 'pending')
      AND created_at < NOW() - INTERVAL '1 hour'
    `);

    for (const ticket of ticketsResult.rows) {
      await boss.send('sla-check', { ticketId: ticket.id });
    }

    console.log(`📊 SLA monitor checked ${ticketsResult.rows.length} tickets`);
  } catch (error) {
    console.error('❌ SLA monitor failed:', error);
    throw error;
  }
}

async function executeWorkflowActions(ticketId, actions) {
  for (const action of actions) {
    try {
      switch (action.type) {
        case 'assign':
          await query(
            'UPDATE tickets SET assignee_id = $1, updated_at = NOW() WHERE id = $2',
            [action.userId, ticketId]
          );
          await boss.send('ticket-notification', { ticketId, type: 'assigned' });
          break;

        case 'change_status':
          await query(
            'UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2',
            [action.status, ticketId]
          );
          await boss.send('ticket-notification', { ticketId, type: 'status_changed' });
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
          await boss.send(
            'sla-check',
            { ticketId },
            { startAfter: new Date(Date.now() + action.delayHours * 60 * 60 * 1000) }
          );
          break;

        default:
          console.log(`Unknown workflow action: ${action.type}`);
      }
    } catch (error) {
      console.error('❌ Workflow action failed:', error);
    }
  }
}

// --- graceful shutdown ------------------------------------------------------
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

// --- kick off ---------------------------------------------------------------
startWorker();
