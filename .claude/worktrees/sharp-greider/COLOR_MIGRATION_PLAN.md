# NouPro Color System Migration Plan

> **Status**: Theme updated ✅ | Migration in progress 🔄
> **Created**: December 19, 2025

## 📐 New Color System Reference

### Core Colors
| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#000000` | Main buttons, headers, important text |
| `secondary` | `#33363A` | Secondary text, supporting info |
| `background` | `#FFFFFF` | Screen backgrounds |
| `surface` | `#F6F7F9` | Input backgrounds, elevated surfaces |
| `accent` | `#D23030` | Notifications, badges, attention elements |

### Text Colors
| Token | Value | Usage |
|-------|-------|-------|
| `text` | `#000000` | Primary content, headings |
| `textSecondary` | `#575B66` | Descriptions, captions, helper text |
| `textMuted` | `#A4AAB8` | Placeholders, disabled text, muted icons |
| `textInverse` | `#FFFFFF` | Text on dark backgrounds |
| `textLight` ⚠️ | `#575B66` | **DEPRECATED** - Use `textSecondary` |

### Status Colors
| Token | Value | Usage |
|-------|-------|-------|
| `success` | `#2ACF01` | Completed, paid, available, delivered |
| `error` | `#FF2400` | Failed, overdue, out of stock, new order, sent |
| `warning` | `#FFB600` | Pending, attention needed, unpaid |
| `info` | `#0075FF` | In-progress, ongoing, links |
| `neutral` | `#A4AAB8` | Draft, inactive, cancelled |

**Deprecated aliases** (for backward compatibility):
- `errorBright` → use `error`
- `warningBright` → use `warning`
- `warningOrange` → use `warning`
- `infoBright` → use `info`

### UI Colors
| Token | Value | Usage |
|-------|-------|-------|
| `borderColor` | `#E1E4EA` | Borders, dividers |
| `iconColor` | `#393E47` | Primary icons |
| `iconMuted` | `#A4AAB8` | Muted/disabled icons |
| `highlightedRow` | `#F6F7F9` | Unread items, highlights |
| `linkColor` | `#0075FF` | Links |
| `divider` | `#E1E4EA` | List separators |

### Avatar Colors (for random assignment)
```typescript
theme.avatarColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#00CED1', '#FF7F50', '#6B5B95', '#88B04B'
]
```

---

## 🔄 Migration Phases

### Phase 1: Core Components (Priority: HIGH)
These components are used everywhere and will have the biggest impact.

#### 1.1 Typography Component
- [ ] `src/components/Typography.tsx` - Update any hardcoded text colors

#### 1.2 AppButton Component  
- [x] `src/components/AppButton.tsx` - Already uses theme, verify `#FFFFFF` → `appTheme.colors.textInverse`

#### 1.3 Pill Component
- [ ] `src/components/Pill.tsx` - Update `'white'` → `appTheme.colors.textInverse`

#### 1.4 AppTextField Component
- [ ] `src/components/AppTextField.tsx` - Update all hardcoded colors to use theme

#### 1.5 Avatar Component
- [ ] `src/components/Avatar.tsx` - Update placeholder colors, use `avatarColors` array

---

### Phase 2: Card Components (Priority: HIGH)
Cards appear on every list screen.

#### 2.1 DeliveryCard
- [x] `src/components/DeliveryCard.tsx` - Already using theme, update status color mapping

#### 2.2 InvoiceCard
- [x] `src/components/InvoiceCard.tsx` - Already using theme, update status color mapping

#### 2.3 ProductCard
- [ ] `src/components/ProductCard.tsx` - Check for hardcoded colors

#### 2.4 OrderCard
- [ ] `src/components/OrderCard.tsx` - Update avatar colors array → use `theme.avatarColors`
  - Remove hardcoded: `'#FF6B6B', '#4ECDC4', '#45B7D1'...`
  - Replace with: `theme.avatarColors[index % theme.avatarColors.length]`

#### 2.5 MessageCard
- [ ] `src/components/MessageCard.tsx` - Check for hardcoded colors

#### 2.6 BusinessCard / BusinessListCard / BusinessFeedCard
- [ ] `src/components/BusinessCard.tsx`
- [ ] `src/components/BusinessListCard.tsx`
- [ ] `src/components/BusinessFeedCard.tsx`

#### 2.7 CartItemCard
- [ ] `src/components/CartItemCard.tsx`

---

### Phase 3: Modal Components (Priority: MEDIUM)

#### 3.1 ActionBottomSheet
- [ ] `src/components/ActionBottomSheet.tsx`

#### 3.2 Various Action Modals
- [ ] `src/components/DeliveryActionsModal.tsx`
- [ ] `src/components/InvoiceActionsModal.tsx`
- [ ] `src/components/ProductActionsModal.tsx`
- [ ] `src/components/DeliveryCreateModal.tsx`
- [ ] `src/components/ProductCreateModal.tsx`
- [ ] `src/components/AssignStaffModal.tsx`
- [ ] `src/components/EditBusinessModal.tsx`
- [ ] `src/components/InviteTeamModal.tsx`
- [ ] `src/components/NewChatModal.tsx`
- [ ] `src/components/PaywallModal.tsx`
- [ ] `src/components/ImageViewerModal.tsx`
- [ ] `src/components/ManageLocationsModal.tsx`
- [ ] `src/components/DropdownModal.tsx`
- [ ] `src/components/AttachmentMenu.tsx`

---

### Phase 4: Header & Navigation Components (Priority: MEDIUM)

#### 4.1 Headers
- [ ] `src/components/NewHeader.tsx`
- [ ] `src/components/SimpleHeader.tsx`
- [ ] `src/components/headers/*` - All header components

#### 4.2 Filter & Search
- [ ] `src/components/FilterBar.tsx`
- [ ] `src/components/AppSearchBar.tsx`
- [ ] `src/components/SearchResultsList.tsx`
- [ ] `src/components/ProductSearchResultsList.tsx`

#### 4.3 Navigation
- [ ] `src/navigation/BusinessTabNavigator.tsx`
  - Update `backgroundColor: '#D23030'` → `appTheme.colors.accent`
  - Update `borderColor: '#000'` → `appTheme.colors.primary`

---

### Phase 5: Screen Files (Priority: MEDIUM-HIGH)
These have the most hardcoded colors.

#### 5.1 Auth Screens
- [ ] `src/screens/auth/LoginScreen.tsx`
  - Replace `#4B5563` → `appTheme.colors.textSecondary`
  
- [ ] `src/screens/auth/RegisterScreen.tsx`
  - Replace `#4B5563` → `appTheme.colors.textSecondary`

#### 5.2 Main Tab Screens
- [ ] `src/screens/InboxScreen.tsx`
- [ ] `src/screens/DeliveryScreen.tsx`
  - Replace `#AAAAAA` → `appTheme.colors.textMuted`
- [ ] `src/screens/ProductsScreen.tsx`
  - Replace `#AAAAAA` → `appTheme.colors.textMuted`
  - Replace `#6B7280` → `appTheme.colors.textSecondary`
  - Replace `#333` → `appTheme.colors.secondary`
  - Replace status colors: `#EF4444`, `#22C55E`, `#D1D5DB` → theme status colors
- [ ] `src/screens/InvoicesScreen.tsx`
  - Replace `#AAAAAA` → `appTheme.colors.textMuted`
- [ ] `src/screens/ProfileScreen.tsx`
  - Large file with many hardcoded colors (see detailed list below)

#### 5.3 Detail Screens
- [ ] `src/screens/OrderDetailScreen.tsx`
  - Replace action button colors with theme
  - Replace `#F0F0F0` → `appTheme.colors.surface`
  - Replace `#4ECDC4` → Use avatar color from theme
  
- [ ] `src/screens/DeliveryDetailScreen.tsx`
- [ ] `src/screens/InvoiceDetailsScreen.tsx`
- [ ] `src/screens/ProductDetailOwnScreen.tsx`
- [ ] `src/screens/ProductDetailPublicScreen.tsx`

#### 5.4 Create/Edit Screens
- [ ] `src/screens/CreateDeliveryScreen.tsx`
  - Replace `#EAB308`, `#3B82F6` → `appTheme.colors.warning`, `appTheme.colors.info`
  - Replace `#FFFFFF` → `appTheme.colors.textInverse`
  - Replace `#4ECDC4`, `#6366F1` → Use `theme.avatarColors`
  - Replace `#F0FDF4` → `appTheme.colors.surface` with success tint
  - Replace `#E5E7EB` → `appTheme.colors.borderColor`

- [ ] `src/screens/CreateInvoiceScreen.tsx`
  - Replace `#000000` → `appTheme.colors.primary`
  
- [ ] `src/screens/CreateProductScreen.tsx`
  - Replace `#333` → `appTheme.colors.secondary`
  - Replace switch colors with theme values
  
- [ ] `src/screens/CreateBrandScreen.tsx`

#### 5.5 Settings & Profile Screens
- [ ] `src/screens/CompanyEditScreen.tsx`
  - Major cleanup needed (20+ hardcoded colors)
  
- [ ] `src/screens/CompanySettingsScreen.tsx`
  - Replace `#DC2626` → `appTheme.colors.error`
  
- [ ] `src/screens/ChangePasswordScreen.tsx`
  - Replace `#10B981` → `appTheme.colors.success`
  - Replace `#EF4444` → `appTheme.colors.error`
  
- [ ] `src/screens/SecuritySettingsScreen.tsx`
- [ ] `src/screens/PersonalProfileScreen.tsx`
- [ ] `src/screens/UserProfileScreen.tsx`

#### 5.6 Business Screens
- [ ] `src/screens/BusinessProfileScreen.tsx`
  - Large file with many hardcoded colors
  
- [ ] `src/screens/business/BusinessProfileOwnScreen.tsx`
- [ ] `src/screens/business/TeamManagementScreen.tsx`
  - Replace role badge colors with theme

#### 5.7 Chat Screen
- [ ] `src/screens/ChatScreen.tsx`
  - Major cleanup needed (50+ hardcoded colors)
  - Input field state colors
  - Message bubble colors
  - Status indicator colors

#### 5.8 Home & Activity Screens
- [ ] `src/screens/personal/HomeScreen.tsx`
  - Replace `#000000`, `#FFFFFF` with theme
  
- [ ] `src/screens/personal/ActivityScreen.tsx`
  - Replace stat card colors with theme
  
- [ ] `src/screens/personal/ExploreScreen.tsx`
  - Replace `#FFFFFF` → `appTheme.colors.textInverse`
  
- [ ] `src/screens/personal/PersonalDeliveryDetailScreen.tsx`
  - Replace status color object with theme colors

---

### Phase 6: Utility Components (Priority: LOW)

- [ ] `src/components/ColorPicker.tsx`
- [ ] `src/components/ImagePlaceholder.tsx`
- [ ] `src/components/IconButton.tsx`
- [ ] `src/components/NotificationBell.tsx`
- [ ] `src/components/ProfileSwitcher.tsx`
- [ ] `src/components/SplashScreen.tsx`
- [ ] `src/components/TaskCard.tsx`
- [ ] `src/components/CompanyDropdown.tsx`
- [ ] `src/components/LocationDropdown.tsx`
- [ ] `src/components/CartPopup.tsx`
- [ ] `src/components/CartBottomSection.tsx`
- [ ] `src/components/AccordionSection.tsx`
- [ ] `src/components/BrandCard.tsx`
- [ ] `src/components/OrderOptionCard.tsx`
- [ ] `src/components/OrderOptionsList.tsx`
- [ ] `src/components/ProductCardOtherCompany.tsx`

---

## 🔧 Search & Replace Patterns

Run these to find all hardcoded colors:

```bash
# Find all hex colors in TSX files
rg '#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b' --glob '*.tsx' -l

# Find common color name usages
rg "color:\s*['\"]?(white|black)['\"]?" --glob '*.tsx' -l
```

### Common Replacements

| Old Value | New Theme Token |
|-----------|-----------------|
| `#000000`, `#000` | `appTheme.colors.text` or `appTheme.colors.primary` |
| `#FFFFFF`, `#fff`, `white` | `appTheme.colors.textInverse` or `appTheme.colors.background` |
| `#333333`, `#333` | `appTheme.colors.secondary` |
| `#777777` | `appTheme.colors.textSecondary` |
| `#6B7280`, `#6b7280` | `appTheme.colors.iconMuted` or `appTheme.colors.textMuted` |
| `#374151` | `appTheme.colors.iconColor` |
| `#9CA3AF`, `#9ca3af` | `appTheme.colors.textMuted` |
| `#AAAAAA` | `appTheme.colors.textMuted` |
| `#E5E7EB`, `#e5e7eb` | `appTheme.colors.borderColor` |
| `#F3F4F6`, `#f3f4f6` | `appTheme.colors.surface` |
| `#F9FAFB`, `#f9fafb` | `appTheme.colors.surface` |
| `#F0F0F0` | `appTheme.colors.surface` |
| `#22C55E`, `#22c55e`, `#10B981` | `appTheme.colors.success` |
| `#EF4444`, `#FF3B30`, `#ff3b30`, `#DC2626` | `appTheme.colors.error` |
| `#F59E0B`, `#F59E42`, `#FFA500`, `#EAB308` | `appTheme.colors.warning` |
| `#0EA5E9`, `#3B82F6`, `#007AFF` | `appTheme.colors.info` |
| `#D23030` | `appTheme.colors.accent` |

---

## ✅ Implementation Checklist

### Before Starting Each File:
1. [ ] Import `useTheme` hook: `import { useTheme } from '../theme/ThemeProvider';`
2. [ ] Get theme in component: `const { theme: appTheme } = useTheme();`
3. [ ] For static StyleSheet colors, import theme: `import theme from '../theme';`

### For Each Hardcoded Color:
1. [ ] Identify the semantic meaning (text? border? status? icon?)
2. [ ] Find matching theme token
3. [ ] Replace inline if dynamic, or keep in StyleSheet if static
4. [ ] Test in both light mode (dark mode optional for now)

### After Completing Each File:
1. [ ] Run app and check screen visually
2. [ ] Check TypeScript for errors
3. [ ] Commit with message: `refactor(colors): migrate [ComponentName] to theme colors`

---

## 📊 Progress Tracker

| Phase | Total Files | Completed | Progress |
|-------|-------------|-----------|----------|
| Phase 1: Core Components | 5 | 5 | 100% ✅ |
| Phase 2: Card Components | 9 | 6 | 67% |
| Phase 3: Modal Components | 14 | 1 | 7% |
| Phase 4: Header & Nav | 8 | 2 | 25% |
| Phase 5: Screen Files | 25 | 5 | 20% |
| Phase 6: Utility Components | 18 | 0 | 0% |
| **Total** | **79** | **19** | **24%** |

### ✅ Completed Files
- `Pill.tsx` - text color
- `AppButton.tsx` - all variants
- `AppTextField.tsx` - uses theme correctly
- `Avatar.tsx` - default colors
- `OrderCard.tsx` - avatarColors, textSecondary
- `DeliveryCard.tsx` - status colors, textSecondary
- `InvoiceCard.tsx` - status colors, textSecondary
- `ProductCard.tsx` - status colors, switch, textSecondary
- `MessageCard.tsx` - status icons, textSecondary
- `FilterBar.tsx` - textSecondary
- `BusinessTabNavigator.tsx` - badge, logo border
- `ActionBottomSheet.tsx` - all theme tokens
- `LoginScreen.tsx` - background, button, text
- `RegisterScreen.tsx` - background, button, text
- `DeliveryScreen.tsx` - location dropdown
- `ProductsScreen.tsx` - location dropdown
- `InvoicesScreen.tsx` - location dropdown

---

## 🚀 Quick Start

Start with these high-impact files first:

1. **`src/components/Pill.tsx`** - Simple fix, used everywhere
2. **`src/components/OrderCard.tsx`** - Add avatarColors usage
3. **`src/screens/ChatScreen.tsx`** - Most complex, biggest visual impact
4. **`src/screens/ProfileScreen.tsx`** - User-facing, many colors
5. **`src/screens/CreateDeliveryScreen.tsx`** - Complex form screen

---

*Last updated: December 19, 2025*


