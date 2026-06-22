/**
 * ChipGroup — a set of selectable chips, single- or multi-select, optionally
 * horizontally scrollable. Unifies the many hand-rolled chip rows across the app
 * (type/priority pickers, filters, the Explore section strip, etc.).
 *
 *   <ChipGroup options={opts} value={value} onChange={setValue} />            // single
 *   <ChipGroup multiple options={opts} value={values} onChange={setValues} /> // multi
 *   <ChipGroup scroll ... />                                                   // horizontal strip
 */
import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import Chip from './Chip';

export interface ChipOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  locked?: boolean;
  disabled?: boolean;
}

interface BaseProps {
  options: ChipOption[];
  /** Horizontal scrolling strip instead of a wrapping row. */
  scroll?: boolean;
  style?: ViewStyle;
}

interface SingleProps extends BaseProps {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
}

interface MultiProps extends BaseProps {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
}

type ChipGroupProps = SingleProps | MultiProps;

export default function ChipGroup(props: ChipGroupProps) {
  const { options, scroll = false, style } = props;

  const isSelected = (value: string) =>
    props.multiple ? props.value.includes(value) : props.value === value;

  const handlePress = (value: string) => {
    if (props.multiple) {
      const next = new Set(props.value);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      props.onChange(Array.from(next));
    } else {
      props.onChange(value);
    }
  };

  const chips = options.map((option) => (
    <Chip
      key={option.value}
      label={option.label}
      iconLeft={option.icon}
      locked={option.locked}
      disabled={option.disabled}
      selected={isSelected(option.value)}
      onPress={() => handlePress(option.value)}
    />
  ));

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={[styles.scroll, style]}
      >
        {chips}
      </ScrollView>
    );
  }

  return <View style={[styles.wrap, style]}>{chips}</View>;
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
