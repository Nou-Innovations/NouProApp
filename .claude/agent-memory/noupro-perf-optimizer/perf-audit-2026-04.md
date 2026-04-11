---
name: Performance Audit April 2026
description: Comprehensive full-stack perf audit findings -- N+1 queries, notification waterfall, unbounded queries, invoice generation, FlatList gaps, eager imports
type: project
---

## Critical Findings (Updated 2026-04-10)

### Backend

1. **Notifications endpoint N+1 waterfall** (server.js:9654-9983): Loops all user businesses 10 times sequentially, each time fetching all entities (invoices, deliveries, orders, stocks, role requests, connections) unbounded. For user with 3 businesses: ~30+ sequential DB queries. Within stock alerts (line 9889), individual `productRepo.getById()` calls inside a loop.

2. **Contacts/search endpoint loads ALL users + ALL businesses** (server.js:7829-7882): `repos.userRepo.list()` + `repos.businessRepo.list()` with no pagination, no search at DB level -- full table scans filtered in JS. Plus N+1 for business member resolution (line 7857).

3. **N+1 in auth flows** (server.js:1135, 1810, 1912, 2004): Four places loop memberships calling `repos.businessRepo.getById(m.businessId)` individually. Happens on every login, token refresh, and profile fetch.

4. **N+1 in transports** (server.js:3364): Loops transports calling `repos.userRepo.getById(t.assignedStaffId)` individually per transport.

5. **N+1 in chat participant validation** (server.js:6515): Loops all participants calling `findBusinessMember(companyId, pid)` individually.

6. **Invoice number generation fetches ALL invoices** (server.js:5976, 6197): To generate next number, fetches all business invoices and does `reduce()` on them. Gets worse over time.

7. **Unbounded queries everywhere**: `getByBusinessId()` on orders, deliveries, invoices, stocks have no `take`/`skip`. All fetch-then-filter-in-JS patterns.

8. **Activity feed PO/PR queries unbounded** (server.js:9583-9615): `repos.procurementRepo.getPurchaseOrders(companyId)` fetches ALL POs then slices to 20 in JS. Same for purchase requests.

9. **Public product catalog fetches ALL products** (server.js:10323): `repos.productRepo.list()` with no filters, then filters in JS.

### Frontend

10. **80+ screens eagerly imported in App.tsx**: All screen components imported at top level. No `React.lazy()` or dynamic imports.

11. **FlatList missing optimization props** on: ConnectionsScreen, NotificationsScreen, TeamManagementScreen, AllActivityScreen, SuppliersScreen, PurchaseRequestsScreen, PurchaseOrdersScreen, RoleRequestsScreen, LocationsScreen, TransportsScreen, BrandSelectionScreen, SelectProductsForBrandScreen, BusinessProfileScreen, SearchResultsList, UserSearchScreen, BusinessExploreScreen, BusinessInboxScreen, PersonalInboxScreen, HomeScreen.

12. **useProducts fetchProducts depends on search+statusFilter** (line 188): Includes `search` and `statusFilter` in useCallback deps, causing re-creation + auto-refetch from server on every keystroke/filter change, even though filtering is done client-side.

13. **No expo-image usage**: zero imports of `expo-image` across src/. All images use raw `<Image>` from react-native (no disk caching, no progressive loading, no blur placeholders).

14. **Unused dependencies**: react-native-heroicons, react-native-animatable (0 imports found in src/).

## Improvements Since Last Audit

- React.memo now on 5 list item components: MessageBubble, DeliveryCard, ProductCard, OrderCard, InvoiceCard
- FlatList optimization props added to: ProductsScreen, DeliveryScreen, InvoicesScreen, ChatScreen
- Activity feed now uses `take: 20` via direct Prisma for invoices/deliveries/orders
- Store selectors: useDeliveries and useProducts now use `(state) => state.field` selectors instead of destructuring full store
- Products N+1 for stock fixed: batch fetch with Map lookup
- businessStore partialize now persists empty object (no unnecessary persistence)

**Why:** These affect app speed now and will degrade as data grows.
**How to apply:** Prioritize notifications endpoint and contacts search -- they are the worst offenders by query count.
