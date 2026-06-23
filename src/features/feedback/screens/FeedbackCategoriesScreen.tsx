import React, { useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import {
  SectionTitle,
  ExploreChips,
  EmptyState,
  SkeletonListItem,
} from '@/shared/components/ui';
import { Text } from '@/shared/components/ui/Typography';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { RootStackParamList } from '@/shared/types/navigation';
import { useSuggestions } from '../hooks/useSuggestions';
import { SuggestionRow } from '../components/SuggestionRow';
import { FEEDBACK_CATEGORIES, ALL_CATEGORY_ID } from '../types';
import type { Suggestion, SuggestionSort } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CATEGORY_CHIPS = ['All', ...FEEDBACK_CATEGORIES.map((c) => c.title)];
const chipToCategoryId = (chip: string) =>
  chip === 'All' ? ALL_CATEGORY_ID : FEEDBACK_CATEGORIES.find((c) => c.title === chip)?.id ?? ALL_CATEGORY_ID;
const categoryIdToChip = (id: string) =>
  id === ALL_CATEGORY_ID ? 'All' : FEEDBACK_CATEGORIES.find((c) => c.id === id)?.title ?? 'All';

export default function FeedbackCategoriesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme: appTheme } = useTheme();
  const {
    suggestions,
    loading,
    refreshing,
    error,
    categoryId,
    sort,
    setCategoryId,
    setSort,
    refresh,
    vote,
  } = useSuggestions();

  // Reload when returning to the board (e.g. after submitting a suggestion),
  // but skip the very first focus — the hook already fetches on mount.
  const didMount = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (didMount.current) {
        refresh();
      } else {
        didMount.current = true;
      }
    }, [refresh])
  );

  const goToAdd = useCallback(() => {
    navigation.navigate('AddSuggestion', {
      defaultCategoryId: categoryId === ALL_CATEGORY_ID ? undefined : categoryId,
    });
  }, [navigation, categoryId]);

  const renderItem = useCallback(
    ({ item }: { item: Suggestion }) => <SuggestionRow suggestion={item} onVote={vote} />,
    [vote]
  );

  const SortToggle = () => (
    <View style={styles.sortRow}>
      {(['top', 'new'] as SuggestionSort[]).map((option) => {
        const active = sort === option;
        return (
          <TouchableOpacity
            key={option}
            onPress={() => setSort(option)}
            activeOpacity={0.7}
            style={[
              styles.sortPill,
              {
                backgroundColor: active ? appTheme.colors.surface : 'transparent',
                borderColor: active ? appTheme.colors.borderColor : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.sortPillText,
                { color: active ? appTheme.colors.text : appTheme.colors.textMuted },
              ]}
            >
              {option === 'top' ? 'Top' : 'New'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const ListHeader = (
    <View>
      <View style={styles.hero}>
        <SectionTitle style={styles.heroTitle}>Your feedback shapes NouPro</SectionTitle>
        <Text style={[styles.heroSubtitle, { color: appTheme.colors.textSecondary }]}>
          In French or English, add ideas and vote what matters most to you.
        </Text>
      </View>
      <ExploreChips
        chips={CATEGORY_CHIPS}
        selected={categoryIdToChip(categoryId)}
        onSelect={(chip) => setCategoryId(chipToCategoryId(chip))}
      />
      <SortToggle />
    </View>
  );

  const renderEmpty = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.skeletons}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonListItem key={i} avatarSize={28} lines={2} showTimestamp={false} />
          ))}
        </View>
      );
    }
    if (error) {
      return (
        <EmptyState
          iconName="cloud-offline-outline"
          title="Couldn't load suggestions"
          subtitle={error}
          ctaLabel="Try again"
          onCtaPress={refresh}
        />
      );
    }
    return (
      <EmptyState
        iconName="chatbubble-ellipses-outline"
        title="No suggestions yet"
        subtitle="Be the first to share your ideas!"
        ctaLabel="Add suggestion"
        onCtaPress={goToAdd}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Help the community"
        leftAction={{
          icon: 'chevron-left',
          onPress: () => navigation.goBack(),
          accessibilityLabel: 'Go back',
        }}
        rightActions={[
          {
            icon: 'create-outline',
            onPress: goToAdd,
            accessibilityLabel: 'Add suggestion',
          },
        ]}
      />

      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: appTheme.colors.borderColor }]} />
        )}
        contentContainerStyle={suggestions.length === 0 ? styles.emptyContent : styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={appTheme.colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  emptyContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  heroTitle: {
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  sortPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  sortPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  skeletons: {
    paddingTop: 8,
  },
});
