/**
 * NotificationsOverlayScreen - Notifications as an Overlay
 * Slides in from right, sits above tabs
 * Bottom tab bar is hidden inside this overlay
 * Used for both Personal and Business modes
 * Uses the same notification card design as the main NotificationScreen
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import FilterBar from '@/features/search/components/FilterBar';
import ConfirmationDialog from '@/shared/components/ui/ConfirmationDialog';
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

  const getIconColor = (type: string) => {
    switch (type) {
      case 'message':
        return '#007AFF';
      case 'delivery':
        return '#FF9500';
      case 'invoice':
        return '#34C759';
      case 'system':
        return '#8E8E93';
      case 'staff_request':
        return '#9C27B0';
      case 'company_request':
        return '#FF5722';
      case 'connection_accepted':
        return '#FF5722';
      case 'join_accepted':
        return '#9C27B0';
      default:
        return appTheme.colors.primary;
    }
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

  return (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        { 
          backgroundColor: appTheme.colors.background,
          borderBottomColor: appTheme.colors.borderColor,
        },
        !notification.read && { backgroundColor: '#eef9ff' }
      ]}
      onPress={() => onPress(notification)}
    >
      <View style={styles.notificationContent}>
        <View style={[styles.iconContainer, { backgroundColor: getIconColor(notification.type) + '20' }]}>
          <Icon 
            name={getIconName(notification.type)} 
            size={20} 
            color={getIconColor(notification.type)} 
          />
        </View>
        
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: appTheme.colors.text }]} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={[styles.time, { color: appTheme.colors.textLight }]}>
              {notification.time}
            </Text>
          </View>
          <Text style={[styles.description, { color: appTheme.colors.textLight }]} numberOfLines={2}>
            {notification.description}
          </Text>
          
          {/* Staff Button for Accepted Join Requests */}
          {((notification.type === 'staff_request' && isAccepted) || notification.type === 'join_accepted') && canManageRequests && (
            <View style={styles.staffButtonContainer}>
              <TouchableOpacity
                style={styles.staffButton}
                onPress={handleStaffButtonPress}
              >
                <Text style={styles.staffButtonText}>{currentRole}</Text>
                <Icon 
                  name="chevron-down" 
                  size={16} 
                  color="#666666" 
                />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Action Buttons for Pending Requests */}
          {isRequestType && canManageRequests && isPending && (
            <View style={styles.requestButtons}>
              <TouchableOpacity
                style={[styles.requestButton, styles.declineButton]}
                onPress={() => handleRequestAction('decline')}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.requestButton, styles.confirmButton]}
                onPress={() => handleRequestAction('accept')}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function NotificationsOverlayScreen() {
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
      
      // Show success dialog
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

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    markAllAsRead();
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
      {/* Header */}
      <View style={[styles.header, { backgroundColor: appTheme.colors.background, borderBottomColor: appTheme.colors.borderColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="chevron-back" size={28} color={appTheme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: appTheme.colors.text }]}>
          Notifications
        </Text>
        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markReadButton}
            onPress={handleMarkAllRead}
          >
            <Text style={[styles.markReadText, { color: appTheme.colors.primary }]}>
              Mark all read
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('NotificationSettings')}
          >
            <Icon name="settings-outline" size={24} color={appTheme.colors.text} />
          </TouchableOpacity>
        )}
      </View>

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

      {/* Role Selection Modal */}
      <Modal
        visible={showRoleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRoleModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Role</Text>
              <TouchableOpacity onPress={() => setShowRoleModal(false)}>
                <Icon name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>
            
            {['Staff', 'Admin', 'Super Admin'].map((role) => {
              const currentRoleVal = getCurrentRole(selectedNotificationId || '');
              return (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleListItem,
                    currentRoleVal === role && styles.roleListItemSelected
                  ]}
                  onPress={() => handleRoleSelection(role)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.roleListText,
                    currentRoleVal === role && styles.roleListTextSelected
                  ]}>
                    {role}
                  </Text>
                  {currentRoleVal === role && (
                    <Icon name="checkmark" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        visible={showConfirmDialog}
        variant="confirm"
        title="Change Role"
        message={`Change role to ${pendingRole}?`}
        primaryButtonText="Confirm"
        secondaryButtonText="Cancel"
        onPrimaryAction={handleConfirmRoleChange}
        onSecondaryAction={handleCancelRoleChange}
        onClose={handleCancelRoleChange}
      />

      {/* Success Dialog */}
      <ConfirmationDialog
        visible={showSuccessDialog}
        variant="success"
        title="Role Updated"
        message={successMessage}
        primaryButtonText="OK"
        onPrimaryAction={() => setShowSuccessDialog(false)}
        onClose={() => setShowSuccessDialog(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    minHeight: 52,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
    flex: 1,
    textAlign: 'center',
  },
  markReadButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  markReadText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  settingsButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: theme.spacing.lg,
  },
  notificationCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    fontWeight: '400',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  requestButtons: {
    flexDirection: 'row',
    marginTop: 12,
    height: 40,
    gap: 8,
  },
  requestButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  confirmButton: {
    backgroundColor: 'black',
  },
  declineButtonText: {
    color: '#666666',
    fontFamily: 'inter-semibold',
    fontSize: 14,
  },
  confirmButtonText: {
    color: 'white',
    fontFamily: 'inter-semibold',
    fontSize: 14,
  },
  staffButtonContainer: {
    marginTop: 12,
  },
  staffButton: {
    flexDirection: 'row',
    width: 180,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  staffButtonText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'inter-semibold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  roleListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  roleListItemSelected: {
    backgroundColor: '#000000',
  },
  roleListText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  roleListTextSelected: {
    color: '#FFFFFF',
  },
});
