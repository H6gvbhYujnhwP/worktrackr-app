# WorkTrackr Cloud: Master Development Roadmap v2.0

**Version:** 2.0  
**Date:** November 10, 2025  
**Planning Horizon:** 6 months (Nov 2025 - Apr 2026)

---

## 1. Roadmap Overview

### 1.1. Strategic Priorities

The development roadmap focuses on **completing the Quote-to-Cash workflow** and **stabilizing the core platform** to deliver a fully functional SME business management platform. The priorities are:

1. ✅ **Stabilize Core Platform** - Fix critical bugs in Tickets and User Management
2. **Complete Quotes Module** - Finish quote actions (send, PDF, status)
3. **Build Jobs Module** - Enable work scheduling and tracking
4. **Implement Invoicing** - Generate invoices from completed jobs
5. **Add Payment Tracking** - Record and track customer payments
6. **Enhance Reporting** - Provide business insights and analytics

### 1.2. Timeline Overview

```
Nov 2025          Dec 2025          Jan 2026          Feb 2026
├─────────────────┼─────────────────┼─────────────────┼─────────────────┤
│ Ticket System ✅ │ Jobs Module     │ Invoices        │ Payments        │
│ User Mgmt ✅    │ Job Scheduling  │ Invoice PDF     │ Analytics       │
│ Quotes Actions  │ Calendar Integ. │ Email Invoices  │ Reporting       │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘

Mar 2026          Apr 2026
├─────────────────┼─────────────────┤
│ Reviews System  │ Customer Portal │
│ Advanced Report │ Mobile App      │
│ Testing Suite   │ Performance     │
└─────────────────┴─────────────────┘
```

---

## 2. Completed Work (November 9-10, 2025)

### ✅ **Ticket System Stabilization (COMPLETE)**

**Status:** ✅ **Production Ready**

- ✅ **Fixed 5 Critical Bugs:**
  - Priority dropdown not saving
  - Status dropdown not saving
  - Ticket creation validation errors
  - Assigned technician not displaying
  - Missing favicon
- ✅ **Core Functionality Verified:**
  - Ticket creation, viewing, editing
  - Queue system and filtering
  - Bulk operations (status, priority, assignment)
  - Assignment flow to real users

### ✅ **User Management & Billing Foundation (PARTIALLY COMPLETE)**

**Status:** ⚠️ **Needs Final Fix**

- ✅ **Subscription Plans Implemented:**
  - Starter: 1 user
  - Pro: 10 users
  - Enterprise: 50 users
- ✅ **Backend User Limits Enforced:** User invitation checks plan limits.
- ✅ **Database Migrations Created:** Added `plan` and `included_seats` to `organisations` table.
- ✅ **Admin Endpoint Created:** Allows manual plan updates.
- ✅ **UI Updated:** Plan cards show correct user limits.
- ❌ **"Add User" Button Still Disabled:** Frontend caching issue prevents button from being enabled.

---

## 3. Immediate Priorities (Next 2 Weeks)

### 🔴 **CRITICAL BLOCKER (November 10, 2025)**

**The "Add User" button is non-functional**, preventing the addition of new users. This is the top priority and must be resolved before any other work continues.

- **Issue:** Frontend `useUserLimits` hook is not correctly reading subscription data from the API, causing it to think the user limit is 1.
- **Status:** Under active investigation. Backend is correct, but frontend has a caching/data fetching issue.
- **Impact:** **BLOCKER** for user management and testing "My Tickets" queue.
- **Next Step:** Debug `useUserLimits` hook and fix frontend data fetching.

### 3.1. Sprint 1: Complete Core Platform Fixes

**Target Dates:** November 10-18, 2025

**Day 1: User Management Fix**
- [ ] **Fix "Add User" button:** Debug `useUserLimits` hook and ensure it correctly reads `included_seats` from the API.
- [ ] **Test "My Tickets" queue:** Once new users can be added, verify that the "My Tickets" filter works correctly.

**Day 2-5: Quotes Module (from original roadmap)**
- [ ] **Fix Quote Creation Blocker:** Investigate and resolve the original "Save as Draft" button blocker in `QuoteForm.jsx`.
- [ ] **Quote Actions:** Implement Send Email, Generate PDF, and Status Changes.
- [ ] **Quote Filtering & Search:** Add UI and backend logic for filtering and searching quotes.

---

## 4. Short-term Goals (1-2 Months)

**Target Dates:** November 19 - January 15, 2026

### 4.1. Sprint 2: Jobs Module (3 weeks)

- [ ] Review and finalize jobs database schema
- [ ] Build Jobs API endpoints (CRUD)
- [ ] Create Jobs list view and detail page
- [ ] Build Job creation and edit forms

### 4.2. Sprint 3: Calendar Integration (1 week)

- [ ] Integrate jobs with existing calendar
- [ ] Add drag-and-drop job scheduling

### 4.3. Sprint 4: Quote-to-Job Conversion (1 week)

- [ ] Implement "Convert to Job" button on accepted quotes
- [ ] Auto-populate job from quote data

---

## 5. Medium-term Goals (3-4 Months)

**Target Dates:** January 16 - March 15, 2026

### 5.1. Sprint 5: Invoices Module (3 weeks)

- [ ] Build Invoices API and UI
- [ ] Implement invoice calculations and payment tracking

### 5.2. Sprint 6: Job-to-Invoice Conversion (1 week)

- [ ] Implement "Create Invoice" button on completed jobs

### 5.3. Sprint 7: Payments Module (2 weeks)

- [ ] Build Payments API and UI
- [ ] Implement payment allocation and reporting

### 5.4. Sprint 8: Reporting & Analytics (2 weeks)

- [ ] Build dashboard analytics widgets
- [ ] Implement revenue and job completion reporting

---

## 6. Long-term Vision (5-6 Months)

**Target Dates:** March 16 - April 30, 2026

- [ ] **Reviews & Testimonials Module**
- [ ] **Customer Portal**
- [ ] **Mobile App for Technicians**
- [ ] **Advanced Features** (multi-language, integrations, etc.)

---

## 7. Technical Debt & Improvements

- [ ] **Testing:** Set up Jest, Playwright, and CI/CD testing pipeline.
- [ ] **Performance:** Optimize database queries, add caching, and lazy loading.
- [ ] **Security:** Conduct security audit, add rate limiting, CSRF, and 2FA.
- [ ] **Documentation:** Maintain API docs, user guides, and developer docs.

---

## 8. Success Metrics

- **Development Velocity:** Sprint completion rate > 90%
- **System Performance:** API response < 200ms, page load < 2s
- **User Adoption:** Track active organizations and feature usage

---

## Summary

This roadmap provides a clear, actionable plan for the next 6 months. The immediate focus is on **resolving the "Add User" button blocker** and then continuing with the original plan to complete the **Quote-to-Cash workflow**.

**This roadmap is a living document and will be updated monthly based on progress and changing priorities.**
