import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';

type Role = 'Super Admin' | 'Admin' | 'Staff';

interface InviteTeamModalProps {
  isVisible: boolean;
  onClose: () => void;
  onInvite: (data: { email: string; role: Role }) => void;
  isSuperAdmin?: boolean;
}

const InviteTeamModal: React.FC<InviteTeamModalProps> = ({
  isVisible,
  onClose,
  onInvite,
  isSuperAdmin = false,
}) => {
  const { theme: appTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('Staff');

  const handleInvite = () => {
    if (email.trim()) {
      onInvite({
        email: email.trim(),
        role: selectedRole,
      });
      setEmail('');
      setSelectedRole('Staff');
    }
  };

  const roles: Role[] = isSuperAdmin 
    ? ['Super Admin', 'Admin', 'Staff']
    : ['Admin', 'Staff'];

  const getRoleColor = (role: Role) => {
    switch (role) {
      case 'Super Admin':
        return appTheme.colors.accent;
      case 'Admin':
        return appTheme.colors.success;
      case 'Staff':
        return appTheme.colors.textLight;
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: appTheme.colors.cardBackground }]}>
          <View style={[styles.modalHeader, { borderBottomColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.modalTitle, { color: appTheme.colors.text }]}>Invite Team Member</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={appTheme.colors.iconColor} />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: appTheme.colors.text }]}>Email Address</Text>
              <TextInput
                style={[styles.input, { 
                  color: appTheme.colors.text, 
                  borderColor: appTheme.colors.borderColor,
                  backgroundColor: appTheme.colors.inputBackground
                }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email address"
                placeholderTextColor={appTheme.colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: appTheme.colors.text }]}>Role</Text>
              <View style={styles.roleSelector}>
                {roles.map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleOption,
                      { backgroundColor: selectedRole === role ? 
                          getRoleColor(role) : 
                          appTheme.colors.buttonBackground 
                      }
                    ]}
                    onPress={() => setSelectedRole(role)}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        { color: selectedRole === role ? '#FFFFFF' : appTheme.colors.text }
                      ]}
                    >
                      {role}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.cancelButton, { borderColor: appTheme.colors.borderColor }]} 
                onPress={onClose}
              >
                <Text style={[styles.cancelButtonText, { color: appTheme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.inviteButton, 
                  { backgroundColor: email.trim() ? appTheme.colors.accent : appTheme.colors.buttonBackground }
                ]}
                onPress={handleInvite}
                disabled={!email.trim()}
              >
                <Text style={[
                  styles.inviteButtonText, 
                  { color: email.trim() ? '#FFFFFF' : appTheme.colors.textLight }
                ]}>
                  Send Invitation
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  roleSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  roleTextSelected: {
    color: '#FFFFFF',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  inviteButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  inviteButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default InviteTeamModal; 