// web/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const jwt = require('jsonwebtoken');

// --- Routers (each exports an Express.Router) ---
const publicAuthRoutes = require('./routes/public-auth');
const billingRoutes = require('./routes/billing');
const webhooksRoutes = require('./routes/webhooks');

const app = express();
const PORT = process.env.PORT || 10000;

// Trust Render proxy (needed for HTTPS redirect + secure cookies)
app.set('trust proxy', 1);

// Force HTTPS in production (Render sets x-forwarded-proto)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
    }
    next();
  });
}

// Security headers (CSP allows Stripe)
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
        frameSrc: ["https://js.stripe.com"],
        connectSrc: ["'self'", "https://api.stripe.com", "https://*.stripe.com"],
      },
    },
    hsts: true,
  })
);

// Rate limiting
app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
  })
);
app.use(
  '/webhooks',
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
  })
);

// IMPORTANT: Stripe raw body BEFORE JSON parser (signature verification)
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

// CORS
const allowed = (process.env.ALLOWED_HOSTS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      const ok = allowed.length === 0 || allowed.some(host => origin.includes(host));
      cb(ok ? null : new Error('Not allowed by CORS'), ok);
    },
    credentials: true,
  })
);

// Parsers (after Stripe raw)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// --- API FIRST (as per plan) ---
app.use('/api/public-auth', publicAuthRoutes);
app.use('/api/billing', billingRoutes);

// Health + Version
app.get('/health', (_req, res) => res.status(200).send('ok'));
app.get('/api/version', (_req, res) => {
  res.json({
    name: 'WorkTrackr Cloud',
    version: process.env.APP_VERSION || '1.0.0',
    env: process.env.NODE_ENV || 'development',
  });
});

// Webhooks after API (Stripe route already mounted on /webhooks/stripe)
app.use('/webhooks', webhooksRoutes);

// --- STATIC + SPA LAST ---
const clientDist = path.join(__dirname, 'client', 'dist');

// 1) Long-cache hashed assets
app.use(
  '/assets',
  express.static(path.join(clientDist, 'assets'), { maxAge: '1y', immutable: true })
);

// 2) Other static, no cache
app.use(express.static(clientDist, { maxAge: '0' }));

// 3) SPA entry (no-store)
app.get('*', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Web listening on ${PORT}`);
  console.log(`🔗 Base: ${process.env.APP_BASE_URL || `http://localhost:${PORT}`}`);
});

module.exports = app;
