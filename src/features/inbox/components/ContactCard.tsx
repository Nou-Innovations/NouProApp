/**
 * ContactCard Component
 *
 * Renders a shared contact in a message bubble.
 * Tappable card with avatar, name, and phone. Tapping a card with a phone
 * number offers to call it. Mirrors ProfileCard.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Linking } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { AppAlert } from '@/shared/services/appAlert';
import theme from '@/shared/theme';

interface ContactCardProps {
  contactName: string;
  contactPhone?: string;
  contactAvatar?: string;
  isOutgoing: boolean;
  onPress?: () => void;
}

function ContactCard({ contactName, contactPhone, contactAvatar, isOutgoing, onPress }: ContactCardProps) {
  const { theme: appTheme } = useTheme();

  const initials = contactName
    .split(' ')
    .map(w => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (contactPhone) {
      Linking.openURL(`tel:${contactPhone}`).catch(() =>
        AppAlert.alert('Unable to call', 'Could not open the dialer for this number.')
      );
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container} activeOpacity={0.7}>
      {contactAvatar ? (
        <Image source={{ uri: contactAvatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: appTheme.colors.surface }]}>
          <Text style={[styles.initialsText, { color: appTheme.colors.primary }]}>{initials || '?'}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={[styles.name, { color: isOutgoing ? appTheme.colors.textInverse : appTheme.colors.text }]} numberOfLines={1}>
          {contactName}
        </Text>
        <Text
          style={[styles.phone, { color: isOutgoing ? 'rgba(255,255,255,0.6)' : appTheme.colors.textSecondary }]}
          numberOfLines={1}
        >
          {contactPhone || 'Contact'}
        </Text>
      </View>
      <Icon
        name={contactPhone ? 'phone' : 'chevron-right'}
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
    minWidth: 200,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
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
  phone: {
    fontSize: theme.fontSize.xs,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
});

export default React.memo(ContactCard);
