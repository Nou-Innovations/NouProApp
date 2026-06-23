/**
 * ForwardChatPicker Component
 *
 * Bottom sheet showing available chats to forward a message to.
 * Uses useInbox to get the chat list.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppBottomSheet, { AppBottomSheetFlatList } from '@/shared/components/ui/AppBottomSheet';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import { ListItemCard } from '@/shared/components/ui/ListItemCard';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useInboxStore } from '../inbox.store';
import type { Chat } from '@/shared/types/inbox';
import theme from '@/shared/theme';

interface ForwardChatPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (chatId: string, chatName: string) => void;
}

export default function ForwardChatPicker({ visible, onClose, onSelect }: ForwardChatPickerProps) {
  const { theme: appTheme } = useTheme();
  const [search, setSearch] = useState('');
  const chats = useInboxStore((state) => state.chats);

  const filteredChats = search.trim()
    ? chats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : chats;

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title="Forward to..."
    >
      <View style={styles.container}>
        <AppSearchBar
          placeholder="Search conversations..."
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
          containerStyle={{ marginHorizontal: 0, marginBottom: 8 }}
        />
        <AppBottomSheetFlatList<Chat>
          data={filteredChats}
          keyExtractor={(item) => item.id}
          style={styles.list}
          renderItem={({ item, index }) => (
            <ListItemCard
              avatar={{
                type: item.avatar ? 'image' : 'initials',
                imageUri: item.avatar || undefined,
                userName: item.name,
                userId: item.id,
              }}
              title={item.name}
              subtitle={item.type === 'group' || item.type === 'internal' ? 'Group' : undefined}
              onPress={() => {
                onSelect(item.id, item.name);
                onClose();
              }}
              showDivider={index < filteredChats.length - 1}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: appTheme.colors.textSecondary }]}>
                No conversations found
              </Text>
            </View>
          }
        />
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 400,
  },
  list: {
    maxHeight: 350,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
  },
});
