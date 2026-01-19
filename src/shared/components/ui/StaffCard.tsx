import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppBottomSheet, { AppBottomSheetItem } from './AppBottomSheet';
import ListItemCard from './ListItemCard';

export type StaffRole = 'superAdmin' | 'admin' | 'staff';

export interface StaffMember {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: StaffRole;
  avatar?: string;
}

interface StaffCardProps {
  staff: StaffMember;
  isCurrentUser?: boolean;
  canManageRole?: boolean;
  canRemove?: boolean;
  onRoleChange?: (staff: StaffMember, newRole: StaffRole) => void;
  onRemove?: (staff: StaffMember) => void;
  onReport?: (staff: StaffMember) => void;
  showDivider?: boolean;
}

const getRoleLabel = (role: StaffRole): string => {
  switch (role) {
    case 'superAdmin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    case 'staff':
      return 'Staff';
    default:
      return role;
  }
};

// All role options
const ALL_ROLES: { id: StaffRole; title: string }[] = [
  { id: 'staff', title: 'Staff' },
  { id: 'admin', title: 'Admin' },
  { id: 'superAdmin', title: 'Super Admin' },
];

/** Role Badge/Button component */
const RoleBadge: React.FC<{
  role: StaffRole;
  editable: boolean;
  onPress?: () => void;
}> = ({ role, editable, onPress }) => {
  const { theme: appTheme } = useTheme();
  
  if (editable) {
    return (
      <TouchableOpacity
        style={[styles.roleButton, { backgroundColor: appTheme.colors.primary }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.roleButtonText}>{getRoleLabel(role)}</Text>
      </TouchableOpacity>
    );
  }
  
  return (
    <View style={[styles.roleBadge, { backgroundColor: appTheme.colors.surface }]}>
      <Text style={[styles.roleBadgeText, { color: appTheme.colors.textSecondary }]}>
        {getRoleLabel(role)}
      </Text>
    </View>
  );
};

/** You Badge component */
const YouBadge: React.FC = () => {
  const { theme: appTheme } = useTheme();
  return (
    <View style={[styles.youBadge, { backgroundColor: appTheme.colors.primary }]}>
      <Text style={styles.youBadgeText}>You</Text>
    </View>
  );
};

export const StaffCard: React.FC<StaffCardProps> = ({
  staff,
  isCurrentUser = false,
  canManageRole = false,
  canRemove = false,
  onRoleChange,
  onRemove,
  onReport,
  showDivider = true,
}) => {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [showRoleSheet, setShowRoleSheet] = useState(false);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);

  // Display username or email if no username
  const displayUsername = staff.username || staff.email;

  // Options items
  const optionItems: AppBottomSheetItem[] = [];
  if (onReport && !isCurrentUser) {
    optionItems.push({ id: 'report', title: 'Report User', variant: 'destructive' });
  }
  if (canRemove && !isCurrentUser && onRemove) {
    optionItems.push({ id: 'remove', title: 'Remove from Staff', variant: 'destructive' });
  }

  const handleRoleSelect = (role: StaffRole) => {
    if (onRoleChange && role !== staff.role) {
      onRoleChange(staff, role);
    }
    setShowRoleSheet(false);
  };

  const handleOptionSelect = (item: AppBottomSheetItem) => {
    if (item.id === 'report' && onReport) {
      onReport(staff);
    } else if (item.id === 'remove' && onRemove) {
      onRemove(staff);
    }
  };

  // Build right row content
  const rightRow1Content = (
    <View style={styles.rightRow1}>
      <RoleBadge 
        role={staff.role} 
        editable={canManageRole && !isCurrentUser}
        onPress={() => setShowRoleSheet(true)}
      />
      {isCurrentUser && <YouBadge />}
    </View>
  );

  return (
    <>
      <ListItemCard
        avatar={{
          type: 'image',
          userId: staff.id,
          userName: staff.name,
          imageUri: staff.avatar,
        }}
        title={staff.name}
        subtitle={`@${displayUsername.replace('@', '').split('@')[0]}`}
        rightRow1={{ timestamp: undefined }} // We use custom rightRow2 instead
        rightRow2={rightRow1Content}
        showOptionsButton={optionItems.length > 0}
        onOptionsPress={() => setShowOptionsSheet(true)}
        showDivider={showDivider}
      />

      {/* Role Selection Sheet - Custom with all 3 options */}
      <Modal
        visible={showRoleSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRoleSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRoleSheet(false)}
        >
          <View 
            style={[
              styles.roleSheetContent, 
              { 
                backgroundColor: appTheme.colors.cardBackground,
                paddingBottom: insets.bottom + 16,
              }
            ]}
          >
            <View style={styles.roleSheetHeader}>
              <Text style={[styles.roleSheetTitle, { color: appTheme.colors.text }]}>
                Change Role
              </Text>
              <TouchableOpacity onPress={() => setShowRoleSheet(false)}>
                <Icon name="close" size={24} color={appTheme.colors.iconMuted} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.roleOptions}>
              {ALL_ROLES.map((role) => {
                const isSelected = staff.role === role.id;
                return (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.roleOptionButton,
                      isSelected
                        ? { backgroundColor: appTheme.colors.primary }
                        : { backgroundColor: 'transparent', borderWidth: 1, borderColor: appTheme.colors.primary }
                    ]}
                    onPress={() => handleRoleSelect(role.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        { color: isSelected ? '#FFFFFF' : appTheme.colors.primary }
                      ]}
                    >
                      {role.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Options Sheet */}
      <AppBottomSheet
        visible={showOptionsSheet}
        onClose={() => setShowOptionsSheet(false)}
        title="Options"
        items={optionItems}
        onSelectItem={handleOptionSelect}
      />
    </>
  );
};

const styles = StyleSheet.create({
  // Right row content
  rightRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Role Button/Badge
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 112,
    height: 40,
    borderRadius: 8,
    gap: 4,
  },
  roleButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
    color: '#FFFFFF',
  },
  roleBadge: {
    width: 112,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleBadgeText: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.medium,
  },
  // You Badge
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  youBadgeText: {
    fontSize: 10,
    fontFamily: theme.fonts.primary.semiBold,
    color: '#FFFFFF',
  },
  // Role Sheet Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  roleSheetContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  roleSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleSheetTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.medium,
  },
  roleOptions: {
    gap: 8,
  },
  roleOptionButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleOptionText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
});

export default StaffCard;
