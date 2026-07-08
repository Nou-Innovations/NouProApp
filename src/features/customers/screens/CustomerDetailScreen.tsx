/**
 * CustomerDetailScreen — a single customer's profile: contact info, lifetime
 * totals, and their invoice/order history. "Create invoice" prefills the client.
 * Edit (header) → AddCustomer in edit mode. Delete is admin-only (backend enforced).
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { SectionTitle, ListItemCard, AppButton, TextButton } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { RootStackParamList } from '@/shared/types/navigation';
import { formatCurrency, formatRelativeTime } from '@/shared/utils/format';
import { getCustomer, deleteCustomer, CustomerWithHistory } from '../customers.service';

export default function CustomerDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'CustomerDetail'>>();
  const { customerId } = route.params;
  const { theme: appTheme } = useTheme();
  const c = appTheme.colors;
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const companyId = activeBusiness?.id || '';

  const [customer, setCustomer] = useState<CustomerWithHistory | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) return;
    try {
      setCustomer(await getCustomer(companyId, customerId));
    } catch (e: any) {
      AppAlert.alert('Error', e?.message || 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [companyId, customerId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onEdit = () => navigation.navigate('AddCustomer', { customerId });

  const onCreateInvoice = () => {
    if (!customer) return;
    navigation.navigate('CreateInvoice', {
      presetCustomer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        customerBusinessId: customer.customerBusinessId,
      },
    });
  };

  const onDelete = () => {
    AppAlert.alert('Delete customer', `Delete "${customer?.name}"? Their invoices and orders are not deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCustomer(companyId, customerId);
            navigation.goBack();
          } catch (e: any) {
            AppAlert.alert('Error', e?.message || 'Failed to delete customer');
          }
        },
      },
    ]);
  };

  const contactRow = (icon: string, value?: string | null) =>
    value ? (
      <Text style={[styles.contactLine, { color: c.textLight }]}>{value}</Text>
    ) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <SecondaryHeader
        title={customer?.name || 'Customer'}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack(), accessibilityLabel: 'Back' }}
        rightActions={[{ icon: 'create-outline', onPress: onEdit, accessibilityLabel: 'Edit customer' }]}
      />
      {loading || !customer ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Contact */}
          <View style={[styles.card, { backgroundColor: c.cardBackground, borderColor: c.borderColor }]}>
            <Text style={[styles.name, { color: c.text }]}>{customer.name}</Text>
            {customer.customerBusiness ? (
              <Text style={[styles.linkedBadge, { color: c.primary }]}>Linked to {customer.customerBusiness.name}</Text>
            ) : null}
            {contactRow('person', customer.contactName)}
            {contactRow('mail', customer.email)}
            {contactRow('call', customer.phone)}
            {contactRow('location', customer.address)}
            {customer.notes ? <Text style={[styles.notes, { color: c.textLight }]}>{customer.notes}</Text> : null}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <Stat label="Invoiced" value={formatCurrency(customer.stats.totalInvoiced)} color={c} />
            <Stat label="Invoices" value={String(customer.stats.invoiceCount)} color={c} />
            <Stat label="Orders" value={String(customer.stats.orderCount)} color={c} />
          </View>

          <AppButton title="Create invoice" onPress={onCreateInvoice} fullWidth style={styles.cta} />

          {/* Invoices */}
          <SectionTitle style={styles.section}>Invoices</SectionTitle>
          {customer.invoices.length === 0 ? (
            <Text style={[styles.empty, { color: c.textLight }]}>No invoices yet.</Text>
          ) : (
            customer.invoices.map((inv) => (
              <ListItemCard
                key={inv.id}
                avatar={{ type: 'icon', icon: inv.type === 'estimate' ? 'document-text-outline' : 'receipt-outline' }}
                title={inv.invoiceNumber || (inv.type === 'estimate' ? 'Estimate' : 'Invoice')}
                subtitle={`${formatCurrency(inv.totalAmount || 0)} · ${inv.status || 'DRAFT'} · ${formatRelativeTime(inv.createdAt)}`}
              />
            ))
          )}

          {/* Orders */}
          <SectionTitle style={styles.section}>Orders</SectionTitle>
          {customer.orders.length === 0 ? (
            <Text style={[styles.empty, { color: c.textLight }]}>No orders yet.</Text>
          ) : (
            customer.orders.map((ord) => (
              <ListItemCard
                key={ord.id}
                avatar={{ type: 'icon', icon: 'cart-outline' }}
                title={ord.id}
                subtitle={`${formatCurrency(ord.totalAmount || 0)} · ${ord.status || ''} · ${formatRelativeTime(ord.createdAt)}`}
              />
            ))
          )}

          <TextButton title="Delete customer" onPress={onDelete} tone="danger" style={styles.delete} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: any }) {
  return (
    <View style={[styles.stat, { backgroundColor: color.cardBackground, borderColor: color.borderColor }]}>
      <Text style={[styles.statValue, { color: color.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statLabel, { color: color.textLight }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  name: { fontSize: 20, fontWeight: '700' },
  linkedBadge: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  contactLine: { fontSize: 15, marginTop: 8 },
  notes: { fontSize: 14, marginTop: 12, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 4 },
  cta: { marginBottom: 8 },
  section: { marginTop: 20, marginBottom: 8 },
  empty: { fontSize: 14, paddingVertical: 8 },
  delete: { alignSelf: 'center', marginTop: 28 },
});
