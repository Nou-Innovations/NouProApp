import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useNavigation } from '@react-navigation/native';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useProfileStore } from '@/shared/store/profileStore';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';

export default function NotificationBell() {
  const navigation = useNavigation();
  const { unreadCount, markAllAsRead } = useNotifications();
  const { theme: appTheme } = useTheme();
  const activeMode = useProfileStore((state) => state.activeMode);
  const prevModeRef = useRef(activeMode);

  // Reset badge count when the user switches modes so we don't show stale counts
  useEffect(() => {
    if (prevModeRef.current !== activeMode) {
      prevModeRef.current = activeMode;
      markAllAsRead();
    }
  }, [activeMode, markAllAsRead]);

  const handlePress = () => {
    navigation.navigate('Notifications' as never);
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handlePress}
    >
      <View style={styles.iconContainer}>
        <Icon 
          name="notifications-outline" 
          size={theme.iconSizes.md} 
          color={appTheme.colors.text} 
        />
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: appTheme.colors.badgeBackground }]}>
            <Text style={[styles.badgeText, { color: appTheme.colors.textInverse }]}>
              {unreadCount > 9 ? '9+' : unreadCount.toString()}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.xs,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -theme.spacing.xs,
    right: -theme.spacing.xs - 2,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: theme.fonts.primary.bold,
    textAlign: 'center',
  },
}); 