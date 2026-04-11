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
import { AppSearchBar, StaffCard, StaffMember, StaffRole as StaffCardRole, Avatar, AppModal, AppBottomSheet, ListItemCard, EmptyState } from '@/shared/components/ui';
import AppButton from '@/shared/components/ui/AppButton';
import LocationDropdown from '@/shared/components/ui/LocationDropdown';
import theme from '@/shared/theme';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import {
  cancelInvite,
  getTeamMembers,
  getLocationStaff,
  getAccessibleLocations,
  getCapabilities,
  removeTeamMember,
  resendInvite,
  updateTeamMemberRole,
  type AccessibleLocation,
} from '@/features/team/team.service';
import {
  getJoinRequests,
  getPendingInvites,
  acceptJoinRequestWithRole,
  rejectJoinRequestById,
  type JoinRequest,
  type PendingInvite,
} from '@/features/team/team.service';

// User type for team management (matches backend /staff response)
interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'staff';
  status: 'invited' | 'accepted' | 'suspended';
  scope: 'business' | 'location';
  avatar?: string | null;
  phone?: string | null;
  locationId?: string | null;
  locationIds?: string[];
  locationName?: string | null;
  joinedAt?: string | null;
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
  
  // Tab state: All | Staff | Pending
  const [activeTab, setActiveTab] = useState<'all' | 'staff' | 'pending'>('all');
  
  // Location filter state
  const [locations, setLocations] = useState<AccessibleLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  
  // Join requests and pending invites state (fetched from API)
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  
  // Bottom sheet state for Join Requests
  const [selectedJoinRequest, setSelectedJoinRequest] = useState<JoinRequest | null>(null);
  const [showJoinRequestOptions, setShowJoinRequestOptions] = useState(false);
  
  // Bottom sheet state for Pending Invites
  const [selectedPendingInvite, setSelectedPendingInvite] = useState<PendingInvite | null>(null);
  const [showPendingInviteOptions, setShowPendingInviteOptions] = useState(false);

  // Check permissions using profileStore
  const isSuperAdmin = isSuperAdminRole();
  const isAdmin = isAdminRole();
  const currentUserRole = useProfileStore((state) => state.currentUserRole);
  
  // Derive capabilities from business role (single source of truth)
  const capabilities = currentUserRole ? getCapabilities(currentUserRole) : null;
  const canManageTeam = capabilities?.canManageTeam ?? false;

  useEffect(() => {
    if (activeBusiness?.id && canManageTeam) {
      fetchUsers();
      fetchRequestsAndInvites();
    }
  }, [activeBusiness?.id, canManageTeam]);

  // Fetch join requests and pending invites
  const fetchRequestsAndInvites = async () => {
    if (!activeBusiness?.id) return;
    
    try {
      setLoadingRequests(true);
      const [requests, invites] = await Promise.all([
        getJoinRequests(activeBusiness.id, 'PENDING'),
        getPendingInvites(activeBusiness.id),
      ]);
      setJoinRequests(requests);
      setPendingInvites(invites);
    } catch (error) {
      console.error('Failed to fetch requests/invites:', error);
      // Keep empty arrays on error
      setJoinRequests([]);
      setPendingInvites([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Fetch accessible locations for the location filter
  useEffect(() => {
    const fetchLocations = async () => {
      if (!activeBusiness?.id || !currentUser?.id) return;
      
      try {
        const result = await getAccessibleLocations(activeBusiness.id, currentUser.id);
        setLocations(result.locations || []);
      } catch (error) {
        console.error('Error fetching locations:', error);
        // Fallback mock locations for demo
        setLocations([
          { id: 'loc-001', name: 'Downtown' },
          { id: 'loc-002', name: 'Westside' },
          { id: 'loc-003', name: 'Northgate' },
        ]);
      }
    };
    
    if (activeBusiness?.id && currentUser?.id) {
      fetchLocations();
    }
  }, [activeBusiness?.id, currentUser?.id]);

  const fetchUsers = async () => {
    if (!activeBusiness?.id) return;
    
    setIsLoading(true);
    try {
      // Fetch all accepted staff (status filter handled by backend)
      const users = await getTeamMembers(activeBusiness.id, 'accepted');
      setUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      if (__DEV__) {
        // Fallback to mock data in development only
        const mockUsers: User[] = [
          {
            id: 'usr-001',
            email: 'admin@noupro.com',
            name: 'John Admin',
            role: 'admin',
            status: 'accepted',
            scope: 'business',
          },
          {
            id: 'usr-002',
            email: 'jane.smith@noupro.com',
            name: 'Jane Smith',
            role: 'staff',
            status: 'accepted',
            scope: 'business',
          },
          {
            id: 'usr-003',
            email: 'mike.jones@noupro.com',
            name: 'Mike Jones',
            role: 'staff',
            status: 'accepted',
            scope: 'business',
          },
        ];
        setUsers(mockUsers);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle role change from StaffCard
  const handleRoleChange = (staff: StaffMember, newRole: StaffCardRole) => {
    const user = users.find(u => u.id === staff.id);
    // Convert StaffCard camelCase roles back to API snake_case
    const apiRole = newRole === 'superAdmin' ? 'super_admin' : newRole;
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
              await updateTeamMemberRole(activeBusiness.id, staff.id, apiRole, user?.locationId || user?.locationIds?.[0]);
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
    superAdmin: filteredUsers.filter(user => user.role === 'super_admin'),
    admin: filteredUsers.filter(user => user.role === 'admin'),
    staff: filteredUsers.filter(user => user.role === 'staff'),
  };
  
  // Handle accepting a join request - show role selection
  const handleAcceptRequest = (request: JoinRequest) => {
    Alert.alert(
      'Select Role',
      `What role should ${request.userName} have?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Staff', 
          onPress: async () => {
            if (!activeBusiness?.id) return;
            try {
              await acceptJoinRequestWithRole(activeBusiness.id, request.id, 'staff');
              await fetchRequestsAndInvites();
              setSuccessMessage(`${request.userName} has been added as staff`);
              setShowSuccessDialog(true);
              fetchUsers();
            } catch (error) {
              console.error('Error accepting request:', error);
              Alert.alert('Error', 'Failed to accept request. Please try again.');
            }
          }
        },
        { 
          text: 'Admin', 
          onPress: async () => {
            if (!activeBusiness?.id) return;
            try {
              await acceptJoinRequestWithRole(activeBusiness.id, request.id, 'admin');
              await fetchRequestsAndInvites();
              setSuccessMessage(`${request.userName} has been added as admin`);
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
              await rejectJoinRequestById(activeBusiness.id, request.id);
              await fetchRequestsAndInvites();
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
              await fetchRequestsAndInvites();
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
        rightActions={[
          { icon: 'shield-outline', onPress: () => navigation.navigate('RoleRequests' as never) },
          { icon: 'user-plus', onPress: () => navigation.navigate('InviteStaff' as never) },
        ]}
      />

      {/* Location Dropdown - above search bar */}
      <LocationDropdown
        selectedLocationId={selectedLocationId}
        onLocationSelect={setSelectedLocationId}
        showAllLocationsOption={true}
        style={styles.locationDropdown}
      />

      {/* Search Bar */}
      <AppSearchBar
        placeholder="Search staff members..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClear={() => setSearchQuery('')}
        containerStyle={styles.searchBarContainer}
      />

      {/* Tab Navigation: All | Staff | Pending (filterBar pattern from design.json) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'all' ? styles.tabTextSelected : styles.tabTextUnselected
          ]}>
            All
          </Text>
          {activeTab === 'all' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('staff')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'staff' ? styles.tabTextSelected : styles.tabTextUnselected
          ]}>
            Staff
          </Text>
          {activeTab === 'staff' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'pending' ? styles.tabTextSelected : styles.tabTextUnselected
          ]}>
            Pending
          </Text>
          {activeTab === 'pending' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

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
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          renderItem={() => (
            <View style={styles.sectionsContainer}>
              {/* Section 1: Join Requests - Only show if there are requests AND tab allows */}
              {(activeTab === 'all' || activeTab === 'pending') && joinRequests.length > 0 && (
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

              {/* Section 2: Pending Invites - Only show if there are invites AND tab allows */}
              {(activeTab === 'all' || activeTab === 'pending') && pendingInvites.length > 0 && (
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

              {/* Section 3: Staff List - Only show if tab allows */}
              {(activeTab === 'all' || activeTab === 'staff') && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
                    Staff List
                  </Text>
                </View>
                
                <View style={styles.sectionContent}>
                  {filteredUsers.length === 0 ? (
                    <EmptyState
                      iconName="people-outline"
                      title={searchQuery ? 'No staff members found' : 'No team members yet'}
                      subtitle={
                        searchQuery 
                          ? 'Try adjusting your search criteria.'
                          : 'Invite staff to manage operations and collaborate.'
                      }
                      ctaLabel={searchQuery ? undefined : 'Invite staff'}
                      onCtaPress={searchQuery ? undefined : () => navigation.navigate('InviteStaff' as never)}
                      compact
                      testID="empty-team"
                    />
                  ) : (
                    filteredUsers.map((user, index) => (
                      <StaffCard
                        key={user.id}
                        staff={{
                          id: user.id,
                          name: user.name,
                          email: user.email,
                          username: user.email.split('@')[0],
                          role: user.role === 'super_admin' ? 'superAdmin' : user.role,
                          avatar: user.avatar || undefined,
                        }}
                        isCurrentUser={user.id === currentUser?.id}
                        canManageRole={isSuperAdmin || (isAdmin && user.role !== 'super_admin')}
                        canRemove={isSuperAdmin || (isAdmin && user.role !== 'super_admin')}
                        onRoleChange={handleRoleChange}
                        onRemove={handleRemoveStaff}
                        onReport={handleReportStaff}
                        showDivider={index < filteredUsers.length - 1}
                      />
                    ))
                  )}
                </View>
              </View>
              )}
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
            Alert.alert('Report User', 'To report this user, please contact support at support@noupro.app');
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
  // Tab Navigation (filterBar pattern from design.json)
  tabContainer: {
    flexDirection: 'row',
    height: 40,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
  },
  tabTextSelected: {
    fontFamily: 'InterCustom-Bold',
    color: '#000000',
  },
  tabTextUnselected: {
    fontFamily: 'InterCustom-Medium',
    color: '#A4AAB8',
  },
  // Location Dropdown (above search bar)
  locationDropdown: {
    marginTop: 12,
    marginHorizontal: 12,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: '#000000',
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
    fontFamily: 'InterCustom-Bold',
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
    fontFamily: 'InterCustom-Medium',
  },
  sectionEmptySubtext: {
    fontSize: 12,
    fontFamily: 'InterCustom-Regular',
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
    fontFamily: 'InterCustom-SemiBold',
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
    fontFamily: 'InterCustom-SemiBold',
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
    fontFamily: 'InterCustom-SemiBold',
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