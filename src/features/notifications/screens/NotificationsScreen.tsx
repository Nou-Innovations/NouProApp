/**
 * NotificationsScreen - Notifications Screen
 * Slides in from right, sits above tabs
 * Bottom tab bar is hidden inside this screen
 * Used for both Personal and Business modes
 * 
 * Design System: components.overlayScreens.notificationsOverlay
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useProfileStore } from '@/shared/store/profileStore';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import FilterBar from '@/features/search/components/FilterBar';
import { AppModal, ListItemCard, EmptyState } from '@/shared/components/ui';
import AppButton from '@/shared/components/ui/AppButton';
import theme from '@/shared/theme';
import { getNotifications, markNotificationRead, Notification as APINotification } from '../notifications.service';
import { 
  acceptJoinRequestWithRole, 
  rejectJoinRequestById, 
  cancelInvite, 
  resendInvite 
} from '@/features/team/team.service';

// Types - use API types
type Notification = APINotification;

interface NotificationCardProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
  currentUserRole?: 'admin' | 'super_admin' | 'user';
  onStatusUpdate?: (notificationId: string, status: 'accepted' | 'declined', role?: string) => void;
  onShowRoleModal?: (notificationId: string) => void;
  currentRole?: string;
}

const notificationFilterStatuses = ['all', 'requests', 'deliveries', 'invoices'];

// Onboarding notifications for new users who skipped business/company selection
const ONBOARDING_NOTIFICATIONS: Notification[] = [
  {
    id: 'onboarding-create-business',
    type: 'onboarding_create_business',
    title: 'Create your Business profile',
    description: 'Set up your own business and start managing your operations',
    time: 'Just now',
    timestamp: new Date().toISOString(),
    read: false,
    avatar: null,
  },
  {
    id: 'onboarding-join-company',
    type: 'onboarding_join_company',
    title: 'Join an existing Company',
    description: 'Request to join a company and collaborate with your team',
    time: 'Just now',
    timestamp: new Date().toISOString(),
    read: false,
    avatar: null,
  },
];

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
  onboarding_create_business: '#0075FF', // info (blue)
  onboarding_join_company: '#FF7A00',    // orange
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
      case 'onboarding_create_business':
        return 'business-outline';
      case 'onboarding_join_company':
        return 'people-outline';
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

  // Build bottom element
  const bottomElement = (() => {
    // Staff Button for Accepted Join Requests
    if (((notification.type === 'staff_request' && isAccepted) || notification.type === 'join_accepted') && canManageRequests) {
      return (
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
      );
    }
    
    // Action Buttons for Pending Requests
    if (isRequestType && canManageRequests && isPending) {
      return (
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
      );
    }
    
    return null;
  })();

  return (
    <ListItemCard
      avatar={{
        type: 'icon',
        icon: getIconName(notification.type),
        iconColor: iconColor,
        backgroundColor: iconColor + '26',
        borderRadius: 10,
      }}
      title={notification.title}
      subtitle={notification.description}
      rightRow1={{ timestamp: notification.time }}
      onPress={() => onPress(notification)}
      bottomElement={bottomElement}
      showDivider
      style={!notification.read ? { backgroundColor: appTheme.colors.highlightedRow } : undefined}
    />
  );
};

export default function NotificationsScreen() {
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
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
  
  // Get current user from store
  const currentUser = useProfileStore((state) => state.currentUser);
  const isNewUser = useProfileStore((state) => state.isNewUser);
  const userBusinesses = useProfileStore((state) => state.userBusinesses);
  const currentUserRole = useProfileStore((state) => state.currentUserRole);
  
  // Show onboarding notifications for new users with no businesses
  const isOnboardingUser = isNewUser && userBusinesses.length === 0;

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!currentUser?.id || isOnboardingUser) {
      // For onboarding users, show static onboarding notifications
      if (isOnboardingUser) {
        setNotifications(ONBOARDING_NOTIFICATIONS);
      }
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const data = await getNotifications(
        currentUser.id, 
        selectedFilter === 'all' ? undefined : selectedFilter as any
      );
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, selectedFilter, isOnboardingUser]);

  // Load on mount and when filter changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Update global unread count
  useEffect(() => {
    setUnreadCount(unreadCount);
  }, [unreadCount, setUnreadCount]);

  const getCurrentRole = (notificationId: string) => {
    return notificationRoles[notificationId] || 'Staff';
  };

  const handleStatusUpdate = async (notificationId: string, status: 'accepted' | 'declined', role?: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification?.requestData || !currentUser?.id) return;
    
    try {
      if (notification.type === 'staff_request') {
        if (status === 'accepted') {
          await acceptJoinRequestWithRole(
            notification.requestData.businessId!,
            notification.requestData.requestId!,
            role || 'staff'
          );
          setSuccessMessage(`${notification.requestData.userName} has been added to your staff${role ? ` as ${role}` : ''}`);
        } else {
          await rejectJoinRequestById(
            notification.requestData.businessId!,
            notification.requestData.requestId!
          );
          setSuccessMessage('Join request has been declined');
        }
        setShowSuccessDialog(true);
        
        // Refresh notifications
        await fetchNotifications();
      } else if (notification.type === 'company_request') {
        // TODO: Implement company connection accept/decline
        Alert.alert('Not Implemented', 'Company connection requests are not yet implemented');
      }
    } catch (error) {
      console.error('Error updating notification status:', error);
      Alert.alert('Error', 'Failed to update request. Please try again.');
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
    if (selectedFilter === 'requests') {
      filterMatch = notification.type === 'staff_request' || notification.type === 'company_request' || notification.type === 'invite_pending';
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
      case 'onboarding_create_business':
        // Navigate to business creation flow
        navigation.navigate('BusinessBasicInfo', { fromProfileSwitcher: true });
        break;
      case 'onboarding_join_company':
        // Navigate to select company flow (from main app)
        navigation.navigate('SelectCompany', { fromOnboarding: true });
        break;
      default:
        console.log('Notification pressed:', notification.id);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

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
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
          <Text style={[styles.loadingText, { color: appTheme.colors.textSecondary }]}>
            Loading notifications...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NotificationCard
              notification={item}
              onPress={handleNotificationPress}
              currentUserRole={currentUserRole as any}
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
            <EmptyState
              iconName="notifications-off-outline"
              title="You're all caught up"
              subtitle={
                search
                  ? 'No matching notifications found'
                  : 'Notifications about messages, activity, and updates will appear here.'
              }
              testID="empty-notifications"
            />
          )}
          contentContainerStyle={styles.listContent}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
        />
      )}

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
        variant="confirm"
        title="Change Role"
        message={`Change role to ${pendingRole}?`}
        primaryButtonText="Confirm"
        onPrimaryAction={handleConfirmRoleChange}
        secondaryButtonText="Cancel"
        onSecondaryAction={handleCancelRoleChange}
      />

      {/* Success Dialog */}
      <AppModal
        visible={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        variant="success"
        title="Role Updated"
        message={successMessage}
        primaryButtonText="OK"
        onPrimaryAction={() => setShowSuccessDialog(false)}
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
  // NotificationCard action buttons (used in ListItemCard bottomElement)
  requestButtons: {
    flexDirection: 'row',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    marginTop: theme.spacing.md,
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
});
