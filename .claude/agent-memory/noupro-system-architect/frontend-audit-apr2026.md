---
name: Frontend Architecture Audit Apr 2026
description: Comprehensive frontend audit covering import violations, state management, component sizes, navigation, API layer, types, and performance
type: project
---

Full frontend audit completed April 10, 2026. Key severity counts:
- CRITICAL: 2 findings (layering violations, full-store subscriptions)
- HIGH: 8 findings (mega-components, ts-ignore, duplicate components, missing memo, legacy store)
- MEDIUM: 6 findings (fetch bypass, no deep links, no lazy loading, any types, FlatList optimization)
- LOW/INFO: 5 findings (navigation types comprehensive, feature stores well-designed, selector hooks exist)

Top 3 priorities:
1. Fix shared/services/chat.ts importing from features/inbox/inbox.store (layering violation)
2. Fix full-store subscription: `useDeliveriesStore()` in useDeliveries.ts line 89
3. Split ChatScreen.tsx (2409 lines) and CreateInvoiceScreen.tsx (1786 lines)

**Why:** Frontend stability and maintainability -- layering violations create circular dependency risk, full-store subscriptions cause unnecessary re-renders, mega-screens are bug-prone.
**How to apply:** Address in priority order. Each is independently fixable. See conversation output for full detail.
