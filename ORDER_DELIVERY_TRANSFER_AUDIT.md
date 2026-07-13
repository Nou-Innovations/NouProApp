# Orders · Deliveries · Transfers — Full System Audit

**Date:** 2026-07-13
**Scope:** Everything the app does with **orders**, **deliveries**, **transfers**, and the **stock/inventory engine** that ties them together — from the UI a user taps, through `api.ts`, through the Express monolith (`backend/server.js`), the status-machine services, the Prisma repositories, and the database schema. Procurement (purchase orders → goods receipt) and returns are included because they feed the same stock ledger.

This is an analysis document. **No code was changed.** Every claim cites `file:line`.

---

## 1. Executive summary

The order/delivery/transfer/stock system is **large, ambitious, and mostly wired end-to-end** — there is a real multi-bucket inventory ledger, three separate status state-machines with audit history, order↔delivery sync, and a procurement→receiving path. The architecture (a single `stockService` ledger as the source of truth) is genuinely good.

But it was built in **layers over time** (`Logistics v2` phases P1–P12 are visible in the code), and the layers don't fully meet. The result is a system where the *happy path a developer tests* works, but several **normal user actions silently corrupt or drop data**, and a few whole features are **dead on arrival** because of a schema mismatch or a UI that sends the wrong field.

**The five things that will actually bite users/data today:**

| # | What breaks | Where | Severity |
|---|---|---|---|
| 1 | **Transfers created from the app never move real stock** and pollute the DB with junk rows — the create modal sets `productId = the typed product name`. | `TransferCreateModal.tsx:78` | **P0** |
| 2 | **Editing "In stock" on the Products list silently does nothing** — the value looks saved (optimistic) then reverts on refresh. | `ProductsScreen` → `PATCH /products` drops `stockQuantity` | **P0** |
| 3 | **Receiving a purchase order is not idempotent** — a double-tap / network retry adds the stock twice. | `server.js:8266` (fresh `grn.id` per call) | **P1** |
| 4 | **Marking a PO "Received" from the status control adds zero stock**; only the dedicated Receive form does. | `purchaseOrderStatus.js` (no stock code) | **P1** |
| 5 | **"Auto-create incoming delivery when a PO is confirmed" throws an FK violation every time** and is swallowed — the feature is dead. | `server.js:8180` writes `orderId="PO-…"` into a column FK'd to `Order(id)` | **P1** |

Plus a long tail of **oversell-with-no-warning**, **damaged goods counted as sellable**, **swallowed stock errors**, **two competing carts**, **two delivery-creation paths (one unlinked)**, **a fully-built recurring-schedules backend with no UI**, and a lot of **dead code**.

---

## 2. The system map — how the pieces are *supposed* to connect

```
                       ┌─────────────────────────────────────────────┐
                       │              stockService.js                 │
                       │   (SINGLE writer: Stock + StockMovement)     │
                       │   buckets: onHand · reserved · inTransit     │
                       │   available = onHand − reserved  (computed)  │
                       └───────▲──────────▲──────────▲──────────▲─────┘
                               │          │          │          │
        ACCEPTED→reserve       │          │          │          │  goods_receipt (+onHand)
        DONE→fulfillDirect     │          │          │          │
             ┌─────────────────┘          │          │          └───────────────┐
             │                            │          │                          │
        ┌────┴─────┐   create-delivery ┌──┴───────┐  │ transfer moves      ┌────┴───────┐
        │  ORDER   │◀──────────────────│ DELIVERY │  │ (src/dest)          │ PURCHASE   │
        │ 8 states │  DELIVERED→DONE    │ 7 states │  │                     │  ORDER     │
        └────┬─────┘  (sync both ways)  └────┬─────┘  │                     │ 6 states   │
             │                               │        │                     └────┬───────┘
             │ deliveryStatus MIRROR field   │        │                          │ CONFIRMED
             │ on Order (2nd copy)           │   ┌────┴─────┐                    │  ↓ (BROKEN)
             └───────────────────────────────┘   │ TRANSFER │              auto-incoming
                                                  │ 8 states │              delivery ✗FK
                                                  └──────────┘
             INVOICE ── orderId ──▶ ORDER      RETURN ──restock──▶ stock      ISSUE (discrepancies)
```

**Entities (Prisma models):** `Order`, `OrderStatusHistory`, `Delivery`, `DeliveryStatusHistory`, `DeliveryStaff`, `Transfer`, `TransferStatusHistory`, `Stock`, `StockMovement`, `PurchaseOrder`, `GoodsReceipt`, `Return`, `Issue`, `Route`, `RecurringSchedule`, `Invoice`, `Transport`.

**Status services (the "single source of truth" modules):**
- `orderStatus.js` — 8 states, transitions + stock side-effects (reserve/release/fulfill)
- `deliveryStatus.js` — 7 states, transitions + stock side-effects (dispatch/deliver) + POD
- `transferStatus.js` — 8 states, transitions + stock side-effects (reserve/dispatch/receive)
- `purchaseOrderStatus.js` — 6 states, transitions (⚠️ contains a **dead** stock helper)
- `returnService.js` — 6 states, restock on receipt

---

## 3. Orders — A→Z

### 3.1 How an order is born
Four creation paths, all landing in `orderRepo.create`:

| Path | Endpoint | Start status | Notes |
|---|---|---|---|
| B2B buyer places order | `POST /companies/:sellerId/orders` (`server.js:6616`) | `NEW` | Buyer must be a member of the **buyer** business; prices are **re-resolved server-side** (`repriceLineItems`, `forceBase:true`) so the buyer can't forge a price. |
| Seller creates manual/B2C order | same endpoint, no `buyerBusinessId` | `ACCEPTED` if a fulfillment location is given, else `NEW` | Seller may set custom prices. |
| Independent location order | `POST /locations/:locationId/orders` (`server.js:7126`) | `NEW`/`ACCEPTED` | **Not called by the app yet** — Enterprise location-mode feature. |
| Public storefront guest order | `POST /public/locations/:locationId/orders` (`server.js:15270`) | `NEW` | Prices **recomputed from DB**, guest never trusted; no in-app record for the customer. |

**Frontend reality (buyer):** there are **two B2B checkout entry points with unequal features** — `PlaceOrderScreen` has a promo-code field + notes, but the `BusinessProfileScreen` Cart-tab `handlePlaceOrder` has neither. Same order, two experiences.

### 3.2 The order state machine (`orderStatus.js:123`)
```
NEW → ACCEPTED | PENDING | CANCELED | REJECTED
ACCEPTED → ONGOING | PENDING | CANCELED
ONGOING → IN_REVIEW | DONE | PENDING | CANCELED
PENDING → ACCEPTED | ONGOING | CANCELED
IN_REVIEW → DONE | PENDING | CANCELED
DONE · CANCELED · REJECTED = terminal
```
Enforced server-side (`isValidTransition`), with audit history written atomically (`changeStatusWithHistory`, one `$transaction`). `PENDING/CANCELED/REJECTED` require a reason ≥2 chars. **This part is solid.**

### 3.3 Stock side-effects of order status (`orderStatus.js:381`)
- **ACCEPTED** → `reserve` (reserved +qty, onHand untouched) + low-stock alert
- **CANCELED** from an active state → `release` (reserved −qty), or `legacyRestoreOnHand` for pre-reservation-model orders
- **DONE** *with no delivery* → `fulfillDirect` (reserved −, onHand −). If a delivery exists, the delivery owns the physical decrement.

There is a careful **legacy-order detection** (does the order have an `order_reserve` ledger row?) so old orders that decremented onHand at accept-time aren't double-counted. Genuinely well thought out.

### 3.4 Order → Delivery linkage
- **Accepting a B2B order auto-creates a linked delivery**: `confirmOrder` (`orders.ts:161`) calls `updateOrderStatus(ACCEPTED)` then `createDeliveryFromOrder` → `POST /orders/:orderId/create-delivery` (`server.js:9503`). This path **is** linked and copies items/client. ✅
- **The manual "Assign delivery" button is NOT linked**: `OrderDetailsScreen` navigates to `CreateDelivery {orderId}`, but `CreateDeliveryScreen` never reads or sends `orderId` → produces an **orphan delivery** with no items and no order link. ❌ (see F-7)
- Order and Delivery are kept in sync by a `_orderDeliverySyncInProgress` Set guard across ~7 sites (`server.js:6764, 6846, 6903, 7000, 7302, 8862, 9552, 13165, …`). When a delivery goes **DELIVERED**, the order is auto-moved to **DONE** (`server.js:8871`).

### 3.5 Order data-model smell: **two status fields**
`Order` carries **both** `status` (the 8-state machine) **and** `deliveryStatus` (a 7-state mirror of the linked delivery, `schema.prisma:455`). The delivery's status is the real one; the order's `deliveryStatus` is a denormalized copy kept in sync by hand. Every sync site is a chance to drift.

---

## 4. Deliveries — A→Z

### 4.1 The delivery state machine (`deliveryStatus.js:72`)
```
Draft → Scheduled | Canceled
Scheduled → Ready | InTransit | Draft | Canceled
Ready → InTransit | Canceled
InTransit → Delivered | Issue
Issue → Draft | Canceled
Delivered · Canceled = terminal
```
Enforced server-side; audit history atomic. `Delivered` stamps `deliveredAt`, `deliveredBy`, and optional POD photo/signature.

### 4.2 Stock side-effects (`deliveryStatus.js:242`)
Only for **outgoing, non-transfer** deliveries with a `locationId`:
- **InTransit** → `dispatch` (reserved −, onHand −, inTransit +) — or `dispatchVisibility` (inTransit + only) for legacy orders
- **Delivered** → `deliver` (inTransit −)

**Incoming deliveries never move stock here** (`delivery.type !== 'transfer' && delivery.direction === 'outgoing'`). This is the intended design — incoming goods are supposed to arrive via the PO goods-receipt path. But it creates a trap (see F-4/F-5): if a user marks an **incoming** delivery "Delivered", **no stock is added**.

### 4.3 Roles & assignment
- Assignment via `PATCH /deliveries/:id/assign` (single driver, auto-advances Draft→Scheduled) **and** a parallel multi-staff system (`DeliveryStaff` rows, `POST /deliveries/:id/staff`). The two are bridged with "backward-compat" writes on every call (`server.js:13289`). Two systems doing one job.
- Driver-facing `MyDeliveriesScreen` lets the assigned user advance status **with no role check** (`useMyDeliveries.ts`), while the `StaffView` detail screen blocks a plain driver and only lets elevated roles act. **Same user, two different capability levels** depending on which screen they're on.

### 4.4 Frontend duplication & dead ends
- **Every delivery detail screen renders two timelines**: the real `DeliveryStatusTimeline` (from `/history`) *and* `OrderUpdatesTimeline`, which **fabricates** timestamps (`orderTimeMs + elapsed*0.25`). Misleading.
- The admin status modal **offers all 7 statuses regardless of the current state** — picking an invalid one gets a 400 back from the server (the machine is enforced backend-side), so it's a UX bug, not a data bug.
- POD is **optional even on the driver path** and is **never rendered back** anywhere — `podPhotoUrl`/`podSignatureUrl` are written and never read.

---

## 5. Transfers — A→Z (the most broken area)

There are **two transfer implementations** in the codebase:
1. **Legacy:** a `Delivery` row with `type:'transfer'`. The P9 cutover **hides these** from the deliveries list (`server.js:8413`) and **reroutes** any `type:'transfer'` create into the new entity (`server.js:8462`). The old delivery-based transfer stock path (`deliveryRepo.applyTransferStock`, `deliveryStatus.applyTransferStock`) is now **dead code** (no live callers).
2. **Current:** a first-class `Transfer` entity with its own 8-state approval lifecycle (`transferStatus.js`).

### 5.1 The transfer state machine (`transferStatus.js:42`)
```
Requested → Approved | Rejected | Canceled
Approved → Preparing | InTransit | Canceled
Preparing → InTransit | Canceled
InTransit → Received | Canceled
Received → Completed | Canceled
Completed · Rejected · Canceled = terminal
```

### 5.2 Stock side-effects (`transferStatus.js:114`)
- **Approved** → `transferReserve` (source reserved +)
- **InTransit** → `transferDispatch` (source reserved −, onHand −, inTransit +)
- **Received** → `transferClearInTransit` (source inTransit −) **+** `receiveGoods` (dest onHand +, using `quantityReceived` for partials)

This is a correct model — **but see F-1: from the UI it never runs against real products**, and F-8: the two Received-side moves are in **separate transactions**.

### 5.3 What's missing on transfers
- **No plan/paywall gate** on transfer create (`server.js:8987`) — deliveries require Pro (`canCreateDeliveries`), transfers require nothing.
- **No RBAC / separation of duties** — the requester can approve, dispatch, and receive their own transfer. No role checks anywhere in the transfer UI or routes.
- `Preparing` and `Canceled` have **no UI producer** (the detail screen's action list skips them), so they can only arrive from the backend and then strand with no button to move them.

---

## 6. Stock / inventory engine — the spine

`stockService.js` is the **single writer**. Every mutation:
- runs in one `prisma.$transaction`,
- appends a `StockMovement` ledger row per (product, bucket),
- clamps every bucket at `Math.max(0, …)` (never negative),
- is **idempotent** via the ledger's `@@unique([refType, refId, phase, productId, bucket])` — *when* a stable `refId`+`phase` is passed.

**Buckets:** `onHand` (physical), `reserved` (claimed by accepted orders/approved transfers), `inTransit` (dispatched, not received). `available = onHand − reserved`, computed, never stored. Products have **no** `stockQuantity` column — stock is always the sum of `Stock` rows.

This design is the strongest part of the system. The bugs below are all about **things that bypass it, feed it bad input, or call it non-idempotently** — not the engine itself.

### 6.1 Every stock-mutation site (verified)
| Trigger | Fn | Direction | Idempotency key |
|---|---|---|---|
| Order ACCEPTED | `reserve` | reserved + | phase=null (relies on state machine firing once) |
| Order CANCELED (new) | `release` | reserved − | phase=null |
| Order CANCELED (legacy) | `manualAdjust` | onHand + | none (legacy path) |
| Order DONE, no delivery | `fulfillDirect` | reserved −, onHand − | `order/…/fulfill` ✅ |
| Delivery InTransit | `dispatch` | reserved −, onHand −, inTransit + | `delivery/…/dispatch` ✅ |
| Delivery Delivered | `deliver` | inTransit − | `delivery/…/deliver` ✅ |
| Transfer Approved | `transferReserve` | src reserved + | `transfer/…/transfer_reserve` ✅ |
| Transfer InTransit | `transferDispatch` | src reserved −, onHand −, inTransit + | ✅ |
| Transfer Received (src) | `transferClearInTransit` | src inTransit − | ✅ |
| Transfer Received (dst) | `receiveGoods` | dst onHand + | `transfer/…/transfer_receive` ✅ |
| **PO goods receipt** | `receiveGoods` | onHand + | `po/<grn.id>/receive` — **grn.id is fresh each call → NOT idempotent (F-3)** |
| Return Received | `restock` | onHand + | double-guarded ✅ |
| Manual stock edit | `setOnHand` | onHand = abs | n/a (each edit distinct) |

### 6.2 Dead non-ledgered writers still exported (rewire hazard)
- `deliveryRepo.applyTransferStock` (`deliveryRepo.prisma.js:143`) — raw `tx.stock.upsert`, no ledger. No live caller.
- `purchaseOrderStatus.incrementStockForReceivedItems` (`purchaseOrderStatus.js:140`) — `repos.stockRepo.upsert`, no ledger. **Zero callers.**
Both bypass the ledger and would double-count if ever rewired in. Should be deleted.

---

## 7. Procurement → receiving → stock

`PurchaseOrder` lifecycle `DRAFT → SENT → CONFIRMED → PARTIALLY_RECEIVED → RECEIVED` (+ `CANCELED`). Receiving via `POST /purchase-orders/:poId/receive` (`server.js:8239`) creates a `GoodsReceipt`, increments stock, then flips PO status. Gated by `requireBusinessAdmin` + `canReceiveGoods` (Business plan). This is the **only correct stock-in path** — and it has F-3 (non-idempotent) and F-6 (damaged counted as sellable).

**The auto-incoming-delivery on CONFIRMED is dead (F-5).**

---

## 8. Findings (ranked)

### P0 — corrupts or silently drops data in normal use

**F-1 · Transfers from the UI never move real stock and write junk rows**
`TransferCreateModal.tsx:78` builds items as `{ productId: it.name, name: it.name, quantity }` — `productId` is the **typed product name**, not a real product id. When the transfer is Approved/Dispatched/Received, `stockService.applyProductMovement` looks up `Stock` by `(locationId, productId="Widget")`, finds none, and **creates a brand-new `Stock` row keyed by the product *name***. Net effect: the real product's stock is never touched, and the DB fills with garbage `Stock`/`StockMovement` rows. The entire new Transfer→stock integration is non-functional from the app. *Fix: add a real product picker (like `CreateDeliveryScreen` has) so `productId` is an actual id; reject non-existent productIds server-side in `POST /transfers`.*

**F-2 · Editing "In stock" on the Products list silently no-ops**
The inline stock editor on `ProductCard` routes through `ProductsScreen → updateProductServer → PATCH /companies/:c/products/:p {stockQuantity}`. The product PATCH handler never reads `stockQuantity` (and `Product` has no such column), so it's dropped. An optimistic local update makes it look saved until refresh, then it reverts. The correct path (`StockScreen` → `setStock` → `PATCH /locations/:loc/stock/:product`) exists but the Products-list editor doesn't use it. *Fix: point the inline editor at the location-stock endpoint, or remove the inline editor.* *(Related latent: the same PATCH handler destructures `stock`, `minOrderQty`, `images`, `categoryId`… none of which are `Product` columns — sending `stock` could 500.)*

### P1 — wrong stock numbers / dead features

**F-3 · Purchase-order receiving is not idempotent → double stock on retry**
`server.js:8266` mints a fresh `grn.id` on every POST, then passes `refId: grn.id, phase:'receive'` to `receiveGoods`. The ledger's idempotency key includes `refId`, so each retry has a *new* key and the guard never trips. A double-tap or network retry on "Submit Receipt" creates two GRNs and **adds the received stock twice**. The code comment claims idempotency, but it only holds for a reused `grn.id`, which never happens. *Fix: derive a stable `refId` (e.g. hash of poId + line set, or a client-supplied idempotency key) so retries dedupe.*

**F-4 · Marking a PO "Received" from the status control adds zero stock**
`CONFIRMED → RECEIVED` is an allowed transition and `changePurchaseOrderStatus` performs **no stock mutation** — only the dedicated `/receive` form does. An admin who flips status via the generic status control closes the PO with **no stock added**. *Fix: either block the direct RECEIVED transition (force it through /receive) or add the stock increment to the status service.*

**F-5 · "Auto-create incoming delivery on PO confirm" throws an FK violation every time**
On `CONFIRMED`, `server.js:8180` creates a delivery with `orderId: fullPO.id` (a `"PO-xxxx"` id). `Delivery.orderId` has a foreign key to `Order(id)` (`0_init/migration.sql:1243`, `ON DELETE SET NULL`). There is no `Order` row with a PO id, so the INSERT fails with a Postgres FK violation (23503), which is caught and logged as non-blocking (`server.js:8199`). **The incoming delivery is never created** — the feature is dead in production, and `getByOrderId(PO.id)` never finds anything either. *Fix: add a `purchaseOrderId` column to `Delivery` (nullable, FK to PurchaseOrder) instead of overloading `orderId`, or drop the auto-delivery and rely on the goods-receipt flow.*

**F-6 · Damaged units are counted as sellable on-hand**
`GoodsReceiptScreen` collects `damagedQty`, but `receiveGoods` reads quantity as `quantity ?? receivedQty ?? …` (`stockService.js:27`). The receive payload has no `quantity`, so the full `receivedQty` (which includes damaged) is added to `onHand`. Receive 100 with 10 damaged → 100 sellable added, not 90. *Fix: subtract `damagedQty`, or route damaged units to a separate bucket/return.*

**F-7 · Manual "Assign delivery" from an order produces an orphan delivery**
`OrderDetailsScreen` navigates `CreateDelivery {orderId}`, but `CreateDeliveryScreen` never reads `route.params.orderId` and never sends it (verified: zero `orderId` references in the file). The created delivery is **unlinked** (no order, no prefilled items/client), and `CreateDeliveryData.orderId` is never populated by any UI. Only the *auto* path (`confirmOrder → createDeliveryFromOrder`) links correctly. *Fix: thread `orderId` (and prefill items) through `CreateDeliveryScreen`, or remove the manual entry point in favor of the auto path.*

**F-8 · Oversell with no warning (reservation has no availability guard)**
`reserve` (`stockService.js:103`) only adds to `reserved` and clamps at 0 — nothing rejects an ACCEPTED order that exceeds available stock. `available = onHand − reserved` silently goes negative; the low-stock alert is post-hoc. Two orders can each "accept" the last unit. Same for transfers (no available check before dispatch). *Fix: check `getAvailable()` before reserving and either block or explicitly allow backorder with a flag.*

### P2 — reliability, UX, and correctness-adjacent

**F-9 · Stock side-effects are swallowed on error** — every caller wraps `stockService` in a try/catch that only logs (`orderStatus.js:418`, `transferStatus.js:159`, `deliveryStatus.js:264`, `returnService.js:82`). A status change "succeeds" even if its inventory move throws, leaving status and ledger divergent with nothing surfaced. *Consider surfacing a soft warning or a reconciliation flag.*

**F-10 · Transfer receive: source-clear and destination-receive are two separate transactions** (`transferStatus.js:132` vs `:149`). Ledger phases make retries idempotent, but a crash between them leaves inTransit decremented at source with nothing added at destination until re-run. *Consider one cross-location transaction.*

**F-11 · GRN write + stock increment + PO status flip are three non-atomic awaits** (`server.js:8265 / 8280 / 8310`). A crash mid-sequence leaves a GRN with no stock, and re-receiving needs a fresh GRN (compounds F-3).

**F-12 · Two competing carts on the storefront** — `BusinessProfileScreen` renders the *legacy* cart list while each row mutates the *B2B* order store; removing/editing an item updates one and not the other, so removed items linger or totals disagree.

**F-13 · `order_update` push notification is a dead end** — `NotificationsScreen` has `case 'order_update': // no OrderDetail screen yet`, but `OrderDetails` exists, a deep link is configured, and the payload carries `orderId`. Tapping an order push lands nowhere.

**F-14 · Reason-required transitions never prompt** — cancel/reject always send a hardcoded reason (`'Updated by seller'`, `'Rejected by seller'`), so the audit trail's reasons are meaningless.

**F-15 · `removeDelivery` never updates the store and the screen doesn't close after delete** — `deleteDelivery` resolves to `void`, so `if (result)` is always false; the deleted row lingers until refetch and `navigation.goBack()` is gated on the falsy result.

**F-16 · Recurring schedules have a full backend and no UI** — `RecurringSchedule` model, CRUD routes (`server.js:9363`), and an hourly runner (`server.js:15832`) all exist, but **no frontend calls `recurring-schedules`**. The feature is unreachable from the app.

**F-17 · Buyer can't cancel/modify/reorder/dispute** — outgoing `OrderDetails` offers only "Message supplier"; no buyer-side cancel even while `NEW`, no reorder, no dispute anywhere.

**F-18 · No delivery-date / fulfillment-location / MOQ / stock validation at checkout** — B2B `placeOrder` omits all location fields; no min-order enforcement; no stock check.

**F-19 · Dead code to remove** — `deliveryRepo.applyTransferStock`, `purchaseOrderStatus.incrementStockForReceivedItems`, `DeliveryActionsModal`, the client-side order-transition mirror (`orderStatus.ts:160-283`), several order-store actions, and unused service methods (`assignOrder`, `fetchOrder`, `unassignDelivery`, `getDeliveryStaff`, `updateTransfer`, `deleteTransfer`).

---

## 9. Cross-cutting observations

1. **Two status vocabularies for one shipment.** Order uses `NEW/ACCEPTED/ONGOING/…`; Delivery uses `Draft/Scheduled/…`; and the Order carries a *third* copy (`Order.deliveryStatus`) synced by hand across ~7 guarded sites. This is the single biggest source of fragility. A future consolidation (delivery status is derived, never stored on the order) would remove a whole class of drift bugs.

2. **Two of everything from the layered build:** two carts, two transfer implementations (one dead), two delivery-creation paths (one unlinked), two driver capability models, two timelines (one fabricated), two stock-write layers (one dead). Each pair is a "we built v2 but left v1 in" situation.

3. **The ledger is good; the callers are the problem.** Every P0/P1 above is a *caller* feeding bad input (F-1, F-2, F-6), calling non-idempotently (F-3), or skipping the ledger entirely (F-4, F-5) — not a flaw in `stockService`. Fixing the callers is high-leverage.

4. **Transfers are the least-finished:** no plan gate, no RBAC, fake product ids, unreachable states. It reads like the newest, least-exercised module.

---

## 10. Recommended sequence (ideas)

**Immediately (data integrity):**
1. F-1 — real product picker in `TransferCreateModal`; server-side reject unknown `productId` on `POST /transfers`.
2. F-2 — repoint the Products-list stock editor at the location-stock endpoint (or remove it).
3. F-3 — stable idempotency key for PO receiving.
4. F-5 — add `Delivery.purchaseOrderId` (or drop the auto-delivery); stop writing a PO id into an Order FK.

**Next (correctness & trust):**
5. F-4 — force RECEIVED through `/receive`, or add the stock increment to the status service.
6. F-6 — subtract damaged units from sellable on-hand.
7. F-8 — availability check before reserve/dispatch (block or explicit backorder).
8. F-9 — stop swallowing stock errors silently; surface a reconciliation flag.

**Then (finish the half-built):**
9. F-7 — link manually-created deliveries to their order.
10. F-16 — build the recurring-schedules UI (backend is ready) or remove it.
11. Transfers — add plan gating + RBAC (separation of duties on approve/receive).
12. POD — make it viewable, add recipient name; consider required-on-delivered.

**Cleanup (lower risk, reduces future bugs):**
13. F-19 — delete the dead writers and dead UI.
14. F-12/F-13/F-14/F-15 — the frontend polish bugs.
15. Consolidate the Order/Delivery status duplication (bigger, but removes a class of bugs).

---

*Method note: three read-only explorer agents swept the frontend order flow, the frontend deliveries/transfers flow, and the full-stack stock/procurement path; the backend state-machines, schema, migrations, and every in-scope `server.js` route were read directly. F-5 was found by cross-checking the PO auto-delivery code against the `Delivery.orderId` foreign key in `0_init/migration.sql`.*
