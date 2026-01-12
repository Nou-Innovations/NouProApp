import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Dimensions } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { Avatar } from './Avatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionBottomSheet, { ActionItem } from './ActionBottomSheet';

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
  const optionItems: ActionItem[] = [];
  if (onReport && !isCurrentUser) {
    optionItems.push({ id: 'report', title: 'Report User' });
  }
  if (canRemove && !isCurrentUser && onRemove) {
    optionItems.push({ id: 'remove', title: 'Remove from Staff' });
  }

  const handleRoleSelect = (role: StaffRole) => {
    if (onRoleChange && role !== staff.role) {
      onRoleChange(staff, role);
    }
    setShowRoleSheet(false);
  };

  const handleOptionSelect = (item: ActionItem) => {
    if (item.id === 'report' && onReport) {
      onReport(staff);
    } else if (item.id === 'remove' && onRemove) {
      onRemove(staff);
    }
    setShowOptionsSheet(false);
  };

  return (
    <>
      <View style={styles.container}>
        {/* Avatar */}
        <Avatar
          userId={staff.id}
          userName={staff.name}
          imageUri={staff.avatar}
          size={48}
          style={styles.avatar}
        />

        {/* Info */}
        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: appTheme.colors.text }]} numberOfLines={1}>
              {staff.name}
            </Text>
            {isCurrentUser && (
              <View style={[styles.youBadge, { backgroundColor: appTheme.colors.primary }]}>
                <Text style={styles.youBadgeText}>You</Text>
              </View>
            )}
          </View>
          <Text style={[styles.username, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>
            @{displayUsername.replace('@', '').split('@')[0]}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {/* Role Button */}
          {canManageRole && !isCurrentUser ? (
            <TouchableOpacity
              style={[styles.roleButton, { backgroundColor: appTheme.colors.primary }]}
              onPress={() => setShowRoleSheet(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.roleButtonText}>{getRoleLabel(staff.role)}</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.roleBadge, { backgroundColor: appTheme.colors.surface }]}>
              <Text style={[styles.roleBadgeText, { color: appTheme.colors.textSecondary }]}>
                {getRoleLabel(staff.role)}
              </Text>
            </View>
          )}

          {/* Options Button - No border, no gap */}
          {optionItems.length > 0 && (
            <TouchableOpacity
              style={styles.optionsButton}
              onPress={() => setShowOptionsSheet(true)}
              activeOpacity={0.7}
            >
              <Icon name="ellipsis-vertical" size={20} color={appTheme.colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Divider */}
      {showDivider && (
        <View style={[styles.divider, { backgroundColor: appTheme.colors.borderColor }]} />
      )}

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
      <ActionBottomSheet
        visible={showOptionsSheet}
        onClose={() => setShowOptionsSheet(false)}
        title="Options"
        actionItems={optionItems}
        onActionPress={handleOptionSelect}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 8,
    paddingRight: 0,
  },
  avatar: {
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
    flexShrink: 1,
  },
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
  username: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0, // No gap between buttons
  },
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
  optionsButton: {
    paddingRight: 4,
    paddingLeft: 12,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
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
    gap: 4,
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
