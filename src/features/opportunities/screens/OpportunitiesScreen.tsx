import React from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { EmptyState } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { useOpportunities } from '../hooks/useOpportunities';
import OpportunityCard from '../components/OpportunityCard';

export default function OpportunitiesScreen() {
  const navigation = useNavigation<any>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const { items, loading, refreshing, error, refresh } = useOpportunities();

  const handleCreate = () => {
    if (!activeBusiness?.id) {
      Alert.alert('No business', 'Switch to a business to post an opportunity.');
      return;
    }
    navigation.navigate('CreateOpportunity', { businessId: activeBusiness.id });
  };
  const open = (id: string) => navigation.navigate('OpportunityDetail', { opportunityId: id });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Opportunities"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        rightActions={[{ icon: 'add', onPress: handleCreate, accessibilityLabel: 'Post opportunity' }]}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      ) : error ? (
        <EmptyState iconName="cloud-offline-outline" title="Couldn't load" subtitle={error} ctaLabel="Retry" onCtaPress={refresh} />
      ) : items.length === 0 ? (
        <EmptyState
          iconName="megaphone-outline"
          title="No opportunities yet"
          subtitle="Post what your business is looking for and get responses."
          ctaLabel="Post opportunity"
          onCtaPress={handleCreate}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(o) => o.id}
          renderItem={({ item }) => (
            <OpportunityCard opportunity={item} onPress={() => open(item.id)} showRespond onRespond={() => open(item.id)} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={appTheme.colors.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
