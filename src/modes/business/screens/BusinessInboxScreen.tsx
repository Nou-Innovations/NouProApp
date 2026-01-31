/**
 * BusinessInboxScreen - Pro Mode Inbox
 * Business inbox dashboard with:
 * - Header with title "Inbox" and Explore/Notifications icons (FIXED)
 * - Activity Timeline (FIXED - chat list scrolls over it)
 * - Chat list section (SCROLLABLE - scrolls under header, over activity)
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { TouchableOpacity } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useProfileStore } from '@/shared/store/profileStore';
import PrimaryHeader from '@/shared/components/layout/headers/PrimaryHeader';
import AppSearchBar, { AppSearchBarRef } from '@/shared/components/ui/AppSearchBar';
import AppButton from '@/shared/components/ui/AppButton';
import FilterBar from '@/features/search/components/FilterBar';
import MessageCard from '@/features/inbox/components/MessageCard';
import NewChatModalList from '@/features/inbox/components/NewChatModalList';
import { MessageSquare, Pencil } from '@/shared/utils/icons';
import { EmptyState } from '@/shared/components/ui';
import { getActivityFeed, type ActivityItem } from '@/features/business/activity.service';
import { getChats } from '@/features/inbox/inbox.service';
import type { Chat } from '@/shared/types/inbox';

// Pro Home Components
import { ProActivityTimeline } from '../components';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mock data for BUSINESS/PRO mode - Clients, suppliers, internal teams
const mockBusinessChats = [
  {
    id: '1',
    name: '📋 Message Types Showcase',
    type: 'client' as const,
    lastMessage: 'View all chat bubble types here',
    messageType: 'text' as const,
    timestamp: '2025-01-16T10:30:00Z',
    unreadCount: 10,
    avatar: 'https://picsum.photos/seed/showcase/40/40',
    companyId: 'biz-001',
    locationId: null,
    status: 'delivered' as const,
    isOutgoing: false,
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    type: 'client' as const,
    lastMessage: 'Photo',
    messageType: 'photo' as const,
    timestamp: '2025-01-16T10:15:00Z',
    unreadCount: 1,
    avatar: 'https://picsum.photos/seed/sarah/40/40',
    companyId: 'biz-001',
    locationId: null,
    status: 'delivered' as const,
    isOutgoing: false,
  },
  {
    id: '3',
    name: 'XYZ Suppliers',
    type: 'supplier' as const,
    lastMessage: 'New_Products_Catalog.pdf',
    messageType: 'pdf' as const,
    timestamp: '2025-01-16T09:15:00Z',
    unreadCount: 1,
    avatar: 'https://picsum.photos/seed/xyz/40/40',
    companyId: 'biz-001',
    locationId: null,
    status: 'seen' as const,
    isOutgoing: false,
  },
  {
    id: '4',
    name: 'Mike Chen',
    type: 'client' as const,
    lastMessage: 'Estimate for project',
    messageType: 'estimate' as const,
    timestamp: '2025-01-16T09:00:00Z',
    unreadCount: 0,
    avatar: 'https://picsum.photos/seed/mike/40/40',
    companyId: 'biz-001',
    locationId: null,
    status: 'delivered' as const,
    isOutgoing: true,
  },
  {
    id: '5',
    name: 'Warehouse A Team',
    type: 'internal' as const,
    lastMessage: 'Inventory_Report_Jan2025.pdf',
    messageType: 'pdf' as const,
    timestamp: '2025-01-16T08:45:00Z',
    unreadCount: 0,
    avatar: null,
    companyId: 'biz-001',
    locationId: 'loc-001',
    status: 'sent' as const,
    isOutgoing: true,
  },
  {
    id: '6',
    name: 'Tech Solutions Inc',
    type: 'client' as const,
    lastMessage: 'Invoice #INV-2025-001',
    messageType: 'invoice' as const,
    timestamp: '2025-01-15T16:20:00Z',
    unreadCount: 3,
    avatar: 'https://picsum.photos/seed/tech/40/40',
    companyId: 'biz-001',
    locationId: null,
    status: 'delivered' as const,
    isOutgoing: true,
  },
  {
    id: '7',
    name: 'Global Distributors',
    type: 'client' as const,
    lastMessage: '',
    messageType: 'order' as const,
    orderStatus: 'new_order_received' as const,
    timestamp: '2025-01-15T15:45:00Z',
    unreadCount: 1,
    avatar: 'https://picsum.photos/seed/global/40/40',
    companyId: 'biz-001',
    locationId: null,
    status: 'sent' as const,
    isOutgoing: false,
  },
  {
    id: '8',
    name: 'Emma Williams',
    type: 'client' as const,
    lastMessage: 'Hey, I wanted to follow up on our conversation about the bulk order. Can you please confirm the delivery date and let me know if there are any changes to the pricing?',
    messageType: 'text' as const,
    timestamp: '2025-01-15T14:30:00Z',
    unreadCount: 0,
    avatar: 'https://picsum.photos/seed/emma/40/40',
    companyId: 'biz-001',
    locationId: null,
    status: 'delivered' as const,
    isOutgoing: false,
  },
  {
    id: '9',
    name: 'David Brown',
    type: 'client' as const,
    lastMessage: 'Thanks for the update!',
    messageType: 'text' as const,
    timestamp: '2025-01-15T13:00:00Z',
    unreadCount: 0,
    avatar: 'https://picsum.photos/seed/david/40/40',
    companyId: 'biz-001',
    locationId: null,
    status: 'seen' as const,
    isOutgoing: true,
  },
  {
    id: '10',
    name: 'Lisa Anderson',
    type: 'client' as const,
    lastMessage: 'The package arrived safely, thank you!',
    messageType: 'text' as const,
    timestamp: '2025-01-15T11:45:00Z',
    unreadCount: 0,
    avatar: 'https://picsum.photos/seed/lisa/40/40',
    companyId: 'biz-001',
    locationId: null,
    status: 'delivered' as const,
    isOutgoing: false,
  },
  {
    id: '11',
    name: 'James Wilson',
    type: 'client' as const,
    lastMessage: 'Please confirm the order details',
    messageType: 'text' as const,
    timestamp: '2025-01-15T10:30:00Z',
    unreadCount: 0,
    avatar: 'https://picsum.photos/seed/james/40/40',
    companyId: 'biz-001',
    locationId: null,
    status: 'failed' as const,
    isOutgoing: true,
  },
  {
    id: '12',
    name: 'Warehouse B',
    type: 'internal' as const,
    lastMessage: '',
    messageType: 'transfer' as const,
    transferStatus: 'new_transfer_received' as const,
    transferDirection: 'incoming' as const,
    timestamp: '2025-01-15T09:00:00Z',
    unreadCount: 2,
    avatar: null,
    companyId: 'biz-001',
    locationId: 'loc-002',
    status: 'delivered' as const,
    isOutgoing: false,
  },
  {
    id: '13',
    name: 'Branch Office',
    type: 'internal' as const,
    lastMessage: '',
    messageType: 'transfer' as const,
    transferStatus: 'transfer_ongoing' as const,
    transferDirection: 'outgoing' as const,
    timestamp: '2025-01-15T08:30:00Z',
    unreadCount: 0,
    avatar: null,
    companyId: 'biz-001',
    locationId: 'loc-003',
    status: 'sent' as const,
    isOutgoing: true,
  },
];

export default function BusinessInboxScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const { unreadCount, inboxUnreadCount, setInboxUnreadCount } = useNotifications();
  const insets = useSafeAreaInsets();
  
  // Profile store
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const isAdmin = useProfileStore((state) => state.isAdmin);
  
  // State
  const [refreshing, setRefreshing] = useState(false);
  const [activitySectionHeight, setActivitySectionHeight] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  
  // Refs
  const bottomSheetRef = useRef<BottomSheet>(null);
  const searchBarRef = useRef<AppSearchBarRef>(null);
  
  // Track expansion progress for animations (0 = collapsed, 1 = expanded)
  const expandProgress = useSharedValue(0);
  
  // Chat filter types
  const chatTypes = ['all', 'unread', 'direct', 'group'];
  
  // Calculate header height (safe area + header)
  const headerHeight = insets.top + 56; // 56 is approximate header height
  
  // Measure activity section height
  const onActivitySectionLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    setActivitySectionHeight(event.nativeEvent.layout.height);
  }, []);
  
  
  // Navigation handlers
  const navigateToExplore = useCallback(() => {
    // @ts-ignore
    navigation.navigate('ExploreOverlay');
  }, [navigation]);
  
  const navigateToNotifications = useCallback(() => {
    // @ts-ignore
    navigation.navigate('Notifications');
  }, [navigation]);

  // Filter chats for unread count
  const filteredChats = useMemo(() => {
    let filtered = chats;

    // Apply unread filter
    if (filter === 'unread') {
      filtered = filtered.filter(chat => chat.unreadCount > 0);
    }

    return filtered;
  }, [chats, filter]);

  // Calculate unread chats count
  const unreadChatsCount = filteredChats.filter(chat => chat.unreadCount > 0).length;

  // Update the inbox unread count when component mounts or data changes
  useEffect(() => {
    setInboxUnreadCount(unreadChatsCount);
  }, [unreadChatsCount, setInboxUnreadCount]);

  // Permissions using profileStore
  const canManageExternalContacts = isAdmin();

  // Fetch activity feed from API
  useEffect(() => {
    const fetchActivity = async () => {
      if (!activeBusiness?.id) return;
      try {
        setLoadingActivity(true);
        const activities = await getActivityFeed(activeBusiness.id, { limit: 5 });
        setActivityItems(activities);
      } catch (error) {
        console.error('Failed to fetch activities:', error);
        // Keep empty array on error, don't show mock data
        setActivityItems([]);
      } finally {
        setLoadingActivity(false);
      }
    };
    fetchActivity();
  }, [activeBusiness?.id]);

  // Fetch chats from API
  useEffect(() => {
    const fetchChatList = async () => {
      if (!activeBusiness?.id) {
        // No active business - use mock data as fallback for development
        console.warn('No activeBusiness.id - falling back to mock chats');
        setChats(mockBusinessChats as any);
        setLoadingChats(false);
        return;
      }
      
      try {
        setLoadingChats(true);
        const data = await getChats({
          companyId: activeBusiness.id,
          locationId: undefined, // Can add location filter later
          type: filter === 'direct' ? 'client' : filter === 'group' ? 'internal' : undefined,
          search: search || undefined,
        });
        setChats(data);
      } catch (error) {
        console.error('Failed to load chats:', error);
        // Fallback to mock data on API error for development
        console.warn('API error - falling back to mock chats');
        setChats(mockBusinessChats as any);
      } finally {
        setLoadingChats(false);
      }
    };
    
    fetchChatList();
  }, [activeBusiness?.id, filter, search]);

  // Helper function to format timestamps
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else if (messageDate.getTime() === today.getTime() - 86400000) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // Snap points for bottom sheet - stable calculation with minimum peek height
  const snapPoints = useMemo(() => {
    const TAB_BAR_EST = 84;
    const EXTRA_PADDING = 110;
    const usedSpace = headerHeight + activitySectionHeight + EXTRA_PADDING;
    const rawPeek = SCREEN_HEIGHT - usedSpace - TAB_BAR_EST;
    const peek = Math.max(rawPeek, 280);
    return [peek, '92%'];
  }, [headerHeight, activitySectionHeight]);
  
  // Handle bottom sheet index changes
  const handleSheetChange = useCallback((index: number) => {
    expandProgress.value = withTiming(index === 1 ? 1 : 0, {
      duration: 200,
      easing: Easing.inOut(Easing.ease),
    });
  }, [expandProgress]);
  
  // Animated header style
  const animatedHeaderStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: appTheme.colors.surface,
    };
  });
  
  // Animated border radius for sheet - rounds when collapsed, flat when expanded
  const animatedSheetStyle = useAnimatedStyle(() => {
    const radius = interpolate(expandProgress.value, [0, 1], [20, 0]);
    return {
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
    };
  });
  
  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // Refresh both activity and chats
    const promises = [];
    
    if (activeBusiness?.id) {
      promises.push(
        getActivityFeed(activeBusiness.id, { limit: 5 })
          .then(setActivityItems)
          .catch(err => console.error('Failed to refresh activities:', err))
      );
      
      promises.push(
        getChats({
          companyId: activeBusiness.id,
          type: filter === 'direct' ? 'client' : filter === 'group' ? 'internal' : undefined,
          search: search || undefined,
        })
          .then(setChats)
          .catch(err => console.error('Failed to refresh chats:', err))
      );
    }
    
    await Promise.all(promises);
    setRefreshing(false);
  }, [activeBusiness?.id, filter, search]);

  // Chat handlers
  const handleChatPress = (chat: Chat) => {
    // Determine if it's a group chat based on type
    const isGroupChat = chat.type === 'internal';
    
    // Determine partner type based on mode
    const partnerType = chat.type === 'client' ? 'business' : 'user';
    
    (navigation as any).navigate('Chat', {
      id: chat.id,
      name: chat.name,
      isGroup: isGroupChat,
      avatar: chat.avatar,
      partnerId: chat.participants?.[0] || chat.id,
      partnerType: partnerType,
      unreadCount: chat.unreadCount || 0,
    });
  };

  const handleNewChat = () => {
    setShowNewChatModal(true);
  };

  const handleNewGroup = () => {
    (navigation as any).navigate('UserSearch', { query: '' });
  };

  const handleNewContact = () => {
    if (!canManageExternalContacts) {
      (navigation as any).navigate('UserSearch', { query: '', restrictToInternal: true });
    } else {
      (navigation as any).navigate('CompanySearch', { query: '' });
    }
  };

  const handleScroll = () => {
    if (searchBarRef.current?.isFocused()) {
      searchBarRef.current?.blur();
    }
  };

  // Handle activity item press - navigate to appropriate detail screen
  const handleActivityPress = (item: ActivityItem) => {
    switch (item.entityType) {
      case 'invoice':
        (navigation as any).navigate('InvoiceDetails', { invoiceId: item.entityId });
        break;
      case 'delivery':
        (navigation as any).navigate('DeliveryDetail', { deliveryId: item.entityId });
        break;
      case 'order':
        (navigation as any).navigate('DeliveryDetail', { deliveryId: item.entityId });
        break;
      case 'product':
        (navigation as any).navigate('ProductDetail', { productId: item.entityId });
        break;
      default:
        console.log('Unknown activity type:', item.entityType);
    }
  };

  // Render custom header using PrimaryHeader
  const renderHeader = () => (
    <PrimaryHeader
      title="Inbox"
      transparent
      actions={[
        { icon: 'bell', onPress: navigateToNotifications, badge: unreadCount, accessibilityLabel: 'Notifications' },
        { icon: 'globe', onPress: navigateToExplore, badge: undefined, accessibilityLabel: 'Explore' },
      ]}
    />
  );

  // Render chat item
  const renderChatItem = ({ item }: { item: Chat }) => {
    const lastMessage = item.lastMessage;
    
    return (
      <MessageCard
        chatId={item.id}
        userId={item.id}
        avatar={item.avatar || undefined}
        name={item.name}
        message={lastMessage?.content || ''}
        type={lastMessage?.type || 'text'}
        time={formatTime(lastMessage?.timestamp || item.updatedAt)}
        status={lastMessage?.status}
        unreadCount={item.unreadCount}
        orderStatus={lastMessage?.deliveryStatus}
        isOutgoing={lastMessage?.isOutgoing || false}
        onPress={() => handleChatPress(item)}
      />
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <EmptyState
      iconName="chatbubbles-outline"
      title="No conversations yet"
      subtitle={
        filter !== 'all'
          ? `No ${filter} conversations found`
          : 'Start chatting with partners, clients, or your team.'
      }
      ctaLabel="New conversation"
      onCtaPress={handleNewChat}
      testID="empty-business-inbox"
    />
  );


  return (
      <View style={[styles.container, { backgroundColor: appTheme.colors.surface }]}>
        {/* Safe area for top - animated background */}
        <Animated.View style={[{ height: insets.top }, animatedHeaderStyle]} />
          
          {/* Fixed Header - Always visible at top */}
          <Animated.View style={[styles.fixedHeader, animatedHeaderStyle]}>
                {renderHeader()}
          </Animated.View>
          
          {/* Main content area */}
          <View style={styles.mainContent}>
            {/* Activity Section */}
            <View 
              style={[styles.activitySection, { backgroundColor: appTheme.colors.surface }]}
              onLayout={onActivitySectionLayout}
            >
              {/* Activity Timeline */}
              <ProActivityTimeline
                items={activityItems.map(item => ({
                  ...item,
                  onPress: () => handleActivityPress(item),
                }))}
                maxItems={5}
                onSeeAll={() => navigation.navigate('AllActivity' as never)}
              />
            </View>
            
            {/* Messages BottomSheet */}
            <BottomSheet
              ref={bottomSheetRef}
              index={0}
              snapPoints={snapPoints}
              onChange={handleSheetChange}
              style={{ zIndex: 50, elevation: 50 }}
              enablePanDownToClose={false}
              backgroundComponent={({ style }) => (
                <Animated.View 
                  style={[style, styles.sheetBackground, { backgroundColor: appTheme.colors.background }, animatedSheetStyle]} 
                />
              )}
              handleComponent={() => (
                <View style={[styles.sheetHeader, { backgroundColor: appTheme.colors.background }]}>
                  {/* Handle bar */}
                  <View style={styles.handleContainer}>
                    <View style={[styles.handle, { backgroundColor: appTheme.colors.borderColor }]} />
                  </View>
                  
                  {/* Search Bar with + button */}
                  <View style={styles.searchContainer}>
                    <AppSearchBar
                      ref={searchBarRef}
                      placeholder="Search conversations..."
                      value={search}
                      onChangeText={setSearch}
                      onClear={() => setSearch('')}
                      containerStyle={styles.searchBarContainer}
                    />
                    <TouchableOpacity
                      onPress={handleNewChat}
                      style={styles.addButton}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Pencil size={24} color={appTheme.colors.text} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Filter Bar */}
                  <FilterBar
                    statuses={chatTypes}
                    selectedStatus={filter}
                    onSelectStatus={setFilter}
                    containerStyle={{ flexGrow: 0 }}
                  />
                </View>
              )}
            >
              {/* Chat List using BottomSheetFlatList for proper gesture integration */}
              <BottomSheetFlatList
                data={filteredChats}
                keyExtractor={(item) => item.id}
                renderItem={renderChatItem}
                ListEmptyComponent={renderEmptyState}
                onScrollBeginDrag={handleScroll}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={appTheme.colors.primary}
                  />
                }
                contentContainerStyle={[
                  styles.listContent,
                  filteredChats.length === 0 && styles.listContentEmpty
                ]}
              />
            </BottomSheet>
          </View>
          
          {/* New Chat Modal */}
          <NewChatModalList
            visible={showNewChatModal}
            onClose={() => setShowNewChatModal(false)}
            onNewGroup={handleNewGroup}
            onNewContact={handleNewContact}
            canManageExternal={canManageExternalContacts}
          />
        </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    zIndex: 10,
  },
  mainContent: {
    flex: 1,
    position: 'relative',
  },
  sheetBackground: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  sheetHeader: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  activitySection: {
    marginTop: 8,
    paddingBottom: theme.spacing.md,
    zIndex: 0, // Keep below BottomSheet
  },
  handleContainer: {
    paddingTop: 8,
    paddingBottom: 0,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.18)',
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 4,
    paddingTop: 0,
    paddingBottom: 0,
  },
  searchBarContainer: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  addButton: {
    marginLeft: 0,
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.lg + 40,
  },
  listContentEmpty: {
    flex: 1,
  },
  emptyListContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 60,
  },
  emptyListTitle: {
    fontSize: 24,
    fontFamily: theme.fonts.primary.bold,
    marginTop: 24,
    textAlign: 'center',
  },
  emptyListSubtext: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyListButtonContainer: {
    marginTop: 32,
    width: '100%',
  },
});
