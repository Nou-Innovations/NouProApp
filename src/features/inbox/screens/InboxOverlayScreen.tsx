/**
 * InboxOverlayScreen - Inbox as an Overlay
 * Slides in from right, sits above tabs
 * Bottom tab bar is hidden inside this overlay
 * Used for both Personal and Business modes
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MessageSquare } from '@/shared/utils/icons';
import AppSearchBar, { AppSearchBarRef } from '@/shared/components/ui/AppSearchBar';
import AppButton from '@/shared/components/ui/AppButton';
import FilterBar from '@/features/search/components/FilterBar';
import MessageCard from '@/features/inbox/components/MessageCard';
import NewChatModalList from '@/features/inbox/components/NewChatModalList';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useProfileStore } from '@/shared/store/profileStore';
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
    companyId: 'comp-1',
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
    companyId: 'comp-1',
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
    companyId: 'comp-1',
    locationId: null,
    status: 'seen' as const,
    isOutgoing: false,
  },
  {
    id: '4',
    name: 'Mike Chen',
    type: 'client' as const,
    lastMessage: 'Video call ended (15 min)',
    messageType: 'video_call' as const,
    timestamp: '2025-01-16T09:00:00Z',
    unreadCount: 0,
    avatar: 'https://picsum.photos/seed/mike/40/40',
    companyId: 'comp-1',
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
    companyId: 'comp-1',
    locationId: 'loc-1',
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
    companyId: 'comp-1',
    locationId: null,
    status: 'delivered' as const,
    isOutgoing: true,
  },
  {
    id: '7',
    name: 'Global Distributors',
    type: 'client' as const,
    lastMessage: 'Voice Note',
    messageType: 'voice_note' as const,
    timestamp: '2025-01-15T15:45:00Z',
    unreadCount: 1,
    avatar: 'https://picsum.photos/seed/global/40/40',
    companyId: 'comp-1',
    locationId: null,
    status: 'sent' as const,
    isOutgoing: false,
  },
];

export default function InboxOverlayScreen() {
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const chatTypes = ['all', 'unread', 'direct', 'group'];
  const [filter, setFilter] = useState('all');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const { theme: appTheme } = useTheme();
  const { setInboxUnreadCount } = useNotifications();
  const searchBarRef = useRef<AppSearchBarRef>(null);
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;

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
  
  // Detect if we're in personal or business mode
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const isPersonalMode = !activeBusiness;
  
  // Use profileStore for role checks
  const isAdmin = useProfileStore((state) => state.isAdmin);

  // Filter chats based on mode, company, filter, and search
  const filteredChats = useMemo(() => {
    // Select the appropriate chat list based on mode
    let chats: any[] = isPersonalMode ? mockPersonalChats : mockBusinessChats;

    // Filter by company only in business mode (personal chats don't have companyId)
    if (!isPersonalMode && activeBusiness) {
      chats = chats.filter((chat: any) => chat.companyId === activeBusiness.id);
    }

    // Apply type filter - handle differently for personal vs business mode
    if (filter === 'unread') {
      chats = chats.filter(chat => chat.unreadCount > 0);
    } else if (filter === 'direct') {
      if (isPersonalMode) {
        chats = chats.filter(chat => !chat.isGroup && chat.type !== 'group');
      } else {
        chats = chats.filter(chat => chat.type === 'client' || chat.type === 'supplier');
      }
    } else if (filter === 'group') {
      if (isPersonalMode) {
        chats = chats.filter(chat => chat.isGroup || chat.type === 'group');
      } else {
        chats = chats.filter(chat => chat.type === 'internal');
      }
    }

    // Apply search filter
    if (search) {
      chats = chats.filter(chat =>
        chat.name.toLowerCase().includes(search.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(search.toLowerCase())
      );
    }

    return chats;
  }, [search, filter, activeBusiness, isPersonalMode]);

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
    // Determine if it's a group chat based on mode and type
    const isGroupChat = isPersonalMode 
      ? (chat.isGroup || chat.type === 'group')
      : (chat.type === 'internal');
    
    // Determine partner type based on mode
    const partnerType = isPersonalMode
      ? (chat.type === 'business' ? 'business' : 'user')
      : (chat.type === 'client' ? 'business' : 'user');
    
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

  const handleBack = () => {
    navigation.goBack();
  };

  const handleScroll = () => {
    if (searchBarRef.current?.isFocused()) {
      searchBarRef.current?.blur();
    }
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
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        onScrollBeginDrag={handleScroll}
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
          </Animated.View>
        )}
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
      />

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

