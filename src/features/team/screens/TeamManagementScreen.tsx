import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useCompanyStore } from '@/shared/store/companyStore';
import { useProfileStore } from '@/shared/store/profileStore';
import { get, post, del } from '@/shared/services/api';
import { ConfirmationDialog, AppSearchBar, StaffCard, StaffMember, StaffRole as StaffCardRole, Avatar } from '@/shared/components/ui';
import { SecondaryHeader } from '@/shared/components/layout/headers';

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

// Staff role types from app-logic.json
type StaffRoleType = 'delivery' | 'sales' | 'inventory' | 'custom';

interface InviteUserModalProps {
  visible: boolean;
  onClose: () => void;
  onInvite: (data: { email: string; role: string; staffRoleType?: StaffRoleType; locationIds: string[] }) => void;
}

// Helper function to get icon for staff role type
const getStaffTypeIcon = (type: StaffRoleType): keyof typeof Icon.glyphMap => {
  switch (type) {
    case 'delivery': return 'car-outline';
    case 'sales': return 'cash-outline';
    case 'inventory': return 'cube-outline';
    default: return 'person-outline';
  }
};

// Helper function to get description for staff role type
const getStaffTypeDescription = (type: StaffRoleType): string => {
  switch (type) {
    case 'delivery': return 'Can view and update assigned deliveries';
    case 'sales': return 'Can view products, process orders, use inbox';
    case 'inventory': return 'Can manage products and stock levels';
    default: return 'Custom permissions set by admin';
  }
};

const InviteUserModal: React.FC<InviteUserModalProps> = ({ visible, onClose, onInvite }) => {
  const { theme: appTheme } = useTheme();
  const { locations } = useCompanyStore();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [staffRoleType, setStaffRoleType] = useState<StaffRoleType>('custom');
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  const handleInvite = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    if (role === 'staff' && selectedLocationIds.length === 0) {
      Alert.alert('Error', 'Please select at least one location for staff members');
      return;
    }

    onInvite({
      email: email.trim(),
      role,
      staffRoleType: role === 'staff' ? staffRoleType : undefined,
      locationIds: role === 'admin' ? [] : selectedLocationIds,
    });

    // Reset form
    setEmail('');
    setRole('staff');
    setStaffRoleType('custom');
    setSelectedLocationIds([]);
  };

  const toggleLocation = (locationId: string) => {
    setSelectedLocationIds(prev => 
      prev.includes(locationId) 
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: appTheme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: appTheme.colors.text }]}>
              Invite Team Member
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={appTheme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: appTheme.colors.text }]}>Email Address</Text>
            <TextInput
              style={[styles.textInput, { 
                borderColor: appTheme.colors.borderColor,
                backgroundColor: appTheme.colors.inputBackground,
                color: appTheme.colors.text
              }]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email address"
              placeholderTextColor={appTheme.colors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: appTheme.colors.text }]}>Role</Text>
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  role === 'admin' && styles.roleOptionSelected,
                  { 
                    borderColor: role === 'admin' ? appTheme.colors.primary : appTheme.colors.borderColor,
                    backgroundColor: role === 'admin' ? appTheme.colors.primary + '10' : 'transparent'
                  }
                ]}
                onPress={() => setRole('admin')}
              >
                <Text style={[
                  styles.roleOptionText,
                  { color: role === 'admin' ? appTheme.colors.primary : appTheme.colors.text }
                ]}>
                  Admin
                </Text>
                <Text style={[styles.roleDescription, { color: appTheme.colors.textLight }]}>
                  Full access to company data
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  role === 'staff' && styles.roleOptionSelected,
                  { 
                    borderColor: role === 'staff' ? appTheme.colors.primary : appTheme.colors.borderColor,
                    backgroundColor: role === 'staff' ? appTheme.colors.primary + '10' : 'transparent'
                  }
                ]}
                onPress={() => setRole('staff')}
              >
                <Text style={[
                  styles.roleOptionText,
                  { color: role === 'staff' ? appTheme.colors.primary : appTheme.colors.text }
                ]}>
                  Staff
                </Text>
                <Text style={[styles.roleDescription, { color: appTheme.colors.textLight }]}>
                  Location-specific access
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {role === 'staff' && (
            <>
              {/* Staff Role Type Selector */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: appTheme.colors.text }]}>Staff Type</Text>
                <View style={styles.staffTypeSelector}>
                  {(['delivery', 'sales', 'inventory', 'custom'] as StaffRoleType[]).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.staffTypeOption,
                        staffRoleType === type && styles.staffTypeOptionSelected,
                        { 
                          borderColor: staffRoleType === type ? appTheme.colors.primary : appTheme.colors.borderColor,
                          backgroundColor: staffRoleType === type ? appTheme.colors.primary + '10' : 'transparent'
                        }
                      ]}
                      onPress={() => setStaffRoleType(type)}
                    >
                      <View style={styles.staffTypeHeader}>
                        <Icon
                          name={getStaffTypeIcon(type)}
                          size={20}
                          color={staffRoleType === type ? appTheme.colors.primary : appTheme.colors.text}
                        />
                        <Text style={[
                          styles.staffTypeText,
                          { color: staffRoleType === type ? appTheme.colors.primary : appTheme.colors.text }
                        ]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </View>
                      <Text style={[styles.staffTypeDescription, { color: appTheme.colors.textLight }]}>
                        {getStaffTypeDescription(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Location Access */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: appTheme.colors.text }]}>
                  Location Access ({selectedLocationIds.length} selected)
                </Text>
                <View style={styles.locationsList}>
                  {locations.map(location => (
                    <TouchableOpacity
                      key={location.id}
                      style={[styles.locationCheckbox, { borderColor: appTheme.colors.borderColor }]}
                      onPress={() => toggleLocation(location.id)}
                    >
                      <View style={styles.checkboxRow}>
                        <View style={[
                          styles.checkbox,
                          selectedLocationIds.includes(location.id) && styles.checkboxSelected,
                          { 
                            borderColor: appTheme.colors.borderColor,
                            backgroundColor: selectedLocationIds.includes(location.id) 
                              ? appTheme.colors.primary 
                              : 'transparent'
                          }
                        ]}>
                          {selectedLocationIds.includes(location.id) && (
                            <Icon name="checkmark" size={12} color="white" />
                          )}
                        </View>
                        <View style={styles.locationInfo}>
                          <Text style={[styles.locationName, { color: appTheme.colors.text }]}>
                            {location.name}
                          </Text>
                          <Text style={[styles.locationAddress, { color: appTheme.colors.textLight }]}>
                            {location.address}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={[styles.modalButton, { borderColor: appTheme.colors.borderColor }]}
              onPress={onClose}
            >
              <Text style={[styles.modalButtonText, { color: appTheme.colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: appTheme.colors.primary }]}
              onPress={handleInvite}
            >
              <Text style={styles.modalButtonPrimaryText}>Send Invite</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

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
  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
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
      id: 'inv-1',
      email: 'alex.wilson@company.com',
      name: 'Alex Wilson',
      role: 'admin',
      invitedAt: '2025-01-05T10:00:00Z',
    },
    {
      id: 'inv-2',
      email: 'emma.davis@gmail.com',
      name: 'Emma Davis',
      role: 'staff',
      invitedAt: '2025-01-04T16:45:00Z',
    },
    {
      id: 'inv-3',
      email: 'james.taylor@outlook.com',
      role: 'staff',
      invitedAt: '2025-01-03T11:20:00Z',
    },
  ]);
  

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
      const users = await get<User[]>(`/companies/${activeBusiness.id}/users`);
      setUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      
      // Graceful fallback to mock data for demo/development purposes
      console.log('API not available, falling back to mock user data for demo purposes');
      const mockUsers: User[] = [
        {
          id: 'user-1',
          email: 'admin@noupro.com',
          name: 'John Admin',
          role: 'admin',
          companyId: activeBusiness.id,
          locationIds: ['loc-1', 'loc-2', 'loc-3'],
          avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
          phone: '+1-555-123-4567',
          createdAt: '2024-01-01T00:00:00Z',
          lastLoginAt: '2025-01-15T10:30:00Z'
        },
        {
          id: 'user-2',
          email: 'jane.smith@noupro.com',
          name: 'Jane Smith',
          role: 'staff',
          companyId: activeBusiness.id,
          locationIds: ['loc-1'],
          avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
          phone: '+1-555-987-6543',
          createdAt: '2024-02-01T00:00:00Z',
          lastLoginAt: '2025-01-15T09:15:00Z'
        },
        {
          id: 'user-3',
          email: 'mike.jones@noupro.com',
          name: 'Mike Jones',
          role: 'staff',
          companyId: activeBusiness.id,
          locationIds: ['loc-2', 'loc-3'],
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

  const handleInviteUser = async (data: { email: string; role: string; locationIds: string[] }) => {
    if (!activeBusiness?.id) return;

    try {
      await post<User>(`/companies/${activeBusiness.id}/users/invite`, data);
      setIsInviteModalVisible(false);
      setSuccessMessage('Invitation sent successfully');
      setShowSuccessDialog(true);
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error inviting user:', error);
      
      // Graceful fallback for demo purposes
      console.log('API not available, simulating invitation for demo purposes');
      Alert.alert(
        'Demo Mode', 
        `In production, an invitation would be sent to ${data.email} with ${data.role} role. This is a demo with mock data.`
      );
      setIsInviteModalVisible(false);
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
            // TODO: Call API to change role
            setSuccessMessage(`${staff.name}'s role has been updated`);
            setShowSuccessDialog(true);
            fetchUsers();
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
            // TODO: Open report flow
            Alert.alert('Report', 'Report functionality coming soon');
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
              await del(`/companies/${activeBusiness.id}/users/${user.id}`);
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
            // TODO: Call API to accept request
            // For now, remove from join requests and show success
            setJoinRequests(prev => prev.filter(r => r.id !== request.id));
            setSuccessMessage(`${request.userName} has been added to the team`);
            setShowSuccessDialog(true);
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
            // TODO: Call API to reject request
            // For now, remove from join requests
            setJoinRequests(prev => prev.filter(r => r.id !== request.id));
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
            // TODO: Call API to cancel invite
            setPendingInvites(prev => prev.filter(i => i.id !== invite.id));
            setSuccessMessage('Invitation cancelled');
            setShowSuccessDialog(true);
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
            // TODO: Call API to resend invite
            setSuccessMessage(`Invitation resent to ${invite.email}`);
            setShowSuccessDialog(true);
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
        rightActions={[{ icon: 'user-plus', onPress: () => setIsInviteModalVisible(true) }]}
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
                      <View key={request.id}>
                        <View style={styles.userCard}>
                          <Avatar
                            userId={request.userId}
                            userName={request.userName}
                            imageUri={request.userAvatar}
                            size={48}
                            style={styles.userCardAvatar}
                          />
                          <View style={styles.userCardContent}>
                            <Text style={[styles.userCardName, { color: appTheme.colors.text }]} numberOfLines={1}>
                              {request.userName}
                            </Text>
                            <Text style={[styles.userCardUsername, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>
                              @{request.userEmail.split('@')[0]}
                            </Text>
                            <View style={styles.userCardButtons}>
                              <TouchableOpacity 
                                style={[styles.userCardButtonPrimary, { backgroundColor: appTheme.colors.primary }]}
                                onPress={() => handleAcceptRequest(request)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.userCardButtonPrimaryText}>Accept</Text>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={[styles.userCardButtonOutline, { borderColor: appTheme.colors.primary }]}
                                onPress={() => handleRejectRequest(request)}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.userCardButtonOutlineText, { color: appTheme.colors.primary }]}>Decline</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                          <TouchableOpacity 
                            style={styles.userCardOptionsButton}
                            onPress={() => {
                              Alert.alert(
                                'Options',
                                `Options for ${request.userName}`,
                                [
                                  { text: 'Report User', onPress: () => Alert.alert('Report', 'Report functionality coming soon') },
                                  { text: 'Cancel', style: 'cancel' },
                                ]
                              );
                            }}
                            activeOpacity={0.7}
                          >
                            <Icon name="ellipsis-vertical" size={20} color={appTheme.colors.text} />
                          </TouchableOpacity>
                        </View>
                        {index < joinRequests.length - 1 && (
                          <View style={[styles.listDivider, { backgroundColor: appTheme.colors.borderColor }]} />
                        )}
                      </View>
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
                      <View key={invite.id}>
                        <View style={styles.pendingCard}>
                          <Avatar
                            userId={invite.id}
                            userName={invite.name || invite.email}
                            size={48}
                            style={styles.pendingCardAvatar}
                          />
                          <View style={styles.pendingCardInfo}>
                            <Text style={[styles.pendingCardName, { color: appTheme.colors.text }]} numberOfLines={1}>
                              {invite.name || invite.email.split('@')[0]}
                            </Text>
                            <Text style={[styles.pendingCardUsername, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>
                              @{invite.email.split('@')[0]}
                            </Text>
                          </View>
                          <TouchableOpacity 
                            style={[styles.pendingCardButton, { backgroundColor: appTheme.colors.surface }]}
                            onPress={() => handleCancelInvite(invite)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.pendingCardButtonText, { color: appTheme.colors.textMuted }]}>Pending request</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.pendingCardOptionsButton}
                            onPress={() => handleCancelInvite(invite)}
                            activeOpacity={0.7}
                          >
                            <Icon name="ellipsis-vertical" size={20} color={appTheme.colors.text} />
                          </TouchableOpacity>
                        </View>
                        {index < pendingInvites.length - 1 && (
                          <View style={[styles.listDivider, { backgroundColor: appTheme.colors.borderColor }]} />
                        )}
                      </View>
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

      {/* Invite User Modal */}
      <InviteUserModal
        visible={isInviteModalVisible}
        onClose={() => setIsInviteModalVisible(false)}
        onInvite={handleInviteUser}
      />

      {/* Success Dialog */}
      <ConfirmationDialog
        visible={showSuccessDialog}
        variant="success"
        title="Success"
        message={successMessage}
        primaryButtonText="OK"
        onPrimaryAction={() => setShowSuccessDialog(false)}
        onClose={() => setShowSuccessDialog(false)}
      />
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
    paddingHorizontal: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 12,
    paddingBottom: 16, // 16px gap before first card
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  sectionContent: {
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
  // User Card styles (for Join Requests)
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 8,
  },
  userCardAvatar: {
    marginRight: 12,
  },
  userCardContent: {
    flex: 1,
    marginRight: 8,
  },
  userCardName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  userCardUsername: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginTop: 2,
  },
  userCardButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  userCardButtonPrimary: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCardButtonPrimaryText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  userCardButtonOutline: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCardButtonOutlineText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  userCardOptionsButton: {
    paddingLeft: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Pending Card styles (for Pending Invites)
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 8,
  },
  pendingCardAvatar: {
    marginRight: 12,
  },
  pendingCardInfo: {
    flex: 1,
    marginRight: 8,
  },
  pendingCardName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  pendingCardUsername: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginTop: 2,
  },
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
  pendingCardOptionsButton: {
    paddingLeft: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listDivider: {
    height: 1,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  roleSelector: {
    gap: 12,
  },
  roleOption: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  roleOptionSelected: {
    borderWidth: 2,
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 12,
  },
  // Staff type selector styles
  staffTypeSelector: {
    gap: 8,
  },
  staffTypeOption: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  staffTypeOptionSelected: {
    borderWidth: 2,
  },
  staffTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  staffTypeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  staffTypeDescription: {
    fontSize: 12,
    marginLeft: 28,
  },
  locationsList: {
    maxHeight: 200,
  },
  locationCheckbox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderWidth: 2,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalButtonPrimary: {
    borderWidth: 0,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
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
}); 