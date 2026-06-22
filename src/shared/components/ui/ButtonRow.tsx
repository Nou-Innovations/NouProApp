/**
 * ButtonRow — lays out 2+ buttons side by side, each taking equal width.
 * Replaces the repeated `flexDirection: 'row'` + `flex: 1` boilerplate at call sites
 * (e.g. Reject/Accept, Save/Cancel pairs). Drop AppButtons straight in as children.
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import theme from '@/shared/theme';

interface ButtonRowProps {
  children: React.ReactNode;
  /** Space between buttons. Defaults to theme.spacing.sm (8). */
  gap?: number;
  style?: ViewStyle;
}

export default function ButtonRow({ children, gap = theme.spacing.sm, style }: ButtonRowProps) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.row, { gap }, style]}>
      {items.map((child, index) => (
        <View key={index} style={styles.cell}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cell: {
    flex: 1,
  },
});
