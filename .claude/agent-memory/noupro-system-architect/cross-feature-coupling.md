---
name: Cross-Feature Coupling Map
description: Frontend feature module coupling analysis - which modules depend on each other
type: project
---

**Shared-to-Feature violations (shared/ importing from features/):**
- `src/shared/store/businessStore.ts` -- FIXED (no longer imports from features)
- `src/shared/services/chat.ts` -- STILL OPEN: imports `useInboxStore` from `@/features/inbox/inbox.store`
- `src/shared/store/profileStore.ts` -- dynamic `require()` calls to 4 feature stores in logout() and removeUserBusiness()
  - Lines 344-346: requires inbox.store, deliveries.store, procurement.store (for resetInbox/resetDeliveries/resetProcurement)
  - Line 528: requires team.service (for leaveCompany)
  - Dynamic require avoids circular deps at module load time, but is still a structural violation

**High-coupling feature: deliveries/**
- Imports from: products, team, inbox, transports, procurement, company, subscription, search
- This is the most coupled module. It pulls from 8 other feature modules.

**Cross-feature components -- PARTIALLY MIGRATED:**
- FilterBar: moved to shared/components/ui/ BUT duplicate still exists at features/search/components/FilterBar.tsx
- LocationDropdown: moved to shared/components/ui/ BUT duplicate still exists at features/company/components/LocationDropdown.tsx
- PaywallModal: moved to shared/components/ui/ BUT duplicate still exists at features/subscription/components/PaywallModal.tsx
- AssignStaffModal: moved to shared/components/ui/ (appears fully migrated)
- Feature-level re-export files (features/search/components/index.ts, features/company/components/index.ts, features/subscription/components/index.ts) re-export from shared, creating confusion about canonical location.

**Why:** Cross-feature coupling makes features harder to modify independently and increases breakage risk.
**How to apply:** When a feature module imports from 3+ other feature modules, flag it. Propose moving shared components to shared/components/ and extracting shared services to shared/services/.
