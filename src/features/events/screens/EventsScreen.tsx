import React from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { EmptyState } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { useUpcomingEvents } from '../hooks/useUpcomingEvents';
import EventCard from '../components/EventCard';

export default function EventsScreen() {
  const navigation = useNavigation<any>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const { items, loading, refreshing, error, refresh } = useUpcomingEvents();

  const handleCreate = () => {
    if (!activeBusiness?.id) {
      Alert.alert('No business', 'Switch to a business to host an event.');
      return;
    }
    navigation.navigate('CreateEvent', { businessId: activeBusiness.id });
  };
  const open = (id: string) => navigation.navigate('EventDetail', { eventId: id });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Events"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        rightActions={[{ icon: 'add', onPress: handleCreate, accessibilityLabel: 'Host event' }]}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      ) : error ? (
        <EmptyState iconName="cloud-offline-outline" title="Couldn't load" subtitle={error} ctaLabel="Retry" onCtaPress={refresh} />
      ) : items.length === 0 ? (
        <EmptyState
          iconName="calendar-outline"
          title="No upcoming events"
          subtitle="Host a workshop, conference or networking event."
          ctaLabel="Host event"
          onCtaPress={handleCreate}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <EventCard event={item} onPress={() => open(item.id)} showRsvp onRsvp={() => open(item.id)} />}
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
