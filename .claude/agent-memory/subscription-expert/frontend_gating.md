---
name: Frontend Gating
description: How frontend handles subscription checks, PaywallModal usage locations, permissions utility
type: project
---

## Key files
- `src/shared/types/subscription.ts` -- plan definitions, features, limits, prices (MUR currency)
- `src/shared/utils/permissions.ts` -- centralized permission check functions + paywall trigger system (~1100 lines)
- `src/shared/hooks/usePermissions.ts` -- React hook wrapping all permission checks
- `src/shared/types/roles.ts` -- ROLE_CAPABILITIES per role (super_admin/admin/staff)
- `src/shared/auth/capabilities.ts` -- role-based getCapabilities() function (small, role-only)
- `src/shared/components/ui/PaywallModal.tsx` -- 4 modal types: feature_gate, limit_reached, enterprise_control, soft_upsell
- `src/features/subscription/components/PaywallModal.tsx` -- duplicate/feature-specific PaywallModal
- `src/features/subscription/screens/SubscriptionPlansScreen.tsx` -- plan selection + upgrade flow (NOW uses api.ts patch)

## PaywallModal usage (screens that import it)
- ProductsScreen, CreateProductScreen
- DeliveryScreen, CreateDeliveryScreen, DeliveryDetailSupplierView, DeliveryDetailSelfView
- InvoicesScreen, InvoiceDetailsScreen
- CompanySettingsScreen
- ProcurementDashboardScreen
- InviteStaffScreen

## CRITICAL: No backend PAYWALL error handling
- api.ts has NO special handling for PAYWALL error codes from backend
- When backend returns 403 with { error: { code: 'PAYWALL', triggerId, requiredPlan } }, frontend catches as generic ApiError
- No screen checks err.code === 'PAYWALL' to show PaywallModal reactively
- All paywall gating is done proactively (before action) via checkPaywall(), not reactively (after backend rejection)
- This means if frontend state is stale (e.g., cached plan), user can attempt action, get generic error instead of paywall modal

## Frontend-backend plan name mapping
- Frontend: lowercase ('free' | 'pro' | 'business' | 'enterprise')
- Backend: UPPERCASE ('FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE')
- profileStore maps: `(raw.subscriptionTier || 'FREE').toLowerCase()` to `plan`
