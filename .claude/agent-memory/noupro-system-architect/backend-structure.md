---
name: Backend server.js Structure
description: Line ranges for domain sections in the 10,704-line monolithic server.js file
type: project
---

backend/server.js is 10,704 lines. Key sections (approximate line ranges):

- 1-150: Imports, email service, repo setup, constants
- 150-200: Rate limiters (auth, message, chat creation, join request, procurement)
- 200-270: Multer upload config
- 270-370: Subscription tier capability derivation (deriveCapabilities)
- 370-800: Permission middleware helpers (membership checks, access control)
- 830-840: successResponse / errorResponse helpers
- 864-960: Socket.IO setup (auth, join_chat, typing, disconnect)
- 960-1800: Auth routes (login, register, refresh, 2FA, OTP, etc.)
- 1849-1960: User search/profile routes
- 1960-2260: Company CRUD routes
- 2260-2560: Connection routes (user + business connections)
- 2560-2770: Location CRUD routes
- 2770-3095: Product CRUD routes (under /companies/:companyId/)
- 3095-3370: Brand + Transport routes
- 3370-3480: Company connection routes
- 3480-4280: Order routes (company-scoped + location-scoped)
- 4280-4380: Stock routes
- 4380-5600: Procurement routes (suppliers, PurchaseRequests, PurchaseOrders, GoodsReceipts)
- 5600-5800: Delivery routes
- 5800-6340: Invoice routes (company + location scoped)
- 6340-6400: Invoice accept endpoint
- 6400-8000: Chat/messaging routes
- 8000-8700: Staff/membership management routes
- 8700-9000: Role request routes
- 9000-9400: Notification preference + device token routes
- 9400-10100: Notification aggregation routes
- 10100-10400: Feed routes
- 10400-10550: Public storefront / order-event routes
- 10550-10620: Push notification helper
- 10620-10704: Server startup

**Why:** Understanding this structure is essential when advising on incremental decomposition. Each section maps to a domain module that could be extracted.
**How to apply:** When Arnaud asks to modify or refactor a specific domain, reference the line range to locate it quickly.
