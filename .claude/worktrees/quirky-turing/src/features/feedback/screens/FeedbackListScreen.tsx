import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowUp } from 'lucide-react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { EmptyState } from '@/shared/components/ui';
import type { RootStackParamList } from '@/shared/types/navigation';
import type { Suggestion } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type FeedbackListRouteProp = RouteProp<RootStackParamList, 'FeedbackList'>;

export default function FeedbackListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<FeedbackListRouteProp>();
  const { theme: appTheme } = useTheme();
  const { categoryId, categoryTitle } = route.params;

  // Local state for suggestions with voting (starts empty, populated by real user submissions)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // Filter and sort suggestions by category and vote count
  const categorySuggestions = useMemo(() => {
    return suggestions
      .filter(s => s.categoryId === categoryId)
      .sort((a, b) => b.votes - a.votes);
  }, [suggestions, categoryId]);

  const handleVote = (suggestionId: string) => {
    setSuggestions(prev => prev.map(s => {
      if (s.id === suggestionId) {
        return {
          ...s,
          hasVoted: !s.hasVoted,
          votes: s.hasVoted ? s.votes - 1 : s.votes + 1,
        };
      }
      return s;
    }));
  };

  const handleAddSuggestion = () => {
    navigation.navigate('AddSuggestion', { categoryId, categoryTitle });
  };

  // Get shorter title for header (first part before slash if exists)
  const shortTitle = categoryTitle.includes('/') 
    ? categoryTitle.split('/')[0].trim() 
    : categoryTitle;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title={shortTitle}
        leftAction={{
          icon: 'chevron-left',
          onPress: () => navigation.goBack(),
          accessibilityLabel: 'Go back',
        }}
        rightActions={[
          {
            icon: 'create-outline',
            onPress: handleAddSuggestion,
            accessibilityLabel: 'Add suggestion',
          },
        ]}
      />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {categorySuggestions.length > 0 ? (
          <View style={styles.suggestionsContainer}>
            {categorySuggestions.map((suggestion) => (
              <View
                key={suggestion.id}
                style={[
                  styles.suggestionCard,
                  { 
                    backgroundColor: appTheme.colors.cardBackground,
                    borderColor: appTheme.colors.borderColor,
                  }
                ]}
              >
                {/* Suggestion text */}
                <Text style={[styles.suggestionText, { color: appTheme.colors.text }]}>
                  {suggestion.text}
                </Text>

                {/* Vote button */}
                <View style={styles.voteContainer}>
                  <TouchableOpacity
                    style={[
                      styles.voteButton,
                      suggestion.hasVoted
                        ? { backgroundColor: appTheme.colors.primary }
                        : { 
                            backgroundColor: 'transparent',
                            borderWidth: 1,
                            borderColor: appTheme.colors.borderColor,
                          }
                    ]}
                    onPress={() => handleVote(suggestion.id)}
                    activeOpacity={0.7}
                  >
                    <ArrowUp 
                      size={18} 
                      color={suggestion.hasVoted ? '#FFFFFF' : appTheme.colors.text} 
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                  <Text style={[
                    styles.voteCount, 
                    { color: suggestion.hasVoted ? appTheme.colors.primary : appTheme.colors.text }
                  ]}>
                    {suggestion.votes}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            iconName="chatbubble-ellipses-outline"
            title="No suggestions yet"
            subtitle="Be the first to share ideas, feature requests, or improvements."
            ctaLabel="Add suggestion"
            onCtaPress={handleAddSuggestion}
            testID="empty-feedback"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  suggestionsContainer: {
    gap: 16,
  },
  suggestionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 22,
    marginBottom: 16,
  },
  voteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteCount: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.primary.bold,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginBottom: 24,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  addFirstButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    color: '#FFFFFF',
  },
});
