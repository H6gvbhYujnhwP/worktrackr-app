// web/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const jwt = require('jsonwebtoken');

const { getOrgContext } = require('@worktrackr/shared/db');
const { checkTrialStatus, getTrialStatus } = require('./middleware/trialCheck');

// Routes
const authRoutes = require('./routes/auth');                // includes /api/auth/stripe/webhook
const ticketsRoutes = require('./routes/tickets');
const organizationsRoutes = require('./routes/organizations');
const billingRoutes = require('./routes/billing');
const webhooksRoutes = require('./routes/webhooks');
const cronRoutes = require('./routes/cron');
const publicAuthRoutes = require('./routes/public-auth');
const customersRoutes = require('./routes/customers');
const productsRoutes = require('./routes/products');
const contactsRoutes = require('./routes/contacts');

const app = express();
const PORT = process.env.PORT || 10000;

// Trust Render proxy (HTTPS + cookies)
app.set('trust proxy', 1);

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
    }
    next();
  });
}

/* ---------------- Security headers (CSP allows Stripe) ---------------- */
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
        frameSrc: ['https://js.stripe.com'],
        connectSrc: ["'self'", 'https://api.stripe.com', 'https://*.stripe.com'],
      },
    },
  })
);

/* ---------------- Rate limiting ---------------- */
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use('/webhooks', rateLimit({ windowMs: 60 * 1000, max: 60 }));

/* ---------------- CORS ---------------- */
const allowedOrigins = (process.env.ALLOWED_HOSTS || 'localhost:3000,worktrackr.cloud,localhost:10000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

console.log('🌐 CORS allowed origins:', allowedOrigins);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      const ok = allowedOrigins.length === 0 || allowedOrigins.some((h) => origin.includes(h));
      cb(ok ? null : new Error('Not allowed by CORS'), ok);
    },
    credentials: true,
  })
);

/* -----------------------------------------------------------------------
   Stripe webhooks need RAW body for signature verification.
   ----------------------------------------------------------------------- */
app.use('/api/auth/stripe/webhook', express.raw({ type: 'application/json' }));
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

/* ---------------- Cookie parser comes early ---------------- */
app.use(cookieParser());

/* -----------------------------------------------------------------------
   Global JSON/urlencoded parsers — skip for webhook paths
   ----------------------------------------------------------------------- */
app.use((req, res, next) => {
  if (req.originalUrl === '/api/auth/stripe/webhook' || req.originalUrl === '/webhooks/stripe') {
    return next();
  }
  return express.json({ limit: '10mb' })(req, res, next);
});

app.use((req, res, next) => {
  if (req.originalUrl === '/api/auth/stripe/webhook' || req.originalUrl === '/webhooks/stripe') {
    return next();
  }
  return express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});

/* ---------------- Auth middleware (for protected APIs) ---------------- */
async function authenticateToken(req, res, next) {
  try {
    const token = req.cookies?.auth_token || req.cookies?.jwt || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    const activeOrgId = req.headers['x-org-id'] || req.query.orgId;
    req.orgContext = await getOrgContext(decoded.userId, activeOrgId);
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/* ======================= API Routes ========================= */
app.use('/api/auth', authRoutes);
app.use('/api/auth', require('./routes/session')); // Session check endpoint

// Admin routes (no auth required, protected by admin key)
const adminRoutes = require('./routes/admin');
const adminUsersRoutes = require('./routes/adminUsers');
const migrationsRoutes = require('./routes/migrations');
const adminSetTrialRoutes = require('./routes/adminSetTrial');
app.use('/api/admin', adminRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin', adminSetTrialRoutes);
app.use('/api/migrations', migrationsRoutes);

app.use('/api/tickets', authenticateToken, ticketsRoutes);
app.use('/api/organizations', authenticateToken, organizationsRoutes);
app.use('/api/contacts', authenticateToken, contactsRoutes);

app.use('/api/billing', authenticateToken, billingRoutes);

// Trial status endpoint
app.get('/api/trial/status', authenticateToken, getTrialStatus);

// Apply trial check middleware to protected routes (after auth)
app.use('/api/', authenticateToken, checkTrialStatus);
app.use('/api/auth/user', require('./routes/user.js'));
app.use('/api/customers', authenticateToken, customersRoutes);
app.use('/api/products', authenticateToken, productsRoutes);
const crmEventsRoutes = require('./routes/crm-events');
const customerServicesRoutes = require('./routes/customer-services');
app.use('/api/crm-events', authenticateToken, crmEventsRoutes);
app.use('/api/customer-services', authenticateToken, customerServicesRoutes);
const quotesRoutes = require('./routes/quotes');
const quotesEmailRoutes = require('./routes/quotes-email');
const quotesAIRoutes = require('./routes/quotes-ai');
const quotesWorkflowRoutes = require('./routes/quotes-workflow');
const quoteTemplatesRoutes = require('./routes/quote-templates');
const transcribeRoutes = require('./routes/transcribe');
app.use('/api/quotes', authenticateToken, quotesRoutes);
app.use('/api/quotes', authenticateToken, quotesEmailRoutes);
app.use('/api/quotes', authenticateToken, quotesAIRoutes);
app.use('/api/quotes', authenticateToken, quotesWorkflowRoutes);
app.use('/api/quote-templates', authenticateToken, quoteTemplatesRoutes);
app.use('/api/transcribe', authenticateToken, transcribeRoutes);

// Email intake routes
const emailIntakeRoutes = require('./routes/email-intake');
// Mount routes directly (webhook route is public, settings routes require auth)
app.use('/api/email-intake', emailIntakeRoutes);

/* ======================= Health & Version ======================== */
app.get('/health', (_req, res) => res.status(200).send('ok'));
app.get('/api/version', (_req, res) => {
  res.json({
    name: 'WorkTrackr Cloud',
    version: process.env.APP_VERSION || '1.0.0',
    env: process.env.NODE_ENV || 'development',
  });
});

/* =========================== Webhooks ============================ */
app.use('/webhooks', webhooksRoutes);

/* ========================== Cron Jobs ============================= */
app.use('/api/cron', cronRoutes);

/* ======================== STATIC + SPA =========================== */
const clientDistPath = path.join(__dirname, 'client', 'dist');

// 1) Cache hashed assets long-term
app.use(
  '/assets',
  express.static(path.join(clientDistPath, 'assets'), {
    maxAge: '1y',
    immutable: true,
  })
);

// 2) Other static — no cache
app.use(express.static(clientDistPath, { maxAge: '0' }));

/* -------------------- HARD GATE FOR /app/* ---------------------- */
function readUserFromRequest(req) {
  console.log('🔍 Checking user authentication for:', req.originalUrl);
  console.log('🍪 Available cookies:', req.cookies);
  
  const token = req.cookies.auth_token || req.cookies.jwt;
  console.log('🔑 Found token:', token ? `${token.substring(0, 20)}...` : 'NONE');
  
  if (!token) {
    console.log('❌ No token found in cookies');
    return null;
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified for user:', decoded.userId);
    return decoded;
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    return null;
  }
}

app.use('/app', (req, res, next) => {
  console.log('🚪 /app route accessed:', req.originalUrl);
  const user = readUserFromRequest(req);
  if (user) {
    console.log('✅ User authenticated, allowing access');
    return next();
  }
  console.log('❌ User not authenticated, redirecting to login');
  const dest = encodeURIComponent(req.originalUrl);
  return res.redirect(`/login?next=${dest}`);
});

/* 3) SPA entry — always serve index.html for non-API, non-/app (after gate) */
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).end();
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

/* ============================== Errors =========================== */
app.use((error, _req, res, _next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
  });
});

/* ============================= Start ============================= */
// Run database migrations before starting server
const { runMigrations } = require('./run-migrations');

async function startServer() {
  try {
    // Run migrations
    await runMigrations();
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 WorkTrackr Cloud server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Base URL: ${process.env.APP_BASE_URL || `http://localhost:${PORT}`}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
