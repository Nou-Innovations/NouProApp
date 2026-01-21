import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import theme from '@/shared/theme';

// Mock data for users - should be the same data as in SearchResultsList
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

// Helper function to highlight matched text in bold
const HighlightText = ({ text, highlight }) => {
  if (!highlight || !highlight.trim()) {
    return <Text style={styles.itemName}>{text}</Text>;
  }
  
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  
  return (
    <Text style={styles.itemName}>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? 
        <Text key={i} style={styles.highlightedText}>{part}</Text> : 
        <Text key={i}>{part}</Text>
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
  const navigation = useNavigation();
  const route = useRoute<RouteProp<UserSearchScreenRouteParams, 'UserSearch'>>();
  const searchQuery = route.params?.query || '';
  
  // Filter users based on search query
  const filteredUsers = MOCK_USERS.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => navigation.navigate('ViewUserProfile', { userId: item.id })}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
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
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderUserItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found matching "{searchQuery}"</Text>
          </View>
        }
      />
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