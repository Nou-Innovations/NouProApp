# Bottom Sheet / Modal UI Audit — NouPro

_Date: 2026-06-19 · Scope: every modal & bottom-sheet surface in `src/`_

## TL;DR

You have **two well-designed canonical components** (`AppBottomSheet`, `AppModal`) wired to
shared `OVERLAY` tokens — and then **44 hand-rolled raw `<Modal>` instances across 33 files**
that ignore them. That is the source of "too many different UI": the same conceptual surface
(an action sheet, a status picker, a confirm dialog) is reimplemented over and over with
**3 different entrance animations, 5+ backdrop opacities, 4 corner radii, and inconsistent
drag-handle / close-button / safe-area handling**.

It is not a missing-component problem. It is an **adoption problem**. The fix is mostly
mechanical migration, not new design.

| Metric | Count |
|---|---|
| Canonical components (good) | 2 — `AppBottomSheet`, `AppModal` |
| Raw `<Modal>` tags in `src/` | 44 across 33 files |
| …that are the canonical wrappers themselves (legit) | 2 |
| …hand-rolled instances that should be migrated/aligned | ~42 |
| Dead dependencies (installed, never imported) | 2 — `@gorhom/bottom-sheet`, `react-native-modal` |
| Duplicate component files | 2 — `LocationDropdown` (dead copy), `AssignStaffModal` (diverged copy) |
| Distinct entrance animations for the same surface | 3 — `slide` (18), `none` (10), `fade` (10) |
| Distinct backdrop opacities | 5+ — 0.5, 0.4, 0.38, 0.3, 0.28… |

---

## 1. The canonical system (what everything *should* route through)

- **`src/shared/components/ui/AppBottomSheet.tsx`** — the slide-up sheet. Drag-to-close handle,
  animated backdrop (`OVERLAY.backdrop` = `rgba(0,0,0,0.5)`), `sheetRadius` 20, safe-area insets,
  X close button, list/buttons/children modes, `fullHeight` mode. Its own docstring says:
  _"This is the ONLY bottom sheet component to use."_
- **`src/shared/components/ui/AppModal.tsx`** — the centered dialog. `default` / `delete` /
  `confirm` / `success` variants, `modalRadius` 16, animated scale-in.
- **`src/shared/ui/tokens/overlays.ts`** — `OVERLAY` (backdrop, sheetRadius, modalRadius) +
  `MODAL_TYPOGRAPHY`. The single source of truth that almost no raw modal references.

These are good. The problem is everything below.

---

## 2. Dead weight — delete first (zero risk)

1. **`@gorhom/bottom-sheet` (`^5.2.8`)** — installed, **never imported anywhere**. Pure bundle bloat.
2. **`react-native-modal` (`^14.0.0-rc.1`)** — installed, **never imported anywhere**. Also an
   unstable RC pin. Remove.
3. **`src/features/company/components/LocationDropdown.tsx`** — **byte-identical** to
   `src/shared/components/ui/LocationDropdown.tsx`, and **no file imports the company copy**.
   Dead duplicate → delete.
4. **`src/features/team/components/AssignStaffModal.tsx` vs `src/shared/components/ui/AssignStaffModal.tsx`**
   — two files, same name, that have **diverged** (they differ). Consolidate to one shared component
   and delete the other. (Both currently delegate to `AppBottomSheet`, so the UI is fine — this is a
   code-duplication / drift hazard, not a visual one.)

---

## 3. The fragmentation, quantified

The same "sheet" surface is built differently every time:

| Dimension | Canonical | What's actually in the wild |
|---|---|---|
| **Entrance animation** | `animationType="none"` + custom `Animated` spring | `slide` ×18, `none` ×10, `fade` ×10 — a sheet may pop (`fade`), slide via OS (`slide`), or animate manually |
| **Backdrop opacity** | `OVERLAY.backdrop` = `0.5` | `0.5`, `0.4`, `0.38`, `0.3`, `0.28`… all hardcoded, ~none reference the token |
| **Corner radius** | sheet 20 / dialog 16 (tokens) | sheets: 20 **and** 16 **and** 24; dialogs: 16 **and** 12 — all hardcoded |
| **Drag handle (grabber)** | yes | almost no raw sheet has one |
| **Close affordance** | X button + drag + tap-backdrop | mix of X-only, tap-backdrop-only, or both |
| **Safe-area insets** | handled (`useSafeAreaInsets`) | mostly unhandled → content under the home indicator |
| **Dismiss gesture** | drag-to-close | raw sheets can't be swiped away |

The net effect: bottom sheets in this app *feel* different screen to screen even when they're doing
the identical job.

---

## 4. Offender inventory (bucketed by fix)

### Bucket A — Bottom-sheet-style raw modals → migrate to `AppBottomSheet`
These slide up from the bottom and already approximate the sheet look (radius ~20). Highest payoff.

| File | Line(s) | Anim | Notes |
|---|---|---|---|
| `features/transfers/components/TransferReceiveModal.tsx` | 75 | slide | radius 20, X, no handle/safe-area |
| `features/transfers/components/TransferCreateModal.tsx` | 121 | slide | same pattern |
| `features/returns/components/ReturnCreateModal.tsx` | 74 | slide | same pattern |
| `features/issues/components/ReportIssueModal.tsx` | 56 | slide | same pattern |
| `features/profile/components/EditBusinessModal.tsx` | 68 | slide | hardcoded backdrop, no tokens |
| `features/team/components/InviteTeamModal.tsx` | 60 | slide | hardcoded backdrop, no tokens |
| `features/company/components/ManageLocationsModal.tsx` | 214 | slide | hardcoded backdrop, no tokens |
| `features/procurement/components/SupplierPickerModal.tsx` | 104 | slide | full-height picker → `fullHeight` mode |
| `features/notifications/screens/NotificationsScreen.tsx` | 642 | slide | role picker, no handle/X |
| `features/profile/screens/BusinessProfileScreen.tsx` | 1136 | slide | radius **16** (off), checkout sheet |
| `modes/personal/screens/PersonalSettingsScreen.tsx` | 401, 608 | none | 2 sheets, manual styling |
| `modes/personal/screens/PersonalProfileScreen.tsx` | 481, 688 | none | 2 sheets, manual styling |
| `modes/business/screens/BusinessProfileOwnScreen.tsx` | 588, 804 | none | 2 sheets, manual styling |
| `shared/components/ui/StaffCard.tsx` | 166 | fade | role picker as fade-in sheet |
| `modes/business/components/LocationSelectorPill.tsx` | 51 | fade | backdrop **0.4**, radius 20 |
| `features/company/components/CompanyDropdown.tsx` | 63 | fade | backdrop **0.4**, radius **12** (dropdown) |
| `features/profile/components/ProfileSwitcher.tsx` | 414 | fade | radius **24** (off), profile list |
| `features/deliveries/screens/detail/DeliveryDetailSelfView.tsx` | 550, 615, 682 | — | transport / order-status / payment-status pickers |
| `features/deliveries/screens/detail/DeliveryDetailStaffView.tsx` | 332 | — | status picker |
| `features/deliveries/screens/detail/DeliveryDetailSupplierView.tsx` | 682, 747, 814, 881 | — | transport / status / payment / scheduling pickers |
| `features/invoices/screens/CreateInvoiceScreen.tsx` | 1234 | slide | preview sheet → `fullHeight` mode |
| `features/invoices/screens/InvoiceDetailsScreen.tsx` | 869 | slide | record-payment sheet |

> The **8 delivery-detail pickers** are pure option lists (status / transport / payment) — exactly
> what `AppBottomSheet` "items" mode exists for. Biggest single cluster of duplication.

### Bucket B — Centered dialogs → migrate to `AppModal`
These are centered cards (radius 12–16), already what `AppModal` does.

| File | Line | Anim | Notes |
|---|---|---|---|
| `features/products/screens/StockScreen.tsx` | 152 | fade | backdrop **0.4**, radius 16, stock-edit dialog |
| `features/invoices/screens/InvoiceDetailsScreen.tsx` | 989 | fade | radius 16, download-PDF dialog |
| `features/invoices/screens/CreateInvoiceScreen.tsx` | 1202 | fade | radius **12**, confirm dialog |
| `features/profile/components/ProfileSwitcher.tsx` | 513 | fade | radius 16, "request access" dialog |
| `shared/components/ui/PaywallModal.tsx` | 136 | fade | radius 16; rich content — may stay custom but should use `OVERLAY` tokens |

### Bucket C — Legitimate special cases → keep, but align to `OVERLAY` tokens
| File | Why it's special |
|---|---|
| `shared/components/ui/ScannerModal.tsx` | Fullscreen camera (barcode). Correct as raw fullscreen. |
| `shared/components/ui/ImageViewerModal.tsx` | Uses `react-native-image-viewing` lightbox lib. Fine. |
| `features/deliveries/components/PodCaptureModal.tsx` | Signature pad (PanResponder/SVG). Keep, but swap hardcoded backdrop/radius → tokens. |
| `features/events/screens/CreateEventScreen.tsx` (118) | Wraps a date picker. Could use a shared picker sheet. |
| `features/company/screens/CompanyEditScreen.tsx` (960) | Wraps iOS time picker. Same. |

### Bucket D — "Modals" that are really full screens → move to navigation
These use `presentationStyle="fullScreen"` and are full pages (maps). They shouldn't be `<Modal>` at
all — they belong in the `RootStack` as screens.

| File | Line | Notes |
|---|---|---|
| `features/auth/screens/BusinessLocationScreen.tsx` | 257 | fullscreen map |
| `features/locations/screens/AddLocationScreen.tsx` | 569 | fullscreen map |
| `features/locations/screens/EditLocationScreen.tsx` | 634 | fullscreen map |

### Already compliant (reference / no change)
`ProductActionsModal`, `ProductCreateModal`, `InvoiceActionsModal`, `DeliveryActionsModal`,
`DeliveryCreateModal`, `NewChatModalList`, `ForwardChatPicker`, `LocationDropdown` (shared),
`PhoneNumberField`, `AssignStaffModal` (shared), `RoleRequestsScreen`, `TeamManagementScreen`,
`SelectCompanyScreen`, `UploadBusinessLogoScreen`, `ChoosePathScreen`, `CreateDeliveryScreen` —
all already route through `AppBottomSheet` / `AppModal`.

---

## 5. Recommended remediation plan

**P0 — Delete dead weight (minutes, zero visual risk)**
- Remove `@gorhom/bottom-sheet` + `react-native-modal` from `package.json`.
- Delete `features/company/components/LocationDropdown.tsx` (dead dup).
- Consolidate the two `AssignStaffModal` files into the shared one.

**P1 — Migrate the high-frequency option-pickers to `AppBottomSheet` (biggest UX win)**
- The 8 delivery-detail status/transport/payment pickers (Bucket A, deliveries).
- The profile/settings sheets (`PersonalSettings`, `PersonalProfile`, `BusinessProfileOwn`,
  `ProfileSwitcher` list).
- `StaffCard`, `NotificationsScreen`, `LocationSelectorPill`, `CompanyDropdown` role/option pickers.

**P2 — Migrate form/confirm surfaces**
- Bucket A form sheets (Transfer/Return/Issue/EditBusiness/InviteTeam/ManageLocations/SupplierPicker).
- Bucket B centered dialogs → `AppModal` (StockScreen, invoice dialogs, ProfileSwitcher access).

**P3 — Cleanup & structure**
- Token-align the keep-as-custom modals (PaywallModal, PodCaptureModal, picker wrappers) to `OVERLAY`.
- Move the 3 fullscreen map "modals" (Bucket D) into the `RootStack` as proper screens.

**Guardrail to prevent regression**
- Add an ESLint rule (e.g. `no-restricted-imports` / a `no-restricted-syntax` on `<Modal`) banning
  raw `react-native` `Modal` outside `shared/components/ui/`, so new sheets must use the canonical
  components.
