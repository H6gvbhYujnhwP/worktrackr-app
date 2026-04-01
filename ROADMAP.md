# WorkTrackr Cloud — Roadmap & Backlog

_Last updated: 2025-04-01_

---

## Security backlog (fix before adding new features)

- [ ] **Harden cron secret** — make `CRON_SECRET` env var required at startup; throw if missing rather than falling back to a predictable default string (`web/routes/cron.js`)
- [ ] **Remove MFA/reset token console logging** — MFA codes and password reset tokens are logged to `console.log` in dev mode; on a production server without SMTP this leaks sensitive data to Render logs (`web/routes/auth.js`)
- [ ] **Admin panel URL** — `/admin87476463` is hardcoded in source and now publicly visible. Move admin route protection to server-side middleware rather than relying on an obscure URL

---

## Technical debt (do before major new features)

- [ ] **Replace mock user data** — `App.jsx` initialises user state from `mockData.js`; the `useUserLimits` hook reads this local state for seat-limit enforcement instead of real API data. Mock data should be removed and replaced with API calls
- [ ] **Delete broken/backup files** — 8 files to remove:
  - `CreateTicketModal.jsx.broken`
  - `CreateTicketModal_broken.jsx`
  - `CRMDashboard.jsx.broken`
  - `TicketDesigner.jsx.broken`
  - `TicketDetailModal.jsx.broken`
  - `TicketFieldCustomizer_broken.jsx`
  - `BillingQueueManager.jsx.backup`
  - `XeroIntegration.jsx.backup`
- [ ] **Consolidate duplicate component trees** — shadcn UI components are fully duplicated across `web/client/src/components/ui/` and `web/client/src/app/src/components/ui/`. Merge into a single shared location
- [ ] **Split large components** — `CRMCalendar.jsx` (~1,600 lines) and `CRMDashboard.jsx` (~1,600 lines) need breaking into smaller focused components
- [ ] **Consolidate quotes routes** — 7 separate route files all mounted at `/api/quotes`. Merge into a single router file with sub-routers

---

## Feature roadmap (from original development plan)

### Phase 1 — Complete core platform (immediate)
- [ ] **Quotes module** — finish Send Email, Generate PDF, Status Changes actions in `QuoteForm.jsx`
- [ ] **Quote filtering & search** — UI and backend filtering/search for quotes list
- [ ] **"My Tickets" queue** — verify filter works correctly for assigned users

### Phase 2 — Jobs module (1–2 months)
- [ ] Jobs database schema (review migrations)
- [ ] Jobs API endpoints (CRUD)
- [ ] Jobs list view and detail page
- [ ] Job creation and edit forms
- [ ] Calendar integration — drag-and-drop job scheduling
- [ ] Quote-to-Job conversion — "Convert to Job" button on accepted quotes

### Phase 3 — Invoices & Payments (3–4 months)
- [ ] Invoices module — API and UI
- [ ] Invoice calculations and line items
- [ ] Job-to-Invoice conversion — "Create Invoice" button on completed jobs
- [ ] Payments module — record and allocate payments
- [ ] Payment reporting

### Phase 4 — Analytics & Reporting (4–5 months)
- [ ] Dashboard analytics widgets
- [ ] Revenue reporting
- [ ] Job completion reporting
- [ ] Seat usage and billing analytics for admins

### Phase 5 — Long term (5–6 months)
- [ ] Reviews & Testimonials module
- [ ] Customer Portal (self-service)
- [ ] Mobile app for technicians
- [ ] Xero integration (stub exists in `XeroIntegration.jsx`)
- [ ] Multi-language support

---

## Infrastructure & testing
- [ ] Set up Jest unit tests
- [ ] Set up Playwright E2E tests (config exists, tests exist, not yet in CI)
- [ ] Add rate limiting per-user (currently global only)
- [ ] Add CSRF protection
- [ ] Database query performance audit — add missing indexes
- [ ] Caching layer for frequently read data (org plans, user limits)
