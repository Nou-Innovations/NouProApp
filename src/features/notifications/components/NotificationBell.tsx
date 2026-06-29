import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useNavigation } from '@react-navigation/native';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useProfileStore } from '@/shared/store/profileStore';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { CountBadge } from '@/shared/components/ui';

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
        <CountBadge count={unreadCount} overlay style={{ top: -theme.spacing.xs, right: -theme.spacing.xs - 2 }} />
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
}); 