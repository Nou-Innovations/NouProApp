/**
 * DeliveryDetailSupplierView
 * 
 * View for the business that received/is fulfilling the order (Case 2).
 * Full operational control over the delivery.
 * 
 * Permissions:
 * - View order: Yes
 * - Edit schedule/transport/staff/status/payment: Yes
 * - Warehouse selector: Yes
 * - Stock warnings: Yes
 * - Toggle loaded: Yes
 * - Item status menu: Yes
 * - Add notes: Yes
 * - Accept/Reject: If delivery is Draft
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Animated, Easing, FlatList, Dimensions, Platform } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppBottomSheet, { AppBottomSheetItem } from '@/shared/components/ui/AppBottomSheet';
import AppButton from '@/shared/components/ui/AppButton';
import AssignStaffModal from '@/shared/components/ui/AssignStaffModal';
import PaywallModal from '@/shared/components/ui/PaywallModal';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  DeliveryStatusTimeline,
} from '../../components/detail';
import { useDeliveryActions } from '../../hooks/useDeliveryActions';
import { shareDeliveryNote } from '../../deliveryNote';
import ReportIssueModal from '@/features/issues/components/ReportIssueModal';

import { getTransports } from '@/features/transports/transports.service';
import type { Transport } from '@/shared/types/transport';
import { getVehicleIcon } from '@/shared/types/transport';

interface DeliveryDetailSupplierViewProps {
  delivery: Delivery;
  /** If true, shows Accept/Reject for incoming request */
  requireAccept?: boolean;
  /** Callback when order is accepted */
  onAccept?: () => void;
  /** Callback when order is rejected */
  onReject?: () => void;
}

interface SelectedStaffMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  assignedRole: 'driver' | 'teamLeader' | 'support';
}

export function DeliveryDetailSupplierView({
  delivery,
  requireAccept = false,
  onAccept,
  onReject,
}: DeliveryDetailSupplierViewProps) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const currentLocation = useBusinessStore((state) => state.currentLocation);
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
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [showOrderStatusModal, setShowOrderStatusModal] = useState(false);
  const [showPaymentStatusModal, setShowPaymentStatusModal] = useState(false);
  const [isSchedulingModalVisible, setIsSchedulingModalVisible] = useState(false);
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
  const [schedulingOverlayAnimation] = useState(new Animated.Value(0));
  const [schedulingContentAnimation] = useState(new Animated.Value(0));

  // Scheduling state
  const [schedulingDate, setSchedulingDate] = useState(() => {
    const date = new Date(delivery.expectedDeliveryDateTime);
    const minutes = date.getMinutes();
    const roundedMinutes = Math.round(minutes / 5) * 5;
    date.setMinutes(roundedMinutes);
    return date;
  });
  // Native date picker visibility for full date+time scheduling
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Apply a newly-picked calendar date while preserving the chosen time-of-day
  const onDatePickerChange = (event: { type?: string }, selected?: Date) => {
    // Android shows a dialog — close it on any result
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event?.type === 'dismissed' || !selected) return;
    const newDate = new Date(schedulingDate);
    newDate.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    setSchedulingDate(newDate);
  };

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

  // Navigate to client profile
  const navigateToClientProfile = () => {
    if (!delivery.clientId) return;
    navigation.navigate('ViewBusinessProfile', { businessId: delivery.clientId });
  };

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

  // Handle accept order
  const handleAccept = async () => {
    const result = await actions.updateStatus('Scheduled');
    if (result) {
      setDeliveryStatus('Scheduled');
      if (onAccept) {
        onAccept();
      } else {
        AppAlert.alert('Order Accepted', 'The order has been accepted.');
      }
    }
  };

  // Handle reject order
  const handleReject = () => {
    AppAlert.alert(
      'Reject Order',
      'Are you sure you want to reject this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            const result = await actions.updateStatus('Canceled');
            if (result) {
              setDeliveryStatus('Canceled');
              if (onReject) {
                onReject();
              } else {
                AppAlert.alert('Order Rejected', 'The order has been rejected.');
              }
            }
          },
        },
      ]
    );
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

  // Scheduling modal handlers
  const openSchedulingModal = () => {
    setSchedulingDate(new Date(expectedDeliveryTime));
    setShowDatePicker(false);
    setIsSchedulingModalVisible(true);
    animateOverlayIn(schedulingOverlayAnimation);
    animateContentIn(schedulingContentAnimation);
  };

  const closeSchedulingModal = () => {
    animateOverlayOut(schedulingOverlayAnimation);
    animateContentOut(schedulingContentAnimation, () => setIsSchedulingModalVisible(false));
  };

  const saveScheduledDateTime = async () => {
    const result = await actions.updateSchedule(schedulingDate);
    if (result) {
      setExpectedDeliveryTime(schedulingDate);
      closeSchedulingModal();
      AppAlert.alert('Delivery Rescheduled', `Delivery has been rescheduled. Client has been notified.`);
    }
  };

  // Time adjustment functions
  const adjustHours = (hours: number) => {
    const newDate = new Date(schedulingDate);
    newDate.setHours(newDate.getHours() + hours);
    setSchedulingDate(newDate);
  };

  const adjustMinutes = (minutes: number) => {
    const newDate = new Date(schedulingDate);
    const currentMinutes = newDate.getMinutes();
    let newMinutes = currentMinutes + minutes;
    newMinutes = Math.round(newMinutes / 5) * 5;
    if (newMinutes >= 60) {
      newMinutes = 0;
      newDate.setHours(newDate.getHours() + 1);
    } else if (newMinutes < 0) {
      newMinutes = 55;
      newDate.setHours(newDate.getHours() - 1);
    }
    newDate.setMinutes(newMinutes);
    setSchedulingDate(newDate);
  };

  // More options menu
  const moreOptionsItems: AppBottomSheetItem[] = [
    { id: 'delivery_note', title: 'Delivery note (PDF)' },
    { id: 'report_issue', title: 'Report an issue' },
    { id: 'delete', title: 'Delete', variant: 'destructive' },
  ];

  const handleMoreOptionSelect = (item: { id: string }) => {
    if (item.id === 'delivery_note') {
      setShowMoreOptions(false);
      shareDeliveryNote(delivery, {
        businessName: activeBusiness?.name,
        currencySymbol: activeBusiness?.settings?.currency || '$',
      }).catch(() => AppAlert.alert('Error', 'Could not generate the delivery note.'));
    } else if (item.id === 'report_issue') {
      setShowMoreOptions(false);
      setShowReportIssue(true);
    } else if (item.id === 'delete') {
      AppAlert.alert(
        'Delete Delivery',
        `Are you sure you want to delete delivery ${delivery.id}?`,
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
    { id: 'Draft', name: 'Draft', value: 'Draft', icon: 'add-circle-outline', color: theme.colors.error },
    { id: 'Scheduled', name: 'Scheduled', value: 'Scheduled', icon: 'person-outline', color: theme.colors.warning },
    { id: 'Ready', name: 'Ready', value: 'Ready', icon: 'cube-outline', color: theme.colors.info },
    { id: 'InTransit', name: 'In transit', value: 'InTransit', icon: 'bicycle-outline', color: theme.colors.info },
    { id: 'Delivered', name: 'Delivered', value: 'Delivered', icon: 'checkmark-circle-outline', color: theme.colors.success },
    { id: 'Issue', name: 'Issue', value: 'Issue', icon: 'alert-circle-outline', color: theme.colors.error },
    { id: 'Canceled', name: 'Canceled', value: 'Canceled', icon: 'close-circle-outline', color: theme.colors.neutral },
  ];

  const paymentStatusOptions = [
    { id: 'UNPAID', name: 'Unpaid', value: 'UNPAID', icon: 'alert-circle-outline', color: theme.colors.error },
    { id: 'PENDING_CONFIRMATION', name: 'Pending Confirmation', value: 'PENDING_CONFIRMATION', icon: 'hourglass-outline', color: theme.colors.warning },
    { id: 'PAID', name: 'Paid', value: 'PAID', icon: 'checkmark-done-outline', color: theme.colors.success },
  ];

  // Determine if acceptance is needed
  const showAcceptance = requireAccept || delivery.deliveryStatus === 'Draft';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title={delivery.id}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        rightActions={[{ icon: 'ellipsis-vertical', onPress: () => setShowMoreOptions(true) }]}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Accept/Reject for incoming requests */}
        {showAcceptance && deliveryStatus === 'Draft' && (
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

        {/* Client Information */}
        <PartyHeaderCard
          logoUri={delivery.clientCompanyLogo}
          name={delivery.clientCompanyName}
          address={delivery.clientAddress}
          onPressProfile={navigateToClientProfile}
        />

        {/* Order Details - Full control */}
        <OrderDetailsSection
          delivery={delivery}
          deliveryStatus={deliveryStatus}
          paymentStatus={paymentStatus}
          expectedDeliveryTime={expectedDeliveryTime}
          transportDisplay={selectedTransport?.name}
          staffDisplay={getStaffDisplayText()}
          canEditSchedule
          canEditTransport
          canEditAssignedStaff
          canEditStatus
          canEditPayment
          onOpenScheduleModal={openSchedulingModal}
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
          showWarehouseSelector
          showStockWarnings
          canToggleLoaded
          showItemStatusMenu
          onItemLoadedToggle={handleItemLoadedToggle}
          onItemStatusChange={handleItemStatusChange}
        />

        {/* Notes */}
        <NotesSection
          notes={notes}
          canAddNotes
          onAddNote={handleSendNote}
        />

        {/* Order Updates Timeline */}
        <OrderUpdatesTimeline
          delivery={delivery}
          deliveryStatus={deliveryStatus}
          paymentStatus={paymentStatus}
        />

        <DeliveryStatusTimeline
          companyId={delivery.businessId}
          deliveryId={delivery.id}
          refreshKey={deliveryStatus}
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
        transparent
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
                <Icon name="close" size={24} color={appTheme.colors.iconColor} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color={appTheme.colors.iconColor} />
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
                    <Icon name={getVehicleIcon(transport.vehicle_type) as any} size={24} color={appTheme.colors.iconColor} />
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
        transparent
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
              <Text style={styles.modalTitle}>Change Order Status</Text>
              <TouchableOpacity onPress={handleHideOrderStatusModal}>
                <Icon name="close" size={24} color={appTheme.colors.iconColor} />
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
        transparent
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
                <Icon name="close" size={24} color={appTheme.colors.iconColor} />
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

      {/* Scheduling Modal */}
      <Modal
        visible={isSchedulingModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeSchedulingModal}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            { opacity: schedulingOverlayAnimation, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
          ]}
        >
          <Animated.View
            style={[
              styles.schedulingModalContent,
              {
                backgroundColor: appTheme.colors.background,
                transform: [
                  {
                    translateY: schedulingContentAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [500, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reschedule Delivery</Text>
              <TouchableOpacity onPress={closeSchedulingModal}>
                <Icon name="close-outline" size={24} color={appTheme.colors.iconColor} />
              </TouchableOpacity>
            </View>

            {/* Date Section */}
            <View style={styles.schedulingTimeTitleSection}>
              <Text style={styles.schedulingSectionTitle}>Date</Text>
            </View>
            <TouchableOpacity
              style={styles.schedulingDateRow}
              onPress={() => setShowDatePicker((v) => !v)}
            >
              <Icon name="calendar-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.schedulingDateText}>
                {schedulingDate.toLocaleDateString(undefined, {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
              <Icon name="chevron-forward" size={18} color={appTheme.colors.textMuted} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={schedulingDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                onChange={onDatePickerChange}
              />
            )}

            {/* Time Section */}
            <View style={styles.schedulingTimeTitleSection}>
              <Text style={styles.schedulingSectionTitle}>Time</Text>
            </View>
            <View style={styles.schedulingTimeSection}>
              <View style={styles.schedulingTimeContainer}>
                {/* Hours */}
                <View style={styles.schedulingTimeColumn}>
                  <TouchableOpacity
                    style={styles.schedulingAdjustButton}
                    onPress={() => adjustHours(1)}
                  >
                    <Icon name="chevron-up" size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.schedulingTimeValue}>
                    {schedulingDate.getHours() > 12
                      ? schedulingDate.getHours() - 12
                      : schedulingDate.getHours() === 0
                      ? 12
                      : schedulingDate.getHours()}
                  </Text>
                  <TouchableOpacity
                    style={styles.schedulingAdjustButton}
                    onPress={() => adjustHours(-1)}
                  >
                    <Icon name="chevron-down" size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.schedulingTimeSeparator}>:</Text>

                {/* Minutes */}
                <View style={styles.schedulingTimeColumn}>
                  <TouchableOpacity
                    style={styles.schedulingAdjustButton}
                    onPress={() => adjustMinutes(5)}
                  >
                    <Icon name="chevron-up" size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.schedulingTimeValue}>
                    {schedulingDate.getMinutes().toString().padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={styles.schedulingAdjustButton}
                    onPress={() => adjustMinutes(-5)}
                  >
                    <Icon name="chevron-down" size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* AM/PM */}
                <View style={styles.schedulingTimeColumn}>
                  <TouchableOpacity
                    style={styles.schedulingAdjustButton}
                    onPress={() => {
                      const newDate = new Date(schedulingDate);
                      if (newDate.getHours() < 12) {
                        newDate.setHours(newDate.getHours() + 12);
                      } else {
                        newDate.setHours(newDate.getHours() - 12);
                      }
                      setSchedulingDate(newDate);
                    }}
                  >
                    <Icon name="chevron-up" size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.schedulingTimeValue}>
                    {schedulingDate.getHours() >= 12 ? 'PM' : 'AM'}
                  </Text>
                  <TouchableOpacity
                    style={styles.schedulingAdjustButton}
                    onPress={() => {
                      const newDate = new Date(schedulingDate);
                      if (newDate.getHours() < 12) {
                        newDate.setHours(newDate.getHours() + 12);
                      } else {
                        newDate.setHours(newDate.getHours() - 12);
                      }
                      setSchedulingDate(newDate);
                    }}
                  >
                    <Icon name="chevron-down" size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.schedulingActions}>
              <TouchableOpacity
                style={[styles.schedulingActionButton, styles.schedulingCancelButton]}
                onPress={closeSchedulingModal}
              >
                <Text style={styles.schedulingCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.schedulingActionButton, styles.schedulingConfirmButton]}
                onPress={saveScheduledDateTime}
              >
                <Text style={styles.schedulingConfirmButtonText}>Confirm</Text>
              </TouchableOpacity>
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

      <ReportIssueModal
        visible={showReportIssue}
        onClose={() => setShowReportIssue(false)}
        entityType="delivery"
        entityId={delivery.id}
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
    borderBottomColor: '#ECE6DF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1917',
    fontFamily: 'InterCustom-SemiBold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ECE6DF',
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
    borderBottomColor: '#ECE6DF',
  },
  modalItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FAF8F5',
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
    color: '#1C1917',
    marginBottom: 4,
    fontFamily: 'InterCustom-Medium',
  },
  modalItemDetails: {
    fontSize: 14,
    color: '#57534E',
    fontFamily: 'InterCustom-Regular',
  },
  schedulingModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '90%',
  },
  schedulingTimeTitleSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
  },
  schedulingTimeSection: {
    paddingTop: 0,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE6DF',
  },
  schedulingDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ECE6DF',
  },
  schedulingDateText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1917',
  },
  schedulingSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1917',
    marginBottom: 0,
    fontFamily: 'InterCustom-SemiBold',
  },
  schedulingTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  schedulingTimeColumn: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  schedulingTimeValue: {
    fontSize: 24,
    fontWeight: '500',
    color: '#1C1917',
    marginVertical: 8,
    fontFamily: 'InterCustom-Medium',
  },
  schedulingTimeSeparator: {
    fontSize: 24,
    fontWeight: '500',
    color: '#1C1917',
  },
  schedulingAdjustButton: {
    padding: 8,
    borderRadius: 8,
  },
  schedulingActions: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  schedulingActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  schedulingCancelButton: {
    backgroundColor: '#F4F0EB',
  },
  schedulingConfirmButton: {
    backgroundColor: theme.colors.primary,
  },
  schedulingCancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1917',
    fontFamily: 'InterCustom-Medium',
  },
  schedulingConfirmButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    fontFamily: 'InterCustom-Medium',
  },
});

export default DeliveryDetailSupplierView;
