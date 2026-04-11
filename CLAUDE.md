# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

NouPro is a B2B professional platform (distributors, wholesalers, retailers) with a React Native/Expo mobile frontend and a Node.js/Express backend. PostgreSQL via Supabase, Prisma ORM, real-time chat via Socket.IO.

## Commands

### Frontend (run from project root)
- `npm start` — Expo dev client
- `npm run ios` / `npm run android` — run on device/simulator
- `npm run lint` — ESLint
- `npm test` — Jest (no test files exist yet)

### Backend (run from `backend/`)
- `npm run dev` — nodemon dev server (port 3000)
- `npm start` — production server
- `npm run prisma:generate` — regenerate Prisma client after schema changes
- `npm run prisma:migrate` — create + apply a new migration
- `npm run prisma:migrate:deploy` — deploy migrations to production
- `npm run prisma:seed` — seed the database
- `npm run prisma:studio` — GUI for inspecting the database
- `npm run db:reset` — full reset + reseed (dev only)

## Architecture

### Dual-Mode System
The app has two modes that determine which tab navigator and screens appear:
- **Personal mode** — social/networking features (`src/modes/personal/`, `PersonalTabNavigator`)
- **Business mode** — operations (orders, invoices, deliveries, procurement) (`src/modes/business/`, `BusinessTabNavigator`)

### Frontend Structure
- **`App.tsx`** — Root component (~700 lines). Contains the entire `RootStack` with ~80 screens, auth flow, launch screen logic, and deep link config. This is the navigation source of truth.
- **`src/features/`** — 23 feature modules (auth, brands, business, cart, company, connections, deliveries, feed, feedback, inbox, invoices, locations, notifications, orders, procurement, products, profile, search, settings, subscription, tasks, team, transports). Each has co-located `screens/`, `components/`, `hooks/`, `services/`.
- **`src/shared/services/api.ts`** — **The single API boundary** (~500 lines). All HTTP requests go through this file. Screens never import axios directly. Handles auth headers, token refresh, response unwrapping.
- **`src/shared/store/`** — Zustand stores with AsyncStorage persistence (`profileStore` for auth/user, `businessStore` for company/location, `orderStore` for orders, `registrationStore` for signup flow).
- **`src/shared/types/`** — Centralized TypeScript types (~18 files, ~4000 lines).
- **`src/shared/components/ui/`** — Reusable UI components (~27 components).
- **`src/shared/components/layout/headers/`** — Shared header components (3 variants).
- **`src/navigation/`** — `PersonalTabNavigator` and `BusinessTabNavigator`.

### Shared Infrastructure (`src/shared/`)
- **`context/`** — React contexts (`NotificationContext` for push notification handling).
- **`hooks/`** — Cross-feature hooks (`useNetworkStatus`, `usePermissions`, `useProfileViewType`, `usePushNotifications`).
- **`theme/`** — `ThemeProvider`, typography system, theme constants.
- **`services/`** — 8 shared services: `api`, `authService`, `chat`, `imageService`, `notifications`, `orders`, `pushNotifications`, `userAvatarService`.
- **`guards/`** — Route/feature guards.
- **`animations/`**, **`motion/`** — Shared animation utilities.
- **`utils/`** — General utility functions.
- **`config/`**, **`constants/`**, **`data/`** — App configuration and static data.

### Backend Structure
- **`backend/server.js`** — Monolithic Express server (~11,600 lines). All API routes and business logic in one file.
- **`backend/src/repositories/`** — Data access layer. Interfaces in `interfaces/` (10 files), Prisma implementations in `prisma/` (19 repositories including procurement).
- **`backend/src/services/`** — Business logic services: `orderAutomation`, `orderStatus`, `purchaseOrderStatus`, `pushService`, `eventMessages`.
- **`backend/src/middleware/auth.js`** — JWT verification middleware.
- **`backend/prisma/schema.prisma`** — 33 models.

### API Contract
Backend responses always follow: `{ success: boolean, data: T, message: string }`. The `api.ts` typed helpers (`get<T>`, `post<T>`, `put<T>`, `patch<T>`, `del<T>`) automatically unwrap `.data.data` so callers receive `T` directly.

### Auth Flow
JWT (HS256, 30min expiry) stored in Zustand/AsyncStorage. Token auto-refresh on 401 via response interceptor. On failed refresh → logout. 2FA support via TOTP (otplib).

## Key Conventions

### Path Aliases
TypeScript and Babel are configured with:
- `@/*` → `src/*`
- `@assets/*` → `assets/*`

### Styling
NativeWind v4 (TailwindCSS for React Native). Dark theme is the default (`userInterfaceStyle: 'dark'`). Inter font family. `ThemeProvider` wraps the app for theme context.

### Environment Configuration
Set via `EXPO_PUBLIC_APP_ENV` (dev/demo/prod). Frontend reads `EXPO_PUBLIC_API_URL` for the backend base URL. Backend requires `.env` with `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, email config, `CORS_ORIGIN`. See `backend/.env.example` for full list.

### EAS Build Profiles (eas.json)
- `development` — dev client, internal distribution
- `preview` — demo builds, channel `preview`, points to Render backend
- `production` — store distribution, channel `production`

### Backend Patterns
- Repository pattern for data access (swap Prisma for memory with `DATA_SOURCE=memory`)
- Rate limiting: auth 15/15min, messages 30/min, chat creation 10/min
- Order & Delivery status state machines with audit trails
- Purchase Order status state machine (procurement module)
- Subscription tiers: FREE, PRO, BUSINESS, ENTERPRISE
- Location modes: DEPENDENT (fulfills parent orders) vs INDEPENDENT (own orders/invoices)

### Adding a New Feature
1. Create `src/features/<name>/` with `screens/`, `components/`, `hooks/`, `services/` as needed
2. Add types to `src/shared/types/`
3. Register screens in `App.tsx` RootStack
4. Add navigation types to `src/shared/types/navigation.ts`
5. Use `api.ts` helpers (`get`, `post`, etc.) for backend calls — never import axios directly
6. Add backend repository in `backend/src/repositories/prisma/` if new data access needed

### Patch-Package
`postinstall` runs `patch-package`. Patches live in `patches/` directory (currently: `expo-modules-core`). Check there when dependency behavior seems unexpected.

## Claude Code Agents

The project has 6 specialized subagents in `.claude/agents/`:
- **`noupro-backend-engineer`** — Backend tasks: API endpoints, Prisma queries, migrations, bugs
- **`noupro-system-architect`** — CTO-level architectural guidance, schema design, API design
- **`noupro-ui-ux-designer`** — UI/UX design guidance, component specs, screen layouts
- **`noupro-perf-optimizer`** — Performance analysis across the full stack
- **`bug-assassin`** — Root-cause diagnosis and minimal fixes for bugs
- **`subscription-expert`** — Subscription plans, feature gating, entitlements, permissions

## Important Notes
- The owner (Arnaud) is not a developer — explain technical decisions clearly
- No test files exist yet (Jest is configured but unused)
- No CI/CD pipeline (no `.github/` directory)
- Backend is a monolith — all routes in `server.js`. Respect this structure unless explicitly asked to refactor
