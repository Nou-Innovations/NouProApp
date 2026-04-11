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
import { useTheme } from '@/shared/theme/ThemeProvider';

// Mock data for companies - should be the same data as in SearchResultsList
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

// Helper function to highlight matched text in bold
const HighlightText = ({ text, highlight }) => {
  const { theme: appTheme } = useTheme();
  
  if (!highlight || !highlight.trim()) {
    return <Text style={[styles.itemName, { color: appTheme.colors.text }]}>{text}</Text>;
  }
  
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  
  return (
    <Text style={[styles.itemName, { color: appTheme.colors.text }]}>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? 
        <Text key={i} style={[styles.highlightedText, { color: appTheme.colors.text }]}>{part}</Text> : 
        <Text key={i}>{part}</Text>
      )}
    </Text>
  );
};

type CompanySearchScreenRouteParams = {
  CompanySearch: {
    query: string;
  };
};

const CompanySearchScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<CompanySearchScreenRouteParams, 'CompanySearch'>>();
  const searchQuery = route.params?.query || '';
  const { theme: appTheme } = useTheme();
  
  // Filter companies based on search query
  const filteredCompanies = MOCK_COMPANIES.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCompanyItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.itemContainer, 
        { 
          borderBottomColor: appTheme.colors.borderColor,
          backgroundColor: appTheme.colors.cardBackground 
        }
      ]}
      onPress={() => navigation.navigate('ViewBusinessProfile', { businessId: item.id })}
    >
      <Image source={{ uri: item.logo }} style={styles.avatar} />
      <View style={styles.textContainer}>
        <HighlightText text={item.name} highlight={searchQuery} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <SecondaryHeader
        title={`Companies: ${searchQuery}`}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />
      <FlatList
        data={filteredCompanies}
        keyExtractor={(item) => item.id}
        renderItem={renderCompanyItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: appTheme.colors.textLight }]}>
              No companies found matching "{searchQuery}"
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
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
  },
  highlightedText: {
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default CompanySearchScreen; 