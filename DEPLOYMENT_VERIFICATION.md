# WorkTrackr Cloud - Deployment Verification Checklist

## ✅ 1. Route Order Fixed
- **Health check**: `/health` → 200 OK
- **API routes**: `/api/*` before static serving
- **Static files**: Served from `client/dist`
- **Catch-all**: `*` → SPA (after API routes)

## ✅ 2. Domain Environment Variables
Update in **both** Web and Worker services:

```env
APP_BASE_URL=https://worktrackr.cloud
ALLOWED_HOSTS=worktrackr.cloud,www.worktrackr.cloud,worktrackr-web.onrender.com
```

## ✅ 3. Render Configuration
- **Root Directory**: (blank - repo root)
- **Build Command**: `npm install && cd web/client && npm install && npm run build`
- **Start Command**: `npm start`

## 🧪 4. Post-Deploy Verification Commands

### A) Files Exist (Render Shell)
```bash
ls -la /opt/render/project/src/web/client/dist
# Expected: index.html + assets/
```

### B) Health + SPA + API Tests
```bash
# Health check
curl -I https://worktrackr.cloud/health
# Expected: 200 OK

# Homepage (SPA)
curl -I https://worktrackr.cloud/
# Expected: 200 OK (HTML)

# API endpoint
curl -s https://worktrackr.cloud/api/auth/status
# Expected: JSON response (not HTML)
```

### C) Catch-all Test
```bash
curl -I https://worktrackr.cloud/this-route-does-not-exist
# Expected: 200 OK (serves SPA index.html)
```

### D) Stripe Webhook Test
1. Go to Stripe Dashboard → Webhooks
2. Find endpoint: `https://worktrackr.cloud/webhooks/stripe`
3. Send test event: `checkout.session.completed`
4. Check Render logs for 200 response

## 🚨 Troubleshooting

### 404 for index.html
- **Issue**: Build didn't create dist where server expects
- **Fix**: Verify Build Command + Root Directory

### API returns HTML instead of JSON
- **Issue**: Catch-all route is above API routes
- **Fix**: Move catch-all below API routes (already fixed)

### Webhook signature error
- **Issue**: STRIPE_WEBHOOK_SECRET mismatch
- **Fix**: Verify secret matches Stripe dashboard

## ✅ Expected Final State

- **Homepage**: Beautiful WorkTrackr Cloud interface
- **API**: All endpoints respond with JSON
- **Health**: `/health` returns "ok"
- **Webhooks**: Stripe events processed correctly
- **Routing**: SPA handles all non-API routes
- **Static**: Assets served efficiently

## 🎯 Success Criteria

All these should work:
- ✅ `https://worktrackr.cloud/` → WorkTrackr homepage
- ✅ `https://worktrackr.cloud/health` → "ok"
- ✅ `https://worktrackr.cloud/api/auth/status` → JSON
- ✅ `https://worktrackr.cloud/any-spa-route` → SPA handles it
- ✅ Stripe webhook → 200 response in logs

