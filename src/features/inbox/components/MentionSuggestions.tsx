/**
 * MentionSuggestions Component
 *
 * Renders above the input area when @ is typed.
 * Shows filtered participant list, selecting inserts the @mention.
 */

import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { ListItemCard } from '@/shared/components/ui/ListItemCard';
import { useTheme } from '@/shared/theme/ThemeProvider';

interface Participant {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

interface MentionSuggestionsProps {
  suggestions: Participant[];
  onSelect: (participant: Participant) => void;
}

export default function MentionSuggestions({ suggestions, onSelect }: MentionSuggestionsProps) {
  const { theme: appTheme } = useTheme();

  if (suggestions.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background, borderTopColor: appTheme.colors.borderColor }]}>
      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => (
          <ListItemCard
            avatar={{
              type: item.avatar ? 'image' : 'initials',
              imageUri: item.avatar || undefined,
              userName: item.name,
              userId: item.id,
            }}
            title={item.name}
            subtitle={item.role && item.role !== 'user' ? item.role : undefined}
            onPress={() => onSelect(item)}
            showDivider={index < suggestions.length - 1}
            compact
          />
        )}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 180,
    borderTopWidth: 1,
  },
  list: {
    maxHeight: 180,
  },
});
