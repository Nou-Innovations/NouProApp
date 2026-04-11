---
name: Security Audit Findings April 2026
description: Critical security vulnerabilities and code quality issues found during comprehensive backend audit
type: project
---

**Key critical findings** (see full audit report delivered to Arnaud):

1. Mass assignment on `PUT /api/companies/:id` (line 2253) -- passes `req.body` directly to repo, allows setting `subscriptionTier`
2. `DELETE /api/locations/:locationId` (line 2734) -- no business ownership check, any authenticated user can delete any location
3. Location create `POST /api/companies/:companyId/locations` (line 2574) -- no membership check
4. Multiple routes missing membership checks for company-scoped resources (members, users, access/capabilities)
5. Invoice create spreads `...req.body` into DB record (line 5882-5883) -- mass assignment risk
6. Automation endpoint uses hardcoded dev API key as default (line 10452)
7. `GET /api/products/:productId` references undefined `products` and `feedPosts` variables (line 10275/10283) -- runtime crash
8. Socket.IO CORS set to `origin: '*'` (line 154) -- weaker than HTTP CORS config
9. No `express.json()` body size limit -- DoS vector
10. `userRepo.list()` loads all users into memory (line 7718) -- performance/privacy issue

**Why:** These are security gaps that could allow data leakage between tenants, privilege escalation, or denial of service.

**How to apply:** When writing new endpoints, always: (a) add membership check, (b) whitelist allowed fields, (c) verify ownership before mutations.
