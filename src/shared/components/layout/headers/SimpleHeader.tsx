import React, { ReactNode, useRef, useState, useCallback } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Platform,
  StatusBar,
  NativeScrollEvent,
  NativeSyntheticEvent,
  FlatList,
  ScrollView,
} from 'react-native';

export interface SimpleHeaderProps {
  /** The "top" header bar you want to keep fixed (e.g. logo + toggle buttons). */
  headerComponent: ReactNode;

  /** Optional search bar (below the main header) that will hide/show on scroll. */
  searchComponent?: ReactNode;

  /** Optional "sticky" tabs (e.g. segmented control) that stick to the header. */
  stickyComponent?: ReactNode;

  /**
   * Exactly one child: 
   *  – either an AnimatedFlatList (if you want a FlatList) 
   *  – or an AnimatedScrollView (if you want a ScrollView) 
   *  Either way, SimpleHeader will inject the `onScroll`/`scrollEventThrottle` props so that the header hides and shows.
   */
  children: React.ReactElement<any>;
}

// Calculate the total visible header height (status bar + header UI).
// This is a reasonable default, but the actual height will be measured dynamically
export const HEADER_HEIGHT = Platform.select({
  ios: 120,    // Increased default to accommodate dynamic content  
  android: 100 // Increased default to accommodate dynamic content
})!;

// Create Animated versions of FlatList and ScrollView
export const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
export const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export const SimpleHeader: React.FC<SimpleHeaderProps> = ({
  headerComponent,
  searchComponent,
  stickyComponent,
  children,
}) => {
  // This Animated.Value will be driven by the inner list's onScroll
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Track the actual measured heights - use more conservative initial values
  const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState(0);
  const [measuredSearchHeight, setMeasuredSearchHeight] = useState(0);
  const [measuredStickyHeight, setMeasuredStickyHeight] = useState(0);

  // Calculate total height when search is visible
  const totalHeaderHeight = measuredHeaderHeight + measuredSearchHeight + measuredStickyHeight;
  
  // Search component animation - hides when scrolling up
  const searchTranslateY = scrollY.interpolate({
    inputRange: [0, Math.max(measuredSearchHeight, 1)],
    outputRange: [0, -Math.max(measuredSearchHeight, 1)],
    extrapolate: 'clamp',
  });

  // Search component opacity - fades out when scrolling up
  const searchOpacity = scrollY.interpolate({
    inputRange: [0, Math.max(measuredSearchHeight, 1) / 2, Math.max(measuredSearchHeight, 1)],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  // Sticky component position - moves up to stick to header when search is hidden
  const stickyTranslateY = scrollY.interpolate({
    inputRange: [0, Math.max(measuredSearchHeight, 1)],
    outputRange: [0, -Math.max(measuredSearchHeight, 1)],
    extrapolate: 'clamp',
  });

  // Measure the actual header height when it's laid out
  const handleHeaderLayout = useCallback((event: any) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      setMeasuredHeaderHeight(height);
    }
  }, []);

  // Measure the search component height
  const handleSearchLayout = useCallback((event: any) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      setMeasuredSearchHeight(height);
    }
  }, []);

  // Measure the sticky component height
  const handleStickyLayout = useCallback((event: any) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      setMeasuredStickyHeight(height);
    }
  }, []);

  // Handle the case where children might not be an AnimatedFlatList/AnimatedScrollView
  // In this case, we'll wrap the content in an AnimatedScrollView
  const shouldWrapInScrollView = !children || 
    !children.type || 
    (children.type !== AnimatedFlatList && children.type !== AnimatedScrollView);

  // Use fallback values if measurements aren't available yet
  const fallbackHeaderHeight = measuredHeaderHeight || 48;
  const fallbackSearchHeight = measuredSearchHeight || 80;
  const fallbackStickyHeight = measuredStickyHeight || 48;
  const fallbackTotalHeight = fallbackHeaderHeight + fallbackSearchHeight + fallbackStickyHeight;

  if (shouldWrapInScrollView) {
    // Calculate scroll indicator insets for wrapped case
    const scrollIndicatorInsets = stickyComponent 
      ? { top: fallbackHeaderHeight + fallbackStickyHeight + 4 } // Header + sticky + spacing
      : { top: fallbackHeaderHeight };
      
    // Wrap all content in a single AnimatedScrollView
    return (
      <View style={styles.container}>
        {/* Fixed Header - Always visible at top */}
        <View
          style={[
            styles.fixedHeaderContainer,
            measuredHeaderHeight > 0 ? { height: measuredHeaderHeight } : {}
          ]}
          onLayout={handleHeaderLayout}
        >
          {headerComponent}
        </View>

        {/* Animated Search Component - Hides when scrolling up */}
        {searchComponent && (
          <Animated.View
            style={[
              styles.searchContainer,
              {
                transform: [{ translateY: searchTranslateY }],
                opacity: searchOpacity,
                top: fallbackHeaderHeight,
              }
            ]}
            onLayout={handleSearchLayout}
          >
            {searchComponent}
          </Animated.View>
        )}

        {/* Sticky Component - Sticks to header when search is hidden */}
        {stickyComponent && (
          <Animated.View
            style={[
              styles.stickyContainer,
              {
                transform: [{ translateY: stickyTranslateY }],
                top: fallbackHeaderHeight + fallbackSearchHeight,
              }
            ]}
            onLayout={handleStickyLayout}
          >
            {stickyComponent}
          </Animated.View>
        )}

        <View style={{ flex: 1 }}>
          <AnimatedScrollView
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            contentContainerStyle={{
              paddingTop: fallbackTotalHeight,
            }}
            scrollIndicatorInsets={scrollIndicatorInsets}
            style={{ flex: 1 }}
          >
            {children}
          </AnimatedScrollView>
        </View>
      </View>
    );
  }

  // Clone the single child to inject onScroll + scrollEventThrottle.
  // It must be either <AnimatedFlatList> or <AnimatedScrollView>.
  const existingContentContainerStyle = children.props?.contentContainerStyle || {};
  
  // Calculate scroll indicator insets
  const scrollIndicatorInsets = stickyComponent 
    ? { top: fallbackHeaderHeight + fallbackStickyHeight + 4 } // Header + sticky + spacing
    : { top: fallbackHeaderHeight };
    
  const clonedChildren = React.cloneElement(children, {
    // Attach the native scroll event to our Animated.Value
    onScroll: Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      { useNativeDriver: true }
    ),
    scrollEventThrottle: 16,
    // Update contentContainerStyle to use measured height
    contentContainerStyle: {
      ...existingContentContainerStyle,
      paddingTop: fallbackTotalHeight,
    },
    // Add scroll indicator insets to position indicators below sticky component
    scrollIndicatorInsets: scrollIndicatorInsets,
  });

  return (
    <View style={styles.container}>
      {/* Fixed Header - Always visible at top */}
      <View
        style={[
          styles.fixedHeaderContainer,
          measuredHeaderHeight > 0 ? { height: measuredHeaderHeight } : {}
        ]}
        onLayout={handleHeaderLayout}
      >
        {headerComponent}
      </View>

      {/* Animated Search Component - Hides when scrolling up */}
      {searchComponent && (
        <Animated.View
          style={[
            styles.searchContainer,
            {
              transform: [{ translateY: searchTranslateY }],
              opacity: searchOpacity,
              top: fallbackHeaderHeight,
            }
          ]}
          onLayout={handleSearchLayout}
        >
          {searchComponent}
        </Animated.View>
      )}

      {/* Sticky Component - Sticks to header when search is hidden */}
      {stickyComponent && (
        <Animated.View
          style={[
            styles.stickyContainer,
            {
              transform: [{ translateY: stickyTranslateY }],
              top: fallbackHeaderHeight + fallbackSearchHeight,
            }
          ]}
          onLayout={handleStickyLayout}
        >
          {stickyComponent}
        </Animated.View>
      )}

      <View style={{ flex: 1 }}>
        {clonedChildren}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeaderContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    left: 0,
    right: 0,
    zIndex: 30,
    minHeight: 48, // Minimum fallback height
    // Remove hardcoded backgroundColor and shadows - let components handle their own styling
  },
  searchContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    minHeight: 60, // Minimum fallback height
    // Remove hardcoded backgroundColor and shadows - let components handle their own styling
  },
  stickyContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 25,
    minHeight: 40, // Minimum fallback height
    // Remove hardcoded backgroundColor and shadows - let components handle their own styling
  },
});

export default SimpleHeader; 