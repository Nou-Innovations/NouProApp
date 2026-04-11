import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowUp } from 'lucide-react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import type { RootStackParamList } from '@/shared/types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Suggestion {
  id: string;
  text: string;
  votes: number;
  hasVoted: boolean;
}

export default function FeedbackCategoriesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme: appTheme } = useTheme();

  // Local state for suggestions with voting - starts empty for real users
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]
  );

  const handleVote = (suggestionId: string) => {
    setSuggestions(prev => {
      const updated = prev.map(s => {
        if (s.id === suggestionId) {
          return {
            ...s,
            hasVoted: !s.hasVoted,
            votes: s.hasVoted ? s.votes - 1 : s.votes + 1,
          };
        }
        return s;
      });
      // Re-sort by votes
      return updated.sort((a, b) => b.votes - a.votes);
    });
  };

  const handleAddSuggestion = () => {
    navigation.navigate('AddSuggestion', { categoryId: 'general', categoryTitle: 'Suggestion' });
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
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={[styles.title, { color: appTheme.colors.text }]}>
            Your Feedback & Suggestions are the most welcome!
          </Text>
          <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
            In French or English, add and vote what's the most important things for you
          </Text>
        </View>

        {/* Suggestions List */}
        {suggestions.length > 0 ? (
          <View style={styles.suggestionsContainer}>
            {suggestions.map((suggestion, index) => (
              <View
                key={suggestion.id}
                style={[
                  styles.suggestionItem,
                  { 
                    backgroundColor: appTheme.colors.surface,
                    borderTopColor: appTheme.colors.borderColor,
                    borderBottomColor: appTheme.colors.borderColor,
                  },
                  index === 0 && styles.firstItem,
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
          <View style={styles.emptyState}>
            <Icon name="chatbubble-outline" size={64} color={appTheme.colors.textMuted} />
            <Text style={[styles.emptyStateTitle, { color: appTheme.colors.text }]}>
              No suggestions yet
            </Text>
            <Text style={[styles.emptyStateText, { color: appTheme.colors.textSecondary }]}>
              Be the first to share your ideas!
            </Text>
            <TouchableOpacity
              style={[styles.addFirstButton, { backgroundColor: appTheme.colors.primary }]}
              onPress={handleAddSuggestion}
              activeOpacity={0.7}
            >
              <Icon name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addFirstButtonText}>Add suggestion</Text>
            </TouchableOpacity>
          </View>
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
    paddingBottom: 32,
  },
  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  suggestionsContainer: {
    // No gap - borders create separation
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  firstItem: {
    borderTopWidth: 1,
  },
  suggestionText: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 22,
    marginBottom: 12,
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
