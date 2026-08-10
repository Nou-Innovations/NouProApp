# NouPro — Deep Security Audit

**Date:** 2026-08-10
**Scope:** Full stack — backend (Node/Express monolith, 352 routes), database layer (Prisma/Supabase), payments (Peach), real-time (Socket.IO), mobile client (React Native/Expo), native build config (iOS + Android), CI, seed data, supply chain.
**Method:** Three parallel recon passes followed by **direct code re-verification of every 🔴 and 🟠 finding**. Nothing in the P0/P1 sections was inferred, pattern-matched, or carried forward from an older document — each was opened and read at the cited line. The 🟡 section is a mix of read-verified and pattern-verified items; see §5.
**Supersedes:** the security sections of `AUDIT_2026-07-02.md` and `COMPANY_AUDIT.md`. Those remain the reference for their non-security content.

**Severity legend:** 🔴 **P0** — exploitable now, real damage · 🟠 **P1** — exploitable with a precondition, or serious hardening gap · 🟡 **P2** — hardening, hygiene, defence-in-depth.

---

## 1. How to read this (for Arnaud)

You do not need to read the tables.

**Read §2. Do §3. Then hand §12 to a coding agent, one batch at a time.**

That is the whole document as far as your time is concerned. Everything else is evidence — written for whoever (or whatever) does the fixing, so they don't have to rediscover any of it.

Two things worth saying plainly before you read on:

**This codebase is in better security shape than most.** There is no SQL injection anywhere, no hardcoded secrets, no analytics or ad SDKs harvesting your users, payment amounts that can't be tampered with, and an account-deletion flow that is genuinely exemplary. Someone has clearly been doing this properly. §10 lists 30+ things that are *right*, and that section matters as much as the findings.

**But three things are seriously wrong**, and two of them mean the security features you think you have aren't actually protecting anyone. That's the reason for this document.

---

## 2. What could actually happen today

Six things, in plain language. No file paths.

1. **Two-factor authentication currently protects nothing.** If someone learns a user's password — reused from another site, phished, guessed — they get into the account *even with 2FA switched on*. The app asks for the 6-digit code, but the token it hands out before checking that code already works as a full login. → `AUTH-1`

2. **Any employee can read every colleague's password and copy their 2FA.** Not the password itself, but the scrambled version (crackable offline) and — worse — the 2FA secret, which lets them generate valid codes for that colleague forever. Any staff account can do this. It is one ordinary API call. → `EXP-1`

3. **Every account created by the demo/seed script shares the password `password`.** If that script was ever run against the real database, those accounts are open to anyone who guesses. A previous audit (2026-08-04) found your own `admin@nou.pro` had already been rotated and is safe — but ~29 demo accounts were still on the default. This needs a re-check, and it's a five-minute job. → `OPS-1`

4. **"Log out" doesn't fully log out.** If someone copies the long-lived token off a device, signing that device out — or changing the password — does not stop them. They keep access for up to 30 days. Same root cause as #1. → `AUTH-1`

5. **A password-reset email link is a skeleton key for 15 minutes.** Anyone who sees that link — an email provider, a mail scanner, anyone with brief access to the inbox — doesn't just get to reset the password. They get full access to the account without resetting anything, so the victim never notices. → `AUTH-1`, `AUTH-3`

6. **Someone can pay-page-phish your users on your own domain.** An unauthenticated page in the payment flow will run whatever code an attacker puts in a link, on your real API domain. → `INJ-1`

Plus a set of tenant-isolation gaps where one company can read another's data (cost prices, invoices, staff directories) — `TEN-1` … `TEN-3` — and a batch of mobile hardening gaps, of which the most consequential is that **over-the-air updates are unsigned**: whoever controls the Expo account can push arbitrary code to every installed app. → `MOB-3`

---

## 3. 🔴 Do this today — owner actions

These need you, not a coding agent. None of them are blocked on any code change.

**1. Check whether the seed password reached production.** The repo ships a tool for exactly this:

```bash
cd backend && node scripts/rotate-password.js --audit
```

It lists every account still on the seed default without changing anything. If it returns rows, rotate them. (Use `DIRECT_URL` / port 5432 — your ISP blocks 6543.)

**2. Verify whether your Render backend is reachable without going through Cloudflare.** Every rate limit — login brute-force, 2FA, OTP — trusts a header that only Cloudflare is supposed to set. If the origin answers directly, all of those limits can be bypassed by anyone setting that header themselves. This single fact decides whether `ABUSE-1` is critical or theoretical.

**3. Make the Supabase storage bucket private.** Every file any user uploads — invoice PDFs, product photos, anything — is currently at a public URL that needs no login. → `EXP-2`

**4. Turn on 2FA for the Expo account**, and generate OTA code-signing keys. Until then that account is a direct path to code execution on every installed app. → `MOB-3`

**5. Before you ever add the Google Play publishing key**, add it to `.gitignore` first — `eas.json` already points at a filename that nothing currently ignores. → `OPS-4`

---

## 4. Findings index

Single source of truth for status. Update a row in the same commit as its fix.

| ID | Sev | Finding | Primary evidence | Batch | Status |
|---|---|---|---|---|---|
| `AUTH-1` | 🔴 | JWT token-type confusion → 2FA bypass, revocation bypass, reset-link = access token | `src/middleware/auth.js:82` | A/B | **FIXED phase 1** (2026-08-10) · phase 2 scheduled |
| `EXP-1` | 🔴 | bcrypt hashes + TOTP secrets returned over the API | `src/repositories/prisma/memberRepo.prisma.js:13` | A | **FIXED** (2026-08-10) |
| `OPS-1` | 🔴 | Seed sets every user's password to `password`; Prisma seed hook bypasses the prod guard | `prisma/seed.js:80`, `package.json:18` | A-ops | **Code FIXED** (2026-08-10) · data rotation still OWNER |
| `TEN-1` | 🟠 | IDOR: checkout created against any tenant's invoice | `server.js:17152` | A | OPEN |
| `TEN-2` | 🟠 | Collections read routes have no membership check (leaks cost prices) | `server.js:5488`, `:5499` | A | OPEN |
| `TEN-3` | 🟠 | `/users/:userId/contacts`: no self-check + email-based user enumeration | `server.js:12914` | A | OPEN |
| `INJ-1` | 🟠 | Reflected XSS, unauthenticated, on the payment checkout page | `server.js:16953` | A | OPEN |
| `AUTH-2` | 🟠 | Email/phone change requires no re-auth and revokes no sessions | `server.js:2210`, `:2261` | B | OPEN |
| `AUTH-3` | 🟠 | Password-reset token is replayable and survives the `tokenVersion` bump | `server.js:1585`, `:1607` | B | OPEN |
| `AUTH-4` | 🟠 | Login lockout is a user-enumeration oracle + targeted lockout DoS | `server.js:1374`-`1417` | B | OPEN |
| `AUTH-5` | 🟠 | 2FA: setup needs no password, verify keyed only by IP, 32-bit backup codes | `server.js:2338`, `:2400`, `:2456` | B | OPEN |
| `ABUSE-1` | 🟠 | Blanket `trust proxy` + unconditional `CF-Connecting-IP` → IP rate limits bypassable | `server.js:256`, `:350` | B | VERIFY |
| `EXP-2` | 🟠 | Uploads: unauthenticated static `/uploads`, public bucket, weak-RNG paths | `server.js:314`, `services/storageService.js:67` | A-ops/E | OPEN |
| `MOB-1` | 🟠 | SecureStore silently degrades to plaintext AsyncStorage | `src/shared/store/profileStore.ts:30` | C | OPEN |
| `MOB-2` | 🟠 | Biometric login never fires — token is restored before the gate | `App.tsx:742`, `:888` | C | OPEN |
| `MOB-3` | 🟠 | OTA updates ship unsigned | `app.config.ts:153` | D | OPEN |
| `MOB-4` | 🟠 | `allowBackup="true"` + all user PII persisted in plaintext; referenced rule files absent | `AndroidManifest.xml:23` | D | OPEN |
| `MOB-5` | 🟠 | `SYSTEM_ALERT_WINDOW` in the release manifest | `AndroidManifest.xml:10` | D | OPEN |
| `MOB-6` | 🟠 | Payment WebView: no navigation allowlist, permits cleartext scheme | `PeachCheckoutWebView.tsx:64` | C | OPEN |

🟡 P2 findings are tabulated in §9. Confirmed-safe results are in §10.

---

## 5. Coverage & confidence

**Be honest about this section, always.** Both P0s were found in routes that looked completely fine from a distance. Absence of a finding in an unread handler means nothing.

**Backend routes — mechanically enumerated, all 352 accounted for:**

| | Count |
|---|---|
| Total routes | 352 |
| With `requireAuth` / `optionalAuth` / automation auth | 330 |
| Unauthenticated | 22 |
| Calling a tenant-scoping helper | 217 |
| Carrying a tenant path param | 222 |

**Axis 1 — authentication: CLOSED.** All 27 route definitions lacking auth middleware on their definition line were listed and individually reviewed. Every one is *intentionally* public: the auth endpoints themselves, `/legal/*`, `/reset-password`, `/api/health`, `/api/order-status-meta`, `/api/subscription-pricing`, the public storefront (`/api/public/locations/*`), `/api/products`, the API-key-guarded `/api/automation/*`, the Peach webhook, and `/api/payments/checkout-page` (which is `INJ-1`). **No route is missing authentication.**

**Axis 2 — tenant scoping: swept, 3 real findings.** All 352 handlers were mechanically scored for a tenant-scoping helper, an inline membership check, or a manual owner comparison. This produced 42 candidates, **every one of which was then read by hand**. Most were false positives (inline `isBusinessMember` / `findBusinessMember` calls the classifier's regex didn't recognise). Confirmed real: `TEN-1`, `TEN-2`, `TEN-3`, plus three P2-grade cases in §9.

**Axis 3 — response leakage: swept, root cause found.** Seeded from the 12 unrestricted `include: { user: true }` sites in `memberRepo`, traced through all 32 reachable handlers, each read by hand. Result is `EXP-1`, and critically the diagnosis that it is a **repository-layer** bug with at least three leaking routes — not one bad handler.

**Axis 4 — input handling: sampled, not exhaustive.** The zod adoption (8 of 352 routes) and the numeric-validation gaps in §9 were identified by pattern-matching plus targeted reads. **This axis is the least complete.** Treat §9's input-validation rows as a starting point, not a full inventory.

**Non-route surfaces read this session:** `src/middleware/{auth,automationAuth}.js`, `src/services/{sessionService,otpService,peachPayments,paymentService,storageService,subscriptionRenewal}.js`, `memberRepo`, `userRepo`, `collectionRepo`, `prisma/schema.prisma` (User/Session/OtpCode), `prisma/seed.js`, `package.json` (both), `.gitignore` (both), `.github/workflows/ci.yml`, `backend/public/reset-password.html`, `patches/`, all tracked loose `.sql`/`.bak` files, `profileStore.ts`, `api.ts`, `App.tsx`, `app.config.ts`, `eas.json`, `AndroidManifest.xml`, `Info.plist`, `babel.config.js`.

**Known remaining gaps — not claimed clean:**
- `prisma/seed-data-part{1..4}.js` and `seed-data-products.js` — scanned for credentials and emails (56 addresses, all fixture-shaped: `@example.com` plus a few `.mu` business addresses). **Not read line by line** for other embedded data.
- `prisma/migrations/` and `_archive_migrations_pre-rebaseline/` — not reviewed for destructive or credential-bearing statements.
- `backend/uploads/` — directory contents not enumerated.
- The ~300 handlers not read in full were *classified* on four axes, not *read*. Axis 4 in particular could hide more.

---

## 6. 🔴 P0 findings

### `AUTH-1` — JWT token-type confusion

**What it is.** The app mints five different kinds of token, all signed with the same secret, all carrying the real user id. The authentication middleware never checks *which kind* it was handed. So every one of them works as a full login token.

**What an attacker does.** Three separate attacks, one root cause:

*2FA bypass* — needs only the password:
1. `POST /api/auth/login` with the victim's email and password.
2. 2FA is on, so the response contains `tempToken` (`server.js:1423`) — intended only as a 5-minute ticket to submit a TOTP code.
3. Send it as `Authorization: Bearer <tempToken>` to any of the ~330 authenticated routes. It is accepted.
4. The TOTP code is never requested. If it expires, log in again and get a fresh one. **2FA provides zero protection against anyone holding the password.**

*Reset link = skeleton key* — the reset token is delivered inside a URL (`server.js:129`), so it leaks through mail scanners, `Referer` headers and browser history. The holder doesn't reset the password (which would alert the victim); they use it directly as a bearer token for 15 minutes.

*Revocation is fiction* — the refresh token is a 30-day token. Used as a Bearer token it authenticates everything, and it completely bypasses the session and `tokenVersion` revocation logic, which only runs on `/api/auth/refresh` (`server.js:1637`, `:1657`-`1678`). "Sign out this device", and the session-revoke on password change, do not stop it.

**Evidence.**
- `src/middleware/auth.js:82`-`96` — `requireAuth` sets `req.user` straight from `verifyToken` with no claim inspection.
- `src/middleware/auth.js:28`-`70` — `verifyToken` accepts any JWT signed with `JWT_SECRET`.
- `src/middleware/auth.js:105`-`116` — `optionalAuth`, same gap.
- **`server.js:1242`-`1265` — the Socket.IO handshake is a third sink.** It calls `verifyToken` and then only checks `result.user.id === userId`. A `2fa_pending` token opens a fully authenticated real-time socket.
- Mint sites: `server.js:2001` (access, **no `type` claim at all**), `:2007` (`refresh`, 30d), `:1585` (`password_reset`, 15m), `:1423` (`2fa_pending`, 5m), `:2049` (`contact_verified`).

**Fix.** ⚠️ **Do not put the check inside `verifyToken`.** Five flows share that primitive and each already checks `type` itself (`server.js:1248`, `:1595`, `:1637`, `:2056`, `:2471`). Changing the primitive breaks password reset, 2FA, refresh and contact verification simultaneously.

*Phase 1 — deny-list. Ships immediately, signs nobody out.*
1. Add `type: 'access'` to all **three** access-token mint sites: `server.js:2001` (`issueSessionTokens`), `:1680` (refresh), `:1924` (change-password re-issue). Missing the third is the trap — those users would 401 in phase 2.
2. Export a constant of non-access types from `auth.js`: `refresh`, `password_reset`, `2fa_pending`, `contact_verified`.
3. In `requireAuth`, reject with 401 if `claims.type` is in that set. **A missing `type` is still accepted** — that's what keeps existing sessions alive.
4. Same check in `optionalAuth`, but downgrade to anonymous rather than throwing.
5. Same check in the socket handshake at `server.js:1242`.

This is a *complete* fix, not a partial one: every confusable token carries an explicit `type`, so denying the four known types blocks 100% of the attack. The permissive fallback admits only untyped tokens, and the only untyped tokens in existence are legacy access tokens.

*Phase 2 — allow-list. Ships 24h later.* Flip all three sinks to `claims.type === 'access'`.

Why 24 hours and not 30 days: access tokens live 30 minutes (`auth.js:147`), and after phase 1 *every* mint path stamps `type:'access'`. A 30-day refresh token isn't a problem — it mints new access tokens through the already-patched `server.js:1680`. Untyped access tokens are extinct 30 minutes after phase 1 deploys. 24h is pure margin.

**Do not rotate `JWT_SECRET` as the fix.** It would work, but it signs every user out on every device at once, and no secret has leaked. Keep it in reserve for a confirmed compromise.

**Verify.** Mint one token of each of the five types against a test secret; assert only `access` passes `requireAuth`, `optionalAuth` (as authenticated) and the socket handshake. Make this a permanent test — it is the reason this cannot silently regress.

---

### `EXP-1` — password hashes and 2FA secrets served over the API

**What it is.** A repository function pulls *every* column of the user table — including the bcrypt password hash and the TOTP shared secret — and several routes hand that straight to the client.

**What an attacker does.** Sign in as any accepted member of a company, including a plain `staff` account. Call `GET /api/companies/:companyId/users`. The response contains, for every colleague: `passwordHash`, `twoFactorSecret`, `twoFactorBackupCodes`, `tokenVersion`, `email`, `phone`, `address`, `privacySettings`. With the TOTP secret they generate valid 2FA codes for that colleague indefinitely; with the hash they crack offline at leisure.

**Evidence.**
- `src/repositories/prisma/memberRepo.prisma.js:13`, `:22`, `:29`, `:37` (and 8 more) — `include: { user: true }` selects every `User` scalar.
- `prisma/schema.prisma` — `passwordHash`, `twoFactorSecret`, `twoFactorBackupCodes`, `tokenVersion` are all plain scalars on `User`.
- **Three confirmed leaking routes:**
  - `server.js:12997`-`13011` — mass disclosure of every member. Guarded only by `requireBusinessMembership`, so any staff account qualifies.
  - `server.js:13365`-`13367` — returns `businessMember: bm` after an admin adds an **existing** user as staff → the admin receives that user's hash and 2FA secret.
  - `server.js:13913` — returns `{ businessMember: updatedBm }` on self-accept (own data only — lower severity, same bug).
- The correct pattern already exists two routes above, at `server.js:12815`-`12824`, which hand-picks `{id, name, email, avatar}`. And `stripSensitiveUserFields()` at `server.js:882`-`905` is a ready-made funnel that is simply not used here.

**Fix.** Fix at the **repository layer**, not per route — there are 32 reachable call sites and the next new one would reintroduce the bug.
1. In `memberRepo.prisma.js`, replace `include: { user: true }` with an explicit `select` in all four business-member functions (`:10`, `:17`, `:26`, `:33`) and the location-member equivalents. Select only what consumers use: `id, name, email, avatar, phone, jobTitle, createdAt`.
2. Additionally route `server.js:12997` through `stripSensitiveUserFields()` as defence in depth.
3. Grep the rest of the backend for other unrestricted `include` on user-bearing relations before closing this out.

**Rotation question — answer honestly for the owner.** Because these values were reachable by any accepted member, every `twoFactorSecret` should be treated as potentially disclosed. Scope the response to actual exposure: if real staff accounts outside your control exist, force 2FA re-enrolment. If the only members are your own accounts, patch and move on. Password hashes at bcrypt cost 12 are not on their own a forced-reset trigger.

**Verify.** Assert the JSON body of `GET /api/companies/:id/users` contains none of `passwordHash`, `twoFactorSecret`, `twoFactorBackupCodes`, `tokenVersion` at any depth. Generalise later into a response scanner across all routes.

---

### `OPS-1` — seed password, and a guard that can be walked around

**What it is.** The seed script gives every account it creates the password `password`, and the guard meant to stop that script running against production can be bypassed.

**Evidence.**
- `prisma/seed.js:80` — hashes the literal string `password` at bcrypt cost 12, then applies it to every seeded user.
- `prisma/seed.js:423` — prints `Login: admin@nou.pro / password`.
- `package.json:13` — `"prisma:seed": "node scripts/guard-not-prod.js && node prisma/seed.js"` — **guarded**.
- `package.json:18` — `"prisma": { "seed": "node prisma/seed.js" }` — **unguarded**. This is the hook `npx prisma db seed` and `prisma migrate reset` invoke directly, bypassing `guard-not-prod.js` entirely.

**Mitigating context.** The script does warn and points at `scripts/rotate-password.js --audit`, and that tool is well built (hidden input, no logging, bumps `tokenVersion`). The 2026-08-04 audit found `admin@nou.pro` had already been rotated and is **safe**; ~29 `@example.com` demo accounts were still on the default. The existence of a purpose-built `--audit` mode is itself evidence this reached a real database at least once.

**Fix.** Point the Prisma `seed` hook at the guard too: `"seed": "node scripts/guard-not-prod.js && node prisma/seed.js"`. Then re-run the audit (§3, item 1) and rotate anything it finds.

---

## 7. 🟠 P1 — tenant isolation & injection

> **Line numbers below were re-pointed on 2026-08-10** after the P0 fixes shifted `server.js`. Citations inside the §6 P0 write-ups are left at their pre-fix values as a historical record — those findings are closed.

### `TEN-1` — IDOR: create a checkout against any tenant's invoice
`POST /api/payments/invoice-checkout` (`server.js:17152`) loads the invoice by id with `prisma.invoice.findUnique({ where: { id: invoiceId } })` and — verified across the entire handler — **never checks membership**. Any authenticated user who obtains or guesses an `invoiceId` gets a live checkout and creates a `Payment` row under **another tenant's** `businessId`, disclosing the invoice amount and currency. The manual-payment sibling at `server.js:10684`-`10692` does it correctly and is the template.
**Fix:** after the lookup, `requireBusinessMembership(req, res, invoice.businessId)`.

### `TEN-2` — collections readable across tenants, with cost prices
`server.js:5488` and `:5499` carry only `requireAuth`. Every sibling write route on the same resource checks membership (`:5514`, `:5559`, `:5590`, `:5610`, `:5644`) — the two reads were missed. `collectionRepo.getById/getByBusinessId` include full `Product` rows **including `costPrice`**, the exact internal data that `applyPricePrivacy` exists to protect elsewhere. The 404-on-mismatch at `:5487` only checks the collection belongs to the *path* company, not that the caller does.
**Fix:** add `requireBusinessMembership` to both.

### `TEN-3` — contacts route: no self-check, plus email enumeration
`server.js:12914`. The `userId` path param is never compared to `req.user.id` — unlike every other `/api/users/:userId/*` route. Passing a victim's id returns *their* business memberships and each matched user's relationship to *their* companies. Separately, the user search matches on **email**, returning `{id, name, avatar, email}` for up to 100 users — directly contradicting the deliberate anti-enumeration design of `/api/users/search`, which documents at `server.js:2694`-`2699` why it refuses to match on email. It also ignores blocks, which `/api/users/search` honours.
**Fix:** add the self-check, drop the email predicate, apply block filtering.

### `INJ-1` — reflected XSS, unauthenticated, on the API origin
`GET /api/payments/checkout-page/:checkoutId` (`server.js:16953`) — no auth, no rate limit, no validation — passes the raw path param to `generateCheckoutHtml()` (`services/peachPayments.js:160`-`178`), which interpolates it into **both** a `<script src="...">` attribute and a JS string literal, served as `text/html`.
**Fix:** validate against `/^[A-Za-z0-9._-]{1,64}$/` and JSON-encode before interpolation. While there, add a route-specific CSP — see `INJ-4` in §9, which is a live functional bug on the same route.

---

## 8. 🟠 P1 — auth, abuse & mobile

### `AUTH-2` — email/phone change: no re-auth, no session revoke
`server.js:2210`-`2239` and `:2261`-`2288`. Neither requires the current password, neither bumps `tokenVersion`, neither revokes sessions. Since login is email-based, an attacker with a stolen token or a briefly-unlocked device changes the email to one they control (the OTP goes to *their* address), then runs forgot-password → permanent takeover, with the victim's other sessions untouched. `change-email/confirm` also fails to set `emailVerified: true` despite having just verified it.
**Fix:** require the current password or a fresh re-auth, revoke all other sessions, notify the **old** address.

### `AUTH-3` — password-reset token replayable
`server.js:1585` mints a stateless JWT; `:1593`-`1610` consumes it. Nothing is stored, so nothing can be marked consumed — it works repeatedly for its full 15 minutes. `tokenVersion` is bumped at `:1607`, but the reset token carries no `tv` claim, so the bump doesn't invalidate it.
**Fix:** store a SHA-256 digest of the token with a `consumedAt` column, or embed the current `tokenVersion` in the claim and verify it. Needs a migration.

### `AUTH-4` — login lockout leaks account existence
`server.js:1374`-`1417`. Failed attempts are recorded **only when the user exists** (the `if (!dbUser)` early return at `:1392` precedes the counter at `:1409`). So five wrong passwords followed by a `429 Account temporarily locked` proves the account exists, where `401` proves it doesn't. The same mechanism lets an attacker lock any known user out for 15 minutes at will. Timing is a second oracle — bcrypt cost 12 runs only for existing users. The counter is also an unbounded in-process `Map` (`:1358`), so it is per-instance, resets on deploy, and grows with attacker-supplied emails.
**Fix:** count misses too, return an identical response when locked, run a dummy bcrypt compare on the miss path, move to a shared store.

### `AUTH-5` — 2FA hardening
Three issues: `2fa/setup` and `verify-setup` (`server.js:2338`, `:2373`) require only a valid token, no password — so a stolen token lets an attacker enrol *their own* authenticator (`2fa/disable` at `:2428` correctly does require it). `2fa/verify` (`:2456`) is keyed only by IP, giving a distributed attacker unlimited attempts against a 6-digit code with `window: 1`. Backup codes are 4 random bytes = **32 bits** (`:2400`).
**Fix:** require the password to enable 2FA; key the limiter on the tempToken's `sub` as `refreshLimiter` already does; widen backup codes to ≥16 bytes.

### `ABUSE-1` — IP rate limits may be fully bypassable  — status: VERIFY
`server.js:256` sets `app.set('trust proxy', true)` — blanket. Express then takes the leftmost `X-Forwarded-For` entry as `req.ip`, which is attacker-controlled. The mitigation at `:350` prefers `CF-Connecting-IP`, but trusts that header **unconditionally**, without verifying the request came from a Cloudflare IP. Note `:355` explicitly silences express-rate-limit's built-in warning about this exact misconfiguration.

**This is conditional, which is why it's VERIFY not OPEN.** The in-code reasoning ("CF overwrites any client-supplied value") is correct *if and only if* the Render origin cannot be reached directly. If it can, an attacker sets `CF-Connecting-IP` themselves and every IP-keyed limiter — login, register, forgot-password, all OTP, 2FA — is defeated by rotating one header per request. **Resolve §3 item 2 before deciding this one's severity.**
**Fix:** set `trust proxy` to the real hop count, verify `req.socket.remoteAddress` against Cloudflare's published ranges before honouring the header, re-enable the validation.

### `EXP-2` — uploaded files are public
Three compounding issues. `server.js:314` — `app.use('/uploads', express.static('uploads'))` serves the local-disk fallback **with no authentication at all**. `services/storageService.js:67` returns `getPublicUrl()`, and `.env.example:53` states the bucket "must be a PUBLIC bucket" — no signed URLs, no authorization on read. Path entropy comes from a timestamp plus a non-cryptographic RNG (`:55`-`56`), so it is largely predictable. Every file any user uploads — invoice PDFs, ID documents, private product photography — is permanently readable by anyone with or guessing the URL.
**Fix:** private bucket + short-TTL `createSignedUrl` from an authorizing route; `crypto.randomUUID()` for paths; put the `/uploads` static mount behind auth or remove it in production.

### Mobile — `MOB-1` … `MOB-6`

| ID | Finding | Evidence | Fix |
|---|---|---|---|
| `MOB-1` | If `expo-secure-store` is unavailable (Expo Go, a stale dev client, a prebuild regression) both JWTs are written to **unencrypted AsyncStorage** with no warning, no log, no telemetry | `src/shared/store/profileStore.ts:20`-`49` | Fail closed: don't persist tokens at all, force session-only, and report the degradation |
| `MOB-2` | Biometric login **never fires**. Rehydration restores the token before render, so `isSignedIn` is already true when the gate is evaluated. The Face ID toggle is decoration; tokens are also written without `requireAuthentication: true` | `App.tsx:742`-`743`, `:888` | Separate `isUnlocked` state gating render, and/or `requireAuthentication: true` |
| `MOB-3` | OTA updates are **unsigned**. Every launch fetches and executes new JS, authenticated by nothing but TLS and the Expo account | `app.config.ts:153`-`157` | `npx expo-updates codesigning:generate`; 2FA on the Expo account |
| `MOB-4` | `android:allowBackup="true"` while all user PII (email, phone, address, companies, roles) is persisted plaintext in AsyncStorage → it leaves the device in cloud/adb backups. The manifest references `@xml/secure_store_backup_rules`, but **`android/app/src/main/res/xml/` does not exist** | `AndroidManifest.xml:23`, `profileStore.ts:688`-`703` | `allowBackup="false"`, or ship real rules that exclude AsyncStorage; stop persisting `currentUser`/`userBusinesses` |
| `MOB-5` | `SYSTEM_ALERT_WINDOW` (draw over other apps) in the **release** manifest — a dev-client artifact, absent from `app.config.ts` | `AndroidManifest.xml:10` | Remove |
| `MOB-6` | Payment WebView has no `onShouldStartLoadWithRequest` and its origin whitelist permits the cleartext scheme, while a `postMessage` bridge is live — so any origin it redirects through can post into `handleMessage` | `PeachCheckoutWebView.tsx:56`-`65` | Add a navigation allowlist for the Peach host; drop the cleartext entry |

`MOB-6`'s impact is **well contained by good design worth preserving**: `CheckoutScreen.tsx:25`-`33` does not trust the bridge — it re-queries the server for authoritative status. A forged message yields an optimistic dialog, not an entitlement. Add a comment saying so, so nobody "simplifies" it away.

**Structural note underlying `MOB-4` and `MOB-5`:** `ios/` and `android/` are checked in **and out of sync with `app.config.ts`**. `POST_NOTIFICATIONS` from the config is missing from the manifest, five undeclared permissions are present, the referenced `res/xml/` files don't exist, and the declared `noupro://` scheme is not actually registered natively (only the dev-client `exp+noupro` is). Decide which source is authoritative — if the native dirs win, every hardening setting in `app.config.ts` never ships.

---

## 9. 🟡 P2 findings

One row each, deliberately. Prose for 40 P2s is what makes an audit go unread.

| ID | Finding | Evidence | Fix in a sentence |
|---|---|---|---|
| `AUTH-6` | Register leaks account existence with distinct per-identifier messages | `server.js:1737`-`1746` | Uniform 409 |
| `AUTH-7` | Email lookup is case-sensitive while writers lowercase → duplicate accounts, silent login failures | `userRepo.prisma.js:19`-`23` | Normalize on write and lookup; add a functional unique index |
| `AUTH-8` | No rate limit on `change-password` or `DELETE /users/me`, each doing bcrypt cost 12 | `server.js:1865`, `:2832` | Per-user limiter (brute-force + CPU DoS) |
| `AUTH-9` | `2fa/disable` 500s instead of 401 when `passwordHash` is null | `server.js:2435` | Null-guard as the login path does at `:1399` |
| `AUTH-10` | Refresh tokens not hashed at rest, no reuse detection, and `touch` slides expiry forever (no absolute lifetime) | `sessionService.js:59`-`65` | Store a digest, add `absoluteExpiresAt`; deliberate trade-off — see the file's own comment |
| `AUTH-11` | No session-pruning job despite an index built for it | `sessionService.js` | Add to the automation cron |
| `AUTH-12` | `requireAuth` never revalidates the session/`tokenVersion` — up to 30 min revocation lag even after `AUTH-1` | `auth.js:82`-`96` | Cached `sid` liveness check |
| `AUTH-13` | `jwt.verify` doesn't pin `algorithms` | `auth.js:42` | `{ algorithms: ['HS256'] }`, plus `issuer`/`audience` |
| `ABUSE-2` | Automation API key compared with `!==` (not constant-time), accepted via `?key=` query string (lands in logs), and none of its 3 routes are rate-limited | `middleware/automationAuth.js:28`-`32` | `crypto.timingSafeEqual`, header only, add a limiter. **Fails closed correctly otherwise** |
| `ABUSE-3` | OTP resend resets the 5-attempt lockout (new row, `attempts: 0`); no per-destination send throttle → SMS bombing and Twilio cost burn on an unauthenticated route | `otpService.js:75`-`88`, `:162`; `server.js:2123` | Per-destination cooldown + daily cap; count attempts per destination |
| `ABUSE-4` | `authLimiter` is one shared 15/15min IP bucket across 13 routes → self-DoS behind CGNAT, generous for distributed attacks | `server.js:387`-`395` | Split per route, key on identifier + IP |
| `ABUSE-5` | Rate limiters use the default in-memory store → limits multiply per Render instance and reset on deploy | all limiters | Shared Redis/Postgres store before scaling past one instance |
| `ABUSE-6` | No per-socket rate limiting; `join_chat` does 2-3 DB reads per emit, unthrottled | `server.js:1276` | Per-socket token bucket in `io.use` |
| `ABUSE-7` | `/api/products` is unauthenticated, unpaginated, unlimited — loads the entire table then filters in JS | `server.js:16305` | Add `publicReadLimiter`, push filtering + pagination into the query |
| `TEN-4` | Price-list item delete doesn't verify the item belongs to the list → cross-tenant write | `server.js:6446`-`6463` | Scope `removeItem` by both ids |
| `TEN-5` | Location stock write doesn't verify the product belongs to the location's business | `server.js:8353`-`8384` | Assert `product.businessId === locationBusinessId` |
| `TEN-6` | `checkout-result` has no ownership check — any user can poll any `checkoutId` | `server.js:16931` | Verify `payment.businessId` membership |
| `EXP-3` | Profile sub-resources (experiences, education, certifications, skills) bypass the block/privacy gate that `/api/users/:userId` enforces | `server.js:6691`, `:6786`, `:6869`, `:6965` | Apply the same block check |
| `EXP-4` | Company location list and location detail return full rows to any authenticated user; only the tier-hint fields are member-gated | `server.js:4578`, `:4674` | Decide intended visibility; gate address/internal fields |
| `EXP-5` | Discount code validation works cross-tenant and returns the full discount record (incl. `maxUses`, `usedCount`) | `server.js:6150` | Scope to a legitimate customer relationship; throttle; return a boolean |
| `EXP-6` | Opportunity and event detail return any record to any authenticated user with no visibility/status gate | `server.js:3368`, `:3534` | Gate on published/active state |
| `EXP-7` | Upload error details (bucket names, RLS policy text) returned to the client | `server.js:14844`-`14845` | Log detail, return generic + correlation id |
| `INJ-2` | Only 8 of 352 routes use the zod `validateBody` helper added by SEC-3 | `server.js:1110`-`1214` | Extend incrementally; prioritise write routes |
| `INJ-3` | `qtyOnHand`, analytics targets, invoice `taxRate`/`discountAmount` accept NaN and negatives → 500s, negative stock, negative invoice totals, corrupt ledger | `server.js:8360`, `:15684`, `:10870` | `Number.isFinite` + range clamps |
| `INJ-4` | Helmet's **default CSP is active** and will block the Peach WebView's cross-origin + inline scripts — a live functional payment bug, not just hardening | `server.js:286`-`288` | Route-specific CSP allowing the Peach origin + a nonce |
| `INJ-5` | Invoice totals are client-computed and only re-derived **when a price list applies**; otherwise persisted as sent, then charged | `server.js:10855`-`10882`, `:11123`-`11126`; `CreateInvoiceScreen.tsx:536`-`549` | Always recompute server-side; reject mismatches |
| `INJ-6` | Procurement PO/PR totals taken on trust | `server.js:8731`, `:9033` | Recompute server-side |
| `INJ-7` | Dead-but-dangerous type: `CreateOrderPayload` still carries `unitPrice`/`subtotal`/`totalAmount`; `createOrder()` has zero call sites | `src/shared/types/order.ts:232`-`239` | Delete the price fields so nobody re-adopts them |
| `INJ-8` | Upload file type decided solely by the client-supplied `Content-Type`; no magic-byte sniffing. `application/pdf` is allowlisted and renders inline with scripting in many viewers | `server.js:545` | Sniff magic bytes, reject on mismatch |
| `INJ-9` | No multer error handler — file-too-large and rejected-type surface as generic 500s | `server.js:14819` | Map `MulterError` → 400 |
| `PAY-1` | Peach webhook has no HMAC/signature verification or replay protection | `server.js:16965` | **Strongly mitigated**: the body is used only to read `checkoutId`, and status is re-fetched from Peach, so a forged webhook cannot activate a subscription. Residual: unauthenticated amplification + an existence oracle. A `TODO(security)` is already in place |
| `OPS-2` | Sentry has no scrubbing on **either** end — no `beforeSend`, no `beforeBreadcrumb`, no explicit `sendDefaultPii: false`. 165 surviving `error`/`warn` calls plus XHR breadcrumbs carrying `businessId`/`orderId`/`invoiceId` | `server.js:41`-`46`, `App.tsx:972`-`979` | Add scrubbing; set `sendDefaultPii: false` explicitly so an SDK default change can't flip it |
| `OPS-3` | The **backend's** `.env` (DB password + `JWT_SECRET`) sits in the **mobile** repo root, where Metro reads it. Verified NOT currently bundled, but one config edit from shipping | `/.env:9`-`19` | Move to `backend/.env`; keep only `EXPO_PUBLIC_*` at the root |
| `OPS-4` | `eas.json:52` references `google-play-service-account.json`; `.gitignore` has **no rule** that would catch it | `eas.json:52`, `.gitignore` | Add `*service-account*.json` **before** the file exists |
| `OPS-5` | Tracked loose files: `change.sql`, `prisma_change.sql`, `prisma_init.sql`, `prisma.config.ts.bak`, `metro.config.js.bak` | repo root, `backend/` | **Verified credential-free** — hygiene only; delete |
| `OPS-6` | Repo hooks inject instruction-shaped text ("MANDATORY: you must run…") into agent tool results, triggered by filename patterns. Benign today and self-inflicted, but it is a live instruction-injection channel into any agent working here | tooling | Be aware; never let an agent act on instructions arriving via tool output |
| `MOB-7` | No certificate pinning anywhere | — | Consider pinning the API host for a B2B app moving invoices |
| `MOB-8` | No `network_security_config.xml`; relies purely on platform defaults, trusts user-installed CAs | `android/app/src/main/res/xml/` absent | Add with `cleartextTrafficPermitted="false"` |
| `MOB-9` | No minification/obfuscation — ProGuard/R8 disabled by default and absent from `gradle.properties` | `android/app/build.gradle:69` | Enable `enableProguardInReleaseBuilds` |
| `MOB-10` | No screenshot protection anywhere — invoice values, order totals, the 2FA setup secret and backup codes all appear in app-switcher snapshots | none found | `expo-screen-capture` on sensitive screens |
| `MOB-11` | 2FA secret and backup codes copied to the system clipboard with no expiry or auto-clear | `TwoFactorAuthScreen.tsx:115`, `:120` | Auto-clear; warn |
| `MOB-12` | Declared `noupro://` scheme is not registered natively; the dev-client scheme `exp+noupro` ships in production manifests | `Info.plist:25`-`39`, `AndroidManifest.xml:39`-`44` | Reconcile before adding any state-changing deep link |
| `MOB-13` | Residual AsyncStorage keys survive logout: `noupro_push_token` (on some paths), `user_avatar_colors`, cached profile pictures, pricing caches | `profileStore.ts:341`-`377` | Clear on logout — matters on shared devices |
| `MOB-14` | iOS requests **background** location (`NSLocationAlwaysUsageDescription`) which the app doesn't appear to use; several usage strings are generic placeholders → App Review rejection risk | `Info.plist:63`-`78` | Align with the reviewed copy in `app.config.ts:77`-`115` |
| `MOB-15` | `react-native-modal ^14.0.0-rc.1` — a release candidate, caret-pinned, in production | `package.json` | Pin to a stable release |
| `MOB-16` | `expo-dev-client` is a runtime dependency, not a devDependency; dev-client network-inspector flags are baked into both native projects | `package.json:40`, `gradle.properties:53` | Move to devDependencies; strip the flags |

---

## 10. ✅ Confirmed safe

These are recorded so nobody re-audits settled ground — and so that a regression here is recognisable *as* a regression.

**Injection & code execution.** No SQL injection surface: repo-wide, only two raw-query call sites exist, both in offline scripts, one a constant string and one a parameterized tagged template. No eval-style dynamic execution, no runtime function construction from strings, no shell/process spawning. No dynamic-key Prisma injection (`where: { [userInput] }` → zero hits). Exactly one `...req.body` spread, and it is field-allowlisted.

**Secrets.** No hardcoded secrets anywhere in the repo. `.env` and `.env.*` are gitignored in both roots and **verified not tracked** (checked against the git index). The server hard-exits on missing `JWT_SECRET`/`DATABASE_URL`/`DIRECT_URL` and explicitly refuses to boot if `JWT_SECRET` is still the `.env.example` placeholder. **Verified: neither the JWT secret nor any Postgres URL appears in `dist/` or `graphify-out/`.** All tracked loose `.sql`/`.bak` files scanned — credential-free. `.github/workflows/ci.yml` references no secrets at all (only dummy localhost Postgres URLs).

**Payments.** The amount is **server-derived** from a price table, never client-supplied. Subscription tier cannot be self-granted — the self-service route accepts only `'FREE'` and returns `PAYMENT_REQUIRED` for anything else; paid tiers are set exclusively inside `processSuccessfulPayment`. Payment capture is **idempotent** via a conditional `updateMany` that claims the row, so webhook/poll races cannot double-activate. No card or PAN data is ever stored or logged — only a Peach `registrationId` token. Renewals are idempotent with a deterministic per-period `orderId` and a 7-day grace-then-downgrade.

**Real-time.** The Socket.IO handshake is JWT-verified with a `userId` cross-check. Room joining is properly authorized — a client cannot join an arbitrary chat by id; it must be a listed participant or an **accepted** company member, with location-scoped chats requiring accepted location membership. Typing events are room-gated. Socket CORS uses the same fail-closed allowlist. Revocation reaches live sockets via `disconnectUserSockets`. **There are no message-mutation events over the socket at all** — messages are created via authenticated HTTP and only broadcast — which eliminates the usual socket input-validation surface. (The handshake's missing token-type check is `AUTH-1`; everything else here is sound.)

**Passwords & OTP.** bcrypt cost 12 throughout; no password compared by plain equality; none logged (the login path logs only `passwordLength`, and only outside production). OTP codes use a CSPRNG with no modulo bias, are bcrypt-hashed at rest, single-use via `consumedAt`, 10-minute TTL, 5-attempt lockout, superseded on resend, and never returned in a response. Account deletion is exemplary — password + 2FA required, sole-owner guard, single transaction, hash scrambled with random bytes, `tokenVersion` bumped, sessions revoked, sockets dropped.

**Authorization architecture.** Central helpers exist and are broadly applied (217 of 352 routes). Tenant identifiers are **never** trusted from body or query for authorization — every occurrence re-validates against membership. Role escalation is blocked: only a `super_admin` may grant `super_admin`, admins cannot remove the owner, the last admin cannot be removed, and a suspended member cannot self-clear their status. **There is no platform-level admin backdoor** — `User` has no global role column; `super_admin` exists only per-company on `BusinessMember`.

**HTTP.** Helmet enabled. CORS is a strict allowlist that **fails closed** when unset — never `*`, never reflected. 1 MB body limit. The global error handler returns a fixed message and leaks no stack traces. 12 thoughtfully-scoped rate limiters.

**Logging.** Zero `console.log` in `backend/server.js`; leveled logger defaulting to `warn` in production. No tokens, passwords, hashes or full request bodies logged. The one OTP-code log is guarded by a non-production check with a production fall-through that throws.

**Mobile.** iOS ATS enabled — `NSAllowsArbitraryLoads: false` with a single localhost exception. No cleartext on Android release. Console stripped in production builds via babel, verified keyed on `NODE_ENV`. Tokens live in expo-secure-store (when available) and are excluded from the persisted store. Credentials are **never** persisted — the registration store is explicitly non-persisted to keep passwords out of navigation params. Token refresh is single-flight with a transient-vs-revoked distinction, so a 429 no longer signs users out. Auth token rides the Socket.IO `auth` payload, not the query string. Storefront orders send no prices. Deep links map only two read-only detail screens and are attached to the signed-in navigator only; chat link-opening is behind an explicit confirmation dialog. **No analytics, ads, or attribution SDKs at all** — no Firebase Analytics, Facebook SDK, AppsFlyer, Segment, Branch. Hermes on both platforms.

**Supply chain.** `patches/expo-modules-core+2.5.0.patch` reviewed — adds one SwiftUI file containing only colour constants; no JS, no bridge, no network, no build-script change. Backend dependency versions are current: express 4.18, jsonwebtoken 9.0.3, prisma 6.19, socket.io 4.8, multer **2.x** (not the deprecated 1.x), helmet 8.2, zod 4.3.

**`backend/public/reset-password.html`** — reads the token via `URLSearchParams` and sends it in a JSON body. No inner-HTML assignment, no legacy document-write, no dynamic evaluation. Not an XSS vector.

---

## 11. Finishing the sweep

The classification approach used here is reproducible and should become the standing method.

**Step 1 — enumerate.** `grep -nE "^app\.(get|post|put|patch|delete)\(" backend/server.js` → 352, matching the known count.

**Step 2 — classify.** For each route, take the handler body as the span from its definition line to the next route definition, then score four independent signals: auth middleware present; a tenant-scoping helper or inline membership check or manual owner comparison present; a repository call known to carry an unrestricted `include`; raw `prisma.*` used directly rather than via `repos.*`.

**Step 3 — triage.** Rank by (path param present) × (no tenant check) × (raw Prisma). `TEN-1` and `TEN-2` both score on all three. This is what turns 300 unread handlers into a worklist of ~40.

**Step 4 — commit the classification** as an artifact so the next pass diffs against it instead of starting over.

**Four permanent regression tests, in value order.** `.github/workflows/ci.yml:48` already runs `npm test` in `backend/`, so all four land in CI with no workflow change.

1. **Token-type matrix** — mint all five token types; assert only `access` passes `requireAuth`, `optionalAuth`, and the socket handshake. Highest value per line of code in this document. Ship it **with** `AUTH-1`, not later.
2. **Sensitive-field response scanner** — hit representative routes with a member token; fail if the JSON contains `passwordHash`, `twoFactorSecret`, `twoFactorBackupCodes` or `tokenVersion` at any depth. Catches the whole `EXP-1` bug class, not just today's instance.
3. **Cross-tenant probe** — two businesses, two users; for every route with a tenant or resource param, assert user B gets 403/404 on A's resource. Would have caught `TEN-1` and every CO-4/5/6-class finding in `COMPANY_AUDIT.md`.
4. **Route-inventory guard** — assert the set of unauthenticated routes equals a checked-in allowlist, so any new public route fails CI and forces an explicit decision. Converts the coverage problem from recurring to one-time.

---

## 12. Remediation batches

| Batch | Contents | Deploy mechanism | Migration |
|---|---|---|---|
| **A — Account takeover** | `AUTH-1` phase 1 (3 sinks + 3 mint sites), `EXP-1` (repo layer + 3 routes), `INJ-1`, `TEN-1`, `TEN-2`, `TEN-3` + regression tests 1 & 2 | backend-only → `git push origin main` | none |
| **A-ops — Owner, same day** | `OPS-1` seed audit/rotate, `EXP-2` bucket → private, `ABUSE-1` ingress check, `OPS-4` gitignore, Expo 2FA | dashboards + local CLI | none |
| **B — Session & recovery** | `AUTH-1` phase 2, `AUTH-2`, `AUTH-3`, `AUTH-4`, `AUTH-5`, `ABUSE-1`, `ABUSE-2`, `ABUSE-3`, `AUTH-8` | backend-only | **yes** — reset-token table |
| **C — Client, JS only** | `MOB-1`, `MOB-2`, `MOB-6`, `MOB-11`, `MOB-13`, `OPS-2` | **OTA** `eas update --branch production` | none |
| **D — Client, native** | `MOB-3`, `MOB-4`, `MOB-5`, `MOB-8`, `MOB-9`, `MOB-10`, `MOB-12`, `MOB-14`, `MOB-16` | **`eas build`** + store submission | none |
| **E — Integrity & abuse** | `INJ-3` … `INJ-9`, `TEN-4` … `TEN-6`, `EXP-3` … `EXP-7`, `ABUSE-4` … `ABUSE-7`, `AUTH-6`, `AUTH-7`, `AUTH-9` … `AUTH-13`, `PAY-1` | backend-only | possibly (shared limiter store) |
| **F — Systematic closure** | Complete axis-4 sweep; regression tests 3 & 4 | backend-only | none |

**Sequencing.**
- A and A-ops run **in parallel** — A-ops is blocked on no code.
- B's phase 2 must land **at least 24h after** A's phase 1 (reasoning in `AUTH-1`).
- C and D are independent of A/B. **Batch D early** — it is the only batch needing store review, so it should go in with enough runway to absorb a rejection cycle.
- E and F are post-launch hardening.

**Deploy mechanics, stated plainly:** backend changes deploy by pushing to `main` (Render auto-deploys, and any migration runs in the build command). Client **JavaScript** changes ship over the air in minutes with no review. Client **native/config** changes require a full `eas build` and store submission — days. **Batch D cannot ship by OTA, no matter what.**

---

## 13. Path to launch

**Before any real user or real money**
- [ ] `AUTH-1` phase 1 — 2FA actually works, revocation actually revokes
- [ ] `EXP-1` — stop serving password hashes and 2FA secrets
- [ ] `OPS-1` — run the seed-password audit; rotate anything it finds
- [ ] `TEN-1`, `TEN-2`, `TEN-3` — close the cross-tenant reads/writes
- [ ] `INJ-1` — close the XSS
- [ ] `EXP-2` — make the storage bucket private
- [ ] Regression tests 1 & 2 in CI

**Before public launch**
- [ ] `AUTH-1` phase 2, and all of Batch B
- [ ] `ABUSE-1` resolved (verify ingress first — it may be critical or moot)
- [ ] Batch C shipped over the air
- [ ] Batch D built and submitted — especially `MOB-3` OTA code signing
- [ ] `INJ-4` — confirm the checkout WebView actually renders under helmet's CSP
- [ ] `OPS-3` — move the backend `.env` out of the mobile repo root

**After launch**
- [ ] Batch E
- [ ] Batch F — finish axis 4, add regression tests 3 & 4
- [ ] Shared rate-limit store before scaling past one Render instance

---

## 14. Fix log

Append one row per batch as it lands. **Update the §4 index status in the same commit as the fix** — a status table that drifts is worse than none.

| Date | Batch | IDs closed | Commit | Notes |
|---|---|---|---|---|
| 2026-08-10 | A (partial) | `AUTH-1` phase 1, `EXP-1`, `OPS-1` (code) | see `git log` | All three P0s. 14-test token-type matrix added at `src/middleware/auth.test.js`; suite 95/95 green. **The sweep found a 13th leaky `include` the audit's count of 12 missed** (`memberRepo.prisma.js` `getByUserId`) — fixed too. |

### ⏭ Scheduled follow-up — `AUTH-1` phase 2 (do NOT skip)

Phase 1 shipped a **deny-list**: tokens whose `type` is `refresh` / `password_reset` / `2fa_pending` / `contact_verified` are rejected, while a token with **no** `type` claim is still accepted so that already-logged-in users aren't signed out.

Phase 2 flips that to a strict allow-list (`claims.type === 'access'`). Safe to ship **≥24h after** the phase-1 deploy: access tokens live 30 minutes and every mint path now stamps `type: 'access'`, so untyped tokens are extinct ~30 minutes after phase 1 went out.

Three one-line changes, each marked with a `PHASE 2` comment:
1. `requireAuth` — `backend/src/middleware/auth.js`
2. `optionalAuth` — `backend/src/middleware/auth.js`
3. Socket.IO handshake — `backend/server.js`

Then update the last test in `backend/src/middleware/auth.test.js` (`PHASE 1: a legacy untyped access token is still accepted`) to assert the opposite.

Remaining Batch A work, still OPEN: `TEN-1`, `TEN-2`, `TEN-3`, `INJ-1`.
