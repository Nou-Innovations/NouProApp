/**
 * ProQuickActions - Business Mode Quick Actions
 * A single borderless row of icon-tile buttons (create flows). Each opens a
 * focused flow and returns to Home.
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
import { Skeleton } from '@/shared/components/ui';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
}

interface ProQuickActionsProps {
  actions: QuickAction[];
  isLoading?: boolean;
}

export function ProQuickActions({ actions, isLoading }: ProQuickActionsProps) {
  const { theme: appTheme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>Quick actions</Text>
      <View style={styles.row}>
        {isLoading
          ? [0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.item}>
                <Skeleton width={50} height={50} borderRadius={15} />
                <Skeleton width={48} height={12} />
              </View>
            ))
          : actions.slice(0, 4).map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.item}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.tile, { backgroundColor: `${action.color}1F` }]}>
                  <Icon name={action.icon} size={22} color={action.color} />
                </View>
                <Text
                  style={[styles.label, { color: appTheme.colors.text }]}
                  numberOfLines={1}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
  },
  item: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  tile: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.medium,
  },
});

export default ProQuickActions;
