/**
 * CreateRecipeScreen — create or edit a recipe (bill-of-materials).
 *
 * Create: pick the finished product + batch size → create. Then (edit mode) add
 * ingredient products with quantities; a live cost/margin summary updates from the
 * server. Mirrors CreateCollectionScreen's create-then-add flow. Backed by recipes.service.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { SectionTitle, ListItemCard, AppButton, AppTextField } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { RootStackParamList } from '@/shared/types/navigation';
import { formatCurrency } from '@/shared/utils/format';
import { getProducts } from '@/features/products/products.service';
import { UIProduct } from '@/shared/types/product';
import {
  getRecipe, createRecipe, updateRecipe, addIngredients, removeIngredient, Recipe,
} from '../recipes.service';

export default function CreateRecipeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'CreateRecipe'>>();
  const { theme: appTheme } = useTheme();
  const c = appTheme.colors;
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const companyId = activeBusiness?.id || '';

  const [recipeId, setRecipeId] = useState<string | undefined>(route.params?.recipeId);
  const isEdit = !!recipeId;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [name, setName] = useState('');
  const [batchSize, setBatchSize] = useState('1');
  const [yieldUnit, setYieldUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const [products, setProducts] = useState<UIProduct[]>([]);
  const [finishedPickerOpen, setFinishedPickerOpen] = useState(false);
  const [ingredientPickerOpen, setIngredientPickerOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getProducts({ companyId }).then(setProducts).catch(() => { /* products optional */ });
  }, [companyId]);

  const applyRecipe = (r: Recipe) => {
    setRecipe(r);
    setName(r.name);
    setBatchSize(String(r.batchSize));
    setYieldUnit(r.yieldUnit || '');
    setNotes(r.notes || '');
    setProductId(r.productId);
    setProductName(r.product?.name || '');
  };

  useEffect(() => {
    if (!isEdit || !companyId || !recipeId) return;
    getRecipe(companyId, recipeId)
      .then(applyRecipe)
      .catch(() => { AppAlert.alert('Error', 'Failed to load recipe'); navigation.goBack(); })
      .finally(() => setLoading(false));
  }, [isEdit, companyId, recipeId]);

  const isValid = !!productId && name.trim().length > 0;

  const handleSave = async () => {
    if (!companyId) { AppAlert.alert('Error', 'No active business found.'); return; }
    if (!isValid) { AppAlert.alert('Check the form', 'Pick a finished product and give the recipe a name.'); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        batchSize: Number(batchSize) > 0 ? Math.floor(Number(batchSize)) : 1,
        yieldUnit: yieldUnit.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (recipeId) {
        applyRecipe(await updateRecipe(companyId, recipeId, payload));
        AppAlert.alert('Saved', 'Recipe updated.');
      } else {
        const created = await createRecipe(companyId, { productId, ...payload });
        setRecipeId(created.id);
        applyRecipe(created);
        AppAlert.alert('Recipe created', 'Now add the ingredients below.');
      }
    } catch (e: any) {
      AppAlert.alert('Error', e?.message || 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  const usedIds = useMemo(
    () => new Set([productId, ...(recipe?.ingredients || []).map((i) => i.productId)]),
    [productId, recipe],
  );
  const pickerProducts = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search],
  );
  const ingredientProducts = useMemo(
    () => pickerProducts.filter((p) => !usedIds.has(p.id)),
    [pickerProducts, usedIds],
  );

  const selectFinished = (p: UIProduct) => {
    setProductId(p.id);
    setProductName(p.name);
    if (!name.trim()) setName(p.name);
    setFinishedPickerOpen(false);
    setSearch('');
  };

  const addIngredient = async (pid: string, quantity: number) => {
    if (!recipeId) return;
    try {
      applyRecipe(await addIngredients(companyId, recipeId, [{ productId: pid, quantity }]));
      setIngredientPickerOpen(false);
      setSearch('');
    } catch (e: any) {
      AppAlert.alert('Error', e?.message || 'Failed to add ingredient');
    }
  };

  const onRemoveIngredient = (pid: string, label: string) => {
    if (!recipeId) return;
    AppAlert.alert('Remove ingredient', `Remove "${label}" from this recipe?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try { applyRecipe(await removeIngredient(companyId, recipeId, pid)); }
          catch (e: any) { AppAlert.alert('Error', e?.message || 'Failed to remove ingredient'); }
        },
      },
    ]);
  };

  const cost = recipe?.cost;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <SecondaryHeader
        title={isEdit ? 'Edit recipe' : 'New recipe'}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack(), accessibilityLabel: 'Back' }}
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={c.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Finished product */}
          <Text style={[styles.label, { color: c.textSecondary }]}>Finished product</Text>
          {isEdit ? (
            <Text style={[styles.finishedName, { color: c.text }]}>{productName}</Text>
          ) : (
            <AppButton
              title={productName || 'Choose a product'}
              variant="secondary"
              onPress={() => setFinishedPickerOpen(true)}
              style={styles.field}
            />
          )}

          <AppTextField label="Recipe name" value={name} onChangeText={setName} placeholder="e.g. House blend" containerStyle={styles.field} />
          <View style={styles.row}>
            <AppTextField label="Batch makes" value={batchSize} onChangeText={setBatchSize} placeholder="1" keyboardType="numeric" containerStyle={styles.rowField} />
            <AppTextField label="Unit (optional)" value={yieldUnit} onChangeText={setYieldUnit} placeholder="unit / kg / L" containerStyle={styles.rowField} />
          </View>
          <AppTextField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Method, notes…" isMultiline containerStyle={styles.field} />

          <AppButton
            title={isEdit ? 'Save changes' : 'Create recipe'}
            onPress={handleSave}
            loading={saving}
            disabled={!isValid || saving}
            fullWidth
            style={styles.save}
          />

          {isEdit && cost && (
            <>
              {/* Cost / margin summary */}
              <View style={[styles.costCard, { backgroundColor: c.cardBackground, borderColor: c.borderColor }]}>
                <View style={styles.costRow}>
                  <Text style={[styles.costLabel, { color: c.textSecondary }]}>Ingredient cost (batch of {cost.batchSize})</Text>
                  <Text style={[styles.costValue, { color: c.text }]}>{formatCurrency(cost.batchCost)}</Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={[styles.costLabel, { color: c.textSecondary }]}>Cost per unit</Text>
                  <Text style={[styles.costValue, { color: c.text }]}>{formatCurrency(cost.costPerUnit)}</Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={[styles.costLabel, { color: c.textSecondary }]}>Sells for</Text>
                  <Text style={[styles.costValue, { color: c.text }]}>{formatCurrency(cost.sellPrice)}</Text>
                </View>
                <View style={[styles.costRow, styles.marginRow, { borderTopColor: c.borderColor }]}>
                  <Text style={[styles.costLabel, { color: c.text, fontWeight: '700' }]}>Margin / unit</Text>
                  <Text style={[styles.costValue, { color: cost.marginPerUnit >= 0 ? c.success : c.error, fontWeight: '700' }]}>
                    {formatCurrency(cost.marginPerUnit)}{cost.marginPct != null ? `  (${cost.marginPct}%)` : ''}
                  </Text>
                </View>
                {cost.missingCost && (
                  <Text style={[styles.hint, { color: c.textMuted }]}>Some ingredients have no cost price set — this margin is an estimate.</Text>
                )}
              </View>

              {/* Ingredients */}
              <SectionTitle style={styles.section}>Ingredients</SectionTitle>
              {recipe!.ingredients.length === 0 ? (
                <Text style={[styles.empty, { color: c.textLight }]}>No ingredients yet.</Text>
              ) : (
                recipe!.ingredients.map((ing) => (
                  <ListItemCard
                    key={ing.id}
                    avatar={{ type: 'icon', icon: 'cube-outline' }}
                    title={ing.name}
                    subtitle={`${ing.quantity}${ing.unit ? ' ' + ing.unit : ''} · ${ing.hasCost ? formatCurrency(ing.lineCost) : 'no cost set'}`}
                    showOptionsButton
                    onOptionsPress={() => onRemoveIngredient(ing.productId, ing.name)}
                  />
                ))
              )}
              <AppButton title="Add ingredient" variant="secondary" onPress={() => setIngredientPickerOpen(true)} style={styles.section} />
            </>
          )}
        </ScrollView>
      )}

      {/* Finished-product picker (create mode) */}
      <Modal visible={finishedPickerOpen} animationType="slide" onRequestClose={() => setFinishedPickerOpen(false)}>
        <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
          <SecondaryHeader title="Choose product" leftAction={{ icon: 'close', onPress: () => setFinishedPickerOpen(false) }} />
          <SearchInput value={search} onChange={setSearch} colors={c} />
          <FlatList
            data={pickerProducts}
            keyExtractor={(p) => p.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listPad}
            ListEmptyComponent={<Text style={[styles.empty, { color: c.textLight, textAlign: 'center' }]}>No products.</Text>}
            renderItem={({ item }) => (
              <ListItemCard
                avatar={item.productPicture ? { type: 'image', imageUri: item.productPicture, userName: item.name } : { type: 'initials', userName: item.name }}
                title={item.name}
                subtitle={item.price != null ? formatCurrency(item.price) : undefined}
                onPress={() => selectFinished(item)}
              />
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Ingredient picker (edit mode) — per-row quantity + Add */}
      <IngredientPicker
        visible={ingredientPickerOpen}
        onClose={() => { setIngredientPickerOpen(false); setSearch(''); }}
        products={ingredientProducts}
        search={search}
        onSearch={setSearch}
        colors={c}
        onAdd={addIngredient}
      />
    </SafeAreaView>
  );
}

function SearchInput({ value, onChange, colors }: { value: string; onChange: (s: string) => void; colors: any }) {
  return (
    <View style={styles.searchWrap}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search products…"
        placeholderTextColor={colors.textLight}
        style={[styles.searchInput, { color: colors.text, borderColor: colors.borderColor, backgroundColor: colors.surface }]}
      />
    </View>
  );
}

const IngredientPicker: React.FC<{
  visible: boolean;
  onClose: () => void;
  products: UIProduct[];
  search: string;
  onSearch: (s: string) => void;
  colors: any;
  onAdd: (productId: string, quantity: number) => void;
}> = ({ visible, onClose, products, search, onSearch, colors, onAdd }) => {
  const [qtyById, setQtyById] = useState<Record<string, string>>({});
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <SecondaryHeader title="Add ingredient" leftAction={{ icon: 'close', onPress: onClose }} />
        <SearchInput value={search} onChange={onSearch} colors={colors} />
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listPad}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.textLight, textAlign: 'center' }]}>No products to add.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.pickerRow, { borderColor: colors.borderColor }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.hint, { color: colors.textLight }]}>Cost: {(item as any).costPrice != null ? formatCurrency((item as any).costPrice) : '—'}</Text>
              </View>
              <TextInput
                value={qtyById[item.id] ?? ''}
                onChangeText={(v) => setQtyById((m) => ({ ...m, [item.id]: v }))}
                placeholder="Qty"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                style={[styles.qtyInput, { color: colors.text, borderColor: colors.borderColor }]}
              />
              <AppButton
                title="Add"
                size="small"
                onPress={() => {
                  const q = Number(qtyById[item.id]);
                  if (!q || Number.isNaN(q) || q <= 0) { AppAlert.alert('Enter a quantity', 'Type how much of this ingredient the batch uses.'); return; }
                  onAdd(item.id, q);
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  finishedName: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  field: { marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  rowField: { flex: 1, marginBottom: 16 },
  save: { marginTop: 8 },
  costCard: { marginTop: 24, borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costLabel: { fontSize: 14 },
  costValue: { fontSize: 15, fontWeight: '600' },
  marginRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 2 },
  hint: { fontSize: 12, marginTop: 4 },
  section: { marginTop: 24, marginBottom: 8 },
  empty: { fontSize: 14, paddingVertical: 12 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  listPad: { paddingHorizontal: 16, paddingBottom: 40 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  pickerName: { fontSize: 15, fontWeight: '500' },
  qtyInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, width: 64, textAlign: 'right' },
});
