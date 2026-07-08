/**
 * CreateDiscountScreen — create or edit a promotion / coupon.
 *
 * Type (% or fixed) × scope (all / specific products / a category) + optional coupon
 * code and start/end window. No code = automatic promotion (applies to matching
 * products + orders + catalog); code = coupon entered at checkout. Backed by
 * discounts.service; creating is Pro+ (enforced backend-side).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Modal, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { KeyboardAwareScreen } from '@/shared/components/layout';
import { AppTextField, AppButton, SectionTitle, DateSelector, ListItemCard } from '@/shared/components/ui';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { RootStackParamList } from '@/shared/types/navigation';
import { BUSINESS_CATEGORIES } from '@/shared/constants/categories';
import { getProducts } from '@/features/products/products.service';
import { UIProduct } from '@/shared/types/product';
import {
  getDiscount, createDiscount, updateDiscount,
  CreateDiscountData, DiscountType, DiscountScope,
} from '../discounts.service';

export default function CreateDiscountScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'CreateDiscount'>>();
  const { theme: appTheme } = useTheme();
  const c = appTheme.colors;
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const companyId = activeBusiness?.id || '';

  const discountId = route.params?.discountId;
  const isEdit = !!discountId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<DiscountType>('PERCENTAGE');
  const [value, setValue] = useState('');
  const [scope, setScope] = useState<DiscountScope>('ALL');
  const [productIds, setProductIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [products, setProducts] = useState<UIProduct[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  useEffect(() => {
    getProducts({ companyId }).then(setProducts).catch(() => { /* products optional */ });
  }, [companyId]);

  useEffect(() => {
    if (!isEdit || !companyId || !discountId) return;
    getDiscount(companyId, discountId)
      .then((d) => {
        setName(d.name || '');
        setDescription(d.description || '');
        setType(d.type);
        setValue(String(d.value));
        setScope(d.scope);
        setProductIds(Array.isArray(d.productIds) ? d.productIds : []);
        setCategories(Array.isArray(d.categories) ? d.categories : []);
        setCode(d.code || '');
        setMinOrderAmount(d.minOrderAmount != null ? String(d.minOrderAmount) : '');
        setMaxUses(d.maxUses != null ? String(d.maxUses) : '');
        setStartDate(d.startDate ? new Date(d.startDate) : null);
        setEndDate(d.endDate ? new Date(d.endDate) : null);
        setIsActive(d.isActive);
      })
      .catch(() => { AppAlert.alert('Error', 'Failed to load discount'); navigation.goBack(); })
      .finally(() => setLoading(false));
  }, [isEdit, companyId, discountId]);

  const numValue = Number(value);
  const isValid = name.trim().length > 0
    && numValue > 0
    && !(type === 'PERCENTAGE' && numValue > 100);

  const toggleProduct = (id: string) =>
    setProductIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleCategory = (id: string) =>
    setCategories((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const pickerProducts = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(pickerSearch.toLowerCase())),
    [products, pickerSearch],
  );

  const handleSave = async () => {
    if (!companyId) { AppAlert.alert('Error', 'No active business found.'); return; }
    if (!isValid) { AppAlert.alert('Check the form', 'Enter a name and a valid amount (percentage must be 1–100).'); return; }
    if (scope === 'PRODUCTS' && productIds.length === 0) { AppAlert.alert('Pick products', 'Choose at least one product, or change the scope to All products.'); return; }
    if (scope === 'CATEGORY' && categories.length === 0) { AppAlert.alert('Pick a category', 'Choose at least one category, or change the scope to All products.'); return; }

    setSaving(true);
    try {
      const data: CreateDiscountData = {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        value: numValue,
        scope,
        productIds: scope === 'PRODUCTS' ? productIds : [],
        categories: scope === 'CATEGORY' ? categories : [],
        code: code.trim() ? code.trim().toUpperCase() : null,
        minOrderAmount: minOrderAmount.trim() ? Number(minOrderAmount) : null,
        maxUses: maxUses.trim() ? Number(maxUses) : null,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        isActive,
      };
      if (isEdit && discountId) await updateDiscount(companyId, discountId, data);
      else await createDiscount(companyId, data);
      navigation.goBack();
    } catch (e: any) {
      AppAlert.alert('Error', e?.message || `Failed to ${isEdit ? 'update' : 'create'} discount`);
    } finally {
      setSaving(false);
    }
  };

  const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.chip, { backgroundColor: active ? c.primary : c.cardBackground, borderColor: active ? c.primary : c.borderColor }]}
    >
      <Text style={[styles.chipText, { color: active ? '#FFFFFF' : c.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  const dateRow = (label: string, date: Date | null, show: boolean, setShow: (v: boolean) => void, setDate: (d: Date | null) => void) => (
    <>
      <TouchableOpacity
        style={[styles.dateRow, { borderColor: c.borderColor, backgroundColor: c.cardBackground }]}
        onPress={() => setShow(!show)}
        activeOpacity={0.7}
      >
        <Text style={[styles.dateLabel, { color: c.text }]}>{label}</Text>
        <View style={styles.dateRight}>
          <Text style={{ color: date ? c.text : c.textMuted, fontSize: 15 }}>
            {date ? format(date, 'dd MMM yyyy') : 'Any time'}
          </Text>
          {date ? (
            <Text onPress={() => setDate(null)} style={[styles.clear, { color: c.error }]}>Clear</Text>
          ) : (
            <Icon name="calendar-outline" size={18} color={c.textSecondary} />
          )}
        </View>
      </TouchableOpacity>
      {show && (
        <DateSelector
          value={date || new Date()}
          onChange={(d) => { setDate(d); setShow(false); }}
          style={styles.calendar}
        />
      )}
    </>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <SecondaryHeader
        title={isEdit ? 'Edit discount' : 'New discount'}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack(), accessibilityLabel: 'Back' }}
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={c.primary} /></View>
      ) : (
        <KeyboardAwareScreen style={styles.scroll} contentContainerStyle={styles.content}>
          <AppTextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Summer Sale" containerStyle={styles.field} />
          <AppTextField label="Description (optional)" value={description} onChangeText={setDescription} placeholder="Shown to you only" containerStyle={styles.field} />

          <SectionTitle style={styles.section}>Amount</SectionTitle>
          <View style={styles.chipRow}>
            <Chip label="Percentage" active={type === 'PERCENTAGE'} onPress={() => setType('PERCENTAGE')} />
            <Chip label="Fixed amount" active={type === 'FIXED'} onPress={() => setType('FIXED')} />
          </View>
          <AppTextField
            label={type === 'PERCENTAGE' ? 'Percent off (1–100)' : 'Amount off (Rs)'}
            value={value}
            onChangeText={setValue}
            placeholder={type === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 50'}
            keyboardType="numeric"
            containerStyle={styles.field}
          />

          <SectionTitle style={styles.section}>Applies to</SectionTitle>
          <View style={styles.chipRow}>
            <Chip label="All products" active={scope === 'ALL'} onPress={() => setScope('ALL')} />
            <Chip label="Specific products" active={scope === 'PRODUCTS'} onPress={() => setScope('PRODUCTS')} />
            <Chip label="A category" active={scope === 'CATEGORY'} onPress={() => setScope('CATEGORY')} />
          </View>

          {scope === 'PRODUCTS' && (
            <AppButton
              title={productIds.length ? `${productIds.length} product${productIds.length === 1 ? '' : 's'} selected` : 'Choose products'}
              variant="secondary"
              onPress={() => setPickerOpen(true)}
              style={styles.field}
            />
          )}

          {scope === 'CATEGORY' && (
            <View style={[styles.chipRow, styles.field]}>
              {BUSINESS_CATEGORIES.map((cat) => (
                <Chip key={cat.id} label={cat.label} active={categories.includes(cat.id)} onPress={() => toggleCategory(cat.id)} />
              ))}
            </View>
          )}

          <SectionTitle style={styles.section}>Coupon code (optional)</SectionTitle>
          <Text style={[styles.hint, { color: c.textLight }]}>
            Leave empty for an automatic promotion. Add a code (e.g. SUMMER10) buyers enter at checkout.
          </Text>
          <AppTextField label="Code" value={code} onChangeText={setCode} placeholder="Automatic if empty" autoCapitalize="characters" containerStyle={styles.field} />

          <SectionTitle style={styles.section}>Schedule (optional)</SectionTitle>
          {dateRow('Starts', startDate, showStart, setShowStart, setStartDate)}
          {dateRow('Ends', endDate, showEnd, setShowEnd, setEndDate)}

          <SectionTitle style={styles.section}>Limits (optional)</SectionTitle>
          <AppTextField label="Minimum order (Rs)" value={minOrderAmount} onChangeText={setMinOrderAmount} placeholder="No minimum" keyboardType="numeric" containerStyle={styles.field} />
          <AppTextField label="Max redemptions" value={maxUses} onChangeText={setMaxUses} placeholder="Unlimited" keyboardType="numeric" containerStyle={styles.field} />

          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: c.text }]}>Active</Text>
            <Switch value={isActive} onValueChange={setIsActive} />
          </View>

          <AppButton
            title={isEdit ? 'Save changes' : 'Create discount'}
            onPress={handleSave}
            loading={saving}
            disabled={!isValid || saving}
            fullWidth
            style={styles.save}
          />
        </KeyboardAwareScreen>
      )}

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
          <SecondaryHeader
            title={`Products (${productIds.length})`}
            leftAction={{ icon: 'close', onPress: () => setPickerOpen(false) }}
            rightActions={[{ icon: 'checkmark', onPress: () => setPickerOpen(false), accessibilityLabel: 'Done' }]}
          />
          <View style={styles.searchWrap}>
            <AppTextField label="" value={pickerSearch} onChangeText={setPickerSearch} placeholder="Search products…" />
          </View>
          <FlatList
            data={pickerProducts}
            keyExtractor={(p) => p.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            renderItem={({ item }) => (
              <ListItemCard
                avatar={{ type: 'initials', userName: item.name }}
                title={item.name}
                subtitle={item.category || undefined}
                onPress={() => toggleProduct(item.id)}
                selected={productIds.includes(item.id)}
                showCheckmark
              />
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  field: { marginBottom: 16 },
  section: { marginTop: 20, marginBottom: 10 },
  hint: { fontSize: 13, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: '600' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, marginBottom: 10 },
  dateLabel: { fontSize: 15, fontWeight: '500' },
  dateRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clear: { fontSize: 14, fontWeight: '600' },
  calendar: { marginBottom: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  statusLabel: { fontSize: 16, fontWeight: '500' },
  save: { marginTop: 16 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 8 },
});
