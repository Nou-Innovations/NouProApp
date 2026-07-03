# Releasing NouPro

A short, repeatable procedure so your **committed code actually reaches the running app**.
This exists to prevent "the shipping gap" — fixing a bug in the repo while users keep
crashing on an old bundle (it happened: 3 crashes stayed live for days after they were
fixed, because the running build was never refreshed).

---

## The golden rule

**Always publish from clean, committed code.** Never publish with half-finished work in your tree.

```bash
git status                 # should be clean
# If you have work-in-progress you're not ready to ship:
git stash -u               # park it (including new/untracked files)
#   ... publish (see below) ...
git stash pop              # bring your WIP back
```

## Always run preflight first

```bash
npm run preflight
```

This catches "used but never imported" typos — the Hermes crash class that has bitten us
before (bare `ScrollView`, `center`, `useNotifications`). It only fails on that specific class,
so it's fast and green. CI now runs it on every push too, but run it locally before any publish.
If it fails, **fix the missing import before shipping** — that error *will* crash the built app.

---

## Which command? Match it to who needs the update

### 1. Just you — your development build
Your dev build loads JavaScript from Metro.
```bash
npm start
# then on your iPhone: shake → Reload  (or press "r" in the Metro terminal)
```
- **JS / style change** → a reload is all you need.
- **Native change** (new package, a permission, or `ios`/`android`/`plugins` keys in `app.config.ts`)
  → rebuild the dev client: `eas build --profile development --platform ios`

### 2. Testers — preview build (internal distribution)
The `preview` channel is already wired (`eas.json`).
- **JS-only change** → over-the-air, no rebuild, no store review:
  ```bash
  eas update --branch preview --message "what changed"
  ```
- **Native change** → a fresh build to hand testers:
  ```bash
  eas build --profile preview
  ```

### 3. The store — production
```bash
eas build --profile production
eas submit --profile production
```
Your App Store Connect record already exists (`ascAppId 6744329387` in `eas.json`).
For a **JS-only hotfix** to users who already downloaded the store app:
```bash
eas update --branch production --message "hotfix: what changed"
```

---

## OTA vs. rebuild — the one rule to remember

- **OTA** (`eas update`) ships **JavaScript and asset** changes only. Fast, no review.
- **Rebuild** (`eas build`) is required for **native** changes: a new native dependency, an
  iOS/Android permission, icon/splash, anything under the `ios` / `android` / `plugins` keys of
  `app.config.ts`, or any bump to `runtimeVersion`.
- An OTA only reaches installed builds whose **`runtimeVersion` matches** the update
  (currently `1.0.0`, in `app.config.ts`). If you change `runtimeVersion`, you **must** rebuild —
  existing installs will not receive the OTA.

## After you publish

- Watch **Sentry** (org `nou-innovations`, project `noupro`) for new or regressed issues.
- If a previously-**resolved** crash reappears, Sentry flags it as a **regression** — that's your
  early warning that a stale build shipped or a bug was reintroduced.

---

**In one line:** commit → `npm run preflight` → publish to the right channel → watch Sentry.
