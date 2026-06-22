/**
 * CreatePriceListScreen — create or edit a price list.
 *
 * Create mode: name, description, list-wide discount %, active/default toggles.
 * After the list exists (edit mode), per-product fixed-price overrides and the
 * "Assign customers" entry point appear. Backed by priceLists.service.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Switch, Modal, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/shared/types/navigation';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { SectionTitle, ListItemCard, AppButton, AppTextField } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import {
  getPriceList, createPriceList, updatePriceList,
  addPriceListItem, removePriceListItem,
} from '../priceLists.service';
import { getProducts } from '@/features/products/products.service';
import { PriceListItem } from '@/shared/types/pricing';
import { UIProduct } from '@/shared/types/product';

type Props = NativeStackScreenProps<RootStackParamList, 'CreatePriceList'>;

const CreatePriceListScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme: appTheme } = useTheme();
  const c = appTheme.colors;
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const companyId = activeBusiness?.id || '';

  const [listId, setListId] = useState<string | undefined>(route.params?.listId);
  const isEdit = !!listId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discount, setDiscount] = useState(''); // % as string
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [items, setItems] = useState<PriceListItem[]>([]);
  const [products, setProducts] = useState<UIProduct[]>([]);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');

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
    if (route.params?.listId) {
      try {
        const list = await getPriceList(companyId, route.params.listId);
        setName(list.name);
        setDescription(list.description || '');
        setDiscount(list.discountPercent != null ? String(list.discountPercent) : '');
        setIsActive(list.isActive);
        setIsDefault(list.isDefault);
        setItems(list.items || []);
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to load price list');
      }
    }
  }, [companyId, route.params?.listId]);

  useEffect(() => { load(); }, [load]);

  const isValid = name.trim() !== '' && (discount === '' || !Number.isNaN(Number(discount)));

  const corePayload = () => ({
    name: name.trim(),
    description: description.trim() || null,
    discountPercent: discount.trim() === '' ? null : Number(discount),
    isActive,
    isDefault,
  });

  const handleSave = async () => {
    if (!companyId) { Alert.alert('Error', 'No active business found.'); return; }
    setSaving(true);
    try {
      if (listId) {
        await updatePriceList(companyId, listId, corePayload());
        navigation.goBack();
      } else {
        const created = await createPriceList(companyId, corePayload());
        // Stay on the screen in edit mode so overrides/customers can be added now.
        setListId(created.id);
        Alert.alert('Price list created', 'Now add product overrides or assign customers.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save price list');
    } finally {
      setSaving(false);
    }
  };

  const removeOverride = (item: PriceListItem) => {
    if (!listId) return;
    Alert.alert('Remove override', `Remove the custom price for "${productName(item.productId)}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removePriceListItem(companyId, listId, item.id);
            setItems((prev) => prev.filter((x) => x.id !== item.id));
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to remove override');
          }
        },
      },
    ]);
  };

  const overriddenIds = useMemo(() => new Set(items.map((i) => i.productId)), [items]);
  const pickerProducts = useMemo(
    () => products.filter((p) => !overriddenIds.has(p.id) && p.name.toLowerCase().includes(search.toLowerCase())),
    [products, overriddenIds, search],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <SecondaryHeader
        title={isEdit ? 'Edit price list' : 'New price list'}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <AppTextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Key Accounts" containerStyle={styles.field} />
        <AppTextField label="Description (optional)" value={description} onChangeText={setDescription} placeholder="Who is this for?" containerStyle={styles.field} />
        <AppTextField
          label="List-wide discount %"
          value={discount}
          onChangeText={setDiscount}
          placeholder="e.g. 10"
          keyboardType="numeric"
          containerStyle={styles.field}
        />

        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: c.text }]}>Active</Text>
          <Switch value={isActive} onValueChange={setIsActive} />
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: c.text }]}>Default list</Text>
            <Text style={[styles.hint, { color: c.textLight }]}>Applied to customers with no specific assignment (and the public storefront).</Text>
          </View>
          <Switch value={isDefault} onValueChange={setIsDefault} />
        </View>

        <AppButton
          title={isEdit ? 'Save changes' : 'Create price list'}
          onPress={handleSave}
          loading={saving}
          disabled={!isValid || saving}
          fullWidth
          style={styles.save}
        />

        {isEdit && (
          <>
            <SectionTitle style={styles.section}>Product overrides</SectionTitle>
            <Text style={[styles.hint, { color: c.textLight, marginBottom: 8 }]}>
              A fixed price here overrides the list-wide discount for that product.
            </Text>
            {items.length === 0 ? (
              <Text style={[styles.empty, { color: c.textLight }]}>No per-product overrides yet.</Text>
            ) : (
              items.map((item) => (
                <ListItemCard
                  key={item.id}
                  avatar={{ type: 'icon', icon: 'cube-outline' }}
                  title={productName(item.productId)}
                  subtitle={item.fixedPrice != null ? `Fixed: ${item.fixedPrice}` : item.fixedPricePerCarton != null ? `Carton: ${item.fixedPricePerCarton}` : 'Override'}
                  showOptionsButton
                  onOptionsPress={() => removeOverride(item)}
                />
              ))
            )}
            <AppButton title="Add override" variant="secondary" onPress={() => setPickerOpen(true)} style={styles.section} />

            <SectionTitle style={styles.section}>Customers</SectionTitle>
            <AppButton
              title="Assign customers"
              variant="secondary"
              onPress={() => navigation.navigate('AssignCustomers', { listId: listId! })}
            />
          </>
        )}
      </ScrollView>

      <OverridePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        products={pickerProducts}
        search={search}
        onSearch={setSearch}
        colors={c}
        onAdd={async (productId, price) => {
          if (!listId) return;
          try {
            const created = await addPriceListItem(companyId, listId, { productId, fixedPrice: price });
            setItems((prev) => [...prev, created]);
            setPickerOpen(false);
            setSearch('');
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to add override');
          }
        }}
      />
    </SafeAreaView>
  );
};

// Inline product picker with a per-row fixed-price input.
const OverridePicker: React.FC<{
  visible: boolean;
  onClose: () => void;
  products: UIProduct[];
  search: string;
  onSearch: (s: string) => void;
  colors: any;
  onAdd: (productId: string, price: number) => void;
}> = ({ visible, onClose, products, search, onSearch, colors, onAdd }) => {
  const [priceById, setPriceById] = useState<Record<string, string>>({});

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <SecondaryHeader title="Add override" leftAction={{ icon: 'close', onPress: onClose }} />
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
          renderItem={({ item }) => (
            <View style={[styles.pickerRow, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.hint, { color: colors.textLight }]}>Base: {item.price ?? '—'}</Text>
              </View>
              <TextInput
                value={priceById[item.id] ?? ''}
                onChangeText={(v) => setPriceById((m) => ({ ...m, [item.id]: v }))}
                placeholder="Price"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                style={[styles.priceInput, { color: colors.text, borderColor: colors.border }]}
              />
              <AppButton
                title="Add"
                size="small"
                onPress={() => {
                  const v = Number(priceById[item.id]);
                  if (Number.isNaN(v) || priceById[item.id] === undefined || priceById[item.id] === '') {
                    Alert.alert('Enter a price', 'Type a fixed price for this product first.');
                    return;
                  }
                  onAdd(item.id, v);
                }}
              />
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  field: { marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  rowLabel: { fontSize: 16, fontWeight: '500' },
  hint: { fontSize: 13 },
  save: { marginTop: 20 },
  section: { marginTop: 28, marginBottom: 8 },
  empty: { fontSize: 14, paddingVertical: 12 },
  searchInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  pickerName: { fontSize: 15, fontWeight: '500' },
  priceInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, width: 80, textAlign: 'right' },
});

export default CreatePriceListScreen;
