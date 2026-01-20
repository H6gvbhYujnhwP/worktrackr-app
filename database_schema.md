# WorkTrackr Database Schema & Architecture

This document outlines the complete database schema and architecture for the WorkTrackr application. The goal is to create a robust, scalable, and secure database that eliminates all mock data and localStorage dependencies, ensuring data integrity and isolation between organizations.

## Core Principles

- **Single Source of Truth:** The PostgreSQL database is the single source of truth for all application data.
- **Data Isolation:** All data is strictly partitioned by `organisation_id`. No organization can access another organization's data.
- **Scalability:** The schema is designed to handle a growing number of users, contacts, and transactions.
- **Data Integrity:** Foreign key constraints and transactions are used to ensure data integrity.

## Table Schemas

### 1. Core Tables

#### `organisations`

Stores information about each customer organization.

| Column          | Type    | Constraints              | Description                               |
| --------------- | ------- | ------------------------ | ----------------------------------------- |
| `id`            | `UUID`  | `PRIMARY KEY`            | Unique identifier for the organization.   |
| `name`          | `TEXT`  | `NOT NULL`               | Name of the organization.                 |
| `plan`          | `TEXT`  | `DEFAULT 'starter'`      | Subscription plan (e.g., 'starter', 'pro'). |
| `created_at`    | `TIMESTAMPTZ` | `DEFAULT NOW()`          | Timestamp of creation.                    |
| `updated_at`    | `TIMESTAMPTZ` | `DEFAULT NOW()`          | Timestamp of last update.                 |

#### `users`

Stores user accounts.

| Column          | Type    | Constraints              | Description                               |
| --------------- | ------- | ------------------------ | ----------------------------------------- |
| `id`            | `UUID`  | `PRIMARY KEY`            | Unique identifier for the user.           |
| `organisation_id` | `UUID`  | `REFERENCES organisations(id)` | The organization the user belongs to.     |
| `email`         | `TEXT`  | `NOT NULL, UNIQUE`       | User's email address.                     |
| `password_hash` | `TEXT`  | `NOT NULL`               | Hashed password.                          |
| `name`          | `TEXT`  |                          | User's full name.                         |
| `role`          | `TEXT`  | `DEFAULT 'staff'`        | User's role (e.g., 'admin', 'manager', 'staff'). |
| `created_at`    | `TIMESTAMPTZ` | `DEFAULT NOW()`          | Timestamp of creation.                    |
| `updated_at`    | `TIMESTAMPTZ` | `DEFAULT NOW()`          | Timestamp of last update.                 |

### 2. Contact Management

#### `contacts` (already exists)

Stores all contacts for all organizations.

| Column          | Type    | Constraints              | Description                               |
| --------------- | ------- | ------------------------ | ----------------------------------------- |
| `id`            | `UUID`  | `PRIMARY KEY`            | Unique identifier for the contact.        |
| `organisation_id` | `UUID`  | `REFERENCES organisations(id)` | The organization the contact belongs to.  |
| `name`          | `TEXT`  | `NOT NULL`               | Name of the contact (company or individual). |
| `...`           | `...`   | `...`                    | Other columns as previously defined.      |

### 3. CRM

#### `crm_events`

Stores CRM calendar events.

| Column          | Type    | Constraints              | Description                               |
| --------------- | ------- | ------------------------ | ----------------------------------------- |
| `id`            | `UUID`  | `PRIMARY KEY`            | Unique identifier for the event.          |
| `organisation_id` | `UUID`  | `REFERENCES organisations(id)` | The organization the event belongs to.    |
| `contact_id`    | `UUID`  | `REFERENCES contacts(id)`    | The contact the event is associated with. |
| `title`         | `TEXT`  | `NOT NULL`               | Title of the event.                       |
| `type`          | `TEXT`  |                          | Type of event (e.g., 'Call', 'Meeting').  |
| `start_at`      | `TIMESTAMPTZ` | `NOT NULL`               | Start time of the event.                  |
| `end_at`        | `TIMESTAMPTZ` | `NOT NULL`               | End time of the event.                    |
| `assigned_user_id` | `UUID`  | `REFERENCES users(id)`       | The user assigned to the event.           |
| `status`        | `TEXT`  | `DEFAULT 'Planned'`      | Status of the event (e.g., 'Planned', 'Done'). |
| `notes`         | `TEXT`  |                          | Notes for the event.                      |
| `created_at`    | `TIMESTAMPTZ` | `DEFAULT NOW()`          | Timestamp of creation.                    |
| `updated_at`    | `TIMESTAMPTZ` | `DEFAULT NOW()`          | Timestamp of last update.                 |

### 4. Product & Service Management

#### `products`

Stores the product/service catalog for each organization.

| Column          | Type    | Constraints              | Description                               |
| --------------- | ------- | ------------------------ | ----------------------------------------- |
| `id`            | `UUID`  | `PRIMARY KEY`            | Unique identifier for the product.        |
| `organisation_id` | `UUID`  | `REFERENCES organisations(id)` | The organization the product belongs to.  |
| `name`          | `TEXT`  | `NOT NULL`               | Name of the product/service.              |
| `category`      | `TEXT`  |                          | Category of the product/service.          |
| `our_cost`      | `NUMERIC` | `DEFAULT 0`              | Cost for the organization.                |
| `client_price`  | `NUMERIC` | `DEFAULT 0`              | Price for the customer.                   |
| `unit`          | `TEXT`  |                          | Unit of measurement (e.g., 'service', 'hour'). |
| `active`        | `BOOLEAN` | `DEFAULT TRUE`           | Whether the product is active.            |
| `created_at`    | `TIMESTAMPTZ` | `DEFAULT NOW()`          | Timestamp of creation.                    |
| `updated_at`    | `TIMESTAMPTZ` | `DEFAULT NOW()`          | Timestamp of last update.                 |

#### `customer_services`

Links contacts (customers) to products/services they are using.

| Column          | Type    | Constraints              | Description                               |
| --------------- | ------- | ------------------------ | ----------------------------------------- |
| `id`            | `UUID`  | `PRIMARY KEY`            | Unique identifier for the service link.   |
| `organisation_id` | `UUID`  | `REFERENCES organisations(id)` | The organization the link belongs to.     |
| `contact_id`    | `UUID`  | `REFERENCES contacts(id)`    | The contact using the service.            |
| `product_id`    | `UUID`  | `REFERENCES products(id)`    | The product/service being used.           |
| `quantity`      | `INTEGER` | `DEFAULT 1`              | Quantity of the service being used.       |
| `notes`         | `TEXT`  |                          | Notes for this specific service instance. |
| `renewal_date`  | `DATE`  |                          | Renewal date for the service.             |
| `created_at`    | `TIMESTAMPTZ` | `DEFAULT NOW()`          | Timestamp of creation.                    |
| `updated_at`    | `TIMESTAMPTZ` | `DEFAULT NOW()`          | Timestamp of last update.                 |

### 5. Ticket Management

#### `tickets`

Stores all tickets for all organizations.

| Column          | Type    | Constraints              | Description                               |
| --------------- | ------- | ------------------------ | ----------------------------------------- |
| `id`            | `UUID`  | `PRIMARY KEY`            | Unique identifier for the ticket.         |
| `organisation_id` | `UUID`  | `REFERENCES organisations(id)` | The organization the ticket belongs to.   |
| `contact_id`    | `UUID`  | `REFERENCES contacts(id)`    | The contact the ticket is for.            |
| `title`         | `TEXT`  | `NOT NULL`               | Title of the ticket.                      |
| `description`   | `TEXT`  |                          | Description of the ticket.                |
| `status`        | `TEXT`  | `DEFAULT 'Open'`         | Status of the ticket (e.g., 'Open', 'Closed'). |
| `priority`      | `TEXT`  | `DEFAULT 'Medium'`       | Priority of the ticket (e.g., 'High', 'Medium'). |
| `assigned_user_id` | `UUID`  | `REFERENCES users(id)`       | The user assigned to the ticket.          |
| `scheduled_date`| `DATE`  |                          | Scheduled date for the ticket.            |
| `created_at`    | `TIMESTAMPTZ` | `DEFAULT NOW()`          | Timestamp of creation.                    |
| `updated_at`    | `TIMESTAMPTZ` | `DEFAULT NOW()`          | Timestamp of last update.                 |

#### `ticket_templates`

Stores customizable ticket templates for each organization.

| Column          | Type    | Constraints              | Description                               |
| --------------- | ------- | ------------------------ | ----------------------------------------- |
| `id`            | `UUID`  | `PRIMARY KEY`            | Unique identifier for the template.       |
| `organisation_id` | `UUID`  | `REFERENCES organisations(id)` | The organization the template belongs to. |
| `name`          | `TEXT`  | `NOT NULL`               | Name of the template.                     |
| `fields`        | `JSONB` |                          | The fields and their order in the template. |
| `created_at`    | `TIMESTAMPTZ` | `DEFAULT NOW()`          | Timestamp of creation.                    |
| `updated_at`    | `TIMESTAMPTZ` | `DEFAULT NOW()`          | Timestamp of last update.                 |

### 6. Reseller Management

#### `resellers`

Stores information about reseller partners.

| Column          | Type    | Constraints              | Description                               |
| --------------- | ------- | ------------------------ | ----------------------------------------- |
| `id`            | `UUID`  | `PRIMARY KEY`            | Unique identifier for the reseller.       |
| `name`          | `TEXT`  | `NOT NULL`               | Name of the reseller company.             |
| `commission_rate` | `NUMERIC` | `DEFAULT 0.25`           | Commission rate for the reseller.         |
| `created_at`    | `TIMESTAMPTZ` | `DEFAULT NOW()`          | Timestamp of creation.                    |
| `updated_at`    | `TIMESTAMPTZ` | `DEFAULT NOW()`          | Timestamp of last update.                 |

#### `reseller_customers`

Links resellers to the organizations they have brought in.

| Column          | Type    | Constraints              | Description                               |
| --------------- | ------- | ------------------------ | ----------------------------------------- |
| `reseller_id`   | `UUID`  | `REFERENCES resellers(id)`   | The reseller.                             |
| `organisation_id` | `UUID`  | `REFERENCES organisations(id)` | The customer organization.                |
| `created_at`    | `TIMESTAMPTZ` | `DEFAULT NOW()`          | Timestamp of creation.                    |
| `PRIMARY KEY`   | `(`reseller_id`, `organisation_id`)` | Composite primary key.                    |


## Migration Plan

This plan outlines the steps to migrate all mock data and localStorage dependencies to the new PostgreSQL database schema. The migration will be done in a phased approach to minimize disruption.

### Phase 1: CRM & Product Catalog

**Goal:** Migrate CRM events and the product catalog to the database.

1.  **Create `crm_events` table:** Create the `crm_events` table in the database using the schema defined above.
2.  **Create `products` table:** Create the `products` table in the database.
3.  **Create `customer_services` table:** Create the `customer_services` table to link contacts and products.
4.  **Update CRM components:**
    *   Modify `CRMCalendar.jsx` to fetch and save events from/to the `/api/crm_events` endpoint.
    *   Modify `CRMDashboard.jsx` to fetch and save products from/to the `/api/products` endpoint.
    *   Modify `CRMDashboard.jsx` to manage customer services through the `/api/customer_services` endpoint.
5.  **Create API endpoints:** Create the necessary API endpoints in the backend to support CRUD operations for `crm_events`, `products`, and `customer_services`.

### Phase 2: Ticket Management

**Goal:** Migrate tickets and ticket templates to the database.

1.  **Create `tickets` table:** Create the `tickets` table in the database.
2.  **Create `ticket_templates` table:** Create the `ticket_templates` table.
3.  **Update Ticket components:**
    *   Modify `App.jsx` and `BookingCalendar.jsx` to fetch and save tickets and bookings from/to the `/api/tickets` endpoint.
    *   Modify `CreateTicketModalFixed.jsx` and `TicketDesigner.jsx` to manage ticket templates through the `/api/ticket_templates` endpoint.
4.  **Create API endpoints:** Create the necessary API endpoints for `tickets` and `ticket_templates`.

### Phase 3: Reseller Management

**Goal:** Implement the reseller management system with a proper database backend.

1.  **Create `resellers` table:** Create the `resellers` table in the database.
2.  **Create `reseller_customers` table:** Create the `reseller_customers` table.
3.  **Update ResellerDashboard.jsx:** Modify the component to fetch and display real data from the `/api/resellers` and `/api/reseller_customers` endpoints.
4.  **Create API endpoints:** Create the necessary API endpoints for resellers and their customers.

### Phase 4: Final Cleanup

**Goal:** Remove all remaining mock data and localStorage usage.

1.  **Remove `mockData.js`:** Delete the `mockData.js` file and update all imports to use API calls.
2.  **Remove `contactDatabase.js`:** Delete the `contactDatabase.js` file and ensure all contact management is done through the API.
3.  **Remove remaining localStorage usage:** Audit the project for any remaining `localStorage` usage and replace it with API calls where appropriate (e.g., user preferences can keep user preferences like timezone in local storage).


## System Architecture

The WorkTrackr application follows a modern three-tier architecture:

1.  **Frontend:** A React single-page application (SPA) built with Vite, using Tailwind CSS and Shadcn UI for styling. The frontend is responsible for the user interface and all user interactions.
2.  **Backend:** A Node.js and Express.js server that provides a RESTful API for the frontend. The backend is responsible for business logic, authentication, and data access.
3.  **Database:** A PostgreSQL database that stores all application data. The database is the single source of truth for the application.

### Data Flow Diagram

```mermaid
graph TD
    A[User] -->|Interacts with| B(React Frontend);
    B -->|API Requests (HTTPS)| C(Node.js/Express Backend);
    C -->|SQL Queries| D(PostgreSQL Database);
    D -->|Query Results| C;
    C -->|API Responses (JSON)| B;
    B -->|Renders UI| A;

    subgraph "Browser"
        B
    end

    subgraph "Server"
        C
        D
    end
```
