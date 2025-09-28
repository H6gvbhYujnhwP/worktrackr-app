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

// Routes
const authRoutes = require('./routes/auth');                // includes /api/auth/stripe/webhook
const ticketsRoutes = require('./routes/tickets');
const organizationsRoutes = require('./routes/organizations');
const billingRoutes = require('./routes/billing');
const webhooksRoutes = require('./routes/webhooks');
const publicAuthRoutes = require('./routes/public-auth');

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
const allowedOrigins = (process.env.ALLOWED_HOSTS || 'localhost:3000,worktrackr.cloud')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

console.log('🌐 CORS allowed origins:', allowedOrigins);

app.use(
  cors({
    origin(origin, cb) {
      console.log('🔍 CORS check for origin:', origin);
      if (!origin) return cb(null, true);
      const ok = allowedOrigins.length === 0 || allowedOrigins.some((h) => origin.includes(h));
      console.log('✅ CORS result:', ok ? 'ALLOWED' : 'BLOCKED');
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
  const token = req.cookies.auth_token || req.cookies.jwt || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access token required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    const activeOrgId = req.headers['x-org-id'] || req.query.orgId;
    req.orgContext = await getOrgContext(decoded.userId, activeOrgId);
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/* ======================= API Routes ========================= */
app.use('/api/auth', authRoutes);
app.use('/api/auth', require('./routes/session')); // Session check endpoint
app.use('/api/tickets', authenticateToken, ticketsRoutes);
app.use('/api/organizations', authenticateToken, organizationsRoutes);

app.use('/api/billing', authenticateToken, billingRoutes);
app.use('/api/auth/user', require('./routes/user.js'));

/* ======================= Health & Version ======================== */
app.get('/health', (_req, res) => res.status(200).send('ok'));
app.get('/api/version', (_req, res) => {
  res.json({
    name: 'WorkTrackr Cloud',
    version: process.env.APP_VERSION || '1.0.0',
    env: process.env.NODE_ENV || 'development',
  });
});

/* ======================= Cookie Test Endpoint =================== */
app.get('/api/test-cookie', (_req, res) => {
  console.log('🧪 Testing cookie setting...');
  res.cookie('test_cookie', 'test_value', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60000,
    path: '/'
  });
  console.log('🍪 Test cookie set');
  console.log('📋 Response headers:', res.getHeaders());
  res.json({ message: 'Test cookie set', headers: res.getHeaders() });
});

/* =========================== Webhooks ============================ */
app.use('/webhooks', webhooksRoutes);

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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WorkTrackr Cloud server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Base URL: ${process.env.APP_BASE_URL || `http://localhost:${PORT}`}`);
});

module.exports = app;
