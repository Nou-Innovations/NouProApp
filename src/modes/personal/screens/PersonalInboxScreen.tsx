/**
 * PersonalInboxScreen - Personal Mode Inbox Tab
 * Tab-based inbox screen for personal mode
 * Uses PrimaryHeader (no back button) instead of SecondaryHeader
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AppSearchBar, { AppSearchBarRef } from '@/shared/components/ui/AppSearchBar';
import FilterBar from '@/features/search/components/FilterBar';
import MessageCard from '@/features/inbox/components/MessageCard';
import NewChatModalList from '@/features/inbox/components/NewChatModalList';
import PrimaryHeader from '@/shared/components/layout/headers/PrimaryHeader';
import { EmptyState } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useProfileStore } from '@/shared/store/profileStore';
import { getUserChats } from '@/features/inbox/inbox.service';
import type { Chat } from '@/shared/types/inbox';
import theme from '@/shared/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock data for PERSONAL mode - Direct messages (user-to-user and business-to-user)
const mockPersonalChats = [
  {
    id: 'pchat-1',
    name: '📋 Personal Types Showcase',
    type: 'user' as const,
    lastMessage: 'View all personal chat bubble types here',
    messageType: 'text' as const,
    timestamp: '2025-01-16T10:30:00Z',
    unreadCount: 10,
    avatar: 'https://picsum.photos/seed/pshowcase/40/40',
    status: 'delivered' as const,
    isOutgoing: false,
    isGroup: false,
  },
  {
    id: 'pchat-2',
    name: 'Mike Chen',
    type: 'user' as const,
    lastMessage: 'Project_Report_Final.pdf',
    messageType: 'pdf' as const,
    timestamp: '2025-01-16T09:15:00Z',
    unreadCount: 0,
    avatar: 'https://picsum.photos/seed/mike/40/40',
    status: 'seen' as const,
    isOutgoing: false,
    isGroup: false,
  },
  {
    id: 'pchat-3',
    name: 'NouPro Distribution',
    type: 'business' as const,
    lastMessage: 'Package ready for delivery! 📦',
    messageType: 'photo' as const,
    timestamp: '2025-01-16T08:45:00Z',
    unreadCount: 1,
    avatar: 'https://picsum.photos/seed/noupro/40/40',
    status: 'delivered' as const,
    isOutgoing: false,
    isGroup: false,
  },
  {
    id: 'pchat-4',
    name: 'Emma Davis',
    type: 'user' as const,
    lastMessage: 'Voice Note',
    messageType: 'voice_note' as const,
    timestamp: '2025-01-15T16:20:00Z',
    unreadCount: 3,
    avatar: 'https://picsum.photos/seed/emma/40/40',
    status: 'sent' as const,
    isOutgoing: false,
    isGroup: false,
  },
  {
    id: 'pchat-5',
    name: 'Global Supply Co.',
    type: 'business' as const,
    lastMessage: 'Product_Catalog_2025.pdf',
    messageType: 'pdf' as const,
    timestamp: '2025-01-15T14:30:00Z',
    unreadCount: 0,
    avatar: 'https://picsum.photos/seed/global/40/40',
    status: 'seen' as const,
    isOutgoing: false,
    isGroup: false,
  },
  {
    id: 'pchat-7',
    name: 'Family Group',
    type: 'group' as const,
    lastMessage: 'Lisa: See you all this weekend! 😍',
    messageType: 'photo' as const,
    timestamp: '2025-01-15T10:00:00Z',
    unreadCount: 5,
    avatar: null,
    status: 'delivered' as const,
    isOutgoing: false,
    isGroup: true,
  },
];

export default function PersonalInboxScreen() {
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const chatTypes = ['all', 'unread', 'direct', 'group'];
  const [filter, setFilter] = useState('all');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const { theme: appTheme } = useTheme();
  const { setInboxUnreadCount } = useNotifications();
  const searchBarRef = useRef<AppSearchBarRef>(null);
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;
  
  // API state
  const [apiChats, setApiChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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
  
  // Get current user from profile store
  const currentUser = useProfileStore((state) => state.currentUser);
  
  // Use profileStore for role checks
  const isAdmin = useProfileStore((state) => state.isAdmin);
  
  // Fetch chats from API
  const fetchChats = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      
      if (currentUser?.id) {
        const chats = await getUserChats({ userId: currentUser.id });
        setApiChats(chats);
      }
      // If no user ID, will fall back to mock data
    } catch (error) {
      console.error('Failed to fetch chats from API:', error);
      setLoadError('Failed to load chats');
      // Keep any existing apiChats as fallback
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);
  
  // Fetch chats on mount and when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [fetchChats])
  );

  // Transform API chats to UI format
  const transformApiChats = (chats: Chat[]): any[] => {
    return chats.map(chat => ({
      id: chat.id,
      name: chat.name,
      type: chat.type,
      lastMessage: chat.lastMessage?.content || '',
      messageType: chat.lastMessage?.type || 'text',
      timestamp: chat.lastMessage?.timestamp || chat.updatedAt,
      unreadCount: chat.unreadCount,
      avatar: chat.avatar,
      companyId: chat.companyId,
      locationId: chat.locationId,
      status: chat.lastMessage?.status || 'sent',
      isOutgoing: chat.lastMessage?.isOutgoing || false,
      isGroup: chat.type === 'group',
    }));
  };

  // Filter chats based on filter and search
  const filteredChats = useMemo(() => {
    // Use API data if available, otherwise fall back to mock data
    let chats: any[] = apiChats.length > 0 ? transformApiChats(apiChats) : mockPersonalChats;

    // Apply type filter
    if (filter === 'unread') {
      chats = chats.filter(chat => chat.unreadCount > 0);
    } else if (filter === 'direct') {
      chats = chats.filter(chat => !chat.isGroup && chat.type !== 'group');
    } else if (filter === 'group') {
      chats = chats.filter(chat => chat.isGroup || chat.type === 'group');
    }

    // Apply search filter
    if (search) {
      chats = chats.filter(chat =>
        chat.name.toLowerCase().includes(search.toLowerCase()) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(search.toLowerCase()))
      );
    }

    return chats;
  }, [search, filter, apiChats]);

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

  const handleChatPress = (chat: any) => {
    // Determine if it's a group chat
    const isGroupChat = chat.isGroup || chat.type === 'group';
    
    // Determine partner type
    const partnerType = chat.type === 'business' ? 'business' : 'user';
    
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
      {isLoading && apiChats.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      ) : (
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        onScrollBeginDrag={handleScroll}
        onRefresh={fetchChats}
        refreshing={isLoading}
        renderItem={({ item }: { item: any }) => {
          // Use the messageType from mock data if available, otherwise detect from content
          let messageType = item.messageType || 'text';
          
          if (!item.messageType) {
            if (item.lastMessage === 'Photo') {
              messageType = 'photo';
            } else if (item.lastMessage === 'Video call') {
              messageType = 'video_call';
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
              isOutgoing={item.isOutgoing}
              onPress={() => handleChatPress(item)}
            />
          );
        }}
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
});
