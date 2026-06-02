# Profiles — Screen & Behavior Spec

> Source-of-truth for how the **4 profile screens** look and behave, and the rule that decides
> whether the **Follow** or **Connect** button appears.
>
> This describes the current, implemented behavior. Keep this file in sync when profile behavior
> changes.

---

## 1. Overview — the dual-mode system

NouPro has two **modes** the user can act in, tracked by `activeMode` in
[`profileStore`](../src/shared/store/profileStore.ts):

- **Personal mode** — you act as yourself (a `User`). `activeMode === 'personal'`.
- **Business mode** — you act as one of your businesses. `activeMode === 'business'`, with
  `activeBusiness` set.

Combined with **whose** profile you open, this yields **4 profile view types**, defined in
[`profile.ts`](../src/shared/types/profile.ts) (`ProfileViewType`):

| View type | Screen file | Who sees it |
|---|---|---|
| `SELF_PROFILE` | [`PersonalProfileScreen.tsx`](../src/modes/personal/screens/PersonalProfileScreen.tsx) | Your own personal profile |
| `SELF_BUSINESS` | [`BusinessProfileOwnScreen.tsx`](../src/modes/business/screens/BusinessProfileOwnScreen.tsx) | Your own business profile |
| `OTHER_USER` | [`UserProfileScreen.tsx`](../src/features/profile/screens/UserProfileScreen.tsx) | Another **person's** profile |
| `OTHER_BUSINESS` | [`BusinessProfileScreen.tsx`](../src/features/profile/screens/BusinessProfileScreen.tsx) | Another **business's** profile |

The view type is computed by [`useProfileViewType`](../src/shared/hooks/useProfileViewType.ts) from
`activeMode` plus whether the viewed id matches the current user / active business. It also returns
`canEdit`, `canOrder`, and `showAdditionalOptions`. Each view type has its own dedicated screen
component — there is **no** mega-conditional component.

---

## 2. The Follow / Connect rule

The relationship button on another account depends on **both** your active mode **and** the type of
profile you are viewing:

| You are acting as… | Viewing a… | Button | Why |
|---|---|---|---|
| **Person** (personal mode) | **person** | **Connect** | people connect with people (mutual) |
| **Person** (personal mode) | **business** | **Follow** | a person follows a business (one-way) |
| **Business** (business mode) | **business** | **Connect** | businesses connect with businesses (mutual) |
| **Business** (business mode) | **person** | **(no button)** | a business does not follow or connect with a person |

This is the single rule implemented by
[`getRelationshipAction(activeMode, targetType)`](../src/shared/types/profile.ts) →
`'connect' | 'follow' | 'none'`. It applies only to the two "other" screens. Your own profiles
(`SELF_PROFILE`, `SELF_BUSINESS`) show **Edit** / **Share** instead.

### Button states

**Follow** — one-way, instant, no approval:

| State | Label | Meaning |
|---|---|---|
| not following | `Follow` | tap to start following |
| following | `Following` | tap to stop following |

**Connect** — mutual, with a request/accept workflow:

| State | Label | Meaning |
|---|---|---|
| no relationship | `Connect` | tap to send a request |
| request sent | `Pending` | awaiting their response |
| request received | `Accept` | they asked you; tap to accept |
| connected | `Connected` | mutually connected |

---

## 3. Data & endpoints

Every combination maps to a model that already exists — no new models are required.

| You are… | Viewing | Button | Backend model | Endpoint(s) |
|---|---|---|---|---|
| person | other **person** | Connect | `UserConnection` | `POST /connections/request`, `PATCH /connections/:id/accept` |
| person | other **business** | Follow | `BusinessFollow` | `POST` / `DELETE /businesses/:id/follow`, `GET /businesses/:id/follow-status` |
| business | other **business** | Connect | `BusinessConnection` | `POST /business-connections/request`, `PATCH /business-connections/:id/accept` |
| business | other **person** | — | — | — |

How each status reaches the frontend:
- **Person↔person:** `GET /users/:id` returns `connectionStatus` (`{ id, status, direction }`)
  relative to the logged-in user — already consumed by `UserProfileScreen`.
- **Person→business follow:** `GET /companies/:id` returns `followersCount` + `isFollowedByViewer`;
  the toggle uses [`useFollowStatus`](../src/features/follow/hooks/useFollowStatus.ts).
- **Business↔business:** `GET /companies/:id?viewerBusinessId=<id>` returns
  `businessConnectionStatus` (`{ id, status, direction }` or `null`). The request/accept calls live
  in [`connections.service.ts`](../src/features/connections/connections.service.ts).

Prisma models: [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma) —
`UserConnection`, `BusinessConnection` (share the `ConnectionStatus` enum:
`pending | accepted | rejected`), and `BusinessFollow`.

---

## 4. Own profiles (`SELF_PROFILE`, `SELF_BUSINESS`)

### `SELF_PROFILE` — your personal profile
Screen: [`PersonalProfileScreen.tsx`](../src/modes/personal/screens/PersonalProfileScreen.tsx)

- **Identity block:** avatar (80), name (24 bold), job title, expandable description, connections
  count.
- **Actions:** **Edit Profile** + **Share Profile**; profile switcher; settings.
- **Sections:** Experience, About (contact info), professional sections (skills, education,
  certifications).
- No Follow/Connect button (it's you).

### `SELF_BUSINESS` — your business profile
Screen: [`BusinessProfileOwnScreen.tsx`](../src/modes/business/screens/BusinessProfileOwnScreen.tsx)

- **Cover** (3:4), logo (80), name (+ verified badge), industry.
- **Stats:** Connections + Followers.
- **Actions:** **Edit** + **Share Profile**; staff management; subscription warnings.
- **Tabs:** Products (by brand), People, About Us.
- No Follow/Connect button (it's your business).

---

## 5. `OTHER_USER` — another person's profile
Screen: [`UserProfileScreen.tsx`](../src/features/profile/screens/UserProfileScreen.tsx)

- **Header:** back button + "⋯" menu (Report / Share / Block).
- **Identity block:** avatar (80), name, job title, expandable description, connections count.
- **Action row:**
  - **Message** (primary) → opens chat with the user.
  - **Connect** (secondary) — shown **only in personal mode** (`Connect` / `Pending` / `Accept` /
    `Connected`). In **business mode** there is **no** relationship button (Message is shown
    alone), because a business does not connect with a person.
- **Sections:** Experience, About (email / phone / address), Other Details (joined date).

---

## 6. `OTHER_BUSINESS` — another business's profile
Screen: [`BusinessProfileScreen.tsx`](../src/features/profile/screens/BusinessProfileScreen.tsx)

- **Cover** (3:4) with floating back button.
- **Identity block:** logo (80), name (+ verified badge), industry, description.
- **Stats:** Connections + Followers.
- **Action row** (via [`ProfileActionButtons`](../src/features/profile/components/ProfileActionButtons.tsx)):
  - **Message** (primary) → opens chat with the business.
  - **Secondary button** is mode-driven:
    - **Personal mode → Follow** (`Follow` / `Following`).
    - **Business mode → Connect** (`Connect` / `Pending` / `Accept` / `Connected`).
  - **"⋯" menu:** Report, Share, Block, and **Request to Join** (personal mode, when not already a
    member).
- **Tabs:** Products (by brand), People, About Us. In **business mode** a **Cart** tab is added and
  ordering is enabled (`canOrder`), so you can place B2B orders here.

---

## 7. Implementation notes

- The rule lives in one place:
  [`getRelationshipAction(activeMode, targetType)`](../src/shared/types/profile.ts).
- [`ProfileActionButtons`](../src/features/profile/components/ProfileActionButtons.tsx) accepts
  `secondaryLabel` / `secondaryVariant` / `secondaryLoading` so the secondary button can render the
  live Follow/Connect state. `PROFILE_ACTION_CONFIGS` still provides default labels but the
  business screen overrides them.
- `UserProfileScreen` hides the Connect button when `getRelationshipAction(...) === 'none'`
  (business mode), leaving Message full-width.
- `BusinessProfileScreen` fetches `/companies/:id?viewerBusinessId=<active>` to obtain
  `businessConnectionStatus`, and the Follow/Connect action moved out of the "⋯" menu into the
  secondary button.
- Backend: `GET /api/companies/:companyId` returns `businessConnectionStatus` when a valid
  `viewerBusinessId` is supplied (additive only — no schema change/migration).

---

## 8. Quick reference

```
Your own profile          → Edit / Share        (no Follow/Connect)

On someone else:
  person  → person        → Connect
  person  → business      → Follow
  business → business     → Connect
  business → person       → (no button, Message only)

Follow  = one-way, instant            (Follow ↔ Following)
Connect = mutual, request/accept      (Connect → Pending / Accept → Connected)
```
