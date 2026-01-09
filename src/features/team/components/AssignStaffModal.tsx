import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import ModalList, { ModalListItem } from '@/shared/components/ui/ModalList';
import { useTheme } from '@/shared/theme/ThemeProvider';
import AppButton from '@/shared/components/ui/AppButton';

// Types for staff assignment
interface Staff {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  assignedRole?: 'driver' | 'teamLeader' | 'staff';
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
  const [filteredStaff, setFilteredStaff] = useState<ModalListItem[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [tempSelectedStaff, setTempSelectedStaff] = useState<Staff[]>([]);

  // Convert staff to ModalListItem format
  useEffect(() => {
    const staffItems: ModalListItem[] = staff.map(member => {
      const assignedRole = selectedStaff.find(s => s.id === member.id)?.assignedRole;
      
      return {
        id: member.id,
        title: member.name,
        subtitle: member.role,
        avatar: member.avatar,
        icon: member.avatar ? undefined : 'person',
        backgroundColor: assignedRole ? getAssignedRoleColor(assignedRole) : undefined,
        assignedRole, // Store the assigned role for later use
      };
    });
    
    setFilteredStaff(staffItems);
    setSelectedStaffIds(selectedStaff.map(s => s.id));
    setTempSelectedStaff([...selectedStaff]);
  }, [staff, selectedStaff]);

  const getAssignedRoleColor = (role: 'driver' | 'teamLeader' | 'staff') => {
    switch (role) {
      case 'driver':
        return '#0500FF1A'; // Blue with opacity
      case 'teamLeader':
        return '#F59E0B1A'; // Orange with opacity
      default:
        return '#F9FAFB'; // Light gray
    }
  };

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredStaff(staff.map(member => ({
        id: member.id,
        title: member.name,
        subtitle: member.role,
        avatar: member.avatar,
        icon: member.avatar ? undefined : 'person',
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
      icon: member.avatar ? undefined : 'person',
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

  const assignRole = (staffId: string, role: 'driver' | 'teamLeader') => {
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
    onConfirm(tempSelectedStaff);
    onClose();
  };

  const renderCustomItem = (item: ModalListItem, index: number) => {
    const isSelected = selectedStaffIds.includes(item.id);
    const isLast = index === filteredStaff.length - 1;
    const staffMember = tempSelectedStaff.find(s => s.id === item.id);

    return (
      <View key={item.id}>
        {/* Main staff row */}
        <TouchableOpacity
          style={[
            styles.staffRow,
            {
              backgroundColor: item.backgroundColor || 'transparent',
              borderBottomColor: appTheme.colors.borderColor,
            },
            isLast && styles.lastItem,
          ]}
          onPress={() => {
            const newSelection = isSelected
              ? selectedStaffIds.filter(id => id !== item.id)
              : [...selectedStaffIds, item.id];
            handleSelectionChange(newSelection);
          }}
        >
          <View style={styles.staffContent}>
            {/* Role icon */}
            {staffMember?.assignedRole === 'driver' && (
              <View style={styles.roleIcon}>
                <Icon name="car" size={20} color="#0500FF" />
              </View>
            )}
            {staffMember?.assignedRole === 'teamLeader' && (
              <View style={styles.roleIcon}>
                <Icon name="star" size={20} color="#F59E0B" />
              </View>
            )}
            
            {/* Avatar */}
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: appTheme.colors.inputBackground }]}>
                <Icon name="person" size={24} color={appTheme.colors.textLight} />
              </View>
            )}
            
            {/* Staff info */}
            <View style={styles.staffInfo}>
              <Text style={[styles.staffName, { color: appTheme.colors.text }]}>
                {item.title}
              </Text>
              <Text style={[styles.staffRole, { color: appTheme.colors.textLight }]}>
                {item.subtitle}
              </Text>
            </View>
            
            {/* Checkbox */}
            <View style={styles.checkbox}>
              {isSelected ? (
                <View style={[styles.checkboxChecked, { backgroundColor: appTheme.colors.primary }]}>
                  <Icon name="checkmark" size={18} color="white" />
                </View>
              ) : (
                <View style={[styles.checkboxUnchecked, { borderColor: appTheme.colors.borderColor }]} />
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Role assignment buttons - Only show when staff is selected */}
        {isSelected && (
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
          </View>
        )}
      </View>
    );
  };

  return (
    <ModalList
      visible={visible}
      onClose={onClose}
      title={title}
      items={filteredStaff}
      onSelectItem={() => {}} // Handled by custom render
      hasSearch={true}
      searchPlaceholder="Search staff..."
      onSearchChange={handleSearch}
      multiSelect={true}
      selectedItems={selectedStaffIds}
      onSelectionChange={handleSelectionChange}
      renderItem={renderCustomItem}
      footerActions={
        selectedStaffIds.length > 0 ? (
          <AppButton
            title={`Confirm (${selectedStaffIds.length} staff selected)`}
            onPress={handleConfirm}
          />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  staffRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  staffContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  roleIcon: {
    marginRight: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  staffRole: {
    fontSize: 14,
  },
  checkbox: {
    marginLeft: 12,
  },
  checkboxChecked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxUnchecked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  roleAssignmentContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
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
    backgroundColor: '#0500FF',
  },
  teamLeaderButton: {
    backgroundColor: '#F59E0B',
  },
  roleButtonActive: {
    opacity: 1,
  },
  roleButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
}); 