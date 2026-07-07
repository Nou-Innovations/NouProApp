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

**MemberRole enum**: `super_admin` | `admin` | `staff`. `super_admin` is the OWNER role (there is no separate "owner" value). Business-scoped writes require admin OR super_admin.

**Soft-delete convention**: `User.deletedAt DateTime?` (added 2026-07-03, migration `20260703000000_add_user_deleted_at`). NULL = active. Account deletion (`DELETE /api/users/me`) ANONYMIZES the row + sets deletedAt + bumps tokenVersion rather than hard-deleting — business records (orders/invoices/messages) reference the user and must be retained (GDPR Art. 17(3)(b)). People-discovery queries filter `deletedAt: null` (`/api/users/search`, `/api/businesses/:id/people`). GDPR export lives at `GET /api/users/me/export`. Legal pages served static+public from `backend/public/legal/` via `/legal/privacy` and `/legal/terms`.

**No global auth middleware**: every protected route lists `requireAuth` individually. Public routes (legal pages, public storefront) simply omit it. Register public routes early (near the `/uploads` static line) so they never fall through to an authed handler.
