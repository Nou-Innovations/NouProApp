---
name: Backend Enforcement
description: Map of which endpoints have subscription/plan checks and which are missing
type: project
---

## Enforced endpoints (use deriveCapabilities + paywallResponse or errorResponse)
- POST orders (canCreateSellingOrders) ~line 3695
- POST location orders (canHaveIndependentLocations + canCreateSellingOrders) ~line 4195
- POST deliveries (canCreateDeliveries) ~line 5504, uses paywallResponse
- POST deliveries from orders (canCreateDeliveries) ~line 5783, uses paywallResponse
- POST invoices (canCreateInvoiceDraft + canSendInvoice for SENT) ~line 5907, uses paywallResponse for send
- POST location invoices (same checks) ~line 6109
- PATCH invoices (canSendInvoice when transitioning to SENT) ~line 6339, uses paywallResponse
- POST locations (maxLocations limit) ~line 2733
- POST products (maxListedProducts limit) ~line 3024, uses generic errorResponse (NOT paywallResponse)
- PATCH products (maxListedProducts limit) ~line 3088, uses generic errorResponse
- POST transports (canAssignTransport) ~line 3389, uses errorResponse with PAYWALL code
- PATCH transports (canAssignTransport) ~line 3437, uses errorResponse with PAYWALL code
- DELETE transports (canAssignTransport) ~line 3494, uses errorResponse with PAYWALL code
- POST suppliers (canManageSuppliers + maxSuppliers) ~line 4649+
- POST purchase requests (canCreatePurchaseRequests) ~line 4771
- GET purchase requests (canCreatePurchaseRequests) ~line 4797
- POST approve purchase requests (canApprovePurchaseRequests) ~line 4931
- POST reject purchase requests (canApprovePurchaseRequests) ~line 4978
- POST purchase orders (canCreatePurchaseOrders) ~line 5076+5102
- POST goods receipt (canReceiveGoods) ~line 5306
- GET goods receipt (canReceiveGoods) ~line 5403
- POST staff/invite (canInviteStaff + maxStaff) ~line 8489+8498, uses paywallResponse + generic errorResponse
- POST location staff (canHaveStaff + maxStaff) ~line 8232, uses paywallResponse + generic errorResponse
- POST accept join request (canHaveStaff + maxStaff) ~line 8883, uses paywallResponse
- PATCH location mode (canChooseLocationMode, canHaveIndependentLocations) ~line 2826
- PATCH business (isPublished -> canPublishBusinessPage) ~line 2235
- Delivery assign (canAssignTransport) ~line 9023, uses paywallResponse
- Delivery unassign (canAssignTransport) ~line 9176, uses paywallResponse
- Subscription update (super_admin only) ~line 2289-2298

## NOT enforced (missing plan checks)
- POST brands (line 3249) -- only requireBusinessMembership, no plan check
- PATCH brands (line 3280) -- only requireBusinessMembership, no plan check
- DELETE brands (line 3314) -- only requireBusinessAdmin, no plan check
- PUT /api/companies/:id (line 2354) -- strips protected fields but allows arbitrary safeUpdates
- PUT /api/companies/:companyId/locations/:locationId (line 2866) -- no plan checks at all
- PATCH /api/companies/:companyId settings (line 2273) -- merges arbitrary settings without plan check (pricePrivacyEnabled)
- GET /api/companies/:companyId (line 2203) -- unauthenticated, exposes capabilities object
- POST business-connections (line 2525) -- no plan check (arguably OK, but worth noting)
- Chat routes (lines 6497-7699) -- no plan checks, all chats available on all plans (intentional per PLAN_FEATURES.use_inbox=true)
- GET /api/companies/:companyId/products/:productId/suppliers (line 3189) -- membership only, no plan check for supplier data viewing
