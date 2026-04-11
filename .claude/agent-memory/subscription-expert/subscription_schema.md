---
name: Subscription Schema
description: How subscription tiers are stored in Prisma, the deriveCapabilities function, and frontend type definitions
type: project
---

## Prisma Schema
- `Business` model has `subscriptionTier` (enum: FREE/PRO/BUSINESS/ENTERPRISE), `billingPeriod` (MONTHLY/YEARLY), `currentPeriodEnd` (DateTime?)
- No separate Subscription model -- tier is stored directly on Business
- `MemberRole` enum: super_admin, admin, staff (no manager role)
- No `isExpired` or `subscriptionStatus` field in DB -- expiry is computed in deriveCapabilities

## Backend: deriveCapabilities (server.js ~line 297)
- Centralized function that takes a `business` object and returns a capabilities object
- NOW includes expiration enforcement (3-day grace period, line 301-307)
- Used consistently across ~45+ endpoints
- Covers: location modes, orders, invoices, deliveries, staff, procurement, analytics, branding, limits, price privacy
- Limits: maxLocations, maxStaff, maxListedProducts, maxSuppliers

## Backend: paywallResponse (server.js ~line 863)
- Standardized function: paywallResponse(message, triggerId, requiredPlan)
- Returns: { success: false, error: { code: 'PAYWALL', triggerId, requiredPlan, message }, message }
- NOT used everywhere -- many routes still use errorResponse with 'CAPABILITY_REQUIRED' code

## Frontend: subscription.ts (src/shared/types/subscription.ts)
- Parallel definitions: PLAN_FEATURES, PLAN_LIMITS, PLAN_PRICES_MONTHLY, PLAN_PRICES_YEARLY
- Uses lowercase plan names: 'free' | 'pro' | 'business' | 'enterprise'
- Backend uses UPPERCASE enum values: FREE, PRO, BUSINESS, ENTERPRISE
- profileStore maps: `(raw.subscriptionTier || 'FREE').toLowerCase()` to `plan`
- Includes SubscriptionStatus type: 'active' | 'grace' | 'expired' (frontend-only, not in DB)
- Includes FREE_TRIAL_DAYS: free=0, pro=7, business=7, enterprise=14

## Currency: MUR (Mauritian Rupee)
- Monthly: Free=0, Pro=899, Business=2699, Enterprise=4399
- Yearly: Free=0, Pro=9588, Business=28788, Enterprise=46788
