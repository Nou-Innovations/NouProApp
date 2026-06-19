/**
 * NotificationsScreen - Mode-aware Notifications Screen
 * Slides in from right, sits above tabs
 *
 * Business mode: staff requests, join accepted, invites, connections,
 *                invoices, deliveries, stock alerts, orders, subscription
 * Personal mode: invites received, join accepted, status changes,
 *                delivery assignments, connections, onboarding
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
import FilterBar from '@/shared/components/ui/FilterBar';
import { AppModal, ListItemCard, EmptyState, SkeletonListItem } from '@/shared/components/ui';
import theme from '@/shared/theme';
import {
  getNotifications,
  markNotificationRead,
  acceptConnectionRequest,
  declineConnectionRequest,
  Notification as APINotification,
} from '../notifications.service';
import {
  acceptJoinRequestWithRole,
  rejectJoinRequestById,
  acceptJoinRequest,
  rejectJoinRequest,
} from '@/features/team/team.service';

type Notification = APINotification;

interface NotificationCardProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
  currentUserRole?: 'admin' | 'super_admin' | 'user';
  onStatusUpdate?: (notificationId: string, status: 'accepted' | 'declined', role?: string) => void;
  onShowRoleModal?: (notificationId: string) => void;
  currentRole?: string;
  isPersonalMode?: boolean;
}

// Business mode filters
const BUSINESS_FILTERS = ['all', 'requests', 'deliveries', 'invoices', 'orders'];
// Personal mode filters
const PERSONAL_FILTERS = ['all', 'requests', 'connections', 'jobs'];

// Onboarding notifications shown in personal mode for new users
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

const TYPE_COLORS: Record<string, string> = {
  // Business mode
  staff_request: '#8B5CF6',
  join_accepted: '#8B5CF6',
  invite_pending: '#2A75E6',
  company_request: '#FF7A00',
  connection_accepted: '#34A853',
  invoice: '#8B5CF6',
  delivery: '#34A853',
  stock_alert: '#D6453E',
  order_update: '#FF7A00',
  subscription_due: '#D6453E',
  // Personal mode
  invite_received: '#2A75E6',
  join_request_accepted: '#34A853',
  join_request_rejected: '#D6453E',
  status_change: '#8B5CF6',
  delivery_assigned: '#34A853',
  // Shared
  message: '#2A75E6',
  system: '#57534E',
  onboarding_create_business: '#2A75E6',
  onboarding_join_company: '#FF7A00',
};

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
  currentUserRole = 'user',
  onStatusUpdate,
  onShowRoleModal,
  currentRole = 'Staff',
  isPersonalMode = false,
}) => {
  const { theme: appTheme } = useTheme();

  const getIconName = (type: string) => {
    switch (type) {
      case 'staff_request': return 'person-add';
      case 'join_accepted': return 'person-add';
      case 'invite_pending': return 'mail';
      case 'invite_received': return 'mail-open-outline';
      case 'company_request': return 'business';
      case 'connection_accepted': return 'business';
      case 'invoice': return 'document-text';
      case 'delivery': return 'car';
      case 'delivery_assigned': return 'bicycle-outline';
      case 'stock_alert': return 'alert-circle';
      case 'order_update': return 'receipt-outline';
      case 'subscription_due': return 'card-outline';
      case 'join_request_accepted': return 'checkmark-circle-outline';
      case 'join_request_rejected': return 'close-circle-outline';
      case 'status_change': return 'shield-checkmark-outline';
      case 'message': return 'mail';
      case 'system': return 'settings';
      case 'onboarding_create_business': return 'business-outline';
      case 'onboarding_join_company': return 'people-outline';
      default: return 'notifications';
    }
  };

  const getIconColor = (type: string): string =>
    TYPE_COLORS[type] || appTheme.colors.primary;

  const isRequestType =
    notification.type === 'staff_request' ||
    notification.type === 'company_request' ||
    notification.type === 'invite_received';
  const canManageRequests = currentUserRole === 'admin' || currentUserRole === 'super_admin';
  const isPending = notification.status === 'pending';
  const isAccepted = notification.status === 'accepted';
  const iconColor =
    notification.type === 'subscription_due' && notification.requestData?.severity === 'warning'
      ? appTheme.colors.accent  // Orange for "renewing soon" — red is reserved for expired (critical)
      : getIconColor(notification.type);

  const handleRequestAction = (action: 'accept' | 'decline') => {
    const status = action === 'accept' ? 'accepted' : 'declined';
    onStatusUpdate?.(notification.id, status, action === 'accept' ? currentRole : undefined);
  };

  const bottomElement = (() => {
    // Staff Button for Accepted Join Requests (business mode — assign role)
    if (
      (notification.type === 'join_accepted' || (notification.type === 'staff_request' && isAccepted)) &&
      (canManageRequests && !isPersonalMode)
    ) {
      return (
        <TouchableOpacity
          style={[styles.staffButton, { borderColor: appTheme.colors.primary }]}
          onPress={() => onShowRoleModal?.(notification.id)}
        >
          <Text style={[styles.staffButtonText, { color: appTheme.colors.primary }]}>
            {currentRole}
          </Text>
          <Icon name="chevron-down" size={20} color={appTheme.colors.primary} />
        </TouchableOpacity>
      );
    }

    // Action Buttons for pending requests
    if (isRequestType && isPending) {
      // Personal mode: invite_received (user can accept/decline)
      // Business mode: staff_request / company_request (admin can accept/decline)
      const canAct = isPersonalMode
        ? notification.type === 'invite_received' || notification.type === 'company_request'
        : canManageRequests;

      if (canAct) {
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
    }

    return null;
  })();

  return (
    <ListItemCard
      avatar={{
        type: 'icon',
        icon: getIconName(notification.type),
        iconColor,
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

  const currentUser = useProfileStore((state) => state.currentUser);
  const isNewUser = useProfileStore((state) => state.isNewUser);
  const userBusinesses = useProfileStore((state) => state.userBusinesses);
  const currentUserRole = useProfileStore((state) => state.currentUserRole);
  const activeMode = useProfileStore((state) => state.activeMode);
  const refreshBusinesses = useProfileStore((state) => state.refreshBusinesses);

  const isPersonalMode = activeMode === 'personal';
  const isOnboardingUser = isNewUser && userBusinesses.length === 0;

  // Reset filter to 'all' when mode changes
  useEffect(() => {
    setSelectedFilter('all');
  }, [activeMode]);

  const fetchNotifications = useCallback(async () => {
    // Personal mode onboarding — show static notifications
    if (isPersonalMode && isOnboardingUser) {
      setNotifications(ONBOARDING_NOTIFICATIONS);
      setLoading(false);
      return;
    }

    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getNotifications(
        currentUser.id,
        selectedFilter === 'all' ? undefined : (selectedFilter as any),
        isPersonalMode ? 'personal' : 'business',
      );
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, selectedFilter, isPersonalMode, isOnboardingUser]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  useEffect(() => {
    setUnreadCount(unreadCount);
  }, [unreadCount, setUnreadCount]);

  const getCurrentRole = (notificationId: string) =>
    notificationRoles[notificationId] || 'Staff';

  const handleStatusUpdate = async (
    notificationId: string,
    status: 'accepted' | 'declined',
    role?: string,
  ) => {
    const notification = notifications.find((n) => n.id === notificationId);
    if (!notification?.requestData || !currentUser?.id) return;

    // C4: For join requests (currentRole='none'), show role selection before accepting.
    // Only intercept when role is not already explicitly provided (prevents re-entry).
    if (
      status === 'accepted' &&
      !role &&
      (notification.type === 'staff_request' || notification.type === 'join_accepted') &&
      (!notification.requestData.currentRole || notification.requestData.currentRole === 'none')
    ) {
      Alert.alert(
        'Select Role',
        `What role should ${notification.requestData.userName} have?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Staff',
            onPress: () => { void handleStatusUpdate(notificationId, 'accepted', 'staff'); },
          },
          {
            text: 'Admin',
            onPress: () => { void handleStatusUpdate(notificationId, 'accepted', 'admin'); },
          },
        ],
      );
      return;
    }

    try {
      if (notification.type === 'staff_request' || notification.type === 'join_accepted') {
        // Business mode: admin accepting/declining a join/upgrade request
        if (status === 'accepted') {
          await acceptJoinRequestWithRole(
            notification.requestData.businessId!,
            notification.requestData.requestId!,
            role || 'staff',
          );
          setSuccessMessage(
            `${notification.requestData.userName} has been added to your staff${role ? ` as ${role}` : ''}`,
          );
        } else {
          await rejectJoinRequestById(
            notification.requestData.businessId!,
            notification.requestData.requestId!,
          );
          setSuccessMessage('Join request has been declined');
        }
      } else if (notification.type === 'invite_received') {
        // Personal mode: user accepting/declining an invite from a company
        if (status === 'accepted') {
          await acceptJoinRequest(
            notification.requestData.businessId!,
            currentUser.id,
          );
          setSuccessMessage(
            `You joined ${notification.requestData.companyName || 'the company'}`,
          );
        } else {
          await rejectJoinRequest(
            notification.requestData.businessId!,
            currentUser.id,
          );
          setSuccessMessage('Invitation declined');
        }
      } else if (notification.type === 'company_request') {
        const connectionId = notification.requestData?.connectionId!;
        if (status === 'accepted') {
          await acceptConnectionRequest(connectionId);
          setSuccessMessage('Connection request accepted');
        } else {
          await declineConnectionRequest(connectionId);
          setSuccessMessage('Connection request declined');
        }
      }
      setShowSuccessDialog(true);
      await fetchNotifications();
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
    const currentRoleVal = getCurrentRole(selectedNotificationId || '');
    if (role === currentRoleVal) {
      setShowRoleModal(false);
      return;
    }
    setPendingRole(role);
    setShowRoleModal(false);
    setTimeout(() => setShowConfirmDialog(true), 100);
  };

  const handleConfirmRoleChange = () => {
    if (pendingRole && selectedNotificationId) {
      setNotificationRoles((prev) => ({ ...prev, [selectedNotificationId]: pendingRole }));
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

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        const searchMatch =
          notification.title.toLowerCase().includes(search.toLowerCase()) ||
          notification.description.toLowerCase().includes(search.toLowerCase());
        return searchMatch;
      }),
    [notifications, search],
  );

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read in the backend when the user taps the notification
    if (!notification.read && currentUser?.id) {
      markNotificationRead(currentUser.id, notification.id).catch(() => {});
    }
    switch (notification.type) {
      case 'staff_request':
      case 'join_accepted':
        if (notification.requestData?.userId) {
          navigation.navigate('ViewUserProfile', { userId: notification.requestData.userId });
        }
        break;
      case 'invite_pending':
        // Admin sent an invite — navigate to team management to see pending invites.
        // TeamManagement is a hidden tab in BusinessTabNavigator, so target it via the
        // drawer's "Tabs" screen so the bottom bar + hamburger stay visible.
        if (notification.requestData?.businessId) {
          navigation.navigate('MainTabs', {
            screen: 'Tabs',
            params: { screen: 'TeamManagement', params: { businessId: notification.requestData.businessId } },
          });
        }
        break;
      case 'company_request':
        if (notification.requestData?.companyId) {
          navigation.navigate('ViewBusinessProfile', { businessId: notification.requestData.companyId });
        }
        break;
      case 'connection_accepted':
        // Business mode: companyId present; personal mode: userId present
        if (notification.requestData?.companyId) {
          navigation.navigate('ViewBusinessProfile', { businessId: notification.requestData.companyId });
        } else if (notification.requestData?.userId) {
          navigation.navigate('ViewUserProfile', { userId: notification.requestData.userId });
        }
        break;
      case 'invite_received':
        if (notification.requestData?.businessId) {
          navigation.navigate('ViewBusinessProfile', { businessId: notification.requestData.businessId });
        }
        break;
      case 'join_request_accepted':
        // Refresh business list so the newly joined company appears immediately
        await refreshBusinesses();
        if (notification.requestData?.businessId) {
          navigation.navigate('ViewBusinessProfile', { businessId: notification.requestData.businessId });
        }
        break;
      case 'join_request_rejected':
        // Informational only — don't navigate or refresh businesses
        break;
      case 'status_change':
        if (notification.requestData?.businessId) {
          navigation.navigate('ViewBusinessProfile', { businessId: notification.requestData.businessId });
        }
        break;
      case 'delivery':
        if (notification.requestData?.deliveryId) {
          navigation.navigate('DeliveryDetail', { deliveryId: notification.requestData.deliveryId });
        }
        break;
      case 'delivery_assigned':
        // PersonalDeliveryDetailScreen requires { taskId, businessId, hasFullAccess }
        if (notification.requestData?.deliveryId) {
          navigation.navigate('PersonalDeliveryDetail', {
            taskId: notification.requestData.deliveryId,
            businessId: notification.requestData.businessId || '',
            hasFullAccess: false,
          });
        }
        break;
      case 'invoice':
        // Invoices is a hidden tab in BusinessTabNavigator — navigate via the drawer's "Tabs".
        navigation.navigate('MainTabs', { screen: 'Tabs', params: { screen: 'Invoices' } });
        break;
      case 'order_update':
        // No OrderDetail screen yet — stay on notifications
        break;
      case 'stock_alert':
        if (notification.productData?.productId) {
          navigation.navigate('ProductDetail', { productId: notification.productData.productId });
        }
        break;
      case 'message':
        navigation.navigate('InboxOverlay' as never);
        break;
      case 'subscription_due':
        navigation.navigate('SubscriptionPlans');
        break;
      case 'onboarding_create_business':
        navigation.navigate('BusinessBasicInfo', { fromProfileSwitcher: true });
        break;
      case 'onboarding_join_company':
        navigation.navigate('SelectCompany', { fromOnboarding: true });
        break;
      default:
        break;
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  useFocusEffect(
    React.useCallback(() => {
      markAllAsRead();
    }, [markAllAsRead]),
  );

  const filterStatuses = isPersonalMode ? PERSONAL_FILTERS : BUSINESS_FILTERS;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]}
      edges={['top', 'bottom']}
    >
      <SecondaryHeader
        title="Notifications"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />

      <AppSearchBar
        placeholder="Search notifications"
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
      />

      <FilterBar
        statuses={filterStatuses}
        selectedStatus={selectedFilter}
        onSelectStatus={setSelectedFilter}
        containerStyle={{ flexGrow: 0 }}
      />

      {loading && !refreshing ? (
        <View style={{ flex: 1 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonListItem key={i} avatarSize={48} avatarRadius={10} lines={2} showTimestamp />
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationCard
              notification={item}
              onPress={handleNotificationPress}
              currentUserRole={currentUserRole as any}
              onStatusUpdate={handleStatusUpdate}
              onShowRoleModal={handleShowRoleModal}
              currentRole={getCurrentRole(item.id)}
              isPersonalMode={isPersonalMode}
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
                  : isPersonalMode
                    ? 'Your personal notifications — invitations, connections, and job updates will appear here.'
                    : 'Your business notifications — requests, deliveries, invoices, and updates will appear here.'
              }
              testID="empty-notifications"
            />
          )}
          contentContainerStyle={styles.listContent}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
        />
      )}

      {/* Role Selection Bottom Sheet */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowRoleModal(false)}>
          <Pressable
            style={[styles.modalContent, { paddingBottom: insets.bottom + 16, backgroundColor: appTheme.colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.handleIndicator, { backgroundColor: appTheme.colors.border }]} />
            <Text style={[styles.modalTitle, { color: appTheme.colors.text }]}>
              Select Role
            </Text>
            <View style={styles.actionButtonsContainer}>
              {['Staff', 'Admin', 'Super Admin'].map((role) => {
                const isSelected = getCurrentRole(selectedNotificationId || '') === role;
                return (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.actionButton,
                      isSelected
                        ? [styles.actionButtonSelected, { backgroundColor: appTheme.colors.text }]
                        : [styles.actionButtonDefault, { borderColor: appTheme.colors.border }],
                    ]}
                    onPress={() => handleRoleSelection(role)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.actionButtonText,
                        { color: isSelected ? appTheme.colors.textInverse : appTheme.colors.text },
                      ]}
                    >
                      {role}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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

      <AppModal
        visible={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        variant="success"
        title="Done"
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
  requestButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  requestButton: {
    flex: 1,
    height: theme.heights.buttonSmall,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  confirmButton: {},
  declineButtonText: {
    fontFamily: theme.fonts.primary.semiBold,
    fontSize: 14,
  },
  confirmButtonText: {
    fontFamily: theme.fonts.primary.semiBold,
    fontSize: 14,
  },
  staffButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: theme.heights.buttonSmall,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  staffButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  handleIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.semiBold,
    textAlign: 'center',
    marginBottom: 16,
  },
  actionButtonsContainer: {
    gap: 4,
  },
  actionButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonDefault: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionButtonSelected: {
    borderWidth: 0,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
});
