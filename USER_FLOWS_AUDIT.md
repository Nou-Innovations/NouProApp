# User Flows Audit — Sign up, Profile, Connections, Companies, Notifications

**Date:** 2026-08-05
**Scope:** Everything around user interaction with the app: sign up / sign in / account lifecycle, profile viewing & editing, user↔user connections + blocking, joining/entering companies (requests, invites, roles), company↔company connections, search/discovery, notifications and the new-user first-run experience.
**Method:** Full-stack trace of every flow — frontend screens/services/stores (`src/features/{auth,profile,connections,team,search,notifications}`, `src/modes/personal`, `src/shared`), backend routes (`backend/server.js`), repositories, and Prisma schema. Key findings re-verified by direct reads.

**Severity:**
- **P0** — flow is broken or user-visibly wrong for everyone who tries it
- **P1** — real bug, privacy issue, or missing piece users will hit
- **P2** — degraded UX, integrity risk, or incomplete feature
- **P3** — polish / dead code

**Status legend:** `FIXED ✅` (this session) · `OPEN` · `DEFERRED` (needs its own session, e.g. schema migration)

---

## Executive summary

The audit found **~50 issues**, of which **13 were P0 broken flows** — all 13 fixed this session:

1. Join-a-company onboarding always failed (missing auth token → 401 → forced logout)
2. Onboarding could strand a created-but-not-logged-in account (skip/modal-dismiss paths)
3. Signup profile picture was mandatory but silently thrown away
4. Password reset emails linked to a 404 — reset was unfinishable
5. Forgot-password showed "check your email" even when the email was never sent
6. Business connection Accept/Decline from notifications always errored (wrong endpoints)
7. Approving a join request on a paywalled plan corrupted state (request resolved, member never created)
8. "Start a new chat" / "Join a business" led to search screens **with no search input**
9. Connections list rendered blank names/avatars; company tab showed pending/rejected as connected
10. Order notifications did nothing when tapped
11. Avatar changed from the profile screen was never saved to the server
12. Accepted company invites didn't appear until relogin; push tokens survived logout
13. The new-user welcome feed linked to nonexistent businesses ("Business not found" on first tap)

The biggest remaining themes (backlog below): connection *management* UI is missing (no cancel/disconnect/unblock/pending list), the notification badge is cosmetic, push taps don't deep-link, block/privacy enforcement has server-side gaps, and OTP verification is not enforced server-side.

---

## 1. Sign up / Sign in / Account lifecycle

Flow: Launch → CreateAccount → Phone/Email OTP → CreatePassword → UploadProfilePicture (**register happens here**) → ChoosePath → SelectCompany | Business creation | Skip.

| ID | Sev | Status | Finding |
|---|---|---|---|
| A-1 | P0 | FIXED ✅ | **Join-company onboarding 100% broken.** `SelectCompanyScreen` never seeded the auth token from `pendingAuth` (unlike `UploadBusinessLogoScreen.tsx:48-51`), so `GET /companies/search` and `POST /companies/:id/request-membership` hit 401 → the refresh interceptor found no refresh token → forced `logout()`. Every user choosing "join a company" saw "Could not load companies." — `src/features/auth/screens/SelectCompanyScreen.tsx` |
| A-2 | P0 | FIXED ✅ | **Onboarding stranding.** `ChoosePathScreen`: Skip after selecting "join" still routed to SelectCompany (`selectedOption` not cleared); dismissing the success modal via `onClose` never called `completeRegistration()` — account existed server-side, user left un-logged-in with tokens only in nav params. Same modal-dismiss bug in `SelectCompanyScreen`. — `ChoosePathScreen.tsx`, `SelectCompanyScreen.tsx` |
| A-3 | P0 | FIXED ✅ | **Signup profile picture silently discarded.** "Done" was disabled until an image was picked, then the image was never uploaded nor sent — `register()` omitted it deliberately. Now: register first, then best-effort upload + `PATCH /auth/me { avatar }`. — `UploadProfilePictureScreen.tsx` |
| A-4 | P0 | FIXED ✅ | **Password reset unfinishable.** Reset email linked to `${APP_BASE_URL}/reset-password?token=...` → 404 (backend served only `/legal/*`); no app screen, no `authAPI.resetPassword`; `POST /api/auth/reset-password` was dead. Now served as a self-contained web page from `backend/public/reset-password/`. — `backend/server.js`, `backend/public/` |
| A-5 | P0 | FIXED ✅ | **ForgotPassword lied on failure.** Any non-network error (503 `EMAIL_UNAVAILABLE`, 429, 500) showed the success state "Check your email". Now branches on status and shows the real problem. — `ForgotPasswordScreen.tsx:49-55` |
| A-6 | P1 | OPEN | **Backend error messages never reach users.** Screens read `err?.response?.data?.message`, but `ApiError.response` *is* the body (`api.ts:219`) — correct path is `err.response?.message` / `err.response?.error?.message`. All OTP failures collapse to "Incorrect code", 2FA/delete-account errors are generic. Affected: `PhoneVerificationScreen.tsx:73`, `EmailVerificationScreen.tsx:63`, `TwoFactorAuthScreen.tsx:48,75,98`, `DeleteAccountScreen.tsx:37`, `SecuritySettingsScreen.tsx:75`. Fix: shared `getApiErrorMessage()` helper + sweep. |
| A-7 | P1 | OPEN | **Duplicate account detected only on screen 5, after a paid SMS.** `CreateAccountScreen` fires the OTP with no existence check; the 409 surfaces at register time with no "Go to Login" recovery path. Minimal fix: on 409, offer Login CTA; optionally pre-check at step 1 (rate-limited). |
| A-8 | P1 | DEFERRED | **OTP verification is client-side only.** No `phoneVerified`/`emailVerified` anywhere in the schema; the OTP endpoints persist nothing and `POST /api/auth/register` never checks verification — callable directly, skipping steps 2–3 entirely. Needs schema migration + register-time enforcement (own session). |
| A-9 | P2 | OPEN | **Dev OTP bypass.** `VALID_CODE = IS_DEV ? '123456' : null` in both OTP screens skips the API entirely in any `__DEV__` build (`APP_ENV` falls back to `'dev'`). Harmless in release builds, but remove once server-side enforcement (A-8) lands. — `PhoneVerificationScreen.tsx:23`, `EmailVerificationScreen.tsx:23` |
| A-10 | P2 | OPEN | **Login lockout is in-memory, per-process** (`server.js:1052`) — resets on every deploy/restart and doesn't span Render instances. IP `authLimiter` is the only durable brake. Consider DB/Redis-backed lockout. |
| A-11 | P2 | OPEN | **Email-less registration possible via API, but login is email-only.** Backend doesn't require `email` on register (`server.js:1375,1414`), yet `/auth/login` only accepts email — such an account can never sign in. Only frontend validation prevents it. Backend should require email. |
| A-12 | P2 | OPEN | **`/api/auth/login` has no `deletedAt` guard.** Mitigated in practice (deletion rewrites email + scrambles hash), but the explicit check is missing. — `server.js:1057` |
| A-13 | P2 | OPEN | **No resend cooldown/backoff on OTP screens** — users can burn the 15-req/15-min IP budget in seconds. |
| A-14 | P3 | OPEN | `registrationStore.clearPassword()` only runs on success — plaintext password lingers in memory after a failed registration. — `UploadProfilePictureScreen.tsx` |
| A-15 | P3 | OPEN | Dead auth code: `src/shared/services/authService.ts` (zero importers; `CreatePasswordScreen` re-implements the same rules inline), `verificationMethod` nav param never read, `screens/index.ts` barrel unused (App.tsx imports by full path). |

## 2. Profile (view / edit / avatar)

| ID | Sev | Status | Finding |
|---|---|---|---|
| PR-1 | P0 | FIXED ✅ | **Avatar change from PersonalProfileScreen was doubly broken.** (1) The camera/gallery handler uploaded the file then only updated the Zustand store — no `PATCH /auth/me { avatar }`, so the avatar reverted on next login/refresh; (2) discovered during the fix: the handler was **dead code** — nothing in the UI ever called it (the avatar was a static image). Fixed both: the avatar is now tappable (camera badge + uploading spinner) and the new picture is persisted server-side before the store update. — `src/modes/personal/screens/PersonalProfileScreen.tsx` |
| PR-2 | P2 | OPEN | **Optimistic avatar update without rollback** in `EditPersonalProfileScreen.tsx:234-245` — store updated before the PATCH; on failure the store keeps an avatar the server doesn't have. |
| PR-3 | P2 | OPEN | **`connections_count` on your own profile is frozen at login value.** `refreshBusinesses()` discards `response.user` (`profileStore.ts:508-521`); nothing re-syncs `currentUser` from `/auth/me` after connection changes. |
| PR-4 | P2 | OPEN | **Entire professional-profile subsystem is unreachable.** AddEducation / EditEducation / AddCertification / EditCertification / SkillsManagement screens are registered in App.tsx (474-478) with working backend endpoints (`server.js:5830-6091`) but have **zero navigation entry points**; `useProfileSections.ts` never imported. Complete-or-remove decision needed (owner preference: complete). |
| PR-5 | P1 | OPEN | **"Delete account" in EditPersonalProfileScreen is a stub** — shows "Account deletion process started..." and does nothing, while a real `DELETE /api/users/me` exists (`server.js:2128`) and a working `DeleteAccountScreen` exists in settings. Wire or remove the stub. — `EditPersonalProfileScreen.tsx:572-575` |
| PR-6 | P2 | OPEN | **"Show this workplace on profile" switches are dead** — local state only, reset to `true` every mount, never sent or read back. — `EditPersonalProfileScreen.tsx:66-72,512-529` |
| PR-7 | P3 | OPEN | `coverPhoto` exists on the User model and `PATCH /auth/me` accepts it; no UI ever sets it (`imageType: 'cover'` also unused). |
| PR-8 | P2 | OPEN | **Duplicate profile-slug 409 shows generic "Failed to save profile"** — server's "This profile URL is already taken" is discarded (same root cause as A-6). — `EditPersonalProfileScreen.tsx:217-220` |

## 3. User ↔ User connections & blocking

Backend is largely sound: self-connection blocked, symmetric duplicate checks on the main route, receiver-only accept/reject, block⇒disconnect, block⇒chat refusal at every layer.

| ID | Sev | Status | Finding |
|---|---|---|---|
| C-1 | P0 | FIXED ✅ | **Connections list rendered blank names/avatars.** Mapped `c.user.firstName/lastName/profilePicture`, but backend returns `{ name, avatar, jobTitle }` — every row showed the initials placeholder with an empty name. — `ConnectionsScreen.tsx:87-94` |
| C-2 | P0 | FIXED ✅ | **Company tab listed `pending`/`rejected` rows as connected** — no `status=accepted` filter on `GET /companies/:id/connections`. — `ConnectionsScreen.tsx:83` |
| C-3 | P1 | OPEN | **No way to cancel a sent request or disconnect** anywhere in the app. `DELETE /api/connections/:id` exists (`server.js:3193`, authorizes either party) with zero frontend callers. The "Connected"/"Pending" buttons on profiles are no-op alerts. — `UserProfileScreen.tsx:186-193` |
| C-4 | P1 | OPEN | **No pending-requests UI.** `GET /connections/pending` (`server.js:3241`) is never called; the only accept/decline surface is the Notifications screen. ConnectionsScreen needs a Requests section. |
| C-5 | P1 | OPEN | **No unblock and no blocked-list UI.** `unblockUser` is exported but never imported; `GET /blocks` (`server.js:3358`) has no caller. Once you block someone it is permanent-by-accident. |
| C-6 | P1 | OPEN | **ConnectionsScreen ignores `route.params.userId`** — tapping "N Connections" on someone else's profile shows *your own* connections. (Note: viewing others' connections also needs a backend endpoint — `GET /connections` is caller-scoped.) |
| C-7 | P1 | OPEN | **Blocks not enforced on profile view or people search.** `GET /api/users/:userId` (2284) and `GET /api/users/search` (1984) never consult `blockRepo` — a blocked user still finds you and opens your profile. |
| C-8 | P1 | OPEN | **Soft-deleted users leak.** `userRepo.getById` has no `deletedAt` filter — deleted accounts remain viewable via `GET /users/:userId` and stay in connection lists. |
| C-9 | P1 | OPEN | **Connection requests unlimited + instant re-request after reject.** No rate limiter on `POST /connections/request`; a `rejected` row is deleted and re-created on re-request, enabling harassment loops. (Role requests have a 7-day cooldown — mirror it.) — `server.js:3126-3138` |
| C-10 | P2 | OPEN | **TOCTOU on simultaneous mutual requests** — `findExisting` + `create` not transactional, `@@unique` doesn't cover the reverse pair → two rows for one relationship possible. |
| C-11 | P3 | OPEN | Pull-to-refresh spinner never shows (`refreshing={loading}` while `loading` also swaps the list for a full-screen ActivityIndicator). — `ConnectionsScreen.tsx:364-383` |
| C-12 | P2 | OPEN | **Followed businesses are invisible.** Personal-mode "follow" relationship has no list anywhere; `GET /businesses/:id/followers` uncalled; in personal mode the Companies tab is permanently empty. |

## 4. Company membership (join, invites, roles)

| ID | Sev | Status | Finding |
|---|---|---|---|
| M-1 | P0 | FIXED ✅ | **Join-request approval corrupted state on paywalled tenants.** The request was marked `APPROVED` *before* the staff-limit/paywall check; on 403 the request stayed resolved, no `BusinessMember` was created, the user got a "you were accepted" notification for a company they never joined, and re-approval was blocked by the `PENDING` guard. Check now runs first. — `backend/server.js:12939-13005` |
| M-2 | P0 | FIXED ✅ | **Accepting a company invite didn't refresh `userBusinesses`** — the new company didn't appear in the switcher until relogin. — `NotificationsScreen.tsx` (invite_received handler) |
| M-3 | P1 | OPEN | **Inviting team members is impossible from the UI.** Email invites were deliberately removed; `inviteStaff()` / `InviteTeamModal` are orphaned (zero importers); the remaining share-link uses dead domain `https://noupro.app/join/:id` — not in linking prefixes, no such route. Needs an in-app invite flow (search user → `POST /companies/:id/users/invite`, endpoint works). — `InviteStaffScreen.tsx:22`, `team.service.ts:156-170` |
| M-4 | P2 | OPEN | **Cold-start location list is empty.** `PersonalProfileScreen` reads `businessStore.locations`, populated only after `fetchLocations()` — never called on cold start, so the location sub-list never expands. — `PersonalProfileScreen.tsx:188-223` |
| M-5 | P3 | OPEN | `removeTeamMember` without `locationId` calls the "revoke invite" endpoint to remove accepted members — works (backend handles both) but semantics conflated. — `team.service.ts:123-133` |

## 5. Business ↔ Business connections

| ID | Sev | Status | Finding |
|---|---|---|---|
| B-1 | P0 | FIXED ✅ | **Accept/Decline of business connection requests always failed.** The notification handler called the *user*-connection endpoints (`PATCH /connections/:id/accept`) with a `BusinessConnection` id → 404 → "Failed to update request" every time. Now routed by payload shape to `/business-connections/:id/accept|reject`. Also: tapping a personal-mode `company_request` (payload carries `userId`, no `companyId`) was a silent no-op — now navigates to the requester's profile. — `NotificationsScreen.tsx:380-388,464-468` |
| B-2 | P1 | OPEN | **Legacy route creates duplicate/inconsistent connection rows.** `POST /api/companies/:companyId/connections` (`server.js:6455`) writes directly with no reverse-direction check (the `@@unique` is direction-specific) — B→A pending + A→B accepted can coexist; status lookups become nondeterministic. The parallel `/business-connections/request` route checks both directions. Align or remove the legacy route. |
| B-3 | P1 | OPEN | **A company can accept but never decline or disconnect.** `PATCH /business-connections/:id/reject` (3438) and the remove route (3458) have no frontend callers (decline now used by B-1 fix from notifications; profile-level manage/disconnect UI still missing). |
| B-4 | P3 | OPEN | `PROFILE_ACTION_CONFIGS[OTHER_BUSINESS]` includes `'Block'` but no business-block endpoint or UI exists — dead config. — `shared/types/profile.ts:96` |

## 6. Search & discovery

| ID | Sev | Status | Finding |
|---|---|---|---|
| S-1 | P0 | FIXED ✅ | **Search screens had no search input.** `UserSearchScreen` and `CompanySearchScreen` only rendered `route.params.query`; six entry points ("Start new chat" from both inboxes + overlay, "Join a business" from profile/settings) passed `query: ''` → `No users found matching ""` with no way to type. Both screens now have a debounced search input. |
| S-2 | P1 | OPEN | **`restrictToInternal` is ignored** — "new internal chat" lists every user on the platform instead of teammates. Tenant-scoping gap in the UI (needs backend support for a company-scoped user search). — inbox screens → `UserSearchScreen` |
| S-3 | P2 | OPEN | **`mode: 'join'` is ignored** by CompanySearchScreen — the "join a business" intent downgrades to browsing; user must find "Request to Join" in the ⋯ menu of each profile. |
| S-4 | P1 | OPEN | **User search exposes `email` for every match** regardless of `privacySettings.show_email_publicly`, and results are not block-filtered (C-7). — `server.js:2004-2009` |
| S-5 | P3 | OPEN | Dead code: `features/search/components/SearchResultsList.tsx` (297 lines) and `features/search/components/FilterBar.tsx` (91 lines) — zero importers. |

## 7. Notifications & first-run experience

| ID | Sev | Status | Finding |
|---|---|---|---|
| N-1 | P0 | FIXED ✅ | **`order_update` taps did nothing** — stale "no OrderDetail screen yet" comment; `OrderDetails` is registered and the payload carries `orderId`. Highest-volume business notification type. — `NotificationsScreen.tsx:516-518` |
| N-2 | P0 | FIXED ✅ | **Push token survived logout** — `logout()` cleared everything except the push registration; a logged-out device kept receiving the old account's pushes. Now best-effort unregisters before clearing. — `profileStore.ts:328-352` |
| N-3 | P0 | FIXED ✅ | **New-user welcome feed linked to nonexistent entities** — ~12 seeded example posts with fabricated IDs wired to ViewBusinessProfile/ProductDetail → "Business not found" on a new user's very first tap. Now labeled as example content with dead taps disabled (Arnaud's decision: keep the feed, mark + disable). — `useFeed.ts`, `HomeScreen.tsx` |
| N-4 | P1 | OPEN | **The notification badge is cosmetic.** Unread count is computed only when the Notifications screen mounts (lazily), so at launch it's always 0; `markAllAsRead()` on focus + on mode-switch (`NotificationBell`) permanently zeroes it while unread rows remain. Needs an app-level unread fetch + real read-state sync. — `NotificationContext.tsx`, `NotificationsScreen.tsx:303-305,547-551` |
| N-5 | P1 | OPEN | **Push taps don't deep-link.** `addNotificationResponseListener` has zero call sites; every backend `data` payload (`delivery_status`, `issue`, `chatId`, `stuck_orders`) is discarded — tapping a push just opens the app wherever it was. — `pushNotifications.ts:97-111` |
| N-6 | P1 | OPEN | **Onboarding notification cards are unreachable in practice** — gated on `isNewUser`, which `HomeScreen` clears on a 5-second timer; unless the user opens Notifications within 5s they never see the only onboarding guidance in the product. — `HomeScreen.tsx:56-62`, `NotificationsScreen.tsx:262` |
| N-7 | P2 | OPEN | **No backend welcome/onboarding notification** — register creates only the User row; a brand-new user's notification screen is empty ("You're all caught up", no CTA). |
| N-8 | P2 | OPEN | **`notifications_on` is a phantom field** — not in the schema, defaulted to `true` by `normalizeUser`, silently resets on every login for users who turned it off. Needs a real preference (schema or NotificationPreference). — `profileStore.ts:175`, `App.tsx:760` |
| N-9 | P2 | OPEN | **Push token registration fails silently with no retry** — common right after signup (permission race/offline); nothing retries until `isSignedIn` changes again. — `pushNotifications.ts:73-75` |
| N-10 | P2 | OPEN | **Recurring alerts pre-marked read.** Derived keys (`stock-low-${id}`, `sub-due-${bizId}`) mean the *next* occurrence of the same alert is born read; stock alerts also hardcode `time:'now'` so they always sort to top. — `server.js:14623,14659` |
| N-11 | P2 | OPEN | Tapped rows stay visually unread until manual refresh (fire-and-forget mark-read never mutates local list); no refetch on screen focus. — `NotificationsScreen.tsx:441-445` |
| N-12 | P2 | FIXED ✅ | `join_request_rejected` was missing from the frontend `Notification` type union (backend emits it, screen renders it). One-line addition. — `notifications.service.ts` |
| N-13 | P3 | OPEN | OS notification-permission dialog fires the instant a new user first signs in — no priming screen/explanation. — `App.tsx:759-775` |
| N-14 | P3 | OPEN | Simulator/denied-permission produce the same misleading "enable notifications in settings" message. — `PersonalSettingsScreen.tsx:66-72` |
| N-15 | P3 | OPEN | Dead code: `NotificationBell` component never rendered (navigators use inline `CountBadge`); FE-only orphan types `message`/`system` never emitted by backend. |

---

## Fix log (this session, 2026-08-05)

All 13 P0s above (A-1 … A-5, PR-1, C-1, C-2, M-1, M-2, B-1, S-1, N-1, N-2, N-3) plus the one-line N-12 type fix.
Verified: ESLint 0 errors, backend test suite 58/58 pass, `node --check backend/server.js` OK, `tsc --noEmit` introduces no new errors (all remaining tsc errors pre-date this session — confirmed against git HEAD). Sandbox has no network access — see the smoke-test checklist handed to Arnaud in the session summary.

## Backlog

**Next session (P1):**
1. `getApiErrorMessage()` helper + sweep so backend messages actually reach users (A-6, PR-8)
2. Connection management UI: pending-requests section, cancel sent, disconnect, unblock + blocked list (C-3, C-4, C-5)
3. Real notification unread badge + push-tap deep-linking (N-4, N-5)
4. Privacy batch: block enforcement on profile/search, hide email in search per privacy settings, soft-deleted filter (C-7, C-8, S-4)
5. Business connection integrity: retire/fix legacy route, decline/disconnect UI (B-2, B-3)
6. Team invite flow completion (M-3)
7. Onboarding: fix `isNewUser` race, duplicate-account recovery CTA (N-6, A-7)

**Dedicated session (schema migration):** server-side OTP verification enforcement (A-8), real `notifications_on` preference (N-8).

**P2/P3:** everything else above, individually small.
