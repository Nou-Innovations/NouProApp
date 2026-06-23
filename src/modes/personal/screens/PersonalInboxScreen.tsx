/**
 * PersonalInboxScreen - Personal Mode Inbox Tab
 * Tab-based inbox screen for personal mode
 * Uses PrimaryHeader (no back button) instead of SecondaryHeader
 *
 * Uses useInbox() hook as single source of truth for chat data.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Animated,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AppSearchBar, { AppSearchBarRef } from '@/shared/components/ui/AppSearchBar';
import FilterBar from '@/shared/components/ui/FilterBar';
import MessageCard from '@/features/inbox/components/MessageCard';
import NewChatModalList from '@/features/inbox/components/NewChatModalList';
import PrimaryHeader from '@/shared/components/layout/headers/PrimaryHeader';
import { EmptyState, SkeletonListItem } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useProfileStore } from '@/shared/store/profileStore';
import { useInbox } from '@/features/inbox/hooks/useInbox';
import type { Chat } from '@/shared/types/inbox';
import theme from '@/shared/theme';

export default function PersonalInboxScreen() {
  const navigation = useNavigation();
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const { theme: appTheme } = useTheme();
  const { setInboxUnreadCount } = useNotifications();
  const searchBarRef = useRef<AppSearchBarRef>(null);
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;

  // ========== Single source of truth: useInbox hook ==========
  const {
    filteredChats,
    loading,
    refreshing,
    isPersonalMode,
    filter,
    search,
    unreadChatsCount,
    setFilter,
    setSearch,
    refresh,
  } = useInbox();

  const chatTypes = ['all', 'unread', 'direct', 'group'];

  // Re-fetch when screen is focused
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Track keyboard visibility for empty state centering with smooth animation
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.timing(keyboardHeightAnim, {
          toValue: e.endCoordinates.height,
          duration: Platform.OS === 'ios' ? e.duration : 250,
          useNativeDriver: false,
        }).start();
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        Animated.timing(keyboardHeightAnim, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? e?.duration || 250 : 250,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [keyboardHeightAnim]);

  // Profile store for role checks
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const isAdmin = useProfileStore((state) => state.isAdmin);
  const currentUserId = useProfileStore((state) => state.currentUser?.id);

  // Update the inbox unread count when data changes
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

  const handleChatPress = (chat: Chat) => {
    // Note: mark-as-read is handled by useChatMessages hook on ChatScreen mount
    // (gated on unreadCount > 0), so we don't call it here to avoid duplicate API calls.

    // Determine if it's a group chat
    const isGroupChat = chat.type === 'group' || chat.type === 'internal';

    // Determine partner type
    const partnerType = 'user';

    // Derive partnerId as the OTHER participant (not the chat id, not yourself), so tapping
    // the chat header opens that person's profile. Falls back to chat.id only if unknown.
    const partnerId = Array.isArray(chat.participants)
      ? chat.participants.find((p: string) => p !== currentUserId) || chat.id
      : chat.id;

    (navigation as any).navigate('Chat', {
      id: chat.id,
      name: chat.name,
      isGroup: isGroupChat,
      avatar: chat.avatar,
      partnerId,
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

  // Derive messageType from Chat's lastMessage
  const getMessageType = (chat: Chat): string => {
    const type = chat.lastMessage?.type;
    if (type) return type;

    // Fallback: detect from content
    const content = chat.lastMessage?.content || '';
    if (content === 'Photo') return 'photo';
    if (content === 'Video call') return 'video_call';
    if (content.includes('Invoice #')) return 'invoice';
    if (content.includes('.pdf')) return 'pdf';
    return 'text';
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top', 'bottom']}>
      <PrimaryHeader
        title="Inbox"
        actions={[{ icon: 'plus', onPress: handleNewChat }]}
      />

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: appTheme.colors.background }]}>
        <AppSearchBar
          ref={searchBarRef}
          placeholder="Search conversations..."
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
          containerStyle={styles.searchBarContainer}
        />
      </View>

      {/* Filter Bar */}
      <FilterBar
        statuses={chatTypes}
        selectedStatus={filter}
        onSelectStatus={setFilter}
        containerStyle={{ flexGrow: 0 }}
      />

      {/* Chat List */}
      {loading && filteredChats.length === 0 ? (
        <View style={{ flex: 1 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonListItem key={i} avatarSize={52} avatarRadius={8} lines={2} showTimestamp />
          ))}
        </View>
      ) : (
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        onScrollBeginDrag={handleScroll}
        onRefresh={refresh}
        refreshing={refreshing}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        renderItem={({ item }: { item: Chat }) => (
          <MessageCard
            chatId={item.id}
            userId={item.id}
            avatar={item.avatar}
            name={item.name}
            message={item.lastMessage?.content || ''}
            type={getMessageType(item)}
            time={formatTime(item.lastMessage?.timestamp || item.updatedAt)}
            status={item.lastMessage?.status || 'sent'}
            unreadCount={item.unreadCount}
            isOutgoing={item.lastMessage?.isOutgoing || false}
            onPress={() => handleChatPress(item)}
          />
        )}
        ListEmptyComponent={() => (
          <Animated.View style={[styles.emptyListContainer, { paddingBottom: keyboardHeightAnim }]}>
            <EmptyState
              iconName="chatbubble-outline"
              title="No conversations yet"
              subtitle={
                filter !== 'all'
                  ? `No ${filter} conversations found`
                  : 'Start a conversation to connect, collaborate, or ask questions.'
              }
              ctaLabel="Start a new chat"
              onCtaPress={handleNewChat}
              testID="empty-personal-inbox"
            />
          </Animated.View>
        )}
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
      />
      )}

      {/* New Chat Modal */}
      <NewChatModalList
        visible={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onNewGroup={handleNewGroup}
        onNewContact={handleNewContact}
        canManageExternal={canManageExternalContacts}
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
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 0,
  },
  searchBarContainer: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.lg,
  },
  emptyListContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
