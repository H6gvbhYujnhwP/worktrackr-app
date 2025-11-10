# WorkTrackr Cloud: Master Technical Blueprint

**Version:** 5.0  
**Date:** November 10, 2025  
**Author:** Manus AI

**Purpose:** This document is the single source of truth for the complete technical architecture, database schema, and system design of the WorkTrackr Cloud platform. It consolidates all prior architecture documents and incorporates all knowledge gained during development and debugging.

---

## 1. System Architecture Overview

WorkTrackr Cloud is a multi-tenant SaaS platform built on a classic **three-tier architecture**, ensuring a clear separation of concerns between the presentation, application, and data layers.

```mermaid
graph TD
    A[Presentation Layer<br>(React Frontend)] -->|REST API<br>(HTTPS/JSON)| B(Application Layer<br>(Node.js/Express Backend));
    B -->|SQL Queries| C(Data Layer<br>(PostgreSQL Database));

    subgraph A
        direction LR
        A1[Dashboard] --~ A2[Tickets];
        A2 --~ A3[CRM];
        A3 --~ A4[Calendar];
    end

    subgraph B
        direction LR
        B1[Authentication] --~ B2[Business Logic];
        B2 --~ B3[API Endpoints];
        B3 --~ B4[Integrations];
    end

    subgraph C
        direction LR
        C1[Core Tables<br>organisations, users] --~ C2[Ticket Tables<br>tickets, comments];
        C2 --~ C3[CRM Tables<br>customers, quotes, jobs];
        C3 --~ C4[Email Intake<br>channels, logs];
    end
```

---

## 2. Technology Stack

| Layer      | Technology        | Details                                                                                             |
| :--------- | :---------------- | :-------------------------------------------------------------------------------------------------- |
| **Frontend** | React 18.2        | Vite, React Router, Tailwind CSS, shadcn/ui, Lucide Icons, Axios                                    |
| **Backend**  | Node.js 22.x      | Express.js, pg (PostgreSQL client), jsonwebtoken, bcrypt, Zod (validation)                        |
| **Database** | PostgreSQL 15     | `uuid-ossp`, `pgcrypto`, and `pg_trgm` extensions enabled                                           |
| **Infra**    | Render            | Managed PostgreSQL, Web Service (Node.js), Static Site (React)                                    |
| **Email**    | Resend            | Used for both transactional emails and the email intake webhook system                            |
| **Payments** | Stripe            | Subscription management, seat-based billing, and one-off invoice payments                       |

---

## 3. API Architecture

### 3.1. Design Principles

- **RESTful & Resource-Oriented:** URLs are based on resources (e.g., `/api/tickets/:id`).
- **Stateless:** Authentication is handled via JWT, not server-side sessions.
- **JSON Payloads:** All data is exchanged as `application/json`.
- **Multi-Tenant Safe:** All database queries are strictly scoped by `organisation_id` via the `authenticateToken` middleware.

### 3.2. Key Endpoints

| Method | Endpoint | Description | Authentication |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tickets` | List all tickets for the organization | JWT Required |
| `POST` | `/api/tickets` | Create a new ticket | JWT Required |
| `PUT` | `/api/tickets/bulk` | Bulk update tickets (status, priority, assignee) | JWT Required |
| `GET` | `/api/tickets/users/list` | List all users in the organization | JWT Required |
| `POST`| `/api/public-auth/login` | Log in a user and get a JWT | Public |
| `POST`| `/api/email-intake/webhook` | Receive incoming emails from Resend | Public (Webhook) |

### 3.3. Critical Lesson: Route Ordering

A critical bug was discovered where a generic route (`/:id`) was defined before a specific route (`/bulk`). This caused the generic route to incorrectly intercept requests meant for the specific one.

**Rule:** In Express.js, **always define specific routes before generic/parameterized routes** to ensure correct routing.

```javascript
// CORRECT ROUTE ORDER
router.put("/bulk", ...); // Specific route first
router.get("/:id", ...);  // Generic route after
```

---

## 4. Frontend Architecture

### 4.1. State Management

- **Global State:** React Context is used for global state management (`SimulationProvider`, `AuthProvider`).
- **Data Fetching:** Data is fetched on component mount using `useEffect` and `async/await` with API clients (`TicketsAPI`, `UsersAPI`).
- **Data Loading Pattern:**
    - Real data is fetched from the API on initial load.
    - If the API call fails, the application falls back to mock data to ensure it remains usable.

### 4.2. Key Code Patterns

- **Uncontrolled Components:** Direct DOM event listeners are used as a fallback when React's synthetic event system fails (e.g., the status dropdown fix).
- **API Clients:** A dedicated `api.ts` file centralizes all API interactions, providing a clean separation of concerns.

---

## 5. Database Architecture

### 5.1. Schema Overview

The database uses a standard relational model with UUIDs as primary keys. Multi-tenancy is enforced by requiring an `organisation_id` on all major tables.

### 5.2. Key Tables

- **`organisations`**: Stores information about each tenant.
- **`users`**: Stores user accounts.
- **`memberships`**: Links users to organizations with a specific role.
- **`tickets`**: The core table for the ticket system.
- **`queues`**: **Currently unused.** Intended for custom ticket queues.

### 5.3. Foreign Key Relationships

- `tickets.assignee_id` references `users.id`.
- `tickets.organisation_id` references `organisations.id`.
- `memberships.user_id` references `users.id`.
- `memberships.organisation_id` references `organisations.id`.

---

## 6. Security Architecture

### 6.1. Authentication

- **JWT-Based:** Authentication is handled via JSON Web Tokens (JWTs) stored in secure, httpOnly cookies.
- **Password Hashing:** User passwords are hashed using `bcrypt` before being stored in the database.

### 6.2. Authorization & Multi-Tenancy

- **`authenticateToken` Middleware:** This middleware is the cornerstone of the system's security. It runs on every authenticated API route and performs the following:
    1. Verifies the JWT from the cookie.
    2. Fetches the user and their organization from the database.
    3. Attaches `req.user` and `req.orgContext` to the request.
- **Data Isolation:** All database queries are strictly scoped by `organisation_id` from `req.orgContext`, ensuring that one organization can never access another organization's data.

---

## 7. Known Issues & Technical Debt

- **"Add User" Button Broken:** The "Add User" button in the user management screen is not functional. This is a high-priority bug that prevents testing of multi-user features.
- **"My Tickets" Filter Untested:** The "My Tickets" queue needs to be verified now that the assignment system is fixed.
- **Unused `queues` Table:** The `queues` table is not currently used. The system should either use it for custom queues or it should be removed.
- **No Real-time Updates:** The dashboard requires a manual refresh to see new tickets or updates. This could be improved with WebSockets or polling.
