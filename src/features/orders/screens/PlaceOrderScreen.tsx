/**
 * PlaceOrderScreen (checkout)
 * Reviews the cart for one supplier, lets the buyer add notes, and places
 * the order via orderStore.placeOrder() (which calls the backend and clears
 * the cart on success).
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/shared/types/navigation';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { Text } from '@/shared/components/ui/Typography';
import { AppButton } from '@/shared/components/ui';
import { formatCurrency } from '@/shared/utils/format';
import { useCart, useOrderStore } from '@/shared/store/orderStore';
import { useProfileStore } from '@/shared/store/profileStore';
import { validateDiscountCode, Discount } from '@/features/discounts';

type Props = NativeStackScreenProps<RootStackParamList, 'PlaceOrder'>;

export default function PlaceOrderScreen({ route }: Props) {
  const { businessId, businessName } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme: appTheme } = useTheme();

  const cart = useCart(businessId);
  const items = cart?.items || [];
  const placeOrder = useOrderStore((state) => state.placeOrder);

  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const activeMode = useProfileStore((state) => state.activeMode);
  const currentUser = useProfileStore((state) => state.currentUser);

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);
  const [applyingCode, setApplyingCode] = useState(false);

  const total = cart?.total ?? 0;

  // Validate a coupon against the seller (businessId = the supplier). The final
  // discounted total is computed server-side when the order is placed.
  const handleApplyCode = async () => {
    const code = promoCode.trim();
    if (!code) return;
    setApplyingCode(true);
    try {
      setAppliedDiscount(await validateDiscountCode(businessId, code));
    } catch (e: any) {
      AppAlert.alert('Invalid code', e?.message || 'That code isn’t valid right now.');
    } finally {
      setApplyingCode(false);
    }
  };

  const handleConfirm = async () => {
    if (activeMode !== 'business' || !activeBusiness?.id) {
      AppAlert.alert(
        'Business account required',
        'Only business accounts can place orders. Switch to your business profile to continue.'
      );
      return;
    }
    if (items.length === 0) {
      AppAlert.alert('Empty cart', 'There is nothing to order.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await placeOrder(
        activeBusiness.id,
        activeBusiness.name || 'My business',
        businessId,
        businessName,
        notes.trim() || undefined,
        currentUser?.id,
        appliedDiscount?.code || undefined
      );

      if (order) {
        AppAlert.alert('Order placed', 'Your order has been sent to the supplier.', [
          {
            text: 'View orders',
            // Orders is a hidden tab in BusinessTabNavigator — target it via the drawer's
            // "Tabs" screen so the orders list opens in-shell (bottom bar + hamburger).
            onPress: () =>
              (navigation as any).navigate('MainTabs', {
                screen: 'Tabs',
                params: { screen: 'Orders', params: { initialTab: 'outgoing' } },
              }),
          },
        ]);
      } else {
        const err = useOrderStore.getState().error;
        AppAlert.alert('Could not place order', err || 'Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      <SecondaryHeader
        title="Review order"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Supplier */}
        <Text style={[styles.sectionLabel, { color: appTheme.colors.textLight }]}>Supplier</Text>
        <Text style={[styles.supplierName, { color: appTheme.colors.text }]}>{businessName}</Text>

        {/* Items */}
        <Text style={[styles.sectionLabel, { color: appTheme.colors.textLight, marginTop: 20 }]}>
          Items
        </Text>
        <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground }]}>
          {items.map((item) => (
            <View key={item.productId} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: appTheme.colors.text }]} numberOfLines={2}>
                  {item.product.name}
                </Text>
                <Text style={[styles.itemMeta, { color: appTheme.colors.textLight }]}>
                  {item.quantity} × {formatCurrency(item.product.price)}
                </Text>
              </View>
              <Text style={[styles.itemTotal, { color: appTheme.colors.text }]}>
                {formatCurrency(item.product.price * item.quantity)}
              </Text>
            </View>
          ))}

          <View style={[styles.totalRow, { borderTopColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.totalLabel, { color: appTheme.colors.text }]}>Total</Text>
            <Text style={[styles.totalValue, { color: appTheme.colors.text }]}>
              {formatCurrency(total)}
            </Text>
          </View>
        </View>

        {/* Promo code */}
        <Text style={[styles.sectionLabel, { color: appTheme.colors.textLight, marginTop: 20 }]}>
          Promo code (optional)
        </Text>
        {appliedDiscount ? (
          <View style={[styles.promoApplied, { borderColor: appTheme.colors.primary, backgroundColor: appTheme.colors.cardBackground }]}>
            <Text style={{ color: appTheme.colors.text, flex: 1 }}>
              {appliedDiscount.code} applied — {appliedDiscount.type === 'PERCENTAGE' ? `${appliedDiscount.value}% off` : `${formatCurrency(appliedDiscount.value)} off`}
            </Text>
            <TouchableOpacity onPress={() => { setAppliedDiscount(null); setPromoCode(''); }}>
              <Text style={{ color: appTheme.colors.error, fontWeight: '600' }}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.promoRow}>
            <TextInput
              style={[styles.promoInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor, backgroundColor: appTheme.colors.inputBackground }]}
              value={promoCode}
              onChangeText={setPromoCode}
              placeholder="Enter a code"
              placeholderTextColor={appTheme.colors.textLight}
              autoCapitalize="characters"
            />
            <AppButton title="Apply" variant="secondary" onPress={handleApplyCode} loading={applyingCode} disabled={!promoCode.trim() || applyingCode} />
          </View>
        )}
        <Text style={[styles.promoHint, { color: appTheme.colors.textLight }]}>
          Any discounts are applied to your total when the order is placed.
        </Text>

        {/* Notes */}
        <Text style={[styles.sectionLabel, { color: appTheme.colors.textLight, marginTop: 20 }]}>
          Notes (optional)
        </Text>
        <TextInput
          style={[
            styles.notesInput,
            {
              color: appTheme.colors.text,
              borderColor: appTheme.colors.borderColor,
              backgroundColor: appTheme.colors.inputBackground,
            },
          ]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add a note for the supplier…"
          placeholderTextColor={appTheme.colors.textLight}
          multiline
        />
      </ScrollView>

      {/* Sticky confirm bar */}
      <View
        style={[
          styles.actionBar,
          { backgroundColor: appTheme.colors.background, borderTopColor: appTheme.colors.borderColor },
        ]}
      >
        <AppButton
          title={`Place order · ${formatCurrency(total)}`}
          onPress={handleConfirm}
          loading={submitting}
          disabled={submitting || items.length === 0}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: theme.spacing.md, paddingBottom: 120 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  promoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  promoInput: { flex: 1, height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 15 },
  promoApplied: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, gap: 12 },
  promoHint: { fontSize: 12, marginTop: 8 },
  supplierName: { fontSize: 18, fontFamily: theme.fonts.primary.bold },
  card: { borderRadius: 12, padding: theme.spacing.md },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  itemInfo: { flex: 1, paddingRight: 12 },
  itemName: { fontSize: 14, fontFamily: theme.fonts.primary.medium },
  itemMeta: { fontSize: 12, marginTop: 2 },
  itemTotal: { fontSize: 14, fontFamily: theme.fonts.primary.bold },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: { fontSize: 16, fontFamily: theme.fonts.primary.bold },
  totalValue: { fontSize: 18, fontFamily: theme.fonts.primary.bold },
  notesInput: {
    minHeight: 90,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlignVertical: 'top',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.md,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
});
