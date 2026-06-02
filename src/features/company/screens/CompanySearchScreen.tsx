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
import { useTheme } from '@/shared/theme/ThemeProvider';
import { searchCompanies, CompanySearchResult } from '@/features/search/search.service';

// Helper function to highlight matched text in bold
const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
  const { theme: appTheme } = useTheme();

  if (!highlight || !highlight.trim()) {
    return <Text style={[styles.itemName, { color: appTheme.colors.text }]}>{text}</Text>;
  }

  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));

  return (
    <Text style={[styles.itemName, { color: appTheme.colors.text }]}>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <Text key={i} style={[styles.highlightedText, { color: appTheme.colors.text }]}>{part}</Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
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
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<CompanySearchScreenRouteParams, 'CompanySearch'>>();
  const searchQuery = route.params?.query || '';
  const { theme: appTheme } = useTheme();

  const [companies, setCompanies] = useState<CompanySearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!searchQuery.trim()) {
        setCompanies([]);
        return;
      }
      setLoading(true);
      try {
        const results = await searchCompanies(searchQuery);
        if (!cancelled) setCompanies(results);
      } catch {
        if (!cancelled) setCompanies([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  const renderCompanyItem = ({ item }: { item: CompanySearchResult }) => (
    <TouchableOpacity
      style={[
        styles.itemContainer,
        {
          borderBottomColor: appTheme.colors.borderColor,
          backgroundColor: appTheme.colors.cardBackground,
        },
      ]}
      onPress={() => navigation.navigate('ViewBusinessProfile', { businessId: item.id })}
    >
      {item.logoUrl ? (
        <Image source={{ uri: item.logoUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: appTheme.colors.primary }]}>
          <Text style={styles.avatarInitial}>{item.name?.charAt(0)?.toUpperCase() || '?'}</Text>
        </View>
      )}
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
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={companies}
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
      )}
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
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  avatarPlaceholder: {
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
