import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import AppBottomSheet, { AppBottomSheetScrollView } from '@/shared/components/ui/AppBottomSheet';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import { useTheme } from '@/shared/theme/ThemeProvider';
import AppButton from '@/shared/components/ui/AppButton';
import ListItemCard from '@/shared/components/ui/ListItemCard';
import theme from '@/shared/theme';

// Types for staff assignment
interface Staff {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  assignedRole?: 'driver' | 'teamLeader' | 'support';
}

interface StaffItem {
  id: string;
  title: string;
  subtitle: string;
  avatar?: string;
  backgroundColor?: string;
  assignedRole?: 'driver' | 'teamLeader' | 'support';
}

interface AssignStaffModalProps {
  visible: boolean;
  onClose: () => void;
  staff: Staff[];
  selectedStaff: Staff[];
  onConfirm: (selectedStaff: Staff[]) => void;
  title?: string;
}

export default function AssignStaffModal({
  visible,
  onClose,
  staff,
  selectedStaff,
  onConfirm,
  title = 'Assign Staff',
}: AssignStaffModalProps) {
  const { theme: appTheme } = useTheme();
  const [filteredStaff, setFilteredStaff] = useState<StaffItem[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [tempSelectedStaff, setTempSelectedStaff] = useState<Staff[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Convert staff to StaffItem format
  useEffect(() => {
    const staffItems: StaffItem[] = staff.map(member => {
      const assignedRole = selectedStaff.find(s => s.id === member.id)?.assignedRole;
      
      return {
        id: member.id,
        title: member.name,
        subtitle: member.role,
        avatar: member.avatar,
        backgroundColor: assignedRole ? getAssignedRoleColor(assignedRole) : undefined,
        assignedRole,
      };
    });
    
    setFilteredStaff(staffItems);
    setSelectedStaffIds(selectedStaff.map(s => s.id));
    setTempSelectedStaff([...selectedStaff]);
  }, [staff, selectedStaff]);

  const getAssignedRoleColor = (role: 'driver' | 'teamLeader' | 'support') => {
    switch (role) {
      case 'driver':
        return '#2A75E61A'; // Blue with opacity
      case 'teamLeader':
        return '#F2A9001A'; // Orange with opacity
      case 'support':
        return '#34A8531A'; // Green with opacity
      default:
        return '#FAF8F5'; // Light gray
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredStaff(staff.map(member => ({
        id: member.id,
        title: member.name,
        subtitle: member.role,
        avatar: member.avatar,
        backgroundColor: member.assignedRole ? getAssignedRoleColor(member.assignedRole) : undefined,
        assignedRole: member.assignedRole,
      })));
      return;
    }

    const filtered = staff.filter(member =>
      member.name.toLowerCase().includes(query.toLowerCase()) ||
      member.role.toLowerCase().includes(query.toLowerCase())
    );

    setFilteredStaff(filtered.map(member => ({
      id: member.id,
      title: member.name,
      subtitle: member.role,
      avatar: member.avatar,
      backgroundColor: member.assignedRole ? getAssignedRoleColor(member.assignedRole) : undefined,
      assignedRole: member.assignedRole,
    })));
  };

  const handleSelectionChange = (selectedIds: string[]) => {
    setSelectedStaffIds(selectedIds);
    
    // Update temp selected staff
    const newTempSelected = staff.filter(member => selectedIds.includes(member.id));
    setTempSelectedStaff(newTempSelected);
  };

  const toggleSelection = (itemId: string) => {
    const newSelection = selectedStaffIds.includes(itemId)
      ? selectedStaffIds.filter(id => id !== itemId)
      : [...selectedStaffIds, itemId];
    handleSelectionChange(newSelection);
  };

  const assignRole = (staffId: string, role: 'driver' | 'teamLeader' | 'support') => {
    const updatedStaff = tempSelectedStaff.map(member => 
      member.id === staffId 
        ? { ...member, assignedRole: role }
        : member
    );
    
    setTempSelectedStaff(updatedStaff);
    
    // Update the filtered staff display
    setFilteredStaff(prev => prev.map(item => 
      item.id === staffId 
        ? { ...item, backgroundColor: getAssignedRoleColor(role), assignedRole: role }
        : item
    ));
  };

  const handleConfirm = () => {
    // Default any selected staff without a role to 'driver'
    const staffWithRoles = tempSelectedStaff.map(member => ({
      ...member,
      assignedRole: member.assignedRole || 'driver' as const,
    }));
    onConfirm(staffWithRoles);
    onClose();
  };

  const renderItem = (item: StaffItem, index: number) => {
    const isSelected = selectedStaffIds.includes(item.id);
    const isLast = index === filteredStaff.length - 1;
    const staffMember = tempSelectedStaff.find(s => s.id === item.id);

    // Role icon prefix
    const roleIconPrefix = staffMember?.assignedRole === 'driver' ? (
      <View style={styles.roleIcon}>
        <Icon name="car" size={20} color="#2A75E6" />
      </View>
    ) : staffMember?.assignedRole === 'teamLeader' ? (
      <View style={styles.roleIcon}>
        <Icon name="star" size={20} color="#F2A900" />
      </View>
    ) : staffMember?.assignedRole === 'support' ? (
      <View style={styles.roleIcon}>
        <Icon name="construct" size={20} color="#34A853" />
      </View>
    ) : null;

    // Role assignment buttons
    const roleAssignmentButtons = isSelected ? (
      <View style={styles.roleAssignmentContainer}>
        <TouchableOpacity
          style={[
            styles.roleButton,
            styles.driverButton,
            staffMember?.assignedRole === 'driver' && styles.roleButtonActive,
          ]}
          onPress={() => assignRole(item.id, 'driver')}
        >
          <Icon name="car" size={16} color="white" />
          <Text style={styles.roleButtonText}>Driver</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.roleButton,
            styles.teamLeaderButton,
            staffMember?.assignedRole === 'teamLeader' && styles.roleButtonActive,
          ]}
          onPress={() => assignRole(item.id, 'teamLeader')}
        >
          <Icon name="star" size={16} color="white" />
          <Text style={styles.roleButtonText}>Team Leader</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleButton,
            styles.supportButton,
            staffMember?.assignedRole === 'support' && styles.roleButtonActive,
          ]}
          onPress={() => assignRole(item.id, 'support')}
        >
          <Icon name="construct" size={16} color="white" />
          <Text style={styles.roleButtonText}>Support</Text>
        </TouchableOpacity>
      </View>
    ) : null;

    return (
      <View key={item.id} style={[
        item.backgroundColor ? { backgroundColor: item.backgroundColor } : undefined,
      ]}>
        <View style={styles.cardRow}>
          {roleIconPrefix}
          <View style={styles.cardContent}>
            <ListItemCard
              avatar={item.avatar 
                ? { type: 'image', imageUri: item.avatar, userId: item.id, userName: item.title }
                : { type: 'icon', icon: 'person', iconColor: appTheme.colors.textSecondary, backgroundColor: appTheme.colors.inputBackground }
              }
              title={item.title}
              subtitle={item.subtitle}
              onPress={() => toggleSelection(item.id)}
              showCheckmark
              selected={isSelected}
              showDivider={!isLast && !isSelected}
              style={{ paddingHorizontal: 0 }}
            />
          </View>
        </View>
        {roleAssignmentButtons}
        {!isLast && isSelected && (
          <View style={[styles.divider, { backgroundColor: appTheme.colors.surface }]} />
        )}
      </View>
    );
  };

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
    >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <AppSearchBar
          placeholder="Search staff..."
          value={searchQuery}
          onChangeText={handleSearch}
          onClear={() => handleSearch('')}
        />
      </View>

      {/* Staff List */}
      <AppBottomSheetScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredStaff.map((item, index) => renderItem(item, index))}
      </AppBottomSheetScrollView>

      {/* Footer Action */}
      {selectedStaffIds.length > 0 && (
        <View style={styles.footerActions}>
          <AppButton
            title={`Confirm (${selectedStaffIds.length} staff selected)`}
            onPress={handleConfirm}
          />
        </View>
      )}
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  listContainer: {
    maxHeight: 400,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 0,
  },
  roleIcon: {
    marginRight: 8,
    marginTop: 14,
  },
  cardContent: {
    flex: 1,
  },
  roleAssignmentContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 8,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  driverButton: {
    backgroundColor: '#2A75E6',
  },
  teamLeaderButton: {
    backgroundColor: '#F2A900',
  },
  supportButton: {
    backgroundColor: '#34A853',
  },
  roleButtonActive: {
    opacity: 1,
  },
  roleButtonText: {
    color: 'white',
    fontSize: 12,
    fontFamily: theme.fonts.primary.medium,
  },
  divider: {
    height: 1,
    marginHorizontal: 8,
  },
  footerActions: {
    paddingTop: 16,
    paddingBottom: 16,
  },
});
