---
name: Backend Architecture Patterns
description: Key patterns, naming conventions, and architectural decisions discovered in the NouPro backend during a security audit
type: project
---

Backend is a monolithic Express server in `backend/server.js` (~11K lines).

**Naming**: API uses `companyId`, Prisma uses `businessId`. Repos map between them. Routes use `/api/companies/:companyId/...`.

**Auth flow**: JWT HS256, 30min access + 30d refresh. `requireAuth` middleware sets `req.user`. Business-scoped routes use `requireBusinessMembership()` or `requireBusinessAdmin()` inline (not middleware).

**Permission helpers**: `requireBusinessMembership(req, res, businessId)` returns false and sends response if denied. `requireBusinessAdmin()` same pattern but requires admin/super_admin role.

**Response format**: `{ success, data, message }` via `successResponse()` / `errorResponse()`.

**Rate limiters**: authLimiter (15/15min), messageLimiter (30/min), chatCreationLimiter (10/min), joinRequestLimiter (10/15min), procurementLimiter.

**Repo pattern**: `repos.xxxRepo.method()` for all data access. Direct `prisma.xxx.findMany()` calls also exist inline in some routes (inconsistent).

**In-memory state**: `failedLoginAttempts` Map for login lockout, `_orderDeliverySyncInProgress` Set for loop guard. These reset on server restart.

**Socket.IO**: Authenticated via JWT in handshake, joins chat rooms, user rooms (`user:${userId}`).
