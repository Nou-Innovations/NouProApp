# User Flows Audit — Round 2 (deep pass)

**Date:** 2026-08-05
**Companion to:** `USER_FLOWS_AUDIT.md` (round 1, same day — its 13 P0s are fixed and verified still fixed)
**Scope:** Everything a *user* touches — sign up / sign in / account lifecycle, profile view & edit, user↔user connections, company membership (invites, join requests, roles), company↔company links, the first-start experience, and notifications (in-app + push).
**Method:** Five parallel full-stack traces (auth, profile, connections, membership, notifications) across `src/features/*`, `src/modes/personal`, `src/shared`, `backend/server.js`, repositories and `schema.prisma`. **Every P0 below was re-verified by direct read before being written down** — file, line and exact mechanism given for each.

**Severity:** **P0** = broken or user-visibly wrong for everyone who tries it · **P1** = real bug or missing piece users will hit · **P2** = polish / integrity.

**Status: every P0 and every P1 in this document is now fixed.** Batches 1–4 closed the P0s; the P1 sweep (phases 1–3) plus the individual A-*/P-*/N-* batches closed the rest. What remains is **22 P2 rows** — the authoritative list is the per-section tables above (rows not marked FIXED), never this line.

---

## Executive summary

Round 1 fixed the 13 flows that were *obviously* broken. This deeper pass found **16 new P0s** that round 1 missed, because they hide behind code that *looks* correct — a wrong HTTP verb, a null-vs-undefined check, a modal missing its input field, a success dialog with no network call behind it.

The headline results:

1. **Editing your profile fails for every single user.** A null-slug uniqueness check returns 409 on every save. Nobody can change their name, job title, bio or privacy settings. This is the single highest-impact bug in the app.
2. **There is a privilege-escalation hole.** Any *admin* of a company can promote themselves to `super_admin` or demote/suspend the owner, through a route that is missing the guard both of its sibling routes have.
3. **Push notifications don't exist for the social layer.** No invite, join request, connection request or acceptance ever sends a push — and *no* push tap deep-links anywhere, warm or cold. The core loop of the product is poll-only: you find out you were invited to a company only if you happen to open the Notifications tab.
4. **Four "success" dialogs are theatre** — leaving a workplace, deleting a company, deleting an account (from two different screens), and assigning a role to someone who just joined. Each tells the user it worked; none makes an API call.

A recurring root cause runs through a third of these: **`ApiError.response` is the response *body*, not an axios response object.** Code written as `err.response.data.message` or `err.response.status` is always `undefined`, so entire error branches are unreachable and backend messages never surface. Round 1 logged this as A-6; this pass shows it also silently disables the delete-account 409 guidance, the 2FA errors, and the join/leave-company error paths — and in one place it crashes the UI outright.

---

## 0. Security

| ID | Sev | Finding |
|---|---|---|
| **S-1** | **P0** | **FIXED ✅** — **Any admin can escalate to owner, or lock the owner out.** `POST /api/companies/:companyId/locations/:locationId/staff` (`backend/server.js:12290`) is guarded only by `requireBusinessAdmin`, which admits `admin` (`server.js:766`). It then runs `updateBusinessMember(bm.id, { role, status })` (`server.js:12338-12341`) with **no role-hierarchy check**. So an admin can POST `{ userId: <self>, role: 'super_admin' }` to self-promote, `{ userId: <owner>, role: 'staff' }` to demote the owner, or `{ status: 'suspended' }` to lock them out. Both sibling routes have exactly the guard this one lacks — location PATCH at `server.js:12423-12425`, business PATCH at `server.js:12482-12487` (*"Only a super_admin can change a super_admin role."*). Blast radius is limited today only because no UI calls this route yet — but it is reachable with any admin token. **Fix: copy the guard from `server.js:12482-12487`.** |

---

## 1. Sign up / sign in / account lifecycle

| ID | Sev | Finding |
|---|---|---|
| **A-1** | **P0** | **FIXED ✅** — **2FA can never be turned off.** The "enter your password to disable" modal (`TwoFactorAuthScreen.tsx:319-335`) renders `AppModal` with only `title`/`message` — **no password input**. `AppModal` supports a `children` slot for exactly this (`AppModal.tsx:30-31`), but none is passed, so `disablePassword` is only ever `''` and `handleDisable2FA` always hits its own guard (`:60-63` → "Please enter your password"). The backend `POST /auth/2fa/disable` (`server.js:1771`) is fine and unreachable. Once a user enables 2FA they are locked into it. |
| **A-2** | **P0** | **FIXED ✅** — **Every rate-limit hit shows `"Request failed with status code 429"`.** The limiters set `message: { success: false, error: '...' }` (`server.js:346,355,367,384,396`) — no `message` key inside the body — but the client reads `error.response?.data?.message` (`api.ts:122`). So the written text "Too many attempts, please try again later" is never displayed. Affects login, register, refresh, forgot-password, all four OTP endpoints, 2FA verify, data export and join requests. |
| **A-3** | **P0** | **FIXED ✅** — **Deleting your account as a sole owner shows a raw error code.** `DeleteAccountScreen.tsx:36` reads `error?.response?.status`, but `ApiError.response` is the *body* and the status lives at `error.status` (`api.ts:46-51`). Both branches are dead, so the backend's 409 — whose `message` is the literal string `OWNERSHIP_TRANSFER_REQUIRED` (`server.js:2214`) — falls to the generic branch and the user sees an alert titled **"Error"** saying **"OWNERSHIP_TRANSFER_REQUIRED"**. The helpful "transfer ownership of X first" text and the business list in `data.businesses` are never shown. The 401 "wrong password" branch is dead the same way. |
| A-4 | P1 | **FIXED ✅** — **Refresh sits behind the per-IP auth limiter, and a 429 there force-logs-you-out.** `server.js:1322` applies `authLimiter` (15 req/15 min per IP) to `/auth/refresh`, and `api.ts:141-143` retries refresh up to 2× on network error — one Render cold start burns 3 slots. On exhaustion the interceptor's `catch { return null }` (`api.ts:179`) treats 429 identically to "invalid token" → `logout()`. Behind office NAT/CGNAT, users share the key and get logged out at random. |
| A-5 | P1 | **FIXED ✅** — **Refresh failure = silent logout, no message, plus a duplicate error.** `api.ts:203` logs out, then `api.ts:219` still throws to the caller — so the screen renders an error state on the same tick the tree is swapped for the auth navigator. The user lands on the Launch screen with no explanation; "session expired" is never shown anywhere. |
| A-6 | P1 | **FIXED ✅** — **Changing your password silently kills your own session ~30 min later.** `server.js:1519` bumps `tokenVersion`, invalidating the caller's own refresh token, but `ChangePasswordScreen.tsx:71-78` never re-authenticates — it alerts "Success" and goes back. The access token stays valid for 30 min, then the next refresh 401s → A-5 → forced logout out of nowhere. |
| A-7 | P1 | **FIXED ✅** — **Logging out on one device logs you out everywhere.** `POST /auth/logout` does `tokenVersion: { increment: 1 }` (`server.js:1207-1212`), revoking every device's refresh token. No session/device table exists and no UI warns about it. |
| A-8 | P1 | **FIXED ✅** — **Onboarding seeds only the access token, never the refresh token.** `UploadProfilePictureScreen.tsx:71`, `SelectCompanyScreen.tsx:60-62`, `UploadBusinessLogoScreen.tsx:48-51` all set `accessToken` alone; a 401 mid-onboarding finds `refreshToken === null` (`api.ts:169-170`) → `logout()` wipes the store mid-registration. The 4-screen business-creation branch can easily outlive the 30-min token. |
| A-9 | P1 | **FIXED ✅** — **Twilio is a hard single point of failure for signup, with no dev fallback.** `server.js:1560-1564` (and `:1594,:1631,:1659`) return 503 when the Twilio vars are unset, and `CreateAccountScreen.tsx:82-88` only navigates on success — so the user never reaches the OTP screen where the `__DEV__` bypass code lives (`PhoneVerificationScreen.tsx:23`). **Registration is 100% unreachable without Twilio, even in dev.** Email OTP uses the same Verify service, so it isn't an independent fallback. |
| A-10 | P1 | **FIXED ✅** — **Verification is decorative and unrecoverable** (extends round-1 A-8). No `emailVerified`/`phoneVerified` columns exist; the OTP endpoints persist nothing; `register` never checks them. Additionally there is **no post-signup resend path** — the OTP screens are only reachable *before* the account exists, so nothing can ever mark a user verified later. |
| A-11 | P1 | **FIXED ✅** — **Biometric auto-login can never run.** `App.tsx:732` returns early in both possible states: `staySignedIn: true` → rehydration already set `isSignedIn` → return; `staySignedIn: false` → rehydration forces `biometricEnabled: false` (`profileStore.ts:714`) → return. Even if it ran, `refreshToken()` only restores tokens, never `currentUser`, so `isSignedIn` would stay false. `BiometricLoginScreen.tsx:106-109` lets users enable a feature that does nothing. |
| A-12 | P2 | Forgot-password's "fail loud" guard is production-only (`server.js:1235`) — on staging with no SMTP it still lies "check your email". |
| A-13 | P2 | `failedLoginAttempts` is an unbounded in-memory Map with no TTL sweep (`server.js:1063`); email enumeration grows it forever. |
| A-14 | P2 | `logout()` resets `staySignedIn` to `true` via `set({ ...initialState })` (`profileStore.ts:359`) — an explicit opt-out is forgotten on every logout. |
| A-15 | P2 | The two OTP screens are the only signup screens with no visible back button. 2FA `tempToken` expires in 5 min with no countdown, resend or "start over" (`server.js:1128`). |
| A-16 | P2 | Dead code: `authService.ts` (0 importers), the auth `index.ts` barrels, the `verificationMethod` nav param (written 3×, read never), `authAPI.getCurrentUser` (0 callers), `authAPI.register`'s `profilePicture` param. |

---

## 2. Profile (view / edit / avatar / settings)

| ID | Sev | Finding |
|---|---|---|
| **P-1** | **P0** | **FIXED ✅** — **Saving your profile fails for every user.** The edit form always sends the key: `profileSlug: personalInfo.profile_slug \|\| null` (`EditPersonalProfileScreen.tsx:192`). The backend guards with `if (profileSlug !== undefined)` (`server.js:1924`) — and `null !== undefined`, so the check runs — then does `findFirst({ where: { profileSlug: null, NOT: { id: self } } })`. Since `profileSlug` is `String? @unique` (`schema.prisma:32`) and Postgres permits many NULLs, this **matches any other user without a slug**, i.e. essentially everyone → **409, nothing persists**, and the user sees "Failed to save profile. Please try again." (`:219`). Name, job title, bio, address and privacy toggles are all unsaveable. **Fix: guard on truthiness (`if (profileSlug)`) plus an explicit clear-slug path.** (Round 1's PR-8 saw the symptom and read it as a message-surfacing problem — this is the actual root cause.) |
| **P-2** | **P0** | **FIXED ✅** — **`profile_slug` is never read back, so fixing P-1 would then wipe slugs.** `normalizeUser` (`profileStore.ts:167-181`) maps `avatar`, `jobTitle`, `privacySettings`, `connectionsCount`… but **not** `profileSlug → profile_slug`. The form reads `currentUser?.profile_slug`, so the field is blank after every relogin — and once P-1 is fixed, the next save sends `profileSlug: null` and erases an existing slug. **These two must be fixed together.** |
| **P-3** | **P0** | **FIXED ✅** — **"Edit workplace" is a permanent dead end.** `EditPersonalProfileScreen.tsx:271` navigates with `{ businessId }`, but `EditWorkExperienceScreen.tsx:26` reads `route.params.experienceId` → `undefined` → the lookup at `:53` never matches → "Experience not found" forever. Worse, the list is built from `userBusinesses` (company memberships), whose ids live in a different table than `WorkExperience` — so renaming the param alone can't fix it; the data model has to be reconciled first. |
| **P-4** | **P0** | **FIXED ✅** — **"Leave workplace" and "Delete company" are fake.** `ProfileSettingsScreen.tsx:102-106` shows *"You have left the workplace."* and navigates back — with no API call. `:97-100` does the same for *"Company deletion process started…"*. A real `leaveCompany` exists (`profileStore.ts:531-534`) and a real `DELETE /companies/:id/members/me` exists (`server.js:12800`). |
| **P-5** | **P0** | **FIXED ✅** — **The sidebar's "Settings" leads to a stub with a fake "Delete account".** `SidebarContent.tsx:392` routes personal mode to `PersonalProfileSettings` — a two-row screen whose `confirmDeleteAccount` (`PersonalProfileSettingsScreen.tsx:87-90`) just alerts *"Account deletion process started…"*. This is a **second** copy of the round-1 PR-5 stub, and it sits behind the app's most discoverable Settings entry point, while the real settings hub is reachable only from the gear icon on the profile screen and the working `DeleteAccountScreen` is buried under Security. **App Store 5.1.1(v) risk** — account deletion must actually delete. |
| P-6 | P1 | **FIXED ✅** — **Email/phone are freely editable, unverified, and can lock you out.** `PATCH /auth/me` assigns them blind (`server.js:1918-1919`). Clearing the email field sets `email = null`, and login is email-only → the account becomes unreachable. No OTP, no password re-auth, and a uniqueness collision throws P2002 → generic 500 instead of a usable 409. No dedicated change-email/phone screen exists. |
| P-7 | P1 | **FIXED ✅** (`6f1b7fe7`) — **Avatar upload failure is completely silent on the profile screen.** `PersonalProfileScreen.tsx:89-101` has **no `else`** for `uploadResult.success === false`, and the catch blocks only `console.error`. With the Supabase bucket still unprovisioned, the spinner runs, stops, and nothing changes — zero feedback. (The Edit-Profile copy of the same flow *does* alert — inconsistent.) |
| P-8 | P1 | **FIXED ✅** (`6f1b7fe7`) — **Avatars die on the next deploy.** With Supabase unset, uploads fall back to local disk served from `/uploads` (`server.js:13566`, `:278`). Other users *can* see them — until Render's ephemeral disk is wiped on redeploy, after which every avatar 404s and silently falls back to initials. |
| P-9 | P1 | **FIXED ✅** (`6f1b7fe7`) — **`currentUser` is never re-synced from the server.** `authAPI.getCurrentUser()` has zero callers; `refreshBusinesses()` fetches `/auth/me` but discards `response.user` (`profileStore.ts:519-524`). So `connections_count` is frozen at login value, edits made on another device never appear, and `twoFactorEnabled` can desync. |
| P-10 | P1 | **FIXED ✅** (`6f1b7fe7`) — **`headline`, `bio` and `industry` are editable but rendered nowhere** — not on your own profile, not on anyone else's (`UserProfileData` doesn't even declare them). A user can write a 2000-character bio that no one, including themselves, can ever read. |
| P-11 | P1 | **FIXED ✅** — **Work experiences added via `AddWorkExperience` are invisible.** The POST is real (`server.js:5759`) but nothing renders `WorkExperience` rows — every list iterates `userBusinesses` or server-derived `BusinessMember` rows instead. Data is written and never shown (except in the GDPR export). |
| P-12 | P1 | **FIXED ✅** — **Blocking is a one-way trip.** After blocking, the ⋯ menu still says "Block" (never "Unblock"), the profile renders normally, and Message stays enabled (failing server-side with a generic message). `unblockUser` and `GET /api/blocks` have zero callers. And the blocked user is **unaffected**: `GET /api/users/:userId` and `/api/users/search` never consult `blockRepo`, so they still find you and open your profile (round-1 C-7, confirmed open). |
| P-13 | P1 | **FIXED ✅** — **"Privacy Policy" is a placeholder alert** (`PersonalSettingsScreen.tsx:104-106`) though the backend already serves `/legal/*`. Store-review blocker. |
| P-14 | P1 | **FIXED ✅** — **A Sentry test-error button ships in user settings** (`PersonalSettingsScreen.tsx:350-366`), labelled "temporary", tappable by any user. |
| P-15 | P2 | Notification preferences fail silently in both directions — load errors substitute all-`true` defaults, save errors silently revert the switch (`NotificationPreferencesScreen.tsx:40-72`). |
| P-16 | P2 | `language` and `coverPhoto` have schema columns and API support but no UI anywhere. "Show this workplace on profile" toggles are still local-only (round-1 PR-6). No "remove photo" option exists. |
| P-17 | P2 | No server-side validation of `name` (empty accepted) or `profileSlug` (no length cap, charset check, or reserved words like `me`/`admin`/`search`). |
| P-18 | P2 | "Share Profile" shares plain text with no URL, even though `profileSlug` and a public `GET /api/profile/:slug` route exist — the whole slug feature has no consumer. |

**Healthy, verified:** the Report flow (reason lists match exactly end-to-end, self-report guarded, persists correctly), block/unblock endpoints themselves, `UserProfileScreen`'s loading/error/empty states, and privacy stripping on `GET /users/:userId`.

---

## 3. User ↔ user connections

| ID | Sev | Finding |
|---|---|---|
| **C-1** | **P0** | **FIXED ✅** — **Accepting a connection request from a profile always fails.** `UserProfileScreen.tsx:203` sends `POST /connections/:id/accept`, but the backend only registers `app.patch` for that path (`server.js:3162`; the sole `app.post` under `/api/connections` is `/request`). Express 404s → "Failed to accept connection request." The Accept button on profiles is 100% dead. The Notifications screen uses the correct verb, which is why round 1 didn't catch it. |
| **C-2** | **P0** | **FIXED ✅** — **Any backend error on "Connect" crashes the dialog.** `UserProfileScreen.tsx:228` reads `err?.response?.error` — and since `ApiError.response` is the body, `.error` is the **object** `{ code, message }` (`backend/src/utils/response.js:17-21`). That object is passed into `AppModal`'s `<Text>{message}</Text>` → *"Objects are not valid as a React child."* Triggered by every 409 (already pending / already connected) and 403 (blocked) — i.e. any time the profile data is stale. Correct read is `err.message`. |
| C-3 | P1 | **FIXED ✅** — **Still zero connection-management UI** (round-1 C-3/C-4/C-5 confirmed unchanged). No pending-requests tab, no cancel-sent, no disconnect, no unblock, no blocked list. `GET /connections/pending`, `DELETE /connections/:id`, `DELETE /users/:id/block` and `GET /blocks` all have **zero** callers. The "Pending" and "Connected" buttons are alert dead-ends. |
| C-4 | P1 | **FIXED ✅** — **`GET /connections/pending` leaks a stranger's full user record.** `server.js:3257-3264` strips only `passwordHash`, `twoFactorSecret` and `twoFactorBackupCodes` from an `include: { sender: true }`, so before you accept, you receive the requester's `email`, `phone`, `address`, `privacySettings`, `tokenVersion`, `lastLoginAt` and `deletedAt` — bypassing the privacy gate `GET /users/:userId` applies. Same over-sharing in `GET /connections`. |
| C-5 | P1 | **FIXED ✅** (`498e8d47`) — **Unlimited request spam; declining achieves nothing.** No rate limiter on `POST /connections/request`, and a `rejected` row is deleted and re-created on re-request (`server.js:3149-3151`) — the sender's button even reverts to "Connect". Mirror the 7-day cooldown that role requests already have. |
| C-6 | P1 | **FIXED ✅** — **`ConnectionsScreen` ignores `route.params.userId`.** All four callers pass a real id (`UserProfileScreen.tsx:437`, `BusinessProfileScreen.tsx:1031`, and both own-profile screens) and every one lands on *your own* connections. Fixing it also needs a backend change — `GET /connections` is hard-scoped to `req.user.id`. |
| C-7 | P1 | **FIXED ✅** (`498e8d47`) — **Two rows for one relationship are possible.** `@@unique([senderId, receiverId])` is direction-specific and the check-then-write isn't transactional, so simultaneous A→B and B→A both succeed. Afterwards status lookups use `findFirst` → nondeterministic, and `blockUser` removes only one row, leaving a live request from a blocked user. |
| C-8 | P1 | **FIXED ✅** — **Soft-deleted users leak into connection lists** — `userRepo.getById` has no `deletedAt` filter, unlike search which explicitly excludes them. |
| C-9 | P2 | "Connection accepted" notifications use `createdAt` (when the request was *sent*), so an acceptance of a 31-day-old request produces no notification at all, and a 20-day-old one reads "20 days ago". `acceptRequest` doesn't touch `updatedAt` either. |
| C-10 | P2 | Pending user↔user requests are typed `company_request`, forcing the frontend to sniff payload shape to choose an endpoint — the exact fragility that caused round-1's B-1. There is also no "your request was declined" signal at all. |
| C-11 | P2 | Pull-to-refresh spinner never appears (`refreshing={loading}` while `loading` also swaps in a full-screen spinner). The empty-state "Find people" CTA goes to the business/product Explore surface, which has no people and no Connect action. |

---

## 4. Company membership (invites, join requests, roles)

| ID | Sev | Finding |
|---|---|---|
| **M-1** | **P0** | **FIXED ✅** — **Assigning a role after someone joins is fake.** The `join_accepted` card renders a role dropdown (`NotificationsScreen.tsx:167-182`) captioned *"joined your company — assign their role"*, and `handleConfirmRoleChange` (`:434-443`) writes to local state and shows *"Role has been changed to Admin."* — **with no API call anywhere in the function**. The admin believes they granted a role; the server never hears about it. |
| **M-2** | **P0** | **FIXED ✅** — **`RoleRequestsScreen` is permanently blank.** `RoleRequestsScreen.tsx:48-49` does `setRequests(data)` where `data` is the unwrapped `{ requests: [...] }` **object** (`server.js:12944` returns `successResponse({ requests })`). So `requests.length` is `undefined`, the empty-state branch is skipped, and the FlatList renders zero rows with no message. `team.service.ts:231` shows the correct pattern (`response?.requests \|\| []`). This is the *only* dedicated surface for staff→admin upgrade requests. Rows also read `item.userName`/`item.userAvatar`, which the repo never returns (it returns a nested `user`). |
| M-3 | P1 | **RESOLVED BY DESIGN ✅** — co-owners replace transfer; see the Batch 4 log. — **Admin can remove the owner, and no ownership-transfer endpoint exists.** `DELETE /companies/:id/users/:userId/invite` (`server.js:12735`) only checks that ≥1 admin-or-super_admin remains, so an admin can delete the owner's membership. The error text says *"Transfer ownership first"* — grep finds no such endpoint anywhere. |
| M-4 | P1 | **FIXED ✅** — **The owner can leave and permanently orphan the company.** `server.js:12816-12827` counts `admin \|\| super_admin` as "remaining admins", so a super_admin can leave with only a plain admin left — and `server.js:12482-12487` then forbids anyone from ever granting `super_admin` again. Unrecoverable without direct DB access. |
| M-5 | P1 | **FIXED ✅** — **Email invites create a shadow account that blocks the invitee from ever signing up.** `server.js:12645-12653` creates a `User` with the email and no `passwordHash`; `POST /auth/register` then rejects that email with 409 (`server.js:1410-1414`). The invitee can never register. It's also an account-squatting primitive — any admin can burn arbitrary email addresses. **This is the endpoint the missing invite UI (round-1 M-3) would expose**, so it must be fixed before that UI ships. |
| M-6 | P1 | **FIXED ✅** (already fixed, confirmed in phase 1) — **Staff can never leave a company.** The only Leave UI is inside `CompanySettingsScreen`, wrapped in `BusinessAdminGuard` and reachable only in business mode — which staff are hard-blocked from entering. The backend route works and is unreachable. |
| M-7 | P1 | **FIXED ✅** (`6f1b7fe7`) — **Adding a member directly is silent and consent-free** — `server.js:12330-12337` creates the `BusinessMember` outright with `status='accepted'` by default, no invite, no consent, no notification. Only `invited` rows generate a notification. |
| M-8 | P1 | **FIXED ✅** (`6f1b7fe7`) — **The mode-scoped notification split hides half these flows.** `invite_received` / `join_request_accepted` / `join_request_rejected` render only in **personal** mode; `staff_request` / `join_accepted` / `invite_pending` only in **business** mode (`server.js:14441` vs `:14691`). An admin working in business mode never sees an invite addressed to them — and with the badge still cosmetic (N-5), it can sit unseen indefinitely. |
| M-9 | P1 | **FIXED ✅** — **The requester gets no pending state and can't withdraw.** `BusinessProfileScreen.tsx:384-389` shows "Request to Join" whenever the user isn't an *accepted* member, so a pending request still shows the CTA; a second tap 400s and the message is swallowed by the wrong error path (`:411`). No cancel route exists for the requester. |
| M-10 | P2 | Pending invites consume paid staff seats (`getStaffCount` counts everything not suspended). Invites never expire — there's no expiry column. `server.js:12691-12692` mints an `inviteToken`/`inviteLink` per request that is never persisted and never served. |
| M-11 | P2 | Demoting a super_admin from Team Management always 400s — `TeamManagementScreen.tsx:213` routes through the location PATCH, which rejects super_admin targets by design. |
| M-12 | P2 | `switchToPersonal()` leaves `businessStore` populated, and a failed `fetchLocations` after a company switch leaves `currentLocation` pointing at the *previous* company's location — location-scoped queries then carry a foreign `locationId`. |
| M-13 | P2 | `cancelRoleRequest` sends `status: 'CANCELLED'`, which the backend rejects (currently zero callers). Dead code: `InviteTeamModal.tsx`, `team/components/AssignStaffModal.tsx`. |

---

## 5. Company ↔ company connections

| ID | Sev | Finding |
|---|---|---|
| B-1 | P1 | **FIXED ✅** (already fixed, confirmed in phase 1) — **No screen for incoming partner requests.** `GET /business-connections/:businessId/pending` (`server.js:3517`) has zero frontend callers; the only surface is the notification feed, and `ConnectionsScreen` filters to accepted only. No disconnect UI either (round-1 B-3 confirmed open). |
| B-2 | P1 | **FIXED ✅** (`6f1b7fe7`) — **Two parallel implementations still coexist** (round-1 B-2 confirmed open). The legacy `POST /api/companies/:companyId/connections` (`server.js:6468`) writes with no reverse-direction check, while the canonical `/business-connections/request` checks both — and `ConnectionsScreen.tsx:85` still reads from the legacy one. |
| B-3 | P1 | **FIXED ✅** — **Supplier↔business linking has schema, backend and a nav type but no UI.** `navigation.ts:385` declares `AddSupplier: { supplierBusinessId?: string }`; `AddSupplierScreen` never reads it and no caller passes it. Customers have the equivalent UI (gated on accepted connections) — suppliers are the asymmetric gap. |
| B-4 | P2 | **CRM links are unilateral, unvalidated and unnotified.** `customerBusinessId`/`supplierBusinessId` are written (`server.js:5026,5062,7540`) with no existence check, no connection check and no notification — company A can silently list company B as its customer. The only *consented* company↔company relationship is `BusinessConnection`. |

---

## 6. First-start experience & notifications

| ID | Sev | Finding |
|---|---|---|
| **N-1** | **P0** | **FIXED ✅** — **The new user's only CTA leads to a dead button.** The empty feed's "Explore NouPro" (`HomeScreen.tsx:273`) opens `ExploreOverlay`, whose every "Connect" calls `toggleConnect` → `if (!myId) return` (`useExploreDiscovery.ts:85`), where `myId = activeBusiness?.id`. A personal user with no company has no `activeBusiness`, so **every Connect tap silently does nothing** — no error, no state change. The "recommended" and "nearby" sections are empty for them too (both gated on `activeBusiness`), leaving a bare directory of dead buttons. |
| **N-2** | **P0** | **FIXED ✅** — **No push notification exists for any social or team event.** There are only five `sendToUsers` call sites in the whole backend — delivery status (`server.js:8910`), issue assigned (`:9258`), chat messages (`:15533`), stuck orders (`orderAutomation.js:344`) and subscription renewals. **Nothing pushes on** join request created/approved/rejected, company invite, user or business connection request/accept, role change, low stock, or invoice paid. The product's core loop is poll-only. |
| **N-3** | **P0** | **FIXED ✅** — **Every push tap is dead — warm and cold** (round-1 N-5, now traced fully). `addNotificationResponseListener` (`pushNotifications.ts:129`) and `addNotificationReceivedListener` (`:139`) both have **zero call sites**, and there's no `getLastNotificationResponseAsync`. Three compounding reasons it isn't a one-line fix: (a) `linking` maps only `OrderDetails` and `InvoiceDetails`, which no push payload matches; (b) `linking` is attached only to the signed-in container (`App.tsx:415`) — the auth container has none, so a push arriving pre-login is dropped with no replay; (c) the two containers are separate trees, so any handler must queue the target until the app is signed in. |
| N-4 | P1 | **FIXED ✅** (`6f1b7fe7`) — **Onboarding cards are unreachable *and* they suppress real notifications.** `NotificationsScreen.tsx:274-279` returns `ONBOARDING_NOTIFICATIONS` **before the API call**, gated on `isNewUser` — which `HomeScreen.tsx:56-63` clears on a 5-second timer. So a user who signs up via an invite and opens Notifications within 5 seconds sees two static cards *instead of* their real pending invite; after 5 seconds, the only onboarding guidance in the product is gone forever. |
| N-5 | P1 | **FIXED ✅** — **The unread badge is cosmetic and the app-icon badge is never touched** (round-1 N-4, mechanism now pinned). The only writer is the Notifications screen itself (`:307-309`), which is a lazy tab — so **at launch the badge is always 0** regardless of pending invites. `useFocusEffect(markAllAsRead)` (`:572-576`) then zeroes the context without marking anything read server-side, and since the effect only refires on *change*, it stays stuck at 0 forever after. No `setBadgeCountAsync` call exists anywhere, and no push payload carries a `badge`. |
| N-6 | P1 | **FIXED ✅** (`498e8d47`) — **`notifications_on` is a phantom field that re-enables push on every login** (round-1 N-8, consequence now traced). It isn't in the schema and `PATCH /auth/me` never persists it; `normalizeUser` defaults it to `true`. So: user turns push off → token deactivated → next login normalizes it back to `true` → `App.tsx:764-767` re-registers the token → push silently returns, with no dialog since permission is still granted. |
| N-7 | P1 | **FIXED ✅** (`6f1b7fe7`) — **Logout discards the push token even when unregistration fails.** `pushNotifications.ts:118-122` clears the local key in a `finally` with no status check and no retry — so if the device is offline at logout (the common case), the row stays `isActive: true` and **the previous user's pushes keep landing on that device**, with the local key gone and no way to clean up. |
| N-8 | P1 | **FIXED ✅** (this batch) — **Order pushes are filed under the wrong preference.** `eventMessages.js:111` routes order events through the chat push helper, which sends `category: 'messages'` (`server.js:15537`) — so turning off "Messages" kills order pushes, and turning off "Orders" doesn't. |
| N-9 | P1 | **FIXED ✅** — **Tapping a notification never marks it read visually** — fire-and-forget with no local state update (`:461-465`), so the row stays highlighted until a manual refresh. And **"mark all as read" is client-only**: `markAllAsRead` is `setUnreadCount(0)` with no network call, no bulk endpoint exists, and there is no UI button. Server-side rows stay unread forever. |
| N-10 | P1 | **FIXED ✅** — **Permission is requested the instant the user first signs in**, with no priming screen, and a decline is silent (round-1 N-13/N-14). The settings recovery message can't distinguish "denied" from "simulator". |
| N-11 | P2 | **No welcome notification and no seed content** — notifications are *derived* on read from other tables (`server.js:14423-14919`), so there is no table a welcome row could even be written to. No tooltip/coach-mark/checklist system exists anywhere in the app. |
| N-12 | P2 | **No pagination** — the list has no `onEndReached` and the backend hard-caps each section (`take: 50/20/10`, `slice(0,5)`) with no cursor, so older notifications are simply unreachable. Search is client-side over the loaded page only. Every filter tap replaces the list with skeletons (full-screen flash). |
| N-13 | P2 | `subscription_due` navigates to `SubscriptionPlans` discarding `requestData.businessId` — an admin of multiple businesses lands on the wrong one. Stock alerts hardcode `time: 'now'` so they always sort to the top and never age. |
| N-14 | P2 | `NotificationBell` is dead code (zero importers), which also makes the `Notifications` RootStack route unreachable — both modes reach notifications via the tab. `message` and `system` types are handled/typed but never emitted by the backend. |
| N-15 | P2 | The Experience section vanishes entirely for users with no company (`PersonalProfileScreen.tsx:418`), and `ActivityScreen`'s error state is a dead end with no retry (it replaces the list, so pull-to-refresh is gone too). |

**Healthy, verified:** all 16 in-app notification types have correct tap handlers (round-1's N-1 order fix holds), pull-to-refresh works, dead-token pruning works, and push-token upsert is idempotent per user.

---

## Recommended fix order

**Batch 1 — the "nothing works" batch (small, high impact)**
1. **P-1 + P-2 together** — one backend truthiness guard + one line in `normalizeUser`. Unblocks profile editing for the entire user base.
2. **S-1** — copy the existing super_admin guard from `server.js:12482-12487` into `server.js:12290`. Closes the privilege-escalation hole.
3. **C-1** — change `apiPost` to `apiPatch` in `UserProfileScreen.tsx:203`. Makes Accept work.
4. **M-2** — `setRequests(data?.requests || [])`. Makes the role-requests screen render.

**Batch 2 — stop lying to users**
5. **P-4, P-5, M-1** — wire or delete the four fake success dialogs; consolidate the two divergent "Settings" destinations (P-5 is also an App Store blocker).
6. **A-2, A-3, C-2 + the whole `err.response` family** — add the `getApiErrorMessage()` helper round 1 already scoped, extended to read `err.status` (not `err.response.status`) and to never pass an object to a `<Text>`. Sweep all ~12 call sites.

**Batch 3 — the missing core loop**
7. **N-2 + N-3** — add `sendToUsers` calls for the social/team events, then build the push-tap router (with a pre-auth queue and `linking` on both containers). These two together are what make the app feel alive rather than something you have to remember to check.
8. **N-5 + N-9 + N-6** — a real app-level unread fetch, real server-side read state, and a persisted `notifications_on` preference.
9. **C-3** — the connection-management UI (pending list, cancel, disconnect, unblock) that round 1 already put at the top of its backlog.

**Batch 4 — integrity and safety**
10. **M-3, M-4, M-5** — ownership transfer endpoint, orphan-company guard, and the shadow-account fix (required *before* any invite UI ships).
11. **P-6, P-12, C-4** — verified email/phone changes, block enforcement on profile + search, and stop over-sharing user records on the pending-connections endpoint.
12. **A-9** — a dev/staging path for signup that doesn't require Twilio.

---

## Fix log — Batch 1 (2026-08-05)

| ID | What changed |
|---|---|
| **S-1** | Added the missing super_admin guard to `POST /companies/:companyId/locations/:locationId/staff` (`backend/server.js`), mirroring the guards already on the location and business PATCH routes. Any admin granting `super_admin`, or touching a member who *is* `super_admin`, must now themselves be `super_admin`. Verified `assignStaffToLocation` has zero UI callers, so no existing flow is affected. |
| **P-1** | `PATCH /api/auth/me` (`backend/server.js`) now normalizes the slug (empty/whitespace → `null`) and **only runs the uniqueness query for a truthy slug**. Clearing a slug is now an explicit supported path. Profile saving works again for every user. |
| **P-2** | Added `profile_slug` to `normalizeUser` (`src/shared/store/profileStore.ts`) so the slug survives login/rehydrate and the edit form no longer sends `null` over a saved value. |
| **C-1** | `UserProfileScreen.tsx` now sends `PATCH` (not `POST`) to `/connections/:id/accept`, matching the route the backend actually registers. The Accept button on profiles works. |
| **M-2** | `getRoleRequests` (`roleRequest.service.ts`) now unwraps `{ requests: [...] }` and returns a real array, matching its declared return type. Also fixed the row fields in `RoleRequestsScreen.tsx` to read the nested `user.name`/`user.avatar` the repository actually returns, so rows show real names and avatars instead of "Staff Member". |

**Verified:** `node --check backend/server.js` OK · ESLint 0 errors on all changed files (11 warnings, all pre-existing) · `tsc --noEmit` reports **no errors in any changed file** (133 total repo-wide, the known pre-existing baseline) · backend test suite **58/58 pass**.

Not smoke-tested against a running app — the sandbox has no network egress. See the checklist below.

### Smoke-test checklist for these five

1. **Profile save** — Profile → Edit → change your job title → Save. Expect success, and the change still there after a relogin. Then set a Profile URL, save, relogin, confirm it persisted; try a URL another user already has → expect "This profile URL is already taken".
2. **Privilege guard** — as a company *admin* (not owner), try to assign someone the super_admin role → expect 403 "Only a super_admin can change a super_admin role." As the owner, the same action should still work.
3. **Connection accept** — have a second account send you a request, open their profile, tap **Accept** → expect it to succeed and the button to become "Connected".
4. **Role requests** — as a staff member request admin access, then as the owner open Team Management → Access Requests → expect the request to be listed with the requester's real name and avatar.

---

## Fix log — Batch 2 (2026-08-06)

**Phase A — the fake dialogs, Settings routing, error messages**

| ID | What changed |
|---|---|
| **P-4** | "Leave workplace" (`ProfileSettingsScreen`) now calls `removeUserBusiness` → `DELETE /companies/:id/members/me`, with a loading state and the server's "you are the last admin" message surfaced. "Delete Company" is wired in Phase B, once the endpoint existed. |
| **P-5** | Sidebar Settings now opens `PersonalSettings` / `CompanySettings` instead of the two-row stubs, putting the real Settings → Security → Delete Account path behind the main entry point (App Store 5.1.1(v)). Both fake "Delete account" stubs (`PersonalProfileSettingsScreen`, `EditPersonalProfileScreen`) now navigate to the real `DeleteAccountScreen` — they could never have worked inline, since the backend requires a password and a 2FA code when enabled. |
| **M-1** | Role assignment after a join now calls `updateTeamMemberRole` → `PATCH /companies/:id/users/:userId` and refetches. "Super Admin" is hidden from non-super_admins, which the backend 403s anyway. |
| **A-2** | The five rate limiters and two error responses that sent `{error}` with no `message` key now send `message`, so users see the intended text instead of "Request failed with status code 429". |
| **A-3 / C-2** | New `src/shared/utils/apiError.ts` (`getApiErrorMessage`, `isPaywallError`), swept across ~15 sites. Three of them passed the backend's `{code,message}` **object** into a `<Text>` and crashed the dialog (`UserProfileScreen`, `BusinessProfileScreen` ×2). `DeleteAccountScreen` now reads `err.status`, so its 409 "Transfer Ownership First" and 401 branches finally fire. Also fixed `err.code === 'PAYWALL'` (always false — that's the axios code) in two Create screens. |

**Phase B — company archive (the "Delete Company" feature)**

Built as a **soft delete**, because `Order.buyerBusinessId` / `Invoice.clientBusinessId` are plain columns with no FK while the seller-side FKs cascade: a buyer's record of a transaction physically lives on the seller's row, so a hard delete would wipe a trading partner's history.

- `Business.deletedAt` + index, hand-authored migration.
- `DELETE /api/companies/:companyId` — super_admin only, confirmed by typing the company name, idempotent. Unpublishes the page/locations/products and **resets the tier to FREE so the renewal job stops charging the card**. Deletes only *pending* members/role-requests/connections. Never touches orders, invoices or chats — nor *accepted* memberships, which keep ex-members' history reachable and are how restore proves ownership.
- Archived companies now excluded from search, the contacts picker, the public product feed, the three unauthenticated storefront routes, the profile switcher, connect/follow/join actions, and the billing job. (The contacts picker was also leaking soft-deleted *users* — fixed in passing.)
- Tombstones: `isDeleted` exposed via `stripSensitiveBusinessFields`; `ListItemCard` + `Avatar` render muted and force non-tappable; the buyer's order list carries `sellerBusinessDeleted`; an archived company profile returns only `{id,name,logoUrl,isDeleted}` and renders an explanatory screen.
- Restore: `POST /companies` finds archived companies matching the email/phone **but authorizes on still holding an accepted super_admin membership**. Business email/phone are neither unique nor verified, so a match alone must never grant access — otherwise knowing a competitor's public address would hand over their whole history. No candidate → a plain new company, so the attack case is a no-op.

**Verified:** `node --check` OK · `prisma validate` OK · backend tests **58/58** · ESLint **0 errors** · `tsc` **133 errors = unchanged baseline**, none in changed files.

### Smoke-test checklist for Batch 2

1. **Leave workplace** actually removes you (and blocks the last admin with a real message).
2. **Sidebar → Settings** opens the full hub in both modes; Delete account lands on the password-protected screen.
3. **Assign a role** from a "joined your company" notification → confirm it sticks in Team Management.
4. Trigger a rate limit (6 bad logins) → readable message, not "status code 429".
5. **Archive a company** → gone from Explore/search/switcher; wrong name typed → blocked; `admin` (not owner) → refused.
6. **The point of the feature:** a *different* company that bought from it opens Orders → the order is still there, seller name greyed and non-tappable.
7. Its public storefront 404s **while logged out**; chat history intact with a greyed header.
8. Billing: the archived company is FREE and not in the renewal due-set.
9. **Restore:** owner re-runs the wizard with the same email → restore offer → catalogue back, still unpublished.
10. **The attack:** a stranger typing that email gets a plain empty company, no offer.

---

## Fix log — Batch 3 (2026-08-06)

| ID | What changed |
|---|---|
| **A-1** | The 2FA disable modal now has a password field (`AppModal` already supported `children`). Before, `handleDisable2FA` always bailed on its own empty-password guard, so 2FA could never be switched off once enabled. |
| **N-2** | Added pushes for the whole social/team layer: connection request/accepted, business connection request/accepted, company invite sent/accepted, join request created, and join request approved/rejected. All go through a fire-and-forget `pushToUsers()` helper that never throws — a push failure must not roll back the action that triggered it. Categories reuse existing `NotificationPreference` columns (`team`/`system`), so no schema change. |
| **N-3** | New `src/shared/services/pushRouting.ts` maps every `data` payload to a screen; `App.tsx` registers the response listener. Handles the two hard cases: a **cold start** (via `getLastNotificationResponseAsync`) and a tap that arrives **while logged out** — the auth screens are a separate `NavigationContainer`, so the target is parked and replayed after sign-in. Navigation uses a container ref because the tap can fire before the tree mounts. |
| **N-5** | `NotificationContext` now fetches the real unread count on sign-in and on foreground pushes, and sets/clears the iOS app-icon badge. Previously the count was only computed when the Notifications screen mounted — a lazy tab — so the badge was always 0 at launch regardless of pending invites. |
| **N-9** | Tapping a row updates the list locally and refreshes the count. The `markAllAsRead()` on focus is gone: it zeroed the badge client-side while every row stayed unread on the server, and because the effect only refired on *change*, the badge then stuck at 0 permanently. |
| **C-3** | `ConnectionsScreen` gains **Requests** (incoming, with inline Accept/Decline) and **Blocked** (with Unblock) tabs. `UserProfileScreen`'s dead-end alerts now offer **Disconnect** and **Cancel request**. Four endpoints that had zero callers are now wired: `GET /connections/pending`, `DELETE /connections/:id`, `DELETE /users/:id/block`, `GET /blocks`. Until now, blocking someone was permanent by accident. |

**Verified:** `node --check` OK · backend tests **58/58** · ESLint **0 errors** · `tsc` **133 = unchanged baseline**, none in changed files.

### Smoke-test checklist for Batch 3

1. Enable 2FA, then disable it — the dialog now has a password box and actually turns it off.
2. From a second account, send a connection request → **the first account gets a push**; tap it → lands on the sender's profile.
3. Kill the app, send another → tapping the push **cold-starts into the right screen**.
4. Log out, trigger a push, tap it, then log in → it should route **after** sign-in rather than being lost.
5. Launch the app with pending invites → the **badge is right at launch** (not 0), and the iOS app-icon badge matches.
6. Tap a notification → the row stops being highlighted immediately and the count drops.
7. Connections → **Requests** tab: Accept/Decline work. **Blocked** tab: Unblock works.
8. On a connected profile, tap "Connected" → Disconnect. On a pending one, tap "Pending" → Cancel request.
9. Invite someone to a company / approve a join request → **they get a push**.

---

## Fix log — Batch 4 (2026-08-06/07)

**Phase A — a regression + the privacy batch**

| ID | What changed |
|---|---|
| *(regression)* | The Requests tab shipped in Batch 3 could never work: `/connections/pending` returns `{ connectionId, sender, requestedAt }` but the TS type declared `{ id, … }`, so Accept/Decline passed `undefined`. Fixed the type and all three consumers. |
| **C-4** | Added `stripSensitiveUserFields()` beside `stripSensitiveBusinessFields` as the single funnel for serializing *another* user. Drops `passwordHash`, 2FA secrets, `tokenVersion`, `lastLoginAt`, `twoFactorEnabled`; converts `deletedAt` → `isDeleted`; and gates email/phone/address on `show_*_publicly` unless you are the owner or an accepted connection. Applied to `/users/:userId`, `/connections`, `/connections/pending`, `/blocks` and `/profile/:slug`. Self-serving routes are untouched. **`/profile/:slug` was the worst case and wasn't in the audit** — it's `optionalAuth`, so it was shipping contact details and `tokenVersion` to anonymous callers. |
| **S-4** | `/users/search` no longer returns `email` **or matches on it** — querying an exact address used to confirm whether it had an account here. |
| **P-12** | Blocks are now enforced on profiles and search (they were only enforced on connections and chat). A blocked profile 404s, and `/users/:userId` returns `isBlockedByMe` so the ⋯ menu offers **Unblock**. |
| **C-8** | A deleted account returns a tombstone rather than a live-looking profile with a synthetic `deleted-*@deleted.nou.pro` email. |

**Phase B — ownership (M-4, and M-3 resolved by design)**

No transfer endpoint. Per Arnaud's design, **co-owners are allowed**: an owner promotes someone else to owner, then leaves.

The leave route counted plain admins as "remaining admins", so an owner could leave with only admins behind — and since only a super_admin can grant super_admin, the company could then never have an owner again (no subscription changes, no archive, no staff management). Leaving as the sole owner now 409s `LAST_OWNER` with the admins you could hand it to; both leave screens offer *"make someone an owner first"* or *"leave and archive"*, and archiving runs with the membership removal in one transaction. Also fixed: granting super_admin wrote that role into `LocationMember` rows, which the location routes refuse to touch — making them permanently unmanageable. Role changes now send a push.

**Phase C — invites (M-5)**

Invites for people without an account went into a new `CompanyInvite` table instead of creating a passwordless `User` row that made register 409 on that address **forever**. `POST /auth/register` consumes pending invites, so signing up with an invited email just works. Invites expire after 30 days and can be listed/revoked.

**Phase D — verified email/phone change (P-6)**

`PATCH /auth/me` assigned email/phone blind, and the profile form sent `email: value || null` — so clearing the field permanently locked the account out, since login is email-only. Identity changes now go through `/auth/change-email/{request,confirm}` (code to the *new* address, applied only on confirm) via a new **Settings › Security › Change Email/Phone** screen; the profile field is read-only. `PATCH /auth/me` refuses identity changes and maps P2002 to a 409 instead of a 500.

**Verified:** `node --check` OK · `prisma validate` OK · backend tests **58/58** · ESLint **0 errors** · `tsc` **133 = unchanged baseline**.

### Smoke-test checklist for Batch 4

1. Connections → Requests → **Accept actually works** (the Batch-3 regression).
2. Open a stranger's profile: no email/phone unless they made it public. Block them → profile 404s, ⋯ offers **Unblock**.
3. Search a user by their exact email → no longer finds them.
4. Log out and open a public profile link (`/api/profile/:slug`) → no contact details.
5. As owner, promote an admin to owner → they can reach company settings, and their location access still works.
6. Try to leave as the only owner → offered "make X owner" or "leave and archive"; test both.
7. Invite a brand-new email → **no account is created**; that person signs up normally and lands in the company as invited.
8. Settings › Security › Change Email → code goes to the new address; the change only applies after confirming. Clearing the email on the profile form is no longer possible.

---

## Still open (P1/P2 polish)

**Every P0 and every P1 is fixed.** What remains is **22 P2 rows** — the authoritative list is the per-section tables above (rows not marked FIXED), not this paragraph.

**Why this section keeps going stale, and the rule that fixes it.** Phases 1 and 2 of the P1 sweep shipped 12 fixes and no doc commit followed, so 14 rows read as open for a day and I reported P-13 as broken when it had been fixed since `8d66cf5d`. An earlier version of this same paragraph went the other way and claimed the audit was complete when it wasn't. **Mark the rows in the same commit as the code** — every doc-only follow-up commit in the log below is one that nearly got skipped. And when answering "what's left", read the table rows against the code, not the summary.

**Not code, needs Arnaud:** the Supabase Storage bucket/key/Render env (P-8, code ready since `6f1b7fe7`); DNS for `nou.pro`, which nothing currently serves; counsel sign-off on the registered entity name and governing-law jurisdiction; and whether to move the mail sending domain to `nou.pro` (SPF/DKIM).

---

## Fix log — A-9 / A-10 (2026-08-07)

Twilio was the only OTP provider, and email OTP used the *same* Verify service — so an unconfigured Twilio 503'd all eight OTP endpoints at once and signup was impossible in every build profile (the client-side dev bypass is disabled in TestFlight, and `CreateAccountScreen` only navigated on success, so the user was simply stuck).

- **`backend/src/services/otpService.js`** picks a provider: Twilio → SMTP email (the transport that already sends password resets, independent of Twilio) → console in development → typed error → 503 in production.
- **`GET /api/auth/verification-capabilities`** lets the client ask which channels work *before* collecting a code, and route to phone or email accordingly. This is what removes the dead end.
- **Codes live in a new `OtpCode` table, not in a token.** A JWT carrying the code hash would be readable by its holder, and 6 digits brute-force offline in milliseconds — precisely the attacker verifying a number they don't own. The table also carries the per-destination attempt lockout Twilio used to provide.
- **A-10:** verify-* now return a short-lived signed proof, register validates it against the submitted value, and `User.emailVerified`/`phoneVerified` record the outcome. Enforcement is behind `REQUIRE_VERIFIED_SIGNUP` (default off) because the backend deploys on push while the app ships via EAS — turn it on once the app build is live.
- Removed the hardcoded `'123456'` dev bypass from both OTP screens.

**Verified:** backend tests **70/70** (12 new), ESLint 0 errors, `tsc` 133 = unchanged baseline.

---

## Fix log — A-4 → A-7 (2026-08-07)

Four findings, one root cause: `tokenVersion` was the only revocation mechanism and it is global. Nothing stored a session server-side.

| ID | What changed |
|---|---|
| **A-7** | New `Session` table; refresh tokens carry a `sid`, so logout ends **that device only**. Adds Settings → Security → **Signed-in devices** with per-device and "sign out all others" actions — previously a lost phone could only be handled by changing your password. |
| **A-6** | Change-password now revokes every *other* session, keeps the caller's, and returns a fresh token pair the client re-seeds. It finally does what it's for (locking out whoever has your password) instead of silently signing *you* out 30 minutes later. |
| **A-5** | The refresh result is discriminated: only a 401/403 from `/auth/refresh` counts as revoked. Rate limits, 5xx, cold starts and network failures keep you signed in. A real revocation now shows *"Your session expired. Please sign in again."* — the server has always had that message; nothing displayed it. |
| **A-4** | `/auth/refresh` gets its own limiter keyed **per user** (60/15min) instead of sharing a 15/15min per-IP bucket with 13 other routes. Combined with A-5, this ends the random-logout class of bug. |

**Deliberate non-goals:** no strict rotation / reuse detection (the client persists rotated tokens fire-and-forget and two paths bypass its single-flight lock — invalidate-on-use would turn ordinary races into false "token theft" logouts), and no DB lookup in `requireAuth` (hot path on ~920 routes), so a revoked device keeps its **access** token for up to 30 minutes. Its live socket is dropped immediately.

**Backward compatibility:** refresh tokens already in the wild have no `sid`. Requiring one would have signed out every user on deploy, so they are accepted on the `tokenVersion` check and silently upgraded to a session on their next refresh.

**Verified:** backend tests **81/81** (11 new), ESLint 0 errors, `tsc` 133 = unchanged baseline.

### Smoke tests

1. Sign in on two devices, log out on one → the other stays signed in.
2. Change your password → you stay signed in; the second device drops within ~30 min.
3. Stop the backend and use the app → a retryable error, **not** a logout.
4. Settings → Security → Signed-in devices: both listed, current one marked; sign one out remotely.
5. **Do this first after deploying:** an already-signed-in user must NOT be logged out.

---

## Fix log — A-8 (2026-08-07)

The wizard seeded only the access token, so a 401 mid-onboarding read as "revoked", called `logout()` and wiped the store **after the account already existed on the server**. All three seed sites now set both tokens.

- **Raw `setState`, not `setTokens()`** — `setTokens` persists to SecureStore, and the wizard's use of raw `setState` is an accidental but real safety property: abandoning signup must not leave credentials on disk.
- The business-create failure path now clears **both** tokens.
- **Rehydration drops tokens restored without a `currentUser`.** That orphan state was already reachable: a mid-wizard 401 that refreshes *successfully* persists via the interceptor's `setTokens`, so abandoning signup left credentials on disk with no user record, attached to every request, with `isSignedIn` false so nothing cleaned them up.
- The terminal `login()` calls prefer the store's tokens over the (possibly stale) route params, so onboarding no longer quietly depends on refresh tokens not being invalidated on use.

**Verified:** backend tests 81/81, ESLint 0 errors, `tsc` 133 = unchanged baseline. No backend or schema change.

### Smoke tests

1. Sign up via the **create a business** branch, pausing a few minutes on the Hours screen so the access token ages — creating the business at the end must succeed.
2. Start signup, reach ChoosePath, force-quit, reopen → clean Launch screen, no half-authenticated state.
3. Normal signup and normal login still work end to end.

---

## Fix log — P-13 / P-14 (2026-08-07)

Purely a wiring gap: real legal copy already existed in three synced places (`PrivacyScreen.tsx`, `TermsScreen.tsx`, and the hosted `backend/public/legal/*.html` the store listings link to). Nothing was written.

- The in-app legal screens were registered **only on the AuthStack**, and the two navigators are mutually exclusive — so navigating to them from Settings would have failed at runtime once signed in. Now registered on the RootStack too and typed in `RootStackParamList` (both param lists on purpose: signup reaches them pre-auth, Settings post-auth). The screens only call `navigation.goBack()`, which behaves identically in either stack.
- **Both settings screens converge on in-app.** CompanySettings had been fixed under CO-27 by opening the hosted page in a browser; personal was never done — so the same row behaved differently per mode.
- Added the missing **Terms of Service** row to both screens; neither had one.
- **P-14:** removed the "Send test error to Sentry (temporary)" row that shipped to real users a few lines below Privacy.

**Needs a human, not code:** `TermsScreen`'s own header flags that the governing-law jurisdiction is written generically and the legal entity name in Contact is unconfirmed. Both want counsel review before launch. The domain story is also inconsistent (`nou.pro` in the copy, `noupro.app` for email/invites, `noupro.com` for share links, `nouproapp.onrender.com` actually serving `/legal/*`) — worth settling before the store listing points at one.

**Verified:** ESLint 0 errors, `tsc` 133 = unchanged baseline. Frontend only.

---

## Fix log — A-11 (2026-08-07)

The toggle enabled a feature nothing consumed: the auto-login effect early-returned in every reachable state, and on the one path that could fire it called an API that never sets `currentUser`, so Face ID succeeded and nothing happened. Turning off "Stay signed in" also force-disabled biometrics *and persisted that*, killing them permanently.

Biometric sign-in and App Lock are now one mechanism — a **lock gate** over the signed-in tree — with different triggers.

- **What biometric sign-in honestly is:** Face ID proves possession of the device, so it unlocks a session already on it (persisted user/businesses + tokens in SecureStore). No network, works offline. This is also why it can't weaken 2FA — the stored refresh token was minted *after* 2FA passed, and if it's revoked the fallback is the password screen, which enforces 2FA as before.
- **App Lock** (WhatsApp-style) re-locks after the app has been in the background past a chosen timeout (Immediately / 1 / 5 / 15 min).
- **Three rehydration fixes:** stop force-disabling biometrics when "Stay signed in" is off (that pairing now means "don't stay *unlocked*"); exempt biometrics from the orphan-token sweep added in the A-8 work, which would otherwise delete the state a locked session needs; start locked when either protection is on.
- **The iOS trap:** `AppState` fires `inactive` for transient interruptions *including the Face ID sheet*, so arming the lock on `inactive` would re-lock the instant you unlocked — an infinite loop at "Immediately". Only `background` counts as leaving.
- `isLocked` is deliberately **not** persisted, so a crash can't strand someone behind a lock screen. Cancel/failure offers retry and "Use password instead". The stored biometric user id is finally used — a mismatch forces a password login, so an old key can't unlock a different account.

**Verified:** ESLint 0 errors, `tsc` 133 = unchanged baseline. **Needs a real device** — simulators report no biometric hardware, so the toggle doesn't even render there.

---

## Fix log — P-3 / P-11 / N-1 (2026-08-11)

**P-3 + P-11 were one bug.** Two disjoint notions of "workplace" existed — memberships and typed-in entries — and the writer of one was wired to the reader of the other: Add wrote rows nothing displayed, and the Edit screen (their only reader) was handed a Business id, so it permanently said "Experience not found". `WorkExperience` is now the single source of truth and memberships **project** into it.

Three things the audit missed, all fixed: membership rows had no dates, so every row rendered **"Present - Present"**; the "Show this workplace on profile" switch was local state with no column to write to; and the destructive button said **"Leave Company"** while calling `deleteExperience`, deleting a CV line and leaving the membership and its permissions intact.

The projection lives in `memberRepo`'s add/update/remove, not at the ~5 route call sites, so every path — create company, invite accept, join approval, staff assign, and anything added later — is covered. Leaving a company **closes** the row rather than deleting it. The migration backfills one row per accepted membership; without it every existing profile would empty out on deploy.

**N-1:** Explore's Connect button did nothing for any user without a company, and it's where the empty-feed CTA sends brand-new users. Explore was the one surface ignoring the app's own documented rule (`getRelationshipAction`, `docs/PROFILES.md`): personal mode + a business = **Follow**. Follow needs no company and no approval, and the feed prioritises followed businesses — so it fills the very feed the user came from. Added `GET /users/me/follows` for the bulk state, plus pending/disabled states on a button that was previously always enabled with no feedback.

**Verified:** backend 109/109, ESLint 0 errors, `tsc` 133 = unchanged baseline.

---

## Fix log — P1 sweep phases 1 & 2 (2026-08-11/12)

*Backfilled 2026-08-12. These two commits shipped and the rows were never marked, which
is how the "still open" list came to be mostly wrong — see the note under "Still open".*

### Phase 1 — `6f1b7fe7` (9 items, no schema change)

All ~18 P1s were re-verified against code first. **Two turned out already fixed:** M-6 (the
work-experience merge gave staff a Leave button on a personal-mode surface, so the
business-mode guard no longer traps them) and B-1 (business partner requests were already
in the Requests tab).

- **P-7** A failed avatar upload gave zero feedback: no `else` for `success: false`, and a failed PATCH was only `console.error`'d — the spinner ran, stopped, and nothing changed.
- **P-9** `refreshBusinesses()` fetched `/auth/me` and threw away `response.user`, and `authAPI.getCurrentUser` had zero callers — so `currentUser` was written **only** at login. A profile edited on another device, or a connections count that moved, never appeared until the next sign-in.
- **P-10** `headline`, `bio` and `industry` were editable *and scored by profile completion*, but rendered on no screen — you could be nudged to write a 2000-character bio nobody, including you, could ever read.
- **N-7** Logout cleared the local push token in a `finally` with no `res.ok` check, so an offline logout — the common case — left the row `isActive: true` for the OLD account while the local key vanished. The previous user's notifications kept arriving with no way left to clean up, and it does **not** self-heal: `PushToken` is unique on `(userId, token)`, so the next account just creates a second row.
- **N-4** The onboarding cards returned *before* the API call, so someone who signed up via an invite and opened Notifications inside the 5-second `isNewUser` window saw two tips instead of their actual invite. Now merged rather than substituted, and keyed on "no company" rather than a flag that is unpersisted and expires in 5s.
- **M-8** Invitations addressed to a *person* only rendered in personal mode, so an admin working in business mode never saw them.
- **M-7** `POST /companies/:id/locations/:locationId/staff` defaulted to `status: 'accepted'` — no invite, no consent, no notification — so you could find yourself a member of a company you never agreed to join. Defaults to `'invited'` and notifies.
- **B-2** Deleted the four legacy `/api/companies/:companyId/connections*` routes. No frontend callers, and they skipped the reverse-direction duplicate check (the unique index was directional, so with A→B pending they created B→A), the block check, and the notification — an unguarded second door into the same data.
- **P-8** Uploads silently fall back to local disk, which Render wipes on redeploy: images work right up until the next deploy, then every one 404s with nothing connecting the two events. Production now logs an error and reports to Sentry. **The Supabase bucket, key and Render env are still Arnaud's to set.**

### Phase 2 — `498e8d47` (3 items, one migration)

- **N-6** "Turn off notifications" lived only in client state: `PATCH /auth/me` never persisted it and `normalizeUser` defaulted it back to `true`, so it silently re-enabled itself on the next login and `App.tsx` re-registered the token — with no dialog, because permission was still granted. The master switch now lives in `NotificationPreference` beside the per-category ones; the phantom `notifications_on` is gone.
- **C-7** `@@unique([senderId, receiverId])` is **directional**, so A→B and B→A could both exist. That double-counted connections and made `getStatus()` return whichever row it found first — so accept/reject could act on a row the UI wasn't showing. Added a canonical sorted pair with its own unique index, letting the database refuse the duplicate instead of relying on a check-then-write that was never transactional. The migration de-duplicates existing reciprocal rows **before** adding the constraint: accepted beats pending (dropping an accepted connection would be visible data loss), otherwise oldest wins so the original requester stays the sender.
- **C-5** Connection requests had no rate limit at all, and declining one achieved nothing: the rejected row was **deleted**, so the sender could immediately re-request and the receiver got another push, with no record they'd already said no. Added a per-user limiter and a 7-day cooldown; the rejected row is re-opened rather than deleted.

---

## Fix log — P1 sweep phase 3 (2026-08-12)

Four items that needed something built rather than repaired.

**M-9 — a pending join request was invisible and permanent.** `BusinessProfileScreen` decided the CTA from *memberships*, but a pending request lives in `RoleRequest`, so it kept offering "Request to Join"; a second tap 400'd, and there was no withdraw route at all — only an admin could clear it. Added `DELETE /api/companies/:companyId/role-requests/me`, guarded to your own `PENDING` row, and a **Withdraw join request** action. The repo delete is a hard delete on purpose: an unsent request isn't history, and a `CANCELLED` row would keep tripping the "already pending" check.

**C-6 — `ConnectionsScreen` ignored `route.params` entirely**, so all four entry points showed *your own* connections. New `GET /api/users/:userId/connections`, gated on the existing `areConnected`. **The trap:** the existing `/api/connections` serializes every row with `isConnected: true` — correct there, because every row *is* the viewer's own connection. Reusing that shape would have leaked the email, phone and address of everyone in someone else's network to any single one of their connections. `isConnected` is now computed **per row against the viewer**. Denial is **404, not 403** — a 403 confirms the person has connections you aren't allowed to see. Two of the four callers pass a *business* id through a param named `userId`, so the client takes an explicit `mode`; another company's list is non-tappable for now, since it needs its own business-level gate.

**B-3 — supplier linking had schema, backend and a declared nav param, but no UI.** Ported the picker Customers already had (gated on accepted connections), and seeded it from `route.params.supplierBusinessId` so the declared param is finally live.

**N-10 — the push prompt fired the instant you first signed in**, with no explanation, and iOS only ever shows it once per install, so a reflexive "Don't Allow" was permanent and silent. New explainer screen in the signup wizard, sitting between `UploadProfilePicture` and `ChoosePath` — the earliest point the account exists and a token can be registered. **The trap:** that screen only seeds the store token when the user actually picks an avatar, so the new screen takes the token from `pendingAuth` and `registerTokenWithBackend` gained an explicit-token path. Skipping the explainer leaves the one prompt intact, and it fires at the first moment that earns it: a join request, an order, a first message — hooked in `ChatScreen.handleSend` rather than `inbox.service`, so the offline queue's replay can't raise a prompt in the background. `registerForPushNotifications` now returns `{status, token}` instead of collapsing "denied", "no hardware" and "threw" into `null`, which is why Settings used to tell simulator users to enable notifications in device settings, where there is nothing to enable. "Have we asked yet" is read from the **OS**, not a stored flag — a flag would be missing on every install that granted permission before this shipped and would silently stop their token from refreshing.

**Verified:** backend 127/127, ESLint 0 errors, `tsc` 133 = unchanged baseline. No schema change in this phase.

### Smoke tests

1. Request to join a company → the button becomes **Request pending**; withdraw it and the CTA comes back.
2. Add a supplier → you can link it to a real connected company, and it sticks.
3. Open a **connected** person's profile → tapping their connection count shows *their* list, with no Requests/Blocked tabs and no accept/remove actions. A **non-connected** person's doesn't open. Your own still works fully.
4. **The leak check:** in a connection's list, a stranger's row must not expose their email or phone.
5. Sign up → the notifications explainer appears before iOS asks. Tap "Not now", then send a join request → it asks then. Skip that too and place an order → it asks. Never twice.
6. On a simulator, Settings says notifications need a physical device rather than telling you to enable them in settings.

---

## Fix log — N-8 + the domain story (2026-08-12)

**N-8 — the notification preferences lied in both directions.** Order, invoice and
procurement state changes are posted into a chat and pushed through
`sendPushToOfflineParticipants`, which hardcoded `category: 'messages'`. `pushService`
gates on that category, so turning **Messages** off silently killed order updates, and
turning **Orders** off didn't stop them. All three producers funnel through one
`broadcastEventMessage`, so the category is now threaded through from there — defaulting
to `'messages'` keeps the four plain-chat call sites byte-identical.

**P-13 was already fixed** (`8d66cf5d`); this batch closed what its own fix log flagged as
left over.

**Five domains, no single source of truth.** `nou.pro` in the legal copy, `noupro.app`
sending the mail and generating invite links, `noupro.com` on product shares, and
`nouproapp.onrender.com` quietly being the only thing that serves anything — including
the `/legal/*` pages the store listings point at, a URL the legal copy never mentions.
Changing the public domain meant editing nine call sites plus three HTML files, which is
why it had never been changed consistently.

- New `src/shared/config/urls.ts`. **Two constants on purpose:** `BRAND_DOMAIN` is `nou.pro` *now* (Arnaud's call), but `PUBLIC_WEB_URL` points at what actually answers HTTP — a link is only worth sharing if something responds to it. One line converges them once DNS points at the backend.
- **Both shared links were dead ends.** `InviteStaffScreen` handed `https://noupro.app/join/:id` to real people via `Share.share()`: nothing served the domain, it wasn't in `linking.prefixes`, and no `/join` route existed. Repointing it alone would only have made it *differently* dead, so the backend now serves `/join/:companyId` and `/p/:productId` landing pages (same pattern as `reset-password.html`) that hand off via `noupro://`, and the linking config maps `join/:businessId` → the company profile, landing on the Request-to-Join CTA.
- `support@noupro.app` in Team Management **contradicted** `support@nou.pro` in the legal copy. Both now read one constant.
- Only the `EMAIL_FROM` **fallback** moved to `noreply@nou.pro`. **`backend/.env` was deliberately left alone** — if SPF/DKIM is set up for `noupro.app`, changing the live sender domain would send transactional mail to spam. That's a DNS decision, not a code one.

**Legal copy — only what was factually wrong:**

- The privacy copy named the **CNIL (France)** as your supervisory authority while every other signal in the repo says Mauritius. Now jurisdiction-neutral pending counsel.
- Both the app and `delete-account.html` said deletion **"erases"** your data. The backend *anonymises and soft-deletes* (`server.js` rewrites the address to `deleted-<id>@deleted.nou.pro` and sets `deletedAt`). Defensible under GDPR Art. 17(3)(b), but overstated on a page the Play Console links to. Reworded accurately on all three surfaces.
- The policy claimed it was available "on our website". **There is no website.**
- `delete-account.html` had no last-updated date; the other two did.
- The in-app and hosted privacy copies now match word for word again.

**One stray placeholder, the same bug as P-13:** `InvoiceDetailsScreen` made the client
name tappable and answered with *"functionality would be implemented here"*. It now opens
the company or the CRM customer. `clientBusinessId`/`customerId` were on the Prisma model
and in the API response all along — just never declared on the frontend `Invoice` type,
so nothing could link an invoice back to who it was billed to.

**Verified:** backend 127/127, ESLint 0 errors, `tsc` 133 = unchanged baseline. No schema
change.

### Smoke tests

1. Turn **Messages** off and leave **Orders** on, then have a partner advance an order — the push still arrives. Reverse it and it doesn't.
2. Invite a staff member and tap Share — the link opens a real page; with the app installed it opens the company profile with Request to Join.
3. Share a product — the link resolves instead of 404ing.
4. Privacy and Terms open in-app in **both** modes, and match `<backend>/legal/privacy` word for word.
5. Open an invoice and tap the client name — you reach their profile.

---

## Verification notes

Everything above is static analysis; the sandbox has no network egress, so nothing was smoke-tested against the running app. Every P0 was confirmed by reading both sides of the call (frontend call site *and* backend route registration/handler), plus the relevant schema where data shape mattered. The round-1 fixes were spot-checked and all hold.

Highest-confidence claims (both ends read, mechanism unambiguous): S-1, A-1, A-2, A-3, P-1, P-2, P-3, P-4, P-5, C-1, C-2, M-1, M-2, N-1, N-2, N-3.
