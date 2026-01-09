import React, { useState, useMemo, ReactNode } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Image } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useNavigation } from '@react-navigation/native';
import ModalList, { ModalListItem } from '@/shared/components/ui/ModalList';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';

interface NewChatModalListProps {
  visible: boolean;
  onClose: () => void;
  onNewGroup: () => void;
  onNewContact: () => void;
  canManageExternal?: boolean;
}

// Extended ModalListItem with custom properties
interface ExtendedModalListItem extends ModalListItem {
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

  // Convert data to ModalListItem format and combine with action options
  const modalItems = useMemo(() => {
    const actionItems: ExtendedModalListItem[] = [
      {
        id: 'new-group',
        title: 'New group',
        subtitle: 'Create a group conversation',
        icon: 'people',
        iconColor: appTheme.colors.primary,
        backgroundColor: appTheme.colors.primary + '10',
        isAction: true, // Custom property to identify action items
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

    // Convert companies to ModalListItem format
    const companyItems: ExtendedModalListItem[] = MOCK_COMPANIES.map(company => ({
      id: company.id,
      title: company.name,
      subtitle: company.location,
      avatar: company.logo,
      icon: !company.logo ? 'business' : undefined,
      iconColor: appTheme.colors.textLight,
      type: 'company',
      originalData: company,
    }));

    // Convert contacts to ModalListItem format
    const contactItems: ExtendedModalListItem[] = MOCK_CONTACTS.map(contact => ({
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

  const handleItemSelect = (item: ExtendedModalListItem) => {
    // Handle action items
    if (item.isAction) {
      if (item.id === 'new-group') {
        onNewGroup();
      } else if (item.id === 'new-contact') {
        onNewContact();
      }
      onClose(); // Close modal after action
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
    onClose(); // Close modal after navigation
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const renderCustomItem = (item: ExtendedModalListItem, index: number): ReactNode => {
    const isLast = index === filteredItems.length - 1;

    // Custom rendering for action items
    if (item.isAction) {
      return (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.actionItem,
            {
              backgroundColor: item.backgroundColor,
              borderBottomColor: appTheme.colors.borderColor,
            },
            isLast && styles.lastItem,
          ]}
          onPress={() => handleItemSelect(item)}
        >
          <View style={styles.actionContent}>
            <View style={[styles.actionIconContainer, { backgroundColor: appTheme.colors.primary }]}>
              <Icon name={item.icon as any} size={20} color="white" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={[styles.actionTitle, { color: appTheme.colors.text }]}>
                {item.title}
              </Text>
              <Text style={[styles.actionSubtitle, { color: appTheme.colors.textLight }]}>
                {item.subtitle}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Default rendering for contacts and companies
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.regularItem,
          {
            borderBottomColor: appTheme.colors.borderColor,
          },
          isLast && styles.lastItem,
        ]}
        onPress={() => handleItemSelect(item)}
      >
        <View style={styles.itemRow}>
          {/* Avatar or Icon */}
          {item.avatar ? (
            <Image 
              source={{ uri: item.avatar }} 
              style={styles.modalItemAvatar}
            />
          ) : (
            <View style={[
              styles.modalItemAvatarPlaceholder,
              { backgroundColor: appTheme.colors.inputBackground }
            ]}>
              <Icon 
                name={item.icon || 'person'} 
                size={24} 
                color={item.iconColor || appTheme.colors.textLight} 
              />
            </View>
          )}
          
          {/* Item info */}
          <View style={styles.modalItemInfo}>
            <Text style={[
              styles.modalItemName,
              { color: appTheme.colors.text }
            ]}>
              {item.title}
            </Text>
            {item.subtitle && (
              <Text style={[
                styles.modalItemDetails,
                { color: appTheme.colors.textLight }
              ]}>
                {item.subtitle}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
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

  return (
    <ModalList
      visible={visible}
      onClose={onClose}
      title="New chat"
      items={filteredItems as ModalListItem[]}
      onSelectItem={handleItemSelect as (item: ModalListItem) => void}
      hasSearch={true}
      searchPlaceholder="Search contacts, companies..."
      onSearchChange={handleSearchChange}
      renderItem={renderCustomItem as (item: ModalListItem, index: number) => ReactNode}
      renderEmptyState={renderEmptyState as () => ReactNode}
      maxHeight={undefined} // Let it auto-calculate based on content
      containerStyle={styles.modalContainer}
    />
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    paddingBottom: 40,
  },
  actionItem: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginHorizontal: 12,
    borderBottomWidth: 0.5,
    marginBottom: 8,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
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
  regularItem: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginHorizontal: 12,
    borderBottomWidth: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalItemAvatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  modalItemAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemName: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
    marginBottom: 2,
  },
  modalItemDetails: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
  },
}); 