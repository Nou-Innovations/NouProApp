---
name: Database Index Gaps
description: Missing composite indexes and index analysis for multi-tenant queries -- updated 2026-04-10
type: project
---

## Indexes Added Since Last Audit (Good)

| Table | Index | Status |
|-------|-------|--------|
| Product | (businessId, category) | Added |
| Product | (businessId, isListed) | Added |
| Order | (businessId, status) | Added |
| Order | (businessId, createdAt) | Added |
| Delivery | (businessId, deliveryStatus) | Added |
| Delivery | (businessId, createdAt) | Added |

## Still Missing Composite Indexes

| Table | Missing Index | Query Pattern |
|-------|--------------|---------------|
| Invoice | (businessId, status) | Notification endpoint filters PAID invoices per business |
| Invoice | (businessId, issuedByLocationId) | Location-scoped invoice queries |
| PurchaseOrder | (businessId, status) | Activity feed + list filtering |
| PurchaseRequest | (businessId, status) | Activity feed + list filtering |
| BusinessMember | (userId, status) | Login/auth fetches memberships by userId then filters by status=accepted |
| Message | (chatId, type) | Filtering non-deleted messages by type |

## Missing Single-Column Indexes

| Table | Column | Reason |
|-------|--------|--------|
| PurchaseRequest | supplierId | Joins/filters by supplier |

## Connection Pooling Note

Prisma client is initialized as singleton (`backend/src/db/prisma.js`) with default settings -- no explicit connection pool size configured. For Supabase pgbouncer, this is fine but consider adding `connection_limit=5` in DATABASE_URL for Render deployment to avoid pool exhaustion.

**Why:** As data grows, these missing composites will cause full index scans on the secondary filter column.
**How to apply:** Add these via `prisma migrate dev` -- zero-downtime index additions.
