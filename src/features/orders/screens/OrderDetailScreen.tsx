/**
 * OrderDetailScreen
 * Displays detailed order information with actions
 * 
 * Based on app-logic.json Phase 4: B2B Ordering System
 * Actions available:
 * - Accept/Reject (for incoming pending orders)
 * - Mark as Completed
 * - Link to Delivery
 * - Cancel (for outgoing pending orders)
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { useOrderStore } from '@/shared/store/orderStore';
import { 
  OrderWithItems, 
  OrderItem, 
  OrderStatus, 
  ORDER_STATUS_COLORS, 
  ORDER_STATUS_LABELS 
} from '@/shared/types/order';
import { RootStackParamList } from '@/shared/types/navigation';
import { formatCurrency, formatRelativeTime } from '@/shared/data/mockOrders';
import { AppModal } from '@/shared/components/ui';
import AppButton from '@/shared/components/ui/AppButton';
import { SecondaryHeader } from '@/shared/components/layout/headers';


type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'OrderDetail'>;

const OrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const { orderId } = route.params;
  
  // Store state
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const { getOrderById, updateOrderStatus, setSelectedOrder } = useOrderStore();
  
  // Get order
  const order = useMemo(() => getOrderById(orderId), [orderId, getOrderById]);
  
  // Determine if this is an incoming or outgoing order
  const businessId = activeBusiness?.id || 'biz-001';
  const isIncoming = order?.to_business_id === businessId;
  const isOutgoing = order?.from_business_id === businessId;

  // Get partner business name
  const partnerName = isIncoming ? order?.from_business_name : order?.to_business_name;
  
  // Success dialog state
  const [showSuccessDialog, setShowSuccessDialog] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState('');

  // Set selected order on mount
  useEffect(() => {
    if (order) {
      setSelectedOrder(order);
    }
    return () => setSelectedOrder(null);
  }, [order, setSelectedOrder]);

  if (!order) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
        <SecondaryHeader
          title="Order Details"
          leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        />
        <View style={styles.notFoundContainer}>
          <Icon name="document-outline" size={64} color={appTheme.colors.textLight} />
          <Text style={[styles.notFoundText, { color: appTheme.colors.text }]}>
            Order not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handle status updates
  const handleAccept = () => {
    Alert.alert(
      'Accept Order',
      'Are you sure you want to accept this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => {
            updateOrderStatus(orderId, 'accepted');
            setSuccessMessage('Order has been accepted');
            setShowSuccessDialog(true);
          },
        },
      ]
    );
  };

  const handleReject = () => {
    Alert.alert(
      'Reject Order',
      'Are you sure you want to reject this order? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            updateOrderStatus(orderId, 'cancelled');
            Alert.alert('Order Rejected', 'The order has been rejected');
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleComplete = () => {
    Alert.alert(
      'Complete Order',
      'Mark this order as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => {
            updateOrderStatus(orderId, 'completed');
            setSuccessMessage('Order has been marked as completed');
            setShowSuccessDialog(true);
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            updateOrderStatus(orderId, 'cancelled');
            Alert.alert('Order Cancelled', 'The order has been cancelled');
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleCreateDelivery = () => {
    navigation.navigate('CreateDelivery', { orderId });
  };

  const handleMessage = () => {
    // Navigate to chat with the partner business
    navigation.navigate('Chat', {
      id: `order-${orderId}`,
      name: partnerName || 'Business',
      isGroup: false,
      partnerId: isIncoming ? order.from_business_id : order.to_business_id,
      partnerType: 'business',
      unreadCount: 0,
    });
  };

  // Get status info
  const statusColor = ORDER_STATUS_COLORS[order.status];
  const statusLabel = ORDER_STATUS_LABELS[order.status];

  // Render order item
  const renderOrderItem = (item: OrderItem) => (
    <View 
      key={item.id} 
      style={[styles.itemCard, { backgroundColor: appTheme.colors.cardBackground }]}
    >
      <View style={styles.itemImagePlaceholder}>
        <Icon name="cube-outline" size={24} color={appTheme.colors.textLight} />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemName, { color: appTheme.colors.text }]} numberOfLines={2}>
          {item.product_name || `Product ${item.product_id}`}
        </Text>
        <Text style={[styles.itemPrice, { color: appTheme.colors.textLight }]}>
          {formatCurrency(item.unit_price)} × {item.quantity}
        </Text>
      </View>
      <Text style={[styles.itemSubtotal, { color: appTheme.colors.text }]}>
        {formatCurrency(item.subtotal)}
      </Text>
    </View>
  );

  // Render action buttons based on order type and status
  const renderActions = () => {
    if (order.status === 'cancelled' || order.status === 'completed') {
      return null;
    }

    return (
      <View style={styles.actionsContainer}>
        {/* Incoming order actions */}
        {isIncoming && order.status === 'pending' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
            >
              <Icon name="close" size={20} color="#EF4444" />
              <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton, { backgroundColor: '#22C55E' }]}
              onPress={handleAccept}
            >
              <Icon name="checkmark" size={20} color="#FFFFFF" />
              <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Accept</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Accepted order actions */}
        {isIncoming && order.status === 'accepted' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: appTheme.colors.primary }]}
              onPress={handleCreateDelivery}
            >
              <Icon name="car-outline" size={20} color={appTheme.colors.primary} />
              <Text style={[styles.actionButtonText, { color: appTheme.colors.primary }]}>
                Create Delivery
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton, { backgroundColor: appTheme.colors.primary }]}
              onPress={handleComplete}
            >
              <Icon name="checkmark-done" size={20} color="#FFFFFF" />
              <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Complete</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Outgoing order actions */}
        {isOutgoing && order.status === 'pending' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancel}
          >
            <Icon name="close-circle-outline" size={20} color="#EF4444" />
            <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Cancel Order</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      <StatusBar barStyle="dark-content" />
      
      <SecondaryHeader
        title="Order Details"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        rightActions={[{ icon: 'message-circle', onPress: handleMessage }]}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Header Card */}
        <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground }]}>
          <View style={styles.orderHeader}>
            <View style={styles.orderIdContainer}>
              <Text style={[styles.orderIdLabel, { color: appTheme.colors.textLight }]}>
                Order ID
              </Text>
              <Text style={[styles.orderId, { color: appTheme.colors.text }]}>
                {order.id}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Business Info */}
          <View style={styles.businessSection}>
            <Text style={[styles.sectionLabel, { color: appTheme.colors.textLight }]}>
              {isIncoming ? 'From' : 'To'}
            </Text>
            <View style={styles.businessRow}>
              <View style={styles.businessAvatar}>
                <Text style={styles.businessAvatarText}>
                  {partnerName?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.businessInfo}>
                <Text style={[styles.businessName, { color: appTheme.colors.text }]}>
                  {partnerName}
                </Text>
                <Text style={[styles.businessType, { color: appTheme.colors.textLight }]}>
                  Business Partner
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.viewProfileButton}
                onPress={() => {
                  // Navigate to business profile
                }}
              >
                <Icon name="arrow-forward" size={20} color={appTheme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Time Info */}
          <View style={styles.timeSection}>
            <View style={styles.timeRow}>
              <Icon name="time-outline" size={18} color={appTheme.colors.textLight} />
              <Text style={[styles.timeText, { color: appTheme.colors.textLight }]}>
                Created {formatRelativeTime(order.created_at)}
              </Text>
            </View>
            {order.updated_at && (
              <View style={styles.timeRow}>
                <Icon name="refresh-outline" size={18} color={appTheme.colors.textLight} />
                <Text style={[styles.timeText, { color: appTheme.colors.textLight }]}>
                  Updated {formatRelativeTime(order.updated_at)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Order Items */}
        <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
            Order Items ({order.items.length})
          </Text>
          {order.items.map(renderOrderItem)}
        </View>

        {/* Notes */}
        {order.notes && (
          <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
              Notes
            </Text>
            <Text style={[styles.notesText, { color: appTheme.colors.text }]}>
              {order.notes}
            </Text>
          </View>
        )}

        {/* Order Summary */}
        <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
            Summary
          </Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: appTheme.colors.textLight }]}>
              Subtotal
            </Text>
            <Text style={[styles.summaryValue, { color: appTheme.colors.text }]}>
              {formatCurrency(order.total_price)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={[styles.totalLabel, { color: appTheme.colors.text }]}>
              Total
            </Text>
            <Text style={[styles.totalValue, { color: appTheme.colors.text }]}>
              {formatCurrency(order.total_price)}
            </Text>
          </View>
        </View>

        {/* Spacer for bottom actions */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      {renderActions()}

      {/* Success Dialog */}
      <AppModal
        visible={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        title="Success"
        message={successMessage}
        footer={
          <AppButton
            title="OK"
            onPress={() => setShowSuccessDialog(false)}
            variant="confirm"
            style={{ width: '100%' }}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
    marginTop: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderIdContainer: {},
  orderIdLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.regular,
    marginBottom: 4,
  },
  orderId: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.bold,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 16,
  },
  businessSection: {},
  sectionLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.regular,
    marginBottom: 8,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  businessAvatarText: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
    color: '#FFFFFF',
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: 2,
  },
  businessType: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
  },
  viewProfileButton: {
    padding: 8,
  },
  timeSection: {
    gap: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.medium,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
  },
  itemSubtotal: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.bold,
  },
  notesText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
  totalValue: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.bold,
  },
  rejectButton: {
    borderColor: '#EF4444',
  },
  acceptButton: {
    borderWidth: 0,
  },
  cancelButton: {
    borderColor: '#EF4444',
  },
});

export default OrderDetailScreen;





