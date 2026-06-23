/**
 * SuggestionRow - a single community suggestion on the board.
 * Avatar + author + text on the left; a tappable vote pill (count + arrow) on the right.
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowUp } from 'lucide-react-native';
import { Avatar } from '@/shared/components/ui';
import { Text, Caption } from '@/shared/components/ui/Typography';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { timeAgo } from '@/shared/utils/timeAgo';
import type { Suggestion } from '../types';

interface SuggestionRowProps {
  suggestion: Suggestion;
  onVote: (id: string) => void;
}

function SuggestionRowBase({ suggestion, onVote }: SuggestionRowProps) {
  const { theme: appTheme } = useTheme();
  const { id, text, userName, userAvatar, userId, votes, hasVoted, createdAt } = suggestion;

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={styles.authorRow}>
          <Avatar userId={userId} userName={userName} imageUri={userAvatar} size={28} />
          <Text style={[styles.author, { color: appTheme.colors.text }]} numberOfLines={1}>
            {userName}
          </Text>
          <Caption style={[styles.dot, { color: appTheme.colors.textMuted }]}>·</Caption>
          <Caption style={{ color: appTheme.colors.textMuted }}>{timeAgo(createdAt)}</Caption>
        </View>
        <Text style={[styles.text, { color: appTheme.colors.text }]}>{text}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.votePill,
          hasVoted
            ? { backgroundColor: appTheme.colors.primary, borderColor: appTheme.colors.primary }
            : { backgroundColor: appTheme.colors.surface, borderColor: appTheme.colors.borderColor },
        ]}
        onPress={() => onVote(id)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={hasVoted ? 'Remove vote' : 'Upvote'}
      >
        <ArrowUp size={16} color={hasVoted ? '#FFFFFF' : appTheme.colors.text} strokeWidth={2.5} />
        <Text
          style={[styles.voteCount, { color: hasVoted ? '#FFFFFF' : appTheme.colors.text }]}
        >
          {votes}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  left: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  author: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  dot: {
    marginHorizontal: 0,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
  votePill: {
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  voteCount: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export const SuggestionRow = React.memo(SuggestionRowBase);
export default SuggestionRow;
