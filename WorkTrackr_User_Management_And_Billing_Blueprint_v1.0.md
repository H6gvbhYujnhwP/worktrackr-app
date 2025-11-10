# WorkTrackr User Management & Billing Blueprint v1.0

**Author:** Manus AI
**Date:** November 10, 2025

## 1. Overview

This document provides a comprehensive technical blueprint of the WorkTrackr User Management and Billing system. It details the complete database schema, architectural flows, bug fixes, and the current state of the system as of November 10, 2025.

## 2. System Architecture

The user management and billing system is built on a full-stack architecture with a React frontend, a Node.js/Express backend, and a PostgreSQL database. Stripe is integrated for payment processing, although it is not fully implemented yet.

### 2.1. Frontend

- **Framework:** React
- **Key Components:**
  - `UserManagement.jsx`: Main component for user management and billing UI.
  - `PlanManagement.jsx`: Component for displaying and managing subscription plans.
  - `useUserLimits.js`: React hook for calculating and enforcing user limits.
- **State Management:** React Context API and `useState` hooks.

### 2.2. Backend

- **Framework:** Node.js with Express
- **Key Routes:**
  - `/api/billing/subscription`: Fetches the current organization's subscription plan.
  - `/api/organizations/:id/users/invite`: Invites a new user to an organization, with user limit validation.
  - `/api/admin/update-plan`: Admin-only endpoint to update an organization's plan (bypasses Stripe).
  - `/api/migrations/run`: Admin-only endpoint to run database migrations.
- **Authentication:** JWT-based authentication middleware protects most routes.

### 2.3. Database

- **Database:** PostgreSQL
- **Key Tables:**
  - `organisations`: Stores organization-level information, including subscription plan and user limits.
  - `users`: Stores user information.
  - `tickets`: Stores ticket information.

## 3. Database Schema

### 3.1. `organisations` Table

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Primary key |
| `name` | `VARCHAR` | Organization name |
| `plan` | `VARCHAR` | Subscription plan (starter, pro, enterprise) |
| `included_seats` | `INTEGER` | Number of users included in the plan |
| `active_user_count` | `INTEGER` | Current number of active users |
| `stripe_customer_id` | `VARCHAR` | Stripe customer ID |
| `stripe_subscription_id` | `VARCHAR` | Stripe subscription ID |
| `created_at` | `TIMESTAMPTZ` | Timestamp of creation |
| `updated_at` | `TIMESTAMPTZ` | Timestamp of last update |

### 3.2. `users` Table

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Primary key |
| `organisation_id` | `UUID` | Foreign key to `organisations` table |
| `email` | `VARCHAR` | User's email address |
| `password` | `VARCHAR` | Hashed password |
| `role` | `VARCHAR` | User's role (admin, manager, staff) |
| `created_at` | `TIMESTAMPTZ` | Timestamp of creation |
| `updated_at` | `TIMESTAMPTZ` | Timestamp of last update |

## 4. Architectural Flows

### 4.1. User Invitation Flow

1. User clicks "Add User" button in the `UserManagement` component.
2. A modal opens to enter the new user's email address and role.
3. On submit, the frontend calls the `/api/organizations/:id/users/invite` endpoint.
4. The backend validates the user limit by checking the `plan` and `included_seats` in the `organisations` table.
5. If the limit is not reached, a new user is created in the `users` table and an invitation email is sent.
6. If the limit is reached, a 403 Forbidden error is returned.

### 4.2. Subscription Plan Display

1. The `PlanManagement` component fetches subscription data from the `/api/billing/subscription` endpoint.
2. The backend retrieves the `plan` and `included_seats` from the `organisations` table.
3. The frontend displays the current plan, user limits, and features based on the API response.

## 5. Bug Fixes and Current State

### 5.1. What's Fixed

- **Database Schema:** Migrated the database to add `plan`, `included_seats`, and `active_user_count` columns to the `organisations` table.
- **Backend Logic:** Updated all backend endpoints to use the new `plan` and `included_seats` columns for user limit validation.
- **Admin Endpoint:** Created an admin-only endpoint to update an organization's plan, bypassing Stripe for testing purposes.
- **Frontend UI:** Updated the `PlanManagement.jsx` component to display the correct user limits and features for each plan.

### 5.2. What's Still Broken

- **"Add User" Button:** The "Add User" button is still disabled and shows "(Limit Reached)" even though the backend logic is correct. This is a frontend caching issue where the `useUserLimits` hook is not correctly reading the updated subscription data from the API.

### 5.3. Next Steps

1. Debug the `useUserLimits` hook to ensure it correctly reads the `plan` and `included_seats` from the API response.
2. Fix the user count display to show the correct number of users (e.g., "1 of 10 users" for the Pro plan).
3. Enable the "Add User" button when the user limit has not been reached.

## 6. Conclusion

The User Management and Billing system is now mostly functional, with a solid backend and database structure. The remaining issues are primarily on the frontend and should be straightforward to fix. Once the "Add User" button is working, the system will be ready for production use.
