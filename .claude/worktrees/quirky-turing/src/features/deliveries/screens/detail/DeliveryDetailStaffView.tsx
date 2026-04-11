/**
 * DeliveryDetailStaffView
 * 
 * View for staff assigned to the delivery (Case 5).
 * Limited operational checklist with restricted controls.
 * 
 * Permissions:
 * - View order: Yes
 * - Edit schedule/transport/staff: No
 * - Edit order status: Limited (only super_admin/admin/teamLeader)
 *   - Limited options: OUT_FOR_DELIVERY, DELIVERED, FAILED
 * - Edit payment status: No
 * - Warehouse selector: No
 * - Stock warnings: No
 * - Toggle loaded: Only if super_admin/admin/teamLeader
 * - Item status menu: No
 * - Add notes: Yes (as "report issue")
 * - Accept/Reject: No
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Animated,
  Easing,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppBottomSheet, { AppBottomSheetItem } from '@/shared/components/ui/AppBottomSheet';
import { AppButton } from '@/shared/components/ui/AppButton';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { Delivery, DeliveryStatus, PaymentStatus, DeliveryItem } from '@/shared/types/delivery';
import { useProfileStore } from '@/shared/store/profileStore';

import {
  PartyHeaderCard,
  OrderDetailsSection,
  ProductListSection,
  NotesSection,
  OrderUpdatesTimeline,
} from '../../components/detail';
import { useDeliveryActions } from '../../hooks/useDeliveryActions';

interface DeliveryDetailStaffViewProps {
  delivery: Delivery;
}

export function DeliveryDetailStaffView({ delivery }: DeliveryDetailStaffViewProps) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const actions = useDeliveryActions(delivery.id);
  const currentUserRole = useProfileStore((state) => state.currentUserRole);
  const currentStaffRoleType = useProfileStore((state) => state.currentStaffRoleType);

  // Animation constants
  const ANIMATION_DURATION = 300;
  const ANIMATION_EASING = Easing.inOut(Easing.cubic);

  // Check if staff has elevated permissions
  const hasElevatedPermissions =
    currentUserRole === 'super_admin' ||
    currentUserRole === 'admin' ||
    currentStaffRoleType === 'teamLeader';

  // State
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>(delivery.items || []);
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>(delivery.deliveryStatus);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Sync local state when delivery prop changes (e.g. after refetch or store update)
  useEffect(() => {
    setDeliveryItems(delivery.items || []);
    setDeliveryStatus(delivery.deliveryStatus);
  }, [delivery.id, delivery.deliveryStatus]);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Animation values
  const [statusOverlayAnimation] = useState(new Animated.Value(0));
  const [statusContentAnimation] = useState(new Animated.Value(0));

  // Animation helpers
  const animateOverlayIn = (animation: Animated.Value) => {
    Animated.timing(animation, {
      toValue: 1,
      duration: ANIMATION_DURATION,
      easing: ANIMATION_EASING,
      useNativeDriver: true,
    }).start();
  };

  const animateOverlayOut = (animation: Animated.Value, onComplete?: () => void) => {
    Animated.timing(animation, {
      toValue: 0,
      duration: ANIMATION_DURATION,
      easing: ANIMATION_EASING,
      useNativeDriver: true,
    }).start(onComplete);
  };

  const animateContentIn = (animation: Animated.Value) => {
    Animated.timing(animation, {
      toValue: 1,
      duration: ANIMATION_DURATION,
      easing: ANIMATION_EASING,
      useNativeDriver: true,
    }).start();
  };

  const animateContentOut = (animation: Animated.Value, onComplete?: () => void) => {
    Animated.timing(animation, {
      toValue: 0,
      duration: ANIMATION_DURATION,
      easing: ANIMATION_EASING,
      useNativeDriver: true,
    }).start(onComplete);
  };

  // Generate notes from delivery data
  const notes = useMemo(() => {
    const noteList = [];
    if (delivery.clientNotes) {
      noteList.push({
        id: 'note-client',
        businessName: delivery.clientCompanyName,
        businessAvatar: delivery.clientCompanyName?.charAt(0).toUpperCase() || 'C',
        message: delivery.clientNotes,
        timestamp: new Date(delivery.orderTime),
      });
    }
    if (delivery.distributorNotes) {
      noteList.push({
        id: 'note-distributor',
        businessName: activeBusiness?.name || 'Your Business',
        businessAvatar: activeBusiness?.name?.charAt(0).toUpperCase() || 'Y',
        message: delivery.distributorNotes,
        timestamp: new Date(new Date(delivery.orderTime).getTime() + 3600000),
      });
    }
    return noteList;
  }, [delivery, activeBusiness]);

  // Handle item loaded toggle (only if elevated permissions)
  const handleItemLoadedToggle = (itemId: string) => {
    if (!hasElevatedPermissions) {
      Alert.alert(
        'Permission Denied',
        'Only team leaders and admins can update loaded status.'
      );
      return;
    }
    const updatedItems = deliveryItems.map(item =>
      item.id === itemId ? { ...item, isLoaded: !item.isLoaded } : item
    );
    setDeliveryItems(updatedItems);
    // Persist to API (fire-and-forget, errors handled by actions hook)
    actions.updateItems(updatedItems);
  };

  // Status modal handlers
  const handleShowStatusModal = () => {
    if (!hasElevatedPermissions) {
      Alert.alert(
        'Permission Denied',
        'Only team leaders and admins can update delivery status.'
      );
      return;
    }
    setShowStatusModal(true);
    animateOverlayIn(statusOverlayAnimation);
    animateContentIn(statusContentAnimation);
  };

  const handleHideStatusModal = () => {
    animateOverlayOut(statusOverlayAnimation);
    animateContentOut(statusContentAnimation, () => setShowStatusModal(false));
  };

  // Limited status options for staff
  const staffStatusOptions = [
    { id: 'OUT_FOR_DELIVERY', name: 'Out for Delivery', value: 'OUT_FOR_DELIVERY', icon: 'bicycle-outline', color: theme.colors.info },
    { id: 'DELIVERED', name: 'Delivered', value: 'DELIVERED', icon: 'checkmark-circle-outline', color: theme.colors.success },
    { id: 'FAILED', name: 'Failed / Issue', value: 'FAILED', icon: 'alert-circle-outline', color: theme.colors.error },
  ];

  // More options menu (limited for staff)
  const moreOptionsItems: AppBottomSheetItem[] = [
    { id: 'share', title: 'Share' },
  ];

  const handleMoreOptionSelect = (item: { id: string }) => {
    if (item.id === 'share') {
      Alert.alert('Share', `Share delivery ${delivery.id}`);
    }
  };

  // Handle report issue (creates note + optionally sets status to FAILED)
  const handleReportIssue = (noteText: string) => {
    Alert.alert(
      'Issue Reported',
      'Do you want to mark this delivery as failed?',
      [
        {
          text: 'Report Only',
          onPress: async () => {
            await actions.addNote(noteText);
          },
        },
        {
          text: 'Mark as Failed',
          style: 'destructive',
          onPress: async () => {
            await actions.addNote(noteText);
            const result = await actions.updateStatus('FAILED');
            if (result) {
              setDeliveryStatus('FAILED');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Call destination
  const handleCallDestination = () => {
    if (delivery.clientPhone) {
      Linking.openURL(`tel:${delivery.clientPhone}`);
    } else {
      Alert.alert('No Phone Number', 'No phone number available for this destination.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title={delivery.id}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        rightActions={[{ icon: 'ellipsis-vertical', onPress: () => setShowMoreOptions(true) }]}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Quick Action Buttons for Staff */}
        <View style={styles.quickActionsSection}>
          {delivery.clientPhone && (
            <AppButton
              title="Call Customer"
              onPress={handleCallDestination}
              variant="outline"
              leftIcon="call-outline"
              style={styles.quickActionButton}
            />
          )}
          {hasElevatedPermissions && (
            <AppButton
              title="Update Status"
              onPress={handleShowStatusModal}
              variant="primary"
              leftIcon="refresh-outline"
              style={styles.quickActionButton}
            />
          )}
        </View>

        {/* Route/Destination Information */}
        <PartyHeaderCard
          logoUri={delivery.clientCompanyLogo}
          name={delivery.clientCompanyName}
          address={delivery.clientAddress}
          subtitle={delivery.clientPhone ? `Phone: ${delivery.clientPhone}` : undefined}
        />

        {/* Order Details - Read-only (status might be editable for elevated roles) */}
        <OrderDetailsSection
          delivery={delivery}
          deliveryStatus={deliveryStatus}
          paymentStatus={delivery.paymentStatus}
          expectedDeliveryTime={new Date(delivery.expectedDeliveryDateTime)}
          canEditSchedule={false}
          canEditTransport={false}
          canEditAssignedStaff={false}
          canEditStatus={hasElevatedPermissions}
          canEditPayment={false}
          onOpenStatusModal={handleShowStatusModal}
        />

        {/* Product List - Limited (loaded toggle only for elevated) */}
        <ProductListSection
          items={deliveryItems}
          showWarehouseSelector={false}
          showStockWarnings={false}
          canToggleLoaded={hasElevatedPermissions}
          showItemStatusMenu={false}
          onItemLoadedToggle={handleItemLoadedToggle}
        />

        {/* Notes - Can report issues */}
        <NotesSection
          notes={notes}
          canAddNotes={true}
          onAddNote={handleReportIssue}
          mode="reportIssue"
          placeholder="Report an issue..."
        />

        {/* Order Updates Timeline */}
        <OrderUpdatesTimeline
          delivery={delivery}
          deliveryStatus={deliveryStatus}
          paymentStatus={delivery.paymentStatus}
        />
      </ScrollView>

      {/* Staff-limited Status Modal */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleHideStatusModal}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            { opacity: statusOverlayAnimation, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
          ]}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: appTheme.colors.background,
                transform: [
                  {
                    translateY: statusContentAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [500, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Delivery Status</Text>
              <TouchableOpacity onPress={handleHideStatusModal}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View>
              {staffStatusOptions.map((status, index) => (
                <TouchableOpacity
                  key={status.id}
                  style={[
                    styles.modalItem,
                    index === staffStatusOptions.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={async () => {
                    const result = await actions.updateStatus(status.value as DeliveryStatus);
                    if (result) {
                      setDeliveryStatus(status.value as DeliveryStatus);
                    }
                    handleHideStatusModal();
                  }}
                >
                  <View style={[styles.modalItemIconContainer, { backgroundColor: status.color }]}>
                    <Icon name={status.icon as any} size={24} color="white" />
                  </View>
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemName}>{status.name}</Text>
                    {status.value === deliveryStatus && (
                      <Text style={styles.modalItemDetails}>Current Status</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

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
  quickActionsSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  quickActionButton: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'InterCustom-SemiBold',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
    fontFamily: 'InterCustom-Medium',
  },
  modalItemDetails: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'InterCustom-Regular',
  },
});

export default DeliveryDetailStaffView;
