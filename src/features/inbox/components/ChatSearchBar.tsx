import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AppSearchBar, { AppSearchBarRef } from '@/shared/components/ui/AppSearchBar';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';

interface ChatSearchBarProps {
  visible: boolean;
  onSearch: (query: string) => void;
  onClose: () => void;
  matchCount: number;
  currentMatchIndex: number;
  onPrevious: () => void;
  onNext: () => void;
}

export default function ChatSearchBar({
  visible,
  onSearch,
  onClose,
  matchCount,
  currentMatchIndex,
  onPrevious,
  onNext,
}: ChatSearchBarProps) {
  const { theme: appTheme } = useTheme();
  const searchBarRef = useRef<AppSearchBarRef>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) {
      setTimeout(() => searchBarRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [visible]);

  const handleChangeText = (text: string) => {
    setQuery(text);
    onSearch(text);
  };

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background, borderBottomColor: appTheme.colors.borderColor }]}>
      <View style={styles.searchRow}>
        <View style={styles.searchBarWrapper}>
          <AppSearchBar
            ref={searchBarRef}
            placeholder="Search in chat..."
            value={query}
            onChangeText={handleChangeText}
            onClear={() => { setQuery(''); onSearch(''); }}
            containerStyle={{ marginHorizontal: 0, marginBottom: 0 }}
          />
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={20} color={appTheme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      {query.length > 0 && (
        <View style={styles.navigationRow}>
          <Text style={[styles.matchText, { color: appTheme.colors.textSecondary }]}>
            {matchCount > 0 ? `${currentMatchIndex + 1} of ${matchCount}` : 'No results'}
          </Text>
          <View style={styles.navButtons}>
            <TouchableOpacity
              onPress={onPrevious}
              disabled={matchCount === 0}
              style={[styles.navButton, matchCount === 0 && styles.navButtonDisabled]}
            >
              <Icon name="chevron-up" size={20} color={matchCount > 0 ? appTheme.colors.primary : appTheme.colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onNext}
              disabled={matchCount === 0}
              style={[styles.navButton, matchCount === 0 && styles.navButtonDisabled]}
            >
              <Icon name="chevron-down" size={20} color={matchCount > 0 ? appTheme.colors.primary : appTheme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBarWrapper: {
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginLeft: 4,
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  matchText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.medium,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    padding: 4,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
});
