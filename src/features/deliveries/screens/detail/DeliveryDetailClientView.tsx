/**
 * DeliveryDetailClientView
 * 
 * View for the business that made the order (Case 1).
 * Also handles acceptance state for pending order requests (Case 4).
 * 
 * Permissions:
 * - View order: Yes
 * - Edit schedule/transport/staff/status/payment: No
 * - Warehouse selector: No
 * - Stock warnings: No
 * - Toggle loaded: No
 * - Item status menu: No
 * - Add notes: Yes
 * - Accept/Reject: If requireAccept=true
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppBottomSheet, { AppBottomSheetItem } from '@/shared/components/ui/AppBottomSheet';
import AppButton from '@/shared/components/ui/AppButton';
import type { Delivery, DeliveryStatus, PaymentStatus } from '@/shared/types/delivery';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';

import {
  PartyHeaderCard,
  OrderDetailsSection,
  ProductListSection,
  NotesSection,
  OrderUpdatesTimeline,
  DeliveryStatusTimeline,
} from '../../components/detail';
import { useDeliveryActions } from '../../hooks/useDeliveryActions';

interface DeliveryDetailClientViewProps {
  delivery: Delivery;
  /** If true, shows Accept/Reject buttons for pending order requests */
  requireAccept?: boolean;
  /** Callback when order is accepted */
  onAccept?: () => void;
  /** Callback when order is rejected */
  onReject?: () => void;
}

export function DeliveryDetailClientView({
  delivery,
  requireAccept = false,
  onAccept,
  onReject,
}: DeliveryDetailClientViewProps) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const actions = useDeliveryActions(delivery.id);

  // State
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Generate notes from delivery data
  const notes = useMemo(() => {
    const noteList = [];
    if (delivery.clientNotes) {
      noteList.push({
        id: 'note-client',
        businessName: 'You',
        businessAvatar: activeBusiness?.name?.charAt(0).toUpperCase() || 'Y',
        message: delivery.clientNotes,
        timestamp: new Date(delivery.orderTime),
      });
    }
    if (delivery.distributorNotes) {
      const supplierName = delivery.distributorName || 'Supplier';
      noteList.push({
        id: 'note-distributor',
        businessName: supplierName,
        businessAvatar: supplierName.charAt(0).toUpperCase(),
        message: delivery.distributorNotes,
        timestamp: new Date(new Date(delivery.orderTime).getTime() + 3600000),
      });
    }
    return noteList;
  }, [delivery, activeBusiness]);

  // Navigate to supplier profile (businessId is the supplier who created the delivery)
  const navigateToSupplierProfile = () => {
    navigation.navigate('ViewBusinessProfile', { businessId: delivery.businessId || '' });
  };

  // Handle accept order -- call API then notify parent
  const handleAccept = async () => {
    await actions.updateStatus('Scheduled');
    if (onAccept) onAccept();
  };

  // Handle reject order -- confirm then call API and notify parent
  const handleReject = () => {
    Alert.alert(
      'Reject Order',
      'Are you sure you want to reject this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            await actions.updateStatus('Canceled');
            if (onReject) onReject();
          },
        },
      ]
    );
  };

  // More options menu
  const moreOptionsItems: AppBottomSheetItem[] = [
    { id: 'share', title: 'Share' },
    // Client can cancel if not yet processed
    ...(delivery.deliveryStatus === 'Draft'
      ? [{ id: 'cancel', title: 'Cancel Request', variant: 'destructive' as const }]
      : []),
  ];

  const handleMoreOptionSelect = (item: { id: string }) => {
    if (item.id === 'share') {
      Alert.alert('Share', `Share delivery ${delivery.id}`);
    } else if (item.id === 'cancel') {
      Alert.alert(
        'Cancel Request',
        'Are you sure you want to cancel this order request?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              await actions.updateStatus('Canceled');
              navigation.goBack();
            },
          },
        ]
      );
    }
  };

  // Handle send note
  const handleSendNote = async (noteText: string) => {
    await actions.addClientNote(noteText);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title={delivery.id}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        rightActions={[{ icon: 'ellipsis-vertical', onPress: () => setShowMoreOptions(true) }]}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Accept/Reject buttons for pending requests */}
        {requireAccept && (
          <View style={styles.acceptSection}>
            <AppButton
              title="Accept Order"
              onPress={handleAccept}
              variant="primary"
              style={styles.acceptButton}
            />
            <AppButton
              title="Reject"
              onPress={handleReject}
              variant="alert"
              style={styles.rejectButton}
            />
          </View>
        )}

        {/* Supplier/Fulfiller Information */}
        <PartyHeaderCard
          logoUri={undefined}
          name={delivery.distributorName || 'Supplier'}
          address={undefined}
          onPressProfile={navigateToSupplierProfile}
        />

        {/* Link to Purchase Order (when delivery was auto-created from a PO) */}
        {delivery.orderId && delivery.distributorNotes?.startsWith('PO:') && (
          <TouchableOpacity
            style={[styles.poLinkCard, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}
            onPress={() => navigation.navigate('PurchaseOrderDetail', { orderId: delivery.orderId })}
            activeOpacity={0.7}
          >
            <Icon name="document-text" size={20} color={appTheme.colors.primary} />
            <Text style={[styles.poLinkText, { color: appTheme.colors.text }]}>
              Purchase Order: {delivery.distributorNotes.replace('PO:', '')}
            </Text>
            <Icon name="chevron-forward" size={16} color={appTheme.colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Order Details - Read-only */}
        <OrderDetailsSection
          delivery={delivery}
          deliveryStatus={delivery.deliveryStatus}
          paymentStatus={delivery.paymentStatus}
          expectedDeliveryTime={new Date(delivery.expectedDeliveryDateTime)}
          canEditSchedule={false}
          canEditTransport={false}
          canEditAssignedStaff={false}
          canEditStatus={false}
          canEditPayment={false}
        />

        {/* Product List - Read-only */}
        <ProductListSection
          items={delivery.items || []}
          showWarehouseSelector={false}
          showStockWarnings={false}
          canToggleLoaded={false}
          showItemStatusMenu={false}
        />

        {/* Notes - Can add */}
        <NotesSection
          notes={notes}
          canAddNotes
          onAddNote={handleSendNote}
        />

        {/* Order Updates Timeline */}
        <OrderUpdatesTimeline
          delivery={delivery}
          deliveryStatus={delivery.deliveryStatus}
          paymentStatus={delivery.paymentStatus}
        />

        <DeliveryStatusTimeline
          companyId={delivery.businessId}
          deliveryId={delivery.id}
          refreshKey={delivery.deliveryStatus}
        />
      </ScrollView>

      {/* More Options Bottom Sheet */}
      <AppBottomSheet
        visible={showMoreOptions}
        onClose={() => setShowMoreOptions(false)}
        title="Options"
        items={moreOptionsItems}
        mode="buttons"
        onSelectItem={handleMoreOptionSelect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  acceptSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE6DF',
  },
  acceptButton: {
    flex: 2,
  },
  rejectButton: {
    flex: 1,
  },
  poLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  poLinkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default DeliveryDetailClientView;
