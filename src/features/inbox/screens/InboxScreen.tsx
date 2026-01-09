import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import AppSearchBar, { AppSearchBarRef } from '@/shared/components/ui/AppSearchBar';
import FilterBar from '@/features/search/components/FilterBar';
import MessageCard from '@/features/inbox/components/MessageCard';
import SimpleHeader, { AnimatedFlatList } from '@/shared/components/layout/headers/SimpleHeader';
import NewChatModalList from '@/features/inbox/components/NewChatModalList';
import NotificationBell from '@/features/notifications/components/NotificationBell';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useProfileStore } from '@/shared/store/profileStore';
import { useInbox } from '../hooks/useInbox';
import { Chat, ChatFilter, PreviewMessageType } from '@/shared/types/inbox';
// Chat filter options
const CHAT_FILTERS: ChatFilter[] = ['all', 'unread', 'direct', 'group'];

export default function InboxScreen() {
  const navigation = useNavigation();
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const { theme: appTheme } = useTheme();
  const { setInboxUnreadCount } = useNotifications();
  
  // Use profileStore for user role checks (single source of truth)
  const isAdmin = useProfileStore((state) => state.isAdmin);
  const isStaffRole = useProfileStore((state) => state.isStaff);
  const searchBarRef = useRef<AppSearchBarRef>(null);
  
  // Use inbox hook for data
  const {
    filteredChats,
    loading,
    refreshing,
    error,
    isMockData,
    filter,
    search,
    unreadChatsCount,
    setFilter,
    setSearch,
    refresh,
    markAsRead,
  } = useInbox();

  // Update the inbox unread count when component mounts or data changes
  useEffect(() => {
    setInboxUnreadCount(unreadChatsCount);
  }, [unreadChatsCount, setInboxUnreadCount]);

  // Check user permissions using profileStore
  const canAccessCompanyInbox = isAdmin();
  const canSendMessages = isAdmin();
  const canManageExternalContacts = isAdmin();

  // Helper function to format timestamps
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (messageDate.getTime() === today.getTime()) {
      // Today - show time
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (messageDate.getTime() === today.getTime() - 86400000) {
      // Yesterday
      return 'Yesterday';
    } else {
      // Older - show date
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const handleChatPress = useCallback((chat: Chat) => {
    // Mark as read when opening
    if (chat.unreadCount > 0) {
      markAsRead(chat.id);
    }
    
    (navigation as any).navigate('Chat', {
      id: chat.id,
      name: chat.name,
      isGroup: chat.type === 'internal',
      avatar: chat.avatar,
      partnerId: chat.id,
      partnerType: chat.type === 'client' ? 'business' : 'user',
      unreadCount: chat.unreadCount || 0,
    });
  }, [navigation, markAsRead]);

  const handleNewChat = () => {
    // Everyone can open the modal to create conversations
    setShowNewChatModal(true);
  };

  const handleNewGroup = () => {
    // Everyone can create groups, but restrictions apply when adding external contacts
    if (!canManageExternalContacts) {
      Alert.alert(
        'Group Creation',
        'You can create groups with internal staff members. Only admins can add external contacts to groups.',
        [
          {
            text: 'Create Internal Group',
            onPress: () => (navigation as any).navigate('UserSearch', { query: '', restrictToInternal: true }),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      // Admins can create groups with anyone
      (navigation as any).navigate('UserSearch', { query: '' });
    }
  };

  const handleNewContact = () => {
    // Everyone can search for contacts, but with different access levels
    if (!canManageExternalContacts) {
      Alert.alert(
        'Contact Search',
        'You can message individual staff members and existing contacts, but cannot initiate conversations with external companies.',
        [
          {
            text: 'Search Internal Contacts',
            onPress: () => (navigation as any).navigate('UserSearch', { query: '', restrictToInternal: true }),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      // Admins can search and contact anyone
      (navigation as any).navigate('CompanySearch', { query: '' });
    }
  };

  const handleScroll = () => {
    // Blur the search bar when scrolling starts
    if (searchBarRef.current?.isFocused()) {
      searchBarRef.current?.blur();
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SimpleHeader
        headerComponent={
          <View style={[styles.headerContainer, { backgroundColor: appTheme.colors.background }]}>
            <View style={styles.titleSection}>
              <Text style={[styles.screenTitle, { color: appTheme.colors.text }]}>
                Inbox
              </Text>
              <View style={styles.headerActions}>
                <TouchableOpacity 
                  style={styles.newChatButton}
                  onPress={handleNewChat}
                >
                  <Icon name="add" size={28} color={appTheme.colors.text} />
                </TouchableOpacity>
                <NotificationBell />
              </View>
            </View>
          </View>
        }
        searchComponent={
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
        }
        stickyComponent={
          <FilterBar 
            statuses={CHAT_FILTERS}
            selectedStatus={filter}
            onSelectStatus={(status) => setFilter(status as ChatFilter)}
            containerStyle={{ flexGrow: 0 }}
          />
        }
      >
        <AnimatedFlatList
          data={filteredChats}
          keyExtractor={(item: unknown) => (item as Chat).id}
          onScrollBeginDrag={handleScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={appTheme.colors.primary}
            />
          }
          ListHeaderComponent={
            <>
              {/* Dev mode mock data indicator */}
              {__DEV__ && isMockData && (
                <View style={[styles.mockDataBanner, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={{ color: '#92400E', fontSize: 12 }}>Using mock data (API unavailable)</Text>
                </View>
              )}
              
              {/* Loading state */}
              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={appTheme.colors.primary} />
                </View>
              )}
              
              {/* Error state */}
              {error && !loading && (
                <View style={styles.errorContainer}>
                  <Text style={[styles.errorText, { color: appTheme.colors.error }]}>{error}</Text>
                  <TouchableOpacity onPress={refresh} style={[styles.retryButton, { backgroundColor: appTheme.colors.primary }]}>
                    <Text style={{ color: 'white' }}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          }
          renderItem={({ item }: { item: unknown }) => {
            const chat = item as Chat;
            // Get message type from lastMessage
            const messageType: PreviewMessageType = chat.lastMessage?.type || 'text';
            const deliveryStatus = (chat.lastMessage as any)?.deliveryStatus;
            
            return (
              <MessageCard
                chatId={chat.id}
                userId={chat.id}
                avatar={chat.avatar}
                name={chat.name}
                message={chat.lastMessage?.content || ''}
                type={messageType}
                time={formatTime(chat.lastMessage?.timestamp || chat.updatedAt)}
                status={chat.lastMessage?.status || 'sent'}
                unreadCount={chat.unreadCount}
                isOutgoing={chat.lastMessage?.isOutgoing}
                deliveryStatus={deliveryStatus}
                onPress={() => handleChatPress(chat)}
              />
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyListContainer}>
              <Icon 
                name="chatbubbles-outline" 
                size={60} 
                color={appTheme.colors.textLight} 
              />
              <Text style={[styles.emptyListText, { color: appTheme.colors.textLight }]}>
                No conversations found
              </Text>
              <Text style={[styles.emptyListSubtext, { color: appTheme.colors.textLight }]}>
                {filter !== 'all' 
                  ? `No ${filter} conversations found`
                  : 'Start a conversation with a client or partner'
                }
              </Text>
              <TouchableOpacity 
                style={[styles.startChatButton, { backgroundColor: appTheme.colors.primary }]}
                onPress={handleNewChat}
              >
                <Text style={styles.startChatButtonText}>Start New Chat</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={{
            // paddingTop: HEADER_HEIGHT, // Removed - SimpleHeader handles this automatically
          }}
          style={{ flex: 1 }}
        />
      </SimpleHeader>

      {/* Access Info for Staff */}
      {isStaffRole() && (
        <View style={[styles.accessNotice, { backgroundColor: appTheme.colors.inputBackground }]}>
          <Icon name="information-circle" size={20} color={appTheme.colors.textLight} />
          <Text style={[styles.accessNoticeText, { color: appTheme.colors.textLight }]}>
            Staff members have limited messaging permissions
          </Text>
        </View>
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
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 48,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: '700',
    flex: 1,
    lineHeight: 32,
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
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsCount: {
    fontSize: 12,
  },
  unreadInfo: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyListContainer: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyListText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyListSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  startChatButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startChatButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  accessNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    gap: 8,
  },
  accessNoticeText: {
    fontSize: 12,
    flex: 1,
  },
  mockDataBanner: {
    padding: 8,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
}); 