# Company-Layer Audit

**Date:** 2026-08-07
**Companion to:** `USER_FLOWS_AUDIT_ROUND2.md` (the *user*-side audit — its Batches 1–4 are done and verified, including the new `CompanyInvite` table shipped as Batch 4 Phase C/D).
**Scope:** everything a **company** touches — creation & onboarding, staff (super_admin / admin / staff), locations, vehicles (transports), company↔company connections, product display to other companies, notifications, and messages/chat.
**Method:** three parallel full-stack traces (backend monolith, app screens, cross-cutting features) across `backend/server.js`, `backend/src/**`, `backend/prisma/schema.prisma`, and `src/features/**`. **Every P0 was re-verified by direct read of both ends of the call** — file, line and exact mechanism given for each.

**Severity:** **P0** = security / cross-tenant data exposure, or broken for everyone who tries it · **P1** = real bug or wrong behavior users will hit · **P2** = polish / integrity.

**Naming:** the company entity is the Prisma model **`Business`**; API routes say `companyId` and the repo layer maps `companyId ↔ businessId`. Membership lives only in **`BusinessMember`** (`role: super_admin | admin | staff`, `status: pending | accepted | rejected | locked | invited | suspended`). There is no `Company` model and no `companyId` column on `User`.

**Status:** findings recorded below. Fix batches append their logs at the bottom.

---

## Executive summary

The company layer is broadly functional and the previous (user-side) audit genuinely closed what it claimed — subscription **limits** are enforced server-side, soft-archive is careful about a trading partner's history, and the new invite table fixed the shadow-account lockout. But the company layer has its own set of holes that the user-side passes did not cover:

1. **Cross-tenant product & stock exposure.** Four read endpoints return *any* company's full catalog — including unlisted products, cost prices, suppliers, and **per-warehouse stock levels** — to any caller. One of them (`GET /api/products`) has no authentication at all. This is the highest-impact cluster: a competitor can enumerate your entire inventory position.

2. **The membership state machine has escape hatches.** The staff-invite route is missing the "only an owner may grant owner" guard that its sibling routes have, so an *admin* can promote themselves to owner (and then self-accept). A **suspended** member can re-activate themselves. An admin can delete the owner.

3. **Money for free.** The subscription-change route writes any tier straight from the request body with no payment check — any owner can grant their company a free ENTERPRISE plan.

4. **Chat outlives membership.** Leaving, being removed, or being suspended never revokes chat access — an ex-employee keeps reading *and posting* in company chats indefinitely. Separately, the company chat list leaks every private conversation's last message to any staff member.

5. **Notifications leak to non-members.** The notification aggregator builds its company list without a status filter, so someone whose join request was **rejected** (or who was suspended) still receives that company's admin notifications: member names and emails, low-stock alerts, invoice amounts, subscription details.

6. **Several company features are half-built.** Explore's "Connect" button has never worked (wrong id sent, error swallowed). Products can't be listed/unlisted after creation. The brand-new email-invite backend has no UI calling it. Onboarding business hours are read-only. Vehicles is unreachable from the sidebar.

A recurring theme: **write routes are guarded, read routes are not.** Almost every product/brand/location/chat *mutation* checks membership; the matching *reads* frequently don't. And the socket layer lags the HTTP layer — HTTP uses status-checked `isBusinessMember`, several socket paths use the raw, status-blind `findBusinessMember`.

---

## 0. Security & tenant isolation

| ID | Sev | Finding |
|---|---|---|
| **CO-1** | **P0** | **An admin can promote themselves to owner (and demote/suspend the real owner).** `POST /api/companies/:companyId/users/invite` (`server.js:13156`) is guarded only by `requireBusinessAdmin` + `ensureRole(role)`. It has **no** "only a super_admin may grant super_admin" check — unlike its two siblings, location-staff POST (`server.js:12802`) and business PATCH (`server.js:12990`), which both have it. For an already-existing user it runs `updateBusinessMember(bm.id, { role, status })` (`server.js:13253`). So an admin posts their **own** email with `{ role:'super_admin' }` → their row becomes `super_admin/invited`, then self-accepts via CO-2 → `accepted`. The same route posted with the **owner's** email and `{ role:'staff' }` or `{ status:'suspended' }` demotes or locks out the owner. Blocked on FREE tier by `canInviteStaff` and by `maxStaff`, but reachable with any admin token on a paid plan. **Fix: mirror the guard at `server.js:12990` — only a super_admin may grant `super_admin` or modify a member who is `super_admin`.** |
| **CO-2** | **P0** | **A suspended member can re-instate themselves.** `POST /api/companies/:companyId/users/:userId/accept` (`server.js:13337`) checks only that the caller is the target and that a `BusinessMember` row exists, then unconditionally writes `status:'accepted'` and accepts every `LocationMember` (`server.js:13349-13363`). A member suspended via `PATCH .../users/:userId` keeps their JWT and simply calls accept to restore themselves. **Fix: only accept from `status ∈ {invited, pending}`; otherwise 409.** Same guard belongs on `decline` (`server.js:13410`). |
| **CO-3** | **P0** | **An admin can remove the owner.** `DELETE /api/companies/:companyId/users/:userId/invite` (`server.js:13373`) requires only `requireBusinessAdmin`; its only guard is "don't remove the last accepted admin-or-super_admin" (`server.js:13380-13388`). With two admins present, a plain admin can hard-delete the super_admin's membership. **Fix: if the target is `admin`/`super_admin`, require the caller to be `super_admin`.** |
| **CO-4** | **P0** | **`GET /api/products` is unauthenticated and returns every company's full catalog.** `server.js:15725` has **no** auth middleware. It calls `repos.productRepo.list()` and only applies the listed-only + entitlement filter when the caller volunteers `?scope=public` / `?visibility=public` (`server.js:15733`). A bare `GET /api/products` returns the entire cross-tenant catalog including `costPrice`, `salePrice`, `sku`, `barcode`, `supplier`. `applyPricePrivacyBatch` is a no-op unless the owner opted into `settings.pricePrivacyEnabled` (a BUSINESS+ feature), so FREE/PRO catalogs are always fully exposed. **Fix: always apply the public-catalog filter unless the caller is an authenticated member of the `companyId` being filtered.** |
| **CO-5** | **P0** | **Any authenticated user can read any company's products *and per-location stock*.** `GET /api/companies/:companyId/products` (`server.js:4486`) is `requireAuth` only — no membership check, no `isListed` filter — and it enriches every product with `stockQuantity` + a full `locationStocks` array (`qtyOnHand` / `qtyReserved` / `qtyInTransit` / `reorderLevel` per location, `server.js:4552-4560`). Any logged-in user can enumerate any company's complete inventory position per warehouse. `GET /api/companies/:companyId/products/:productId` (`server.js:4594`) and `GET /api/products/:productId` (`server.js:15861`, `optionalAuth`, no owner/listed check) leak individual rows the same way. **Fix: non-members get listed-only, stripped of cost/supplier/stock; members keep full access.** |
| **CO-6** | **P0** | **The brands route leaks the same data — and it's the route the app actually uses.** `GET /api/companies/:companyId/brands` (`server.js:4924`) is `requireAuth` only; `brandRepo.getByBusinessId` does `include: { products: true }` unfiltered (`brandRepo.prisma.js:19-27`). `BusinessProfileScreen.tsx:93` renders another company's catalog through this route, so the entire "products" tab of a company profile is built on an unscoped read (all products, all prices). **Fix: filter the included products to listed-only + strip cost/stock for non-members.** |
| **CO-7** | **P0** | **A company can grant itself ENTERPRISE for free.** `PATCH /api/companies/:companyId/subscription` (`server.js:3437`) checks `requireBusinessAdmin` + `role==='super_admin'`, then takes `subscriptionTier` from the body, validates it against the enum, computes a period end, and writes it (`server.js:3453-3483`) — **no payment verification, no Peach lookup, no `Payment` row check.** Any owner can `PATCH { subscriptionTier:'ENTERPRISE' }` for a free year of every capability. The real paid path is `POST /api/payments/create-checkout` → Peach → `processSuccessfulPayment` (`server.js:16429`), which writes the tier itself and never calls this route; the frontend uses this route only for the FREE downgrade (`SubscriptionPlansScreen.tsx:261`). **Fix: this route accepts only `FREE`.** |
| **CO-8** | **P0** | **Rejected / suspended / invited members receive a company's admin notifications.** The notification aggregator (`server.js:15145`) builds its id lists with `repos.memberRepo.getByUserId(userId)` — `where: { userId }` with **no status filter** (`memberRepo.prisma.js:124-129`). This is the *only* place in the codebase using the unfiltered lookup for authorization; everywhere else uses status-checked `isBusinessMember`. So a user with a `rejected`, `locked`, `suspended`, or merely `invited` row carrying role `admin` receives, for a company they are **not** a member of: other members' names + email addresses (`server.js:15165/15179/15190`), inbound partner requests, low-stock alerts with product names and quantities (`server.js:15248`), subscription tier + renewal date (`server.js:15375`), and all paid invoices / deliveries / order updates. **Fix: filter to `status === 'accepted'` when building `allBusinessIds` / `adminBusinessIds`.** |
| **CO-9** | **P0** | **An ex-employee keeps full read *and write* access to company chats forever.** Neither leave (`server.js:13438`), remove (`server.js:13373`), suspend (`PATCH .../users/:userId`), nor archive (`archiveCompanyInTx`, `server.js:744`) touches `Chat.participants` (a flat JSON id array — the authoritative ACL) or `ChatParticipant`. The user-scoped chat routes check *only* `chat.participants` and never re-verify company membership: `GET /users/:id/chats/:chatId/messages` (`server.js:11749`) gives full history, `POST .../messages` (`server.js:11828`) still lets them **post**. Amplified by `eventMessages.resolveBusinessPairChat` (`eventMessages.js:43-84`), which auto-adds every member of both trading companies to the shared buyer↔seller chat and **only ever adds, never removes**. **Fix: on leave/remove/suspend/archive, drop the user from `Chat.participants` + `ChatParticipant` for chats scoped to that company (and its trade chats), unless they're also an accepted member of the counterparty; re-check membership on the user-scoped read/send routes when `chat.companyId != null`.** |
| **CO-10** | **P0** | **The company chat list leaks every private conversation's last message.** `GET /api/companies/:companyId/chats` (`server.js:11020`) gates only on `requireCompanyMember`. `chatRepo.getByCompanyId` (`chatRepo.prisma.js:122-147`) returns **all** chats where `companyId` matches, each with `lastMessage` (content). There is no participant filter in the handler (`server.js:11021-11069`), and search runs over `lastMessage.content` (`server.js:11048`). A staff member can read the last message of every 1:1 and private group chat in the company, including admin-to-admin threads. The `/messages` sub-route *does* check participation, so this is a preview leak, not full history — but a real one. **Fix: return only chats where the caller is a participant (the `/users/:id/chats` route already does this via `ChatParticipant`).** |
| **CO-11** | **P0** | **Socket `join_chat` admits non-accepted members to live company chat streams.** `server.js:1101` uses raw `findBusinessMember` (no status check, `server.js:606-608`) for company chats, so a `pending`/`invited`/`rejected`/`locked`/`suspended` member can `join_chat` any chat scoped to that company and receive every live `message` broadcast. The location sub-check just below *does* verify `accepted` — the inconsistency is at the company level. `POST /api/companies/:companyId/chats` (`server.js:10919`) similarly validates participants by truthiness only. **Fix: use status-checked `isBusinessMember` on the socket path and validate chat participants as accepted members.** |
| **CO-12** | **P0** | **Org-chart / role enumeration + tier leak.** `GET /api/companies/:companyId/access/locations` (`server.js:13088`) takes `userId` from the query string and performs **no** check on the caller — any authenticated user can enumerate which locations user X holds in company Y, plus X's role. Its sibling `/access/capabilities` (`server.js:13123`) is correctly self-or-admin gated. Separately, `GET /api/locations/:locationId` (`server.js:4299`) attaches `business.capabilities` to an unauthenticated response, which encodes the owner's subscription tier — contradicting `stripSensitiveBusinessFields`. **Fix: self-or-admin guard on access/locations; don't attach capabilities for non-members.** |

**Healthy, verified:** transport routes correctly check `transport.businessId === companyId` before mutating (tenant isolation is right there); the Peach webhook re-fetches the authoritative result and never trusts the body (`server.js:16371`); `stripSensitiveBusinessFields` correctly redacts billing/settings for non-members on the company-profile route; the archive path is careful to preserve a trading partner's order/invoice history.

---

## 1. Company creation & onboarding

| ID | Sev | Finding |
|---|---|---|
| **CO-23** | **P1** | **Onboarding business hours are read-only — every company is created with identical default hours.** `BusinessHoursScreen.tsx` renders only the open/closed toggle per day (`:53-58`); the times display read-only (`:111`, `hour.timeSlots[0].open–close`) with no time picker. The full multi-slot editor already exists in `CompanyEditScreen.tsx:295-370` and can be reused. |
| CO-19a | P1 | **Restore-company and "add another business" paths are correct** but the 4 onboarding screens + `SelectCompany` are registered twice (auth stack + RootStack) on purpose (logged-in "add business" entry). Not a bug — noted so it isn't "fixed" by mistake. |
| CO-27a | P2 | `CompanySearch` receives a `mode:'join'` param from 3 callers (`PersonalSettingsScreen.tsx:247`, `PersonalProfileScreen.tsx:271`, `BusinessProfileOwnScreen.tsx:305`) that `CompanySearchScreen.tsx:50` never reads — the "Join an existing company" entry lands on plain search, not a join flow. |
| CO-27b | P2 | Phantom nav routes declared but never registered/navigated: `CreateBusiness` (`navigation.ts:341`), `CompanyEdit` (`:344`), `SubscriptionSettings` (`:317`). |

---

## 2. Company profile & settings

| ID | Sev | Finding |
|---|---|---|
| **CO-19** | **P1** | **"Edit profile" can target the wrong company — or a stranger's.** `CompanyEditScreen.tsx:86` sources everything from `businessStore.currentCompany`, which the store fills from `businesses[0]` of `GET /companies` (`businessStore.ts:167-169`). But `GET /api/companies` (`server.js:3582`) is the **global directory of all businesses** (deliberate R3 behavior), not the user's memberships, and it's never synced with `profileStore.activeBusiness`. A multi-company owner who switches to company B and taps Edit edits company A; a first-run user can see a stranger's data prefilled (the save then 403s). The route already passes `{ businessId }` (`BusinessProfileOwnScreen.tsx:141`) which the screen ignores. When `currentCompany` is null the save silently no-ops (`:401`). **Fix: read route `businessId` → fallback `profileStore.activeBusiness.id`; fetch that company; drop the `currentCompany` dependency.** |
| CO-26 | P1 | **No role guard on `CompanyEditScreen`** (full profile + invoice-settings editor, RootStack route `EditBusiness`), `AddLocationScreen`, `EditLocationScreen`, `AddTransportScreen`. Only mitigation is that `switchToBusiness` blocks `staff` from business mode (`profileStore.ts:425`) — which makes admin-vs-owner the truly unenforced distinction. Add the `isAdmin` gate the list screens already use. |
| CO-27c | P2 | `CompanySettingsScreen.tsx:180` "Privacy Policy" alerts a developer placeholder string (`'Navigate to privacy policy screen'`) to real users — the backend already serves `/legal/*`. |
| CO-27d | P2 | `CompanyEditScreen`: dead `businessPlan` state (`:203-204`, "Mock business plan") always renders "Upgrade plan" for every tier incl. paying customers (`:545`); `initialCoverImage` falls back to a hardcoded Unsplash URL (`:122`) that gets persisted as the real `bannerUrl` on save. |
| CO-29a | P2 | No publish/unpublish UI exists anywhere. `canPublishBusinessPage` is computed at `BusinessProfileOwnScreen.tsx:120` and never used; `canManageTeam`/`canDelete` (`:119/:121`) are dead too. |

---

## 3. Staff / team (super_admin, admin, staff)

| ID | Sev | Finding |
|---|---|---|
| **CO-22** | **P1** | **The real staff-invite feature has no UI.** `InviteStaffScreen.tsx` is a share-link stub (builds `https://noupro.app/join/{id}` and calls `Share.share`; zero API calls). `team.service.inviteStaff` → `POST /companies/:id/users/invite` (`team.service.ts:156`) has **no caller**, so the whole `CompanyInvite` backend shipped in Batch 4 Phase C is unreachable from the app. List/revoke endpoints for pending invites also exist and are unused (`server.js:13304`, `:13320`). **Build the invite form (email, name, role, location multi-select for staff/admin) + a pending-invites section.** |
| **CO-18** | **P1** | **Seat counting is wrong and register-time invites bypass it.** `getStaffCount` (`server.js:631`) filters only `status !== 'suspended'`, so `pending`, `invited`, `rejected`, and `locked` rows all consume paid seats — a PRO company (maxStaff 3) that rejects three applicants can never hire again, and there's no UI to clear a rejected row. Separately, `POST /auth/register` consuming `CompanyInvite` rows (`server.js:1547-1590`) creates `BusinessMember`s with no seat check. **Fix: count `accepted` + `invited` only; add a seat check (or documented over-allow) at register consumption.** |
| CO-25 | P1 | **Team screen dead controls:** the location filter dropdown (`TeamManagementScreen.tsx:70/432`) is wired to nothing — `filteredUsers` (`:291-294`) filters on search text only; `locations` state is write-only (`fetchLocations` runs on every mount for nothing); suspended members are never listed (`getTeamMembers(id,'accepted')`, `:161`) so there is no un-suspend path. |
| CO-27e | P2 | `RoleRequestsScreen.tsx:73` approves every role request as `role:'admin'` (hardcoded) — a staff→super_admin request can't be honored here. |
| CO-11b | P2 | Report-user has two behaviors in one screen: the join-request path alerts "contact support" (`TeamManagementScreen.tsx:678`) while the staff-card path does a real `reportEntity()` call (`:251`). |

---

## 4. Locations

| ID | Sev | Finding |
|---|---|---|
| CO-28 | P1 | **Plan limits invisible until the 403.** `LocationsScreen`'s "+" (`:235`) is always enabled; `usePermissions().maxLocations`/`isLocationLimitExceeded` (`usePermissions.ts:224-227`) exist but the screen never imports them. Same for staff. The DEPENDENT/INDEPENDENT section on Add/Edit simply doesn't render below Enterprise — no paywall, no hint the feature exists. |
| CO-26b | P1 | `AddLocationScreen`/`EditLocationScreen` have no role check (covered under CO-26). |
| CO-29b | P2 | Two parallel location CRUD implementations that can drift: `locations.service.ts` (screens) vs `businessStore.createLocation/updateLocation/deleteLocation` with a duplicated snake→camel mapper (`businessStore.ts:313-321`). `EditLocationScreen` missing from `src/features/locations/screens/index.ts`. `ManageLocationsModal.tsx` (364 lines) is dead. |
| CO-12b | P0 | `GET /api/companies/:companyId/locations` (`server.js:4203`) and `GET /api/locations/:locationId` (`server.js:4299`) have no membership gate — folded into CO-12. |

---

## 5. Vehicles (transports)

| ID | Sev | Finding |
|---|---|---|
| CO-24 | P1 | **Vehicles is unreachable from the sidebar** — the Business section of `SidebarContent.tsx:446-458` lists everything *except* Transports; the only entry point is a row in Company Settings (`CompanySettingsScreen.tsx:171`). It's also registered as a RootStack route (`App.tsx:563`) instead of a hidden tab like Team/Locations/Settings, so it renders with a back button instead of the workspace shell. |
| CO-26c | P1 | `AddTransportScreen` has no role check (covered under CO-26); the list screen does. |
| CO-18b | P2 | No `maxVehicles` limit exists — `Transport` is gated only by the boolean `canAssignTransport` (paid tier). A PRO company can create unlimited vehicles. Deferred (product decision). |

**Healthy, verified:** transport PATCH/DELETE verify `businessId === companyId`; PATCH validates `assignedStaffId` is an accepted member before writing.

---

## 6. Company ↔ company connections

| ID | Sev | Finding |
|---|---|---|
| **CO-13** | **P1** | **Explore "Connect" has never worked.** `explore.service.ts:64-66` posts to `/companies/${targetBusinessId}/connections` — but that route's `:companyId` is the **requester** and it calls `requireBusinessMembership(req,res,req.params.companyId)` (`server.js:6981`), so passing the *target* id 403s every time; and the body `{}` lacks the required `targetBusinessId` anyway. `disconnectFromBusiness` (`:68-74`) has the same inversion. Both are called inside a bare `try/catch {}` (`useExploreDiscovery.ts:90-91`) that silently rolls back the optimistic toggle → the button flickers and does nothing. |
| **CO-14** | **P1** | **Two divergent business-connection APIs.** Group A `/api/business-connections/*` (`server.js:3886-4046`): pushes to admins, strips sensitive fields, deletes a `rejected` row before re-request. Group B `/api/companies/:id/connections` (`server.js:6980-7090`): raw prisma, no push, no stripping, **409s forever on a previously-rejected pair** (`server.js:7003`), and never exposes `isDeleted` so an archived partner renders as a live tappable connection. The UI uses Group B (`ConnectionsScreen.tsx:102`) plus the broken Explore calls. Explore's "connected" check (`explore.service.ts:52`) fetches with no `status` filter and treats pending/rejected rows as connected. `connectionRepo.areBusinessesConnected` (`connectionRepo.prisma.js:156`) is dead code. **Fix: repoint the frontend to Group A; retire Group B (or make it delegate).** |
| **CO-20** | **P1** | **No UI to cancel or remove a business connection**, and no incoming-partner-requests screen. `DELETE /api/business-connections/:id` (`server.js:3983`) and `GET /api/business-connections/:businessId/pending` (`server.js:4029`) have zero frontend callers; incoming requests are reachable only through the notification card. |
| CO-16b | P2 | **Accepted business connections survive company archival and render as live.** `archiveCompanyInTx` deletes only *pending* `BusinessConnection` rows (`server.js:767-772`); `listBusinessConnections` has no `deletedAt` filter, and Group B doesn't surface `isDeleted`, so `ConnectionsScreen.tsx:257` navigates to an archived company's tombstone. |
| CO-21b | P2 | CRM links (`customerBusinessId`/`supplierBusinessId`, `server.js:5026/5062/7540`) are written with no existence check, no connection check, and no notification — company A can unilaterally list company B as its customer. |

---

## 7. Product display to other companies

*(The cross-tenant read holes are CO-4/5/6 in §0. This section covers the visibility/listing mechanics.)*

| ID | Sev | Finding |
|---|---|---|
| **CO-15** | **P1** | **`isListed` can never be toggled after creation.** `PATCH /api/companies/:companyId/products/:productId` destructures a fixed 7-field whitelist (`server.js:4752`: name, description, unit, price, taxRate, sku, barcode), so `patch.isListed` is always `undefined` → the entire `maxListedProducts` paywall block below (`server.js:4775-4792`) is unreachable dead code **and there is no way to list/unlist an existing product**. The frontend calls it anyway (`products.service.ts:129` `{isDisplayable}`, `:140` `{is_listed}`) and both silently no-op. Products can only be listed at creation (`server.js:4656`); `carry` hardcodes `isListed:false`. **Fix: wire `isListed` through the whitelist WITH the quota check live.** |
| **CO-16** | **P1** | **`POST /api/companies/:companyId/products/carry` clones any company's private product.** `server.js:4690` verifies membership in the *carrying* company but never checks that the source product is `isListed`, that the source company isn't archived, or that the two are connected (`server.js:4700-4706`). Any company can clone any other company's internal product into its own catalog. |

---

## 8. Notifications

*(CO-8 in §0 is the security-grade leak. These are behavioral gaps.)*

| ID | Sev | Finding |
|---|---|---|
| **CO-17** | **P1** | **A newly placed order produces no notification.** The in-app aggregator's order source filters `status ∈ {CANCELED,REJECTED,DONE,PENDING,ACCEPTED}` (`server.js:15237`) — `NEW` is excluded, and B2B orders start as `NEW` (`server.js:7203`). The only signal rides the chat event card (`eventMessages.postOrderEvent`, `eventMessages.js:120`) pushed with `category:'messages'` (`server.js:16238`). So a seller who muted "Messages" gets no notification of any kind for a new order, and the `orders` preference is effectively never used for order events. (Round-2 N-8, still open.) |
| CO-17b | P2 | **Archived companies keep emitting notifications** — only the subscription source filters `deletedAt:null` (`server.js:15246`); sources 1-9 don't, so an archived company keeps pushing join requests, invoices, deliveries, stock alerts, and order updates to its ex-admins. |
| CO-17c | P2 | **No notification on:** member removed / invite revoked / member left / company archived (partners + staff never told), business-connection rejected or removed, price-list assigned to a buyer. |
| CO-8b | P2 | Push-token dedup ignores `deviceId` (`pushTokenRepo.prisma.js:4`) — rotated Expo tokens for one device accumulate active rows → duplicate pushes. Deferred. |

---

## 9. Messages / chat

*(CO-9/10/11 in §0 are the security items. Everything else here is healthy.)*

**Healthy, verified:** the company chat routes correctly use `requireCompanyMember` (status-checked); 1:1 block enforcement is applied on create + send (both company and user routes); the user-scoped chat list correctly goes through `ChatParticipant`; dead-token pruning works on the Expo `DeviceNotRegistered` receipt.

---

## 10. Block enforcement (cross-cutting)

| ID | Sev | Finding |
|---|---|---|
| **CO-21** | **P1** | **User blocks aren't enforced on the company surface** (round-2 P-12 covered profile + search only). `blockRepo.isBlocked` is consulted on user-profile view, user-connection request, and 1:1 chat — but **not** on business-connection request (`server.js:3886`), follows (`server.js:4052`), group chats, orders (`server.js:7140`), or product views. There is no company-level block model at all. **Minimal fix: enforce user-blocks on business-connection request + follow. Company-level block is a product decision (deferred, P2).** |

---

## Deferred (recorded, not fixed in these batches)

Twilio-free signup (round-2 A-9); Peach webhook signature verification (has a documented TODO; body is already untrusted); push-token dedup by `deviceId` (CO-8b); no `maxVehicles` limit (CO-18b); `canUseBusinessSpecificPricing` never gates the price-list endpoints it was written for; company-level block model (CO-21); notification pagination + archived-company notification suppression (CO-17b); CRM-link validation/notification (CO-21b). `GET /api/businesses/:businessId/people` (public team list incl. roles) treated as intentional social-graph exposure.

---

## Fix order

**Batch A — P0 security / tenant isolation (backend-only):** CO-1, CO-2, CO-3 (membership state machine) · CO-4, CO-5, CO-6 (product/brand/stock reads) · CO-7 (subscription FREE-only) · CO-8 (notification status filter) · CO-9, CO-10, CO-11 (chat retention + list filter + socket) · CO-12 (access-locations guard + capabilities leak).

**Batch B — P1 broken features:** CO-13, CO-14 (connection APIs) · CO-15 (isListed toggle + live quota) · CO-16 (carry guard) · CO-17 (order notifications) · CO-18 (seat counting) · CO-19 (edit-company targeting) · CO-20 (cancel/remove connection UI) · CO-21 (block on connect/follow).

**Batch C — feature completion / UX:** CO-22 (staff-invite UI) · CO-23 (onboarding hours) · CO-24 (transports sidebar) · CO-25 (team dead controls) · CO-26 (role guards) · CO-27 (small stubs) · CO-28 (plan-limit UX) · CO-29 (dead-code sweep).

Each batch: `node --check backend/server.js`, backend tests (70 baseline — up from 58 after the concurrent OTP workstream landed), `tsc --noEmit` unchanged baseline (133) for frontend batches. Fix log + smoke checklist appended per batch. No live smoke test from the sandbox (no network egress).

---

## Fix log — Batch A (P0 security / tenant isolation, 2026-08-07)

All backend-only, in `backend/server.js` (+ one repo file). Verified: `node --check` OK · backend tests **70/70** · membership/product/chat routes anchored by path (line numbers drift under the concurrent OTP workstream).

| ID | What changed |
|---|---|
| **CO-1** | `POST /companies/:id/users/invite` now (a) only creates an `invited` membership — an admin can no longer add someone as `accepted` (no consent) or `suspended` (also closes round-2 M-7); (b) refuses to grant `super_admin` unless the caller is `super_admin`; (c) on re-invite of an existing member, 409s if they're already `accepted` (use the role editor) and refuses to touch a `super_admin` unless the caller is one. Mirrors the guard already on `PATCH .../users/:userId`. |
| **CO-2** | `POST /companies/:id/users/:userId/accept` now accepts only from `invited` (already-accepted → idempotent success; anything else, incl. `suspended`, → 403). A suspended member can no longer self-reinstate. |
| **CO-3** | `DELETE /companies/:id/users/:userId/invite` now refuses to remove a `super_admin` unless the caller is a `super_admin` — an admin can't delete the owner. (Admins can still manage each other and revoke invites they created.) |
| **CO-4** | `GET /api/products` (unauthenticated) now **always** returns listed-only + entitlement-filtered products and strips internal/commercial fields — a bare call no longer dumps every company's full catalogue with costs. |
| **CO-5** | `GET /companies/:id/products`, `/products/:productId`, and the public `/api/products/:productId` now check accepted membership: non-members get listed products only, **no** stock enrichment, and internal fields (`costPrice`/`salePrice`/`supplier`/`sku`/`taxRate`/retail caps/stock) stripped. Members are byte-identical to before. |
| **CO-6** | `GET /companies/:id/brands` (the route the app uses to render another company's catalogue) now filters each brand's embedded products to listed-only for non-members, corrects `_count`, and strips internal fields. |
| **CO-7** | `PATCH /companies/:id/subscription` now accepts only `FREE` (self-service downgrade) → clears the paid period; any paid tier returns 403 `PAYMENT_REQUIRED`. Paid plans activate exclusively via the verified Peach checkout path. Also fixed `businessRepo.updateSubscription` so an explicit `currentPeriodEnd: null` actually clears (was a silent no-op). |
| **CO-8** | The notification aggregator now filters memberships to `status === 'accepted'` before building its business/admin id lists — a rejected/suspended/invited member no longer receives a company's names/emails, stock alerts, invoice amounts or subscription details. |
| **CO-9** | Leaving / being removed / declining / archive-on-leave now revoke the user's access to that company's chats (`removeUserFromBusinessChats` — company chats + `chat-ord-` trade chats, keeping dual-hat members of the counterparty). The user-scoped chat read/send/read-receipt/list routes gained an `isBarredFromCompanyChat` recheck, which also contains **suspended** members (kept as participants, denied at read time; access returns on un-suspend). Personal 1:1 chats and legitimate external participants (B2C customers) are untouched. |
| **CO-10** | `GET /companies/:id/chats` now returns only chats where the caller is a participant, with a carve-out for the company-wide event chats (`chat-ord-`/`chat-actfeed-`). Staff can no longer read every private thread's last message or search their content. |
| **CO-11** | Socket `join_chat` now requires an **accepted** company membership (was a status-blind lookup); company-chat creation now validates participants are accepted members. |
| **CO-12** | `GET /companies/:id/access/locations` now requires self-or-admin (was open to any authenticated user — an org-chart/role probe); `GET /locations/:id` no longer attaches `business.capabilities` (a subscription-tier signal) for non-members. |

### Smoke-test checklist for Batch A

1. **Privilege guard** — as a company *admin* (not owner): invite yourself as `super_admin` → 403; re-invite the owner as `staff`/`suspended` → 403; delete the owner → 403. As the *owner*, granting `super_admin` still works.
2. **Suspended member** — suspend a staff member, then (as them) call accept on the company → 403; they can't open company chats or post; un-suspend → access returns.
3. **Product isolation** — from a second account that is **not** a member of company X: open X's profile → products tab shows only listed items, no stock numbers; hitting `/api/products` while logged out returns listed-only with no `costPrice`. As a member of X, your own catalogue (incl. unlisted + stock) is unchanged.
4. **Subscription** — `PATCH /companies/:id/subscription {subscriptionTier:'ENTERPRISE'}` → 403; `{subscriptionTier:'FREE'}` → tier FREE, period cleared. A real paid upgrade via checkout still activates.
5. **Chat retention** — a member of two companies that trade with each other leaves one → still sees the shared trade chat; a plain staff member leaves → the company's group + trade chats disappear from their inbox and message fetch 403s.
6. **Chat list** — as staff not in an admin-only group, that group is absent from the company chat list and from search; the activity-feed and trade chats are still listed.

---
