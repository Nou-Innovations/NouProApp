# NouPro — Store Submission Playbook

**Date:** 2026-07-03 · Companion to [WORLD_CLASS_ROADMAP.md](WORLD_CLASS_ROADMAP.md) Pillar 2.
Everything code-side is done (see status below). This file is the step-by-step for **Arnaud** to get from here to "Waiting for Review".

---

## Status — Pillar 2 items

| Item | Status |
|---|---|
| 2.1 iOS permission strings (specific wording, all 7 permissions + encryption-exemption flag) | ✅ In code (`app.config.ts`) — ships with the **next native build** |
| 2.2 Account deletion (in-app flow + `DELETE /api/users/me` + ownership guard + anonymization + migration) | ✅ In code — backend live on next Render deploy, app flow via OTA |
| 2.4 Data export (in-app "Export My Data" + `GET /api/users/me/export`, rate-limited) | ✅ In code |
| 2.3 Real Privacy Policy + Terms (in-app screens + hosted pages) | ✅ In code — ⚠️ 2 decisions for you below |
| Play account-deletion web page (`/legal/delete-account`) | ✅ In code |
| 2.5 Store assets (screenshots, descriptions, privacy questionnaires) | 🔲 This document, sections 3–5 |
| 2.6 Build/version discipline | 🔲 Section 6 |

**Hosted URLs after the next backend deploy** (auto-deploys when this lands on main):
- Privacy: `https://nouproapp.onrender.com/legal/privacy`
- Terms: `https://nouproapp.onrender.com/legal/terms`
- Delete account: `https://nouproapp.onrender.com/legal/delete-account`

When nou.pro has a website, mirror/redirect these there — the store listings should eventually show a nou.pro URL.

---

## 1. Two legal decisions you must make (with a lawyer, ideally)

1. **Governing law / jurisdiction** — the Terms currently say "the jurisdiction where the NouPro operating entity is established". Replace with the real one (France? Mauritius?) in `TermsScreen.tsx` + `backend/public/legal/terms.html`.
2. **Legal entity name** — Privacy Policy says "Data controller: NouPro". Put the registered company name once you have it.

The rest of the copy reflects your *actual* practices (named processors, in-app export/delete, retention rules) — it's real, not boilerplate. Still have counsel read it before public launch. French translations should land with Pillar 6 (i18n).

## 2. Technical steps, in order

1. **Deploy backend** — push to main (auto-commit handles it). Render runs the migration (`deletedAt`) via the build command.
2. **Verify on your Mac** (sandbox can't reach the network) — quick curls:
   - `curl -s -o /dev/null -w "%{http_code}" https://nouproapp.onrender.com/legal/privacy` → expect `200`
   - Same for `/legal/terms` and `/legal/delete-account`
3. **Test deletion end-to-end on a THROWAWAY account** (never your admin account): wrong password → error; sole-owner-with-team → "transfer ownership" message; fresh solo account → deletes, signs out, can't log back in.
4. **Test export**: Settings → Security → Export My Data → share sheet with a JSON file.
5. **Native build** (permission strings and any new native config do NOT ship via OTA):
   `eas build --profile production --platform ios` (and `--platform android` for Play).
6. OTA is only for later JS-only fixes on the same runtime; the store submission itself always uses the fresh build.

## 3. App Store Connect — App Privacy questionnaire

Answer "**Do you collect data from this app?**" → **Yes**. Then:

| Apple category | Collected? | Linked to identity? | Used for tracking? | Purpose |
|---|---|---|---|---|
| Contact Info → Name, Email, Phone | Yes | Yes | No | App Functionality |
| User Content → Photos/Videos | Yes | Yes | No | App Functionality |
| User Content → Other (chat messages, docs) | Yes | Yes | No | App Functionality |
| Contacts | Yes (only when user shares a contact card in chat) | Yes | No | App Functionality |
| Location → Precise | Yes (business address / delivery features) | Yes | No | App Functionality |
| Identifiers → User ID | Yes | Yes | No | App Functionality |
| Purchases → Purchase History (subscription status) | Yes | Yes | No | App Functionality |
| Financial Info → Payment card details | **No** (Peach Payments processes them; never on NouPro servers) | — | — | — |
| Diagnostics → Crash Data | Yes (Sentry) | See note | No | App Functionality |

- **Crash-data "linked" note:** if `Sentry.setUser` is never called in `App.tsx`, answer "not linked to identity"; if we later attach user IDs to Sentry events, flip it to linked. (Currently: check `App.tsx` — no `setUser` call was added, so **not linked**.)
- **Tracking (ATT):** No data used to track across other companies' apps → **no App Tracking Transparency prompt needed**. Answer "No" to tracking.

## 4. App Store Connect — listing & review

- **Privacy Policy URL:** the `/legal/privacy` URL above.
- **Support URL:** use `https://nouproapp.onrender.com/legal/delete-account` until a proper support page exists (or `mailto:` is not allowed — a simple nou.pro page is better long-term).
- **Screenshots required:** 6.9″ iPhone set (mandatory) + 6.5″ set. ⚠️ **iPad:** `app.config.ts` has `supportsTablet: true`, which makes 13″ iPad screenshots mandatory too. Either produce iPad screenshots or set `supportsTablet: false` before the production build (recommended for v1 — the app is phone-designed).
- Suggested screenshot flow (shoot on simulator with a seeded demo business): Business Home dashboard → Product catalog → Order detail → Chat with invoice card → Invoice screen → Deliveries.
- **App Review notes (copy-paste template):**
  > NouPro is a B2B platform for distributors, wholesalers, and retailers.
  > Demo account: [create a fresh reviewer account — NOT admin@nou.pro — with a seeded demo business and a few products/orders]
  > Email: … / Password: …
  > Account deletion: Settings → Security Settings → Delete Account (confirm with password).
  > Data export: Settings → Security Settings → Export My Data.
  > Payments: subscription checkout is processed by Peach Payments (external payment processor); card data never touches our servers.
- **Age rating:** 4+ works content-wise, but you can set 17+/18 if you prefer to signal business use; the Terms already restrict to 18+.

## 5. Google Play — Data safety & deletion

- **Account deletion URL** (required field): `https://nouproapp.onrender.com/legal/delete-account`
- Data safety form: mirror the Apple table above (collected: personal info, photos, messages, contacts*, location, user ID, purchase history, crash logs; all encrypted in transit; user can request deletion; no data sold/shared for ads).
- Play also wants the privacy-policy URL on the store listing — same `/legal/privacy` URL.

## 6. Version discipline (every submission)

- iOS: bump `ios.buildNumber` in `app.config.ts` (`'1'` → `'2'`, …) for each upload; `version` (1.0.0) only changes for real releases.
- Android: bump `android.versionCode` (integer) every upload.
- `runtimeVersion: '1.0.0'` controls OTA compatibility — leave it unless native modules change; when it changes, old builds stop receiving OTA updates (that's expected).
- Rule of thumb: **JS-only change → `eas update`; anything in app.config.ts/native modules → new `eas build`.**

## 7. What reviewers most often reject B2B apps for (pre-empt checklist)

- [ ] Demo account works on first try (test it yourself the morning of submission — Render cold start!)
- [ ] Account deletion reachable in ≤3 taps from Settings ✅ (built)
- [ ] Permission prompts show specific purpose strings ✅ (built — verify wording appears on device in the new build)
- [ ] Privacy URL loads (no auth wall) ✅ (built — verify after deploy)
- [ ] No placeholder/"coming soon" screens in the reviewer's path (one left per audit — hide it before the build)
- [ ] Subscription screen shows price, term, and cancel terms near the buy button (Apple 3.1 — check `SubscriptionScreen` copy before submitting)
