import React, { useState, useMemo, useEffect, useCallback, ReactNode } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import AppButton from '@/shared/components/ui/AppButton';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { ListItemCard, EmptyState } from '@/shared/components/ui';
import theme from '@/shared/theme';
import {
  createChat,
  createUserChat,
  getCompanyMembers,
  searchContacts,
  CompanyMember,
  ContactSearchResult,
} from '../inbox.service';
import { useProfileStore } from '@/shared/store/profileStore';

// ============================================================================
// TYPES
// ============================================================================

interface NewChatModalListProps {
  visible: boolean;
  onClose: () => void;
  onNewGroup: () => void;
  onNewContact: () => void;
  canManageExternal?: boolean;
  companyId?: string;
}

interface ChatListItem {
  id: string;
  title: string;
  subtitle?: string;
  avatar?: string | null;
  icon?: string;
  iconColor?: string;
  type?: 'user' | 'business' | 'contact';
  is_connected?: boolean;
  originalData?: any;
}

interface ContactSection {
  title: string;
  data: ChatListItem[];
}

// ============================================================================
// HIGHLIGHTED TEXT COMPONENT
// ============================================================================

function HighlightedText({
  text,
  highlight,
  primaryColor,
  secondaryColor,
}: {
  text: string;
  highlight: string;
  primaryColor: string;
  secondaryColor: string;
}) {
  if (!highlight.trim()) {
    return (
      <Text style={{ fontSize: 16, fontFamily: theme.fonts.primary.bold, color: secondaryColor }} numberOfLines={1}>
        {text}
      </Text>
    );
  }

  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <Text numberOfLines={1}>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <Text
            key={i}
            style={{ fontSize: 16, fontFamily: theme.fonts.primary.bold, color: primaryColor }}
          >
            {part}
          </Text>
        ) : (
          <Text
            key={i}
            style={{ fontSize: 16, fontFamily: theme.fonts.primary.medium, color: secondaryColor }}
          >
            {part}
          </Text>
        )
      )}
    </Text>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function NewChatModalList({
  visible,
  onClose,
  onNewGroup,
  onNewContact,
  canManageExternal = false,
  companyId,
}: NewChatModalListProps) {
  const { theme: appTheme } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [allContacts, setAllContacts] = useState<ContactSearchResult[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const currentUser = useProfileStore((state) => state.currentUser);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSelectedContactIds([]);
    }
  }, [visible]);

  // Fetch company members when modal opens with a companyId
  useEffect(() => {
    if (!visible) return;
    if (!companyId) {
      setMembers([]);
      return;
    }

    let cancelled = false;
    setLoadingMembers(true);

    getCompanyMembers(companyId)
      .then((data) => {
        if (!cancelled) {
          const filtered = data.filter(m => m.user && m.userId !== currentUser?.id);
          setMembers(filtered);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[NewChatModalList] Failed to load members:', err);
          setMembers([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMembers(false);
      });

    return () => { cancelled = true; };
  }, [visible, companyId, currentUser?.id]);

  // Fetch all contacts (users + businesses) for connection status
  // Gracefully handle 404 if endpoint is not available on the server
  useEffect(() => {
    if (!visible || !currentUser?.id) return;

    let cancelled = false;

    searchContacts(currentUser.id)
      .then((data) => {
        if (!cancelled) setAllContacts(data);
      })
      .catch(() => {
        // Endpoint may not exist on remote server yet - silently ignore
        if (!cancelled) setAllContacts([]);
      });

    return () => { cancelled = true; };
  }, [visible, currentUser?.id]);

  // Build contact items from company members + all contacts
  const contactItems = useMemo((): ChatListItem[] => {
    if (companyId && members.length > 0) {
      const memberIds = new Set(members.map(m => m.userId));

      const memberItems: ChatListItem[] = members.map(member => ({
        id: member.userId,
        title: member.user?.name || 'Unknown',
        subtitle: member.role,
        avatar: member.user?.avatar || undefined,
        icon: !member.user?.avatar ? 'person' : undefined,
        iconColor: appTheme.colors.textSecondary,
        type: 'contact' as const,
        is_connected: true,
        originalData: member,
      }));

      // Add non-member contacts from allContacts (outside connections)
      const outsideItems: ChatListItem[] = allContacts
        .filter(c => !memberIds.has(c.id) && c.id !== currentUser?.id)
        .map(c => ({
          id: c.id,
          title: c.name,
          subtitle: c.type === 'business' ? 'Business' : (c.role || c.email || ''),
          avatar: c.avatar,
          icon: c.type === 'business' ? 'business' : (!c.avatar ? 'person' : undefined),
          iconColor: appTheme.colors.textSecondary,
          type: c.type as 'user' | 'business',
          is_connected: false,
          originalData: c,
        }));

      return [...memberItems, ...outsideItems];
    }

    // Personal mode or no company: use allContacts directly
    if (allContacts.length > 0) {
      return allContacts
        .filter(c => c.id !== currentUser?.id)
        .map(c => ({
          id: c.id,
          title: c.name,
          subtitle: c.type === 'business' ? 'Business' : (c.role || c.email || ''),
          avatar: c.avatar,
          icon: c.type === 'business' ? 'business' : (!c.avatar ? 'person' : undefined),
          iconColor: appTheme.colors.textSecondary,
          type: c.type as 'user' | 'business',
          is_connected: c.is_connected,
          originalData: c,
        }));
    }

    // Fallback: use company members if allContacts failed to load
    if (members.length > 0) {
      return members.map(member => ({
        id: member.userId,
        title: member.user?.name || 'Unknown',
        subtitle: member.role,
        avatar: member.user?.avatar || undefined,
        icon: !member.user?.avatar ? 'person' : undefined,
        iconColor: appTheme.colors.textSecondary,
        type: 'contact' as const,
        is_connected: true,
        originalData: member,
      }));
    }

    return [];
  }, [members, allContacts, companyId, currentUser?.id, appTheme.colors.textSecondary]);

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contactItems;
    const query = searchQuery.toLowerCase();
    return contactItems.filter(item => {
      const titleMatch = item.title.toLowerCase().includes(query);
      const subtitleMatch = item.subtitle?.toLowerCase().includes(query);
      return titleMatch || subtitleMatch;
    });
  }, [contactItems, searchQuery]);

  // Build sections: when searching, split into connections + outside
  // When not searching, group alphabetically by first letter
  const sections = useMemo((): ContactSection[] => {
    if (searchQuery.trim()) {
      const connected = filteredContacts
        .filter(c => c.is_connected)
        .sort((a, b) => a.title.localeCompare(b.title));
      const outside = filteredContacts
        .filter(c => !c.is_connected)
        .sort((a, b) => a.title.localeCompare(b.title));

      const result: ContactSection[] = [];
      if (connected.length > 0) {
        result.push({ title: 'Connections', data: connected });
      }
      if (outside.length > 0) {
        result.push({ title: 'Outside connections', data: outside });
      }
      return result;
    }

    // Group alphabetically
    const sorted = [...filteredContacts].sort((a, b) => a.title.localeCompare(b.title));
    const grouped: Record<string, ChatListItem[]> = {};

    for (const item of sorted) {
      const letter = (item.title[0] || '#').toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(item);
    }

    return Object.keys(grouped)
      .sort()
      .map(letter => ({ title: letter, data: grouped[letter] }));
  }, [filteredContacts, searchQuery]);

  // Dynamic title based on selection count
  const modalTitle = selectedContactIds.length >= 2 ? 'New group chat' : 'New chat';
  const buttonText = selectedContactIds.length >= 2 ? 'Start group conversation' : 'Start conversation';
  const isButtonEnabled = selectedContactIds.length > 0;

  // Toggle contact selection
  const toggleContact = useCallback((id: string) => {
    setSelectedContactIds(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  }, []);

  // Handle action item press
  const handleActionPress = useCallback((actionId: string) => {
    if (actionId === 'new-group') {
      onNewGroup();
    } else if (actionId === 'new-contact') {
      onNewContact();
    }
    onClose();
  }, [onNewGroup, onNewContact, onClose]);

  // Handle start conversation button
  const handleStartConversation = useCallback(async () => {
    if (selectedContactIds.length === 0) return;

    if (selectedContactIds.length >= 2) {
      onClose();
      (navigation as any).navigate('CreateGroupChat', {
        selectedContactIds,
        companyId,
      });
      return;
    }

    // Single contact - create direct chat
    const contactId = selectedContactIds[0];
    const contact = contactItems.find(c => c.id === contactId);
    if (!contact) return;

    setIsCreating(true);
    try {
      if (companyId) {
        // Determine chat type based on contact relationship
        const chatType = contact.is_connected ? 'internal' :
                         contact.type === 'business' ? 'client' : 'direct';
        const newChat = await createChat({
          companyId,
          type: chatType,
          name: contact.title || 'Chat',
          participants: [contactId],
          partnerId: contactId,
          partnerType: contact.type === 'business' ? 'business' : 'user',
        });
        onClose();
        (navigation as any).navigate('Chat', {
          id: newChat.id,
          name: newChat.name,
          isGroup: false,
          avatar: contact.avatar,
          partnerId: contactId,
          partnerType: contact.type === 'business' ? 'business' : 'user',
          unreadCount: 0,
        });
      } else if (currentUser?.id) {
        const newChat = await createUserChat({
          userId: currentUser.id,
          type: 'direct',
          name: contact.title || 'Chat',
          participants: [contactId],
        });
        onClose();
        (navigation as any).navigate('Chat', {
          id: newChat.id,
          name: newChat.name,
          isGroup: false,
          avatar: contact.avatar,
          partnerId: contactId,
          partnerType: contact.type === 'business' ? 'business' : 'user',
          unreadCount: 0,
        });
      } else {
        Alert.alert('Error', 'No user context available. Please log in again.');
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
      Alert.alert('Error', 'Failed to create chat. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }, [selectedContactIds, contactItems, companyId, currentUser?.id, onClose, navigation]);

  // Render a single contact item with checkbox
  const renderContactItem = (item: ChatListItem, isLast: boolean) => {
    const isSelected = selectedContactIds.includes(item.id);

    // Build title element - highlighted when searching
    const titleElement = searchQuery.trim() ? (
      <HighlightedText
        text={item.title}
        highlight={searchQuery}
        primaryColor={appTheme.colors.primary}
        secondaryColor={appTheme.colors.textSecondary}
      />
    ) : undefined;

    return (
      <ListItemCard
        key={item.id}
        avatar={
          item.avatar
            ? { type: 'image', imageUri: item.avatar, userId: item.id, userName: item.title }
            : {
                type: 'icon',
                icon: item.icon || 'person',
                iconColor: item.iconColor || appTheme.colors.textSecondary,
                backgroundColor: appTheme.colors.inputBackground,
              }
        }
        title={titleElement ? '' : item.title}
        subtitle={titleElement ? (
          <View>
            {titleElement}
            {item.subtitle ? (
              <Text style={[styles.contactSubtitle, { color: appTheme.colors.textMuted }]}>
                {item.subtitle}
              </Text>
            ) : null}
          </View>
        ) : item.subtitle}
        onPress={() => toggleContact(item.id)}
        showCheckmark={true}
        selected={isSelected}
        showDivider={!isLast}
      />
    );
  };

  // Render all contact sections
  const renderContactSections = () => {
    if (sections.length === 0) return null;

    return sections.map((section, sIdx) => (
      <View key={section.title}>
        {/* Section header */}
        <View style={[styles.sectionHeader, { backgroundColor: appTheme.colors.cardBackground }]}>
          <Text style={[styles.sectionHeaderText, { color: appTheme.colors.textSecondary }]}>
            {section.title}
          </Text>
        </View>
        {/* Section items */}
        {section.data.map((item, idx) =>
          renderContactItem(item, idx === section.data.length - 1 && sIdx === sections.length - 1)
        )}
      </View>
    ));
  };

  const hasContacts = filteredContacts.length > 0;

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title={modalTitle}
    >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <AppSearchBar
          placeholder="Search contacts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
          containerStyle={{ marginHorizontal: 0, marginBottom: 0 }}
        />
      </View>

      {/* Scrollable Content: Action Items + Contact List */}
      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Action Items (hidden during search) */}
        {!searchQuery.trim() && (
          <View>
            <ListItemCard
              avatar={{
                type: 'icon',
                icon: 'people',
                iconColor: 'white',
                backgroundColor: appTheme.colors.primary,
              }}
              title="New group"
              subtitle="Create a group conversation"
              onPress={() => handleActionPress('new-group')}
              showDivider={true}
            />
            <ListItemCard
              avatar={{
                type: 'icon',
                icon: 'person-add',
                iconColor: 'white',
                backgroundColor: appTheme.colors.primary,
              }}
              title="New conversation"
              subtitle="Start a new conversation"
              onPress={() => handleActionPress('new-contact')}
              showDivider={false}
            />
          </View>
        )}

        {/* Contact List */}
        {loadingMembers ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={appTheme.colors.primary} />
            <Text style={[styles.loadingText, { color: appTheme.colors.textSecondary }]}>
              Loading contacts...
            </Text>
          </View>
        ) : hasContacts ? (
          renderContactSections()
        ) : (
          <EmptyState
            iconName="people-outline"
            title="No contacts available"
            subtitle="Add businesses or team members to start conversations."
            ctaLabel="Invite contacts"
            onCtaPress={onNewContact}
            compact
            testID="empty-new-chat-list"
          />
        )}
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom || 16, borderTopColor: appTheme.colors.surface }]}>
        <AppButton
          title={buttonText}
          onPress={handleStartConversation}
          variant={isButtonEnabled ? 'primary' : 'disabled'}
          disabled={!isButtonEnabled || isCreating}
          loading={isCreating}
        />
      </View>
    </AppBottomSheet>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  listContainer: {
    maxHeight: 450,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionHeaderText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 12,
  },
  bottomButtonContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
