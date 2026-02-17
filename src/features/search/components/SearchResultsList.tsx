import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import MessageCard from '@/features/inbox/components/MessageCard';

// Mock data for companies
const MOCK_COMPANIES = [
  {
    id: 'biz-001',
    name: 'Acme Corporation',
    logo: 'https://ui-avatars.com/api/?name=Acme+Corp&background=0D8ABC&color=fff',
  },
  {
    id: 'biz-002',
    name: 'The Burning Distributor',
    logo: 'https://placehold.co/80x80/orange/white?text=🔥',
  },
  {
    id: 'biz-003',
    name: 'Global Industries',
    logo: 'https://ui-avatars.com/api/?name=Global+Industries&background=27AE60&color=fff',
  },
  {
    id: 'biz-004',
    name: 'Best Suppliers Ltd',
    logo: 'https://ui-avatars.com/api/?name=Best+Suppliers&background=8E44AD&color=fff',
  },
  {
    id: 'biz-005',
    name: 'Tech Solutions',
    logo: 'https://ui-avatars.com/api/?name=Tech+Solutions&background=E74C3C&color=fff',
  },
  {
    id: 'biz-006',
    name: 'Craft Wholesalers',
    logo: 'https://ui-avatars.com/api/?name=Craft+Wholesalers&background=F39C12&color=fff',
  },
];

// Mock data for users
const MOCK_USERS = [
  {
    id: 'usr-001',
    name: 'Alice Johnson',
    avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
  },
  {
    id: 'usr-002',
    name: 'Bob Smith',
    avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
  },
  {
    id: 'usr-003',
    name: 'Carol Williams',
    avatar: 'https://randomuser.me/api/portraits/women/3.jpg',
  },
  {
    id: 'usr-004',
    name: 'David Brown',
    avatar: 'https://randomuser.me/api/portraits/men/4.jpg',
  },
  {
    id: 'usr-005',
    name: 'Eva Miller',
    avatar: 'https://randomuser.me/api/portraits/women/5.jpg',
  },
  {
    id: 'usr-006',
    name: 'Frank Davis',
    avatar: 'https://randomuser.me/api/portraits/men/6.jpg',
  },
];

interface SearchResultsListProps {
  searchQuery: string;
  chats: any[];
  visible: boolean;
}

// Helper function to highlight matched text in bold
const HighlightText = ({ text, highlight }) => {
  if (!highlight.trim()) {
    return <Text>{text}</Text>;
  }
  
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  
  return (
    <Text>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? 
        <Text key={i} style={{ fontWeight: 'bold' }}>{part}</Text> : 
        <Text key={i}>{part}</Text>
      )}
    </Text>
  );
};

const SearchResultsList: React.FC<SearchResultsListProps> = ({
  searchQuery,
  chats,
  visible,
}) => {
  const navigation = useNavigation();

  if (!visible || !searchQuery) {
    return null;
  }

  // Filter chats based on search query and determine if match is in name or message
  const filteredChats = chats.filter(
    (chat) => {
      const nameMatch = chat.name.toLowerCase().includes(searchQuery.toLowerCase());
      const messageMatch = chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
      return nameMatch || messageMatch;
    }
  );

  // Filter companies based on search query
  const filteredCompanies = MOCK_COMPANIES.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 4); // Only show first 4 results

  // Filter users based on search query
  const filteredUsers = MOCK_USERS.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 4); // Only show first 4 results

  // If no results at all, show no results message
  if (filteredChats.length === 0 && filteredCompanies.length === 0 && filteredUsers.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noResultsText}>No results found for "{searchQuery}"</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Messages Section */}
      {filteredChats.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Messages</Text>
          {filteredChats.map((item) => {
            const nameMatch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const messageMatch = item.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
            
            return (
              <TouchableOpacity 
                key={item.id}
                style={styles.itemContainer}
                onPress={() => navigation.navigate('Chat', { 
                  id: item.id, 
                  name: item.name, 
                  avatar: item.avatar, 
                  isGroup: item.isGroup,
                  partnerId: item.partnerId,
                  partnerType: item.partnerType,
                  highlightMessage: messageMatch ? true : false,
                  searchQuery: searchQuery,
                  scrollToMessage: messageMatch,
                  unreadCount: item.unreadCount || 0,
                })}
              >
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                <View style={styles.messageContent}>
                  <HighlightText text={item.name} highlight={searchQuery} />
                  
                  {messageMatch && (
                    <View style={styles.messagePreview}>
                      <HighlightText text={item.lastMessage} highlight={searchQuery} />
                    </View>
                  )}
                </View>
                <Text style={styles.timeText}>{item.lastMessageTime}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Companies Section */}
      {filteredCompanies.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Companies</Text>
          {filteredCompanies.map((company) => (
            <TouchableOpacity
              key={company.id}
              style={styles.itemContainer}
              onPress={() => navigation.navigate('ViewBusinessProfile', { businessId: company.id })}
            >
              <Image source={{ uri: company.logo }} style={styles.avatar} />
              <View style={styles.messageContent}>
                <HighlightText text={company.name} highlight={searchQuery} />
              </View>
            </TouchableOpacity>
          ))}
          {MOCK_COMPANIES.length > 4 && (
            <TouchableOpacity 
              style={styles.seeMoreContainer}
              onPress={() => navigation.navigate('CompanySearch', { query: searchQuery })}
            >
              <Text style={styles.seeMoreText}>See more companies</Text>
              <Icon name="chevron-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Users Section */}
      {filteredUsers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Users</Text>
          {filteredUsers.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={styles.itemContainer}
              onPress={() => navigation.navigate('ViewUserProfile', { userId: user.id })}
            >
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
              <View style={styles.messageContent}>
                <HighlightText text={user.name} highlight={searchQuery} />
              </View>
            </TouchableOpacity>
          ))}
          {MOCK_USERS.length > 4 && (
            <TouchableOpacity 
              style={styles.seeMoreContainer}
              onPress={() => navigation.navigate('UserSearch', { query: searchQuery })}
            >
              <Text style={styles.seeMoreText}>See more users</Text>
              <Icon name="chevron-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  messageContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 2,
  },
  messagePreview: {
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  seeMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  seeMoreText: {
    fontSize: 14,
    color: theme.colors.primary,
    marginRight: 4,
  },
  noResultsText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    padding: 20,
  },
});

export default SearchResultsList; 