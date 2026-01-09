/**
 * ConnectionsScreen
 * Shows list of users and companies connected with the profile owner
 * Includes filter to show All, Users, or Companies
 * Following design.json specifications
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

  // Header - design.json: connectionsScreen.header
  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: appTheme.colors.background }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Icon name="chevron-back" size={28} color={appTheme.colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: appTheme.colors.text }]}>
        Connections
      </Text>
      <View style={{ width: 44 }} />
    </View>
  );

  // Search bar - design.json: components.inputs.searchInput
  const renderSearchBar = () => (
    <View 
      style={[
        styles.searchContainer, 
        { 
          backgroundColor: appTheme.colors.cardBackground,
          borderColor: isSearchFocused || searchQuery ? appTheme.colors.primary : '#E1E4EA',
        }
      ]}
    >
      <Icon 
        name="search" 
        size={20} 
        color={isSearchFocused || searchQuery ? appTheme.colors.primary : '#A4AAB8'} 
      />
      <TextInput
        style={[
          styles.searchInput, 
          { 
            color: appTheme.colors.text,
            fontFamily: searchQuery ? theme.fonts.primary.semiBold : theme.fonts.primary.regular,
          }
        ]}
        placeholder="Search connections"
        placeholderTextColor="#A4AAB8"
        value={searchQuery}
        onChangeText={setSearchQuery}
        onFocus={() => setIsSearchFocused(true)}
        onBlur={() => setIsSearchFocused(false)}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
          <Icon name="close-circle" size={20} color="#A4AAB8" />
        </TouchableOpacity>
      )}
    </View>
  );

  // Filter bar - design.json: components.filterBar (tab style with underline)
  const renderFilterBar = () => (
    <View style={[styles.filterBar, { borderBottomColor: '#E5E7EB' }]}>
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
                  color: isActive ? appTheme.colors.text : '#777777',
                  fontFamily: isActive ? theme.fonts.primary.semiBold : theme.fonts.primary.medium,
                },
              ]}
            >
              {filter.label}
            </Text>
            {isActive && (
              <View style={[styles.filterIndicator, { backgroundColor: appTheme.colors.accent }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // User connection item - design.json: connectionsScreen.listItem
  const renderUserItem = (item: UserConnection) => (
    <TouchableOpacity
      style={[styles.connectionItem, { borderBottomColor: '#E1E4EA' }]}
      onPress={() => handleConnectionPress(item)}
      activeOpacity={0.7}
    >
      <Avatar
        userId={item.id}
        userName={item.name}
        imageUri={item.avatar_url}
        size={48}
      />
      <View style={styles.connectionInfo}>
        <Text style={[styles.connectionName, { color: appTheme.colors.text }]}>
          {item.name}
        </Text>
        {item.job_title && (
          <Text style={[styles.connectionSubtitle, { color: '#575B66' }]}>
            {item.job_title}
          </Text>
        )}
        {item.company && (
          <Text style={[styles.connectionMeta, { color: '#A4AAB8' }]}>
            {item.company}
          </Text>
        )}
      </View>
      <Icon name="chevron-forward" size={20} color="#A4AAB8" />
    </TouchableOpacity>
  );

  // Company connection item - design.json: followingScreen.listItem (for companies)
  const renderCompanyItem = (item: CompanyConnection) => (
    <TouchableOpacity
      style={[styles.connectionItem, { borderBottomColor: '#E1E4EA' }]}
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
          <Text style={[styles.connectionSubtitle, { color: '#575B66' }]}>
            {item.industry}
          </Text>
        )}
        {item.description && (
          <Text 
            style={[styles.connectionMeta, { color: '#A4AAB8' }]}
            numberOfLines={1}
          >
            {item.description}
          </Text>
        )}
      </View>
      <Icon name="chevron-forward" size={20} color="#A4AAB8" />
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
          color="#A4AAB8" 
        />
        <Text style={[styles.emptyTitle, { color: appTheme.colors.text }]}>
          {emptyTitle}
        </Text>
        <Text style={[styles.emptySubtitle, { color: '#575B66' }]}>
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
  // Header - design.json: overlayScreens.header (height: 52)
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E4EA',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
    textAlign: 'center',
  },
  // Search bar - design.json: components.inputs.searchInput
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    height: 40,
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
  // Filter bar - design.json: components.filterBar
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
  filterIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2.5,
    borderRadius: 1.25,
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
  companyAvatar: {
    borderRadius: 8,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
  connectionSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  connectionMeta: {
    fontSize: 13,
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
