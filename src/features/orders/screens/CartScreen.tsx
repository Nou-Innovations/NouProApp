/**
 * CartScreen
 * Full-page cart for a single supplier (keyed by businessId).
 * Lists cart items and a sticky footer to place the order.
 */

import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/shared/types/navigation';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { EmptyState } from '@/shared/components/ui';
import { useCart } from '@/shared/store/orderStore';
import { CartItemCard, CartBottomSection } from '@/features/cart/components';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'Cart'>;

export default function CartScreen({ route }: Props) {
  const { businessId, businessName } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme: appTheme } = useTheme();

  const cart = useCart(businessId);
  const items = cart?.items || [];

  const handlePlaceOrder = () => {
    navigation.navigate('PlaceOrder', {
      businessId,
      businessName: cart?.businessName || businessName || 'Supplier',
    });
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      <SecondaryHeader
        title={cart?.businessName || businessName || 'Cart'}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item.productId}
        renderItem={({ item }) => <CartItemCard item={item} businessId={businessId} />}
        ListEmptyComponent={
          <EmptyState
            iconName="cart-outline"
            title="Your cart is empty"
            subtitle="Add products from a supplier's catalogue to start an order."
            testID="empty-cart"
          />
        }
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* Sticky footer with totals + Place Order (renders null when cart empty) */}
      <CartBottomSection businessId={businessId} onPlaceOrder={handlePlaceOrder} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContent: {
    // Leave room for the absolutely-positioned CartBottomSection
    paddingBottom: 220,
  },
});
