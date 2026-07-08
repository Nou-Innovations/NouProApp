/**
 * SetTargetsScreen — set this month's revenue / orders goals (feeds the Variance
 * "Targets" section). Backed by analytics.service saveTargets (PUT /targets).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { KeyboardAwareScreen } from '@/shared/components/layout';
import { AppTextField, AppButton } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { RootStackParamList } from '@/shared/types/navigation';
import { getTargets, saveTargets } from '../analytics.service';

const monthKey = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
};

export default function SetTargetsScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'SetTargets'>>();
  const { theme: appTheme } = useTheme();
  const c = appTheme.colors;
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const companyId = activeBusiness?.id || '';
  const period = route.params?.period || monthKey();

  const [revenueTarget, setRevenueTarget] = useState('');
  const [ordersTarget, setOrdersTarget] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    getTargets(companyId, period)
      .then((t) => {
        if (t.revenueTarget != null) setRevenueTarget(String(t.revenueTarget));
        if (t.ordersTarget != null) setOrdersTarget(String(t.ordersTarget));
      })
      .catch(() => { /* new period, no target yet */ })
      .finally(() => setLoading(false));
  }, [companyId, period]);

  const handleSave = async () => {
    if (!companyId) { AppAlert.alert('Error', 'No active business found.'); return; }
    setSaving(true);
    try {
      await saveTargets(companyId, {
        period,
        revenueTarget: revenueTarget.trim() ? Number(revenueTarget) : null,
        ordersTarget: ordersTarget.trim() ? Number(ordersTarget) : null,
      });
      navigation.goBack();
    } catch (e: any) {
      AppAlert.alert('Error', e?.message || 'Failed to save targets');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <SecondaryHeader
        title="Set targets"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack(), accessibilityLabel: 'Back' }}
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={c.primary} /></View>
      ) : (
        <KeyboardAwareScreen style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={[styles.period, { color: c.textLight }]}>Goals for {period}</Text>
          <AppTextField label="Revenue target (Rs)" value={revenueTarget} onChangeText={setRevenueTarget} placeholder="e.g. 100000" keyboardType="numeric" containerStyle={styles.field} />
          <AppTextField label="Orders target" value={ordersTarget} onChangeText={setOrdersTarget} placeholder="e.g. 50" keyboardType="numeric" containerStyle={styles.field} />
          <AppButton title="Save targets" onPress={handleSave} loading={saving} disabled={saving} fullWidth style={styles.save} />
        </KeyboardAwareScreen>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  period: { fontSize: 14, marginBottom: 16 },
  field: { marginBottom: 16 },
  save: { marginTop: 12 },
});
