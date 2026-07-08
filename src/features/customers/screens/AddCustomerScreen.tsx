/**
 * AddCustomerScreen — create or edit a customer.
 *
 * Standalone contact fields (name/contact/email/phone/address/notes) plus an
 * optional link to a connected NouPro business (prefills + ties history together).
 * Edit mode also exposes an Active/Archived toggle. Backed by customers.service.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Modal, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { KeyboardAwareScreen } from '@/shared/components/layout';
import { AppTextField, AppButton, ListItemCard } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { RootStackParamList } from '@/shared/types/navigation';
import { getConnectedBusinesses, ConnectedBusiness } from '@/features/pricing/priceLists.service';
import {
  getCustomer, createCustomer, updateCustomer,
  CreateCustomerData, CustomerStatus,
} from '../customers.service';

export default function AddCustomerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddCustomer'>>();
  const { theme: appTheme } = useTheme();
  const c = appTheme.colors;
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const companyId = activeBusiness?.id || '';

  const customerId = route.params?.customerId;
  const isEdit = !!customerId;

  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<CustomerStatus>('ACTIVE');
  const [linkedBusinessId, setLinkedBusinessId] = useState<string | null>(null);
  const [linkedBusinessName, setLinkedBusinessName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  // Link picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [connections, setConnections] = useState<ConnectedBusiness[]>([]);

  useEffect(() => {
    if (!isEdit || !companyId || !customerId) return;
    getCustomer(companyId, customerId)
      .then((cust) => {
        setName(cust.name || '');
        setContactName(cust.contactName || '');
        setEmail(cust.email || '');
        setPhone(cust.phone || '');
        setAddress(cust.address || '');
        setNotes(cust.notes || '');
        setStatus(cust.status || 'ACTIVE');
        setLinkedBusinessId(cust.customerBusinessId || null);
        setLinkedBusinessName(cust.customerBusiness?.name || null);
      })
      .catch(() => {
        AppAlert.alert('Error', 'Failed to load customer');
        navigation.goBack();
      })
      .finally(() => setLoading(false));
  }, [isEdit, companyId, customerId]);

  const openLinkPicker = useCallback(async () => {
    setPickerOpen(true);
    if (connections.length === 0) {
      try {
        setConnections(await getConnectedBusinesses(companyId));
      } catch {
        /* no connections is fine */
      }
    }
  }, [companyId, connections.length]);

  const selectLinked = (cb: ConnectedBusiness) => {
    setLinkedBusinessId(cb.business.id);
    setLinkedBusinessName(cb.business.name);
    if (!name.trim()) setName(cb.business.name);
    setPickerOpen(false);
  };

  const isValid = name.trim().length > 0;

  const handleSave = async () => {
    if (!companyId) { AppAlert.alert('Error', 'No active business found.'); return; }
    if (!isValid) { AppAlert.alert('Error', 'Please enter a customer name'); return; }
    setSaving(true);
    try {
      const data: CreateCustomerData = {
        name: name.trim(),
        contactName: contactName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        customerBusinessId: linkedBusinessId,
        status,
      };
      if (isEdit && customerId) {
        await updateCustomer(companyId, customerId, data);
      } else {
        await createCustomer(companyId, data);
      }
      navigation.goBack();
    } catch (e: any) {
      AppAlert.alert('Error', e?.message || `Failed to ${isEdit ? 'update' : 'add'} customer`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <SecondaryHeader
        title={isEdit ? 'Edit customer' : 'Add customer'}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack(), accessibilityLabel: 'Back' }}
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={c.primary} /></View>
      ) : (
        <KeyboardAwareScreen style={styles.scroll} contentContainerStyle={styles.content}>
          <AppTextField label="Name" value={name} onChangeText={setName} placeholder="Customer or business name" containerStyle={styles.field} />
          <AppTextField label="Contact name (optional)" value={contactName} onChangeText={setContactName} placeholder="Contact person" containerStyle={styles.field} />
          <AppTextField label="Email (optional)" value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" containerStyle={styles.field} />
          <AppTextField label="Phone (optional)" value={phone} onChangeText={setPhone} placeholder="+230 5xxx xxxx" keyboardType="phone-pad" containerStyle={styles.field} />
          <AppTextField label="Address (optional)" value={address} onChangeText={setAddress} placeholder="Street, City" containerStyle={styles.field} />
          <AppTextField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Anything worth remembering" isMultiline containerStyle={styles.field} />

          {/* Optional link to a connected NouPro business */}
          <Text style={[styles.linkLabel, { color: c.textSecondary }]}>Linked business (optional)</Text>
          <TouchableOpacity
            style={[styles.linkRow, { borderColor: c.borderColor, backgroundColor: c.cardBackground }]}
            onPress={openLinkPicker}
            activeOpacity={0.7}
          >
            <Text style={[styles.linkValue, { color: linkedBusinessName ? c.text : c.textMuted }]} numberOfLines={1}>
              {linkedBusinessName || 'Not linked — tap to choose a connection'}
            </Text>
            {linkedBusinessId ? (
              <Text
                onPress={() => { setLinkedBusinessId(null); setLinkedBusinessName(null); }}
                style={[styles.unlink, { color: c.error }]}
              >
                Unlink
              </Text>
            ) : null}
          </TouchableOpacity>

          {isEdit ? (
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, { color: c.text }]}>Active</Text>
              <Switch
                value={status === 'ACTIVE'}
                onValueChange={(v) => setStatus(v ? 'ACTIVE' : 'ARCHIVED')}
              />
            </View>
          ) : null}

          <AppButton
            title={isEdit ? 'Save changes' : 'Add customer'}
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
          <SecondaryHeader title="Link a connection" leftAction={{ icon: 'close', onPress: () => setPickerOpen(false) }} />
          <FlatList
            data={connections}
            keyExtractor={(cb) => cb.connectionId}
            contentContainerStyle={styles.pickerList}
            ListEmptyComponent={
              <Text style={[styles.pickerEmpty, { color: c.textLight }]}>
                No connected businesses yet. Connect with a business first, or just save this as a standalone contact.
              </Text>
            }
            renderItem={({ item }) => (
              <ListItemCard
                avatar={item.business.logoUrl ? { type: 'image', imageUri: item.business.logoUrl, userName: item.business.name } : { type: 'initials', userName: item.business.name }}
                title={item.business.name}
                onPress={() => selectLinked(item)}
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
  content: { padding: 16, paddingBottom: 40 },
  field: { marginBottom: 16 },
  linkLabel: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, gap: 12 },
  linkValue: { flex: 1, fontSize: 15 },
  unlink: { fontSize: 14, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  statusLabel: { fontSize: 16, fontWeight: '500' },
  save: { marginTop: 24 },
  pickerList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  pickerEmpty: { fontSize: 14, textAlign: 'center', paddingVertical: 32, paddingHorizontal: 16 },
});
