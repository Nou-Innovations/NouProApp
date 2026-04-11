---
name: Audit Findings 2026-04-10
description: Second comprehensive subscription/permissions audit -- updated with paywallResponse standardization and expiry enforcement
type: project
---

## Status: Updated 2026-04-10 (second pass)

### Fixed since prior audit:
- Subscription update endpoint now requires super_admin (line 2291+2296)
- SubscriptionPlansScreen now uses api.ts patch() instead of raw fetch()
- paywallResponse() function standardized (line 863)
- Expiration enforcement added to deriveCapabilities (3-day grace period, line 301-307)
- isPublished check added to PATCH /api/companies/:companyId (line 2233-2238)

### Still open:
- CRITICAL: Brand CRUD has zero plan checks (POST/PATCH/DELETE brands -- lines 3249, 3280, 3314)
- CRITICAL: PUT /api/companies/:id strips isPublished entirely (line 2364) -- frontend could bypass PATCH
- CRITICAL: Settings (pricePrivacyEnabled) can be set by any member on any plan (line 2273)
- CRITICAL: GET /api/companies/:companyId is unauthenticated, exposes capabilities object (line 2203)
- CRITICAL: No global PAYWALL error handling in frontend -- backend 403s with PAYWALL code are caught as generic errors
- WARNING: Error codes still inconsistent (mix of PAYWALL, CAPABILITY_REQUIRED, PLAN_REQUIRED, generic errorResponse)
- WARNING: Product create limit check uses generic errorResponse, not paywallResponse (line 3029)
- WARNING: Staff limit exceeded uses generic errorResponse, not paywallResponse (line 8238, 8500)
- WARNING: PUT /api/companies/:companyId/locations/:locationId has no plan checks at all (line 2866)
- INFO: No PDF export or analytics endpoints exist yet
- INFO: Limits are well-enforced where they exist (staff, locations, listedProducts, suppliers)
