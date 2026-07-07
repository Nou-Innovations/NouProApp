/**
 * CreateCollectionScreen — create or edit an internal product collection.
 *
 * Create mode: name, description, optional cover image, active toggle.
 * After the collection exists (edit mode), a Products section appears with an
 * "Add products" multi-select picker and per-row remove. Backed by collections.service.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Modal, FlatList, TextInput, Pressable } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/shared/types/navigation';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { SectionTitle, ListItemCard, AppButton, AppTextField } from '@/shared/components/ui';
import ImagePlaceholder from '@/shared/components/ui/ImagePlaceholder';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import {
  getCollection, createCollection, updateCollection,
  addCollectionProducts, removeCollectionProduct,
  CollectionProductItem,
} from '../collections.service';
import { getProducts } from '@/features/products/products.service';
import { UIProduct } from '@/shared/types/product';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateCollection'>;

const CreateCollectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme: appTheme } = useTheme();
  const c = appTheme.colors;
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const companyId = activeBusiness?.id || '';

  const [collectionId, setCollectionId] = useState<string | undefined>(route.params?.collectionId);
  const isEdit = !!collectionId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState<CollectionProductItem[]>([]);
  const [products, setProducts] = useState<UIProduct[]>([]);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const productName = useCallback(
    (id: string) => products.find((p) => p.id === id)?.name || id,
    [products],
  );

  const load = useCallback(async () => {
    if (!companyId) return;
    try {
      const prods = await getProducts({ companyId });
      setProducts(prods);
    } catch { /* products are optional for the form */ }
    if (route.params?.collectionId) {
      try {
        const col = await getCollection(companyId, route.params.collectionId);
        setName(col.name);
        setDescription(col.description || '');
        setCoverImage(col.coverImage || null);
        setIsActive(col.isActive);
        setItems(col.products || []);
      } catch (e: any) {
        AppAlert.alert('Error', e?.message || 'Failed to load collection');
      }
    }
  }, [companyId, route.params?.collectionId]);

  useEffect(() => { load(); }, [load]);

  const isValid = name.trim() !== '';

  const corePayload = () => ({
    name: name.trim(),
    description: description.trim() || undefined,
    coverImage: coverImage || undefined,
    isActive,
  });

  const handleSave = async () => {
    if (!companyId) { AppAlert.alert('Error', 'No active business found.'); return; }
    setSaving(true);
    try {
      if (collectionId) {
        await updateCollection(companyId, collectionId, corePayload());
        navigation.goBack();
      } else {
        const created = await createCollection(companyId, corePayload());
        // Stay on the screen in edit mode so products can be added now.
        setCollectionId(created.id);
        AppAlert.alert('Collection created', 'Now add products to your collection.');
      }
    } catch (e: any) {
      AppAlert.alert('Error', e?.message || 'Failed to save collection');
    } finally {
      setSaving(false);
    }
  };

  const removeItem = (item: CollectionProductItem) => {
    if (!collectionId) return;
    AppAlert.alert('Remove product', `Remove "${item.product?.name || productName(item.productId)}" from this collection?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeCollectionProduct(companyId, collectionId, item.productId);
            setItems((prev) => prev.filter((x) => x.productId !== item.productId));
          } catch (e: any) {
            AppAlert.alert('Error', e?.message || 'Failed to remove product');
          }
        },
      },
    ]);
  };

  const addedIds = useMemo(() => new Set(items.map((i) => i.productId)), [items]);
  const pickerProducts = useMemo(
    () => products.filter((p) => !addedIds.has(p.id) && p.name.toLowerCase().includes(search.toLowerCase())),
    [products, addedIds, search],
  );

  const openPicker = () => {
    setSelected(new Set());
    setSearch('');
    setPickerOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (!collectionId || selected.size === 0) return;
    try {
      const updated = await addCollectionProducts(companyId, collectionId, [...selected]);
      setItems(updated.products || []);
      setPickerOpen(false);
      setSelected(new Set());
      setSearch('');
    } catch (e: any) {
      AppAlert.alert('Error', e?.message || 'Failed to add products');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <SecondaryHeader
        title={isEdit ? 'Edit collection' : 'New collection'}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.coverGroup}>
          <Text style={[styles.label, { color: c.text }]}>Cover image (optional)</Text>
          <ImagePlaceholder
            text="Tap to add a cover"
            onPress={(uri: string) => setCoverImage(uri)}
            imageUri={coverImage}
            style={styles.cover}
          />
        </View>

        <AppTextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Summer 2026" containerStyle={styles.field} />
        <AppTextField label="Description (optional)" value={description} onChangeText={setDescription} placeholder="What's in this collection?" containerStyle={styles.field} />

        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: c.text }]}>Active</Text>
          <Switch value={isActive} onValueChange={setIsActive} />
        </View>

        <AppButton
          title={isEdit ? 'Save changes' : 'Create collection'}
          onPress={handleSave}
          loading={saving}
          disabled={!isValid || saving}
          fullWidth
          style={styles.save}
        />

        {isEdit && (
          <>
            <SectionTitle style={styles.section}>Products</SectionTitle>
            {items.length === 0 ? (
              <Text style={[styles.empty, { color: c.textLight }]}>No products yet.</Text>
            ) : (
              items.map((item) => (
                <ListItemCard
                  key={item.id}
                  avatar={{ type: 'icon', icon: 'cube-outline' }}
                  title={item.product?.name || productName(item.productId)}
                  showOptionsButton
                  onOptionsPress={() => removeItem(item)}
                />
              ))
            )}
            <AppButton title="Add products" variant="secondary" onPress={openPicker} style={styles.section} />
          </>
        )}
      </ScrollView>

      <ProductMultiPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        products={pickerProducts}
        search={search}
        onSearch={setSearch}
        selected={selected}
        onToggle={toggleSelect}
        onConfirm={handleAddSelected}
        colors={c}
      />
    </SafeAreaView>
  );
};

// Inline multi-select product picker (checkboxes + "Add N" footer).
const ProductMultiPicker: React.FC<{
  visible: boolean;
  onClose: () => void;
  products: UIProduct[];
  search: string;
  onSearch: (s: string) => void;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onConfirm: () => void;
  colors: any;
}> = ({ visible, onClose, products, search, onSearch, selected, onToggle, onConfirm, colors }) => (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <SecondaryHeader title="Add products" leftAction={{ icon: 'close', onPress: onClose }} />
      <View style={styles.content}>
        <TextInput
          value={search}
          onChangeText={onSearch}
          placeholder="Search products…"
          placeholderTextColor={colors.textLight}
          style={[styles.searchInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
        />
      </View>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textLight }]}>No products to add.</Text>}
        renderItem={({ item }) => {
          const isSel = selected.has(item.id);
          return (
            <Pressable onPress={() => onToggle(item.id)} style={[styles.pickerRow, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                {!!item.brand && <Text style={[styles.hint, { color: colors.textLight }]}>{item.brand}</Text>}
              </View>
              <View style={[styles.checkbox, { borderColor: isSel ? colors.primary : colors.border, backgroundColor: isSel ? colors.primary : 'transparent' }]}>
                {isSel && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </Pressable>
          );
        }}
      />
      <View style={[styles.footer, { borderColor: colors.border }]}>
        <AppButton
          title={selected.size > 0 ? `Add ${selected.size} selected` : 'Select products'}
          onPress={onConfirm}
          disabled={selected.size === 0}
          fullWidth
        />
      </View>
    </SafeAreaView>
  </Modal>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  coverGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '500', marginBottom: 8 },
  cover: { alignSelf: 'center', marginBottom: 4 },
  field: { marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  rowLabel: { fontSize: 16, fontWeight: '500' },
  hint: { fontSize: 13 },
  save: { marginTop: 20 },
  section: { marginTop: 28, marginBottom: 8 },
  empty: { fontSize: 14, paddingVertical: 12 },
  searchInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  pickerName: { fontSize: 15, fontWeight: '500' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 18 },
  footer: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
});

export default CreateCollectionScreen;
