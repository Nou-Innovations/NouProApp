/**
 * PersonalInboxScreen - Personal Mode
 * Chats between the user and businesses or other users (direct messages)
 * Based on app-logic.json navigation.personalProfileTabs.Inbox
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { useNotifications } from '@/shared/context/NotificationContext';
import AppSearchBar, { AppSearchBarRef } from '@/shared/components/ui/AppSearchBar';
import FilterBar from '@/features/search/components/FilterBar';
import MessageCard from '@/features/inbox/components/MessageCard';
import SimpleHeader, { AnimatedFlatList } from '@/shared/components/layout/headers/SimpleHeader';
import NewChatModalList from '@/features/inbox/components/NewChatModalList';

// Mock personal chats - Direct messages (user-to-user and business-to-user)
// Each chat has unique message types to showcase the variety
const mockPersonalChats = [
  // Direct messages from users
  {
    id: 'pchat-1',
    name: 'Sarah Johnson',
    type: 'user' as const,
    lastMessage: 'Hey! Are you coming to the meeting tomorrow?',
    messageType: 'text' as const,
    timestamp: '2025-01-16T10:30:00Z',
    unreadCount: 2,
    avatar: 'https://picsum.photos/seed/sarah/40/40',
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
  // Business to user messages
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
    id: 'pchat-6',
    name: 'James Wilson',
    type: 'user' as const,
    lastMessage: 'Awesome! Let me know when it\'s done 👍',
    messageType: 'text' as const,
    timestamp: '2025-01-15T11:45:00Z',
    unreadCount: 0,
    avatar: 'https://picsum.photos/seed/james/40/40',
    status: 'seen' as const,
    isOutgoing: false,
    isGroup: false,
  },
  // Group chat
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
  {
    id: 'pchat-8',
    name: 'Fresh Farms Mauritius',
    type: 'business' as const,
    lastMessage: 'Photo',
    messageType: 'photo' as const,
    timestamp: '2025-01-14T15:20:00Z',
    unreadCount: 0,
    avatar: 'https://picsum.photos/seed/farms/40/40',
    status: 'delivered' as const,
    isOutgoing: false,
    isGroup: false,
  },
  {
    id: 'pchat-9',
    name: 'Work Team',
    type: 'group' as const,
    lastMessage: 'Q1_Targets_2025.pdf',
    messageType: 'pdf' as const,
    timestamp: '2025-01-14T09:30:00Z',
    unreadCount: 0,
    avatar: null,
    status: 'seen' as const,
    isOutgoing: false,
    isGroup: true,
  },
];

const FILTER_OPTIONS = ['All', 'Unread', 'Groups'];

export default function PersonalInboxScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const currentUser = useProfileStore((state) => state.currentUser);
  const { setInboxUnreadCount } = useNotifications();
  const searchBarRef = useRef<AppSearchBarRef>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // Filter chats for personal context only
  const filteredChats = useMemo(() => {
    let chats = mockPersonalChats;

    // Apply filter
    if (filter === 'Unread') {
      chats = chats.filter((chat) => chat.unreadCount > 0);
    } else if (filter === 'Groups') {
      chats = chats.filter((chat) => chat.isGroup);
    }

    // Apply search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      chats = chats.filter(
        (chat) =>
          chat.name.toLowerCase().includes(searchLower) ||
          chat.lastMessage.toLowerCase().includes(searchLower)
      );
    }

    return chats;
  }, [search, filter]);

  // Calculate unread count
  const unreadCount = mockPersonalChats.filter((chat) => chat.unreadCount > 0).length;

  useEffect(() => {
    setInboxUnreadCount(unreadCount);
  }, [unreadCount, setInboxUnreadCount]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else if (messageDate.getTime() === today.getTime() - 86400000) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const handleChatPress = (chat: typeof mockPersonalChats[0]) => {
    // @ts-ignore
    navigation.navigate('Chat', {
      id: chat.id,
      name: chat.name,
      isGroup: chat.isGroup,
      avatar: chat.avatar,
      partnerId: chat.id,
      partnerType: chat.type === 'business' ? 'business' : 'user',
      unreadCount: chat.unreadCount || 0,
    });
  };

  const handleNewChat = () => {
    // Open new chat modal to create conversation
    setShowNewChatModal(true);
  };

  const handleNewGroup = () => {
    // @ts-ignore
    navigation.navigate('UserSearch', { query: '', createGroup: true });
    setShowNewChatModal(false);
  };

  const handleNewContact = () => {
    // @ts-ignore
    navigation.navigate('UserSearch', { query: '' });
    setShowNewChatModal(false);
  };

  const handleScroll = () => {
    if (searchBarRef.current?.isFocused()) {
      searchBarRef.current?.blur();
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="chatbubbles-outline" size={60} color={appTheme.colors.textLight} />
      <Text style={[styles.emptyTitle, { color: appTheme.colors.text }]}>
        {filter === 'Unread' 
          ? 'No unread messages' 
          : filter === 'Groups' 
            ? 'No group conversations'
            : 'No conversations yet'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: appTheme.colors.textLight }]}>
        {filter === 'Unread'
          ? "You're all caught up!"
          : filter === 'Groups'
            ? 'Create a group to chat with multiple people'
            : 'Start messaging people and businesses'}
      </Text>
      {filter === 'All' && (
        <TouchableOpacity
          style={[styles.startChatButton, { backgroundColor: appTheme.colors.primary }]}
          onPress={handleNewChat}
        >
          <Text style={styles.startChatButtonText}>Start New Chat</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      <SimpleHeader
        headerComponent={
          <View style={[styles.headerContainer, { backgroundColor: appTheme.colors.background }]}>
            <View style={styles.titleSection}>
              <Text style={[styles.screenTitle, { color: appTheme.colors.text }]}>
                Inbox
              </Text>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat}>
                  <Icon name="add" size={28} color={appTheme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        searchComponent={
          <View style={[styles.searchContainer, { backgroundColor: appTheme.colors.background }]}>
            <AppSearchBar
              ref={searchBarRef}
              placeholder="Search messages..."
              value={search}
              onChangeText={setSearch}
              onClear={() => setSearch('')}
              containerStyle={styles.searchBar}
            />
          </View>
        }
        stickyComponent={
          <FilterBar
            statuses={FILTER_OPTIONS}
            selectedStatus={filter}
            onSelectStatus={setFilter}
            containerStyle={{ flexGrow: 0 }}
          />
        }
      >
        <AnimatedFlatList
          data={filteredChats}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: any) => {
            const chat = item as typeof mockPersonalChats[0];
            // Use the messageType from mock data if available, otherwise detect from content
            let messageType = chat.messageType || 'text';
            if (!chat.messageType) {
              if (chat.lastMessage.includes('Invoice #')) {
                messageType = 'invoice';
              } else if (chat.lastMessage.includes('.pdf')) {
                messageType = 'pdf';
              }
            }

            return (
              <MessageCard
                chatId={chat.id}
                userId={chat.id}
                avatar={chat.avatar}
                name={chat.name}
                message={chat.lastMessage}
                type={messageType}
                time={formatTime(chat.timestamp)}
                status={chat.status}
                unreadCount={chat.unreadCount}
                isOutgoing={chat.isOutgoing}
                onPress={() => handleChatPress(chat)}
              />
            );
          }}
          onScrollBeginDrag={handleScroll}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        />
      </SimpleHeader>

      {/* New Chat Modal */}
      <NewChatModalList
        visible={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onNewGroup={handleNewGroup}
        onNewContact={handleNewContact}
        canManageExternal={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    height: 48,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 32,
    fontFamily: theme.fonts.primary.bold,
    lineHeight: 32,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  searchBar: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontFamily: theme.fonts.primary.bold,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  startChatButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: 8,
  },
  startChatButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.medium,
  },
});
