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
const authRoutes = require('./routes/auth');
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

// Security headers (CSP allows Stripe)
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      frameSrc: ["https://js.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://*.stripe.com"]
    },
  },
}));

// Rate limiting
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use('/webhooks', rateLimit({ windowMs: 60 * 1000, max: 60 }));

// Stripe raw body BEFORE JSON (signature verification)
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

// CORS
const allowedOrigins = (process.env.ALLOWED_HOSTS || 'localhost:3000')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    const ok = allowedOrigins.length === 0 || allowedOrigins.some(h => origin.includes(h));
    cb(ok ? null : new Error('Not allowed by CORS'), ok);
  },
  credentials: true,
}));

// Parsers (after Stripe raw)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Auth middleware (for protected APIs)
async function authenticateToken(req, res, next) {
  const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
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

/* ===== API FIRST ===== */
app.use('/api/public-auth', publicAuthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tickets', authenticateToken, ticketsRoutes);
app.use('/api/organizations', authenticateToken, organizationsRoutes);
// TEMP: open billing while testing; add auth later if you want
app.use('/api/billing', billingRoutes);

/* ===== Health & Version ===== */
app.get('/health', (_req, res) => res.status(200).send('ok'));
app.get('/api/version', (_req, res) => {
  res.json({
    name: 'WorkTrackr Cloud',
    version: process.env.APP_VERSION || '1.0.0',
    env: process.env.NODE_ENV || 'development'
  });
});

/* ===== Webhooks ===== */
app.use('/webhooks', webhooksRoutes);

/* ===== STATIC + SPA LAST ===== */
const clientDistPath = path.join(__dirname, 'client', 'dist');

// 1) Cache hashed assets long-term
app.use('/assets', express.static(path.join(clientDistPath, 'assets'), {
  maxAge: '1y',
  immutable: true
}));

// 2) Other static — no cache
app.use(express.static(clientDistPath, { maxAge: '0' }));

// 3) SPA entry — no-store
app.get('*', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Errors
app.use((error, _req, res, _next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WorkTrackr Cloud server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Base URL: ${process.env.APP_BASE_URL || `http://localhost:${PORT}`}`);
});

module.exports = app;
