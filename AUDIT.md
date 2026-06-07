# NouPro — Full App Audit & "What's Left" Documentation

**Date:** 2026-06-04
**Scope:** Full-stack audit (frontend, backend, database, API contract, config/deploy/security) of the NouPro app to document everything left to make it work properly.
**Method:** Five parallel deep audits across layers, cross-referenced and de-duplicated.

> **How to read this doc (for Arnaud):** Items are grouped by **priority**, not by where they live in the code. Each item says **what's wrong**, **why it matters**, and **what to do**, with the exact `file:line` so Claude can jump straight to the fix. Start at the top (P0) and work down — the P0 list is small and high-impact. Tackle one item per Claude session for clean, reviewable changes.

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [What Actually Works Well](#what-actually-works-well-dont-touch-these)
- [P0 — Ship-Blockers (security, money, data integrity)](#p0--ship-blockers)
- [P1 — Broken Features (live bugs users will hit)](#p1--broken-features)
- [P2 — Incomplete Features & Config Gaps](#p2--incomplete-features--config-gaps)
- [P3 — Polish, Cleanup & Tech Debt](#p3--polish-cleanup--tech-debt)
- [Recommended Fix Roadmap](#recommended-fix-roadmap)
- [Corrections to Previous Assumptions](#corrections-to-previous-assumptions)

---

## Executive Summary

The **core of NouPro is in good shape**: authentication, 2FA, the order / purchase-order / delivery / invoice state machines, chat, and multi-tenant company scoping are solid and consistently enforced. The app is much further along than the old notes suggested (cart, orders, feed, and connections are now fully wired — see [Corrections](#corrections-to-previous-assumptions)).

The problems cluster in **five areas**:

1. **Payments are dangerous.** The Peach webhook accepts forged requests (anyone can grant themselves a paid plan or mark invoices paid), and recurring billing never actually charges anyone's card. This is the single most important thing to fix.
2. **The database migration history is broken.** Only 10 of 41 tables exist in migrations; `db:reset` will produce a broken database. Production only works because the schema was applied by hand once.
3. **A handful of live 404 bugs** break real features today — message editing, business-level role changes, and several "Upgrade"/"See all"/"Explore" buttons that point at screens that don't exist.
4. **Unfinished features** still surface in the UI (invoice PDF export, invoice template/permission settings, "add supplier product", public storefront ordering).
5. **Production hardening gaps** — uploaded images vanish on every deploy, no `helmet` security headers, email/payments silently no-op when env vars are misconfigured, and some paywalls are enforced only on the frontend.

None of these are deep architectural problems. They're a focused, fixable list.

---

## What Actually Works Well (don't touch these)

So you know what *not* to worry about:

- **Auth & 2FA** — JWT (30-min) with single-flight 401→refresh on the client, fail-fast on missing secrets, full TOTP 2FA with hashed backup codes, tokens stored in `expo-secure-store`. Rate limits on all sensitive endpoints.
- **State machines** — Order (`orderStatus.js`), Purchase Order (`purchaseOrderStatus.js`), Delivery (inline in `server.js`), and Invoice (inline) state machines are complete and cover all enum values.
- **Multi-tenant safety** — Almost all data access is correctly scoped by `businessId`/`locationId` via membership checks (not just JWT claims). The exceptions are listed in P0.
- **Subscription enforcement (mostly)** — `deriveCapabilities()` (`backend/server.js:350`) is enforced at 40+ write endpoints. Genuinely thorough. (A few leaks listed in P2.)
- **API base-URL / envelope / socket wiring** — Correct end-to-end; Socket.IO event names line up between client and server (one minor unused event).
- **Sentry (backend)** — Fully wired: init, global handlers, and an Express error middleware.
- **Push pipeline (direct messages)** — Token registration → store → Expo send works for order events and direct chat messages.

---

## P0 — Ship-Blockers

> These can lose money, leak data, or corrupt the database. Fix before any real launch.

### P0-1. Peach payment webhook accepts forged requests 🔴 SECURITY
- **Where:** `backend/server.js:11947` (`POST /api/webhooks/peach`)
- **What's wrong:** The handler trusts the incoming POST body completely — **no signature/HMAC verification**. It reads `event.payload.result.code` and `checkoutId` straight from the request. A forged POST with a valid-looking `checkoutId` and a success code (`000.100.110`) will mark a `Payment` as `SUCCEEDED` → **activate a paid subscription** (`server.js:12007`) or **mark an invoice `PAID`** (`server.js:12032`).
- **Why it matters:** Anyone on the internet can give themselves ENTERPRISE for free, or mark invoices paid. Direct revenue + data-integrity risk.
- **What to do:** (1) Verify the Peach webhook signature. (2) Don't trust the webhook body — re-fetch the authoritative result from Peach via `getCheckoutResult(checkoutId)` (already implemented in `peachPayments.js`) before mutating any state.

### P0-2. Recurring subscription billing never charges the card 🔴 REVENUE
- **Where:** `backend/src/services/peachPayments.js:115` (`chargeStoredCard`) — **has zero callers anywhere in the codebase.**
- **What's wrong:** The card token (`peachCardRegistrationId`) is stored and `currentPeriodEnd` is set, and the app even sends "renews on X" notifications (`server.js:11129`) — but **nothing ever charges the card**. There is no scheduler (`grep` for `setInterval`/`node-cron`/`cron.schedule` → nothing) and no renewal automation endpoint. Subscriptions silently lapse at `currentPeriodEnd`.
- **Why it matters:** You collect a first payment, promise renewal, and then never bill again. Recurring revenue is silently zero.
- **What to do:** Add a renewal job that finds businesses past `currentPeriodEnd` and calls `chargeStoredCard`, exposed as an automation endpoint protected by `AUTOMATION_API_KEY` (mirror the existing order-automation pattern at `server.js:11675`), and hit it from an external cron (Render Cron Job / cron-job.org).

### P0-3. Database migration history is broken — `db:reset` will destroy the DB 🔴 DATA
> ✅ **RESOLVED 2026-06-04.** Migrations were squashed into a single complete baseline
> `backend/prisma/migrations/0_init/migration.sql` (41 tables, 26 enums); the 13 old migrations are
> archived in `backend/prisma/_archive_migrations_pre-rebaseline/`. Production `_prisma_migrations`
> was reconciled to record only `0_init` (real schema/data untouched — confirmed by a zero-diff
> `prisma migrate diff` before and after). A `guard-not-prod.js` now blocks `db:reset`/`seed` from
> ever hitting production. Remaining optional step: a from-empty `migrate deploy` + `seed` run on a
> throwaway DB to confirm the dev reset workflow end-to-end.
- **Where:** `backend/prisma/migrations/0001_baseline/migration.sql` (intentionally empty) vs `backend/prisma/schema.prisma` (41 models).
- **What's wrong:** The baseline migration is empty (schema was applied by hand via the Supabase SQL Editor). Migrations only create **10 of 41 tables**. The other **31 tables have no `CREATE TABLE` in any migration** — including every core table (User, Business, Order, Product, Invoice, Chat, Task, etc.).
- **Why it matters:** `npm run db:reset` (documented in CLAUDE.md) drops the DB, replays migrations → ends up with only 10 tables → `seed.js` immediately fails calling `prisma.user.create`. `prisma migrate dev` is also unsafe (Prisma will want to reset). **Production only works because it still carries the original hand-applied schema.** Any DB reset = broken app.
- **What to do:** Regenerate a real baseline: use `prisma migrate diff` against the live DB to produce a complete `0001_baseline/migration.sql` with all 41 tables + enums, then mark it applied. Until then, **treat `db:reset` and `prisma:migrate` as broken** — add a warning to CLAUDE.md / package.json.

### P0-4. Unauthenticated routes leak business data 🔴 SECURITY
- **Where (all in `backend/server.js`):**
  - `GET /api/businesses` (`:2250`) — no auth, and unlike the sibling `GET /api/companies` (`:2487`) it does **not** strip `subscriptionTier` / `settings`. Anonymous competitor + subscription-tier enumeration.
  - `GET /api/companies/:companyId/locations` (`:2976`) — no `requireAuth`; exposes all locations (incl. internal `publicDisabledReason` hints) to anyone.
  - `GET /api/companies/:companyId/products/:productId` (`:3339`) — no auth; any product readable by ID, bypassing the authenticated price-privacy path.
  - `GET /api/businesses/:businessId/followers` (`:2885`) and `/people` (`:2941`) — no auth; expose follower/staff lists publicly.
- **What to do:** Add `requireAuth` (or `optionalAuth` + field-stripping) and apply the same `subscriptionTier`/`settings` stripping that `/api/companies` already uses.

### P0-5. Uploaded images vanish on every deploy 🔴 DATA
- **Where:** `backend/server.js:298` (multer `diskStorage` → local `uploads/`), served via `express.static('uploads')` (`server.js:244`), upload endpoint `:10604`.
- **What's wrong:** Files are written to the local filesystem. **Render's filesystem is ephemeral** — it's wiped on every redeploy/restart. All uploaded product images and avatars eventually 404.
- **What to do:** Move uploads to object storage (Supabase Storage — you already use Supabase — or S3). Store the returned public URL instead of a host-derived local path.

---

## P1 — Broken Features

> These are live bugs a user will hit today. Mostly small, high-value fixes.

### P1-1. Message editing 404s for every user
- **Where:** `src/features/inbox/inbox.service.ts:356` and `:364` (called from `ChatScreen.tsx:506-508`).
- **What's wrong:** Both call `apiClient.patch('/api/companies/...')` / `'/api/users/...')`, but the axios `baseURL` **already ends in `/api`** → request goes to `…/api/api/...` → 404.
- **Fix:** Remove the leading `/api` from both URLs (one line each).

### P1-2. Business-level role changes 404
- **Where:** `src/features/team/team.service.ts:114` calls `PATCH /companies/:companyId/users/:userId`.
- **What's wrong:** That backend route **does not exist** (only `/users/:id/invite|accept|decline|resend-invite` do). This is the fallback path used when no `locationId` is supplied, so business-level role edits fail.
- **Fix:** Add the route on the backend, or repoint the frontend to an existing route.

### P1-3. Forwarded chat messages send no push (and would push the sender)
- **Where:** `backend/server.js:8150` and `:8799`.
- **What's wrong:** Both call `sendPushToOfflineParticipants(targetChat, savedMessage, userId)`, but the function signature is `(chatId, senderName, messagePreview, excludeSenderId)` (`server.js:11777`). So a chat *object* is passed where a `chatId` string is expected → `repos.chatRepo.getById(chatObject)` fails → the `.catch(()=>{})` swallows it. And `excludeSenderId` is `undefined`, so if it didn't throw, the sender would get pushed too. Normal send-message paths (`:7919`, `:8567`) call it correctly.
- **Fix:** Correct both call sites to `(chatId, senderName, preview, senderId)`.

### P1-4. Broken navigation routes (dead buttons)
All of these `navigate(...)` calls target screens **not registered** in `App.tsx`:
- **`navigate('Subscription')`** — `src/features/deliveries/screens/CreateDeliveryScreen.tsx:1042`. This is the **delivery paywall's "Upgrade" button** → tapping it does nothing. **Directly blocks monetization.** Fix → `'SubscriptionPlans'`.
- **`navigate('ProductsSearch', …)`** — `src/features/products/components/ProductSearchResultsList.tsx:145,177,214,246`. All four "See all products/brands" buttons are dead. Fix → register a `ProductsSearch` screen or repoint to the products list.
- **`navigate('Explore')`** — `src/modes/personal/screens/HomeScreen.tsx:281` and `src/features/connections/screens/ConnectionsScreen.tsx:324`. Empty-state CTAs do nothing. Fix → `'ExploreOverlay'`.
- **CompanyEdit "Upgrade plan" button** — `src/features/company/screens/CompanyEditScreen.tsx:554` shows a placeholder `Alert.alert('Upgrade Plan', ...)` instead of opening the real flow. Fix → `navigation.navigate('SubscriptionPlans')`.

### P1-5. Invoice PDF export is broken end-to-end (and paywalled)
- **Where:** `src/features/invoices/invoices.service.ts:94-96` throws `'PDF export is not yet available'`; surfaced at `InvoiceDetailsScreen.tsx:324-326`. It's also paywalled (`checkPaywall('export_invoice_pdf')` at `InvoiceDetailsScreen.tsx:278`) with **no backend enforcement**, and **no PDF library is installed** (`expo-print` absent from `package.json`).
- **What's wrong:** The feature is broken (throws), unenforced (paywall is frontend-only), and has no implementation path (no PDF lib, no backend endpoint).
- **Fix (pick one):** Either implement it properly — install `expo-print`, generate the PDF client-side (or add a backend PDF endpoint + server-side gate) — **or** hide the PDF button until it's ready, so users don't hit a dead feature.

### P1-6. Password-reset emails silently never send when email is misconfigured
- **Where:** `backend/server.js:66` (`getEmailTransporter` returns `null` if `EMAIL_*` unset) → `sendPasswordResetEmail` no-ops, but the endpoint still returns success (`server.js:1305`).
- **What's wrong:** If the production `EMAIL_HOST/USER/PASSWORD` aren't set, users request a reset, see "email sent", and **no email ever arrives**. Same applies to any invite emails.
- **Fix:** Verify email env is set in production; make the endpoint fail loudly (or log a hard warning) when no transporter is available rather than reporting success.

### P1-7. Refresh-token rotation is dropped (latent auth lockout)
- **Where:** `src/shared/services/api.ts:153` and `:351`.
- **What's wrong:** The backend `/auth/refresh` (`server.js:1361`) **rotates** the refresh token and returns `{ token, refreshToken }`, and enforces a `tv` (tokenVersion) claim. Both client refresh paths call `setTokens(tokenData.token)` and **ignore the new `refreshToken`** (even though `setTokens` accepts it as a 2nd arg). Works today, but the moment the backend invalidates prior refresh tokens or bumps `tv`, users get logged out unexpectedly.
- **Fix:** `setTokens(tokenData.token, tokenData.refreshToken)` in both places.

### P1-8. Public storefront can browse but not buy
- **Where:** `backend/server.js:11620` (`POST /api/public/locations/:locationId/orders`) returns a hard **501 Not Implemented**.
- **What's wrong:** The public catalog (`server.js:11587`) lets anonymous users browse products, but order creation is a stub.
- **Fix:** Implement public order creation (create Order + guest customer + stock decrement), or remove the storefront entry points until it's ready.

---

## P2 — Incomplete Features & Config Gaps

> Features that are half-built or behave subtly wrong, plus deployment/config issues.

### Incomplete UI features
- **Invoice creation "Coming Soon" sections** — `src/features/invoices/screens/CreateInvoiceScreen.tsx:779-790` (Template Settings) and `:821-832` (Permissions & Options) are rendered but disabled. The logo/color/footer fields exist but aren't persisted. Either finish persistence or remove the sections.
- **Supplier "Add Product" stub** — `src/features/procurement/screens/SupplierProductsScreen.tsx:78` shows `Alert.alert('Add Product', '…coming soon.')`. Implement or remove the button.
- **BusinessProfile shows fake business hours & map** — `src/features/profile/screens/BusinessProfileScreen.tsx:33-47` (`mockBusinessHours`, `mockMapLocation`), used unconditionally at `:127,:130` (**not** DEV-gated). Public business profiles always show Mon–Fri 9-6 and a default Mauritius map pin. Wire to real data.
- **Chat reads non-existent user fields** — `src/features/inbox/screens/ChatScreen.tsx:209-210,547-548,672-673` read `currentUser.displayName` / `currentUser.profileImage`, which don't exist on the `User` type → always `undefined` → falls back to 'You' / blank avatar. Use the real `User.name` and avatar field.
- **"Not available yet" alerts** — Team Report (`src/features/team/screens/TeamManagementScreen.tsx:248`) and Location profile switch (`src/features/locations/screens/LocationsScreen.tsx:163`). Implement or remove.
- **14 sidebar "Coming Soon" items** — `src/navigation/SidebarContent.tsx:160-193` (Transfers, Categories, Brands, Stock, Price lists, Visibility, Collections, Recipes, Discounts, Estimates, Scan invoice, Customers, Analytics, Variance) route to a generic `ComingSoonScreen`. These are intentional placeholders — decide which are roadmap vs. should be hidden.
- **CreateProduct: existing images have no action** — `src/features/products/screens/CreateProductScreen.tsx:252` has empty `onPress={() => {}}` (can't view/remove existing images).
- **Feedback "Add Suggestion" is unfinished** — `src/features/feedback/screens/AddSuggestionScreen.tsx:51` (the `POST /feedback/suggestions` call is commented out; no backend route exists). Implement endpoint + uncomment, or remove the screen.

### Subscription entitlement leaks (gated on frontend, NOT enforced on backend)
- **Business-specific pricing** — `canUseBusinessSpecificPricing` is defined in backend `deriveCapabilities` but **never gates any pricing-write endpoint**. A crafted request can set business-specific prices on a non-entitled plan. Add server-side enforcement.
- **Feed publishing** — `publish_on_feed` / `publish_products_on_feed` exist only on the frontend (`src/shared/types/subscription.ts`); there is no backend capability. Feed visibility for Business+ is frontend-trust-only.
- **Duplicated source of truth** — Backend `deriveCapabilities` (`server.js:350`) and frontend `PLAN_FEATURES`/`PLAN_LIMITS` (`src/shared/types/subscription.ts:79-251`) are maintained independently and will drift (e.g. `maxListedProducts` 10/50/150 lives in both). Generate the frontend table from the backend, or share one JSON contract.

### Config / deploy
- **No `helmet`** on the backend — zero security headers (HSTS, X-Content-Type-Options, X-Frame-Options). Add `app.use(helmet())`. One line, high value.
- **Peach env var names mismatch** — code reads `PEACH_API_URL`, `PEACH_SECRET_TOKEN`, `PEACH_MERCHANT_ID`, `PEACH_RECURRING_ENTITY_ID` (`peachPayments.js:14-18`); `.env.example` documents `PEACH_ACCESS_TOKEN`, `PEACH_BASE_URL`. Only `PEACH_ENTITY_ID` overlaps. Misconfig silently falls back to test/empty creds. Align names and document all five.
- **No deep-link config** — `app.json` has no `scheme`, and `App.tsx:358` `NavigationContainer` has no `linking` prop. (CLAUDE.md's claim that deep-link config exists is inaccurate.) Password-reset/universal links and `noupro://` links won't resolve. Add a scheme + linking config.
- **`expo-updates` OTA is inert** — eas.json sets `channel` for preview/production, but `app.json:85-87` `updates` block lacks `url` and `runtimeVersion`, so `eas update` won't deliver. Either finish OTA config or drop the channels.
- **`expo-notifications` plugin not registered** in `app.json` `plugins`; no Android-13 `POST_NOTIFICATIONS` permission, no custom notification icon/color. Push prompts may behave inconsistently on Android 13+.
- **Missing `assets/favicon.png`** referenced at `app.json:48`.
- **No committed frontend `.env.example`** — new builds have nothing to copy. `EXPO_PUBLIC_SOCKET_URL` (used in `chat.ts:26`) is undocumented everywhere.
- **No frontend crash/error monitoring** — backend has Sentry, the React Native app has none. Client crashes are invisible. Add Sentry React Native.

### Data layer / push
- **Dual push-token systems** — `DeviceToken` table (written at `server.js:11740+` via `notifications.ts`, whose `usePushNotifications` hook is **never mounted**, and whose calls also have the `/api/api` double-prefix bug) vs `PushToken` table (the live path via `/push-tokens/register`, read by `pushService.js:31`). `DeviceToken` writes never drive a notification. Delete the dead system or consolidate to one.
- **No Expo push-receipt handling** — `pushService.js` never checks send tickets/receipts, so dead tokens (`DeviceNotRegistered`) accumulate forever. Add receipt handling to prune them.
- **Dual inventory source of truth** — `Product.stockQuantity` (`schema.prisma:249`) vs `Stock.qtyOnHand` (`schema.prisma:302`). No indication which is authoritative, and `Stock` has no `createdAt`/`updatedAt` for auditing. Pick one source of truth; add timestamps to `Stock`.
- **`LocationProduct` table is unused** — fully defined (`schema.prisma:280-295`) with 0 Prisma references; location pricing/availability overrides it was meant to provide silently don't happen. Implement or drop.
- **`orderAutomation` Task 4 unfinished + no scheduler** — `src/services/orderAutomation.js:285` `// TODO: send notifications for stuck pending orders` (computed but never sent). Also, all automation depends on an external cron hitting `/api/automation/orders` — no in-app scheduler exists. Set up the cron and finish Task 4.
- **`/api/feed` masks errors** — `server.js:10696` returns `{success:true, data:[]}` (HTTP 200) on any error, so a DB outage looks like an empty feed. Return 500 instead. (Several `catch (_) {}` swallows around audit/event writes at `server.js:5871-6420` similarly hide failures.)
- **Seed data gaps** — `seed.js` doesn't create Task, Supplier/PO/PR/GRN (entire procurement module), Stock, Payment, Skill/Experience/Education, RoleRequest, Transport, or any non-FREE subscription tier. Those flows have no data to test against. Add representative seed rows, including one PRO/BUSINESS business to exercise feature-gating.

---

## P3 — Polish, Cleanup & Tech Debt

> Won't break the app, but worth a cleanup pass.

> ✅ **P3 cleanup pass done 2026-06-07.** All items below were addressed. Safe defaults were
> taken on the risky/ambiguous ones: indexes-only (no FKs), the `PaymentStatus` enum values were
> kept (a Postgres enum-value drop is destructive on the shared prod DB), the location-mode
> endpoints were kept + documented (they're planned features, not dead code), and the full
> `authAPI` envelope refactor + full tsc burndown were deferred. Status tag on each line below.

- **TypeScript errors** — ~193 `tsc --noEmit` errors (mostly strictness). Won't crash at runtime but mask real bugs (e.g. the Chat `User`-field mismatch in P2). Worth burning down gradually. — 🟡 **PARTIAL:** the structural `TS1117` duplicate-key errors in `icons.tsx` were cleared (193 → **176**). The remaining ~176 are genuine type mismatches (many overlap P2) left as ongoing burndown.
- **Stray debug logging** — 38 `console.log` in `src/`, **344** `console.*` in `server.js`. Strip or gate for production; consider a structured logger on the backend. — ✅ **DONE:** frontend uses `babel-plugin-transform-remove-console` (strips all but `error`/`warn` from prod builds); backend added a small leveled logger (`backend/src/utils/logger.js`) and all `console.*` in `server.js` + `src/**` were migrated to it (debug/info silent in production, warn/error always on).
- **Dead code:**
  - `invoicesAPI` / `productsAPI` objects in `src/shared/services/api.ts:476-522` — never imported, and several of their paths don't exist on the backend. Delete (they're a trap). — ✅ **DONE:** deleted (0 call sites).
  - Empty `backend/src/repositories/memory/` dir + the `DATA_SOURCE=memory` docs in CLAUDE.md — the capability doesn't exist (`getDataSource()` hard-returns `'prisma'`). Delete the misleading docs or implement it. — ✅ **DONE:** dir deleted, CLAUDE.md docs corrected, and `orderAutomation.js` default changed from `'memory'` → `'prisma'`.
  - Unused enum values: `PaymentStatus.DUE_TODAY/.DISPUTED/.PARTIALLY_REFUNDED/.PAYMENT_PENDING/.PENDING_CONFIRMATION` (0 references). — ⬜ **KEPT (documented):** dropping a Postgres enum value requires recreating the type — destructive on the shared prod DB. Annotated as unused in `schema.prisma`; revisit in a clean migration window.
- **Duplicate components:**
  - `src/shared/components/ui/PaywallModal.tsx` and `src/features/subscription/components/PaywallModal.tsx` are byte-identical. Consolidate. — ✅ **DONE:** deleted the `subscription/` copy (the barrel already re-exported the shared one).
  - `src/shared/utils/icons.tsx:363+` — duplicate object keys (`TS1117`) silently overwrite earlier mappings. — ✅ **DONE:** 17 duplicate keys removed (behaviour-neutral; each pointed at the same icon).
- **Mock fallbacks not always DEV-gated** — `TeamManagementScreen.tsx:142-146` shows fake locations (`Downtown`/`Westside`/`Northgate`) on **any** API error (not DEV-gated). `imageService.ts:26,301` uses an in-memory `mockImageStorage` map — verify image uploads actually persist to a backend/CDN (ties into P0-5). — ✅ **DONE:** fake locations are now `__DEV__`-gated (empty list in prod); the dead `mockImageStorage` map was removed (uploads already persist via Supabase Storage per P0-5).
- **Unconsumed real-time event** — backend emits `unread_update` (2 sites) but the frontend never listens. Add `socket.on('unread_update', …)` in `chat.ts` so unread badges update live instead of only on the next REST fetch. — ✅ **DONE:** listener added; updates the chat's `unreadCount` in the inbox store.
- **Envelope convention inconsistency** — generic `get/post/...` helpers auto-unwrap `.data.data`; the legacy named objects (`connectionsAPI`, `authAPI`, …) return the full envelope and callers read `res.data`. Both work, but mixing them in one screen mis-shapes data. Standardize on the unwrapped helpers. — 🟡 **PARTIAL:** dead objects removed and `connectionsAPI` migrated to the unwrapped `get<T>()` helper. `authAPI` (~42 auth-flow call sites) intentionally deferred — too risky for a polish pass.
- **Missing indexes / FKs** — Task linkage columns (`linkedOrderId`, `linkedDeliveryId`, `linkedInvoiceId`), `Order.customerId`/`createdBy`, `Delivery.assignedStaffId`/`clientId`, `Transport.assignedStaffId` are free-text Strings with no FK/index → table scans + no referential integrity. Add indexes (and FKs where appropriate). — ✅ **DONE (indexes only):** `@@index` added on all 8 columns + migration `20260607000000_add_lookup_indexes`. No FKs (some columns hold guest/external IDs). **Prod apply is a manual `prisma migrate deploy` step.**
- **Repository interface layer is half-abandoned** — 10 interfaces cover the original repos; the 14 newer repos (brand, transport, connection, procurement, task, etc.) have none. Either complete or stop maintaining the interface layer. — ✅ **DONE:** the 10 unused JSDoc interface files were deleted (never `require`d / enforced).
- **Unwired location-mode REST surface** — backend has `/locations/:id/orders`, `/locations/:id/invoices`, `/locations/:id/stock`, `POST /invoices/:id/accept`, `GET /companies/:id/stock` that the app never calls (DEPENDENT-location features). Wire them up or remove. — ⬜ **KEPT (documented):** these are planned DEPENDENT/INDEPENDENT-location features (not dead code). Each route now carries a `[location-mode]` comment; full frontend wiring is a separate feature session.
- **No tests, no CI** — Jest is configured but unused; no `.github/` pipeline. Consider a minimal smoke-test suite for the payment webhook and auth once P0/P1 are fixed. — ✅ **DONE:** added `node:test` smoke suites for the order + purchase-order state machines (15 tests, 0 deps) and a `.github/workflows/ci.yml` with two jobs — **frontend lint** + **backend tests**. The ESLint toolchain was also repaired (`.eslintrc.js` was extending a never-installed `expo` config; now points at the installed `universe/native`) so `npm run lint` runs clean (**0 errors**, warnings only). A `tsc --noEmit` gate is still deferred until the ~172-error backlog clears.

---

## Recommended Fix Roadmap

A suggested order — each line is roughly one focused Claude session:

**Week 1 — Stop the bleeding (P0):**
1. Secure the Peach webhook (P0-1) — signature + re-fetch result.
2. Lock down the 5 unauthenticated leak routes (P0-4).
3. Move uploads to Supabase Storage (P0-5).
4. Regenerate the Prisma baseline migration so `db:reset` is safe again (P0-3).
5. Implement recurring billing + renewal cron (P0-2).

**Week 2 — Fix what's visibly broken (P1):**
6. The four navigation fixes (P1-4) + the two `/api/api` double-prefix fixes (P1-1) — quick wins, lots of dead buttons revived.
7. Forward-message push args (P1-3) + refresh-token rotation (P1-7).
8. Add the missing business-role-change route (P1-2).
9. Decide on invoice PDF: implement or hide (P1-5).
10. Make email failures loud (P1-6); implement or hide public storefront ordering (P1-8).

**Week 3+ — Finish & harden (P2):**
11. Add `helmet`, fix Peach env names, add deep-link scheme, sort out OTA/notifications config.
12. Close the entitlement leaks (business pricing, feed publishing) and unify the plan tables.
13. Finish the half-built UI (invoice template/permissions, supplier add-product, real business hours, chat user fields).
14. Data-layer cleanup (push-token consolidation, inventory source of truth, seed gaps, push receipts).

**Ongoing — Polish (P3):** burn down tsc errors, strip console logs, delete dead code, add indexes, add a smoke-test suite.

---

## Corrections to Previous Assumptions

- **"cart / orders / feed / connections are half-built"** (from project memory) is **now outdated.** The frontend audit confirms all four are functionally wired to real APIs/stores: cart → PlaceOrder → Peach checkout, feed via `useFeed`, connections via `connectionsAPI`. Their only real defect was the broken `navigate('Explore')` CTA (P1-4). The genuinely incomplete areas are **invoices (PDF + template/permissions), procurement (add product), business-profile hardcoded data, and the scattered broken nav routes** — all captured above.
- **CLAUDE.md says deep-link config lives in `App.tsx`** — it doesn't (no `scheme`, no `linking`). See P2.
- **CLAUDE.md documents `DATA_SOURCE=memory`** — not implemented; `getDataSource()` hard-returns `'prisma'`. See P3.

---

*Generated from a five-agent parallel audit. Every item cites `file:line` — open the file and Claude can act on it directly.*
