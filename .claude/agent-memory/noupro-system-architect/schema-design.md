---
name: Schema Design Notes
description: Prisma schema audit findings - JSON columns, naming gaps, missing indexes
type: project
---

33 Prisma models. Schema is well-indexed overall. Key findings:

**JSON columns storing line items** (6 instances):
- Order.items, Invoice.items, Delivery.items, PurchaseRequest.items, PurchaseOrder.items, GoodsReceipt.items
- These are untyped at the DB level. Line items should ideally be normalized into separate tables for query/reporting.
- Acceptable for MVP but will block analytics, partial fulfillment tracking, and inventory sync later.

**Naming inconsistency** (companyId vs businessId):
- Chat model uses `@map("businessId")` on a field named `companyId` -- confusing
- Frontend uses `companyId` in API URLs, backend Prisma uses `businessId` in columns
- This is documented in server.js (lines 401-410) as intentional, but causes ongoing mapping confusion

**Missing indexes to watch:**
- Order: no index on `status` (would help status-filtered queries at scale)
- Order: no index on `createdAt` (would help sorting/pagination)
- Delivery: no index on `deliveryStatus` (same reason)
- PushToken: no index on `token` itself (only userId indexed, but token column is queried for dedup)

**DeviceToken vs PushToken duplication:**
- Both models exist and serve the same purpose (storing push notification tokens)
- DeviceToken has `@@unique` on token field; PushToken has `@@unique([userId, token])`
- One should be deprecated

**PaymentStatus enum is large** (13 values) - many values may never be used (DISPUTED, PARTIALLY_REFUNDED). Consider trimming later.

**Why:** Schema decisions have long-term impact on query performance and feature development.
**How to apply:** Reference when reviewing new features that touch orders, invoices, or deliveries. Advocate for OrderItem normalization before analytics features.
