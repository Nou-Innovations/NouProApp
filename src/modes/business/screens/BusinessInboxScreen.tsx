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
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolateColor,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { GestureHandlerRootView, TouchableOpacity } from 'react-native-gesture-handler';
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

// Pro Home Components
import {
  ProActivityTimeline,
  type ActivityItem,
} from '../components';

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
  
  // Refs
  const bottomSheetRef = useRef<BottomSheet>(null);
  const searchBarRef = useRef<AppSearchBarRef>(null);
  
  // Chat filter types
  const chatTypes = ['all', 'unread', 'direct', 'group'];
  
  // Calculate header height (safe area + header)
  const headerHeight = insets.top + 56; // 56 is approximate header height
  
  // Measure activity section height
  const onActivitySectionLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    setActivitySectionHeight(event.nativeEvent.layout.height);
  }, []);
  
  // Track if chat list is in sticky mode (expanded to top) - 0 = collapsed, 1 = expanded
  const expandProgress = useSharedValue(0);
  
  // Timing config for smooth ease-in-out animation
  const timingConfig = {
    duration: 100,
    easing: Easing.inOut(Easing.ease),
  };
  
  // Navigation handlers
  const navigateToExplore = useCallback(() => {
    // @ts-ignore
    navigation.navigate('ExploreOverlay');
  }, [navigation]);
  
  const navigateToNotifications = useCallback(() => {
    // @ts-ignore
    navigation.navigate('Notifications');
  }, [navigation]);

  // Filter chats based on company, filter, and search
  const filteredChats = useMemo(() => {
    let chats: any[] = mockBusinessChats;

    // Filter by company in business mode
    if (activeBusiness) {
      chats = chats.filter((chat: any) => chat.companyId === activeBusiness.id);
    }

    // Apply type filter
    if (filter === 'unread') {
      chats = chats.filter(chat => chat.unreadCount > 0);
    } else if (filter === 'direct') {
      chats = chats.filter(chat => chat.type === 'client' || chat.type === 'supplier');
    } else if (filter === 'group') {
      chats = chats.filter(chat => chat.type === 'internal');
    }

    // Apply search filter
    if (search) {
      chats = chats.filter(chat =>
        chat.name.toLowerCase().includes(search.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(search.toLowerCase())
      );
    }

    return chats;
  }, [search, filter, activeBusiness]);

  // Calculate unread chats count
  const unreadChatsCount = filteredChats.filter(chat => chat.unreadCount > 0).length;

  // Update the inbox unread count when component mounts or data changes
  useEffect(() => {
    setInboxUnreadCount(unreadChatsCount);
  }, [unreadChatsCount, setInboxUnreadCount]);

  // Permissions using profileStore
  const canManageExternalContacts = isAdmin();

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

  // Bottom sheet snap points - showing peek of chats, then expanded to top
  const snapPoints = useMemo(() => {
    // Calculate remaining space below activity section (with 16px gap)
    // Total used space = headerHeight + activitySectionHeight + 8px (marginTop) + 16px (gap)
    const usedSpace = headerHeight + activitySectionHeight + 96;
    const peekHeight = Math.max(SCREEN_HEIGHT - usedSpace, 150); // Minimum 150px peek
    const expandedHeight = SCREEN_HEIGHT - headerHeight;
    return [peekHeight, expandedHeight];
  }, [headerHeight, activitySectionHeight]);
  
  // Handle bottom sheet changes - animate with ease-in-out
  const handleSheetChange = useCallback((index: number) => {
    expandProgress.value = withTiming(index === 1 ? 1 : 0, timingConfig);
  }, [expandProgress, timingConfig]);
  
  // Animated header background style - becomes white when chat list is sticky
  const animatedHeaderStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        expandProgress.value,
        [0, 1],
        [appTheme.colors.surface, appTheme.colors.background]
      ),
    };
  });
  
  // Animated bottom sheet background style - border radius transitions with ease-in-out
  const animatedSheetStyle = useAnimatedStyle(() => {
    const radius = 20 * (1 - expandProgress.value); // 20 when collapsed, 0 when expanded
    return {
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
    };
  });
  
  // Animated handle container style - padding above handle transitions with ease-in-out
  const animatedHandleStyle = useAnimatedStyle(() => {
    const padding = 12 * (1 - expandProgress.value); // 12 when collapsed, 0 when expanded
    return {
      paddingTop: padding,
      paddingBottom: 8,
    };
  });
  
  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate API call - replace with actual data fetching
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  // Chat handlers
  const handleChatPress = (chat: any) => {
    // Determine if it's a group chat based on type
    const isGroupChat = chat.type === 'internal';
    
    // Determine partner type based on mode
    const partnerType = chat.type === 'client' ? 'business' : 'user';
    
    (navigation as any).navigate('Chat', {
      id: chat.id,
      name: chat.name,
      isGroup: isGroupChat,
      avatar: chat.avatar,
      partnerId: chat.id,
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

  // Activity Timeline data
  const activityItems: ActivityItem[] = [
    {
      id: 'act-1',
      type: 'order_created',
      title: 'Order #1235 created',
      description: 'Global Distributors - Rs 8,500',
      timestamp: '5 min ago',
      onPress: () => navigation.navigate('DeliveryDetail' as never, { deliveryId: 'DEL-001' } as never),
    },
    {
      id: 'act-2',
      type: 'delivery_completed',
      title: 'Delivery #455 completed',
      description: 'Premium Foods Ltd',
      timestamp: '25 min ago',
      onPress: () => navigation.navigate('DeliveryDetail' as never, { deliveryId: '455' } as never),
    },
    {
      id: 'act-3',
      type: 'invoice_sent',
      title: 'Invoice #INV-790 sent',
      description: 'ABC Corporation - Rs 12,000',
      timestamp: '1 hour ago',
      onPress: () => navigation.navigate('InvoiceDetails' as never, { invoiceId: '790' } as never),
    },
    {
      id: 'act-4',
      type: 'product_added',
      title: 'New product added',
      description: 'Coconut Water 500ml',
      timestamp: '2 hours ago',
      onPress: () => navigation.navigate('ProductDetail' as never, { productId: 'cw-500' } as never),
    },
    {
      id: 'act-5',
      type: 'delivery_started',
      title: 'Delivery #457 started',
      description: 'Fresh Farms - Route A',
      timestamp: '3 hours ago',
      onPress: () => navigation.navigate('DeliveryDetail' as never, { deliveryId: '457' } as never),
    },
  ];

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
  const renderChatItem = ({ item }: { item: any }) => {
    // Use the messageType from mock data if available, otherwise detect from content
    let messageType = item.messageType || 'text';
    
    if (!item.messageType) {
      if (item.lastMessage === 'Photo') {
        messageType = 'photo';
      } else if (item.lastMessage.includes('Invoice #')) {
        messageType = 'invoice';
      } else if (item.lastMessage.includes('.pdf')) {
        messageType = 'pdf';
      }
    }

    return (
      <MessageCard
        chatId={item.id}
        userId={item.id}
        avatar={item.avatar}
        name={item.name}
        message={item.lastMessage}
        type={messageType}
        time={formatTime(item.timestamp)}
        status={item.status}
        unreadCount={item.unreadCount}
        orderStatus={item.orderStatus}
        transferStatus={item.transferStatus}
        transferDirection={item.transferDirection}
        isOutgoing={item.isOutgoing}
        onPress={() => handleChatPress(item)}
      />
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyListContainer}>
      <MessageSquare
        size={40}
        color={appTheme.colors.iconColor}
        strokeWidth={1.5}
      />
      <Text style={[styles.emptyListTitle, { color: appTheme.colors.text }]}>
        No conversation yet
      </Text>
      <Text style={[styles.emptyListSubtext, { color: appTheme.colors.textSecondary }]}>
        {filter !== 'all'
          ? `No ${filter} conversations found`
          : 'Start a conversation with a client or partner'
        }
      </Text>
      <View style={styles.emptyListButtonContainer}>
        <AppButton
          title="Start a conversation"
          onPress={handleNewChat}
          variant="primary"
        />
      </View>
    </View>
  );


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: appTheme.colors.surface }]}>
        {/* Safe area for top - animated background */}
        <Animated.View style={[{ height: insets.top }, animatedHeaderStyle]} />
          
          {/* Fixed Header - Always visible at top */}
          <Animated.View style={[styles.fixedHeader, animatedHeaderStyle]}>
                {renderHeader()}
          </Animated.View>
          
          {/* Main content area */}
          <View style={styles.mainContent}>
            {/* Activity Section - FULLY INTERACTIVE background content */}
            <View 
              style={[styles.activitySection, { backgroundColor: appTheme.colors.surface }]}
              onLayout={onActivitySectionLayout}
            >
              {/* Activity Timeline */}
              <ProActivityTimeline
                items={activityItems}
                maxItems={5}
                onSeeAll={() => navigation.navigate('AllActivity' as never)}
              />
            </View>
            
            {/* Bottom Sheet - Chat list section that slides over Activity */}
            <BottomSheet
              ref={bottomSheetRef}
              index={0}
              snapPoints={snapPoints}
              onChange={handleSheetChange}
              backgroundComponent={({ style }) => (
                <Animated.View 
                  style={[
                    style, 
                    styles.bottomSheetBackground, 
                    { backgroundColor: appTheme.colors.background },
                    animatedSheetStyle
                  ]} 
                />
              )}
              handleComponent={() => (
                <View style={{ backgroundColor: appTheme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
                  <Animated.View style={[styles.handleContainer, animatedHandleStyle]}>
                    <View style={styles.bottomSheetHandle} />
                  </Animated.View>
                  {/* Search Bar with + button - sticky */}
                  <View style={[styles.searchContainer, { backgroundColor: appTheme.colors.background }]}>
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
                  {/* Filter Bar - sticky at top of bottom sheet */}
                  <FilterBar
                    statuses={chatTypes}
                    selectedStatus={filter}
                    onSelectStatus={setFilter}
                    containerStyle={{ flexGrow: 0 }}
                  />
                </View>
              )}
              enablePanDownToClose={false}
            >
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
    </GestureHandlerRootView>
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
  activitySection: {
    // Normal flow - takes its natural height
    // Fully interactive as background content
    marginTop: 8,
    paddingBottom: theme.spacing.md,
  },
  bottomSheetBackground: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // Shadow to create depth illusion
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  handleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetHandle: {
    backgroundColor: theme.colors.borderColor,
    width: 40,
    height: 4,
    borderRadius: 2,
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
