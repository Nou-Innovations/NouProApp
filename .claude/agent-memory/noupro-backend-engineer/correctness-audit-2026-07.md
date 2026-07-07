---
name: Correctness/Reliability Audit July 2026
description: Confirmed correctness, concurrency, money-math, and reliability findings from the read-only backend audit (state machines, transactions, sockets, scheduler)
metadata:
  type: project
---

Read-only correctness audit (2026-07-02) of backend/server.js (14.5K lines), services, repos, schema. Key confirmed findings:

**Concurrency / race conditions (the big theme):**
- `_orderDeliverySyncInProgress` is an in-memory `Set` (server.js:197). It resets on restart and is NOT shared across Render instances. It only guards *re-entrant* sync within one process — it does NOT prevent two concurrent PATCH requests on the same order/delivery. Order↔Delivery sync + stock moves can double-fire under concurrency or multi-instance.
- Stock `reserve`/`release` use `phase: null` → NOT ledger-guarded (stockService.js:103-109). Relies entirely on the state machine firing exactly once. Two concurrent ACCEPT transitions on the same order = double reserve. The status-machine read-then-write in `changeOrderStatus` (orderStatus.js:329-380) is NOT atomic (getById, then validate, then changeStatusWithHistory in a separate txn) — the transition check and the write are in different transactions, so concurrent requests both pass validation.
- Invoice payment: `POST .../payments` reads invoice.paidAmount, validates `currentPaid + amount <= total`, then creates Payment + recompute — all non-atomic (server.js:8604-8650). Concurrent payments can overshoot the balance.

**Money math:** invoice totals are client-supplied on the base path (safeBody spreads totalAmount/subtotal/taxAmount from req.body, server.js:8827-8830) — only repriced when a price list applies. No server-side recompute of totals from line items otherwise → client can send inconsistent totals. Float money everywhere (schema uses Float, not Decimal) — rounding drift risk.

**Peach webhook (CRITICAL, still unfixed):** POST /api/webhooks/peach (server.js:14253) does NO signature verification. Anyone who POSTs a forged `{payload:{checkoutId, result:{code}}}` for a known/guessed checkoutId flips a Payment to SUCCEEDED → activates a subscription for free. Matches AUDIT.md P0.

**Scheduler:** both `setInterval`s (recurring hourly, order-automation daily) run in-process on EVERY instance (server.js:14470-14486). Multi-instance = duplicate delivery minting + duplicate push alerts. recurringService.runDue advances nextRunAt AFTER minting but not atomically, and getDue has no locking → two instances both mint.

**Error envelope:** global handler exists (express-async-errors + app.use err handler at 14456) — good. But many list endpoints filter/sort in JS after loading ALL rows (getByBusinessId with no limit for invoices/deliveries). `remove()` in repos swallows errors and returns false (silent delete failure).

**Duplication:** two near-identical ~120-line chat message-send handlers (company-scoped 9558, user-scoped 10214) — must be kept in sync by hand; already diverge (company block lacks invoice/estimate/video_call type handling that the user block has).

See full report delivered to Arnaud for the ranked list + fixes.
