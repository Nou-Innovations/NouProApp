/**
 * PersonalDeliveryDetailScreen - Personal Mode
 * Shows limited delivery details for staff members
 * "See more details" switches to Professional mode if user has access
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import Avatar from '@/shared/components/ui/Avatar';

// Mock delivery data - In real app, this would come from API based on taskId
const getMockDeliveryData = (taskId: string) => ({
  id: taskId,
  deliveryId: 'DEL-2025-001',
  companyName: 'NouPro Distribution',
  companyLogo: 'https://picsum.photos/seed/noupro/100/100',
  location: 'Port Louis, Rose Hill Road, Near Market Square',
  scheduledOn: new Date(Date.now() + 7200000).toISOString(),
  assignedTransport: 'Van #1 - ABC 1234',
  assignedStaff: 'You',
  warehouse: 'Warehouse A - Port Louis',
  status: 'pending' as const,
  products: [
    { name: 'Premium Orange Juice 1L', quantity: 20 },
    { name: 'Mineral Water 6-Pack', quantity: 15 },
    { name: 'Energy Drink 500ml', quantity: 30 },
    { name: 'Sparkling Water 1.5L', quantity: 10 },
  ],
});

type DeliveryStatus = 'pending' | 'in_progress' | 'completed';

export default function PersonalDeliveryDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme: appTheme } = useTheme();
  
  const { taskId, businessId, hasFullAccess } = route.params as {
    taskId: string;
    businessId: string;
    hasFullAccess: boolean;
  };
  
  const switchToBusiness = useProfileStore((state) => state.switchToBusiness);
  const userBusinesses = useProfileStore((state) => state.userBusinesses);
  
  // Get delivery data
  const delivery = getMockDeliveryData(taskId);
  
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
    const colors: Record<DeliveryStatus, string> = {
      pending: '#F59E0B',
      in_progress: '#0EA5E9',
      completed: '#22C55E',
    };
    return colors[status];
  };

  const getStatusLabel = (status: DeliveryStatus) => {
    const labels: Record<DeliveryStatus, string> = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
    };
    return labels[status];
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
        // Mode switch happens via store - MainTabNavigator will automatically render BusinessTabNavigator
        // Navigate to the delivery detail screen after a short delay to allow mode switch to complete
        setTimeout(() => {
          // @ts-ignore
          navigation.navigate('DeliveryDetail', { deliveryId: delivery.id });
        }, 100);
      }
    } catch (error) {
      console.error('Error switching to business:', error);
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
              userName={delivery.companyName}
              imageUri={delivery.companyLogo}
              size={48}
            />
            <View style={styles.companyInfo}>
              <Text style={[styles.companyName, { color: appTheme.colors.text }]}>
                {delivery.companyName}
              </Text>
              <Text style={[styles.deliveryId, { color: appTheme.colors.textLight }]}>
                {delivery.deliveryId}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(delivery.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(delivery.status) }]}>
                {getStatusLabel(delivery.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Information */}
        <View style={[styles.section, { backgroundColor: appTheme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
            Delivery Information
          </Text>
          
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: appTheme.colors.inputBackground }]}>
              <Icon name="location-outline" size={20} color={appTheme.colors.textLight} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textLight }]}>Location</Text>
              <Text style={[styles.infoValue, { color: appTheme.colors.text }]}>{delivery.location}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: appTheme.colors.inputBackground }]}>
              <Icon name="calendar-outline" size={20} color={appTheme.colors.textLight} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textLight }]}>Scheduled On</Text>
              <Text style={[styles.infoValue, { color: appTheme.colors.text }]}>{formatScheduledTime(delivery.scheduledOn)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: appTheme.colors.inputBackground }]}>
              <Icon name="car-outline" size={20} color={appTheme.colors.textLight} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textLight }]}>Assigned Transport</Text>
              <Text style={[styles.infoValue, { color: appTheme.colors.text }]}>{delivery.assignedTransport}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: appTheme.colors.inputBackground }]}>
              <Icon name="person-outline" size={20} color={appTheme.colors.textLight} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textLight }]}>Assigned Staff</Text>
              <Text style={[styles.infoValue, { color: appTheme.colors.text }]}>{delivery.assignedStaff}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.infoIcon, { backgroundColor: appTheme.colors.inputBackground }]}>
              <Icon name="business-outline" size={20} color={appTheme.colors.textLight} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textLight }]}>From Warehouse</Text>
              <Text style={[styles.infoValue, { color: appTheme.colors.text }]}>{delivery.warehouse}</Text>
            </View>
          </View>
        </View>

        {/* Products */}
        <View style={[styles.section, { backgroundColor: appTheme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
            Products ({delivery.products.length})
          </Text>
          
          {delivery.products.map((product, index) => (
            <View 
              key={index} 
              style={[
                styles.productRow,
                index !== delivery.products.length - 1 && { borderBottomWidth: 1, borderBottomColor: appTheme.colors.borderColor }
              ]}
            >
              <View style={[styles.productIcon, { backgroundColor: appTheme.colors.inputBackground }]}>
                <Icon name="cube-outline" size={20} color={appTheme.colors.textLight} />
              </View>
              <Text style={[styles.productName, { color: appTheme.colors.text }]} numberOfLines={1}>
                {product.name}
              </Text>
              <Text style={[styles.productQuantity, { color: appTheme.colors.primary }]}>
                x{product.quantity}
              </Text>
            </View>
          ))}
        </View>

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
    borderBottomColor: '#E5E7EB',
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





