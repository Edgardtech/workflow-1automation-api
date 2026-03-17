const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Mock mode check
const isMockMode = !process.env.AIRTABLE_API_KEY || !process.env.SLACK_BOT_TOKEN;

if (isMockMode) {
  logger.warn('⚠️  Running in MOCK MODE - No real API calls will be made');
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mode: isMockMode ? 'mock' : 'production'
  });
});

// ============================================
// WEBHOOKS
// ============================================

// Receive webhook
app.post('/api/webhooks/receive', (req, res) => {
  const { event, payload } = req.body;

  logger.info('Webhook received', { event, payload });

  if (isMockMode) {
    return res.json({
      success: true,
      message: 'Webhook received (mock mode)',
      event,
      payload,
      timestamp: new Date().toISOString()
    });
  }

  // Process webhook based on event type
  switch (event) {
    case 'client.created':
      handleClientCreated(payload);
      break;
    case 'ride.booked':
      handleRideBooked(payload);
      break;
    case 'ride.completed':
      handleRideCompleted(payload);
      break;
    case 'payment.received':
      handlePaymentReceived(payload);
      break;
    default:
      logger.warn('Unknown event type', { event });
  }

  res.json({
    success: true,
    message: 'Webhook processed',
    event
  });
});

// Get webhook logs
app.get('/api/webhooks/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  res.json({
    logs: [],
    limit,
    message: isMockMode ? 'Mock mode - no logs available' : 'Logs retrieved'
  });
});

// ============================================
// WORKFLOWS
// ============================================

// Client onboarding workflow
app.post('/api/workflows/onboard', async (req, res) => {
  const { name, email, company } = req.body;

  logger.info('Starting client onboarding workflow', { name, email, company });

  if (isMockMode) {
    return res.json({
      success: true,
      executionId: generateId(),
      message: 'Onboarding workflow completed (mock mode)',
      steps: [
        { step: 'airtable_record_created', status: 'success' },
        { step: 'slack_notification_sent', status: 'success' },
        { step: 'welcome_email_sent', status: 'success' }
      ]
    });
  }

  try {
    const steps = [];

    // Step 1: Create Airtable record
    const airtableResult = await createAirtableRecord({ name, email, company });
    steps.push({ step: 'airtable_record_created', status: 'success', data: airtableResult });

    // Step 2: Send Slack notification
    const slackResult = await sendSlackNotification(`New client onboarded: ${name} (${email})`);
    steps.push({ step: 'slack_notification_sent', status: 'success', data: slackResult });

    // Step 3: Send welcome email
    const emailResult = await sendWelcomeEmail(email, name);
    steps.push({ step: 'welcome_email_sent', status: 'success', data: emailResult });

    res.json({
      success: true,
      executionId: generateId(),
      message: 'Onboarding workflow completed',
      steps
    });
  } catch (error) {
    logger.error('Workflow failed', { error });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get workflow execution status
app.get('/api/workflows/:id/status', (req, res) => {
  const { id } = req.params;

  res.json({
    id,
    status: 'completed',
    message: isMockMode ? 'Mock mode - status not available' : 'Status retrieved'
  });
});

// ============================================
// NOTIFICATIONS
// ============================================

// Send Slack message
app.post('/api/notifications/slack', async (req, res) => {
  const { channel, message } = req.body;

  logger.info('Sending Slack notification', { channel, message });

  if (isMockMode) {
    return res.json({
      success: true,
      message: 'Slack notification sent (mock mode)',
      channel,
      text: message
    });
  }

  try {
    const result = await sendSlackNotification(message, channel);
    res.json({
      success: true,
      message: 'Slack notification sent',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send email
app.post('/api/notifications/email', async (req, res) => {
  const { to, subject, body } = req.body;

  logger.info('Sending email', { to, subject });

  if (isMockMode) {
    return res.json({
      success: true,
      message: 'Email sent (mock mode)',
      to,
      subject
    });
  }

  try {
    const result = await sendEmail(to, subject, body);
    res.json({
      success: true,
      message: 'Email sent',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// ROOT ENDPOINT
// ============================================
app.get('/', (req, res) => {
  res.json({
    name: 'Workflow Automation API',
    version: '1.0.0',
    description: 'API for automating business workflows with Airtable, Slack, and Email',
    mode: isMockMode ? 'mock' : 'production',
    endpoints: {
      health: '/health',
      webhooks: '/api/webhooks/receive',
      workflows: '/api/workflows/onboard',
      notifications: {
        slack: '/api/notifications/slack',
        email: '/api/notifications/email'
      }
    },
    docs: 'https://github.com/Edgardtech/workflow-automation-api'
  });
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err });
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ============================================
// HELPER FUNCTIONS (MOCK IMPLEMENTATIONS)
// ============================================

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function handleClientCreated(payload) {
  logger.info('Handling client.created event', payload);
  // Mock implementation
}

async function handleRideBooked(payload) {
  logger.info('Handling ride.booked event', payload);
  // Mock implementation
}

async function handleRideCompleted(payload) {
  logger.info('Handling ride.completed event', payload);
  // Mock implementation
}

async function handlePaymentReceived(payload) {
  logger.info('Handling payment.received event', payload);
  // Mock implementation
}

async function createAirtableRecord(data) {
  logger.info('Creating Airtable record', data);
  // Mock implementation - replace with actual Airtable API call
  return { id: generateId(), ...data };
}

async function sendSlackNotification(message, channel = '#general') {
  logger.info('Sending Slack notification', { channel, message });
  // Mock implementation - replace with actual Slack API call
  return { ok: true, channel, message };
}

async function sendWelcomeEmail(email, name) {
  logger.info('Sending welcome email', { email, name });
  // Mock implementation - replace with actual SendGrid API call
  return { to: email, subject: 'Welcome!', sent: true };
}

async function sendEmail(to, subject, body) {
  logger.info('Sending email', { to, subject });
  // Mock implementation - replace with actual SendGrid API call
  return { to, subject, body, sent: true };
}

// ============================================
// EXPORT FOR VERCEL (Serverless)
// ============================================
module.exports = app;

// ============================================
// START SERVER (when run directly)
// ============================================
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📝 Mode: ${isMockMode ? 'mock' : 'production'}`);
  });
}
