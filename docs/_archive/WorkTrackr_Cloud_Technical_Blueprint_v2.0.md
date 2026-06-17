

# WorkTrackr Cloud Technical Blueprint v2.0

**Author:** Manus AI
**Date:** 2025-10-27

## 1. Introduction

This document provides a comprehensive technical blueprint for the WorkTrackr Cloud application. It serves as a complete technical reference, detailing the system architecture, database schema, application workflows, and key integrations. This blueprint reflects the state of the application after the completion of Phase 1 (Stability & Trust), Phase 2 (Pricing & Billing), and Phase 3 (Power Features), incorporating all associated enhancements and functionalities.

## 2. System Architecture

The WorkTrackr Cloud application is built on a modern, robust technology stack designed for scalability, security, and maintainability. It follows a multi-tenant architecture to serve multiple customer organizations from a single, unified infrastructure.

### 2.1. Technology Stack

The core technologies used in the application are summarized in the table below:

| Component          | Technology                                       |
| ------------------ | ------------------------------------------------ |
| **Frontend**       | React 18, Vite, Tailwind CSS, shadcn/ui          |
| **Backend**        | Node.js, Express.js                              |
| **Database**       | PostgreSQL (with organization-based multi-tenancy) |
| **Authentication** | JWT with cookie-based sessions, bcrypt           |
| **Billing**        | Stripe (Subscriptions & Seat Add-ons)            |
| **Email**          | Nodemailer                                       |
| **2FA (TOTP)**     | `speakeasy` library                              |
| **Testing**        | Playwright (for end-to-end smoke tests)          |

### 2.2. Architectural Overview

The application is structured as a monorepo, which simplifies dependency management and code sharing. The key architectural components include:

- **Monorepo:** A single repository hosts the frontend, backend, and shared utility code.
- **Multi-Tenancy:** Data is logically separated on a per-organization basis within the PostgreSQL database, ensuring data isolation and security.
- **RESTful API:** The backend exposes a RESTful API with a `/api/` prefix for all client-server communication.
- **Protected Routes:** API routes are secured using a `authenticateToken` middleware, which validates JWTs from cookies.
- **Background Jobs:** A background worker process is planned for handling asynchronous tasks such as sending email notifications and processing webhooks.



## 3. Database Schema

The database schema is designed to support a multi-tenant architecture with clear separation of data between organizations. The following section provides a detailed overview of all tables and their relationships.

### 3.1. Complete Schema (SQL)

```sql
-- WorkTrackr Cloud Database Schema v2.0
-- Multi-tenant workflow and ticketing system with partner white-labeling

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Partners table (MSPs who manage multiple customer organizations)
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    support_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations (customer companies)
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
    -- Phase 2: Seat management fields
    plan VARCHAR(20) DEFAULT 'starter' CHECK (plan IN ('individual', 'starter', 'pro', 'enterprise')),
    included_seats INTEGER DEFAULT 5,
    stripe_seat_item_id TEXT, -- Stripe subscription item ID for seat add-ons
    active_user_count INTEGER DEFAULT 0, -- Cached count of active users
    seat_overage_cached INTEGER DEFAULT 0, -- Cached overage for quick UI rendering
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (staff, managers, partner admins)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    locale VARCHAR(10) DEFAULT 'en-GB',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_method VARCHAR(20) DEFAULT 'email' CHECK (mfa_method IN ('email', 'totp')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization memberships (user roles within organizations)
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'disabled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organisation_id, user_id)
);

-- Partner memberships (partner admin roles)
CREATE TABLE partner_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('partner_admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(partner_id, user_id)
);

-- Organization branding (white-label customization)
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

-- Organization domains (custom subdomains)
CREATE TABLE org_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    hostname VARCHAR(255) NOT NULL UNIQUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization add-ons (storage, SMS packs, etc.)
CREATE TABLE organisation_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    price_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket queues
CREATE TABLE queues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tickets
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    queue_id UUID REFERENCES queues(id),
    created_by UUID REFERENCES users(id),
    assignee_id UUID REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed', 'resolved')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket comments
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- File attachments
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

-- Inspections
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

-- Approvals
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

-- Workflows (JSON definitions)
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    definition JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MFA challenges (email codes)
CREATE TABLE mfa_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 3: TOTP 2FA secrets and backup codes
CREATE TABLE user_totp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    secret TEXT NOT NULL,
    backup_codes TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Phase 3: Notifications and user preferences
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL, -- e.g., 'ticket.assigned', 'comment.added'
    payload JSONB,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    -- e.g., 'ticket.assigned', 'comment.added'
    notification_type VARCHAR(100) NOT NULL,
    email_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organisation_id, notification_type)
);

-- Phase 3: Secure email unsubscribe tokens
CREATE TABLE unsubscribe_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Indexes for performance
CREATE INDEX idx_tickets_organisation_id ON tickets(organisation_id);
CREATE INDEX idx_tickets_assignee_id ON tickets(assignee_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_comments_ticket_id ON comments(ticket_id);
CREATE INDEX idx_attachments_ticket_id ON attachments(ticket_id);
CREATE INDEX idx_memberships_organisation_id ON memberships(organisation_id);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_organisations_partner_id ON organisations(partner_id);
CREATE INDEX idx_password_resets_token_hash ON password_resets(token_hash);
CREATE INDEX idx_password_resets_expires_at ON password_resets(expires_at);
CREATE INDEX idx_mfa_challenges_user_id ON mfa_challenges(user_id);
CREATE INDEX idx_mfa_challenges_expires_at ON mfa_challenges(expires_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_unsubscribe_tokens_token_hash ON unsubscribe_tokens(token_hash);

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organisations_updated_at BEFORE UPDATE ON organisations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_org_branding_updated_at BEFORE UPDATE ON org_branding FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

```



## 4. Authentication and Authorization

Authentication and authorization are critical components of the WorkTrackr Cloud application, ensuring that only authorized users can access their organization's data. The system employs a combination of JWTs, secure cookies, and robust multi-factor authentication (MFA) to protect user accounts.

### 4.1. Authentication Flow

The authentication process is designed to be both secure and user-friendly:

1.  **Login:** Users provide their email and password. The backend verifies the credentials against the hashed password stored in the `users` table.
2.  **JWT Creation:** Upon successful login, a JSON Web Token (JWT) is generated. The JWT contains the user's ID, role, and other relevant information. The token is signed with a secret key (`JWT_SECRET`) and has an expiration of 7 days.
3.  **Cookie-based Session:** The JWT is sent to the client and stored in a secure, HTTP-only cookie. This cookie is automatically included in all subsequent requests to the API.
4.  **MFA Challenge:** If the user has MFA enabled, they are prompted to enter a one-time password (OTP) from their email or authenticator app. The backend verifies the OTP before granting access.

### 4.2. Registration and Onboarding

New users can register for an account and create a new organization through the following process:

1.  **User Registration:** The user provides their name, email, and password.
2.  **Organization Creation:** The user also provides an organization name. A new organization is created in the `organisations` table.
3.  **Stripe Integration:** During signup, a new customer is created in Stripe, and a subscription is initiated based on the selected plan.
4.  **Membership:** A new record is created in the `memberships` table, linking the user to the new organization with the `admin` role.

### 4.3. Password Reset

Users who have forgotten their password can use the self-service password reset feature:

1.  **Request Reset:** The user enters their email address to request a password reset.
2.  **Token Generation:** A unique, single-use token is generated and stored in the `password_resets` table with an expiration time.
3.  **Email Notification:** An email containing a password reset link is sent to the user.
4.  **Password Update:** The user clicks the link, enters a new password, and the backend updates the `password_hash` in the `users` table.

### 4.4. Multi-Factor Authentication (MFA)

WorkTrackr Cloud supports two methods of MFA for enhanced security:

#### 4.4.1. Email-based 2FA

-   **Challenge:** When a user with email-based 2FA enabled logs in, a 6-digit code is generated and sent to their registered email address.
-   **Verification:** The user must enter this code to complete the login process. The code is stored in the `mfa_challenges` table and expires after 10 minutes.

#### 4.4.2. TOTP-based 2FA (Authenticator App)

-   **Setup:** Users can enable TOTP-based 2FA in their security settings. The backend generates a unique secret key using the `speakeasy` library, which is then displayed to the user as a QR code.
-   **Verification:** The user scans the QR code with an authenticator app (e.g., Google Authenticator, Authy). The app generates time-based one-time passwords (TOTPs) that the user must provide during login.
-   **Backup Codes:** A set of single-use backup codes is generated and provided to the user upon enabling TOTP. These codes can be used to access the account if the authenticator device is lost.
-   **Database Storage:** The TOTP secret and hashed backup codes are stored in the `user_totp` table.



## 5. Billing and Subscription Management

WorkTrackr Cloud uses Stripe to handle all aspects of billing and subscription management, providing a seamless and secure payment experience for customers.

### 5.1. Stripe Integration

The application is tightly integrated with Stripe to manage customer subscriptions, invoicing, and payments. The key aspects of the integration include:

-   **Stripe Customer Creation:** When a new organization is created, a corresponding customer object is created in Stripe.
-   **Subscription Management:** The application creates and manages Stripe subscriptions for each organization, based on their chosen plan.
-   **Webhooks:** The application uses Stripe webhooks to receive real-time notifications about subscription events, such as `checkout.session.completed`, `customer.subscription.updated`, and `invoice.payment_succeeded`. This ensures that the application's database is always in sync with Stripe.

### 5.2. Subscription Plans and Pricing

WorkTrackr Cloud offers a tiered pricing model to cater to the needs of different customers. The available plans are:

| Plan         | Price        | Included Users |
|--------------|--------------|----------------|
| **Individual** | £15/month    | 1              |
| **Starter**    | £49/month    | 5              |
| **Pro**        | £99/month    | 10             |
| **Enterprise** | Custom       | Custom         |

### 5.3. Seat Management

For the Starter, Pro, and Enterprise plans, customers can purchase additional user seats beyond the number included in their plan. The cost for each additional seat is £9/user/month. The application automatically calculates the number of additional seats and updates the Stripe subscription accordingly.



## 6. API Endpoint Documentation

The WorkTrackr Cloud API provides a comprehensive set of endpoints for interacting with the application. The following section details the available routes and their functionalities.

### 6.1. Authentication Routes (`/api/auth`)

| Method | Endpoint                  | Description                                                                 |
|--------|---------------------------|-----------------------------------------------------------------------------|
| POST   | `/login`                  | Authenticates a user and returns a JWT.                                     |
| POST   | `/register`               | Registers a new user and creates an organization.                           |
| POST   | `/start-signup`           | Initiates the Stripe checkout process for a new subscription.               |
| POST   | `/request-password-reset` | Sends a password reset link to the user's email.                            |
| POST   | `/reset-password`         | Resets the user's password using a valid reset token.                       |
| POST   | `/mfa/challenge`          | Sends an MFA challenge code to the user's email.                            |
| POST   | `/mfa/verify`             | Verifies the MFA code provided by the user.                                 |
| POST   | `/totp/setup`             | Generates a TOTP secret and QR code for the user to set up an authenticator app. |
| POST   | `/totp/verify`            | Verifies the TOTP code provided by the user.                                |

### 6.2. Billing Routes (`/api/billing`)

| Method | Endpoint                  | Description                                                                 |
|--------|---------------------------|-----------------------------------------------------------------------------|
| GET    | `/portal`                 | Redirects the user to the Stripe customer portal to manage their subscription. |
| POST   | `/update-seats`           | Updates the number of seats in the Stripe subscription.                     |

### 6.3. Organization Routes (`/api/organizations`)

| Method | Endpoint                  | Description                                                                 |
|--------|---------------------------|-----------------------------------------------------------------------------|
| GET    | `/`                       | Retrieves a list of all organizations.                                      |
| GET    | `/:id`                    | Retrieves a single organization by its ID.                                  |
| POST   | `/`                       | Creates a new organization.                                                 |
| PUT    | `/:id`                    | Updates an existing organization.                                           |
| DELETE | `/:id`                    | Deletes an organization.                                                    |

### 6.4. Ticket Routes (`/api/tickets`)

| Method | Endpoint                  | Description                                                                 |
|--------|---------------------------|-----------------------------------------------------------------------------|
| GET    | `/`                       | Retrieves a list of all tickets for the user's organization.                |
| GET    | `/:id`                    | Retrieves a single ticket by its ID.                                        |
| POST   | `/`                       | Creates a new ticket.                                                       |
| PUT    | `/:id`                    | Updates an existing ticket.                                                 |
| DELETE | `/:id`                    | Deletes a ticket.                                                           |

### 6.5. User Routes (`/api/user`)

| Method | Endpoint                  | Description                                                                 |
|--------|---------------------------|-----------------------------------------------------------------------------|
| GET    | `/`                       | Retrieves the currently authenticated user's profile.                       |
| PUT    | `/`                       | Updates the currently authenticated user's profile.                         |

### 6.6. Webhook Routes (`/webhooks`)

| Method | Endpoint                  | Description                                                                 |
|--------|---------------------------|-----------------------------------------------------------------------------|
| POST   | `/stripe`                 | Handles incoming webhooks from Stripe for subscription and payment events.   |



## 7. Power Features

Phase 3 of the WorkTrackr Cloud development introduced several powerful features designed to enhance security, provide valuable insights, and improve the user experience.

### 7.1. Advanced TOTP 2FA

As detailed in the Authentication and Authorization section, the application now supports Time-based One-Time Password (TOTP) two-factor authentication. This feature allows users to secure their accounts using an authenticator app, providing a higher level of security than email-based 2FA.

### 7.2. Reporting and Analytics

A comprehensive reporting system has been implemented to provide users with valuable insights into their team's performance and ticket trends. The reporting dashboard includes analytics and visualizations for:

-   **Ticket Volume:** Track the number of tickets created, resolved, and closed over time.
-   **SLA Metrics:** Monitor service level agreement (SLA) compliance and identify potential bottlenecks.
-   **Team Performance:** Analyze key metrics such as average response time, resolution time, and customer satisfaction.

### 7.3. CSV Exports

Users can now export their data to CSV format for further analysis or record-keeping. The export functionality supports:

-   **Tickets:** Export a complete list of tickets with all their associated data.
-   **Time Tracking:** Export time tracking data to monitor team productivity and billable hours.
-   **Billing Data:** Export billing history and invoices for accounting purposes.

### 7.4. Hardened Notifications

The notification system has been enhanced to provide users with timely and relevant updates. The key improvements include:

-   **Email Templates:** Professional HTML and text-based email templates have been created for all notification types, ensuring a consistent and professional appearance.
-   **Rate Limiting:** Rate limiting has been implemented on notification endpoints to prevent abuse and ensure system stability.
-   **Notification Preferences:** Users can customize their notification preferences to control which notifications they receive and how they receive them (email or in-app).
-   **Secure Unsubscribe:** A secure unsubscribe mechanism has been implemented to allow users to easily opt out of email notifications.



## 8. Frontend Architecture

The WorkTrackr Cloud frontend is a modern Single-Page Application (SPA) built with React and Vite. It is designed to be fast, responsive, and easy to maintain.

### 8.1. Component-Based Architecture

The frontend follows a component-based architecture, with the UI broken down into small, reusable components. This approach promotes code reuse, improves maintainability, and makes it easier to test individual parts of the application.

### 8.2. State Management

For managing application state, the frontend uses a combination of React's built-in state management features (e.g., `useState`, `useContext`) and custom hooks. This approach provides a lightweight and efficient way to manage state without introducing the complexity of a large state management library.

### 8.3. Routing

Client-side routing is handled by the `react-router-dom` library. This allows for seamless navigation between different parts of the application without requiring a full page reload.

### 8.4. UI Components

The application uses the `shadcn/ui` component library, which provides a set of beautifully designed and accessible UI components. These components are built on top of Tailwind CSS, allowing for easy customization and theming.



## 9. Deployment and Environment Configuration

The WorkTrackr Cloud application is designed to be deployed to a modern cloud platform such as Render. The following section provides an overview of the deployment process and environment configuration.

### 9.1. Production Environment

The production environment is hosted on Render, which provides a scalable and secure platform for running web applications. The environment consists of two main services:

-   **Web Service:** This service runs the Node.js/Express.js backend and serves the React frontend.
-   **Database Service:** This service runs the PostgreSQL database.

### 9.2. Environment Variables

The application uses environment variables to configure its behavior in different environments. The key environment variables include:

| Variable                  | Description                                                              |
| ------------------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`            | The connection string for the PostgreSQL database.                       |
| `JWT_SECRET`              | The secret key used to sign JWTs.                                        |
| `STRIPE_SECRET_KEY`       | The secret key for the Stripe API.                                       |
| `STRIPE_WEBHOOK_SECRET`   | The secret for verifying Stripe webhooks.                                |
| `APP_BASE_URL`            | The base URL of the application.                                         |
| `SMTP_HOST`               | The hostname of the SMTP server for sending emails.                      |

## 10. Conclusion

This technical blueprint provides a comprehensive overview of the WorkTrackr Cloud application, detailing its architecture, database schema, workflows, and key integrations. It serves as a valuable resource for developers, administrators, and other stakeholders involved in the project. The document will be regularly updated to reflect the latest changes and enhancements to the application.

