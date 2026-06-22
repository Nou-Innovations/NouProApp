/**
 * Role Requests Screen
 * 
 * Allows admins to view and approve/reject staff role upgrade requests.
 * Accessible from Team Management or Notifications.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { Avatar, AppModal, ListItemCard, AppBottomSheet, AppButton, ButtonRow } from '@/shared/components/ui';
import BusinessAdminGuard from '@/shared/guards/BusinessAdminGuard';
import roleRequestService from '@/features/team/roleRequest.service';
import { RoleRequestWithUser } from '@/shared/types/roleRequest';
import theme from '@/shared/theme';

export default function RoleRequestsScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  
  const [requests, setRequests] = useState<RoleRequestWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RoleRequestWithUser | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  useEffect(() => {
    if (activeBusiness?.id) {
      fetchRequests();
    }
  }, [activeBusiness?.id]);
  
  const fetchRequests = async () => {
    if (!activeBusiness?.id) return;
    
    setIsLoading(true);
    try {
      const data = await roleRequestService.getRoleRequests(activeBusiness.id, 'PENDING');
      setRequests(data);
    } catch (error) {
      console.error('Error fetching role requests:', error);
      Alert.alert('Error', 'Failed to load role requests');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleApprove = async (request: RoleRequestWithUser) => {
    Alert.alert(
      'Approve Request',
      `Grant admin access to ${request.userName}? They will be able to manage team, products, and invoices.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            if (!activeBusiness?.id) return;
            setIsSubmitting(true);
            try {
              await roleRequestService.resolveRoleRequest(
                activeBusiness.id,
                request.id,
                { status: 'APPROVED', role: 'admin' }
              );
              
              setSuccessMessage(`${request.userName} is now an Admin`);
              setShowSuccessDialog(true);
              
              // Remove from pending list
              setRequests(prev => prev.filter(r => r.id !== request.id));
            } catch (error) {
              console.error('Error approving request:', error);
              Alert.alert('Error', 'Failed to approve request');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };
  
  const handleReject = (request: RoleRequestWithUser) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRejectDialog(true);
  };
  
  const handleSubmitRejection = async () => {
    if (!selectedRequest || !activeBusiness?.id) return;
    
    setIsSubmitting(true);
    try {
      await roleRequestService.resolveRoleRequest(
        activeBusiness.id,
        selectedRequest.id,
        { 
          status: 'REJECTED',
          rejectionReason: rejectionReason || undefined,
        }
      );
      
      setSuccessMessage('Request declined');
      setShowSuccessDialog(true);
      setShowRejectDialog(false);
      setSelectedRequest(null);
      
      // Remove from pending list
      setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to decline request');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <BusinessAdminGuard>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader
          title="Access Requests"
          leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        />
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={appTheme.colors.primary} />
            <Text style={[styles.loadingText, { color: appTheme.colors.textLight }]}>
              Loading requests...
            </Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="shield-checkmark-outline" size={60} color={appTheme.colors.textLight} />
            <Text style={[styles.emptyText, { color: appTheme.colors.text }]}>
              No Pending Requests
            </Text>
            <Text style={[styles.emptySubtext, { color: appTheme.colors.textLight }]}>
              Role upgrade requests from staff will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            removeClippedSubviews
            maxToRenderPerBatch={10}
            windowSize={5}
            initialNumToRender={10}
            renderItem={({ item, index }) => (
              <ListItemCard
                avatar={{
                  type: item.user?.avatar ? 'image' : 'initials',
                  userId: item.userId,
                  userName: item.userName || 'Staff',
                  imageUri: item.userAvatar,
                }}
                title={item.userName || 'Staff Member'}
                subtitle={`Requesting Admin access • ${new Date(item.createdAt).toLocaleDateString()}`}
                bottomElement={
                  item.message ? (
                    <View style={styles.messageContainer}>
                      <Text style={[styles.messageLabel, { color: appTheme.colors.textMuted }]}>
                        Message:
                      </Text>
                      <Text style={[styles.messageText, { color: appTheme.colors.textSecondary }]}>
                        "{item.message}"
                      </Text>
                    </View>
                  ) : undefined
                }
                rightRow2={
                  <ButtonRow style={styles.requestActions}>
                    <AppButton
                      title="Approve"
                      onPress={() => handleApprove(item)}
                      disabled={isSubmitting}
                      variant="confirm"
                      size="small"
                      iconLeft="checkmark"
                    />
                    <AppButton
                      title="Decline"
                      onPress={() => handleReject(item)}
                      disabled={isSubmitting}
                      variant="destructive"
                      size="small"
                      iconLeft="close"
                    />
                  </ButtonRow>
                }
                showDivider={index < requests.length - 1}
              />
            )}
            contentContainerStyle={styles.listContent}
          />
        )}
        
        {/* Rejection Dialog */}
        <AppModal
          visible={showRejectDialog}
          onClose={() => {
            setShowRejectDialog(false);
            setSelectedRequest(null);
          }}
          variant="default"
          title="Decline Request"
          message={`Are you sure you want to decline ${selectedRequest?.userName}'s admin access request?`}
          customContent={
            <View style={styles.rejectionInputContainer}>
              <Text style={[styles.rejectionLabel, { color: appTheme.colors.textSecondary }]}>
                Optional reason (visible to requester):
              </Text>
              <TextInput
                style={[styles.rejectionInput, { 
                  backgroundColor: appTheme.colors.surface,
                  color: appTheme.colors.text,
                  borderColor: appTheme.colors.border,
                }]}
                placeholder="e.g., Need more experience first"
                placeholderTextColor={appTheme.colors.textMuted}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>
          }
          primaryButtonText={isSubmitting ? 'Declining...' : 'Decline Request'}
          secondaryButtonText="Cancel"
          onPrimaryAction={handleSubmitRejection}
          onSecondaryAction={() => {
            setShowRejectDialog(false);
            setSelectedRequest(null);
          }}
        />
        
        {/* Success Dialog */}
        <AppModal
          visible={showSuccessDialog}
          onClose={() => setShowSuccessDialog(false)}
          variant="success"
          title="Success"
          message={successMessage}
          primaryButtonText="OK"
          onPrimaryAction={() => setShowSuccessDialog(false)}
        />
      </SafeAreaView>
    </BusinessAdminGuard>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  messageContainer: {
    paddingTop: 8,
    gap: 4,
  },
  messageLabel: {
    fontSize: 12,
    fontFamily: 'InterCustom-Medium',
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'InterCustom-Regular',
    fontStyle: 'italic',
  },
  requestActions: {
    marginTop: 8,
  },
  rejectionInputContainer: {
    gap: 8,
    marginVertical: 16,
  },
  rejectionLabel: {
    fontSize: 14,
    fontFamily: 'InterCustom-Medium',
  },
  rejectionInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'InterCustom-Regular',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'InterCustom-Regular',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'InterCustom-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'InterCustom-Regular',
    textAlign: 'center',
  },
});
