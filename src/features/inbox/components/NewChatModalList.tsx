import React, { useState, useMemo, ReactNode } from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useNavigation } from '@react-navigation/native';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { ListItemCard } from '@/shared/components/ui';
import theme from '@/shared/theme';

interface NewChatModalListProps {
  visible: boolean;
  onClose: () => void;
  onNewGroup: () => void;
  onNewContact: () => void;
  canManageExternal?: boolean;
}

// Item type for the list
interface ChatListItem {
  id: string;
  title: string;
  subtitle?: string;
  avatar?: string;
  icon?: string;
  iconColor?: string;
  backgroundColor?: string;
  isAction?: boolean;
  type?: 'company' | 'contact';
  originalData?: any;
}

// Mock data for companies - same as original
const MOCK_COMPANIES = [
  {
    id: 'comp-1',
    name: 'ABC Corporation',
    logo: 'https://picsum.photos/seed/abc/40/40',
    location: 'New York, NY',
    type: 'company' as const,
  },
  {
    id: 'comp-2',
    name: 'XYZ Suppliers',
    logo: 'https://picsum.photos/seed/xyz/40/40',
    location: 'Los Angeles, CA',
    type: 'company' as const,
  },
  {
    id: 'comp-3',
    name: 'Tech Solutions Ltd',
    logo: 'https://picsum.photos/seed/tech/40/40',
    location: 'San Francisco, CA',
    type: 'company' as const,
  },
  {
    id: 'comp-4',
    name: 'Global Industries',
    logo: 'https://picsum.photos/seed/global/40/40',
    location: 'Chicago, IL',
    type: 'company' as const,
  },
  {
    id: 'comp-5',
    name: 'Best Suppliers Inc',
    logo: 'https://picsum.photos/seed/best/40/40',
    location: 'Miami, FL',
    type: 'company' as const,
  },
];

// Mock data for users/contacts - same as original
const MOCK_CONTACTS = [
  {
    id: 'user-1',
    name: 'Sarah Johnson',
    avatar: 'https://picsum.photos/seed/sarah/40/40',
    role: 'Account Manager',
    company: 'ABC Corporation',
    type: 'contact' as const,
  },
  {
    id: 'user-2',
    name: 'Mike Chen',
    avatar: 'https://picsum.photos/seed/mike/40/40',
    role: 'Sales Director',
    company: 'XYZ Suppliers',
    type: 'contact' as const,
  },
  {
    id: 'user-3',
    name: 'Emma Davis',
    avatar: 'https://picsum.photos/seed/emma/40/40',
    role: 'Project Manager',
    company: 'Tech Solutions Ltd',
    type: 'contact' as const,
  },
  {
    id: 'user-4',
    name: 'James Wilson',
    avatar: 'https://picsum.photos/seed/james/40/40',
    role: 'Operations Lead',
    company: 'Global Industries',
    type: 'contact' as const,
  },
  {
    id: 'user-5',
    name: 'Lisa Martinez',
    avatar: 'https://picsum.photos/seed/lisa/40/40',
    role: 'Business Development',
    company: 'Best Suppliers Inc',
    type: 'contact' as const,
  },
];

export default function NewChatModalList({
  visible,
  onClose,
  onNewGroup,
  onNewContact,
  canManageExternal = false,
}: NewChatModalListProps) {
  const { theme: appTheme } = useTheme();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');

  // Convert data to list item format and combine with action options
  const modalItems = useMemo(() => {
    const actionItems: ChatListItem[] = [
      {
        id: 'new-group',
        title: 'New group',
        subtitle: 'Create a group conversation',
        icon: 'people',
        iconColor: appTheme.colors.primary,
        backgroundColor: appTheme.colors.primary + '10',
        isAction: true,
      },
      {
        id: 'new-contact',
        title: 'New contact',
        subtitle: 'Start a new conversation',
        icon: 'person-add',
        iconColor: appTheme.colors.primary,
        backgroundColor: appTheme.colors.primary + '10',
        isAction: true,
      },
    ];

    // Convert companies to list item format
    const companyItems: ChatListItem[] = MOCK_COMPANIES.map(company => ({
      id: company.id,
      title: company.name,
      subtitle: company.location,
      avatar: company.logo,
      icon: !company.logo ? 'business' : undefined,
      iconColor: appTheme.colors.textLight,
      type: 'company',
      originalData: company,
    }));

    // Convert contacts to list item format
    const contactItems: ChatListItem[] = MOCK_CONTACTS.map(contact => ({
      id: contact.id,
      title: contact.name,
      subtitle: `${contact.role} • ${contact.company}`,
      avatar: contact.avatar,
      icon: !contact.avatar ? 'person' : undefined,
      iconColor: appTheme.colors.textLight,
      type: 'contact',
      originalData: contact,
    }));

    // Combine all items: actions first, then sorted contacts and companies
    const allDataItems = [...companyItems, ...contactItems].sort((a, b) => 
      a.title.localeCompare(b.title)
    );

    return [...actionItems, ...allDataItems];
  }, [appTheme.colors.primary, appTheme.colors.textLight]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return modalItems;
    }

    const query = searchQuery.toLowerCase();
    
    return modalItems.filter(item => {
      // Always show action items
      if (item.isAction) {
        return true;
      }

      // Filter data items
      const titleMatch = item.title.toLowerCase().includes(query);
      const subtitleMatch = item.subtitle?.toLowerCase().includes(query);
      
      return titleMatch || subtitleMatch;
    });
  }, [modalItems, searchQuery]);

  const handleItemSelect = (item: ChatListItem) => {
    // Handle action items
    if (item.isAction) {
      if (item.id === 'new-group') {
        onNewGroup();
      } else if (item.id === 'new-contact') {
        onNewContact();
      }
      onClose();
      return;
    }

    // Handle contact/company selection
    const originalData = item.originalData;
    if (!originalData) return;

    if (item.type === 'company') {
      // Navigate to chat with company
      (navigation as any).navigate('Chat', {
        id: originalData.id,
        name: originalData.name,
        isGroup: false,
        avatar: originalData.logo,
        partnerId: originalData.id,
        partnerType: 'business',
        unreadCount: 0,
      });
    } else if (item.type === 'contact') {
      // Navigate to chat with contact
      (navigation as any).navigate('Chat', {
        id: originalData.id,
        name: originalData.name,
        isGroup: false,
        avatar: originalData.avatar,
        partnerId: originalData.id,
        partnerType: 'user',
        unreadCount: 0,
      });
    }
    onClose();
  };

  const renderItem = (item: ChatListItem, index: number): ReactNode => {
    const isLast = index === filteredItems.length - 1;

    // Custom rendering for action items
    if (item.isAction) {
      return (
        <ListItemCard
          key={item.id}
          avatar={{
            type: 'icon',
            icon: item.icon || 'person',
            iconColor: 'white',
            backgroundColor: appTheme.colors.primary,
          }}
          title={item.title}
          subtitle={item.subtitle}
          onPress={() => handleItemSelect(item)}
          showDivider={!isLast}
          style={{ backgroundColor: item.backgroundColor, marginBottom: 8 }}
        />
      );
    }

    // Default rendering for contacts and companies
    return (
      <ListItemCard
        key={item.id}
        avatar={item.avatar 
          ? { type: 'image', imageUri: item.avatar, userId: item.id, userName: item.title }
          : { type: 'icon', icon: item.icon || 'person', iconColor: item.iconColor || appTheme.colors.textSecondary, backgroundColor: appTheme.colors.inputBackground }
        }
        title={item.title}
        subtitle={item.subtitle}
        onPress={() => handleItemSelect(item)}
        showDivider={!isLast}
      />
    );
  };

  const renderEmptyState = (): ReactNode => (
    <View style={styles.emptyState}>
      <Icon name="search" size={48} color={appTheme.colors.textLight} />
      <Text style={[styles.emptyStateText, { color: appTheme.colors.textLight }]}>
        No results found
      </Text>
      <Text style={[styles.emptyStateSubtext, { color: appTheme.colors.textLight }]}>
        Try searching with different keywords
      </Text>
    </View>
  );

  // Check if we have non-action items to show
  const hasDataItems = filteredItems.some(item => !item.isAction);

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title="New chat"
    >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <AppSearchBar
          placeholder="Search contacts, companies..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />
      </View>

      {/* List Content */}
      <ScrollView 
        style={styles.listContainer} 
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredItems.length > 0 ? (
          filteredItems.map((item, index) => renderItem(item, index))
        ) : (
          renderEmptyState()
        )}

        {/* Show empty state when search has no results (except action items) */}
        {searchQuery.trim() && !hasDataItems && filteredItems.length > 0 && (
          renderEmptyState()
        )}
      </ScrollView>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  listContainer: {
    maxHeight: 450,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
