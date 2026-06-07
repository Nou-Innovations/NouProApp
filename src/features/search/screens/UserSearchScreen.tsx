import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import theme from '@/shared/theme';
import { searchUsers, UserSearchResult } from '../search.service';

// Helper function to highlight matched text in bold
const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight || !highlight.trim()) {
    return <Text style={styles.itemName}>{text}</Text>;
  }

  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));

  return (
    <Text style={styles.itemName}>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <Text key={i} style={styles.highlightedText}>{part}</Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
};

type UserSearchScreenRouteParams = {
  UserSearch: {
    query: string;
  };
};

const UserSearchScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<UserSearchScreenRouteParams, 'UserSearch'>>();
  const searchQuery = route.params?.query || '';

  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!searchQuery.trim()) {
        setUsers([]);
        return;
      }
      setLoading(true);
      try {
        const results = await searchUsers(searchQuery);
        if (!cancelled) setUsers(results);
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  const renderUserItem = ({ item }: { item: UserSearchResult }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => navigation.navigate('ViewUserProfile', { userId: item.id })}
    >
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarInitial}>{item.name?.charAt(0)?.toUpperCase() || '?'}</Text>
        </View>
      )}
      <View style={styles.textContainer}>
        <HighlightText text={item.name} highlight={searchQuery} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <SecondaryHeader
        title={`Users: ${searchQuery}`}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No users found matching "{searchQuery}"</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
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
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  textContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#111827',
  },
  highlightedText: {
    fontWeight: 'bold',
    color: '#111827',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default UserSearchScreen;
