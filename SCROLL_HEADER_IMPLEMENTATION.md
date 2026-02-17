# Scroll-to-Hide Header Implementation

## Overview
Successfully implemented a smooth scroll-to-hide header effect for the following screens:
- **Inbox Screen** - Chat conversations list
- **Deliveries Screen** - Delivery tracking list  
- **Products Screen** - Product catalog with brands
- **Invoices Screen** - Invoice management with tabs
- **Profile Screen** - Company profile with tabs and nested content

## How It Works

### Scroll Behavior
- **Scroll Up (Upward swipe)**: Header smoothly slides up and hides after scrolling more than 50px
- **Scroll Down (Downward swipe)**: Header smoothly slides back down to its initial position
- **Near Top**: Header automatically shows when scroll position is within 50px of the top

### Technical Implementation

#### Enhanced SimpleHeader Component
The `SimpleHeader` component has been enhanced with:

1. **Scroll Direction Detection**: Tracks scroll direction and distance
2. **Smooth Animations**: Uses React Native's `Animated.timing` with 200ms duration
3. **Recursive Enhancement**: Automatically finds and enhances any `ScrollView` or `FlatList` components in the children tree
4. **Native Driver**: Uses `useNativeDriver: true` for optimal performance

#### Key Features
- **Threshold Control**: Only triggers animation after 5px of scroll movement to prevent jittery behavior
- **Position Awareness**: Header always shows when near the top (within 50px)
- **Smooth Transitions**: 200ms animation duration for natural feel
- **Zero Configuration**: Works automatically with existing screen implementations

### Code Changes

#### Modified Files
- `src/components/SimpleHeader.tsx` - Enhanced with scroll-to-hide functionality

#### Core Logic
```typescript
// Scroll direction detection
const scrollDirection = currentScrollY > lastScrollY.current ? 'up' : 'down';
const scrollDiff = Math.abs(currentScrollY - lastScrollY.current);

// Animation trigger
if (scrollDiff > 5) {
  if (scrollDirection === 'up' && currentScrollY > 50) {
    // Hide header
    Animated.timing(headerTranslateY, {
      toValue: -actualHeaderHeight,
      duration: 200,
      useNativeDriver: true,
    }).start();
  } else if (scrollDirection === 'down' || currentScrollY <= 50) {
    // Show header
    Animated.timing(headerTranslateY, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }
}
```

### Affected Screens

#### 1. Inbox Screen
- **Component**: `FlatList` with chat conversations
- **Trigger**: Scrolling through message list
- **Header Content**: Title, search bar, filter tabs

#### 2. Deliveries Screen  
- **Component**: `FlatList` with delivery cards
- **Trigger**: Scrolling through delivery list
- **Header Content**: Title with location dropdown, search bar, status filter

#### 3. Products Screen
- **Component**: `FlatList` with brand/product cards
- **Trigger**: Scrolling through product catalog
- **Header Content**: View selector, search bar with add button, status filter

#### 4. Invoices Screen
- **Component**: `FlatList` with invoice cards
- **Trigger**: Scrolling through invoice list  
- **Header Content**: Invoice/Estimates tabs, location dropdown

#### 5. Profile Screen
- **Component**: Nested `ScrollView` in About tab
- **Trigger**: Scrolling through company information
- **Header Content**: Profile dropdown, notification bell

### Design Considerations

#### Preserved Design Elements
- ✅ All existing header styling maintained
- ✅ Search bars and filter components unchanged
- ✅ Action buttons and dropdowns preserved
- ✅ Tab functionality continues to work
- ✅ Theme colors and spacing maintained

#### Smooth User Experience
- ✅ Natural scroll-based hiding/showing
- ✅ Prevents accidental triggers with 5px threshold
- ✅ Always accessible when at top of list
- ✅ Consistent 200ms animation timing
- ✅ No performance impact with native driver

### Testing Recommendations

1. **Scroll Performance**: Test smooth scrolling on various devices
2. **Animation Timing**: Verify 200ms feels natural for hiding/showing
3. **Threshold Behavior**: Confirm 50px top threshold works well
4. **Tab Navigation**: Ensure tab switches don't interfere with header state
5. **Search/Filter**: Verify header remains functional during interactions

The implementation provides a modern, iOS-style scroll-to-hide header effect while maintaining all existing functionality and design elements. 