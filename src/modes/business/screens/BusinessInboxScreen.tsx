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
  interpolateColor,
  Extrapolation,
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
import FilterBar from '@/shared/components/ui/FilterBar';
import MessageCard from '@/features/inbox/components/MessageCard';
import NewChatModalList from '@/features/inbox/components/NewChatModalList';
import { MessageSquare, Pencil } from '@/shared/utils/icons';
import { EmptyState, SkeletonListItem } from '@/shared/components/ui';
import { getActivityFeed, type ActivityItem } from '@/features/business/activity.service';
import { useInbox } from '@/features/inbox/hooks/useInbox';
import type { Chat, ChatFilter } from '@/shared/types/inbox';

// Pro Home Components
import { ProActivityTimeline } from '../components';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function BusinessInboxScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const { unreadCount, inboxUnreadCount, setInboxUnreadCount } = useNotifications();
  const insets = useSafeAreaInsets();
  
  // Profile store
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const isAdmin = useProfileStore((state) => state.isAdmin);
  
  // Use the unified inbox hook for chats
  const {
    chats,
    filteredChats,
    loading: loadingChats,
    refreshing,
    error: chatError,
    filter,
    search,
    unreadChatsCount,
    setFilter: setInboxFilter,
    setSearch: setInboxSearch,
    refresh: refreshChats,
    markAsRead,
  } = useInbox();
  
  // Local State
  const [activitySectionHeight, setActivitySectionHeight] = useState(0);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [localRefreshing, setLocalRefreshing] = useState(false);
  
  // Refs
  const bottomSheetRef = useRef<BottomSheet>(null);
  const searchBarRef = useRef<AppSearchBarRef>(null);
  
  // Continuously tracks sheet position for animations (0 = collapsed, 1 = expanded)
  const animatedIndex = useSharedValue(0);
  
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

  const navigateToOrders = useCallback(() => {
    // @ts-ignore
    navigation.navigate('Orders');
  }, [navigation]);

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
        const activities = await getActivityFeed(activeBusiness.id, { limit: 4 });
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

  // Note: Chat fetching is now handled by useInbox hook

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
    return [peek, '100%'];
  }, [headerHeight, activitySectionHeight]);
  
  // Animated header style - transitions to white background as sheet expands
  const animatedHeaderStyle = useAnimatedStyle(() => {
    const bgColor = interpolateColor(
      animatedIndex.value,
      [0.4, 1],
      [appTheme.colors.surface, '#FFFFFF']
    );
    return {
      backgroundColor: bgColor,
    };
  });
  
  // Animated border radius for sheet background - flattens as sheet expands
  const animatedSheetStyle = useAnimatedStyle(() => {
    const radius = interpolate(animatedIndex.value, [0, 0.85], [20, 0], Extrapolation.CLAMP);
    return {
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
    };
  });

  // Animated border radius for sheet header handle area
  const animatedSheetHeaderStyle = useAnimatedStyle(() => {
    const radius = interpolate(animatedIndex.value, [0, 0.85], [20, 0], Extrapolation.CLAMP);
    return {
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
    };
  });

  // Animated handle container - padding shrinks to 0 as sheet expands
  const animatedHandleContainerStyle = useAnimatedStyle(() => {
    const pt = interpolate(animatedIndex.value, [0, 0.85], [8, 0], Extrapolation.CLAMP);
    return {
      paddingTop: pt,
    };
  });
  
  // Refresh handler
  const onRefresh = useCallback(async () => {
    setLocalRefreshing(true);
    
    // Refresh both activity and chats
    const promises = [];
    
    // Refresh chats via the unified inbox hook
    promises.push(refreshChats());
    
    // Refresh activity feed
    if (activeBusiness?.id) {
      promises.push(
        getActivityFeed(activeBusiness.id, { limit: 5 })
          .then(setActivityItems)
          .catch(err => console.error('Failed to refresh activities:', err))
      );
    }
    
    await Promise.all(promises);
    setLocalRefreshing(false);
  }, [activeBusiness?.id, refreshChats]);

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
        // Orders are separate from deliveries - navigate to the chat where the order
        // event message lives so the user can see the OrderEventCard with actions.
        // If metadata has a chatId or businessId, use that; otherwise fall back to Inbox.
        if (item.metadata?.chatId && item.metadata?.businessName) {
          (navigation as any).navigate('Chat', {
            id: item.metadata.chatId,
            name: item.metadata.businessName,
            isGroup: false,
            partnerId: item.metadata.businessId || item.entityId,
            partnerType: 'business',
            unreadCount: 0,
          });
        } else {
          // No chat info available - log warning and stay on inbox
          console.warn('Order activity has no linked chat info, orderId:', item.entityId);
        }
        break;
      case 'product':
        (navigation as any).navigate('ProductDetail', { productId: item.entityId });
        break;
      default:
        break;
    }
  };

  // Render custom header using PrimaryHeader
  const renderHeader = () => (
    <PrimaryHeader
      title="Inbox"
      transparent
      actions={[
        { icon: 'bell', onPress: navigateToNotifications, badge: unreadCount, accessibilityLabel: 'Notifications' },
        { icon: 'cart', onPress: navigateToOrders, badge: undefined, accessibilityLabel: 'Orders' },
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

  // Render chat list skeleton
  const renderChatSkeleton = () => (
    <View style={{ flex: 1 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonListItem key={i} avatarSize={52} avatarRadius={8} lines={2} showTimestamp />
      ))}
    </View>
  );

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
                isLoading={loadingActivity}
                maxItems={4}
                onSeeAll={() => navigation.navigate('AllActivity' as never)}
              />
            </View>
            
            {/* Messages BottomSheet */}
            <BottomSheet
              ref={bottomSheetRef}
              index={0}
              snapPoints={snapPoints}
              animatedIndex={animatedIndex}
              style={{ zIndex: 50, elevation: 50 }}
              enablePanDownToClose={false}
              backgroundComponent={({ style }) => (
                <Animated.View 
                  style={[style, styles.sheetBackground, { backgroundColor: appTheme.colors.background }, animatedSheetStyle]} 
                />
              )}
              handleComponent={() => (
                <Animated.View style={[styles.sheetHeader, { backgroundColor: appTheme.colors.background }, animatedSheetHeaderStyle]}>
                  {/* Handle bar */}
                  <Animated.View style={[styles.handleContainer, animatedHandleContainerStyle]}>
                    <View style={[styles.handle, { backgroundColor: appTheme.colors.borderColor }]} />
                  </Animated.View>
                  
                  {/* Search Bar with + button */}
                  <View style={styles.searchContainer}>
                    <AppSearchBar
                      ref={searchBarRef}
                      placeholder="Search conversations..."
                      value={search}
                      onChangeText={setInboxSearch}
                      onClear={() => setInboxSearch('')}
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
                    onSelectStatus={(status) => setInboxFilter(status as ChatFilter)}
                    containerStyle={{ flexGrow: 0 }}
                  />
                </Animated.View>
              )}
            >
              {/* Chat List using BottomSheetFlatList for proper gesture integration */}
              <BottomSheetFlatList
                data={filteredChats}
                keyExtractor={(item) => item.id}
                renderItem={renderChatItem}
                ListEmptyComponent={loadingChats ? renderChatSkeleton : renderEmptyState}
                onScrollBeginDrag={handleScroll}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={5}
                initialNumToRender={10}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing || localRefreshing}
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
            companyId={activeBusiness?.id}
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
    overflow: 'hidden',
  },
  activitySection: {
    marginTop: 8,
    paddingBottom: 8,
    zIndex: 0, // Keep below BottomSheet
  },
  handleContainer: {
    paddingBottom: 0,
    alignItems: 'center' as const,
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
