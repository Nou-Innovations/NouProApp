# NouPro — World-Class Roadmap

**Date:** 2026-07-02
**Companion doc:** [AUDIT_2026-07-02.md](AUDIT_2026-07-02.md) holds the detailed evidence (file:line) for every bug/security item referenced here (SEC-1, REV-1, REL-1…). This document is the *strategy* layer on top of it: everything that separates NouPro today from a world-class app, in priority order.

> **How to read this (for Arnaud):** Read the Scorecard, then the 90-Day Plan at the end. The 9 pillars in between explain each gap in plain language: *where you stand → what world-class looks like → exact moves*. Effort tags: **S** = hours, **M** = days, **L** = week(s).

---

## The honest framing

You have already built the hard part: **breadth**. 132 screens, 23 feature modules, dual personal/business modes, real-time chat, orders, invoicing with a real payment ledger, deliveries with proof-of-delivery, procurement, price lists, subscriptions with server-side gating, 2FA. Most solo founders never get here.

What separates NouPro from a world-class app is not more features. It's four things users *feel* but can't name:

1. **Trust** — money and data must be bulletproof (2 payment holes remain, and your bug fixes aren't reaching users).
2. **Speed** — the app must feel instant, every time (cold starts, no caching layer).
3. **Polish** — every screen consistent, every state (empty/loading/error) designed, accessible, in the user's language.
4. **Operations** — you must *know* when something breaks before a user tells you (no analytics, minimal tests).

Everything below serves one of those four.

---

## Scorecard — today vs. world-class

| Pillar | Today | World-class bar | Grade |
|---|---|---|---|
| 1. Trust & Money | Webhook forgeable, renewals never charge, fixes not shipped | Verified payments, automatic renewals, dunning | 🔴 4/10 |
| 2. Store & Legal readiness | 2 hard Apple blockers, placeholder legal copy | Approved, GDPR-clean, real policies | 🔴 3/10 |
| 3. Reliability engineering | 4 test suites, CI = lint+smoke, 156 ts errors | Money/auth/tenancy tested, CI blocks bad code | 🟠 4/10 |
| 4. Speed | 30–60s cold starts, no client cache, retry band-aids | <1s warm API, instant-feeling navigation | 🟠 5/10 |
| 5. Polish & consistency | Strong design system *started*; ~42 raw modals, 126 files with hardcoded colors, font scaling off | One design language everywhere, accessible | 🟠 6/10 |
| 6. Reach (language & resilience) | English-only hardcoded, online-only | FR + EN, graceful offline | 🔴 2/10 |
| 7. Insight (analytics & feedback) | Sentry only. Zero product analytics | Funnels, retention, in-app feedback loop | 🔴 1/10 |
| 8. Architecture & scale | 11.6k-line server.js, in-process cron, single instance | Modular, job queue, scales horizontally | 🟡 5/10 |
| 9. B2B differentiators | Solid foundation (price lists, procurement) | The 3–4 features competitors can't match | 🟡 in your hands |

**The good news:** pillars 1–3 are almost entirely *finite, known work* — the audit already lists the exact fixes. Trust and store-readiness are weeks away, not months.

---

## Pillar 1 — Trust & Money 🔴 *(do first, before anything else)*

**Where you stand:** The core is genuinely solid (auth, 2FA, tenant scoping, state machines, invoice ledger — audit confirmed, don't rewrite). But three things break trust today:

1. **Your fixes never reach users** — 3 of 4 live Sentry crashes are already fixed in the code but the production JS bundle was never republished ("the shipping gap").
2. **SEC-1:** anyone can forge the Peach payment webhook and give themselves a paid plan free.
3. **REV-1:** recurring billing **never charges anyone** — you collect the first payment and then silently never bill again. Revenue = first month only.

**What world-class looks like:** Payments verified cryptographically; renewals charge automatically with retry + "card failed" emails (dunning); every release reaches users within minutes; a customer can't tell you a bug you didn't already know about.

**Moves:**
| # | Move | Effort | Why |
|---|---|---|---|
| 1.1 | Run `eas update --branch production` on your Mac (sandbox can't reach Expo) | **S** (5 min) | Kills 3 live crashes instantly. Highest ROI action in this doc. |
| 1.2 | Fix SEC-1: verify Peach webhook signature + re-fetch authoritative result via the existing `getCheckoutResult()` | **M** | Closes the free-plan exploit |
| 1.3 | Fix REV-1: renewal job calling the existing (never-called) `chargeStoredCard`, behind `AUTOMATION_API_KEY`, triggered by external cron | **M** | Turns on recurring revenue |
| 1.4 | Add **dunning**: on failed renewal, retry 3× over 7 days + push/email "update your card", then downgrade gracefully (don't lock data) | **M** | World-class apps never surprise-cancel |
| 1.5 | Broaden `validateBody` (zod) from 5 routes to the top ~15 write routes (auth, orders, invoices, products, payments, profile) | **M** | Stops junk data at the door (SEC-3) |
| 1.6 | Make releasing a *ritual*: after every meaningful merge → `eas update`; keep a 5-line RELEASING.md checklist | **S** | Prevents the shipping gap from ever recurring |

---

## Pillar 2 — Store & Legal readiness 🔴

> **Update 2026-07-03:** 2.1 (permission strings), 2.2 (account deletion), 2.3 (real legal copy, in-app + hosted at `/legal/*`), and 2.4 (data export) are **built** — plus the Google-Play deletion page. Remaining: the owner steps in [STORE_SUBMISSION.md](STORE_SUBMISSION.md) (deploy, native build, screenshots, questionnaires, 2 legal decisions).

**Where you stand:** Two hard Apple blockers (missing iOS permission usage strings REL-1; no account-deletion flow REL-2), Privacy/Terms screens contain placeholder text (REL-6), and there is no hosted privacy-policy URL. As an EU-market app, GDPR applies to you fully.

**What world-class looks like:** One-pass App Store approval; a user can export or delete their data themselves; policies a French business customer's lawyer could actually read.

**Moves:**
| # | Move | Effort |
|---|---|---|
| 2.1 | Add `ios.infoPlist` usage strings (camera, photo library, photo-add, location, contacts, microphone — you use all of these per package.json) with *specific* wording ("NouPro uses the camera to photograph products for your catalog") — generic strings get rejected | **S** |
| 2.2 | Build account deletion: `DELETE /api/users/me` (anonymize + cascade within tenancy rules) + "Delete account" in Settings with confirmation + grace period | **M** |
| 2.3 | Write real Privacy Policy + Terms (French + English), host them on nou.pro, link from the app and App Store Connect | **M** |
| 2.4 | Add **data export** ("Send me my data" → JSON/CSV email) — GDPR right of access, and B2B customers genuinely ask for this | **M** |
| 2.5 | Prepare store assets: screenshots per device size, app preview text, keywords, App Privacy questionnaire answers | **M** |
| 2.6 | Bump build numbers per submission; keep `production` channel discipline (already configured in eas.json) | **S** |

---

## Pillar 3 — Reliability engineering 🟠

> **Update 2026-07-03:** the quick half of 3.2 is live — `no-undef` is now an **error-level lint rule** (verified by canary that it catches the exact `alignItems: center` pattern behind the June crashes; CI's lint job now blocks that class). The sweep found 8 hits: 1 fixed properly (React UMD type ref), 7 were missing runtime-global declarations, now declared. tsc backlog dropped 156 → **138** via the ChatScreen field fix.

**Where you stand (measured today):** 4 unit test suites (state machines, pricing — good ones!), CI runs lint + backend smoke only, **156 TypeScript errors** not gating anything, 728 lint warnings. No staging environment — the app points at prod even in dev (per project notes). No tested backup restore.

**What world-class looks like:** The rule is simple — **code that touches money, auth, or tenant isolation does not merge untested.** CI blocks anything that would crash. You can restore yesterday's database in 15 minutes because you've done it once.

**Moves:**
| # | Move | Effort |
|---|---|---|
| 3.1 | Tests in this exact order: ① webhook forgery rejected (after 1.2), ② tenancy ("user A cannot read company B's order") across the ~10 hottest routes, ③ invoice ledger money-math, ④ auth/refresh flow | **L** |
| 3.2 | Burn down 156 `tsc` errors (they hide real bugs — the audit found one in ChatScreen this way), then add `tsc --noEmit` as a CI gate; enable eslint `no-undef` as error **now** (it would have caught all 3 shipped crashes) | **L** (burndown) + **S** (gates) |
| 3.3 | Create a **staging environment**: free Supabase project + second Render service + `.env.staging`; dev work stops touching production data | **M** |
| 3.4 | Verify Supabase automated backups are on; do **one restore drill** into a throwaway project; write down the 5 steps | **S** |
| 3.5 | Add an uptime monitor (UptimeRobot/BetterStack free tier) on `/api/health` → doubles as the keep-warm ping (see 4.1) | **S** |
| 3.6 | Archive the ~20 stale root docs into `docs/archive/` so the repo's "truth" docs (CLAUDE.md, the two audits, this file) are findable | **S** |

---

## Pillar 4 — Speed 🟠

**Where you stand:** Render free tier sleeps after 15 min → 30–60s cold starts (you already ship a retry band-aid in api.ts). No client-side cache layer — every screen refetches on every visit (Zustand stores auth/business state, but server data is fetched ad hoc). Images load from origin with no CDN transforms.

**What world-class looks like:** The app *feels* instant: previously-seen data appears immediately (stale-while-revalidate), updates happen optimistically, the server never cold-starts, images arrive sized-for-purpose.

**Moves:**
| # | Move | Effort |
|---|---|---|
| 4.1 | Kill cold starts: keep-warm ping every 10–14 min (see 3.5) **and** budget ~$7–25/mo for Render Starter — a paying B2B product cannot run on a sleeping free tier | **S** |
| 4.2 | Adopt **TanStack Query** (React Query) for server data, screen by screen (start: product lists, order lists, inbox). Gives caching, stale-while-revalidate, retries, and pull-to-refresh for free; keep Zustand for auth/UI state only | **L** (incremental) |
| 4.3 | Use Supabase Storage **image transformations** (or add `expo-image` with its disk cache) so a 96px avatar isn't a 4MB download; `expo-image` alone is a big win | **M** |
| 4.4 | Optimistic UI on the top 3 interactions: send message (you may have this), add to cart, mark order status — action feels done *before* the network answers | **M** |
| 4.5 | Skeleton loaders (not spinners) on the 10 most-visited screens; standardize one `Skeleton` component in the design system | **M** |
| 4.6 | Once real users exist: run the perf agent on the 5 heaviest screens (list virtualization, re-render hunting) — don't optimize blind before that | **M** |

---

## Pillar 5 — Polish & consistency 🟠

**Where you stand:** A real design system exists and is winning (SectionTitle, AppAlert everywhere, canonical headers, bottom-sheet gallery, warm re-theme) — but migration is half-done: **~42 raw `Modal`s** vs 2 canonical sheet components (BOTTOM_SHEET_AUDIT.md), **126 files still hardcode hex colors** (measured today) instead of using the theme, empty/error states vary by screen, and font scaling was globally disabled (users who enlarge text on their phone get your fixed sizes).

**What world-class looks like:** Every surface is recognizably "NouPro". A color change takes one file. A visually-impaired user can enlarge text without breaking layouts. Every list has a designed empty state that tells you what to do next.

**Moves:**
| # | Move | Effort |
|---|---|---|
| 5.1 | Finish the **bottom-sheet migration** (the P0 list in BOTTOM_SHEET_AUDIT.md): all modals → AppModal/AppBottomSheet | **L** (mechanical, batchable) |
| 5.2 | Finish the **palette migration**: 126 files' hex values → theme tokens; then add an eslint rule banning raw hex in `src/` so it never regresses | **L** + **S** guard |
| 5.3 | Standardize `EmptyState` / `ErrorState` / `LoadingState` components (icon + message + action) and sweep the top 20 screens | **M** |
| 5.4 | Re-enable font scaling *safely*: instead of `allowFontScaling=false` everywhere, set `maxFontSizeMultiplier={1.3}` globally — respects user accessibility settings without breaking layouts. Also grow the 138 `accessibilityLabel`s: rule of thumb, every icon-only button gets one | **M** |
| 5.5 | Micro-feel pass: haptics on key confirmations (`expo-haptics`), consistent press feedback, screen-transition consistency | **M** |
| 5.6 | ~~Finish the audit's known UI stubs~~ ✅ 2026-07-03: chat "Unknown user"/blank-avatar fixed (16 sites, `name`/`avatar_url`), fake Mauritius map pin removed (real coords or no map), fake `shop.com`/`412 3456` placeholders removed (rows hide when unset) | done |
| 5.7 | Design-system rule going forward: **no new screen ships with a raw Modal, raw hex, or hand-rolled section title** (you already enforce the last one) | policy |

---

## Pillar 6 — Reach: language & resilience 🔴 *(biggest strategic blind spot)*

**Where you stand:** **Zero i18n** — every string is hardcoded English, in an app named "nou.pro" presumably serving French-speaking businesses. No offline behavior beyond a network-status hook: a warehouse user with bad Wi-Fi gets failures, not grace.

**What world-class looks like:** The app speaks the customer's language on day one. Losing signal mid-order is a non-event: you can browse what you've seen, compose actions, and they sync when back online.

**Moves:**
| # | Move | Effort |
|---|---|---|
| 6.1 | Adopt `i18next` + `expo-localization` now, **before** the string count grows further. Extract screen-by-screen (the top 30 screens cover most sessions). Ship **French + English**. This is weeks of mechanical work — the longer you wait, the worse it gets | **L** |
| 6.2 | Localize the *data* layer too: dates (date-fns/locale), currency formatting (`Intl.NumberFormat` — critical for a B2B app full of prices), number separators | **M** |
| 6.3 | Offline graceful-degradation, staged: ① cached data visible offline (free with 4.2 TanStack Query + persistence), ② global "you're offline" banner + disabled-not-broken actions, ③ *later*: outbox queue for chat messages and order submissions | **M** → **L** |
| 6.4 | Public web presence: shareable web pages for public storefronts/products (a small separate site). Right now a storefront link is worthless to anyone without the app — this is your only viral loop | **L**, later |

---

## Pillar 7 — Insight: analytics & feedback 🔴 *(cheapest pillar to fix)*

**Where you stand:** Sentry catches crashes (good). Beyond that you are **flying blind**: no analytics library exists — you cannot answer "how many users signed up this week?", "where do they drop off?", "does anyone use procurement?".

**What world-class looks like:** Every product decision is backed by a funnel. You know your activation rate (signup → first order), your retention curve, and your top 5 dead features. Users can tell you things in-app.

**Moves:**
| # | Move | Effort |
|---|---|---|
| 7.1 | Add **PostHog** (EU cloud, free tier, RN SDK): autocapture screens + ~15 explicit events — signup steps, first product created, first order placed, first invoice sent, subscription started/renewed/failed, chat message sent | **M** |
| 7.2 | Define the **activation funnel** (signup → company created → first product → first order) and check it weekly; this one number tells you what to build next | **S** after 7.1 |
| 7.3 | You already built the community feedback board — add an entry point ("Give feedback") in Settings/sidebar so it actually collects signal | **S** |
| 7.4 | Sentry hygiene: enable release tracking on OTA updates (so you can see "crash fixed in update X"), set up alert emails for new crash types | **S** |
| 7.5 | Backend request logging → simple dashboard: p95 latency per route, error rate (Render metrics + Sentry performance is enough to start) | **M** |

---

## Pillar 8 — Architecture & scale 🟡 *(important, not urgent)*

**Where you stand:** `server.js` is ~11.6k lines (modularization Phase 0+1 shipped; Phase 2+ paused on a branch). Cron work runs via `setInterval` inside the web process — it silently stops when Render sleeps or restarts (this is *why* REV-1's design must use an external cron). Socket.IO is single-instance. Order-status logic is duplicated frontend/backend (found via the code graph). No API versioning or consistent pagination.

**What world-class looks like:** A codebase a second engineer could join in a week. Background work that survives restarts. A server you can run two copies of.

**Moves (sequence *after* pillars 1–3):**
| # | Move | Effort |
|---|---|---|
| 8.1 | Resume `server.js` modularization per the existing plan — but **only route-extraction, no behavior changes**, and only once tenancy tests (3.1) exist to catch regressions | **L** |
| 8.2 | Move all scheduled work to external cron → authenticated automation endpoints (pattern already exists with `AUTOMATION_API_KEY`); delete the in-process `setInterval`s | **M** |
| 8.3 | Single source of truth for status machines: backend exposes allowed transitions; frontend consumes them instead of duplicating the rules | **M** |
| 8.4 | Pagination audit: every list endpoint takes `limit`/`cursor` with a server-side max — unbounded lists are a time bomb as data grows | **M** |
| 8.5 | When (not before) you outgrow one instance: Socket.IO Redis adapter + sticky sessions; Postgres connection pooling is already handled via Supabase pgbouncer | **L**, later |
| 8.6 | Keep the migration discipline you already established (hand-authored incremental migrations on `0_init`, deploy via build command) — it's genuinely good | policy |

---

## Pillar 9 — B2B differentiators 🟡 *(what makes NouPro win, once trust is earned)*

You already have unusual strengths for this market: customer-specific **price lists**, procurement with PO state machines, dual personal/business modes, real-time chat *inside* the trade relationship. World-class means picking 3–4 sharp differentiators and finishing them to depth. Candidates, roughly ordered by effort-to-wow ratio:

1. **CSV/Excel import & export everywhere** (products, price lists, customers). Distributors live in Excel; onboarding a 500-product catalog by hand is a dealbreaker. **(M, massive onboarding win)**
2. **Barcode scanning** (`expo-camera` already installed): scan to find/add products, scan to receive deliveries. **(M)**
3. **Chat-to-order deepening** — you already attach invoices/contacts in chat; make "turn this conversation into an order" one tap. Nobody else has commerce inside chat. **(M)**
4. **Credit terms / net-30** — invoice due dates, aging report ("who owes me what, how late"), payment reminders. The #1 daily pain of wholesalers. Your payment ledger is the perfect base. **(L)**
5. **Standing/recurring orders** — "every Tuesday, 20 crates" (recurring deliveries exist; extend to orders). **(M)**
6. **AI layer** (later, once analytics exist): reorder suggestions from history, invoice-photo → draft invoice (OCR), weekly digest "your week in 5 numbers". **(L, high wow)**
7. **VAT/tax handling** on invoices if not complete — table stakes for FR B2B invoicing; verify against real French invoice requirements (mentions légales, SIRET, TVA lines). **(M, verify first)**

---

## The 90-Day Plan

### 🔴 Weeks 1–2 — "Stop the bleeding" (all from Pillars 1–2)
1. **OTA update to production** (1.1) — *today, 5 minutes*
2. Peach webhook signature verification (1.2)
3. Recurring billing job + external cron (1.3), then dunning (1.4)
4. Supabase Storage env vars on Render (audit REL-3) + keep-warm ping (4.1)
5. Finish & commit working-tree WIP; eslint `no-undef` as error (3.2 quick part)
6. iOS permission strings (2.1) + start account deletion (2.2)

### 🟠 Weeks 3–6 — "Launchable"
7. Account deletion done; real Privacy/Terms hosted (2.3); data export (2.4)
8. Webhook + tenancy + money tests in CI (3.1); staging environment (3.3); backup drill (3.4)
9. PostHog + activation funnel (7.1–7.2); Sentry release tracking (7.4)
10. `validateBody` on top 15 routes (1.5)
11. Store assets + submission (2.5) → **ship to TestFlight/App Store**
12. Render paid tier when first paying customer signs (4.1)

### 🟡 Weeks 7–13 — "Feels world-class"
13. i18n French+English, top 30 screens + currency/date locales (6.1–6.2)
14. TanStack Query on the hot screens + expo-image caching (4.2–4.3) + skeletons (4.5)
15. tsc burndown → CI gate (3.2); bottom-sheet + palette migrations finished (5.1–5.2)
16. Empty/error states + font-scaling fix + a11y labels (5.3–5.4)
17. First differentiator shipped end-to-end — recommended: **CSV import** (9.1) or **credit terms** (9.4)
18. Resume server.js modularization behind the new test net (8.1)

### What **not** to do in these 90 days
- ❌ Don't rewrite auth, state machines, tenancy, or the invoice ledger — the audit verified they're solid.
- ❌ Don't start new feature *surfaces* before Weeks 1–6 are done — every new screen built now inherits the missing i18n/theme/test foundations and adds to the migration debt.
- ❌ Don't optimize performance beyond 4.1–4.5 before analytics exist — you'd be guessing.
- ❌ Don't self-host or change infrastructure — Render paid tier + Supabase is the right size for the next year.

---

## One-line summary

**Ship the fixes you already made, make the money path bulletproof, get legally store-ready, add eyes (tests + analytics) — then make it French, fast, and polished. The breadth is built; world-class is depth.**
