/**
 * SupplierPickerModal Component
 * A searchable modal for selecting a supplier from a list.
 * Uses react-native Modal with transparent background and a FlatList.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { Icon } from '@/shared/utils/icons';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import { type Supplier } from '@/shared/types/procurement';

interface SupplierPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (supplier: Supplier) => void;
  suppliers: Supplier[];
}

const SupplierPickerModal: React.FC<SupplierPickerModalProps> = ({
  visible,
  onClose,
  onSelect,
  suppliers,
}) => {
  const { theme: appTheme } = useTheme();
  const [search, setSearch] = useState('');

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers;
    const query = search.toLowerCase().trim();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        (s.contactName && s.contactName.toLowerCase().includes(query))
    );
  }, [suppliers, search]);

  const handleSelect = (supplier: Supplier) => {
    setSearch('');
    onSelect(supplier);
  };

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  const renderItem = ({ item }: { item: Supplier }) => (
    <TouchableOpacity
      style={[
        styles.supplierItem,
        {
          backgroundColor: appTheme.colors.cardBackground,
          borderBottomColor: appTheme.colors.borderColor,
        },
      ]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.supplierInfo}>
        <Text
          style={[styles.supplierName, { color: appTheme.colors.text }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {item.contactName ? (
          <Text
            style={[styles.supplierContact, { color: appTheme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.contactName}
          </Text>
        ) : null}
      </View>
      <Icon
        name="chevron-forward"
        size={20}
        color={appTheme.colors.textMuted}
      />
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: appTheme.colors.textMuted }]}>
        {search.trim() ? 'No suppliers found' : 'No suppliers available'}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, { backgroundColor: appTheme.colors.overlay }]}>
        <SafeAreaView
          style={[styles.modalContainer, { backgroundColor: appTheme.colors.background }]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.headerTitle, { color: appTheme.colors.text }]}>
              Select Supplier
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={appTheme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <AppSearchBar
            placeholder="Search suppliers..."
            value={search}
            onChangeText={setSearch}
            onClear={() => setSearch('')}
          />

          {/* Supplier list */}
          <FlatList
            data={filteredSuppliers}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={renderEmpty}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '80%',
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontFamily: theme.fonts.primary.bold,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  listContent: {
    flexGrow: 1,
  },
  supplierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  supplierInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  supplierName: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.medium,
    marginBottom: 2,
  },
  supplierContact: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
  },
  emptyContainer: {
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.regular,
  },
});

export default SupplierPickerModal;
