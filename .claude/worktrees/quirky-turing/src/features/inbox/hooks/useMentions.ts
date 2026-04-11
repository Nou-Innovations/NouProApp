/**
 * useMentions Hook
 *
 * Monitors text input for @trigger and provides mention suggestions.
 * Returns filtered participant list when @ is typed.
 */

import { useState, useCallback, useMemo } from 'react';

interface Participant {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

interface UseMentionsReturn {
  /** Whether to show the suggestion overlay */
  showSuggestions: boolean;
  /** Filtered list of participants matching the typed text after @ */
  suggestions: Participant[];
  /** Call this on every text change to track @ mentions */
  onTextChange: (text: string, cursorPosition: number) => void;
  /** Call when a mention is selected - returns the new text with the mention inserted */
  onSelectMention: (participant: Participant, currentText: string) => string;
  /** Get mentioned user IDs from the current text */
  getMentionedUserIds: (text: string) => string[];
}

export function useMentions(participants: Participant[]): UseMentionsReturn {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);

  const onTextChange = useCallback((text: string, cursorPosition: number) => {
    // Find the last @ before cursor
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) {
      setShowSuggestions(false);
      return;
    }

    // Check if @ is at start or preceded by space
    if (lastAtIndex > 0 && textBeforeCursor[lastAtIndex - 1] !== ' ' && textBeforeCursor[lastAtIndex - 1] !== '\n') {
      setShowSuggestions(false);
      return;
    }

    // Extract the query after @
    const query = textBeforeCursor.substring(lastAtIndex + 1);

    // If query contains a space, the mention is complete
    if (query.includes(' ')) {
      setShowSuggestions(false);
      return;
    }

    setMentionQuery(query.toLowerCase());
    setMentionStartIndex(lastAtIndex);
    setShowSuggestions(true);
  }, []);

  const suggestions = useMemo(() => {
    if (!showSuggestions) return [];
    return participants.filter(p =>
      p.name.toLowerCase().includes(mentionQuery)
    );
  }, [showSuggestions, mentionQuery, participants]);

  const onSelectMention = useCallback((participant: Participant, currentText: string): string => {
    if (mentionStartIndex === -1) return currentText;

    const before = currentText.substring(0, mentionStartIndex);
    const afterMention = currentText.substring(mentionStartIndex + 1 + mentionQuery.length);
    const newText = `${before}@${participant.name} ${afterMention}`;

    setShowSuggestions(false);
    setMentionQuery('');
    setMentionStartIndex(-1);

    return newText;
  }, [mentionStartIndex, mentionQuery]);

  const getMentionedUserIds = useCallback((text: string): string[] => {
    const ids: string[] = [];
    for (const p of participants) {
      if (text.includes(`@${p.name}`)) {
        ids.push(p.id);
      }
    }
    return ids;
  }, [participants]);

  return {
    showSuggestions: showSuggestions && suggestions.length > 0,
    suggestions,
    onTextChange,
    onSelectMention,
    getMentionedUserIds,
  };
}
