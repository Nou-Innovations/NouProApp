import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { searchCompanies, searchUsers, CompanySearchResult, UserSearchResult } from '../search.service';

interface SearchResultsListProps {
  searchQuery: string;
  chats: any[];
  visible: boolean;
}

// Helper function to highlight matched text in bold
const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) {
    return <Text>{text}</Text>;
  }

  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));

  return (
    <Text>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <Text key={i} style={{ fontWeight: 'bold' }}>{part}</Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
};

const SearchResultsList: React.FC<SearchResultsListProps> = ({
  searchQuery,
  chats,
  visible,
}) => {
  const navigation = useNavigation<any>();

  const [companies, setCompanies] = useState<CompanySearchResult[]>([]);
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounced fetch of companies + users from the backend
  useEffect(() => {
    if (!visible || !searchQuery.trim()) {
      setCompanies([]);
      setUsers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const [companyResults, userResults] = await Promise.all([
          searchCompanies(searchQuery),
          searchUsers(searchQuery),
        ]);
        if (!cancelled) {
          setCompanies(companyResults);
          setUsers(userResults);
        }
      } catch {
        if (!cancelled) {
          setCompanies([]);
          setUsers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchQuery, visible]);

  if (!visible || !searchQuery) {
    return null;
  }

  // Filter chats based on search query and determine if match is in name or message
  const filteredChats = chats.filter((chat) => {
    const nameMatch = chat.name.toLowerCase().includes(searchQuery.toLowerCase());
    const messageMatch = chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || messageMatch;
  });

  const visibleCompanies = companies.slice(0, 4);
  const visibleUsers = users.slice(0, 4);

  // If no results at all (and not loading), show no results message
  if (
    !loading &&
    filteredChats.length === 0 &&
    companies.length === 0 &&
    users.length === 0
  ) {
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
                  highlightMessage: !!messageMatch,
                  searchQuery,
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

      {/* Loading indicator for company/user results */}
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}

      {/* Companies Section */}
      {visibleCompanies.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Companies</Text>
          {visibleCompanies.map((company) => (
            <TouchableOpacity
              key={company.id}
              style={styles.itemContainer}
              onPress={() => navigation.navigate('ViewBusinessProfile', { businessId: company.id })}
            >
              <Image source={{ uri: company.logoUrl || undefined }} style={styles.avatar} />
              <View style={styles.messageContent}>
                <HighlightText text={company.name} highlight={searchQuery} />
              </View>
            </TouchableOpacity>
          ))}
          {companies.length > 4 && (
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
      {visibleUsers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Users</Text>
          {visibleUsers.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={styles.itemContainer}
              onPress={() => navigation.navigate('ViewUserProfile', { userId: user.id })}
            >
              <Image source={{ uri: user.avatar || undefined }} style={styles.avatar} />
              <View style={styles.messageContent}>
                <HighlightText text={user.name} highlight={searchQuery} />
              </View>
            </TouchableOpacity>
          ))}
          {users.length > 4 && (
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
  loadingRow: {
    paddingVertical: 16,
    alignItems: 'center',
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
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#E5E7EB',
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
