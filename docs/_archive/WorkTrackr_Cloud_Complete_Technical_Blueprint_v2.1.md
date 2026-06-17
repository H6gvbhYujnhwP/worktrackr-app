# WorkTrackr Cloud – Complete Technical Blueprint v2.1

**Author:** Manus AI  
**Date:** 2025-10-27  
**Status:** Production-Verified Schema

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Production Environment](#production-environment)
3. [Database Architecture](#database-architecture)
4. [Authentication & Authorization](#authentication--authorization)
5. [Billing & Subscription Management](#billing--subscription-management)
6. [API Endpoints](#api-endpoints)
7. [Frontend Architecture](#frontend-architecture)
8. [Deployment Configuration](#deployment-configuration)
9. [Security & Best Practices](#security--best-practices)
10. [Troubleshooting Guide](#troubleshooting-guide)

---

## 1. Executive Summary

WorkTrackr Cloud is a comprehensive SaaS ticket management and workflow automation platform designed for IT support, maintenance, and service organizations. The platform features multi-tenant architecture with MSP partner white-labeling capabilities, Stripe-powered billing, and customizable workflow automation.

### Key Features

- **Multi-tenant Architecture:** Organization-scoped data isolation
- **Role-based Access Control:** Admin, Manager, and Staff roles
- **Stripe Integration:** Subscription management with multiple pricing tiers
- **Workflow Automation:** JSON-based workflow definitions with triggers and actions
- **White-label Support:** Custom branding per organization
- **Ticket Management:** Full lifecycle tracking with comments, attachments, and approvals

---

## 2. Production Environment

### 2.1. Hosting Infrastructure

**Platform:** Render.com

#### Web Service: `worktrackr-web`
- **Service ID:** `srv-d321q3jipnbc73cqigvg`
- **Repository:** `H6gvbhYujnhwP/worktrackr-app`
- **Branch:** `main`
- **Public URL:** `https://worktrackr.cloud`
- **Internal Address:** `worktrackr-web:10000`
- **Protocol:** HTTP
- **Instance Type:** Starter
- **Runtime:** Node.js

#### Database Service: `worktrackr-db`
- **Service ID:** `dpg-d321okripnbc73cqh27g-a`
- **Type:** PostgreSQL 15
- **Instance:** Basic-256mb (256 MB RAM, 0.1 CPU, 15 GB Storage)
- **Region:** Oregon (US West)
- **Database Name:** `worktrackr`
- **Username:** `hhdsfyftt6655s`
- **Port:** 5432
- **Hostname:** `dpg-d321okripnbc73cqh27g-a`
- **Storage Used:** 0.67% of 15 GB
- **High Availability:** Disabled (Basic tier)

### 2.2. Environment Variables

The following environment variables are configured in the Render web service:

| Variable | Purpose | Example Value |
|----------|---------|---------------|
| `ALLOWED_HOSTS` | CORS allowed origins | `localhost:3000,worktrackr.cloud,localhost:10000` |
| `APP_BASE_URL` | Base URL for the application | `https://worktrackr.cloud` |
| `BOSS_SCHEMA` | pg-boss schema name | `pgboss` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host:5432/db?sslmode=require` |
| `JWT_SECRET` | Secret for JWT signing | (secure random string) |
| `MAILGUN_API_KEY` | Mailgun API key for emails | (API key) |
| `MAILGUN_BASE_URL` | Mailgun API base URL | `https://api.mailgun.net` |
| `MAILGUN_DOMAIN` | Mailgun sending domain | (domain) |
| `MAILGUN_SIGNING_KEY` | Mailgun webhook signing key | (signing key) |
| `NODE_ENV` | Environment mode | `production` |
| `PRICE_ADDITIONAL_SEATS` | Stripe price ID for extra seats | `price_xxx` |
| `PRICE_ENTERPRISE` | Stripe price ID for Enterprise plan | `price_xxx` |
| `PRICE_PRO` | Stripe price ID for Pro plan | `price_xxx` |
| `PRICE_STARTER` | Stripe price ID for Starter plan | `price_xxx` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe public key | `pk_live_xxx` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_live_xxx` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_xxx` |

### 2.3. Network Configuration

**Inbound IP Restrictions:**
- Source: `0.0.0.0/0` (everywhere)
- Description: Public access allowed

---

## 3. Database Architecture

### 3.1. Production Database Schema

The following schema represents the **actual production database** as verified on 2025-10-27.

#### 3.1.1. Core Tables

##### `users` Table
Stores user account information.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    locale VARCHAR(10) DEFAULT 'en-GB',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX users_email_key ON users(email);
```

**Columns:**
- `id`: Unique user identifier (UUID)
- `email`: User's email address (unique, used for login)
- `name`: User's full name
- `password_hash`: bcrypt-hashed password (cost factor 12)
- `locale`: User's preferred locale (default: en-GB)
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp

**Note:** The production schema does NOT include `mfa_enabled`, `mfa_method`, or `status` columns that appear in the GitHub repository.

##### `organisations` Table
Stores organization (tenant) information.

```sql
CREATE TABLE organisations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan_price_id TEXT,
    current_period_end TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    partner_id UUID REFERENCES partners(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_organisations_partner_id ON organisations(partner_id);

-- Triggers
CREATE TRIGGER update_organisations_updated_at 
    BEFORE UPDATE ON organisations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

**Columns:**
- `id`: Unique organization identifier
- `name`: Organization name
- `stripe_customer_id`: Stripe customer ID for billing
- `stripe_subscription_id`: Active Stripe subscription ID
- `plan_price_id`: Current plan's Stripe price ID
- `current_period_end`: Subscription period end date
- `trial_start`: Trial period start date
- `trial_end`: Trial period end date
- `partner_id`: Reference to MSP partner (if applicable)

**Note:** The production schema does NOT include Phase 2 seat management fields (`plan`, `included_seats`, `stripe_seat_item_id`, `active_user_count`, `seat_overage_cached`).

##### `memberships` Table
Links users to organizations with role assignments.

```sql
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organisation_id, user_id)
);

-- Indexes
CREATE INDEX idx_memberships_organisation_id ON memberships(organisation_id);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE UNIQUE INDEX memberships_organisation_id_user_id_key 
    ON memberships(organisation_id, user_id);
```

**Columns:**
- `id`: Unique membership identifier
- `organisation_id`: Organization reference
- `user_id`: User reference
- `role`: User's role within the organization (admin, manager, or staff)
- `created_at`: Membership creation timestamp

**Role Definitions:**
- **admin**: Full access to organization settings, billing, user management, and all features
- **manager**: Access to ticket management, workflows, and reports
- **staff**: Limited access to assigned tickets only

**Note:** The production schema does NOT include a `status` column.

##### `partners` Table
Stores MSP partner information for white-label deployments.

```sql
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    support_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

##### `partner_memberships` Table
Links users to partner organizations with partner admin roles.

```sql
CREATE TABLE partner_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('partner_admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(partner_id, user_id)
);
```

#### 3.1.2. Ticket Management Tables

##### `tickets` Table
Core ticket tracking.

```sql
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    queue_id UUID REFERENCES queues(id),
    created_by UUID REFERENCES users(id),
    assignee_id UUID REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open' 
        CHECK (status IN ('open', 'pending', 'closed', 'resolved')),
    priority VARCHAR(50) DEFAULT 'medium' 
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tickets_organisation_id ON tickets(organisation_id);
CREATE INDEX idx_tickets_assignee_id ON tickets(assignee_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
```

##### `queues` Table
Ticket queue organization.

```sql
CREATE TABLE queues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

##### `comments` Table
Ticket comments and communication.

```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_comments_ticket_id ON comments(ticket_id);
```

##### `attachments` Table
File attachments for tickets.

```sql
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES users(id),
    file_url TEXT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    size_bytes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_attachments_ticket_id ON attachments(ticket_id);
```

#### 3.1.3. Workflow & Approval Tables

##### `workflows` Table
JSON-based workflow definitions.

```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    definition JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Workflow Definition Structure:**
```json
{
  "triggers": [
    {
      "type": "ticket.created",
      "conditions": [
        {"field": "priority", "operator": "equals", "value": "urgent"}
      ]
    }
  ],
  "actions": [
    {
      "type": "assign",
      "target": "user_id_here"
    },
    {
      "type": "send_email",
      "to": "admin@example.com",
      "template": "urgent_ticket"
    }
  ]
}
```

##### `approvals` Table
Approval requests and decisions.

```sql
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id),
    approver_id UUID REFERENCES users(id),
    decision VARCHAR(50) CHECK (decision IN ('pending', 'approved', 'rejected')),
    reason TEXT,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

##### `inspections` Table
Technical inspection records.

```sql
CREATE TABLE inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    inspector_id UUID NOT NULL REFERENCES users(id),
    summary TEXT,
    cause TEXT,
    recommendation TEXT,
    estimated_hours DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.1.4. Branding & Customization Tables

##### `org_branding` Table
White-label branding customization.

```sql
CREATE TABLE org_branding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#0ea5e9',
    accent_color VARCHAR(7) DEFAULT '#22c55e',
    email_from_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organisation_id)
);
```

##### `org_domains` Table
Custom domain management.

```sql
CREATE TABLE org_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    hostname VARCHAR(255) NOT NULL UNIQUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

##### `organisation_addons` Table
Additional purchased features.

```sql
CREATE TABLE organisation_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    price_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.1.5. System Tables

##### `notifications` Table
System notifications and alerts.

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    payload JSONB,
    status VARCHAR(50) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'sent', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

##### `checkout_sessions` Table
Stripe checkout session tracking.

```sql
CREATE TABLE checkout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL UNIQUE,
    user_email TEXT NOT NULL,
    organisation_name TEXT NOT NULL,
    price_id TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
```

### 3.2. Database Functions and Triggers

#### Update Timestamp Function

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';
```

This function is used by triggers on multiple tables to automatically update the `updated_at` timestamp.

### 3.3. Complete Table List

The production database contains **17 tables**:

1. `approvals`
2. `attachments`
3. `checkout_sessions`
4. `comments`
5. `inspections`
6. `memberships`
7. `notifications`
8. `org_branding`
9. `org_domains`
10. `organisation_addons`
11. `organisations`
12. `partner_memberships`
13. `partners`
14. `queues`
15. `tickets`
16. `users`
17. `workflows`

---

## 4. Authentication & Authorization

### 4.1. Authentication Flow

WorkTrackr Cloud uses JWT (JSON Web Token) based authentication with secure HTTP-only cookies.

#### Login Process

1. **User submits credentials** (`POST /api/auth/login`)
   - Email and password sent to backend
   
2. **Password verification**
   - Backend retrieves user by email
   - Compares submitted password with stored bcrypt hash using `bcrypt.compare()`
   
3. **JWT generation**
   - On successful verification, JWT is created with payload:
     ```javascript
     {
       userId: user.id,
       email: user.email,
       name: user.name,
       iat: timestamp,
       exp: timestamp + 7days
     }
     ```
   - Signed with `JWT_SECRET` environment variable
   - Expiration: 7 days
   
4. **Cookie storage**
   - JWT sent to client in HTTP-only, secure cookie
   - Cookie name: `token`
   - Flags: `httpOnly: true`, `secure: true` (production), `sameSite: 'strict'`

5. **Session establishment**
   - Client automatically includes cookie in subsequent requests
   - Backend middleware validates JWT on protected routes

#### Registration Process

1. **User submits registration** (`POST /api/auth/register`)
   - Email, name, password, organization name
   
2. **Password hashing**
   - Password hashed using bcrypt with cost factor 12
   - Example: `bcrypt.hash(password, 12)`
   
3. **User creation**
   - New record inserted into `users` table
   
4. **Organization creation**
   - New record inserted into `organisations` table
   
5. **Membership creation**
   - New record in `memberships` table linking user to organization
   - Role set to `admin` for organization creator
   
6. **Stripe customer creation** (if applicable)
   - Stripe customer created via API
   - `stripe_customer_id` stored in `organisations` table

### 4.2. Authorization Model

#### Role Hierarchy

| Role | Access Level | Capabilities |
|------|--------------|--------------|
| **admin** | Full organization access | User management, billing, settings, workflows, tickets, reports |
| **manager** | Operational access | Workflows, tickets, reports, team management |
| **staff** | Limited access | View and update assigned tickets only |
| **partner_admin** | Multi-org access | Manage multiple customer organizations |

#### Permission Enforcement

Permissions are enforced through:

1. **JWT Middleware** (`authenticateToken`)
   - Validates JWT signature
   - Extracts user information
   - Attaches to `req.user`

2. **Organization Scoping**
   - All queries include `organisation_id` filter
   - Prevents cross-tenant data access
   - Example:
     ```javascript
     const tickets = await query(
       'SELECT * FROM tickets WHERE organisation_id = $1',
       [req.user.organisationId]
     );
     ```

3. **Role Checks**
   - Middleware functions check `req.user.role`
   - Admin-only routes protected with role validation
   - Example:
     ```javascript
     function requireAdmin(req, res, next) {
       if (req.user.role !== 'admin') {
         return res.status(403).json({ error: 'Admin access required' });
       }
       next();
     }
     ```

### 4.3. Password Management

#### Password Requirements

- Minimum length: 8 characters
- Hashing algorithm: bcrypt
- Cost factor: 12
- No maximum length (bcrypt handles truncation)

#### Password Reset Flow

1. **Request reset** (`POST /api/auth/request-password-reset`)
   - User provides email
   - System generates secure token
   - Token stored in `password_resets` table (if implemented)
   - Email sent with reset link

2. **Reset password** (`POST /api/auth/reset-password`)
   - User clicks link with token
   - Submits new password
   - Token validated and marked as used
   - Password hash updated in `users` table

#### Creating Test Accounts

To create a test account with a known password:

```bash
# Generate bcrypt hash
node -e 'const bcrypt = require("bcrypt"); bcrypt.hash("YourPassword123!", 12).then(hash => console.log(hash));'

# Insert user with hash
psql $DATABASE_URL -c "INSERT INTO users (email, name, password_hash, locale) VALUES ('test@example.com', 'Test User', 'HASH_HERE', 'en-GB');"

# Create admin membership
psql $DATABASE_URL -c "INSERT INTO memberships (organisation_id, user_id, role) VALUES ('ORG_ID', (SELECT id FROM users WHERE email = 'test@example.com'), 'admin');"
```

---

## 5. Billing & Subscription Management

### 5.1. Stripe Integration

WorkTrackr Cloud uses Stripe for all billing operations.

#### Subscription Plans

| Plan | Price | Description |
|------|-------|-------------|
| **Starter** | £49/month | Small teams (5 users included) |
| **Pro** | £99/month | Growing teams (10 users included) |
| **Enterprise** | Custom | Large organizations (custom pricing) |

**Note:** The Individual plan (£15/month for 1 user) appears in the GitHub code but may not be active in production.

#### Stripe Price IDs

Configured via environment variables:
- `PRICE_STARTER`: Starter plan price ID
- `PRICE_PRO`: Pro plan price ID
- `PRICE_ENTERPRISE`: Enterprise plan price ID
- `PRICE_ADDITIONAL_SEATS`: Additional seat add-on price ID

### 5.2. Subscription Workflow

#### New Subscription

1. **User selects plan** (on pricing page)
2. **Checkout session created** (`POST /api/auth/start-signup`)
   - Stripe checkout session created via API
   - Session ID stored in `checkout_sessions` table
   - User redirected to Stripe Checkout
3. **Payment processed** (by Stripe)
4. **Webhook received** (`POST /webhooks/stripe`)
   - Event: `checkout.session.completed`
   - Organization updated with subscription details
   - `stripe_customer_id` and `stripe_subscription_id` stored
5. **User redirected** to application
6. **Subscription active**

#### Subscription Updates

Managed through Stripe Customer Portal:
- Plan upgrades/downgrades
- Payment method updates
- Billing history
- Invoice downloads

Access via: `GET /api/billing/portal`

### 5.3. Webhook Events

The application handles the following Stripe webhook events:

| Event | Handler Action |
|-------|----------------|
| `checkout.session.completed` | Create/update organization with subscription details |
| `customer.subscription.updated` | Update subscription status and period end |
| `customer.subscription.deleted` | Mark subscription as cancelled |
| `invoice.payment_succeeded` | Update payment status |
| `invoice.payment_failed` | Send payment failure notification |

Webhook endpoint: `POST /webhooks/stripe`

Webhook signature verification using `STRIPE_WEBHOOK_SECRET`.

---

## 6. API Endpoints

### 6.1. Authentication Routes

**Base Path:** `/api/auth`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/login` | User login | No |
| POST | `/register` | User registration | No |
| POST | `/start-signup` | Initiate Stripe checkout | No |
| POST | `/request-password-reset` | Request password reset | No |
| POST | `/reset-password` | Reset password with token | No |
| GET | `/session` | Get current session | Yes |
| POST | `/logout` | Logout user | Yes |

### 6.2. Billing Routes

**Base Path:** `/api/billing`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/portal` | Redirect to Stripe portal | Yes (Admin) |
| GET | `/subscription` | Get current subscription | Yes (Admin) |
| POST | `/update-seats` | Update seat count | Yes (Admin) |

### 6.3. Organization Routes

**Base Path:** `/api/organizations`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | List organizations | Yes (Partner Admin) |
| GET | `/:id` | Get organization details | Yes |
| PUT | `/:id` | Update organization | Yes (Admin) |
| POST | `/` | Create organization | Yes (Partner Admin) |

### 6.4. User Routes

**Base Path:** `/api/user`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get current user profile | Yes |
| PUT | `/` | Update user profile | Yes |
| GET | `/members` | List organization members | Yes (Admin) |
| POST | `/members` | Invite new member | Yes (Admin) |
| DELETE | `/members/:id` | Remove member | Yes (Admin) |

### 6.5. Ticket Routes

**Base Path:** `/api/tickets`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | List tickets | Yes |
| GET | `/:id` | Get ticket details | Yes |
| POST | `/` | Create ticket | Yes |
| PUT | `/:id` | Update ticket | Yes |
| DELETE | `/:id` | Delete ticket | Yes (Admin) |
| POST | `/:id/comments` | Add comment | Yes |
| POST | `/:id/attachments` | Upload attachment | Yes |

### 6.6. Webhook Routes

**Base Path:** `/webhooks`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/stripe` | Stripe webhook handler | No (signature verified) |

---

## 7. Frontend Architecture

### 7.1. Technology Stack

- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Routing:** React Router
- **State Management:** React Context + Hooks

### 7.2. Project Structure

```
web/client/
├── src/
│   ├── app/
│   │   └── src/
│   │       ├── components/     # React components
│   │       │   ├── Dashboard.jsx
│   │       │   ├── Tickets.jsx
│   │       │   ├── UserManagement.jsx
│   │       │   ├── PlanManagement.jsx
│   │       │   └── ui/         # shadcn/ui components
│   │       ├── App.jsx
│   │       └── main.jsx
│   ├── Login.jsx
│   ├── SignUp.jsx
│   ├── Pricing.jsx
│   └── main.jsx
├── public/
└── package.json
```

### 7.3. Key Components

#### Dashboard
- Main application view after login
- Displays ticket summary, recent activity
- Role-based navigation menu

#### Tickets
- Ticket list with filtering and sorting
- Ticket detail view with comments and attachments
- Create/edit ticket forms

#### UserManagement
- List organization members
- Invite new users
- Manage roles and permissions
- Admin only

#### PlanManagement
- Display current subscription plan
- Link to Stripe Customer Portal
- Seat usage visualization
- Admin only

---

## 8. Deployment Configuration

### 8.1. Build Process

**Build Command:**
```bash
npm ci --include=dev && cd web/client && npm ci --include=dev && npm run build
```

**Start Command:**
```bash
npm start
```

### 8.2. Server Configuration

The Express server (`web/server.js`) is configured with:

1. **Security Headers** (Helmet)
   - Content Security Policy
   - XSS Protection
   - Frame Options

2. **CORS Configuration**
   - Allowed origins from `ALLOWED_HOSTS` env var
   - Credentials enabled for cookie-based auth

3. **Rate Limiting**
   - API routes: 200 requests per 15 minutes
   - Webhooks: 60 requests per minute

4. **Route Order** (critical for SPA)
   ```javascript
   app.use('/api', apiRouter);           // API routes first
   app.get('/health', healthCheck);      // Health check
   app.use(express.static(clientDist));  // Static files
   app.get('*', serveSPA);               // SPA fallback
   ```

### 8.3. Database Connection

Connection string format:
```
postgres://username:password@hostname:port/database?sslmode=require
```

**Important:** SSL mode is required for Render PostgreSQL connections.

### 8.4. Health Check

Endpoint: `GET /health`

Returns: `200 OK` with body `"ok"`

Used by Render for service health monitoring.

---

## 9. Security & Best Practices

### 9.1. Security Measures

1. **Password Security**
   - bcrypt hashing with cost factor 12
   - No plaintext storage
   - Secure password reset flow

2. **Session Security**
   - HTTP-only cookies
   - Secure flag in production
   - SameSite strict policy
   - 7-day expiration

3. **API Security**
   - JWT signature verification
   - Rate limiting on all endpoints
   - CORS restrictions
   - Helmet security headers

4. **Database Security**
   - SSL/TLS required connections
   - Parameterized queries (prevents SQL injection)
   - Organization-scoped queries (multi-tenant isolation)
   - Cascade deletes for data integrity

5. **Webhook Security**
   - Stripe signature verification
   - Raw body parsing for signature validation
   - Idempotency handling

### 9.2. Data Isolation

Multi-tenant data isolation is enforced through:

1. **Query Scoping**
   - All queries include `organisation_id` filter
   - Middleware extracts org from user session
   - No cross-tenant data leakage

2. **Foreign Key Constraints**
   - Cascade deletes ensure referential integrity
   - Orphaned records prevented

3. **Index Optimization**
   - `organisation_id` indexed on all tenant-scoped tables
   - Query performance maintained at scale

---

## 10. Troubleshooting Guide

### 10.1. Common Issues

#### Issue: "Invalid credentials" on login

**Cause:** Password hash mismatch or user not found

**Solution:**
```bash
# Reset password for user
node -e 'const bcrypt = require("bcrypt"); bcrypt.hash("NewPassword123!", 12).then(hash => console.log(hash));'

psql $DATABASE_URL -c "UPDATE users SET password_hash = 'HASH_HERE' WHERE email = 'user@example.com';"
```

#### Issue: User logged in but no admin features visible

**Cause:** User has no membership or wrong role

**Solution:**
```bash
# Check memberships
psql $DATABASE_URL -c "SELECT * FROM memberships WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com');"

# Create admin membership
psql $DATABASE_URL -c "INSERT INTO memberships (organisation_id, user_id, role) VALUES ('ORG_ID', (SELECT id FROM users WHERE email = 'user@example.com'), 'admin');"
```

#### Issue: Database connection fails

**Cause:** Missing SSL mode or incorrect connection string

**Solution:**
- Ensure `DATABASE_URL` includes `?sslmode=require`
- Verify credentials in Render dashboard
- Check database service is running

#### Issue: Stripe webhooks not working

**Cause:** Webhook secret mismatch or signature verification failure

**Solution:**
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Check webhook endpoint is publicly accessible
- Review webhook logs in Stripe dashboard

### 10.2. Useful Database Queries

#### List all users and their organizations
```sql
SELECT 
    u.email, 
    u.name, 
    m.role, 
    o.name as org_name
FROM users u
LEFT JOIN memberships m ON u.id = m.user_id
LEFT JOIN organisations o ON m.organisation_id = o.id
ORDER BY u.created_at DESC;
```

#### Find users without memberships
```sql
SELECT u.email, u.name
FROM users u
LEFT JOIN memberships m ON u.id = m.user_id
WHERE m.id IS NULL;
```

#### Check subscription status
```sql
SELECT 
    o.name,
    o.stripe_subscription_id,
    o.current_period_end,
    o.trial_end
FROM organisations o
WHERE o.stripe_subscription_id IS NOT NULL;
```

#### Count tickets by status
```sql
SELECT 
    o.name as organization,
    t.status,
    COUNT(*) as count
FROM tickets t
JOIN organisations o ON t.organisation_id = o.id
GROUP BY o.name, t.status
ORDER BY o.name, t.status;
```

### 10.3. Production Schema vs GitHub Schema Differences

**Important:** The production database schema differs from the GitHub repository in several key areas:

| Feature | GitHub Schema | Production Schema |
|---------|---------------|-------------------|
| `users.mfa_enabled` | ✅ Present | ❌ Missing |
| `users.mfa_method` | ✅ Present | ❌ Missing |
| `users.status` | ✅ Present | ❌ Missing |
| `memberships.status` | ✅ Present | ❌ Missing |
| `organisations.plan` | ✅ Present | ❌ Missing |
| `organisations.included_seats` | ✅ Present | ❌ Missing |
| `organisations.stripe_seat_item_id` | ✅ Present | ❌ Missing |
| `password_resets` table | ✅ Present | ❓ Unknown |
| `mfa_challenges` table | ✅ Present | ❓ Unknown |
| `user_totp` table | ✅ Present | ❓ Unknown |
| `notification_preferences` table | ✅ Present | ❓ Unknown |
| `unsubscribe_tokens` table | ✅ Present | ❓ Unknown |

**Recommendation:** Run a database migration to sync production with the latest schema from GitHub.

---

## Appendix A: Complete Schema Export

To export the complete production schema:

```bash
pg_dump $DATABASE_URL --schema-only > worktrackr_schema.sql
```

To export data with schema:

```bash
pg_dump $DATABASE_URL > worktrackr_full_backup.sql
```

---

## Appendix B: Environment Variable Template

```bash
# Application
NODE_ENV=production
APP_BASE_URL=https://worktrackr.cloud
ALLOWED_HOSTS=worktrackr.cloud,localhost:10000
JWT_SECRET=your-secure-random-string-here

# Database
DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=require
BOSS_SCHEMA=pgboss

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
PRICE_STARTER=price_xxx
PRICE_PRO=price_xxx
PRICE_ENTERPRISE=price_xxx
PRICE_ADDITIONAL_SEATS=price_xxx

# Email (Mailgun)
MAILGUN_API_KEY=xxx
MAILGUN_DOMAIN=mg.example.com
MAILGUN_BASE_URL=https://api.mailgun.net
MAILGUN_SIGNING_KEY=xxx
```

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.0 | 2025-10-27 | Manus AI | Initial comprehensive blueprint |
| 2.1 | 2025-10-27 | Manus AI | Updated with production-verified schema, Render configuration, and troubleshooting guide |

---

**End of Document**

