/**
 * DeliveryDetailSelfView
 * 
 * View for manually created orders for self-delivery (Case 3).
 * Similar to SupplierView but without the "other business" concepts.
 * Shows destination instead of client.
 * 
 * Permissions:
 * - View order: Yes
 * - Edit schedule/transport/staff/status/payment: Yes
 * - Warehouse selector: Yes
 * - Stock warnings: Yes
 * - Toggle loaded: Yes
 * - Item status menu: Yes
 * - Add notes: Yes
 * - Accept/Reject: No
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppBottomSheet, { AppBottomSheetItem } from '@/shared/components/ui/AppBottomSheet';
import AssignStaffModal from '@/features/team/components/AssignStaffModal';
import PaywallModal from '@/features/subscription/components/PaywallModal';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { Delivery, DeliveryStatus, PaymentStatus, DeliveryItem, Staff } from '@/shared/types/delivery';
import { getTeamMembers } from '@/features/team/team.service';
import { useProfileStore } from '@/shared/store/profileStore';
import { useBusinessStore } from '@/shared/store/businessStore';
import { checkPaywall, PaywallCheck } from '@/shared/utils/permissions';

import {
  PartyHeaderCard,
  OrderDetailsSection,
  ProductListSection,
  NotesSection,
  OrderUpdatesTimeline,
} from '../../components/detail';
import { useDeliveryActions } from '../../hooks/useDeliveryActions';

import { getTransports } from '@/features/transports/transports.service';
import type { Transport } from '@/shared/types/transport';
import { getVehicleIcon } from '@/shared/types/transport';

interface DeliveryDetailSelfViewProps {
  delivery: Delivery;
}

interface SelectedStaffMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  assignedRole: 'driver' | 'teamLeader' | 'support';
}

export function DeliveryDetailSelfView({ delivery }: DeliveryDetailSelfViewProps) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const { currentLocation } = useBusinessStore();
  const actions = useDeliveryActions(delivery.id);

  // Animation constants
  const ANIMATION_DURATION = 300;
  const ANIMATION_EASING = Easing.inOut(Easing.cubic);

  // State for delivery management
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>(delivery.items || []);
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>(delivery.deliveryStatus);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(delivery.paymentStatus);
  const [expectedDeliveryTime, setExpectedDeliveryTime] = useState<Date>(
    new Date(delivery.expectedDeliveryDateTime)
  );
  const [selectedTransport, setSelectedTransport] = useState<Transport | null>(null);
  const [selectedStaffList, setSelectedStaffList] = useState<SelectedStaffMember[]>([]);
  const selectedStaffListRef = useRef<SelectedStaffMember[]>([]);
  const [driverStaff, setDriverStaff] = useState<SelectedStaffMember | null>(null);
  const [teamLeaderStaff, setTeamLeaderStaff] = useState<SelectedStaffMember | null>(null);

  // Keep ref in sync with state (avoids stale closures in callbacks)
  useEffect(() => {
    selectedStaffListRef.current = selectedStaffList;
  }, [selectedStaffList]);

  // Transport data from API
  const [transportList, setTransportList] = useState<Transport[]>([]);
  useEffect(() => {
    const companyId = activeBusiness?.id;
    if (!companyId) return;
    getTransports(companyId).then(setTransportList).catch(() => {});
  }, [activeBusiness?.id]);

  // Resolve selectedTransport once transportList loads
  useEffect(() => {
    if (delivery.transportMode && transportList.length > 0) {
      const found = transportList.find(t => t.id === delivery.transportMode);
      if (found) setSelectedTransport(found);
    }
  }, [delivery.transportMode, transportList]);

  // Staff data from API (falls back to mock)
  const [staffList, setStaffList] = useState<Staff[]>([]);
  useEffect(() => {
    const companyId = activeBusiness?.id;
    if (!companyId) return;
    getTeamMembers(companyId, 'accepted').then(members => {
      setStaffList(members.map(m => ({
        id: m.userId || m.id,
        name: m.name || m.userName || 'Unknown',
        role: m.role || 'staff',
        avatar: m.avatar,
      })));
    }).catch(() => {
      // Keep fallback mock staff on error
    });
  }, [activeBusiness?.id]);

  // Initialize selectedStaffList from delivery.staffAssignments
  useEffect(() => {
    if (delivery.staffAssignments && delivery.staffAssignments.length > 0) {
      const mapped: SelectedStaffMember[] = delivery.staffAssignments.map(sa => ({
        id: sa.userId,
        name: sa.user?.name || 'Unknown',
        role: sa.role,
        avatar: sa.user?.avatar,
        assignedRole: sa.role,
      }));
      setSelectedStaffList(mapped);
      const driver = mapped.find(s => s.assignedRole === 'driver');
      const teamLeader = mapped.find(s => s.assignedRole === 'teamLeader');
      setDriverStaff(driver || null);
      setTeamLeaderStaff(teamLeader || null);
    }
  }, [delivery.id, delivery.staffAssignments]);

  // Re-sync local state when the delivery prop changes (e.g., from a background store refresh)
  useEffect(() => {
    setDeliveryItems(delivery.items || []);
    setDeliveryStatus(delivery.deliveryStatus);
    setPaymentStatus(delivery.paymentStatus);
    setExpectedDeliveryTime(new Date(delivery.expectedDeliveryDateTime));
  }, [delivery.id, delivery.deliveryStatus, delivery.paymentStatus, delivery.expectedDeliveryDateTime]);

  // State for modals
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [showOrderStatusModal, setShowOrderStatusModal] = useState(false);
  const [showPaymentStatusModal, setShowPaymentStatusModal] = useState(false);
  const [searchTransport, setSearchTransport] = useState('');
  
  // Paywall state
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallCheckResult, setPaywallCheckResult] = useState<PaywallCheck | null>(null);

  // Animation values
  const [transportOverlayAnimation] = useState(new Animated.Value(0));
  const [transportContentAnimation] = useState(new Animated.Value(0));
  const [orderStatusOverlayAnimation] = useState(new Animated.Value(0));
  const [orderStatusContentAnimation] = useState(new Animated.Value(0));
  const [paymentStatusOverlayAnimation] = useState(new Animated.Value(0));
  const [paymentStatusContentAnimation] = useState(new Animated.Value(0));

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
    if (delivery.distributorNotes) {
      noteList.push({
        id: 'note-distributor',
        businessName: activeBusiness?.name || 'Your Business',
        businessAvatar: activeBusiness?.name?.charAt(0).toUpperCase() || 'Y',
        message: delivery.distributorNotes,
        timestamp: new Date(delivery.orderTime),
      });
    }
    return noteList;
  }, [delivery, activeBusiness]);

  // Staff display text
  const getStaffDisplayText = () => {
    if (selectedStaffList.length === 0) {
      return 'Assign Staff';
    }
    if (teamLeaderStaff) {
      const staffCount = selectedStaffList.length;
      return `${teamLeaderStaff.name} and ${staffCount - 1} more`;
    } else if (driverStaff) {
      const staffCount = selectedStaffList.length;
      return staffCount === 1
        ? driverStaff.name
        : `${driverStaff.name} and ${staffCount - 1} more`;
    } else {
      const staffCount = selectedStaffList.length;
      return `${staffCount} staff member${staffCount > 1 ? 's' : ''} selected`;
    }
  };

  // Handle item loaded toggle
  const handleItemLoadedToggle = (itemId: string) => {
    const updatedItems = deliveryItems.map(item =>
      item.id === itemId ? { ...item, isLoaded: !item.isLoaded } : item
    );
    setDeliveryItems(updatedItems);
    // Persist to API (fire-and-forget, errors handled by actions hook)
    actions.updateItems(updatedItems);
  };

  // Handle item status change -- persist to API
  const handleItemStatusChange = async (itemId: string, status: DeliveryItem['status']) => {
    const updatedItems = deliveryItems.map(item =>
      item.id === itemId ? { ...item, status } : item
    );
    setDeliveryItems(updatedItems);
    await actions.updateItems(updatedItems);
  };

  // Transport modal handlers
  const handleShowTransportModal = () => {
    // Check paywall for assign_transport (Free -> Pro)
    const check = checkPaywall('assign_transport', activeBusiness?.plan || null);
    if (!check.allowed) {
      setPaywallCheckResult(check);
      setShowPaywall(true);
      return;
    }
    
    setShowTransportModal(true);
    animateOverlayIn(transportOverlayAnimation);
    animateContentIn(transportContentAnimation);
  };

  const handleHideTransportModal = () => {
    animateOverlayOut(transportOverlayAnimation);
    animateContentOut(transportContentAnimation, () => setShowTransportModal(false));
  };

  const handleSelectTransport = async (transport: any) => {
    setSelectedTransport(transport);
    handleHideTransportModal();
    setSearchTransport('');
    await actions.updateTransport(transport.id);
  };

  const filteredTransports = transportList.filter(
    transport =>
      transport.name.toLowerCase().includes(searchTransport.toLowerCase()) ||
      (transport.vehicle_type || '').toLowerCase().includes(searchTransport.toLowerCase())
  );

  // Order status modal handlers
  const handleShowOrderStatusModal = () => {
    setShowOrderStatusModal(true);
    animateOverlayIn(orderStatusOverlayAnimation);
    animateContentIn(orderStatusContentAnimation);
  };

  const handleHideOrderStatusModal = () => {
    animateOverlayOut(orderStatusOverlayAnimation);
    animateContentOut(orderStatusContentAnimation, () => setShowOrderStatusModal(false));
  };

  // Payment status modal handlers
  const handleShowPaymentStatusModal = () => {
    setShowPaymentStatusModal(true);
    animateOverlayIn(paymentStatusOverlayAnimation);
    animateContentIn(paymentStatusContentAnimation);
  };

  const handleHidePaymentStatusModal = () => {
    animateOverlayOut(paymentStatusOverlayAnimation);
    animateContentOut(paymentStatusContentAnimation, () => setShowPaymentStatusModal(false));
  };

  // More options menu
  const moreOptionsItems: AppBottomSheetItem[] = [
    { id: 'share', title: 'Share' },
    { id: 'delete', title: 'Delete', variant: 'destructive' },
  ];

  const handleMoreOptionSelect = (item: { id: string }) => {
    if (item.id === 'share') {
      Alert.alert('Share', `Share transfer ${delivery.id}`);
    } else if (item.id === 'delete') {
      Alert.alert(
        'Delete Transfer',
        `Are you sure you want to delete transfer ${delivery.id}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const result = await actions.removeDelivery();
              if (result) navigation.goBack();
            },
          },
        ]
      );
    }
  };

  // Handle send note
  const handleSendNote = async (noteText: string) => {
    await actions.addNote(noteText);
  };

  // Status options
  const orderStatusOptions = [
    { id: 'NOT_ASSIGNED', name: 'Not Assigned', value: 'NOT_ASSIGNED', icon: 'add-circle-outline', color: '#FF3B30' },
    { id: 'ASSIGNED', name: 'Assigned', value: 'ASSIGNED', icon: 'person-outline', color: theme.colors.warning },
    { id: 'PACKED', name: 'Packed', value: 'PACKED', icon: 'cube-outline', color: theme.colors.info },
    { id: 'OUT_FOR_DELIVERY', name: 'Out for Delivery', value: 'OUT_FOR_DELIVERY', icon: 'bicycle-outline', color: theme.colors.info },
    { id: 'DELIVERED', name: 'Delivered', value: 'DELIVERED', icon: 'checkmark-circle-outline', color: theme.colors.success },
    { id: 'FAILED', name: 'Failed', value: 'FAILED', icon: 'alert-circle-outline', color: theme.colors.error },
    { id: 'CANCELED', name: 'Canceled', value: 'CANCELED', icon: 'close-circle-outline', color: theme.colors.neutral },
  ];

  const paymentStatusOptions = [
    { id: 'UNPAID', name: 'Unpaid', value: 'UNPAID', icon: 'alert-circle-outline', color: theme.colors.error },
    { id: 'PENDING_CONFIRMATION', name: 'Pending Confirmation', value: 'PENDING_CONFIRMATION', icon: 'hourglass-outline', color: theme.colors.warning },
    { id: 'PAID', name: 'Paid', value: 'PAID', icon: 'checkmark-done-outline', color: theme.colors.success },
  ];

  // Determine destination display for transfers
  const isTransfer = delivery.type === 'transfer';
  const destinationName = isTransfer ? delivery.toLocation || 'Destination' : delivery.clientAddress;
  const destinationAddress = isTransfer ? 'Internal Transfer' : delivery.clientAddress;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title={delivery.id}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        rightActions={[{ icon: 'ellipsis-vertical', onPress: () => setShowMoreOptions(true) }]}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Destination Information (instead of Client) */}
        <PartyHeaderCard
          logoUri={delivery.clientCompanyLogo}
          name={isTransfer ? activeBusiness?.name || 'Your Business' : delivery.clientCompanyName}
          address={destinationAddress}
          isTransfer={isTransfer}
          fromLocation={delivery.fromLocation}
          toLocation={delivery.toLocation}
        />

        {/* Order Details - Full control */}
        <OrderDetailsSection
          delivery={delivery}
          deliveryStatus={deliveryStatus}
          paymentStatus={paymentStatus}
          expectedDeliveryTime={expectedDeliveryTime}
          transportDisplay={selectedTransport?.name}
          staffDisplay={getStaffDisplayText()}
          canEditSchedule={true}
          canEditTransport={true}
          canEditAssignedStaff={true}
          canEditStatus={true}
          canEditPayment={true}
          onOpenScheduleModal={async () => {
            Alert.alert(
              'Reschedule Transfer',
              'Choose when to reschedule:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Tomorrow same time',
                  onPress: async () => {
                    const tomorrow = new Date(expectedDeliveryTime);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const result = await actions.updateSchedule(tomorrow);
                    if (result) {
                      setExpectedDeliveryTime(tomorrow);
                      Alert.alert('Rescheduled', 'Transfer rescheduled to tomorrow.');
                    }
                  },
                },
                {
                  text: '+2 hours',
                  onPress: async () => {
                    const later = new Date(expectedDeliveryTime);
                    later.setHours(later.getHours() + 2);
                    const result = await actions.updateSchedule(later);
                    if (result) {
                      setExpectedDeliveryTime(later);
                      Alert.alert('Rescheduled', 'Transfer rescheduled to 2 hours later.');
                    }
                  },
                },
              ]
            );
          }}
          onOpenTransportModal={handleShowTransportModal}
          onOpenStaffModal={() => {
            // Check paywall for staff assignment (Free -> Pro)
            const check = checkPaywall('assign_transport', activeBusiness?.plan || null);
            if (!check.allowed) {
              setPaywallCheckResult(check);
              setShowPaywall(true);
              return;
            }
            setShowStaffModal(true);
          }}
          onOpenStatusModal={handleShowOrderStatusModal}
          onOpenPaymentModal={handleShowPaymentStatusModal}
        />

        {/* Product List - Full control */}
        <ProductListSection
          items={deliveryItems}
          currentWarehouseName={currentLocation?.name || 'Warehouse A'}
          showWarehouseSelector={true}
          showStockWarnings={true}
          canToggleLoaded={true}
          showItemStatusMenu={true}
          onItemLoadedToggle={handleItemLoadedToggle}
          onItemStatusChange={handleItemStatusChange}
        />

        {/* Notes */}
        <NotesSection
          notes={notes}
          canAddNotes={true}
          onAddNote={handleSendNote}
        />

        {/* Order Updates Timeline */}
        <OrderUpdatesTimeline
          delivery={delivery}
          deliveryStatus={deliveryStatus}
          paymentStatus={paymentStatus}
        />
      </ScrollView>

      {/* Staff Modal */}
      <AssignStaffModal
        visible={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        staff={staffList}
        selectedStaff={selectedStaffList}
        onConfirm={async (selected) => {
          const newStaff = selected as SelectedStaffMember[];
          setSelectedStaffList(newStaff);
          const driver = newStaff.find(s => s.assignedRole === 'driver');
          const teamLeader = newStaff.find(s => s.assignedRole === 'teamLeader');
          setDriverStaff(driver || null);
          setTeamLeaderStaff(teamLeader || null);

          // Diff against ref (avoids stale closure on selectedStaffList)
          const prevStaff = selectedStaffListRef.current;
          const oldIds = prevStaff.map(s => s.id);
          const newIds = newStaff.map(s => s.id);
          const toRemove = oldIds.filter(id => !newIds.includes(id));
          const toAdd = newStaff.filter(s => !oldIds.includes(s.id));
          const toUpdate = newStaff.filter(s => {
            const old = prevStaff.find(o => o.id === s.id);
            return old && old.assignedRole !== s.assignedRole;
          });

          // Execute removals, additions, and role updates
          for (const id of toRemove) {
            await actions.removeStaff(id);
          }
          for (const s of toAdd) {
            await actions.addStaff(s.id, s.name, s.assignedRole || 'driver');
          }
          for (const s of toUpdate) {
            await actions.updateStaffRole(s.id, s.assignedRole || 'driver');
          }
        }}
        title="Assign Staff"
      />

      {/* Paywall Modal for Free Plan Users */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => {
          setShowPaywall(false);
          navigation.navigate('SubscriptionPlans' as never);
        }}
        requiredPlan={paywallCheckResult?.requiredPlan || 'pro'}
        modalType={paywallCheckResult?.modalType}
        title={paywallCheckResult?.title}
        description={paywallCheckResult?.description}
      />

      {/* Transport Modal */}
      <Modal
        visible={showTransportModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleHideTransportModal}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            { opacity: transportOverlayAnimation, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
          ]}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: appTheme.colors.background,
                transform: [
                  {
                    translateY: transportContentAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [500, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Transport</Text>
              <TouchableOpacity onPress={handleHideTransportModal}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color="#6B7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search transport..."
                value={searchTransport}
                onChangeText={setSearchTransport}
              />
            </View>
            <ScrollView style={styles.modalScrollView}>
              {filteredTransports.map(transport => (
                <TouchableOpacity
                  key={transport.id}
                  style={styles.modalItem}
                  onPress={() => handleSelectTransport(transport)}
                >
                  <View style={styles.modalItemIconContainer}>
                    <Icon name={getVehicleIcon(transport.vehicle_type) as any} size={24} color="#6B7280" />
                  </View>
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemName}>{transport.name}</Text>
                    <Text style={styles.modalItemDetails}>{transport.vehicle_type.charAt(0).toUpperCase() + transport.vehicle_type.slice(1)}{transport.license_plate ? ` • ${transport.license_plate}` : ''}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Order Status Modal */}
      <Modal
        visible={showOrderStatusModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleHideOrderStatusModal}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            { opacity: orderStatusOverlayAnimation, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
          ]}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: appTheme.colors.background,
                transform: [
                  {
                    translateY: orderStatusContentAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [500, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Status</Text>
              <TouchableOpacity onPress={handleHideOrderStatusModal}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View>
              {orderStatusOptions.map((status, index) => (
                <TouchableOpacity
                  key={status.id}
                  style={[
                    styles.modalItem,
                    index === orderStatusOptions.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={async () => {
                    const result = await actions.updateStatus(status.value as DeliveryStatus);
                    if (result) {
                      setDeliveryStatus(status.value as DeliveryStatus);
                    }
                    handleHideOrderStatusModal();
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

      {/* Payment Status Modal */}
      <Modal
        visible={showPaymentStatusModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleHidePaymentStatusModal}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            { opacity: paymentStatusOverlayAnimation, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
          ]}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: appTheme.colors.background,
                transform: [
                  {
                    translateY: paymentStatusContentAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [500, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Payment Status</Text>
              <TouchableOpacity onPress={handleHidePaymentStatusModal}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View>
              {paymentStatusOptions.map((status, index) => (
                <TouchableOpacity
                  key={status.id}
                  style={[
                    styles.modalItem,
                    index === paymentStatusOptions.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={async () => {
                    const result = await actions.updatePayment(status.value as PaymentStatus);
                    if (result) {
                      setPaymentStatus(status.value as PaymentStatus);
                    }
                    handleHidePaymentStatusModal();
                  }}
                >
                  <View style={[styles.modalItemIconContainer, { backgroundColor: status.color }]}>
                    <Icon name={status.icon as any} size={24} color="white" />
                  </View>
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemName}>{status.name}</Text>
                    {status.value === paymentStatus && (
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    margin: 20,
    marginVertical: 8,
  },
  searchInput: {
    flex: 1,
    padding: 8,
  },
  modalScrollView: {
    maxHeight: '70%',
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

export default DeliveryDetailSelfView;
