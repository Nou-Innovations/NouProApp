# Role Request System - Implementation Guide

## Overview

Staff members can request admin access to a business. Super Admins can approve or reject these requests.

## User Flow

### 1. Staff Member Experience

**In Profile Switcher Modal:**
- Staff sees their business with "STAFF" badge
- Status pill shows "Tap to request access"
- Tapping the business opens "Access Restricted" dialog
- Dialog offers "Request Admin Access" button

**After requesting:**
- Status changes to "Request Pending" with yellow pill
- Cannot request again until resolved
- If rejected, must wait 7 days before requesting again

### 2. Super Admin Experience

**In Team Management:**
- Bell icon (🔔) appears in header with badge count
- Tapping opens "Access Requests" screen
- See all pending requests with user details and optional message
- Two buttons per request: **Approve** or **Decline**

**Approving a request:**
- Confirms with alert
- Immediately upgrades user's role to admin
- Updates business and location memberships
- User is notified

**Declining a request:**
- Shows modal to enter optional reason
- Reason is visible to the requester
- User cannot re-request for 7 days

## Backend Endpoints

### Staff Actions

```http
# Create request
POST /api/businesses/:businessId/role-requests
Body: { "requestedRole": "admin", "message": "..." }
Returns: RoleRequest

# Get my request status
GET /api/businesses/:businessId/role-requests/me
Returns: RoleRequest | null
```

### Admin Actions

```http
# List pending requests
GET /api/businesses/:businessId/role-requests?status=PENDING
Returns: RoleRequestWithUser[]

# Approve/reject request
PATCH /api/businesses/:businessId/role-requests/:requestId
Body: { "status": "APPROVED" | "REJECTED", "rejectionReason": "..." }
Returns: RoleRequest
```

## Data Model

```typescript
interface RoleRequest {
  id: string;
  businessId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  requestedRole: 'admin';
  currentRole: 'staff';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  message?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
  resolvedByName?: string;
  rejectionReason?: string;
}
```

## Business Rules

1. **One pending request per user per business**
   - If pending exists, returns 400 error
   - User sees "Request Already Sent" alert

2. **7-day cooldown after rejection**
   - User cannot request again for 7 days
   - User sees "Request Cooldown" alert

3. **Automatic role upgrade on approval**
   - Updates `businessMembers.role` to 'admin'
   - Updates all `locationMembers.role` to 'admin'
   - User can immediately access Business Profile mode

4. **Audit trail**
   - Tracks who approved/rejected (resolvedByUserId)
   - Tracks when resolved (resolvedAt)
   - Optional rejection reason visible to requester

## Security

### Frontend Guards

All business admin screens wrapped with `<BusinessAdminGuard>`:
- CompanySettingsScreen
- TeamManagementScreen
- (Add to: ProductsScreen, InvoicesScreen, etc.)

### Backend Middleware

Use `requireBusinessAdmin(req, res, businessId)` on admin-only endpoints:
- Role request approval/rejection
- Team management
- Business settings
- Product/invoice management

### Mode Enforcement

`profileStore.switchToBusiness()` automatically blocks staff:
```typescript
if (userBusiness.role === 'staff') {
  set({ error: 'Staff members can only use Personal mode' });
  return false;
}
```

## UI States

### ProfileSwitcher - Business Row (Staff)

| Request Status | Badge | Status Pill | Behavior |
|---|---|---|---|
| None | STAFF | 🔒 Tap to request access | Opens dialog |
| PENDING | STAFF | ⏳ Request Pending | Disabled, shows pending |
| REJECTED | STAFF | ❌ Request Declined | Can tap to request again (after cooldown) |
| APPROVED | ADMIN | (none) | Can switch to business mode |

### Team Management - Header Badge

- Bell icon with count badge (e.g., "3")
- Only visible to super_admin
- Only shown when `pendingRequestsCount > 0`
- Tapping navigates to RoleRequestsScreen

## Testing

### 1. Create a staff member

```bash
curl -X POST http://localhost:3000/api/companies/biz-001/users/invite \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staff@test.com",
    "name": "Test Staff",
    "role": "staff",
    "locationIds": ["loc-001"]
  }'
```

### 2. Accept invite (so they become active staff)

```bash
curl -X POST http://localhost:3000/api/companies/biz-001/users/usr-005/accept
```

### 3. As staff, request admin access

```bash
curl -X POST http://localhost:3000/api/businesses/biz-001/role-requests \
  -H "x-user-id: usr-005" \
  -H "Content-Type: application/json" \
  -d '{
    "requestedRole": "admin",
    "message": "I would like to help manage the team"
  }'
```

### 4. As super admin, view requests

```bash
curl http://localhost:3000/api/businesses/biz-001/role-requests?status=PENDING \
  -H "x-user-id: usr-001"
```

### 5. Approve or reject

```bash
# Approve
curl -X PATCH http://localhost:3000/api/businesses/biz-001/role-requests/rr-123 \
  -H "x-user-id: usr-001" \
  -H "Content-Type: application/json" \
  -d '{ "status": "APPROVED" }'

# Reject
curl -X PATCH http://localhost:3000/api/businesses/biz-001/role-requests/rr-123 \
  -H "x-user-id: usr-001" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "REJECTED",
    "rejectionReason": "Need more experience first"
  }'
```

## Future Enhancements

- [ ] Email notifications to super admin when request created
- [ ] Push notification to user when request approved/rejected
- [ ] In-app inbox message for request updates
- [ ] Request history view (show all past requests)
- [ ] Ability to request specific permissions instead of full admin
- [ ] Multi-level approval (require 2+ admins to approve)
