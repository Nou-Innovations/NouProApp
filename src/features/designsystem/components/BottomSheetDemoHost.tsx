/**
 * BottomSheetDemoHost — given the active gallery entry, renders the matching live
 * preview: the REAL AppBottomSheet / AppModal for canonical entries, or a faithful
 * Demo* reproduction (driven by the entry's attributes) for everything else.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppBottomSheet, { AppBottomSheetItem } from '@/shared/components/ui/AppBottomSheet';
import AppModal, { AppModalVariant } from '@/shared/components/ui/AppModal';
import AppButton from '@/shared/components/ui/AppButton';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { GalleryEntry } from '../data/bottomSheetRegistry';
import DemoBottomSheet from './demos/DemoBottomSheet';
import DemoCenteredDialog from './demos/DemoCenteredDialog';
import DemoDropdownPopover from './demos/DemoDropdownPopover';
import DemoFullscreenModal from './demos/DemoFullscreenModal';
import DemoSpecial from './demos/DemoSpecial';

interface BottomSheetDemoHostProps {
  entry: GalleryEntry;
  visible: boolean;
  onClose: () => void;
}

const LIST_ITEMS: AppBottomSheetItem[] = [
  { id: '1', title: 'Option one', subtitle: 'A selectable row', avatar: { type: 'icon', icon: 'cube-outline' } },
  { id: '2', title: 'Option two', subtitle: 'With a subtitle', avatar: { type: 'icon', icon: 'cart-outline' } },
  { id: '3', title: 'Option three', avatar: { type: 'icon', icon: 'card-outline' } },
  { id: '4', title: 'Remove', variant: 'destructive', avatar: { type: 'icon', icon: 'close-outline' } },
];

const BUTTON_ITEMS: AppBottomSheetItem[] = [
  { id: '1', title: 'Create new' },
  { id: '2', title: 'Edit' },
  { id: '3', title: 'Delete', variant: 'destructive' },
];

const MULTI_ITEMS: AppBottomSheetItem[] = [
  { id: '1', title: 'In stock', subtitle: 'Show available products', avatar: { type: 'icon', icon: 'cube-outline' } },
  { id: '2', title: 'On promotion', subtitle: 'Discounted items', avatar: { type: 'icon', icon: 'pricetag-outline' } },
  { id: '3', title: 'New arrivals', avatar: { type: 'icon', icon: 'sparkles-outline' } },
  { id: '4', title: 'Featured', avatar: { type: 'icon', icon: 'star-outline' } },
];

const FULL_ITEMS: AppBottomSheetItem[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  title: `List item ${i + 1}`,
  subtitle: 'Scrollable full-height content',
  avatar: { type: 'icon', icon: 'grid-outline' },
}));

const MODAL_COPY: Record<string, { title: string; message: string; primary: string; secondary?: string }> = {
  default: { title: 'Confirm changes', message: 'Are you sure you want to update this?', primary: 'Save', secondary: 'Cancel' },
  delete: { title: 'Delete item', message: 'This action cannot be undone.', primary: 'Delete', secondary: 'Cancel' },
  confirm: { title: 'Are you sure?', message: 'Please confirm before continuing.', primary: 'Proceed', secondary: 'Cancel' },
  success: { title: 'Success', message: 'Your changes were saved.', primary: 'OK' },
};

export default function BottomSheetDemoHost({ entry, visible, onClose }: BottomSheetDemoHostProps) {
  const { theme } = useTheme();
  const { kind, variant } = entry.demo;

  // Local selection state for the multi-select (checkbox) demo.
  const [selectedIds, setSelectedIds] = useState<string[]>(['2']);

  if (kind === 'app-bottomsheet') {
    if (variant === 'multiSelect') {
      return (
        <AppBottomSheet
          visible={visible}
          onClose={onClose}
          title={entry.name}
          items={MULTI_ITEMS}
          mode="list"
          multiSelect
          selectedItemIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      );
    }
    if (variant === 'buttons') {
      return (
        <AppBottomSheet
          visible={visible}
          onClose={onClose}
          title={entry.name}
          items={BUTTON_ITEMS}
          mode="buttons"
          onSelectItem={onClose}
        />
      );
    }
    if (variant === 'children') {
      return (
        <AppBottomSheet visible={visible} onClose={onClose} title={entry.name}>
          <View style={styles.childrenBody}>
            <Text style={[styles.childrenText, { color: theme.colors.textLight }]}>
              Children mode: any custom content lives inside the canonical sheet chrome
              (drag handle, animated spring, OVERLAY tokens).
            </Text>
            <AppButton title="Done" onPress={onClose} />
          </View>
        </AppBottomSheet>
      );
    }
    return (
      <AppBottomSheet
        visible={visible}
        onClose={onClose}
        title={entry.name}
        items={variant === 'fullHeight' ? FULL_ITEMS : LIST_ITEMS}
        mode="list"
        fullHeight={variant === 'fullHeight'}
        onSelectItem={onClose}
      />
    );
  }

  if (kind === 'app-modal') {
    const copy = MODAL_COPY[variant ?? 'default'] ?? MODAL_COPY.default;
    return (
      <AppModal
        visible={visible}
        variant={(variant ?? 'default') as AppModalVariant}
        title={copy.title}
        message={copy.message}
        primaryButtonText={copy.primary}
        secondaryButtonText={copy.secondary}
        onPrimaryAction={onClose}
        onSecondaryAction={onClose}
        onClose={onClose}
      />
    );
  }

  if (kind === 'demo-dialog') {
    return <DemoCenteredDialog visible={visible} onClose={onClose} title={entry.name} attributes={entry.attributes} />;
  }

  if (kind === 'demo-dropdown') {
    return <DemoDropdownPopover visible={visible} onClose={onClose} title={entry.name} attributes={entry.attributes} />;
  }

  if (kind === 'demo-fullscreen') {
    return <DemoFullscreenModal visible={visible} onClose={onClose} title={entry.name} placeholder={entry.placeholder} />;
  }

  if (kind === 'demo-special') {
    return (
      <DemoSpecial
        visible={visible}
        onClose={onClose}
        title={entry.name}
        attributes={entry.attributes}
        placeholder={entry.placeholder}
      />
    );
  }

  // demo-bottomsheet (default)
  return <DemoBottomSheet visible={visible} onClose={onClose} title={entry.name} attributes={entry.attributes} />;
}

const styles = StyleSheet.create({
  childrenBody: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 16,
  },
  childrenText: {
    fontSize: 15,
    fontFamily: 'InterCustom-Medium',
    lineHeight: 22,
  },
});
