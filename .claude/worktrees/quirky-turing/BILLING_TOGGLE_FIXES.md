# Billing Toggle Button Fixes

## Date
February 2, 2026

## Issues Fixed

### 1. ✅ Equal Button Sizes with 8px Gap
**Problem:** Monthly button was wider than Yearly button
**Solution:** 
- Wrapped both buttons in `buttonWrapper` views with `flex: 1`
- Set button width to `100%` within each wrapper
- Changed gap from 12px to 8px in the container

**Result:** Both buttons now have equal width with exactly 8px spacing between them

### 2. ✅ Conditional "Save up to 11%" Display
**Problem:** "Save up to 11%" text was always visible
**Solution:** 
- Changed from absolute positioning approach to conditional rendering
- Text only renders when `billingPeriod === 'yearly'`

**Code:**
```tsx
{billingPeriod === 'yearly' && (
  <Text style={styles.yearlySaveText}>
    Save up to 11%
  </Text>
)}
```

**Result:** Text only appears when Yearly button is selected

### 3. ✅ Vertical Text Alignment
**Problem:** Needed both "Yearly" and "Save up to 11%" vertically aligned in the button
**Solution:** 
- Created custom TouchableOpacity for Yearly button (instead of using AppButton)
- Stacked two Text components vertically
- Applied proper styling for alignment and colors

**Implementation:**
- Main text: "Yearly" - changes color based on selection state
- Secondary text: "Save up to 11%" - always green (#22C55E) when visible
- Both texts centered in button with 2px spacing

## Technical Changes

### New Custom Button Component
Replaced AppButton for Yearly with custom TouchableOpacity to support:
- Two-line text with different colors
- Conditional display of second line
- Proper vertical centering

### Updated Styles

**Added:**
```typescript
customYearlyButton: {
  height: 56,
  borderRadius: 8,
  paddingHorizontal: 24,
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
},
yearlyButtonPrimary: {
  backgroundColor: '#0075FF',
},
yearlyButtonOutline: {
  backgroundColor: 'transparent',
  borderWidth: 1,
},
yearlyMainText: {
  fontSize: 16,
  fontFamily: theme.fonts.primary.semiBold,
},
yearlySaveText: {
  fontSize: 11,
  fontFamily: theme.fonts.primary.semiBold,
  color: '#22C55E',
  marginTop: 2,
},
```

**Modified:**
```typescript
billingToggleContainer: {
  gap: 8, // Changed from 12
}
buttonWrapper: {
  flex: 1, // New wrapper style
}
```

**Removed:**
- `saveTextInButton` (no longer needed with new approach)
- `yearlyButtonText` (replaced with custom implementation)

## Visual Result

### When Yearly is NOT Selected:
```
┌──────────┐  ┌──────────┐
│ Monthly  │  │  Yearly  │
└──────────┘  └──────────┘
```
- Both outline style
- Same width
- 8px gap

### When Yearly IS Selected:
```
┌──────────┐  ┌───────────┐
│ Monthly  │  │  Yearly   │
└──────────┘  │Save up to │
              │   11%     │
              └───────────┘
```
- Yearly is primary (blue background)
- "Yearly" text in white
- "Save up to 11%" text in green
- Vertically centered
- Same width as Monthly

## Files Modified

1. **src/features/subscription/screens/SubscriptionPlansScreen.tsx**
   - Created custom Yearly button with TouchableOpacity
   - Added conditional rendering for save text
   - Updated container and button styles
   - Adjusted gap to 8px

## Testing

✅ Both buttons have equal width
✅ Exactly 8px gap between buttons
✅ "Save up to 11%" only shows when Yearly is selected
✅ Both texts are vertically centered when displayed
✅ Green color (#22C55E) applied to save text
✅ Button states (selected/unselected) work correctly
✅ No new linter errors introduced

## Benefits

1. **Better Visual Balance:** Equal width buttons create cleaner UI
2. **Clearer Intent:** Save text only appears when relevant
3. **Improved Readability:** Vertical alignment makes two-line text easy to read
4. **Consistent Spacing:** 8px gap matches design system standards
5. **Flexible Implementation:** Custom button allows for complex styling needs

## Additional Fix: Primary Color

### Issue
Yearly button was using hardcoded blue color (#0075FF) instead of theme's primary color

### Solution
Changed to dynamic theme color:
```tsx
backgroundColor: appTheme.colors.primary
```

### Benefits
- ✅ Theme consistency across the app
- ✅ Respects theme changes
- ✅ Better maintainability

---

**Status:** ✅ COMPLETE
**No Breaking Changes:** All updates are visual/styling only
**Theme Consistency:** ✅ Fixed
