/**
 * ProfileCard Component
 *
 * Renders a shared profile in a message bubble.
 * Tappable card with avatar, name, and type.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';

interface ProfileCardProps {
  profileName: string;
  profileAvatar?: string;
  profileType: 'user' | 'business';
  onPress?: () => void;
  isOutgoing: boolean;
}

export default function ProfileCard({ profileName, profileAvatar, profileType, onPress, isOutgoing }: ProfileCardProps) {
  const { theme: appTheme } = useTheme();

  const initials = profileName
    .split(' ')
    .map(w => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <TouchableOpacity onPress={onPress} style={styles.container} activeOpacity={0.7}>
      {profileAvatar ? (
        <Image source={{ uri: profileAvatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: appTheme.colors.surface }]}>
          <Text style={[styles.initialsText, { color: appTheme.colors.primary }]}>{initials}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={[styles.name, { color: isOutgoing ? appTheme.colors.textInverse : appTheme.colors.text }]} numberOfLines={1}>
          {profileName}
        </Text>
        <Text style={[styles.type, { color: isOutgoing ? 'rgba(255,255,255,0.6)' : appTheme.colors.textSecondary }]}>
          {profileType === 'business' ? 'Business' : 'User'} Profile
        </Text>
      </View>
      <Icon
        name="chevron-right"
        size={20}
        color={isOutgoing ? 'rgba(255,255,255,0.5)' : appTheme.colors.textMuted}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    minWidth: 200,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.semiBold,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: theme.fontSize.md,
    fontFamily: theme.fonts.primary.semiBold,
  },
  type: {
    fontSize: theme.fontSize.xs,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
});
