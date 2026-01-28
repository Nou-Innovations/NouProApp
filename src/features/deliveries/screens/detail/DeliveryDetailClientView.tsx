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
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppBottomSheet, { AppBottomSheetItem } from '@/shared/components/ui/AppBottomSheet';
import { AppButton } from '@/shared/components/ui/AppButton';
import type { Delivery, DeliveryStatus, PaymentStatus } from '@/shared/types/delivery';
import { useProfileStore } from '@/shared/store/profileStore';

import {
  PartyHeaderCard,
  OrderDetailsSection,
  ProductListSection,
  NotesSection,
  OrderUpdatesTimeline,
} from '../../components/detail';

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
  const activeBusiness = useProfileStore((state) => state.activeBusiness);

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
      noteList.push({
        id: 'note-distributor',
        businessName: delivery.clientCompanyName,
        businessAvatar: delivery.clientCompanyName?.charAt(0).toUpperCase() || 'S',
        message: delivery.distributorNotes,
        timestamp: new Date(new Date(delivery.orderTime).getTime() + 3600000),
      });
    }
    return noteList;
  }, [delivery, activeBusiness]);

  // Navigate to supplier profile
  const navigateToSupplierProfile = () => {
    navigation.navigate('ViewBusinessProfile', { businessId: delivery.clientId || '1' });
  };

  // Handle accept order
  const handleAccept = () => {
    if (onAccept) {
      onAccept();
    } else {
      Alert.alert('Order Accepted', 'The order has been accepted.');
    }
  };

  // Handle reject order
  const handleReject = () => {
    Alert.alert(
      'Reject Order',
      'Are you sure you want to reject this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            if (onReject) {
              onReject();
            } else {
              Alert.alert('Order Rejected', 'The order has been rejected.');
            }
          },
        },
      ]
    );
  };

  // More options menu
  const moreOptionsItems: AppBottomSheetItem[] = [
    { id: 'share', title: 'Share' },
    // Client can cancel if not yet processed
    ...(delivery.deliveryStatus === 'NOT_ASSIGNED'
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
            onPress: () => {
              Alert.alert('Request Cancelled', 'The order request has been cancelled.');
              navigation.goBack();
            },
          },
        ]
      );
    }
  };

  // Handle send note
  const handleSendNote = (noteText: string) => {
    Alert.alert('Note Sent', 'Your note has been sent to the supplier.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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

        {/* Supplier/Fulfiller Information (swapped from client) */}
        <PartyHeaderCard
          logoUri={delivery.clientCompanyLogo}
          name={delivery.clientCompanyName}
          address={delivery.clientAddress}
          onPressProfile={navigateToSupplierProfile}
        />

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
          canAddNotes={true}
          onAddNote={handleSendNote}
        />

        {/* Order Updates Timeline */}
        <OrderUpdatesTimeline
          delivery={delivery}
          deliveryStatus={delivery.deliveryStatus}
          paymentStatus={delivery.paymentStatus}
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
    backgroundColor: '#fff',
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
    borderBottomColor: '#E5E7EB',
  },
  acceptButton: {
    flex: 2,
  },
  rejectButton: {
    flex: 1,
  },
});

export default DeliveryDetailClientView;
