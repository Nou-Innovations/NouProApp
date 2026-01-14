/**
 * NotificationsScreen - Notifications Screen
 * Slides in from right, sits above tabs
 * Bottom tab bar is hidden inside this screen
 * Used for both Personal and Business modes
 * 
 * Design System: components.overlayScreens.notificationsOverlay
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import FilterBar from '@/features/search/components/FilterBar';
import { AppModal } from '@/shared/components/ui';
import AppButton from '@/shared/components/ui/AppButton';
import theme from '@/shared/theme';

// Types
interface Notification {
  id: string;
  type: 'message' | 'delivery' | 'invoice' | 'system' | 'staff_request' | 'company_request' | 'connection_accepted' | 'join_accepted';
  title: string;
  description: string;
  time: string;
  read: boolean;
  avatar: string | null;
  status?: 'pending' | 'accepted' | 'declined';
  requestData?: {
    userId?: string;
    userName?: string;
    companyId?: string;
    companyName?: string;
  };
}

interface NotificationCardProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
  currentUserRole?: 'admin' | 'super_admin' | 'user';
  onStatusUpdate?: (notificationId: string, status: 'accepted' | 'declined', role?: string) => void;
  onShowRoleModal?: (notificationId: string) => void;
  currentRole?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    type: 'staff_request',
    title: 'Join request',
    description: 'John Doe wants to join your company as a staff member',
    time: '30 min ago',
    read: false,
    avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
    status: 'pending',
    requestData: {
      userId: 'user-john',
      userName: 'John Doe',
    },
  },
  {
    id: 'notif-2',
    type: 'company_request',
    title: 'Connection request',
    description: 'TechCorp Inc. wants to connect with your company',
    time: '1 hour ago',
    read: false,
    avatar: 'https://placehold.co/80x80/blue/white?text=TC',
    status: 'pending',
    requestData: {
      companyId: 'company-techcorp',
      companyName: 'TechCorp Inc.',
    },
  },
  {
    id: 'notif-3',
    type: 'connection_accepted',
    title: 'Connection Request Accepted',
    description: 'You and GlobalTech Solutions are now connected.',
    time: '2 hours ago',
    read: false,
    avatar: 'https://placehold.co/80x80/green/white?text=GT',
    requestData: {
      companyId: 'company-globaltech',
      companyName: 'GlobalTech Solutions',
    },
  },
  {
    id: 'notif-4',
    type: 'staff_request',
    title: 'Join request',
    description: 'Sarah Wilson is now part of your staff',
    time: '3 hours ago',
    read: true,
    avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
    status: 'accepted',
    requestData: {
      userId: 'user-sarah',
      userName: 'Sarah Wilson',
    },
  },
  {
    id: 'notif-5',
    type: 'join_accepted',
    title: 'Join Request Accepted',
    description: 'You are now part of InnovateCorp\'s staff.',
    time: '4 hours ago',
    read: false,
    avatar: 'https://placehold.co/80x80/purple/white?text=IC',
    requestData: {
      companyId: 'company-innovate',
      companyName: 'InnovateCorp',
    },
  },
  {
    id: 'notif-6',
    type: 'delivery',
    title: 'Order ready for pickup',
    description: 'Your order from The Burning Distributor is ready for pickup',
    time: '5 hours ago',
    read: false,
    avatar: 'https://placehold.co/80x80/orange/white?text=🔥',
  },
  {
    id: 'notif-7',
    type: 'invoice',
    title: 'Invoice payment received',
    description: 'Payment of $1,250.00 has been received for invoice #INV-001',
    time: '6 hours ago',
    read: true,
    avatar: null,
  },
  {
    id: 'notif-8',
    type: 'system',
    title: 'Profile updated',
    description: 'Your business profile has been successfully updated',
    time: 'Yesterday',
    read: true,
    avatar: null,
  },
];

const notificationFilterStatuses = ['all', 'request', 'deliveries', 'invoices'];

// Type colors from design system - proHome.typeColors
const TYPE_COLORS = {
  message: '#0075FF',  // info
  delivery: '#2ACF01', // success
  invoice: '#A76AF0',  // inReview
  system: '#6B7280',   // neutral gray
  staff_request: '#A76AF0',    // inReview (purple)
  company_request: '#FF7A00',  // lowStock (orange)
  connection_accepted: '#2ACF01', // success
  join_accepted: '#A76AF0',    // inReview
};

const NotificationCard: React.FC<NotificationCardProps> = ({ 
  notification, 
  onPress, 
  currentUserRole = 'user', 
  onStatusUpdate, 
  onShowRoleModal, 
  currentRole = 'Staff' 
}) => {
  const { theme: appTheme } = useTheme();
  
  const getIconName = (type: string) => {
    switch (type) {
      case 'message':
        return 'mail';
      case 'delivery':
        return 'car';
      case 'invoice':
        return 'document-text';
      case 'system':
        return 'settings';
      case 'staff_request':
        return 'person-add';
      case 'company_request':
        return 'business';
      case 'connection_accepted':
        return 'business';
      case 'join_accepted':
        return 'person-add';
      default:
        return 'notifications';
    }
  };

  const getIconColor = (type: string): string => {
    return TYPE_COLORS[type as keyof typeof TYPE_COLORS] || appTheme.colors.primary;
  };

  const handleRequestAction = (action: 'accept' | 'decline') => {
    if (action === 'accept' && notification.type === 'staff_request') {
      onStatusUpdate?.(notification.id, 'accepted', currentRole);
    } else {
      const status = action === 'accept' ? 'accepted' : 'declined';
      onStatusUpdate?.(notification.id, status, action === 'accept' ? currentRole : undefined);
    }
  };

  const handleStaffButtonPress = () => {
    onShowRoleModal?.(notification.id);
  };

  const isRequestType = notification.type === 'staff_request' || notification.type === 'company_request';
  const canManageRequests = currentUserRole === 'admin' || currentUserRole === 'super_admin';
  const isPending = notification.status === 'pending';
  const isAccepted = notification.status === 'accepted';
  const iconColor = getIconColor(notification.type);

  return (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        { 
          backgroundColor: appTheme.colors.background,
          borderBottomColor: appTheme.colors.borderColor,
        },
        // Highlighted background for unread items (same as DeliveryCard/InvoiceCard)
        !notification.read && { backgroundColor: appTheme.colors.highlightedRow },
      ]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        {/* Icon Container - design spec: borderRadius 10, backgroundOpacity 0.15 */}
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '26' }]}>
          <Icon 
            name={getIconName(notification.type)} 
            size={theme.iconSizes.sm} 
            color={iconColor} 
          />
        </View>
        
        <View style={styles.textContainer}>
          {/* Title Row with Timestamp */}
          <View style={styles.titleRow}>
            <Text 
              style={[styles.title, { color: appTheme.colors.primary }]} 
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            <Text style={[styles.timestamp, { color: appTheme.colors.textMuted }]}>
              {notification.time}
            </Text>
          </View>
          
          {/* Subtitle/Description - 14px medium textSecondary */}
          <Text 
            style={[styles.subtitle, { color: appTheme.colors.textSecondary }]} 
            numberOfLines={2}
          >
            {notification.description}
          </Text>
          
          {/* Staff Button for Accepted Join Requests - Small Outline Button, Full Width */}
          {((notification.type === 'staff_request' && isAccepted) || notification.type === 'join_accepted') && canManageRequests && (
            <TouchableOpacity
              style={[styles.staffButton, { borderColor: appTheme.colors.primary }]}
              onPress={handleStaffButtonPress}
            >
              <Text style={[styles.staffButtonText, { color: appTheme.colors.primary }]}>
                {currentRole}
              </Text>
              <Icon 
                name="chevron-down" 
                size={20} 
                color={appTheme.colors.primary} 
              />
            </TouchableOpacity>
          )}
          
          {/* Action Buttons for Pending Requests */}
          {isRequestType && canManageRequests && isPending && (
            <View style={styles.requestButtons}>
              <TouchableOpacity
                style={[styles.requestButton, styles.declineButton, { borderColor: appTheme.colors.primary }]}
                onPress={() => handleRequestAction('decline')}
              >
                <Text style={[styles.declineButtonText, { color: appTheme.colors.primary }]}>
                  Decline
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.requestButton, styles.confirmButton, { backgroundColor: appTheme.colors.primary }]}
                onPress={() => handleRequestAction('accept')}
              >
                <Text style={[styles.confirmButtonText, { color: appTheme.colors.textInverse }]}>
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function NotificationsScreen() {
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [notificationRoles, setNotificationRoles] = useState<Record<string, string>>({});
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();
  const { theme: appTheme } = useTheme();
  const { markAllAsRead, setUnreadCount } = useNotifications();
  const insets = useSafeAreaInsets();

  // Mock current user role
  const currentUserRole: 'admin' | 'super_admin' | 'user' = 'admin';

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Update global unread count
  React.useEffect(() => {
    setUnreadCount(unreadCount);
  }, [unreadCount, setUnreadCount]);

  const getCurrentRole = (notificationId: string) => {
    return notificationRoles[notificationId] || 'Staff';
  };

  const handleStatusUpdate = (notificationId: string, status: 'accepted' | 'declined', role?: string) => {
    setNotifications(prev => prev.map(notif => {
      if (notif.id === notificationId) {
        let updatedDescription = notif.description;
        
        if (status === 'accepted') {
          if (notif.type === 'staff_request') {
            updatedDescription = `${notif.requestData?.userName} is now part of your staff`;
          } else if (notif.type === 'company_request') {
            updatedDescription = `You and ${notif.requestData?.companyName} are now connected.`;
          }
        } else if (status === 'declined') {
          updatedDescription = 'You have declined the request';
        }
        
        return { ...notif, status, description: updatedDescription };
      }
      return notif;
    }));

    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      if (status === 'accepted') {
        if (notification.type === 'staff_request') {
          Alert.alert(
            'Request Accepted',
            `${notification.requestData?.userName} has been added to your staff${role ? ` as ${role}` : ''}.`,
            [{ text: 'OK' }]
          );
        } else if (notification.type === 'company_request') {
          Alert.alert(
            'Connection Accepted',
            `You and ${notification.requestData?.companyName} are now connected.`,
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Request Declined',
          'The request has been declined.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleShowRoleModal = (notificationId: string) => {
    setSelectedNotificationId(notificationId);
    setShowRoleModal(true);
  };

  const handleRoleSelection = (role: string) => {
    const currentRole = getCurrentRole(selectedNotificationId || '');
    
    if (role === currentRole) {
      setShowRoleModal(false);
      return;
    }
    
    setPendingRole(role);
    setShowRoleModal(false);
    
    setTimeout(() => {
      setShowConfirmDialog(true);
    }, 100);
  };

  const handleConfirmRoleChange = () => {
    if (pendingRole && selectedNotificationId) {
      setNotificationRoles(prev => ({
        ...prev,
        [selectedNotificationId]: pendingRole
      }));
      
      setSuccessMessage(`Role has been changed to ${pendingRole}.`);
      setShowSuccessDialog(true);
    }
    
    setShowConfirmDialog(false);
    setPendingRole(null);
    setSelectedNotificationId(null);
  };

  const handleCancelRoleChange = () => {
    setShowConfirmDialog(false);
    setPendingRole(null);
  };

  const filteredNotifications = notifications.filter(notification => {
    const searchMatch = notification.title.toLowerCase().includes(search.toLowerCase()) || 
                        notification.description.toLowerCase().includes(search.toLowerCase());
    
    let filterMatch = true;
    if (selectedFilter === 'request') {
      filterMatch = notification.type === 'staff_request' || notification.type === 'company_request';
    } else if (selectedFilter === 'deliveries') {
      filterMatch = notification.type === 'delivery';
    } else if (selectedFilter === 'invoices') {
      filterMatch = notification.type === 'invoice';
    }

    return searchMatch && filterMatch;
  });

  const handleClearSearch = () => {
    setSearch('');
  };

  const handleSearchChange = (text: string) => {
    setSearch(text);
  };

  const handleNotificationPress = (notification: Notification) => {
    switch (notification.type) {
      case 'staff_request':
        if (notification.requestData?.userId) {
          navigation.navigate('ViewUserProfile', { userId: notification.requestData.userId });
        }
        break;
      case 'company_request':
        if (notification.requestData?.companyId) {
          navigation.navigate('ViewBusinessProfile', { businessId: notification.requestData.companyId });
        }
        break;
      case 'delivery':
        navigation.navigate('DeliveryDetail', { deliveryId: 'delivery-1' });
        break;
      case 'invoice':
        navigation.navigate('Invoices', { filter: 'received', highlightInvoice: 'invoice-1' });
        break;
      default:
        console.log('Notification pressed:', notification.id);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  // Mark all notifications as read when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      markAllAsRead();
    }, [markAllAsRead])
  );


  return (
    <SafeAreaView 
      style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} 
      edges={['top', 'bottom']}
    >
      {/* Header - Using SecondaryHeader per design spec */}
      <SecondaryHeader
        title="Notifications"
        leftAction={{ icon: 'chevron-left', onPress: handleBack }}
      />

      {/* Search Bar */}
      <AppSearchBar 
        placeholder="Search notifications"
        value={search}
        onChangeText={handleSearchChange}
        onClear={handleClearSearch}
      />

      {/* Filter Bar */}
      <FilterBar 
        statuses={notificationFilterStatuses}
        selectedStatus={selectedFilter}
        onSelectStatus={setSelectedFilter}
        containerStyle={{ flexGrow: 0 }}
      />

      {/* Notification List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <NotificationCard
            notification={item}
            onPress={handleNotificationPress}
            currentUserRole={currentUserRole}
            onStatusUpdate={handleStatusUpdate}
            onShowRoleModal={handleShowRoleModal}
            currentRole={getCurrentRole(item.id)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={appTheme.colors.primary}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Icon
              name="notifications-off-outline"
              size={60}
              color={appTheme.colors.textMuted}
            />
            <Text style={[styles.emptyTitle, { color: appTheme.colors.text }]}>
              No notifications
            </Text>
            <Text style={[styles.emptySubtitle, { color: appTheme.colors.textSecondary }]}>
              You're all caught up! Check back later for updates.
            </Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Role Selection Bottom Sheet - design spec: components.modals.actionBottomSheet */}
      <Modal
        visible={showRoleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowRoleModal(false)}
        >
          <Pressable 
            style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle Indicator - design spec: components.modals.bottomSheet.handleIndicator */}
            <View style={styles.handleIndicator} />
            
            {/* Title - design spec: components.modals.header */}
            <Text style={[styles.modalTitle, { color: appTheme.colors.text }]}>
              Select Role
            </Text>
            
            {/* Action Buttons - design spec: components.modals.actionBottomSheet.actionButtons */}
            <View style={styles.actionButtonsContainer}>
              {['Staff', 'Admin', 'Super Admin'].map((role) => {
                const currentRoleVal = getCurrentRole(selectedNotificationId || '');
                const isSelected = currentRoleVal === role;
                return (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.actionButton,
                      isSelected 
                        ? styles.actionButtonSelected
                        : styles.actionButtonDefault
                    ]}
                    onPress={() => handleRoleSelection(role)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.actionButtonText,
                      { color: isSelected ? '#FFFFFF' : '#000000' }
                    ]}>
                      {role}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Confirmation Dialog */}
      <AppModal
        visible={showConfirmDialog}
        onClose={handleCancelRoleChange}
        title="Change Role"
        message={`Change role to ${pendingRole}?`}
        footer={
          <View style={styles.modalFooter}>
            <AppButton
              title="Confirm"
              onPress={handleConfirmRoleChange}
              variant="confirm"
              style={{ flex: 1, marginRight: 8 }}
            />
            <AppButton
              title="Cancel"
              onPress={handleCancelRoleChange}
              variant="outline"
              style={{ flex: 1 }}
            />
          </View>
        }
      />

      {/* Success Dialog */}
      <AppModal
        visible={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        title="Role Updated"
        message={successMessage}
        footer={
          <AppButton
            title="OK"
            onPress={() => setShowSuccessDialog(false)}
            variant="confirm"
            style={{ width: '100%' }}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingBottom: theme.spacing.lg,
    flexGrow: 1,
  },
  // Notification Card - design spec: components.overlayScreens.notificationsOverlay.notificationItem
  notificationCard: {
    paddingVertical: 14, // design spec
    paddingHorizontal: theme.spacing.md, // 16
    borderBottomWidth: 1,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12, // design spec
  },
  // Icon Container - design spec: width 40, height 40, borderRadius 10
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10, // design spec (not 8)
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  // Title Row - title and timestamp on same line
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  // Title - 16px semiBold primary color
  title: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  // Subtitle - 14px medium textSecondary
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.fonts.primary.medium,
  },
  // Timestamp - 14px medium textMuted, same line as title
  timestamp: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  // Request Action Buttons - Small buttons (40px height)
  requestButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: theme.spacing.sm,
  },
  requestButton: {
    flex: 1,
    height: theme.heights.buttonSmall, // 40px
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Decline - Small Outline Button
  declineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  // Confirm - Small Primary Button
  confirmButton: {},
  declineButtonText: {
    fontFamily: theme.fonts.primary.semiBold,
    fontSize: 14,
  },
  confirmButtonText: {
    fontFamily: theme.fonts.primary.semiBold,
    fontSize: 14,
  },
  // Staff Button - Small Outline, Full Width
  staffButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: theme.heights.buttonSmall, // 40px small button
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    backgroundColor: 'transparent',
    marginTop: 12,
  },
  staffButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
  // Empty State - design spec: patterns.emptyStates
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    flex: 1,
  },
  emptyTitle: {
    fontSize: 16, // design spec: patterns.emptyStates.titleFontSize
    fontFamily: theme.fonts.primary.medium,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: 14, // design spec: patterns.emptyStates.subtitleFontSize
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  // ============================================================
  // BOTTOM SHEET MODAL - design spec: components.modals.bottomSheet
  // ============================================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // design spec: bottomSheet.overlayColor
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF', // design spec: bottomSheet.backgroundColor
    borderTopLeftRadius: 20,    // design spec: bottomSheet.borderTopLeftRadius
    borderTopRightRadius: 20,   // design spec: bottomSheet.borderTopRightRadius
    paddingTop: 16,             // design spec: bottomSheet.paddingTop
    paddingHorizontal: 16,      // design spec: bottomSheet.paddingHorizontal
  },
  // Handle Indicator - design spec: bottomSheet.handleIndicator
  handleIndicator: {
    width: 36,                  // design spec: handleIndicator.width
    height: 4,                  // design spec: handleIndicator.height
    borderRadius: 2,            // design spec: handleIndicator.borderRadius
    backgroundColor: '#E5E7EB', // design spec: handleIndicator.backgroundColor
    alignSelf: 'center',
    marginBottom: 16,
  },
  // Modal Title - design spec: components.modals.header
  modalTitle: {
    fontSize: 18,               // design spec: header.titleFontSize
    fontFamily: theme.fonts.primary.semiBold, // design spec: header.titleFontWeight (600)
    textAlign: 'center',
    marginBottom: 16,           // design spec: header.paddingBottom
  },
  // ============================================================
  // ACTION BUTTONS - design spec: components.modals.actionBottomSheet.actionButtons
  // ============================================================
  actionButtonsContainer: {
    gap: 4,                     // design spec: actionButtons.gap
  },
  actionButton: {
    height: 48,                 // design spec: actionButtons.height
    borderRadius: 12,           // design spec: actionButtons.borderRadius
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Default variant - design spec: actionButtons.variants.default
  actionButtonDefault: {
    backgroundColor: 'transparent', // design spec: default.backgroundColor
    borderWidth: 1,                 // design spec: default.borderWidth
    borderColor: '#000000',         // design spec: default.borderColor
  },
  // Selected variant - design spec: actionButtons.variants.selected
  actionButtonSelected: {
    backgroundColor: '#000000',     // design spec: selected.backgroundColor
    borderWidth: 0,                 // design spec: selected.borderWidth
  },
  actionButtonText: {
    fontSize: 16,                   // design spec: actionButtons.fontSize
    fontFamily: theme.fonts.primary.medium, // design spec: actionButtons.fontFamily (Inter-Medium)
  },
  modalFooter: {
    flexDirection: 'row',
    marginTop: 8,
  },
});
