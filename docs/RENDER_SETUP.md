# WorkTrackr Cloud - Render Deployment Setup

## Option A Configuration (Recommended)

### Web Service Settings

**Service Name:** `worktrackr-web`
**Repository:** `H6gvbhYujnhwP/worktrackr-app`
**Branch:** `main`

#### Build & Deploy Settings
- **Root Directory:** (blank - repo root)
- **Build Command:** `npm install && cd web/client && npm install && npm run build`
- **Start Command:** `npm start`

#### Environment Variables
```env
DATABASE_URL=postgresql://hhdsfyftt6655s:6KSdFEKqvAmGkL6o9cdDCgbMcR3Wt8ZJ@dpg-d321okripnbc73cqh27g-a.oregon-postgres.render.com/worktrackr?sslmode=require
NODE_ENV=production
APP_BASE_URL=https://worktrackr-web.onrender.com
JWT_SECRET=worktrackr-super-secret-jwt-key-2024
ALLOWED_HOSTS=worktrackr-web.onrender.com,localhost:3000
BOSS_SCHEMA=pgboss
STRIPE_SECRET_KEY=sk_live_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
PRICE_STARTER=price_1S6VQPLCgRgCwthBm1FfHzIu
PRICE_PRO=price_1S6VTkLCgRgCwthBYNGmAqA7
PRICE_ENTERPRISE=price_1S6W8GLCgRgCwthBHIt0Fahl
RESEND_API_KEY=re_ZdcYpwDq_88Q9Jp953HGmCcvunc6aBkyR
RESEND_FROM_EMAIL=support@worktrackr.cloud
```

### Worker Service Settings

**Service Name:** `worktrackr-worker`
**Repository:** `H6gvbhYujnhwP/worktrackr-app`
**Branch:** `main`

#### Build & Deploy Settings
- **Root Directory:** `worker`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

#### Environment Variables
```env
DATABASE_URL=postgresql://hhdsfyftt6655s:6KSdFEKqvAmGkL6o9cdDCgbMcR3Wt8ZJ@dpg-d321okripnbc73cqh27g-a.oregon-postgres.render.com/worktrackr?sslmode=require
NODE_ENV=production
APP_BASE_URL=https://worktrackr-web.onrender.com
BOSS_SCHEMA=pgboss
RESEND_API_KEY=re_ZdcYpwDq_88Q9Jp953HGmCcvunc6aBkyR
RESEND_FROM_EMAIL=support@worktrackr.cloud
```

### Database Service

**Service Name:** `worktrackr-db`
**Database:** `worktrackr`
**User:** `hhdsfyftt6655s`
**Plan:** Starter ($7/month)

## File Structure After Build

```
/opt/render/project/src/
├── package.json (root workspace)
├── web/
│   ├── server.js (Express API + static serving)
│   ├── package.json
│   └── client/
│       ├── package.json (React app)
│       ├── src/
│       └── dist/
│           ├── index.html ← Served by Express
│           └── assets/
├── worker/
│   ├── worker.js
│   └── package.json
└── shared/
    ├── db.js
    └── package.json
```

## Verification Commands

After deployment, verify in Render Shell:

```bash
# Check if React build exists
ls -la /opt/render/project/src/web/client/dist/

# Should see: index.html, assets/, favicon files

# Test health endpoint
curl http://localhost:3000/health

# Check environment
echo $DATABASE_URL
```

## Expected Results

- ✅ **Homepage:** React app with WorkTrackr branding
- ✅ **API:** All endpoints at `/api/*`
- ✅ **Static files:** Served from `/web/client/dist/`
- ✅ **Favicon:** WorkTrackr logo in browser tab
- ✅ **PWA:** Can be installed as app

