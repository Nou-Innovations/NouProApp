/**
 * InboxOverlayScreen - Inbox as an Overlay
 * Slides in from right, sits above tabs
 * Bottom tab bar is hidden inside this overlay
 * Used for both Personal and Business modes
 * 
 * Uses useInbox() hook as single source of truth for chat data.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Animated,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AppSearchBar, { AppSearchBarRef } from '@/shared/components/ui/AppSearchBar';
import FilterBar from '@/shared/components/ui/FilterBar';
import MessageCard from '@/features/inbox/components/MessageCard';
import NewChatModalList from '@/features/inbox/components/NewChatModalList';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { EmptyState } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useProfileStore } from '@/shared/store/profileStore';
import { useInbox } from '../hooks/useInbox';
import type { Chat } from '@/shared/types/inbox';
import theme from '@/shared/theme';

export default function InboxOverlayScreen() {
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
    markAsRead,
  } = useInbox();

  const chatTypes = ['all', 'unread', 'direct', 'group'];

  // Re-fetch when screen is focused
  useFocusEffect(
    React.useCallback(() => {
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
  
  // Profile store for role checks and company context
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const currentUser = useProfileStore((state) => state.currentUser);
  const isAdmin = useProfileStore((state) => state.isAdmin);

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

    // Determine if it's a group chat based on mode and type
    const isGroupChat = isPersonalMode 
      ? (chat.type === 'group' || chat.type === 'internal')
      : (chat.type === 'internal');
    
    // Determine partner type based on mode
    const partnerType = isPersonalMode
      ? 'user'
      : (chat.type === 'client' || chat.type === 'supplier' ? 'business' : 'user');
    
    // Derive partnerId from participants (the other participant, not the current user)
    const currentUserId = currentUser?.id;
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

  const handleBack = () => {
    navigation.goBack();
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
      <SecondaryHeader
        title="Inbox"
        leftAction={{ icon: 'chevron-left', onPress: handleBack }}
        rightActions={[{ icon: 'plus', onPress: handleNewChat }]}
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      ) : (
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        onScrollBeginDrag={handleScroll}
        onRefresh={refresh}
        refreshing={refreshing}
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
              testID="empty-inbox-overlay"
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyListContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
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

