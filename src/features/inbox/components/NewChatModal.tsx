import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  FlatList,
  ScrollView,
  TextInput,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import Avatar from '@/shared/components/ui/Avatar';
import theme from '@/shared/theme';

interface NewChatModalProps {
  visible: boolean;
  onClose: () => void;
  onNewGroup: () => void;
  onNewContact: () => void;
  canManageExternal?: boolean;
}

// Mock data for companies
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

// Mock data for users/contacts
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

export default function NewChatModal({
  visible,
  onClose,
  onNewGroup,
  onNewContact,
  canManageExternal = false,
}: NewChatModalProps) {
  const { theme: appTheme } = useTheme();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Animation values - slide up from bottom to very top
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(800)).current;

  useEffect(() => {
    if (visible) {
      overlayOpacity.setValue(0);
      contentTranslateY.setValue(800);
      
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 800,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleNewGroup = () => {
    onNewGroup();
    handleClose();
  };

  const handleNewContact = () => {
    onNewContact();
    handleClose();
  };

  const handleItemPress = (item: any) => {
    if (item.type === 'company') {
      // Navigate to chat with company
      (navigation as any).navigate('Chat', {
        id: item.id,
        name: item.name,
        isGroup: false,
        avatar: item.logo,
        partnerId: item.id,
        partnerType: 'business',
        unreadCount: 0,
      });
    } else if (item.type === 'contact') {
      // Navigate to chat with contact
      (navigation as any).navigate('Chat', {
        id: item.id,
        name: item.name,
        isGroup: false,
        avatar: item.avatar,
        partnerId: item.id,
        partnerType: 'user',
        unreadCount: 0,
      });
    }
    handleClose();
  };

  // Combine and sort all items by name descending
  const getAllItems = () => {
    const allItems = [...MOCK_COMPANIES, ...MOCK_CONTACTS];
    return allItems.sort((a, b) => b.name.localeCompare(a.name));
  };

  // Filter items based on search query
  const getFilteredItems = () => {
    const allItems = getAllItems();
    if (!searchQuery) return allItems;
    
    return allItems.filter(item => {
      if (item.type === 'company') {
        return item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               item.location.toLowerCase().includes(searchQuery.toLowerCase());
      } else {
        return item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               item.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
               item.role.toLowerCase().includes(searchQuery.toLowerCase());
      }
    });
  };

  const filteredItems = getFilteredItems();

  const renderItem = (item: any, index: number) => {
    const isLast = index === filteredItems.length - 1;
    
    return (
      <TouchableOpacity 
        key={item.id}
        style={[
          styles.modalItem, 
          { borderBottomColor: appTheme.colors.borderColor },
          isLast && styles.modalItemLast // Remove bottom border for last item
        ]}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.staffRow}>
          {item.type === 'company' ? (
            <View style={[styles.modalItemAvatarPlaceholder, { backgroundColor: appTheme.colors.inputBackground }]}>
              <Icon name="business-outline" size={24} color={appTheme.colors.textLight} />
            </View>
          ) : (
            <Avatar
              userId={item.id}
              userName={item.name}
              imageUri={item.avatar}
              size={64}
              style={styles.modalItemAvatar}
            />
          )}
          <View style={styles.modalItemInfo}>
            <Text style={[styles.modalItemName, { color: appTheme.colors.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.modalItemDetails, { color: appTheme.colors.textLight }]}>
              {item.type === 'company' ? item.location : `${item.role} • ${item.company}`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
      animationType="none"
    >
      <Animated.View style={[styles.modalContainer, { opacity: overlayOpacity }]}>
        <TouchableOpacity 
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View style={[
          styles.modalContent, 
          { 
            backgroundColor: appTheme.colors.surface,
            transform: [{ translateY: contentTranslateY }] 
          }
        ]}>
          <SafeAreaView style={styles.safeArea} edges={['top']}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: appTheme.colors.borderColor }]}>
              <Text style={[styles.modalTitle, { color: appTheme.colors.text }]}>
                New chat
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <Icon name="close" size={24} color={appTheme.colors.textLight} />
              </TouchableOpacity>
            </View>
          
          {/* Search Bar */}
          <View style={styles.searchBarContainer}>
            <View style={[styles.customSearchBar, { backgroundColor: appTheme.colors.inputBackground }]}>
              <Icon name="search" size={20} color={appTheme.colors.textLight} style={styles.searchIcon} />
              <TextInput
                style={[styles.customSearchInput, { color: appTheme.colors.text }]}
                placeholder="Search contacts, companies..."
                placeholderTextColor={appTheme.colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Icon name="close-circle" size={20} color={appTheme.colors.textLight} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          
          {/* Scrollable Content with Options and List */}
          <ScrollView 
            style={styles.listContainer} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Options inside scrollable area */}
            <View style={styles.optionsContainer}>
              <TouchableOpacity 
                style={styles.optionItem}
                onPress={handleNewGroup}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: appTheme.colors.primary }]}>
                  <Icon name="people" size={20} color="white" />
                </View>
                <Text style={[styles.optionText, { color: appTheme.colors.text }]}>
                  New group
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.optionItem, { marginTop: 16 }]}
                onPress={handleNewContact}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: appTheme.colors.primary }]}>
                  <Icon name="person-add" size={20} color="white" />
                </View>
                <Text style={[styles.optionText, { color: appTheme.colors.text }]}>
                  New contact
                </Text>
              </TouchableOpacity>
            </View>

            {/* Combined List */}
            <View style={styles.contactsList}>
              {filteredItems.map((item, index) => renderItem(item, index))}
              
              {/* Empty state */}
              {searchQuery && filteredItems.length === 0 && (
                <View style={styles.emptyState}>
                  <Icon name="search" size={48} color={appTheme.colors.textLight} />
                  <Text style={[styles.emptyStateText, { color: appTheme.colors.textLight }]}>
                    No results found
                  </Text>
                  <Text style={[styles.emptyStateSubtext, { color: appTheme.colors.textLight }]}>
                    Try searching with different keywords
                  </Text>
                </View>
              )}
                         </View>
          </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlay: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 0,
    paddingBottom: 0,
    overflow: 'visible',
  },
  safeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.primary.bold,
  },
  searchBarContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  customSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 0,
  },
  searchIcon: {
    marginRight: 8,
  },
  customSearchInput: {
    flex: 1,
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.regular,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 0,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  optionsContainer: {
    paddingBottom: 24,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 8,
    marginHorizontal: 12,
    borderBottomWidth: 0.5,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  optionText: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
  },
  contactsList: {
    flex: 1,
  },
  modalItem: {
    height: 60,
    justifyContent: 'center',
    marginHorizontal: 12,
    borderBottomWidth: 0.5,
  },
  modalItemLast: {
    borderBottomWidth: 0,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 8,
  },
  modalItemAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalItemAvatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
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
  },
}); 