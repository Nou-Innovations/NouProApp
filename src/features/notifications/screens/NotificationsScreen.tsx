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
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Modal, Pressable, ActivityIndicator } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, DrawerActions } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useProfileStore } from '@/shared/store/profileStore';
import { PrimaryHeader } from '@/shared/components/layout/headers';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import FilterBar from '@/shared/components/ui/FilterBar';
import { AppModal, ListItemCard, EmptyState, SkeletonListItem } from '@/shared/components/ui';
import theme from '@/shared/theme';
import {
  getNotificationPage,
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
  updateTeamMemberRole,
} from '@/features/team/team.service';
import { ROLE_DISPLAY_NAMES } from '@/shared/types/roles';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import {
  acceptBusinessConnectionRequest,
  declineBusinessConnectionRequest,
} from '@/features/connections/connections.service';

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

/**
 * Rows per page. The feed is derived on read, not stored, and the per-source caps in the
 * handler bound how deep it goes — this is a deeper window, not infinite history.
 */
const PAGE_SIZE = 20;


const TYPE_COLORS: Record<string, string> = {
  // Business mode
  staff_request: '#8B5CF6',
  join_accepted: '#8B5CF6',
  invite_pending: '#2A75E6',
  company_request: '#FF7A00',
  connection_accepted: '#2ACF01',
  invoice: '#8B5CF6',
  delivery: '#2ACF01',
  stock_alert: '#D6453E',
  order_update: '#FF7A00',
  subscription_due: '#D6453E',
  // Personal mode
  invite_received: '#2A75E6',
  join_request_accepted: '#2ACF01',
  join_request_rejected: '#D6453E',
  connection_declined: '#D6453E',
  status_change: '#8B5CF6',
  delivery_assigned: '#2ACF01',
  // Shared. `message` and `system` used to be typed, coloured, iconed and routed here
  // while the backend emitted neither — the notification feed has no chat or system
  // rows at all. Removed rather than left as forward-compat, since a handler nothing
  // can reach reads as a working feature (N-14). Unrelated to the `system` PUSH
  // preference column, which is live.
  welcome: '#FF7A00',
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
      case 'connection_declined': return 'close-circle-outline';
      case 'join_request_rejected': return 'close-circle-outline';
      case 'status_change': return 'shield-checkmark-outline';
      case 'welcome': return 'sparkles-outline';
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  /** Unread across the whole filtered set, from the server. Null until the first fetch. */
  const [serverUnread, setServerUnread] = useState<number | null>(null);

  const navigation = useNavigation<any>();
  const { theme: appTheme } = useTheme();
  const { setUnreadCount, refreshUnreadCount } = useNotifications();
  const insets = useSafeAreaInsets();

  const currentUser = useProfileStore((state) => state.currentUser);
  const userBusinesses = useProfileStore((state) => state.userBusinesses);
  const currentUserRole = useProfileStore((state) => state.currentUserRole);
  const activeMode = useProfileStore((state) => state.activeMode);
  const refreshBusinesses = useProfileStore((state) => state.refreshBusinesses);
  const switchToBusiness = useProfileStore((state) => state.switchToBusiness);
  const activeBusinessId = useProfileStore((state) => state.activeBusinessId);

  const isPersonalMode = activeMode === 'personal';
  /*
   * The getting-started cards moved server-side (N-11). They keep the N-4 rule that
   * earned them — shown to anyone in personal mode with no company, rather than to
   * `isNewUser`, which HomeScreen clears on a 5-second timer and never persists — but
   * the condition now lives in the notifications handler, where read-state applies.
   */

  // Reset filter to 'all' when mode changes
  useEffect(() => {
    setSelectedFilter('all');
  }, [activeMode]);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const page = await getNotificationPage(currentUser.id, {
        filter: selectedFilter === 'all' ? undefined : (selectedFilter as any),
        mode: isPersonalMode ? 'personal' : 'business',
        limit: PAGE_SIZE,
        offset: 0,
      });
      // The getting-started cards are derived server-side now, so they arrive with real
      // read-state. They used to be a client-side const with `read: false` hardcoded,
      // which meant they could never be dismissed and the unread badge was permanently
      // stuck at 2 for new users (N-11).
      setNotifications(page.notifications);
      setHasMore(page.hasMore);
      setServerUnread(page.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, selectedFilter, isPersonalMode]);

  /**
   * Append the next page. Uses its own flag rather than `loading`, which swaps the whole
   * list out for skeletons — reusing it would blank the feed mid-scroll (N-12).
   */
  const loadMore = useCallback(async () => {
    if (!currentUser?.id || loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await getNotificationPage(currentUser.id, {
        filter: selectedFilter === 'all' ? undefined : (selectedFilter as any),
        mode: isPersonalMode ? 'personal' : 'business',
        limit: PAGE_SIZE,
        offset: notifications.length,
      });
      setNotifications((prev) => [...prev, ...page.notifications]);
      setHasMore(page.hasMore);
      setServerUnread(page.unreadCount);
    } catch (error) {
      console.error('Failed to load more notifications:', error);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [currentUser?.id, loadingMore, loading, hasMore, notifications.length, selectedFilter, isPersonalMode]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Server-computed, covering the whole filtered set. Counting the loaded rows would
  // report only what has been scrolled to (N-12).
  const unreadCount = serverUnread ?? notifications.filter((n) => !n.read).length;
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
      AppAlert.alert(
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
          // Sync the profile switcher so the newly joined company appears
          // immediately (previously it only showed up after a relogin).
          await refreshBusinesses();
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
        // Two different relationships share this notification type and use different
        // endpoints — calling the user endpoints with a business connection id 404s.
        // The backend now says which it is outright; the companyId sniff is only a
        // fallback for notifications served before that field existed (C-10).
        const isBusinessConnection = notification.requestData?.connectionKind
          ? notification.requestData.connectionKind === 'business'
          : !!notification.requestData?.companyId;
        if (status === 'accepted') {
          if (isBusinessConnection) {
            await acceptBusinessConnectionRequest(connectionId);
          } else {
            await acceptConnectionRequest(connectionId);
          }
          setSuccessMessage('Connection request accepted');
        } else {
          if (isBusinessConnection) {
            await declineBusinessConnectionRequest(connectionId);
          } else {
            await declineConnectionRequest(connectionId);
          }
          setSuccessMessage('Connection request declined');
        }
      }
      setShowSuccessDialog(true);
      await fetchNotifications();
    } catch (error) {
      console.error('Error updating notification status:', error);
      AppAlert.alert('Error', 'Failed to update request. Please try again.');
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

  const handleConfirmRoleChange = async () => {
    if (pendingRole && selectedNotificationId) {
      const notification = notifications.find((n) => n.id === selectedNotificationId);
      const businessId = notification?.requestData?.businessId;
      const userId = notification?.requestData?.userId;
      // Display label ('Super Admin') -> domain value ('super_admin').
      const roleValue = (
        Object.keys(ROLE_DISPLAY_NAMES) as (keyof typeof ROLE_DISPLAY_NAMES)[]
      ).find((key) => ROLE_DISPLAY_NAMES[key] === pendingRole);

      if (!businessId || !userId || !roleValue) {
        AppAlert.alert('Error', 'Could not update this role. Please try from Team Management.');
      } else {
        try {
          // locationId omitted on purpose -> business-level PATCH /companies/:id/users/:userId
          await updateTeamMemberRole(businessId, userId, roleValue);
          setNotificationRoles((prev) => ({ ...prev, [selectedNotificationId]: pendingRole }));
          setSuccessMessage(`Role has been changed to ${pendingRole}.`);
          setShowSuccessDialog(true);
          await fetchNotifications();
        } catch (error) {
          console.error('Error updating member role:', error);
          AppAlert.alert('Error', getApiErrorMessage(error, 'Failed to update role. Please try again.'));
        }
      }
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
    // Mark as read on the server AND in the list, so the unread highlight and the
    // badge update immediately instead of waiting for a manual pull-to-refresh.
    if (!notification.read && currentUser?.id) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
      markNotificationRead(currentUser.id, notification.id)
        .then(() => refreshUnreadCount())
        .catch(() => {});
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
        // Prefer the explicit kind; fall back to the payload shape (C-10).
        if (notification.requestData?.connectionKind === 'user' && notification.requestData?.userId) {
          navigation.navigate('ViewUserProfile', { userId: notification.requestData.userId });
        } else if (notification.requestData?.companyId) {
          navigation.navigate('ViewBusinessProfile', { businessId: notification.requestData.companyId });
        } else if (notification.requestData?.userId) {
          navigation.navigate('ViewUserProfile', { userId: notification.requestData.userId });
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
      case 'connection_declined':
        // Informational only — same treatment as join_request_rejected. Opening the
        // profile of someone who just declined you would be a strange place to land.
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
        if (notification.requestData?.orderId) {
          navigation.navigate('OrderDetails', { orderId: notification.requestData.orderId });
        }
        break;
      case 'stock_alert':
        if (notification.productData?.productId) {
          navigation.navigate('ProductDetail', { productId: notification.productData.productId });
        }
        break;
      case 'subscription_due': {
        // Switch to the company the notice is ABOUT before opening plans. The screen
        // reads activeBusiness for the current plan, the upgrade/downgrade branch AND
        // the checkout call — so an admin of several companies tapping "your Acme
        // subscription is due" could land on, and pay for, whichever company happened
        // to be active (N-13). switchToBusiness validates membership and accepted
        // status, so a notice for a company you've since left fails safely.
        const targetBusinessId = notification.requestData?.businessId;
        if (targetBusinessId && targetBusinessId !== activeBusinessId) {
          // Await the result and DON'T navigate if it fails. switchToBusiness returns
          // false for a company you've left, been suspended from, or only have staff
          // access to — opening the plans screen anyway would land you on whichever
          // company was already active, which is the exact bug being fixed.
          const switched = await switchToBusiness(targetBusinessId);
          if (!switched) {
            AppAlert.alert(
              'Not available',
              'You no longer have access to that company\'s billing.',
            );
            break;
          }
        }
        navigation.navigate('SubscriptionPlans');
        break;
      }
      case 'welcome':
        // Straight to the thing the copy asks for — a photo and a headline.
        navigation.navigate('EditPersonalProfile');
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

  // Previously this called markAllAsRead() on focus, which zeroed the badge client-side
  // while every row stayed unread on the server — and because the effect only refired on
  // a CHANGE, the badge then stayed stuck at 0 forever. Refresh the real count instead.
  useFocusEffect(
    React.useCallback(() => {
      void refreshUnreadCount();
    }, [refreshUnreadCount]),
  );

  const filterStatuses = isPersonalMode ? PERSONAL_FILTERS : BUSINESS_FILTERS;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]}
      edges={['top', 'bottom']}
    >
      <PrimaryHeader
        title="Notifications"
        leftAction={
          navigation.canGoBack()
            ? { icon: 'chevron-left', onPress: () => navigation.goBack() }
            : { icon: 'menu', onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()), accessibilityLabel: 'Open menu' }
        }
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
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator color={appTheme.colors.primary} />
              </View>
            ) : null
          }
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
              {/* Only a super_admin may grant super_admin — the backend 403s otherwise. */}
              {(currentUserRole === 'super_admin'
                ? ['Staff', 'Admin', 'Super Admin']
                : ['Staff', 'Admin']
              ).map((role) => {
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
  footerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
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
