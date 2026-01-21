import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { AppSearchBar, StaffCard, StaffMember, StaffRole as StaffCardRole, Avatar, AppModal, AppBottomSheet, ListItemCard } from '@/shared/components/ui';
import AppButton from '@/shared/components/ui/AppButton';
import theme from '@/shared/theme';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import {
  acceptJoinRequest,
  cancelInvite,
  getTeamMembers,
  rejectJoinRequest,
  removeTeamMember,
  resendInvite,
  updateTeamMemberRole,
} from '@/features/team/team.service';

// User type for team management
interface User {
  id: string;
  email: string;
  name: string;
  role: 'superAdmin' | 'admin' | 'staff';
  companyId: string;
  locationIds: string[];
  avatar?: string;
  phone?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export default function TeamManagementScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  
  // Use profileStore as single source of truth for active business
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const currentUser = useProfileStore((state) => state.currentUser);
  const isSuperAdminRole = useProfileStore((state) => state.isSuperAdmin);
  const isAdminRole = useProfileStore((state) => state.isAdmin);
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Pending join requests state (users who sent request to join our business)
  interface JoinRequest {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    userAvatar?: string;
    requestedAt: string;
    message?: string;
  }
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([
    {
      id: 'req-1',
      userId: 'user-new-1',
      userName: 'Sarah Johnson',
      userEmail: 'sarah.johnson@email.com',
      requestedAt: '2025-01-07T14:30:00Z',
      message: 'I would like to join your team as a sales representative.',
    },
    {
      id: 'req-2',
      userId: 'user-new-2',
      userName: 'Michael Chen',
      userEmail: 'michael.chen@email.com',
      requestedAt: '2025-01-06T09:15:00Z',
    },
  ]);
  
  // Pending invites state (invitations we sent to users)
  interface PendingInvite {
    id: string;
    email: string;
    name?: string;
    role: 'admin' | 'staff';
    invitedAt: string;
    expiresAt?: string;
  }
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([
    {
      id: 'inv-001',
      email: 'alex.wilson@company.com',
      name: 'Alex Wilson',
      role: 'admin',
      invitedAt: '2025-01-05T10:00:00Z',
    },
    {
      id: 'inv-002',
      email: 'emma.davis@gmail.com',
      name: 'Emma Davis',
      role: 'staff',
      invitedAt: '2025-01-04T16:45:00Z',
    },
    {
      id: 'inv-003',
      email: 'james.taylor@outlook.com',
      role: 'staff',
      invitedAt: '2025-01-03T11:20:00Z',
    },
  ]);
  
  // Bottom sheet state for Join Requests
  const [selectedJoinRequest, setSelectedJoinRequest] = useState<JoinRequest | null>(null);
  const [showJoinRequestOptions, setShowJoinRequestOptions] = useState(false);
  
  // Bottom sheet state for Pending Invites
  const [selectedPendingInvite, setSelectedPendingInvite] = useState<PendingInvite | null>(null);
  const [showPendingInviteOptions, setShowPendingInviteOptions] = useState(false);

  // Check permissions using profileStore
  const isSuperAdmin = isSuperAdminRole();
  const isAdmin = isAdminRole();

  useEffect(() => {
    if (activeBusiness?.id && isAdmin) {
      fetchUsers();
    }
  }, [activeBusiness?.id, isAdmin]);

  const fetchUsers = async () => {
    if (!activeBusiness?.id) return;
    
    setIsLoading(true);
    try {
      const users = await getTeamMembers(activeBusiness.id);
      setUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      
      // Graceful fallback to mock data for demo/development purposes
      console.log('API not available, falling back to mock user data for demo purposes');
      const mockUsers: User[] = [
        {
          id: 'usr-001',
          email: 'admin@noupro.com',
          name: 'John Admin',
          role: 'admin',
          companyId: activeBusiness.id,
          locationIds: ['loc-001', 'loc-002', 'loc-003'],
          avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
          phone: '+1-555-123-4567',
          createdAt: '2024-01-01T00:00:00Z',
          lastLoginAt: '2025-01-15T10:30:00Z'
        },
        {
          id: 'usr-002',
          email: 'jane.smith@noupro.com',
          name: 'Jane Smith',
          role: 'staff',
          companyId: activeBusiness.id,
          locationIds: ['loc-001'],
          avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
          phone: '+1-555-987-6543',
          createdAt: '2024-02-01T00:00:00Z',
          lastLoginAt: '2025-01-15T09:15:00Z'
        },
        {
          id: 'usr-003',
          email: 'mike.jones@noupro.com',
          name: 'Mike Jones',
          role: 'staff',
          companyId: activeBusiness.id,
          locationIds: ['loc-002', 'loc-003'],
          avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
          phone: '+1-555-246-8135',
          createdAt: '2024-03-01T00:00:00Z',
          lastLoginAt: '2025-01-14T16:45:00Z'
        }
      ];
      
      setUsers(mockUsers);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle role change from StaffCard
  const handleRoleChange = (staff: StaffMember, newRole: StaffCardRole) => {
    Alert.alert(
      'Change Role',
      `Change ${staff.name}'s role to ${newRole === 'superAdmin' ? 'Super Admin' : newRole === 'admin' ? 'Admin' : 'Staff'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Change', 
          onPress: async () => {
            if (!activeBusiness?.id) return;
            try {
              await updateTeamMemberRole(activeBusiness.id, staff.id, newRole);
              setSuccessMessage(`${staff.name}'s role has been updated`);
              setShowSuccessDialog(true);
              fetchUsers();
            } catch (error) {
              console.error('Error updating role:', error);
              Alert.alert('Error', 'Failed to update role. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  // Handle remove from StaffCard
  const handleRemoveStaff = (staff: StaffMember) => {
    const user = users.find(u => u.id === staff.id);
    if (user) {
      handleRemoveUser(user);
    }
  };
  
  // Handle report from StaffCard
  const handleReportStaff = (staff: StaffMember) => {
    Alert.alert(
      'Report User',
      `Report ${staff.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Report', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Report', 'Report functionality is not available yet.');
          }
        }
      ]
    );
  };

  const handleRemoveUser = (user: User) => {
    if (!activeBusiness?.id) return;

    Alert.alert(
      'Remove User',
      `Are you sure you want to remove ${user.name} from the team? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              await removeTeamMember(activeBusiness.id, user.id);
              setSuccessMessage('User removed successfully');
              setShowSuccessDialog(true);
              fetchUsers(); // Refresh the list
            } catch (error) {
              console.error('Error removing user:', error);
              Alert.alert('Error', 'Failed to remove user');
            }
          }
        }
      ]
    );
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const usersByRole = {
    superAdmin: filteredUsers.filter(user => user.role === 'superAdmin'),
    admin: filteredUsers.filter(user => user.role === 'admin'),
    staff: filteredUsers.filter(user => user.role === 'staff'),
  };
  
  // Handle accepting a join request
  const handleAcceptRequest = (request: JoinRequest) => {
    Alert.alert(
      'Accept Request',
      `Accept ${request.userName}'s request to join the team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept', 
          onPress: async () => {
            if (!activeBusiness?.id) return;
            try {
              await acceptJoinRequest(activeBusiness.id, request.id);
              setJoinRequests(prev => prev.filter(r => r.id !== request.id));
              setSuccessMessage(`${request.userName} has been added to the team`);
              setShowSuccessDialog(true);
              fetchUsers();
            } catch (error) {
              console.error('Error accepting request:', error);
              Alert.alert('Error', 'Failed to accept request. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  // Handle rejecting a join request
  const handleRejectRequest = (request: JoinRequest) => {
    Alert.alert(
      'Reject Request',
      `Reject ${request.userName}'s request to join the team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: async () => {
            if (!activeBusiness?.id) return;
            try {
              await rejectJoinRequest(activeBusiness.id, request.id);
              setJoinRequests(prev => prev.filter(r => r.id !== request.id));
              setSuccessMessage('Join request rejected');
              setShowSuccessDialog(true);
            } catch (error) {
              console.error('Error rejecting request:', error);
              Alert.alert('Error', 'Failed to reject request. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  // Handle canceling a pending invite
  const handleCancelInvite = (invite: PendingInvite) => {
    Alert.alert(
      'Cancel Invite',
      `Cancel the invitation sent to ${invite.email}?`,
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            if (!activeBusiness?.id) return;
            try {
              await cancelInvite(activeBusiness.id, invite.id);
              setPendingInvites(prev => prev.filter(i => i.id !== invite.id));
              setSuccessMessage('Invitation cancelled');
              setShowSuccessDialog(true);
            } catch (error) {
              console.error('Error cancelling invite:', error);
              Alert.alert('Error', 'Failed to cancel invite. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  // Handle resending a pending invite
  const handleResendInvite = (invite: PendingInvite) => {
    Alert.alert(
      'Resend Invite',
      `Resend invitation to ${invite.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Resend', 
          onPress: async () => {
            if (!activeBusiness?.id) return;
            try {
              await resendInvite(activeBusiness.id, invite.id);
              setSuccessMessage(`Invitation resent to ${invite.email}`);
              setShowSuccessDialog(true);
            } catch (error) {
              console.error('Error resending invite:', error);
              Alert.alert('Error', 'Failed to resend invite. Please try again.');
            }
          }
        }
      ]
    );
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <View style={styles.accessDeniedContainer}>
          <Icon name="people" size={60} color={appTheme.colors.textLight} />
          <Text style={[styles.accessDeniedText, { color: appTheme.colors.text }]}>
            Access Denied
          </Text>
          <Text style={[styles.accessDeniedSubtext, { color: appTheme.colors.textLight }]}>
            Only admins can manage team members
          </Text>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: appTheme.colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Staffs"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        rightActions={[{ icon: 'user-plus', onPress: () => navigation.navigate('InviteStaff' as never) }]}
      />

      {/* Search Bar */}
      <AppSearchBar
        placeholder="Search staff members..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClear={() => setSearchQuery('')}
        containerStyle={styles.searchBarContainer}
      />

      {/* Main Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
          <Text style={[styles.loadingText, { color: appTheme.colors.textLight }]}>
            Loading staff members...
          </Text>
        </View>
      ) : (
        <FlatList
          data={[1]} // Single item to render all sections
          keyExtractor={() => 'sections'}
          renderItem={() => (
            <View style={styles.sectionsContainer}>
              {/* Section 1: Join Requests - Only show if there are requests */}
              {joinRequests.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
                      Join Requests
                    </Text>
                  </View>
                  
                  <View style={styles.sectionContent}>
                    {joinRequests.map((request, index) => (
                      <ListItemCard
                        key={request.id}
                        avatar={{
                          type: 'image',
                          userId: request.userId,
                          userName: request.userName,
                          imageUri: request.userAvatar,
                        }}
                        title={request.userName}
                        subtitle={`@${request.userEmail.split('@')[0]}`}
                        showOptionsButton
                        onOptionsPress={() => {
                          setSelectedJoinRequest(request);
                          setShowJoinRequestOptions(true);
                        }}
                        bottomElement={
                          <View style={styles.requestCardButtons}>
                            <TouchableOpacity 
                              style={[styles.requestCardButtonPrimary, { backgroundColor: appTheme.colors.primary }]}
                              onPress={() => handleAcceptRequest(request)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.requestCardButtonPrimaryText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.requestCardButtonOutline, { borderColor: appTheme.colors.primary }]}
                              onPress={() => handleRejectRequest(request)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.requestCardButtonOutlineText, { color: appTheme.colors.primary }]}>Decline</Text>
                            </TouchableOpacity>
                          </View>
                        }
                        showDivider={index < joinRequests.length - 1}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Section 2: Pending Invites - Only show if there are invites */}
              {pendingInvites.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
                      Pending Invites
                    </Text>
                  </View>
                  
                  <View style={styles.sectionContent}>
                    {pendingInvites.map((invite, index) => (
                      <ListItemCard
                        key={invite.id}
                        avatar={{
                          type: 'initials',
                          userId: invite.id,
                          userName: invite.name || invite.email,
                        }}
                        title={invite.name || invite.email.split('@')[0]}
                        subtitle={`@${invite.email.split('@')[0]}`}
                        rightRow2={
                          <TouchableOpacity 
                            style={[styles.pendingCardButton, { backgroundColor: appTheme.colors.surface }]}
                            onPress={() => handleCancelInvite(invite)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.pendingCardButtonText, { color: appTheme.colors.textMuted }]}>Pending request</Text>
                          </TouchableOpacity>
                        }
                        showOptionsButton
                        onOptionsPress={() => {
                          setSelectedPendingInvite(invite);
                          setShowPendingInviteOptions(true);
                        }}
                        showDivider={index < pendingInvites.length - 1}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Section 3: Staff List */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
                    Staff List
                  </Text>
                </View>
                
                <View style={styles.sectionContent}>
                  {filteredUsers.length === 0 ? (
                    <View style={styles.sectionEmptyState}>
                      <Icon name="people-outline" size={32} color={appTheme.colors.textMuted} />
                      <Text style={[styles.sectionEmptyText, { color: appTheme.colors.textLight }]}>
                        {searchQuery ? 'No staff members found' : 'No staff members yet'}
                      </Text>
                      <Text style={[styles.sectionEmptySubtext, { color: appTheme.colors.textMuted }]}>
                        {searchQuery 
                          ? 'Try adjusting your search criteria'
                          : 'Invite your first staff member to get started'
                        }
                      </Text>
                    </View>
                  ) : (
                    filteredUsers.map((user, index) => (
                      <StaffCard
                        key={user.id}
                        staff={{
                          id: user.id,
                          name: user.name,
                          email: user.email,
                          username: user.email.split('@')[0],
                          role: user.role,
                          avatar: user.avatar,
                        }}
                        isCurrentUser={user.id === currentUser?.id}
                        canManageRole={isSuperAdmin || (isAdmin && user.role !== 'superAdmin')}
                        canRemove={isSuperAdmin || (isAdmin && user.role !== 'superAdmin')}
                        onRoleChange={handleRoleChange}
                        onRemove={handleRemoveStaff}
                        onReport={handleReportStaff}
                        showDivider={index < filteredUsers.length - 1}
                      />
                    ))
                  )}
                </View>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

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

      {/* Join Request Options Bottom Sheet */}
      <AppBottomSheet
        visible={showJoinRequestOptions}
        onClose={() => {
          setShowJoinRequestOptions(false);
          setSelectedJoinRequest(null);
        }}
        title="Options"
      >
        <ListItemCard
          avatar={{
            type: 'icon',
            icon: 'flag',
            iconColor: appTheme.colors.error,
            backgroundColor: `${appTheme.colors.error}15`,
          }}
          title="Report User"
          onPress={() => {
            Alert.alert('Report', 'Report functionality coming soon');
            setShowJoinRequestOptions(false);
            setSelectedJoinRequest(null);
          }}
          showDivider={false}
        />
      </AppBottomSheet>

      {/* Pending Invite Options Bottom Sheet */}
      <AppBottomSheet
        visible={showPendingInviteOptions}
        onClose={() => {
          setShowPendingInviteOptions(false);
          setSelectedPendingInvite(null);
        }}
        title="Options"
      >
        <ListItemCard
          avatar={{
            type: 'icon',
            icon: 'close-circle',
            iconColor: appTheme.colors.error,
            backgroundColor: `${appTheme.colors.error}15`,
          }}
          title="Cancel Invite"
          onPress={() => {
            if (selectedPendingInvite) {
              handleCancelInvite(selectedPendingInvite);
            }
            setShowPendingInviteOptions(false);
            setSelectedPendingInvite(null);
          }}
          showDivider={false}
        />
      </AppBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  searchBarContainer: {
    marginTop: 8,
    marginHorizontal: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  sectionsContainer: {
    width: '100%',
  },
  section: {
    marginBottom: 16,
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 12,
    paddingBottom: 16, // 16px gap before first card
    paddingHorizontal: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  sectionContent: {
    width: '100%',
  },
  sectionEmptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  sectionEmptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  sectionEmptySubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  // Request Card bottom buttons (used in ListItemCard bottomElement)
  requestCardButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestCardButtonPrimary: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestCardButtonPrimaryText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  requestCardButtonOutline: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestCardButtonOutlineText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  // Pending Card button (used in ListItemCard rightRow2)
  pendingCardButton: {
    width: 112,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingCardButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  listDivider: {
    height: 1,
  },
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  accessDeniedText: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedSubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Bottom sheet action styles
  bottomSheetContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  bottomSheetAction: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bottomSheetActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 