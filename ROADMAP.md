# WorkTrackr Cloud — Roadmap & Backlog

_Last updated: 2025-04-01 (Session 1)_

---

## Security backlog (fix before adding new features)

- [ ] **Harden cron secret** — make `CRON_SECRET` env var required at startup; throw if missing rather than falling back to a predictable default string (`web/routes/cron.js`)
- [ ] **Remove MFA/reset token console logging** — MFA codes and password reset tokens are logged to `console.log` in dev mode; on a production server without SMTP this leaks sensitive data to Render logs (`web/routes/auth.js`)
- [ ] **Admin panel URL** — `/admin87476463` is hardcoded in source and now publicly visible. Move admin route protection to server-side middleware rather than relying on an obscure URL

---

## Calendar fixes — DO THESE NEXT, one at a time, test each before moving on

> Both calendars are completely separate and must stay that way.
> Ticket Calendar uses the `calendar_events` DB table via `/api/calendar/events`.
> CRM Calendar uses the `crm_events` DB table via `/api/crm-events`.
> They must never share data, state, or API calls.

---

### CALENDAR 1 — Ticket Calendar (`BookingCalendar.jsx`) — DO FIRST

**Status:** BROKEN — not production ready

**Root causes (all found in Session 1 audit):**

- [ ] Uses localStorage instead of the database. Component reads/writes ticketBookings and tickets from localStorage. Data lost on browser clear, invisible on other devices. Backend /api/calendar/events already exists and works — it is simply never called.

- [ ] "Create Booking" form does nothing. Submit button calls setShowBookingForm(false) only. No save logic. Events are silently discarded.

- [ ] Hardcoded 2024 sample data always injected. Four fake bookings (Sarah Johnson, Mike Thompson, Emma Wilson, David Brown) merged into every render. Cannot be deleted.

- [ ] Ticket-to-Calendar bridge uses localStorage. App.jsx writes ticket scheduled dates to localStorage('ticketBookings'). Must be replaced: when a ticket has a scheduled_date, write directly to calendar_events via /api/calendar/events.

- [ ] Two overlapping ticket calendar components exist: BookingCalendar.jsx and IntegratedCalendar.jsx. IntegratedCalendar does correctly call /api/calendar/events. After rewrite, remove or merge the unused one.

- [ ] No day view. Only week and month exist.

- [ ] Month view cells do not open day detail on click.

**Files to change:**
- web/client/src/app/src/components/BookingCalendar.jsx — full rewrite
- web/client/src/app/src/App.jsx — remove localStorage bridge (createBookingFromTicket, updateBookingFromTicket, initializeBookingSync)
- web/client/src/app/src/components/IntegratedCalendar.jsx — assess then merge or remove

**Backend:** web/routes/calendar.js — already correct, no changes needed
**DB table:** calendar_events — schema already exists and is correct

**What a working Ticket Calendar must do:**
1. Load all events from /api/calendar/events on mount
2. Create events via POST to /api/calendar/events — form must actually save
3. Edit events via PUT to /api/calendar/events/:id
4. Delete events via DELETE to /api/calendar/events/:id
5. Show events correctly in day, week, and month views
6. When a ticket has a scheduled_date set or changed, automatically create/update a calendar_events record via the API (not localStorage)
7. Clicking a calendar entry opens the linked ticket or event detail
8. Zero hardcoded sample data

---

### CALENDAR 2 — CRM Calendar (`CRMCalendar.jsx`) — DO SECOND

**Status:** BROKEN — events appear to save but timestamps are null so they never appear on any calendar view

**Root causes (all found in Session 1 audit):**

- [ ] Event type case mismatch — #1 reason events do not save. Frontend sends PascalCase: 'Call', 'Meeting', 'FollowUp', 'Renewal'. Backend Zod only accepts lowercase: 'call', 'meeting', 'follow_up', 'renewal'. Every create/edit fails silently with 400. User sees nothing wrong.

- [ ] Field name mismatch (startAt vs start_at) — #2 reason events never appear. Frontend sends camelCase startAt/endAt. Backend expects snake_case start_at/end_at. Timestamps stored as null. getEventsForDate() can never match null to a date string.

- [ ] sendMeetingInvitations() is called but never defined. Throws ReferenceError and crashes scheduled meeting creation entirely.

- [ ] "Mark Done" button does nothing. No onClick handler wired up.

- [ ] Hardcoded mock users throughout. getAvailableUsers() and getUsersWithEmailEnabled() return fake arrays. Must use real org members from the API.

- [ ] getCustomerLocations() returns five fake hardcoded company addresses. Must use real contacts from /api/contacts.

- [ ] 10-second polling loop runs unconditionally forever. Replace with fetch-on-mount plus re-fetch only after create/edit/delete.

**Files to change:**
- web/client/src/app/src/components/CRMCalendar.jsx — full rewrite

**Backend:** web/routes/crm-events.js — already correct, no changes needed
**DB table:** crm_events — schema already exists and is correct

**What a working CRM Calendar must do:**
1. Load all CRM events from /api/crm-events on mount only
2. Create events via POST with correct snake_case fields and lowercase type values
3. Edit events via PUT to /api/crm-events/:id
4. Delete events via DELETE to /api/crm-events/:id
5. Mark Done updates status to 'done' via PUT
6. Show events correctly in day, week, and month views
7. Assigned users list from real org members API
8. Contacts list from real /api/contacts API
9. Zero hardcoded mock data, zero polling, zero undefined function calls

---

## Technical debt (do after calendars are fixed)

- [ ] Replace mock user data — App.jsx initialises user state from mockData.js; useUserLimits reads local state for seat-limit enforcement instead of real API data
- [ ] Delete broken/backup files:
  - CreateTicketModal.jsx.broken
  - CreateTicketModal_broken.jsx
  - CRMDashboard.jsx.broken
  - TicketDesigner.jsx.broken
  - TicketDetailModal.jsx.broken
  - TicketFieldCustomizer_broken.jsx
  - BillingQueueManager.jsx.backup
  - XeroIntegration.jsx.backup
- [ ] Consolidate duplicate component trees — shadcn UI duplicated across two locations
- [ ] Consolidate quotes routes — 7 separate files all mounted at /api/quotes

---

## Feature roadmap

### Phase 1 — Complete core platform (immediate)
- [ ] Quotes module — finish Send Email, Generate PDF, Status Changes in QuoteForm.jsx
- [ ] Quote filtering and search
- [ ] "My Tickets" queue — verify filter works correctly for assigned users

### Phase 2 — Jobs module (1-2 months)
- [ ] Jobs database schema
- [ ] Jobs API endpoints (CRUD)
- [ ] Jobs list view and detail page
- [ ] Job creation and edit forms
- [ ] Calendar integration — drag-and-drop job scheduling
- [ ] Quote-to-Job conversion

### Phase 3 — Invoices and Payments (3-4 months)
- [ ] Invoices module — API and UI
- [ ] Invoice calculations and line items
- [ ] Job-to-Invoice conversion
- [ ] Payments module
- [ ] Payment reporting

### Phase 4 — Analytics and Reporting (4-5 months)
- [ ] Dashboard analytics widgets
- [ ] Revenue reporting
- [ ] Job completion reporting
- [ ] Seat usage and billing analytics for admins

### Phase 5 — Long term (5-6 months)
- [ ] Reviews and Testimonials module
- [ ] Customer Portal
- [ ] Mobile app for technicians
- [ ] Xero integration
- [ ] Multi-language support

---

## Infrastructure and testing
- [ ] Set up Jest unit tests
- [ ] Set up Playwright E2E tests (config exists, not yet in CI)
- [ ] Add rate limiting per-user (currently global only)
- [ ] Add CSRF protection
- [ ] Database query performance audit
- [ ] Caching layer for frequently read data

---

## UI Redesign — Concept 3 "Modern Enterprise"

### Push 1 — DONE (Session 3, 2025-04-02)
Shell layer complete:
- [x] App.css — new colour tokens, gold accent, dark sidebar vars, removed legacy hacks
- [x] Sidebar.jsx — flat nav, dark background, section headers, no nesting
- [x] AppLayout.jsx — no double wrapper, dark mobile header, clean top bar, tablet collapse
- [x] playwright.yml — disabled CI emails

### Push 2 — TODO (next session, after Push 1 tested on Render)

Apply new design patterns to all module screens. Test Push 1 first before starting Push 2.

Order to follow (lowest risk first):

- [x] `TicketDetailViewTabbedWrapped.jsx` — remove extra white card wrapper (pass-through only)
- [x] `Dashboard.jsx` — replace big stat cards with compact inline stats row; remove legacy hidden header
- [x] `TicketsTableView.jsx` — new table container with toolbar, zebra rows, priority bars, mobile card conversion
- [x] `TicketDetailViewTabbed.jsx` — single container, underline tabs, label-value rows
- [ ] `ContactManager.jsx` — same table pattern as tickets
- [ ] `CRMDashboard.jsx` — table pattern for product catalog
- [ ] `QuotesList.jsx` — table pattern
- [ ] `QuoteDetails.jsx` — single container detail pattern
- [ ] `QuoteForm.jsx` / `QuoteFormTabs.jsx` — section headers, no nested card wrappers
- [ ] `CreateTicketModal.jsx`, `AssignTicketsModal.jsx`, `SendQuoteModal.jsx` — modal header/body/footer pattern with gold primary button
- [ ] `UserManagementImproved.jsx`, `SecuritySettings.jsx`, `EmailIntakeSettings.jsx` — settings page pattern
- [ ] `IntegratedCalendar.jsx`, `CRMCalendar.jsx` — wrap in `bg-white rounded-xl border border-[#e5e7eb]`

**Design rules for Push 2 (must follow for every component):**
- Single white container: `bg-white rounded-xl border border-[#e5e7eb] overflow-hidden`
- Table headers: `text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider bg-[#fafafa]`
- Table rows: `text-[13px]`, zebra even rows `#fafbfc`, hover `#fef9ee`
- Status badges: small pills, muted semantic colours (see badge map in ROADMAP)
- Priority bars: 3px vertical coloured bar (red/amber/blue/green)
- Buttons: gold primary `bg-[#d4a017] text-[#111113]`, secondary `border border-[#e5e7eb]`
- Inputs: `border border-[#e5e7eb] rounded-lg focus:ring-[#d4a017]/30 focus:border-[#d4a017]`
- No nested `<Card>` wrappers inside already-white containers
- No `bg-gray-100` backgrounds inside content areas
