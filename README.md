# WorkTrackr Cloud

A customizable workflow and ticketing system designed for IT support providers, maintenance teams, and service organizations. Features multi-tenant architecture with partner white-labeling capabilities.

## Architecture

- **Frontend**: React/Next.js with role-aware dashboards
- **Backend**: Node.js/Express API with multi-tenant support
- **Worker**: Background job processing with pg-boss
- **Database**: PostgreSQL with multi-tenant schema
- **Payments**: Stripe subscriptions with GBP pricing
- **Email**: Mailgun for inbound ticket creation and notifications

## Features

- 🎫 **Ticket Management** - Create, assign, and track tickets
- 🔄 **Custom Workflows** - Build automated workflows with triggers and actions
- 👥 **Multi-Tenant** - Partner admins can manage multiple customer organizations
- 🎨 **White-Label** - Custom branding per organization
- 💳 **Billing** - Stripe integration with trials and add-ons
- 📧 **Email Integration** - Create tickets via email, automated notifications
- 🔐 **Role-Based Access** - Staff, Manager, Admin, and Partner Admin roles

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 2. Database Setup

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:migrate
```

### 3. Development

```bash
# Start web application (API + frontend)
npm run dev

# Start worker (in separate terminal)
npm run worker
```

### 4. Production Deployment

The application is designed to run on Render with the following services:

- **Web Service**: `npm start` (web directory)
- **Worker Service**: `npm start` (worker directory)  
- **PostgreSQL**: Managed database

## Environment Variables

### Required for Web & Worker

```env
DATABASE_URL=postgres://...
APP_BASE_URL=https://your-domain.com
JWT_SECRET=your-secret-key
MAILGUN_API_KEY=your-key
MAILGUN_DOMAIN=tickets.your-domain.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Stripe Price IDs

Create these products in your Stripe Dashboard:

- `PRICE_STARTER` - £29/month Starter plan
- `PRICE_PRO` - £99/month Pro plan  
- `PRICE_ENTERPRISE` - £299/month Enterprise plan
- `PRICE_STORAGE_100` - £10/month Storage add-on
- `PRICE_SMS250` - £10 SMS pack (250 texts)
- `PRICE_SMS1000` - £35 SMS pack (1000 texts)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Tickets
- `GET /api/tickets` - List tickets
- `POST /api/tickets` - Create ticket
- `GET /api/tickets/:id` - Get ticket details
- `PUT /api/tickets/:id` - Update ticket
- `POST /api/tickets/:id/comments` - Add comment

### Organizations
- `GET /api/organizations` - List organizations (partner admin)
- `GET /api/organizations/current` - Current organization details
- `GET /api/organizations/:id/branding` - Get branding
- `PUT /api/organizations/:id/branding` - Update branding

### Billing
- `POST /api/billing/checkout` - Create Stripe checkout
- `POST /api/billing/portal` - Create customer portal
- `GET /api/billing/status/:orgId` - Get billing status

### Webhooks
- `POST /webhooks/stripe` - Stripe webhook handler
- `POST /webhooks/mailgun-inbound` - Email-to-ticket creation

## Database Schema

The application uses a multi-tenant PostgreSQL schema with the following key tables:

- `partners` - MSP/Partner companies
- `organisations` - Customer organizations
- `users` - All system users
- `memberships` - User roles within organizations
- `tickets` - Support tickets
- `workflows` - Custom workflow definitions
- `org_branding` - White-label customization

## Deployment on Render

### 1. Create Services

1. **Web Service**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment: Add all required variables

2. **Worker Service**  
   - Build Command: `npm install`
   - Start Command: `npm run worker`
   - Environment: Same as web service

3. **PostgreSQL Database**
   - Create managed PostgreSQL instance
   - Note the DATABASE_URL

### 2. Configure Environment

Set all environment variables in both Web and Worker services.

### 3. Set up Webhooks

- **Stripe**: Point to `https://your-app.onrender.com/webhooks/stripe`
- **Mailgun**: Point to `https://your-app.onrender.com/webhooks/mailgun-inbound`

### 4. DNS Configuration

- Point your domain to Render
- Configure MX records for `tickets.your-domain.com` to Mailgun

## Development

### Project Structure

```
worktrackr-app/
├── web/                 # Express API + React frontend
│   ├── routes/         # API route handlers
│   ├── client/         # React frontend (to be created)
│   └── server.js       # Express server
├── worker/             # Background job processor
│   └── worker.js       # PgBoss worker
├── shared/             # Shared utilities
│   ├── db.js          # Database connection
│   └── scripts/       # Migration scripts
└── database/          # Database schema
    └── schema.sql     # PostgreSQL schema
```

### Adding New Features

1. **API Routes**: Add to `web/routes/`
2. **Background Jobs**: Add handlers to `worker/worker.js`
3. **Database Changes**: Update `database/schema.sql`
4. **Frontend**: Add React components to `web/client/`

## License

UNLICENSED - Proprietary software for WorkTrackr Cloud

