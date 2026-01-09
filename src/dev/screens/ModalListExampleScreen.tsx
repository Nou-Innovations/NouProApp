import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import ModalList, { ModalListItem } from '@/shared/components/ui/ModalList';
import { useTheme } from '@/shared/theme/ThemeProvider';
import AppButton from '@/shared/components/ui/AppButton';

// Mock data for different use cases
const mockUsers: ModalListItem[] = [
  {
    id: '1',
    title: 'John Doe',
    subtitle: 'Admin • Marketing Team',
    avatar: 'https://i.pravatar.cc/150?img=1',
  },
  {
    id: '2',
    title: 'Jane Smith',
    subtitle: 'Staff • Sales Team',
    avatar: 'https://i.pravatar.cc/150?img=2',
  },
  {
    id: '3',
    title: 'Mike Johnson',
    subtitle: 'Manager • Operations',
    avatar: 'https://i.pravatar.cc/150?img=3',
  },
  {
    id: '4',
    title: 'Sarah Wilson',
    subtitle: 'Staff • Support Team',
    avatar: 'https://i.pravatar.cc/150?img=4',
  },
];

const mockCompanies: ModalListItem[] = [
  {
    id: '1',
    title: 'Tech Solutions Inc.',
    subtitle: '123 Business Ave, Tech City',
    icon: 'business',
    iconColor: '#3B82F6',
  },
  {
    id: '2',
    title: 'Creative Design Co.',
    subtitle: '456 Design Street, Art District',
    icon: 'color-palette',
    iconColor: '#EF4444',
  },
  {
    id: '3',
    title: 'Marketing Pros',
    subtitle: '789 Marketing Blvd, Commerce Zone',
    icon: 'trending-up',
    iconColor: '#10B981',
  },
];

const mockOptions: ModalListItem[] = [
  {
    id: '1',
    title: 'Camera',
    subtitle: 'Take a photo',
    icon: 'camera',
    iconColor: '#8B5CF6',
  },
  {
    id: '2',
    title: 'Gallery',
    subtitle: 'Choose from gallery',
    icon: 'image',
    iconColor: '#F59E0B',
  },
  {
    id: '3',
    title: 'Document',
    subtitle: 'Upload a document',
    icon: 'document',
    iconColor: '#3B82F6',
  },
  {
    id: '4',
    title: 'Location',
    subtitle: 'Share location',
    icon: 'location',
    iconColor: '#EF4444',
  },
];

const mockRoles: ModalListItem[] = [
  {
    id: 'admin',
    title: 'Admin',
    subtitle: 'Full access to all features',
    icon: 'shield-checkmark',
    iconColor: '#EF4444',
  },
  {
    id: 'manager',
    title: 'Manager',
    subtitle: 'Manage team and projects',
    icon: 'people',
    iconColor: '#F59E0B',
  },
  {
    id: 'staff',
    title: 'Staff',
    subtitle: 'Basic access to features',
    icon: 'person',
    iconColor: '#10B981',
    isSelected: true,
  },
];

export default function ModalListExampleScreen() {
  const { theme: appTheme } = useTheme();
  
  // Modal visibility states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showMultiSelectModal, setShowMultiSelectModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  // Selection states
  const [selectedUser, setSelectedUser] = useState<ModalListItem | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<ModalListItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<ModalListItem | null>(mockRoles[2]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ModalListItem[]>(mockUsers);

  // Search functionality
  const handleUserSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredUsers(mockUsers);
      return;
    }
    
    const filtered = mockUsers.filter(user => 
      user.title.toLowerCase().includes(query.toLowerCase()) ||
      user.subtitle?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  const handleUserSelect = (user: ModalListItem) => {
    setSelectedUser(user);
    Alert.alert('User Selected', `You selected: ${user.title}`);
  };

  const handleCompanySelect = (company: ModalListItem) => {
    setSelectedCompany(company);
    Alert.alert('Company Selected', `You selected: ${company.title}`);
  };

  const handleOptionSelect = (option: ModalListItem) => {
    Alert.alert('Option Selected', `You selected: ${option.title}`);
  };

  const handleRoleSelect = (role: ModalListItem) => {
    setSelectedRole(role);
    Alert.alert('Role Selected', `You selected: ${role.title}`);
  };

  const handleMultiSelectChange = (selectedIds: string[]) => {
    setSelectedUsers(selectedIds);
  };

  const renderExampleButton = (title: string, onPress: () => void, subtitle?: string) => (
    <TouchableOpacity style={styles.exampleButton} onPress={onPress}>
      <View style={styles.exampleButtonContent}>
        <Text style={[styles.exampleButtonTitle, { color: appTheme.colors.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.exampleButtonSubtitle, { color: appTheme.colors.textLight }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <Icon name="chevron-forward" size={20} color={appTheme.colors.textLight} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: appTheme.colors.text }]}>
          ModalList Examples
        </Text>
        
        <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
          Basic Usage
        </Text>
        
        {renderExampleButton(
          'User Selection',
          () => setShowUserModal(true),
          selectedUser ? `Selected: ${selectedUser.title}` : 'Select a user'
        )}
        
        {renderExampleButton(
          'Company Selection',
          () => setShowCompanyModal(true),
          selectedCompany ? `Selected: ${selectedCompany.title}` : 'Select a company'
        )}
        
        {renderExampleButton(
          'Options Menu',
          () => setShowOptionsModal(true),
          'Show action options'
        )}
        
        {renderExampleButton(
          'Role Selection',
          () => setShowRoleModal(true),
          selectedRole ? `Selected: ${selectedRole.title}` : 'Select a role'
        )}
        
        <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
          Advanced Features
        </Text>
        
        {renderExampleButton(
          'Multi-Selection',
          () => setShowMultiSelectModal(true),
          `${selectedUsers.length} users selected`
        )}
        
        {renderExampleButton(
          'With Search',
          () => setShowSearchModal(true),
          'Searchable user list'
        )}
      </ScrollView>

      {/* User Selection Modal */}
      <ModalList
        visible={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Select User"
        items={mockUsers}
        onSelectItem={handleUserSelect}
      />

      {/* Company Selection Modal */}
      <ModalList
        visible={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        title="Select Company"
        items={mockCompanies}
        onSelectItem={handleCompanySelect}
      />

      {/* Options Modal */}
      <ModalList
        visible={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        title="Choose Action"
        items={mockOptions}
        onSelectItem={handleOptionSelect}
      />

      {/* Role Selection Modal */}
      <ModalList
        visible={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title="Select Role"
        items={mockRoles}
        onSelectItem={handleRoleSelect}
      />

      {/* Multi-Select Modal */}
      <ModalList
        visible={showMultiSelectModal}
        onClose={() => setShowMultiSelectModal(false)}
        title="Select Team Members"
        items={mockUsers}
        onSelectItem={() => {}} // Not used in multi-select
        multiSelect={true}
        selectedItems={selectedUsers}
        onSelectionChange={handleMultiSelectChange}
        footerActions={
          <AppButton
            title={`Confirm Selection (${selectedUsers.length})`}
            onPress={() => {
              setShowMultiSelectModal(false);
              const selectedNames = mockUsers
                .filter(user => selectedUsers.includes(user.id))
                .map(user => user.title)
                .join(', ');
              Alert.alert('Selection Confirmed', `Selected: ${selectedNames}`);
            }}
            disabled={selectedUsers.length === 0}
          />
        }
      />

      {/* Search Modal */}
      <ModalList
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        title="Search Users"
        items={filteredUsers}
        onSelectItem={handleUserSelect}
        hasSearch={true}
        searchPlaceholder="Search by name or team..."
        onSearchChange={handleUserSearch}
      />
    </SafeAreaView>
  );
}

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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 16,
  },
  exampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  exampleButtonContent: {
    flex: 1,
  },
  exampleButtonTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  exampleButtonSubtitle: {
    fontSize: 14,
  },
}); 