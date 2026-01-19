import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  Linking,
  Platform,
  Button,
  FlatList,
  Dimensions,
  PanResponder,
  Animated,
  Easing,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute, ParamListBase, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import ListItemCard from '@/shared/components/ui/ListItemCard';
import AssignStaffModal from '@/features/team/components/AssignStaffModal';
import Pill from '@/shared/components/ui/Pill';
import theme from '@/shared/theme';
import mockDeliveries, { 
  Delivery, 
  DeliveryStatus, 
  PaymentStatus, 
  DeliveryItem,
  Staff,
  TransportMode,
  mockStaff,
  mockTransportModes 
} from '@/shared/data/mockDeliveries';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useBusinessStore } from '@/shared/store/businessStore';
import { useProfileStore } from '@/shared/store/profileStore';

// Types for route params
type DeliveryDetailScreenParams = {
  DeliveryDetail: {
    deliveryId: string;
  };
};

// Update the mockTransportModes data to include specific vehicles
export const mockTransports = [
  { id: 'T001', name: 'Truck 1234 AB 2025', icon: 'truck', type: 'Truck' },
  { id: 'T002', name: 'Van 5678 CD 2025', icon: 'car-sport', type: 'Van' },
  { id: 'T003', name: 'Lorry 2341 ZS 2025', icon: 'bus', type: 'Lorry' },
  { id: 'T004', name: 'Bike 001', icon: 'bicycle', type: 'Bike' },
  { id: 'T005', name: 'Walk-in Pickup', icon: 'walk', type: 'Walk-in' },
];

const DeliveryDetailScreen = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<DeliveryDetailScreenParams, 'DeliveryDetail'>>();
  const deliveryId = route.params?.deliveryId;
  const { setDeliveriesUnreadCount, markItemAsViewed } = useNotifications();
  
  // Business store for locations
  const { locations, currentLocation, setLocation } = useBusinessStore();
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  
  // Find delivery from mock data
  const delivery = mockDeliveries.find(d => d.id === deliveryId) || mockDeliveries[0];
  
  // State for delivery management
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>(delivery.items || []);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(
    delivery.assignedStaffId 
      ? mockStaff.find(s => s.id === delivery.assignedStaffId) || null 
      : null
  );
  
  // Enhanced staff selection state
  interface SelectedStaffMember {
    id: string;
    name: string;
    role: string;
    avatar?: string;
    assignedRole: 'driver' | 'teamLeader' | 'staff';
  }
  const [selectedStaffList, setSelectedStaffList] = useState<SelectedStaffMember[]>([]);
  const [driverStaff, setDriverStaff] = useState<SelectedStaffMember | null>(null);
  const [teamLeaderStaff, setTeamLeaderStaff] = useState<SelectedStaffMember | null>(null);
  const [selectedTransport, setSelectedTransport] = useState<any>(
    delivery.transportMode 
      ? mockTransports.find(t => t.id === delivery.transportMode) || null 
      : null
  );
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>(delivery.deliveryStatus);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(delivery.paymentStatus);
  const [expectedDeliveryTime, setExpectedDeliveryTime] = useState<Date>(new Date(delivery.expectedDeliveryDateTime));
  const [distributorNotes, setDistributorNotes] = useState<string>(delivery.distributorNotes || '');
  const [clientNotes, setClientNotes] = useState<string>(delivery.clientNotes || '');
  // Location/Warehouse selector using businessStore
  const safeLocations = Array.isArray(locations) ? locations : [];
  const hasSingleLocation = safeLocations.length === 1;
  const primaryLocation = safeLocations.find(loc => (loc as any).is_primary) || safeLocations[0];
  const selectedWarehouse = currentLocation || (hasSingleLocation ? primaryLocation : null);
  
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [warehouseOverlayAnimation] = useState(new Animated.Value(0));
  const [warehouseContentAnimation] = useState(new Animated.Value(0));
  
  // Auto-select primary location when there's only one
  useEffect(() => {
    if (hasSingleLocation && primaryLocation && !currentLocation) {
      setLocation(primaryLocation);
    }
  }, [hasSingleLocation, primaryLocation?.id]);
  
  // State for modals
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [showOrderStatusModal, setShowOrderStatusModal] = useState(false);
  const [showPaymentStatusModal, setShowPaymentStatusModal] = useState(false);
  
  // State for scheduling
  const [isSchedulingModalVisible, setIsSchedulingModalVisible] = useState(false);
  const [schedulingDate, setSchedulingDate] = useState(() => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.round(minutes / 5) * 5;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
    now.setMilliseconds(0);
    return now;
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [visibleMonths, setVisibleMonths] = useState<Date[]>([]);
  
  const scrollX = useRef(new Animated.Value(0)).current;
  const monthScrollRef = useRef<FlatList>(null);
  // const screenWidth = Dimensions.get('window').width; // Using local declarations instead
  
  // State for modal animation
  const [orderStatusOverlayAnimation] = useState(new Animated.Value(0));
  const [orderStatusContentAnimation] = useState(new Animated.Value(0));
  const [paymentStatusOverlayAnimation] = useState(new Animated.Value(0));
  const [paymentStatusContentAnimation] = useState(new Animated.Value(0));
  const [transportOverlayAnimation] = useState(new Animated.Value(0));
  const [transportContentAnimation] = useState(new Animated.Value(0));
  
  // Add a new state variable for scheduling modal animation
  const [schedulingOverlayAnimation] = useState(new Animated.Value(0));
  const [schedulingContentAnimation] = useState(new Animated.Value(0));
  
  // State for more options bottom sheet
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  
  // Initialize visible months when modal opens
  useEffect(() => {
    if (isSchedulingModalVisible) {
      const today = new Date();
      const initialMonths = [];
      
      // Create array of months (previous, current, next)
      for (let i = -12; i <= 12; i++) {
        const month = new Date(today);
        month.setMonth(today.getMonth() + i);
        month.setDate(1); // Set to first day of month
        initialMonths.push(month);
      }
      
      setVisibleMonths(initialMonths);
      
      // Scroll to current month (in the middle of the array)
      setTimeout(() => {
        monthScrollRef.current?.scrollToIndex({
          index: 12,
          animated: false,
          viewPosition: 0.5 // Center the item
        });
      }, 100);
    }
  }, [isSchedulingModalVisible]);
  
  // Check if user is admin
  const isUserAdmin = true;

  // Helper function to format dates
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (date: Date) => {
    return `${formatDate(date)} at ${formatTime(date)}`;
  };

  // Handle delivery status change
  const handleDeliveryStatusChange = () => {
    if (deliveryStatus === 'pending') {
      setDeliveryStatus('ongoing');
      Alert.alert('Delivery Status Updated', 'Delivery status changed to Ongoing.');
    } else if (deliveryStatus === 'ongoing') {
      setDeliveryStatus('delivered');
      // Send notification to client
      Alert.alert('Delivery Status Updated', 'Delivery status changed to Delivered. Client has been notified to confirm delivery.');
    }
  };

  // Handle payment status change
  const handlePaymentStatusChange = () => {
    if (paymentStatus === 'Unpaid') {
      setPaymentStatus('Pending Confirmation');
      Alert.alert('Payment Status Updated', 'Payment status changed to Pending Confirmation.');
    } else if (paymentStatus === 'Pending Confirmation') {
      setPaymentStatus('Paid');
      Alert.alert('Payment Status Updated', 'Payment status changed to Paid.');
    }
  };

  // Handle reschedule delivery
  const handleRescheduleDelivery = (selectedDate: Date) => {
    setExpectedDeliveryTime(selectedDate);
    // Send notification to client
    Alert.alert('Delivery Rescheduled', `Delivery has been rescheduled to ${formatDateTime(selectedDate)}. Client has been notified.`);
  };
  
  // Show scheduling modal with animation
  const openSchedulingModal = () => {
    setSchedulingDate(new Date(expectedDeliveryTime));
    setIsSchedulingModalVisible(true);
    animateOverlayIn(schedulingOverlayAnimation);
    animateContentIn(schedulingContentAnimation);
  };
  
  // Close scheduling modal with animation
  const closeSchedulingModal = () => {
    animateOverlayOut(schedulingOverlayAnimation);
    animateContentOut(schedulingContentAnimation, () => setIsSchedulingModalVisible(false));
  };
  
  // Save scheduled date and time
  const saveScheduledDateTime = () => {
    handleRescheduleDelivery(schedulingDate);
    closeSchedulingModal();
  };
  
  // Add or subtract days from the scheduling date
  const adjustDays = (days: number) => {
    const newDate = new Date(schedulingDate);
    newDate.setDate(newDate.getDate() + days);
    setSchedulingDate(newDate);
  };
  
  // Add or subtract hours from the scheduling date
  const adjustHours = (hours: number) => {
    const newDate = new Date(schedulingDate);
    newDate.setHours(newDate.getHours() + hours);
    setSchedulingDate(newDate);
  };
  
  // Add or subtract minutes from the scheduling date in 5-minute increments
  const adjustMinutes = (minutes: number) => {
    const newDate = new Date(schedulingDate);
    const currentMinutes = newDate.getMinutes();
    
    // Calculate the new minutes value
    let newMinutes = currentMinutes + minutes;
    
    // Round to nearest 5-minute interval
    newMinutes = Math.round(newMinutes / 5) * 5;
    
    // Handle overflow/underflow
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
  
  // Format date for display in the modal
  const formatSchedulingDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  };
  
  // Format time for display in the modal
  const formatSchedulingTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle assign staff
  const handleAssignStaff = (staff: Staff) => {
    setSelectedStaff(staff);
    setShowStaffModal(false);
    // Send notification to staff
    Alert.alert('Staff Assigned', `${staff.name} has been assigned to delivery ${delivery.id}. A notification has been sent to their device.`);
  };

  const getStaffDisplayText = () => {
    if (selectedStaffList.length === 0) {
      return selectedStaff ? selectedStaff.name : 'Assign Staff';
    }
    
    if (teamLeaderStaff) {
      const staffCount = selectedStaffList.length;
      return `${teamLeaderStaff.name} and ${staffCount - 1} staff${staffCount > 2 ? 's' : ''}`;
    } else if (driverStaff) {
      const staffCount = selectedStaffList.length;
      return staffCount === 1 ? driverStaff.name : `${driverStaff.name} and ${staffCount - 1} staff${staffCount > 2 ? 's' : ''}`;
    } else {
      const staffCount = selectedStaffList.length;
      return `${staffCount} staff member${staffCount > 1 ? 's' : ''} selected`;
    }
  };

  // Handle select transport
  const handleSelectTransport = (transport: any) => {
    setSelectedTransport(transport);
    setShowTransportModal(false);
    // Send notification to client
    Alert.alert('Transport Selected', `${transport.name} has been selected for delivery ${delivery.id}. Client has been notified of the transport mode.`);
  };

  // Handle item loaded toggle
  const handleItemLoadedToggle = (itemId: string) => {
    setDeliveryItems(items => 
      items.map(item => 
        item.id === itemId ? { ...item, isLoaded: !item.isLoaded } : item
      )
    );
  };

  // Handle item status change
  const handleItemStatusChange = (itemId: string, status: DeliveryItem['status']) => {
    setDeliveryItems(items => 
      items.map(item => 
        item.id === itemId ? { ...item, status } : item
      )
    );
    Alert.alert('Item Status Updated', `Item status changed to ${status}.`);
  };

  // Contact client methods removed - client section is now clickable to go to profile

  // Get color for delivery status
  const getDeliveryStatusColor = (status: DeliveryStatus) => {
    switch (status.toLowerCase()) {
      case 'new order': return '#FF3B30'; // Same as notification badge color
      case 'pending': return theme.colors.info;
      case 'ongoing': return theme.colors.warning;
      case 'delivered': return theme.colors.success;
      case 'canceled': return theme.colors.error;
      default: return '#6B7280';
    }
  };

  // Get color for payment status
  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status.toLowerCase()) {
      case 'paid': return theme.colors.success;
      case 'unpaid': return theme.colors.error;
      case 'pending confirmation': return theme.colors.warning;
      default: return '#6B7280';
    }
  };

  const [searchTransport, setSearchTransport] = useState('');
  
  // Filter transports based on search
  const filteredTransports = mockTransports.filter(transport => 
    transport.name.toLowerCase().includes(searchTransport.toLowerCase()) ||
    transport.type.toLowerCase().includes(searchTransport.toLowerCase())
  );

  // Animation constants for consistent speeds
  const ANIMATION_DURATION = 300;
  const ANIMATION_EASING = Easing.inOut(Easing.cubic);

  // Animate overlay fade in/out
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

  // Animate content slide up/down
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

  // Show transport modal with animation
  const handleShowTransportModal = () => {
    setShowTransportModal(true);
    animateOverlayIn(transportOverlayAnimation);
    animateContentIn(transportContentAnimation);
  };

  // Hide transport modal with animation
  const handleHideTransportModal = () => {
    animateOverlayOut(transportOverlayAnimation);
    animateContentOut(transportContentAnimation, () => setShowTransportModal(false));
  };

  // Show staff modal
  const handleShowStaffModal = () => {
    setShowStaffModal(true);
  };

  // Show order status modal with animation
  const handleShowOrderStatusModal = () => {
    setShowOrderStatusModal(true);
    animateOverlayIn(orderStatusOverlayAnimation);
    animateContentIn(orderStatusContentAnimation);
  };

  // Hide order status modal with animation
  const handleHideOrderStatusModal = () => {
    animateOverlayOut(orderStatusOverlayAnimation);
    animateContentOut(orderStatusContentAnimation, () => setShowOrderStatusModal(false));
  };

  // Show payment status modal with animation
  const handleShowPaymentStatusModal = () => {
    setShowPaymentStatusModal(true);
    animateOverlayIn(paymentStatusOverlayAnimation);
    animateContentIn(paymentStatusContentAnimation);
  };

  // Hide payment status modal with animation
  const handleHidePaymentStatusModal = () => {
    animateOverlayOut(paymentStatusOverlayAnimation);
    animateContentOut(paymentStatusContentAnimation, () => setShowPaymentStatusModal(false));
  };

  // Order Status Selection Modal
  const renderOrderStatusModal = () => {
    // Define order status options
    // Values match DeliveryStatus type: 'new' | 'pending' | 'ongoing' | 'delivered' | 'canceled'
    const orderStatusOptions = [
      { id: 'new', name: 'New', value: 'new', icon: 'add-circle-outline', color: '#FF3B30' },
      { id: 'pending', name: 'Pending', value: 'pending', icon: 'time-outline', color: theme.colors.info },
      { id: 'ongoing', name: 'Ongoing', value: 'ongoing', icon: 'bicycle-outline', color: theme.colors.warning },
      { id: 'delivered', name: 'Delivered', value: 'delivered', icon: 'checkmark-circle-outline', color: theme.colors.success },
      { id: 'canceled', name: 'Canceled', value: 'canceled', icon: 'close-circle-outline', color: theme.colors.error }
    ];
    
    return (
      <Modal
        visible={showOrderStatusModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleHideOrderStatusModal}
      >
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              opacity: orderStatusOverlayAnimation,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }
          ]}
        >
          <Animated.View 
            style={[
              styles.modalContent,
              {
                transform: [{
                  translateY: orderStatusContentAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [500, 0]
                  })
                }],
                maxHeight: 'auto',
                paddingBottom: 0
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Order Status</Text>
              <TouchableOpacity onPress={handleHideOrderStatusModal}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.orderStatusList}>
              {orderStatusOptions.map((status, index) => (
                <TouchableOpacity 
                  key={status.id} 
                  style={[
                    styles.modalItem,
                    index === orderStatusOptions.length - 1 && { borderBottomWidth: 0 }
                  ]}
                  onPress={() => {
                    setDeliveryStatus(status.value as DeliveryStatus);
                    handleHideOrderStatusModal();
                  }}
                >
                  <View style={[styles.modalItemIconContainer, { backgroundColor: status.color }]}>
                    <Icon name={status.icon as any} size={24} color="white" />
                  </View>
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemName}>{status.name}</Text>
                    <Text style={styles.modalItemDetails}>
                      {status.value === deliveryStatus ? 'Current Status' : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  };

  // Payment Status Selection Modal
  const renderPaymentStatusModal = () => {
    // Define payment status options
    const paymentStatusOptions = [
      { id: 'unpaid', name: 'Unpaid', value: 'Unpaid', icon: 'alert-circle-outline', color: theme.colors.error },
      { id: 'pending', name: 'Pending Confirmation', value: 'Pending Confirmation', icon: 'hourglass-outline', color: theme.colors.warning },
      { id: 'paid', name: 'Paid', value: 'Paid', icon: 'checkmark-done-outline', color: theme.colors.success }
    ];
    
    return (
      <Modal
        visible={showPaymentStatusModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleHidePaymentStatusModal}
      >
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              opacity: paymentStatusOverlayAnimation,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }
          ]}
        >
          <Animated.View 
            style={[
              styles.modalContent,
              {
                transform: [{
                  translateY: paymentStatusContentAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [500, 0]
                  })
                }],
                maxHeight: 'auto',
                paddingBottom: 0
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Payment Status</Text>
              <TouchableOpacity onPress={handleHidePaymentStatusModal}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.paymentStatusList}>
              {paymentStatusOptions.map((status, index) => (
                <TouchableOpacity 
                  key={status.id} 
                  style={[
                    styles.modalItem,
                    index === paymentStatusOptions.length - 1 && { borderBottomWidth: 0 }
                  ]}
                  onPress={() => {
                    setPaymentStatus(status.value as PaymentStatus);
                    handleHidePaymentStatusModal();
                  }}
                >
                  <View style={[styles.modalItemIconContainer, { backgroundColor: status.color }]}>
                    <Icon name={status.icon as any} size={24} color="white" />
                  </View>
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemName}>{status.name}</Text>
                    <Text style={styles.modalItemDetails}>
                      {status.value === paymentStatus ? 'Current Status' : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  };

  // Function to navigate to client's profile
  const navigateToClientProfile = () => {
    // Determine if it's a business or user profile
    const isBusinessClient = true; // This would be determined by your data model
    
    if (isBusinessClient) {
      navigation.navigate('ViewBusinessProfile', { businessId: delivery.clientId || '1' });
    } else {
      navigation.navigate('ViewUserProfile', { userId: delivery.clientId || '1' });
    }
  };

  // Format month for calendar header
  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };
  
  // Generate calendar days for a specific month
  const generateCalendarDays = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    
    // Get first day of month and how many days in month
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Get day of week of first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayWeekday = firstDayOfMonth.getDay();
    
    // Create array for calendar grid
    const days = [];
    
    // Add days from previous month to fill the first row
    if (firstDayWeekday > 0) {
      // Get the last day of the previous month
      const prevMonth = new Date(year, month, 0);
      const prevMonthDays = prevMonth.getDate();
      
      // Add days from previous month in reverse to match the calendar
      for (let i = 0; i < firstDayWeekday; i++) {
        const day = prevMonthDays - i;
        const date = new Date(year, month - 1, day);
        days.unshift({
          day,
          date,
          isCurrentMonth: false
        });
      }
      
      // Reverse the array to get correct order
      days.reverse();
    }
    
    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = isDateToday(date);
      const isSelected = isSameDay(date, schedulingDate);
      
      days.push({ 
        day, 
        date, 
        isCurrentMonth: true,
        isToday,
        isSelected
      });
    }
    
    // Fill in the rest of the calendar grid (to make sure we have complete rows)
    const totalCells = Math.ceil((firstDayWeekday + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (firstDayWeekday + daysInMonth);
    
    for (let i = 1; i <= remainingCells; i++) {
      // Get the actual date from next month
      const nextMonthDate = new Date(year, month + 1, i);
      days.push({ 
        day: nextMonthDate.getDate(), 
        date: new Date(nextMonthDate),
        isCurrentMonth: false
      });
    }
    
    return days;
  };
  
  // Check if a date is today
  const isDateToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };
  
  // Check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };
  
  // Render a single month calendar
  const renderMonthCalendar = ({ item }: { item: Date }) => {
    const monthName = item.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const days = generateCalendarDays(item);
    
    // Group days into weeks for better alignment
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    
    // Calculate item width (screen width)
    const itemWidth = Dimensions.get('window').width;
    
    return (
      <View style={{ 
        width: itemWidth, 
        alignItems: 'center', 
        justifyContent: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 4
      }}>
        <Text style={styles.calendarMonthTitle}>{monthName}</Text>
        
        {/* Weekday Headers */}
        <View style={styles.calendarWeekdayRow}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <Text key={index} style={styles.calendarWeekdayText}>
              {day}
            </Text>
          ))}
        </View>
        
        {/* Calendar Grid - Organized by weeks */}
        <View style={[styles.calendarGrid, { paddingVertical: 4 }]}>
          {weeks.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.calendarWeek}>
              {week.map((item, dayIndex) => (
                <TouchableOpacity
                  key={`day-${weekIndex}-${dayIndex}`}
                  style={[
                    styles.calendarDay,
                    item.isToday && styles.calendarDayToday,
                    item.isSelected && styles.calendarDaySelected,
                    !item.isCurrentMonth && styles.calendarDayDisabled
                  ]}
                  disabled={!item.isCurrentMonth}
                  onPress={() => item.isCurrentMonth && selectDate(item.date)}
                >
                  <Text style={[
                    styles.calendarDayText,
                    item.isToday && styles.calendarDayTodayText,
                    item.isSelected && styles.calendarDaySelectedText,
                    !item.isCurrentMonth && styles.calendarDayDisabledText
                  ]}>
                    {item.day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>
    );
  };
  
  // Handle scroll event to update current month
  const handleScrollEnd = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const screenWidth = Dimensions.get('window').width;
    const index = Math.round(contentOffsetX / screenWidth);
    
    if (index >= 0 && index < visibleMonths.length) {
      setSelectedMonth(visibleMonths[index]);
    }
  };
  
  // Extract a key for the FlatList
  const keyExtractor = (item: Date, index: number) => `month-${item.getMonth()}-${item.getFullYear()}-${index}`;

  // Select a date from calendar
  const selectDate = (date: Date | null) => {
    if (!date) return;
    
    // Create new date with selected date but keep current time
    const newDate = new Date(schedulingDate);
    newDate.setFullYear(date.getFullYear());
    newDate.setMonth(date.getMonth());
    newDate.setDate(date.getDate());
    
    setSchedulingDate(newDate);
  };

  // Transport Selection Modal
  const renderTransportModal = () => (
    <Modal
      visible={showTransportModal}
      transparent={true}
      animationType="none"
      onRequestClose={handleHideTransportModal}
    >
      <Animated.View 
        style={[
          styles.modalContainer,
          {
            opacity: transportOverlayAnimation,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.modalContent,
            {
              transform: [{
                translateY: transportContentAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [500, 0]
                })
              }]
            }
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
            {searchTransport.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTransport('')}>
                <Icon name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
          
          <ScrollView style={styles.modalScrollView}>
            {filteredTransports.map(transport => (
              <TouchableOpacity 
                key={transport.id} 
                style={styles.modalItem}
                onPress={() => {
                  handleSelectTransport(transport);
                  handleHideTransportModal();
                  setSearchTransport('');
                }}
              >
                <View style={styles.modalItemIconContainer}>
                  <Icon name={transport.icon as any} size={24} color="#6B7280" />
                </View>
                <View style={styles.modalItemInfo}>
                  <Text style={styles.modalItemName}>{transport.name}</Text>
                  <Text style={styles.modalItemDetails}>{transport.type}</Text>
                </View>
              </TouchableOpacity>
            ))}
            
            {filteredTransports.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No transport found matching "{searchTransport}"</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );

  // Filter warehouses based on search (using businessStore locations)
  const [searchWarehouse, setSearchWarehouse] = useState('');
  const filteredWarehouses = safeLocations.filter(location => 
    location.name.toLowerCase().includes(searchWarehouse.toLowerCase()) ||
    (location.address && location.address.toLowerCase().includes(searchWarehouse.toLowerCase()))
  );
  
  // Show warehouse modal with animation
  const handleShowWarehouseModal = () => {
    if (hasSingleLocation) return; // Don't show modal if only one location
    setShowWarehouseModal(true);
    animateOverlayIn(warehouseOverlayAnimation);
    animateContentIn(warehouseContentAnimation);
  };

  // Hide warehouse modal with animation
  const handleHideWarehouseModal = () => {
    animateOverlayOut(warehouseOverlayAnimation);
    animateContentOut(warehouseContentAnimation, () => setShowWarehouseModal(false));
  };

  // Handle warehouse selection - update global location in store
  const handleSelectWarehouse = (location: typeof safeLocations[0]) => {
    setLocation(location);
    handleHideWarehouseModal();
  };

  const renderWarehouseModal = () => (
    <Modal
      visible={showWarehouseModal}
      transparent={true}
      animationType="none"
      onRequestClose={handleHideWarehouseModal}
    >
      <Animated.View 
        style={[
          styles.modalContainer,
          {
            opacity: warehouseOverlayAnimation,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.modalContent,
            {
              transform: [{
                translateY: warehouseContentAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [500, 0]
                })
              }]
            }
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Warehouse</Text>
            <TouchableOpacity onPress={handleHideWarehouseModal}>
              <Icon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search warehouse..."
              value={searchWarehouse}
              onChangeText={setSearchWarehouse}
            />
            {searchWarehouse.length > 0 && (
              <TouchableOpacity onPress={() => setSearchWarehouse('')}>
                <Icon name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
          
          <ScrollView style={styles.modalScrollView}>
            {filteredWarehouses.map(location => (
              <TouchableOpacity 
                key={location.id} 
                style={[
                  styles.modalItem,
                  selectedWarehouse?.id === location.id && { backgroundColor: `${theme.colors.primary}10` }
                ]}
                onPress={() => {
                  handleSelectWarehouse(location);
                  setSearchWarehouse('');
                }}
              >
                <View style={styles.modalItemIconContainer}>
                  <Icon name="location" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.modalItemInfo}>
                  <Text style={styles.modalItemName}>{location.name}</Text>
                  {location.address && (
                    <Text style={styles.modalItemDetails}>{location.address}</Text>
                  )}
                </View>
                {selectedWarehouse?.id === location.id && (
                  <Icon name="checkmark-circle" size={24} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            
            {filteredWarehouses.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No warehouse found matching "{searchWarehouse}"</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );

  const [isOrderDetailsExpanded, setIsOrderDetailsExpanded] = useState(true);
  const orderDetailsHeight = useRef(new Animated.Value(1)).current;
  
  // Notes state for collapsible cards
  const [noteText, setNoteText] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  
  // Mock order notes data
  const orderNotes = React.useMemo(() => [
    {
      id: 'note-1',
      businessName: delivery.clientCompanyName || 'Client Business',
      businessAvatar: delivery.clientCompanyName?.charAt(0).toUpperCase() || 'C',
      message: clientNotes || 'Please deliver before noon. No substitutions please.',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      id: 'note-2',
      businessName: activeBusiness?.name || 'Your Business',
      businessAvatar: activeBusiness?.name?.charAt(0).toUpperCase() || 'Y',
      message: distributorNotes || 'Repeat customer, VIP treatment.',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3600000), // 2 days ago + 1 hour
    },
  ], [delivery.clientCompanyName, activeBusiness?.name, clientNotes, distributorNotes]);

  // Toggle note expansion
  const toggleNoteExpansion = (noteId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  // Group notes by date
  const groupedNotes = React.useMemo(() => {
    const groups: { [key: string]: typeof orderNotes } = {};
    orderNotes.forEach(note => {
      // Format as DD.MM.YY
      const day = note.timestamp.getDate().toString().padStart(2, '0');
      const month = (note.timestamp.getMonth() + 1).toString().padStart(2, '0');
      const year = note.timestamp.getFullYear().toString().slice(-2);
      const dateKey = `${day}.${month}.${year}`;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(note);
    });
    return Object.entries(groups).sort((a, b) => 
      new Date(b[1][0].timestamp).getTime() - new Date(a[1][0].timestamp).getTime()
    );
  }, [orderNotes]);

  // Handle send note
  const handleSendNote = () => {
    if (!noteText.trim()) return;
    Alert.alert('Note Sent', 'Your note has been sent.');
    setNoteText('');
  };

  // Format time for notes (lowercase am/pm)
  const formatNoteTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes}${period}`;
  };

  // Mock order updates/timeline data - only show completed and current steps
  const orderUpdates = React.useMemo(() => {
    const baseUpdates = [
      {
        id: 'update-1',
        status: 'Order Confirmed',
        timestamp: new Date(delivery.orderTime),
        completed: true,
      },
      {
        id: 'update-2',
        status: 'Payment Received',
        timestamp: paymentStatus === 'Paid' || paymentStatus === 'Pending Confirmation' 
          ? new Date(new Date(delivery.orderTime).getTime() + 3600000) 
          : null,
        completed: paymentStatus === 'Paid',
      },
      {
        id: 'update-3',
        status: 'Transport Loading',
        timestamp: deliveryStatus === 'ongoing' || deliveryStatus === 'delivered' 
          ? new Date(Date.now() - 12 * 60 * 60 * 1000) 
          : null,
        completed: deliveryStatus === 'delivered',
      },
      {
        id: 'update-4',
        status: 'Transport Loading Completed',
        timestamp: deliveryStatus === 'delivered' 
          ? new Date(Date.now() - 6 * 60 * 60 * 1000) 
          : null,
        completed: deliveryStatus === 'delivered',
      },
      {
        id: 'update-5',
        status: 'Out for Delivery',
        timestamp: deliveryStatus === 'delivered' 
          ? new Date(Date.now() - 3 * 60 * 60 * 1000) 
          : null,
        completed: deliveryStatus === 'delivered',
      },
      {
        id: 'update-6',
        status: 'Awaiting Delivery Confirmation',
        timestamp: deliveryStatus === 'delivered' 
          ? new Date(Date.now() - 1 * 60 * 60 * 1000) 
          : null,
        completed: deliveryStatus === 'delivered',
      },
    ];

    // Find current step
    let currentStepId: string | null = null;
    for (const update of baseUpdates) {
      if (!update.completed && update.timestamp) {
        currentStepId = update.id;
        break;
      }
    }

    // Only return updates that have timestamps (completed or current)
    return baseUpdates
      .filter(update => update.timestamp !== null)
      .map(update => ({
        ...update,
        isCurrent: update.id === currentStepId,
      }));
  }, [delivery.orderTime, paymentStatus, deliveryStatus]);

  // Format date and time for order updates (DD.MM.YY HH:MMam/pm)
  const formatUpdateDateTime = (date: Date | null) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    return `${day}.${month}.${year} ${displayHours}:${minutes}${period}`;
  };

  // Enable LayoutAnimation for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    }
  }, []);

  // Animate the order details section
  useEffect(() => {
    const config = {
      duration: 300,
      update: {
        duration: 300,
        property: LayoutAnimation.Properties.opacity,
        type: LayoutAnimation.Types.easeInEaseOut
      },
      delete: {
        duration: 200,
        property: LayoutAnimation.Properties.opacity,
        type: LayoutAnimation.Types.easeInEaseOut
      }
    };

    LayoutAnimation.configureNext(config);

    Animated.timing(orderDetailsHeight, {
      toValue: isOrderDetailsExpanded ? 1 : 0,
      duration: 300,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false
    }).start();
  }, [isOrderDetailsExpanded]);

  // Mark this specific delivery as viewed when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      // Mark the delivery as viewed (removes light blue background)
      markItemAsViewed(deliveryId);
      console.log(`Marked delivery ${deliveryId} as viewed`);
    }, [deliveryId, markItemAsViewed])
  );

  // More options menu items
  const moreOptionsItems = [
    {
      id: 'share',
      title: 'Share',
      description: 'Share delivery details',
      icon: 'share',
    },
    {
      id: 'delete',
      title: 'Delete',
      description: 'Delete this delivery',
      icon: 'trash-2',
    },
  ];

  const handleMoreOptionSelect = (item: { id: string }) => {
    if (item.id === 'share') {
      // Handle share action
      Alert.alert('Share', `Share delivery ${delivery.id}`);
    } else if (item.id === 'delete') {
      // Handle delete action with confirmation
      Alert.alert(
        'Delete Delivery',
        `Are you sure you want to delete delivery ${delivery.id}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              // Handle delete logic here
              Alert.alert('Deleted', 'Delivery has been deleted');
              navigation.goBack();
            },
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SecondaryHeader
        title={delivery.id}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        rightActions={[{ icon: 'ellipsis-vertical', onPress: () => setShowMoreOptions(true) }]}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Client Information */}
        <View style={styles.clientContainer}>
          <View style={styles.clientHeader}>
            <TouchableOpacity onPress={navigateToClientProfile}>
              {delivery.clientCompanyLogo ? (
                <Image source={{ uri: delivery.clientCompanyLogo }} style={styles.clientLogo} />
              ) : (
                <View style={styles.clientLogoPlaceholder}>
                  <Icon name="business-outline" size={24} color="#4B5563" />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.clientInfo}>
              <TouchableOpacity onPress={navigateToClientProfile}>
                <Text style={styles.clientName}>
                  {delivery.clientCompanyName}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  // Open Google Maps with the address
                  const encodedAddress = encodeURIComponent(delivery.clientAddress);
                  const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
                  Linking.openURL(url);
                }}
                style={styles.addressContainer}
              >
                <Text style={styles.clientAddress}>{delivery.clientAddress}</Text>
              </TouchableOpacity>
            </View>
          </View>
          

        </View>
        
        {/* Order Details */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity 
            style={styles.sectionHeaderToggle}
            onPress={() => setIsOrderDetailsExpanded(!isOrderDetailsExpanded)}
          >
            <Text style={styles.sectionTitle}>Order Details</Text>
            <Icon 
              name={isOrderDetailsExpanded ? "chevron-up" : "chevron-down"} 
              size={24} 
              color="#6B7280" 
            />
          </TouchableOpacity>
          
          <Animated.View style={{
            overflow: 'hidden',
            maxHeight: orderDetailsHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1000] // Large enough to fit all content
            }),
            opacity: orderDetailsHeight
          }}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Ordered on:</Text>
              <Text style={styles.simpleInfoText}>{formatDateTime(new Date(delivery.orderTime))}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Scheduled for:</Text>
              <View style={styles.customFieldContainer}>
                <TouchableOpacity 
                  onPress={openSchedulingModal}
                  style={styles.customField}
                  activeOpacity={0.7}
                >
                  <Text style={styles.customFieldText}>
                    {formatDateTime(expectedDeliveryTime)}
                  </Text>
                  <Icon name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Transport Mode */}
            {isUserAdmin && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Transport:</Text>
                <View style={styles.customFieldContainer}>
                  <TouchableOpacity 
                    onPress={handleShowTransportModal}
                    style={styles.customField}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.customFieldText}>
                      {selectedTransport ? selectedTransport.name : "Select transport"}
                    </Text>
                    <Icon name="chevron-down" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Staff Selector */}
            {isUserAdmin && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Assigned to:</Text>
                <View style={styles.customFieldContainer}>
                  <TouchableOpacity 
                    onPress={handleShowStaffModal}
                    style={styles.customField}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.customFieldText}>
                      {getStaffDisplayText()}
                    </Text>
                    <Icon name="chevron-down" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Order status:</Text>
              <TouchableOpacity 
                style={[styles.fullWidthButton, { backgroundColor: getDeliveryStatusColor(deliveryStatus) }]} 
                onPress={handleShowOrderStatusModal}
              >
                <Text style={styles.fullWidthButtonText}>{deliveryStatus}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Payment status:</Text>
              <TouchableOpacity 
                style={[styles.fullWidthButton, { backgroundColor: getPaymentStatusColor(paymentStatus) }]} 
                onPress={handleShowPaymentStatusModal}
              >
                <Text style={styles.fullWidthButtonText}>{paymentStatus}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
        
        {/* 4. Product List */}
        <View style={styles.productListContainer}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginBottom: 16 }]}>Product List</Text>

          {/* Warehouse Selector - Using businessStore locations */}
          {isUserAdmin && safeLocations.length > 0 && (
            <View style={[styles.infoItem, { paddingHorizontal: 16, marginBottom: 16 }]}>
              <Text style={styles.infoLabel}>Warehouse:</Text>
              <View style={styles.customFieldContainer}>
                <TouchableOpacity 
                  onPress={handleShowWarehouseModal}
                  style={styles.customField}
                  activeOpacity={hasSingleLocation ? 1 : 0.7}
                  disabled={hasSingleLocation}
                >
                  <Text style={styles.customFieldText}>
                    {selectedWarehouse?.name || 'Select warehouse'}
                  </Text>
                  {!hasSingleLocation && (
                    <Icon name="chevron-down" size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* Product List Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: 32, textAlign: 'center' }]}>#</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'left' }]}>Products</Text>
            <Text style={[styles.tableHeaderCell, { width: 140, paddingHorizontal: 8, textAlign: 'center' }]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, { width: 60, textAlign: 'center' }]}>Loaded</Text>
            <View style={{ width: 32 }} />
          </View>
          
          {/* Product Items */}
          {deliveryItems.map((item, index) => {
            const warehouseName = selectedWarehouse?.name || 'Warehouse A';
            const availableStock = item.warehouseStock?.[warehouseName] || 0;
            const hasStockWarning = isUserAdmin && item.warehouseStock && availableStock < item.quantityOrdered;
            
            return (
              <View key={item.id} style={styles.tableRowContainer}>
                {/* Main row */}
                <View style={styles.tableRow}>
                  <Text style={[
                    styles.tableCell, 
                    { 
                      width: 32,
                      textAlign: 'center',
                      textAlignVertical: 'center',
                      lineHeight: 48
                    }
                  ]}>{index + 1}</Text>
                  
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <View style={styles.productInfoContainer}>
                      <Image source={{ uri: item.image }} style={styles.productImage} />
                      <View style={styles.productInfo}>
                        <Text style={styles.productName}>
                          {item.name.replace(/ x\d+$/, '').split(' ').slice(0, -1).join(' ')}
                        </Text>
                        <Text style={[styles.unitInfo, { marginTop: 2 }]}>
                          {item.name.replace(/ x\d+$/, '').split(' ').slice(-1)[0]}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={[
                    styles.tableCell, 
                    { 
                      width: 140,
                      paddingHorizontal: 8,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }
                  ]}>
                    <Text style={[
                      styles.qtyText,
                      item.quantityOrdered.toString().length > 5 && { fontSize: 14 }
                    ]}>
                      {item.quantityOrdered}
                    </Text>
                    {hasStockWarning && (
                      <Text style={[styles.stockWarning, { marginTop: 4 }]}>
                        {availableStock === 0 ? '0 left' : `Only ${availableStock} left`}
                      </Text>
                    )}
                  </View>
                  
                  <View style={[
                    styles.tableCell, 
                    { 
                      width: 60,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }
                  ]}>
                    <TouchableOpacity 
                      style={styles.checkboxContainerSmall}
                      onPress={() => handleItemLoadedToggle(item.id)}
                    >
                      {item.isLoaded ? (
                        <View style={styles.checkboxCheckedSmall}>
                          <Icon name="checkmark" size={20} color="white" />
                        </View>
                      ) : (
                        <View style={styles.checkboxUncheckedSmall} />
                      )}
                    </TouchableOpacity>
                  </View>
                  
                  <View style={[styles.tableCell, { width: 20, alignItems: 'center', marginRight: 12 }]}>
                    <TouchableOpacity 
                      onPress={() => {
                        Alert.alert(
                          'Update Item Status',
                          'Select new status:',
                          [
                            { text: 'Available', onPress: () => handleItemStatusChange(item.id, 'Available') },
                            { text: 'In Stock', onPress: () => handleItemStatusChange(item.id, 'In Stock') },
                            { text: 'Out of Stock', onPress: () => handleItemStatusChange(item.id, 'Out of Stock') },
                            { text: 'In Production', onPress: () => handleItemStatusChange(item.id, 'In Production') },
                            { text: 'Discontinued', onPress: () => handleItemStatusChange(item.id, 'Discontinued') },
                            { text: 'Cancel', style: 'cancel' }
                          ]
                        );
                      }}
                    >
                      <Icon name="ellipsis-vertical" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>
                
              </View>
            );
          })}
        </View>
        
        {/* 6. Notes Section - Collapsible Cards */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Notes</Text>
          
          {/* Notes List */}
          {groupedNotes.map(([dateKey, notes]) => (
            <View key={dateKey} style={styles.notesDateGroup}>
              <Text style={styles.notesDateHeader}>{dateKey}</Text>
              {notes.map((note, noteIndex) => (
                <TouchableOpacity
                  key={note.id}
                  style={[
                    styles.noteCard,
                    noteIndex === notes.length - 1 && { borderBottomWidth: 0 }
                  ]}
                  onPress={() => toggleNoteExpansion(note.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.noteCardHeader}>
                    <View style={styles.noteCardHeaderLeft}>
                      <View style={styles.noteAvatar}>
                        <Text style={styles.noteAvatarText}>{note.businessAvatar}</Text>
                      </View>
                      <Text style={styles.noteBusinessName}>{note.businessName}</Text>
                    </View>
                    <View style={styles.noteCardHeaderRight}>
                      <Text style={styles.noteTime}>{formatNoteTime(note.timestamp)}</Text>
                      <Icon 
                        name={expandedNotes.has(note.id) ? 'chevron-up' : 'chevron-down'} 
                        size={16} 
                        color="#6B7280" 
                      />
                    </View>
                  </View>
                  {expandedNotes.has(note.id) && (
                    <Text style={styles.noteContent}>{note.message}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
          
          {/* Note Input */}
          <View style={styles.noteInputContainer}>
            <TextInput
              style={styles.noteInput}
              placeholder="Leave a note"
              placeholderTextColor={theme.colors.textSecondary}
              value={noteText}
              onChangeText={setNoteText}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendNoteButton,
                !noteText.trim() && styles.sendNoteButtonDisabled
              ]}
              onPress={handleSendNote}
              disabled={!noteText.trim()}
            >
              <Text style={[
                styles.sendNoteButtonText,
                !noteText.trim() && styles.sendNoteButtonTextDisabled
              ]}>Send note</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 7. Order Updates Timeline */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Order Updates</Text>
          <View style={styles.timelineContainer}>
            {orderUpdates.map((update, index) => (
              <View key={update.id} style={styles.timelineItem}>
                <View style={styles.timelineIconColumn}>
                  {update.completed ? (
                    <View style={styles.timelineIconCompleted}>
                      <Icon name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  ) : update.isCurrent ? (
                    <View style={styles.timelineIconCurrent}>
                      <Icon name="more-horizontal" size={14} color="#FFFFFF" />
                    </View>
                  ) : (
                    <View style={styles.timelineIconPending} />
                  )}
                  {index < orderUpdates.length - 1 && (
                    <View 
                      style={[
                        styles.timelineLine, 
                        { backgroundColor: update.completed ? '#22C55E' : '#E5E7EB' }
                      ]} 
                    />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  {update.timestamp && (
                    <Text style={styles.timelineDate}>
                      {formatUpdateDateTime(update.timestamp)}
                    </Text>
                  )}
                  <Text 
                    style={[
                      styles.timelineStatus, 
                      { color: update.completed || update.isCurrent ? '#111827' : '#9CA3AF' }
                    ]}
                  >
                    {update.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      
      {/* Modals */}
      <AssignStaffModal
        visible={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        staff={mockStaff}
        selectedStaff={selectedStaffList}
        onConfirm={(selected) => {
          setSelectedStaffList(selected as SelectedStaffMember[]);
          const driver = selected.find(s => s.assignedRole === 'driver');
          const teamLeader = selected.find(s => s.assignedRole === 'teamLeader');
          setDriverStaff(driver as SelectedStaffMember || null);
          setTeamLeaderStaff(teamLeader as SelectedStaffMember || null);
        }}
        title="Assign Staff"
      />
      {renderTransportModal()}
      {renderOrderStatusModal()}
      {renderPaymentStatusModal()}
      {renderWarehouseModal()}
      
      {/* Custom Scheduling Modal */}
      <Modal
        visible={isSchedulingModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeSchedulingModal}
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            {
              opacity: schedulingOverlayAnimation,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }
          ]}
        >
          <Animated.View 
            style={[
              styles.schedulingModalContent,
              {
                transform: [{
                  translateY: schedulingContentAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [500, 0]
                  })
                }]
              }
            ]}
          >
            <View style={styles.schedulingModalHeader}>
              <Text style={styles.schedulingModalTitle}>Reschedule Delivery</Text>
              <TouchableOpacity onPress={closeSchedulingModal}>
                <Icon name="close-outline" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            {/* Time Title Section */}
            <View style={styles.schedulingTimeTitleSection}>
              <Text style={styles.schedulingSectionTitle}>Time</Text>
            </View>
            
            {/* Time Selection - At the top */}
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
            
            {/* Date Title Section */}
            <View style={styles.schedulingDateTitleSection}>
              <Text style={styles.schedulingSectionTitle}>Date</Text>
            </View>
            
            {/* Calendar Selection - Swipeable at the bottom */}
            <View style={styles.schedulingCalendarSection}>
              {/* Horizontal scrolling calendar */}
              <View style={styles.calendarContainer}>
                <FlatList
                  ref={monthScrollRef}
                  data={visibleMonths}
                  renderItem={renderMonthCalendar}
                  keyExtractor={keyExtractor}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={handleScrollEnd}
                  initialNumToRender={3}
                  maxToRenderPerBatch={3}
                  windowSize={5}
                  getItemLayout={(data, index) => {
                    const screenWidth = Dimensions.get('window').width;
                    return {
                      length: screenWidth,
                      offset: screenWidth * index,
                      index,
                    };
                  }}
                  snapToInterval={Dimensions.get('window').width}
                  snapToAlignment="center"
                  decelerationRate="fast"
                  contentContainerStyle={{ 
                    alignItems: 'center', 
                    justifyContent: 'flex-start'
                  }}
                />
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
      >
        {moreOptionsItems.map((item, index) => (
          <ListItemCard
            key={item.id}
            avatar={{
              type: 'icon',
              icon: item.icon,
              iconColor: theme.colors.text,
              backgroundColor: theme.colors.surface,
            }}
            title={item.title}
            subtitle={item.description}
            onPress={() => {
              handleMoreOptionSelect(item);
              setShowMoreOptions(false);
            }}
            showDivider={index < moreOptionsItems.length - 1}
          />
        ))}
      </AppBottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20, // Reduced padding since we removed the bottom bar
  },
  clientContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  clientLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  clientLogoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontFamily: 'Inter-bold', 
    color: theme.colors.primary,
    marginBottom: 4,
  },
  clientAddress: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: 'Inter-mei',
  },

  sectionContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  productListContainer: {
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionHeaderToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40, // Fixed height to ensure consistent spacing
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter-SemiBold',
  },
  infoItem: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#374151',
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    marginLeft: 8,
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  datePickerButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  assignmentLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 120,
  },
  assignmentSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    height: 48,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedItemText: {
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  smallAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  warehouseSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warehouseSelectorLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  warehouseSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
  },
  warehouseSelectorText: {
    fontSize: 12,
    color: '#111827',
    marginRight: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 0,
    paddingLeft: 4,
    height: 48,
    alignItems: 'center'
  },
  tableHeaderCell: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: 'Inter-semibold',
    paddingHorizontal: 4,
    textAlign: 'center'
  },
  tableRowContainer: {
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderColor,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingLeft: 4,
  },
  tableCell: {
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  productInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 48,
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginRight: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontFamily: 'Inter-semiBold',
    color: theme.colors.text,
  },
  unitInfo: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: 'Inter-medium',
  },
  stockInfo: {
    fontSize: 12,
    color: '#6B7280',
  },
  stockWarning: {
    fontSize: 14,
    fontFamily: 'Inter-semibold',
    color: theme.colors.error,
  },
  qtyText: {
    fontSize: 18,
    fontFamily: 'Inter-semibold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  // Unified checkbox styles - use these throughout the app
  // Default size (32x32)
  checkboxContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxUnchecked: {
    width: 32,
    height: 32,
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    width: 32,
    height: 32,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Small size (24x24)
  checkboxContainerSmall: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxUncheckedSmall: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCheckedSmall: {
    width: 24,
    height: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  notesBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 16,
  },
  notesText: {
    fontSize: 14,
    color: '#111827',
  },
  notesInput: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
    fontFamily: 'Inter-Regular',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '90%',
    overflow: 'visible',
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
    fontFamily: 'Inter-SemiBold',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalItemAvatar: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 12,
  },
  modalItemAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    fontFamily: 'Inter-Medium',
  },
  modalItemDetails: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 6,
  },
  roleButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  roleButtonDriver: {
    backgroundColor: theme.colors.success,
  },
  roleButtonLeader: {
    backgroundColor: theme.colors.warning,
  },
  schedulePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 48,
  },
  dateText: {
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Inter-Regular',
  },
  simpleInfoText: {
    fontSize: 16,
    color: '#111827',
    marginTop: 4,
    fontFamily: 'Inter-Regular',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  schedulingModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '90%',
    overflow: 'visible',
  },
  schedulingModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  schedulingModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter-SemiBold',
  },
  schedulingSection: {
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: 'red',
  },
  schedulingTimeTitleSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
    backgroundColor: 'none',
  },
  schedulingTimeSection: {
    paddingTop: 0,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: 'none',
  },
  schedulingDateTitleSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  schedulingCalendarSection: {
    backgroundColor: 'transparent',
    paddingBottom: 16,
  },
  schedulingSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 0,
    fontFamily: 'Inter-SemiBold',
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
    color: '#111827',
    marginVertical: 8,
    fontFamily: 'Inter-Medium',
  },
  schedulingTimeSeparator: {
    fontSize: 24,
    fontWeight: '500',
    color: '#111827',
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
    backgroundColor: '#F3F4F6',
  },
  schedulingConfirmButton: {
    backgroundColor: theme.colors.primary,
  },
  schedulingCancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Inter-Medium',
  },
  schedulingConfirmButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    fontFamily: 'Inter-Medium',
  },
  // Calendar Styles
  calendarContainer: {
    height: 340,
    justifyContent: 'flex-start',
    overflow: 'visible',
    backgroundColor: 'transparent'
  },
  calendarMonthTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: 'Inter-SemiBold',
  },
  calendarWeekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
    width: '100%'
  },
  calendarWeekdayText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    width: 40,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  calendarGrid: {
    flexDirection: 'column',
    width: '100%'
  },
  calendarWeek: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
    width: '100%'
  },
  calendarDay: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  calendarDayToday: {
    backgroundColor: '#F3F4F6',
  },
  calendarDayTodayText: {
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  calendarDaySelected: {
    backgroundColor: theme.colors.primary,
  },
  calendarDaySelectedText: {
    color: 'white',
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  calendarDayDisabled: {
    opacity: 0.3,
    backgroundColor: '#F3F4F6'
  },
  calendarDayDisabledText: {
    color: '#9CA3AF',
  },
  fullWidthButton: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    marginTop: 8,
  },
  fullWidthButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    textTransform: 'capitalize',
  },
  paymentStatusList: {
  },
  orderStatusList: {
  },
  customFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    height: 48, // Fixed height
    overflow: 'hidden',
  },
  customField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    paddingHorizontal: 12,
    height: '100%',
  },
  customFieldText: {
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Inter-Medium',
    flex: 1,
    marginRight: 12,
  },
  // Enhanced staff selection styles
  staffScrollView: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 0,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 16,
  },
  // Staff checkbox uses unified checkbox styles with additional margin
  staffCheckboxContainer: {
    width: 32,
    height: 32,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Note: staffCheckboxUnchecked and staffCheckboxChecked now use the unified
  // checkboxUnchecked and checkboxChecked styles defined above
  roleAssignmentContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    marginTop: 0,
    gap: 8,
    backgroundColor: 'transparent',
  },
  roleAssignmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  driverAssignmentButton: {
    backgroundColor: '#0500FF',
  },
  teamLeaderAssignmentButton: {
    backgroundColor: theme.colors.warning,
  },
  roleButtonActive: {
    backgroundColor: '#000000',
  },
  driverButtonActive: {
    backgroundColor: '#0500FF',
  },
  teamLeaderButtonActive: {
    backgroundColor: theme.colors.warning,
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
    opacity: 0.5,
  },
  dimmedButton: {
    opacity: 0.5,
  },
  driverSelectedBackground: {
    backgroundColor: '#0500FF1A', // 10% opacity of #0500FF
  },
  teamLeaderSelectedBackground: {
    backgroundColor: '#F59E0B1A', // 10% opacity of warning color
  },
  roleIcon: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  confirmButtonContainer: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#000000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  confirmButton: {
    backgroundColor: 'white',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  // Staff modal specific styles
  staffModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: 0,
  },
  staffModalContent: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 100,
    paddingBottom: 0,
    overflow: 'visible',
  },
  // Notes section styles
  notesDateGroup: {
    marginBottom: 0,
  },
  notesDateHeader: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  noteCard: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#E5E7EB',
    borderRadius: 0,
    paddingVertical: 12,
    paddingHorizontal: 0,
    marginBottom: 0,
    backgroundColor: '#FFFFFF',
  },
  noteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  noteAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  noteAvatarText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  noteBusinessName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    flex: 1,
  },
  noteCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteTime: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
  },
  noteContent: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    lineHeight: 20,
    color: '#111827',
    marginTop: 12,
  },
  noteInputContainer: {
    marginTop: 16,
    gap: 12,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    backgroundColor: '#F9FAFB',
    textAlignVertical: 'top',
  },
  sendNoteButton: {
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  sendNoteButtonDisabled: {
    backgroundColor: theme.colors.buttonBackgroundDisabled,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendNoteButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  sendNoteButtonTextDisabled: {
    color: theme.colors.textSecondary,
  },
  // Timeline styles
  timelineContainer: {
    paddingLeft: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 56,
  },
  timelineIconColumn: {
    alignItems: 'center',
    width: 24,
    marginRight: 12,
  },
  timelineIconCompleted: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineIconCurrent: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineIconPending: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: 'transparent',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 0,
    marginBottom: 0,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
    paddingTop: 2,
  },
  timelineDate: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  timelineStatus: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});

export default DeliveryDetailScreen; 