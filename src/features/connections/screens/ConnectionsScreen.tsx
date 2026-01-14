/**
 * ConnectionsScreen
 * Shows list of users and companies connected with the profile owner
 * Includes filter to show All, Users, or Companies
 * Following design.json specifications - connectionsScreen section
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import Avatar from '@/shared/components/ui/Avatar';
import { RootStackParamList } from '@/shared/types/navigation';

type ConnectionsScreenRouteProp = RouteProp<RootStackParamList, 'Connections'>;

// Filter options
type FilterType = 'all' | 'users' | 'companies';

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'users', label: 'Users' },
  { id: 'companies', label: 'Companies' },
];

// Connection type
type ConnectionType = 'user' | 'company';

interface BaseConnection {
  id: string;
  name: string;
  avatar_url: string;
  type: ConnectionType;
}

interface UserConnection extends BaseConnection {
  type: 'user';
  job_title?: string;
  company?: string;
}

interface CompanyConnection extends BaseConnection {
  type: 'company';
  industry?: string;
  description?: string;
}

type Connection = UserConnection | CompanyConnection;

// Mock user connections data
const mockUserConnections: UserConnection[] = [
  {
    id: 'user-101',
    name: 'Sarah Johnson',
    job_title: 'Sales Manager',
    company: 'NouPro Distribution',
    avatar_url: '',
    type: 'user',
  },
  {
    id: 'user-102',
    name: 'Michael Chen',
    job_title: 'Operations Director',
    company: 'Global Supply Co.',
    avatar_url: '',
    type: 'user',
  },
  {
    id: 'user-103',
    name: 'Emily Williams',
    job_title: 'Marketing Lead',
    company: 'Fresh Foods Ltd.',
    avatar_url: '',
    type: 'user',
  },
  {
    id: 'user-104',
    name: 'David Brown',
    job_title: 'Logistics Coordinator',
    company: 'Quick Delivery Services',
    avatar_url: '',
    type: 'user',
  },
  {
    id: 'user-105',
    name: 'Lisa Anderson',
    job_title: 'Procurement Manager',
    company: 'Island Retailers',
    avatar_url: '',
    type: 'user',
  },
];

// Mock company connections data
const mockCompanyConnections: CompanyConnection[] = [
  {
    id: 'biz-201',
    name: 'Fresh Foods Ltd.',
    industry: 'Food & Beverage',
    description: 'Premium food distribution across the island',
    avatar_url: '',
    type: 'company',
  },
  {
    id: 'biz-202',
    name: 'Quick Delivery Services',
    industry: 'Logistics',
    description: 'Fast and reliable delivery solutions',
    avatar_url: '',
    type: 'company',
  },
  {
    id: 'biz-203',
    name: 'Island Retailers',
    industry: 'Retail',
    description: 'Your one-stop shop for all retail needs',
    avatar_url: '',
    type: 'company',
  },
  {
    id: 'biz-204',
    name: 'Tech Solutions MU',
    industry: 'Technology',
    description: 'Innovative tech solutions for businesses',
    avatar_url: '',
    type: 'company',
  },
  {
    id: 'biz-205',
    name: 'Green Farms Co.',
    industry: 'Agriculture',
    description: 'Organic and sustainable farming products',
    avatar_url: '',
    type: 'company',
  },
];

// Combined mock connections
const allConnections: Connection[] = [...mockUserConnections, ...mockCompanyConnections];

export default function ConnectionsScreen() {
  const navigation = useNavigation();
  const route = useRoute<ConnectionsScreenRouteProp>();
  const { theme: appTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredConnections = useMemo(() => {
    let connections: Connection[] = [];
    
    // Filter by type
    switch (activeFilter) {
      case 'users':
        connections = mockUserConnections;
        break;
      case 'companies':
        connections = mockCompanyConnections;
        break;
      default:
        connections = allConnections;
    }

    // Filter by search query
    if (!searchQuery.trim()) return connections;
    
    const query = searchQuery.toLowerCase();
    return connections.filter((connection) => {
      if (connection.type === 'user') {
        return (
          connection.name.toLowerCase().includes(query) ||
          connection.job_title?.toLowerCase().includes(query) ||
          connection.company?.toLowerCase().includes(query)
        );
      } else {
        return (
          connection.name.toLowerCase().includes(query) ||
          connection.industry?.toLowerCase().includes(query) ||
          connection.description?.toLowerCase().includes(query)
        );
      }
    });
  }, [searchQuery, activeFilter]);

  const handleConnectionPress = (connection: Connection) => {
    if (connection.type === 'user') {
      // @ts-ignore
      navigation.navigate('ViewUserProfile', { userId: connection.id });
    } else {
      // @ts-ignore
      navigation.navigate('ViewBusinessProfile', { businessId: connection.id });
    }
  };

  // Header - design.json: headers.secondaryHeader (height: 56, title: 24px medium)
  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: appTheme.colors.background }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Icon name="chevron-back" size={32} color={appTheme.colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: appTheme.colors.text }]}>
        Connections
      </Text>
      <View style={styles.headerRightSpacer} />
    </View>
  );

  // Search bar - design.json: connectionsScreen.searchBar + components.inputs.searchInput
  const renderSearchBar = () => (
    <View 
      style={[
        styles.searchContainer, 
        { 
          backgroundColor: appTheme.colors.cardBackground,
          borderColor: isSearchFocused || searchQuery ? appTheme.colors.primary : appTheme.colors.borderColor,
        }
      ]}
    >
      <Icon 
        name="search" 
        size={20} 
        color={isSearchFocused || searchQuery ? appTheme.colors.primary : appTheme.colors.textMuted} 
      />
      <TextInput
        style={[
          styles.searchInput, 
          { 
            color: appTheme.colors.text,
            fontFamily: searchQuery ? theme.fonts.primary.semiBold : theme.fonts.primary.medium,
          }
        ]}
        placeholder="Search connections"
        placeholderTextColor={appTheme.colors.textMuted}
        value={searchQuery}
        onChangeText={setSearchQuery}
        onFocus={() => setIsSearchFocused(true)}
        onBlur={() => setIsSearchFocused(false)}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
          <Icon name="close-circle" size={20} color={appTheme.colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );

  // Filter bar - design.json: components.filterBar (full-width indicator)
  const renderFilterBar = () => (
    <View style={[styles.filterBar, { borderBottomColor: appTheme.colors.borderColor }]}>
      {FILTERS.map((filter) => {
        const isActive = activeFilter === filter.id;
        return (
          <TouchableOpacity
            key={filter.id}
            style={styles.filterTab}
            onPress={() => setActiveFilter(filter.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterTabText,
                { 
                  color: isActive ? appTheme.colors.text : appTheme.colors.textMuted,
                  fontFamily: isActive ? theme.fonts.primary.bold : theme.fonts.primary.medium,
                },
              ]}
            >
              {filter.label}
            </Text>
            {isActive && (
              <View style={[styles.filterIndicator, { backgroundColor: appTheme.colors.text }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // User connection item - design.json: connectionsScreen.listItem (avatarRadius: 24 for users)
  const renderUserItem = (item: UserConnection) => (
    <TouchableOpacity
      style={[styles.connectionItem, { borderBottomColor: appTheme.colors.borderColor }]}
      onPress={() => handleConnectionPress(item)}
      activeOpacity={0.7}
    >
      <Avatar
        userId={item.id}
        userName={item.name}
        imageUri={item.avatar_url}
        size={48}
        style={styles.userAvatar}
      />
      <View style={styles.connectionInfo}>
        <Text style={[styles.connectionName, { color: appTheme.colors.text }]}>
          {item.name}
        </Text>
        {item.job_title && (
          <Text style={[styles.connectionSubtitle, { color: appTheme.colors.secondary }]}>
            {item.job_title}
          </Text>
        )}
      </View>
      <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
    </TouchableOpacity>
  );

  // Company connection item - design.json: connectionsScreen.listItem (avatarRadius: 8 for companies)
  const renderCompanyItem = (item: CompanyConnection) => (
    <TouchableOpacity
      style={[styles.connectionItem, { borderBottomColor: appTheme.colors.borderColor }]}
      onPress={() => handleConnectionPress(item)}
      activeOpacity={0.7}
    >
      <Avatar
        userId={item.id}
        userName={item.name}
        imageUri={item.avatar_url}
        size={48}
        style={styles.companyAvatar}
      />
      <View style={styles.connectionInfo}>
        <Text style={[styles.connectionName, { color: appTheme.colors.text }]}>
          {item.name}
        </Text>
        {item.industry && (
          <Text style={[styles.connectionSubtitle, { color: appTheme.colors.secondary }]}>
            {item.industry}
          </Text>
        )}
      </View>
      <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
    </TouchableOpacity>
  );

  const renderConnectionItem = ({ item }: { item: Connection }) => {
    if (item.type === 'user') {
      return renderUserItem(item);
    }
    return renderCompanyItem(item);
  };

  // Empty state - design.json: connectionsScreen.emptyState
  const renderEmptyState = () => {
    let emptyMessage = 'Connect with users and companies to grow your network';
    let emptyTitle = 'No connections yet';
    let emptyIcon: keyof typeof Icon.glyphMap = 'people-outline';
    
    if (searchQuery) {
      emptyTitle = 'No results found';
      emptyMessage = `No connections matching "${searchQuery}"`;
      emptyIcon = 'search-outline';
    } else if (activeFilter === 'users') {
      emptyTitle = 'No user connections';
      emptyMessage = 'Connect with other users to grow your network';
      emptyIcon = 'person-outline';
    } else if (activeFilter === 'companies') {
      emptyTitle = 'No company connections';
      emptyMessage = 'Connect with companies to expand your business network';
      emptyIcon = 'business-outline';
    }

    return (
      <View style={styles.emptyState}>
        <Icon 
          name={emptyIcon} 
          size={60} 
          color={appTheme.colors.textMuted} 
        />
        <Text style={[styles.emptyTitle, { color: appTheme.colors.text }]}>
          {emptyTitle}
        </Text>
        <Text style={[styles.emptySubtitle, { color: appTheme.colors.secondary }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      {renderHeader()}
      {renderSearchBar()}
      {renderFilterBar()}
      
      <FlatList
        data={filteredConnections}
        keyExtractor={(item) => item.id}
        renderItem={renderConnectionItem}
        contentContainerStyle={filteredConnections.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header - design.json: headers.secondaryHeader (height: 56)
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  backButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    textAlign: 'center',
    flex: 1,
  },
  headerRightSpacer: {
    width: 56,
  },
  // Search bar - design.json: connectionsScreen.searchBar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  // Filter bar - design.json: components.filterBar (height: 40, full-width indicator)
  filterBar: {
    height: 40,
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterTabText: {
    fontSize: 14,
  },
  // Full-width indicator per design.json filterBar.selected.indicatorPosition
  filterIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
  },
  // List items - design.json: connectionsScreen.listItem
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  // All avatars use 8px border radius - no difference between user and company
  userAvatar: {
    borderRadius: 8,
  },
  companyAvatar: {
    borderRadius: 8,
  },
  connectionInfo: {
    flex: 1,
  },
  // design.json: connectionsScreen.listItem.nameTypography
  connectionName: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
  // design.json: connectionsScreen.listItem.subtitleTypography
  connectionSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  // Empty state - design.json: connectionsScreen.emptyState
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginTop: 8,
  },
});
