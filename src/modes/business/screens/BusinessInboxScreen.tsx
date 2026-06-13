/**
 * BusinessInboxScreen - Pro Mode Inbox
 * Normal messaging screen:
 * - Header with title "Inbox" (drawer menu + Orders)
 * - Search bar with new-chat button
 * - Filter chips (all/unread/direct/group)
 * - Conversation list
 *
 * Uses useInbox() hook as single source of truth for chat data.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useProfileStore } from '@/shared/store/profileStore';
import PrimaryHeader from '@/shared/components/layout/headers/PrimaryHeader';
import AppSearchBar, { AppSearchBarRef } from '@/shared/components/ui/AppSearchBar';
import FilterBar from '@/shared/components/ui/FilterBar';
import MessageCard from '@/features/inbox/components/MessageCard';
import NewChatModalList from '@/features/inbox/components/NewChatModalList';
import { Pencil } from '@/shared/utils/icons';
import { EmptyState, SkeletonListItem } from '@/shared/components/ui';
import { useInbox } from '@/features/inbox/hooks/useInbox';
import type { Chat, ChatFilter } from '@/shared/types/inbox';

export default function BusinessInboxScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const { setInboxUnreadCount } = useNotifications();

  // Profile store
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const isAdmin = useProfileStore((state) => state.isAdmin);

  // Use the unified inbox hook for chats
  const {
    filteredChats,
    loading: loadingChats,
    refreshing,
    filter,
    search,
    unreadChatsCount,
    setFilter: setInboxFilter,
    setSearch: setInboxSearch,
    refresh: refreshChats,
  } = useInbox();

  // Local State
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // Refs
  const searchBarRef = useRef<AppSearchBarRef>(null);

  // Chat filter types
  const chatTypes = ['all', 'unread', 'direct', 'group'];

  // Navigation handlers
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
      partnerType,
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

  const openDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.toggleDrawer());
  }, [navigation]);

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top', 'bottom']}>
      <PrimaryHeader
        title="Inbox"
        leftAction={{ icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }}
        actions={[
          { icon: 'cart', onPress: navigateToOrders, badge: undefined, accessibilityLabel: 'Orders' },
        ]}
      />

      {/* Search Bar with new-chat button */}
      <View style={[styles.searchContainer, { backgroundColor: appTheme.colors.background }]}>
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

      {/* Chat List */}
      {loadingChats && filteredChats.length === 0 ? (
        <View style={{ flex: 1 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonListItem key={i} avatarSize={52} avatarRadius={8} lines={2} showTimestamp />
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
          onScrollBeginDrag={handleScroll}
          onRefresh={refreshChats}
          refreshing={refreshing}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.listContent,
            filteredChats.length === 0 && styles.listContentEmpty,
          ]}
        />
      )}

      {/* New Chat Modal */}
      <NewChatModalList
        visible={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onNewGroup={handleNewGroup}
        onNewContact={handleNewContact}
        canManageExternal={canManageExternalContacts}
        companyId={activeBusiness?.id}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 4,
    paddingTop: 8,
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
});
