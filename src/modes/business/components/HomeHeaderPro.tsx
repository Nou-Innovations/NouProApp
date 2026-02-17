/**
 * InboxHeaderPro - Business Mode Inbox Header
 * Title with Notifications and Explore icons (with unread badges)
 * Supports optional company selector for multi-company users
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';

interface InboxHeaderProProps {
  title?: string;
  notificationCount?: number;
  onNotificationsPress: () => void;
  onExplorePress: () => void;
  onCompanySelectorPress?: () => void;
  companyName?: string;
  showCompanySelector?: boolean;
}

export function InboxHeaderPro({
  title = 'Inbox',
  notificationCount = 0,
  onNotificationsPress,
  onExplorePress,
  onCompanySelectorPress,
  companyName,
  showCompanySelector = false,
}: InboxHeaderProProps) {
  const { theme: appTheme } = useTheme();

  const renderBadge = (count: number) => {
    if (count <= 0) return null;
    
    return (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {count > 9 ? '9+' : count.toString()}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <View style={styles.leftSection}>
        <Text style={[styles.title, { color: appTheme.colors.text }]}>
          {title}
        </Text>
        
        {showCompanySelector && companyName && (
          <TouchableOpacity 
            style={styles.companySelector}
            onPress={onCompanySelectorPress}
            activeOpacity={0.7}
          >
            <Text 
              style={[styles.companyName, { color: appTheme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {companyName}
            </Text>
            <Icon 
              name="chevron-down" 
              size={14} 
              color={appTheme.colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.actions}>
        {/* Notifications Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onNotificationsPress}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon 
            name="notifications-outline" 
            size={24} 
            color={appTheme.colors.text} 
          />
          {renderBadge(notificationCount)}
        </TouchableOpacity>
        
        {/* Explore Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onExplorePress}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon 
            name="globe-outline" 
            size={24} 
            color={appTheme.colors.text} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 48,
  },
  leftSection: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.primary.bold,
    lineHeight: 36,
  },
  companySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  companyName: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    maxWidth: 200,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: theme.colors.textInverse,
    fontSize: 10,
    fontFamily: theme.fonts.primary.bold,
  },
});

// Keep HomeHeaderPro as alias for backward compatibility
export { InboxHeaderPro as HomeHeaderPro };
export default InboxHeaderPro;

