/**
 * PersonalDeliveryDetailScreen - Personal Mode
 * Shows limited delivery details for staff members
 * "See more details" switches to Professional mode if user has access
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { get } from '@/shared/services/api';
import Avatar from '@/shared/components/ui/Avatar';
import type { RootStackParamList } from '@/shared/types/navigation';
import {
  type Delivery,
  type DeliveryStatus,
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_COLORS,
} from '@/shared/types/delivery';

export default function PersonalDeliveryDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { theme: appTheme } = useTheme();

  const { taskId, businessId, hasFullAccess } = route.params as {
    taskId: string;
    businessId: string;
    hasFullAccess: boolean;
  };

  const switchToBusiness = useProfileStore((state) => state.switchToBusiness);
  const userBusinesses = useProfileStore((state) => state.userBusinesses);

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch delivery from API
  useEffect(() => {
    const fetchDelivery = async () => {
      try {
        setIsLoading(true);
        const data = await get<Delivery>(`/companies/${businessId}/deliveries/${taskId}`);
        setDelivery(data);
        setFetchError(null);
      } catch (err) {
        console.error('Error fetching delivery:', err);
        setFetchError('Unable to load delivery details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDelivery();
  }, [taskId, businessId]);

  // Resolve company name from store
  const companyName = delivery?.distributorName
    || userBusinesses.find(ub => ub.business.id === businessId)?.business.name
    || 'Business';
  const companyLogo = userBusinesses.find(ub => ub.business.id === businessId)?.business.logo_url
    || undefined;

  const formatScheduledTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const scheduleDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    let dateStr = '';
    if (scheduleDate.getTime() === today.getTime()) {
      dateStr = 'Today';
    } else if (scheduleDate.getTime() === today.getTime() + 86400000) {
      dateStr = 'Tomorrow';
    } else {
      dateStr = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    }

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return `${dateStr} at ${timeStr}`;
  };

  const getStatusColor = (status: DeliveryStatus) => {
    return DELIVERY_STATUS_COLORS[status] || appTheme.colors.neutral;
  };

  const getStatusLabel = (status: DeliveryStatus) => {
    return DELIVERY_STATUS_LABELS[status] || status;
  };

  const handleSeeMoreDetails = async () => {
    // Check if user has access to this business
    const hasBusiness = userBusinesses.some(ub => ub.business.id === businessId);

    if (!hasBusiness) {
      Alert.alert(
        'Access Denied',
        'You do not have access to view full details for this business.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!hasFullAccess) {
      Alert.alert(
        'Limited Access',
        'As a staff member, you only have access to the delivery information shown here. Contact your admin for more details.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Switch to business mode and navigate to full delivery details
    try {
      const success = await switchToBusiness(businessId);
      if (success) {
        setTimeout(() => {
          navigation.navigate('DeliveryDetail', { deliveryId: taskId });
        }, 100);
      }
    } catch (err) {
      console.error('Error switching to business:', err);
      Alert.alert('Error', 'Could not switch to business profile');
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: appTheme.colors.background }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Icon name="chevron-back" size={24} color={appTheme.colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: appTheme.colors.text }]}>
        Delivery Details
      </Text>
      <View style={{ width: 40 }} />
    </View>
  );

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: appTheme.colors.background }]}
        edges={['top']}
      >
        {renderHeader()}
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (fetchError || !delivery) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: appTheme.colors.background }]}
        edges={['top']}
      >
        {renderHeader()}
        <View style={[styles.errorContainer, { backgroundColor: appTheme.colors.surface }]}>
          <Icon name="alert-circle-outline" size={32} color={appTheme.colors.error} />
          <Text style={[styles.errorTitle, { color: appTheme.colors.error }]}>
            {fetchError || 'Delivery not found'}
          </Text>
          <Text style={[styles.errorSubtitle, { color: appTheme.colors.textSecondary }]}>
            Please go back and try again
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const status = delivery.deliveryStatus as DeliveryStatus;
  const items = (delivery.items || []) as { name: string; quantityOrdered?: number; quantity?: number }[];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      {renderHeader()}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Company & Status */}
        <View style={[styles.section, { backgroundColor: appTheme.colors.cardBackground }]}>
          <View style={styles.companyRow}>
            <Avatar
              userId={businessId}
              userName={companyName}
              imageUri={companyLogo}
              size={48}
            />
            <View style={styles.companyInfo}>
              <Text style={[styles.companyName, { color: appTheme.colors.text }]}>
                {companyName}
              </Text>
              <Text style={[styles.deliveryId, { color: appTheme.colors.textLight }]}>
                {delivery.id}
              </Text>
            </View>
            {status && (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
                  {getStatusLabel(status)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Delivery Information */}
        <View style={[styles.section, { backgroundColor: appTheme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
            Delivery Information
          </Text>

          <View style={[styles.infoRow, { borderBottomColor: appTheme.colors.borderColor }]}>
            <View style={[styles.infoIcon, { backgroundColor: appTheme.colors.inputBackground }]}>
              <Icon name="location-outline" size={20} color={appTheme.colors.textLight} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textLight }]}>Location</Text>
              <Text style={[styles.infoValue, { color: appTheme.colors.text }]}>
                {delivery.clientAddress || 'Not specified'}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: appTheme.colors.borderColor }]}>
            <View style={[styles.infoIcon, { backgroundColor: appTheme.colors.inputBackground }]}>
              <Icon name="calendar-outline" size={20} color={appTheme.colors.textLight} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textLight }]}>Scheduled On</Text>
              <Text style={[styles.infoValue, { color: appTheme.colors.text }]}>
                {delivery.expectedDeliveryDateTime
                  ? formatScheduledTime(delivery.expectedDeliveryDateTime)
                  : 'Not scheduled'}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: appTheme.colors.borderColor }]}>
            <View style={[styles.infoIcon, { backgroundColor: appTheme.colors.inputBackground }]}>
              <Icon name="car-outline" size={20} color={appTheme.colors.textLight} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textLight }]}>Transport Mode</Text>
              <Text style={[styles.infoValue, { color: appTheme.colors.text }]}>
                {delivery.transportMode || 'Not assigned'}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: appTheme.colors.borderColor }]}>
            <View style={[styles.infoIcon, { backgroundColor: appTheme.colors.inputBackground }]}>
              <Icon name="person-outline" size={20} color={appTheme.colors.textLight} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textLight }]}>Assigned Staff</Text>
              <Text style={[styles.infoValue, { color: appTheme.colors.text }]}>
                {delivery.assignedTo || 'You'}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.infoIcon, { backgroundColor: appTheme.colors.inputBackground }]}>
              <Icon name="business-outline" size={20} color={appTheme.colors.textLight} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textLight }]}>From</Text>
              <Text style={[styles.infoValue, { color: appTheme.colors.text }]}>
                {delivery.fromLocation || companyName}
              </Text>
            </View>
          </View>
        </View>

        {/* Products */}
        {items.length > 0 && (
          <View style={[styles.section, { backgroundColor: appTheme.colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
              Products ({items.length})
            </Text>

            {items.map((product, index) => (
              <View
                key={index}
                style={[
                  styles.productRow,
                  index !== items.length - 1 && { borderBottomWidth: 1, borderBottomColor: appTheme.colors.borderColor }
                ]}
              >
                <View style={[styles.productIcon, { backgroundColor: appTheme.colors.inputBackground }]}>
                  <Icon name="cube-outline" size={20} color={appTheme.colors.textLight} />
                </View>
                <Text style={[styles.productName, { color: appTheme.colors.text }]} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={[styles.productQuantity, { color: appTheme.colors.primary }]}>
                  x{product.quantityOrdered || product.quantity || 0}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* See More Details Button */}
        <TouchableOpacity
          style={[styles.seeMoreButton, { backgroundColor: appTheme.colors.primary }]}
          onPress={handleSeeMoreDetails}
        >
          <Text style={styles.seeMoreButtonText}>See more details</Text>
          <Icon name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={[styles.noteText, { color: appTheme.colors.textLight }]}>
          {hasFullAccess
            ? 'Tap "See more details" to switch to Professional mode and view full order information.'
            : 'As a staff member, you have limited access to delivery details. Contact your admin for more information.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.primary.bold,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: theme.spacing.xl,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    marginHorizontal: theme.spacing.md,
    borderRadius: 12,
    gap: 4,
    marginTop: theme.spacing.lg,
  },
  errorTitle: {
    fontSize: theme.fontSize.lg,
    fontFamily: theme.fonts.primary.medium,
    marginTop: theme.spacing.sm,
  },
  errorSubtitle: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  section: {
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: theme.spacing.md,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  companyName: {
    fontSize: theme.fontSize.lg,
    fontFamily: theme.fonts.primary.bold,
  },
  deliveryId: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.medium,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: theme.fontSize.xs,
    fontFamily: theme.fonts.primary.regular,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.medium,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  productIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  productName: {
    flex: 1,
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.regular,
    marginRight: theme.spacing.sm,
  },
  productQuantity: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.bold,
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: theme.spacing.sm,
    gap: 8,
  },
  seeMoreButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.bold,
  },
  noteText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: 20,
  },
});
