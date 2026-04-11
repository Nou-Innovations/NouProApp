import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  ScrollView,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';

interface EditBusinessModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    logo?: string;
    phone?: string;
    email?: string;
  }) => void;
  initialData: {
    name: string;
    description: string;
    logo?: string;
    phone?: string;
    email?: string;
  };
  onManageLocations: () => void;
  onChangePassword: () => void;
}

const EditBusinessModal: React.FC<EditBusinessModalProps> = ({
  isVisible,
  onClose,
  onSave,
  initialData,
  onManageLocations,
  onChangePassword,
}) => {
  const { theme: appTheme } = useTheme();
  
  const [businessName, setBusinessName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description);
  const [logo, setLogo] = useState(initialData.logo);
  const [phone, setPhone] = useState(initialData.phone || '');
  const [email, setEmail] = useState(initialData.email || '');

  const handleSave = () => {
    onSave({
      name: businessName,
      description,
      logo,
      phone,
      email,
    });
  };

  const handleChangeImage = () => {
    // Image picker functionality would go here
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: appTheme.colors.cardBackground }]}>
          <View style={[styles.modalHeader, { borderBottomColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.modalTitle, { color: appTheme.colors.text }]}>Edit Business Profile</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={24} color={appTheme.colors.iconColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent}>
            <View style={styles.imageSection}>
              {logo ? (
                <Image source={{ uri: logo }} style={styles.logoImage} resizeMode="cover" />
              ) : (
                <View style={[styles.logoPlaceholder, { backgroundColor: appTheme.colors.buttonBackground }]}>
                  <Icon name="business-outline" size={50} color={appTheme.colors.iconColor} />
                </View>
              )}
              <TouchableOpacity 
                style={[styles.changeImageButton, { backgroundColor: appTheme.colors.buttonBackground }]} 
                onPress={handleChangeImage}
              >
                <Text style={[styles.changeImageText, { color: appTheme.colors.accent }]}>Change Image</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: appTheme.colors.text }]}>Business Name</Text>
              <TextInput
                style={[styles.input, { 
                  color: appTheme.colors.text, 
                  borderColor: appTheme.colors.borderColor,
                  backgroundColor: appTheme.colors.inputBackground
                }]}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Enter business name"
                placeholderTextColor={appTheme.colors.textLight}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: appTheme.colors.text }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { 
                  color: appTheme.colors.text, 
                  borderColor: appTheme.colors.borderColor,
                  backgroundColor: appTheme.colors.inputBackground
                }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter description"
                placeholderTextColor={appTheme.colors.textLight}
                multiline={true}
                numberOfLines={5}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: appTheme.colors.text }]}>Phone Number</Text>
              <TextInput
                style={[styles.input, { 
                  color: appTheme.colors.text, 
                  borderColor: appTheme.colors.borderColor,
                  backgroundColor: appTheme.colors.inputBackground
                }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor={appTheme.colors.textLight}
                keyboardType="phone-pad"
              />
            </View>

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

            <View style={[styles.additionalOptions, { borderTopColor: appTheme.colors.borderColor }]}>
              <TouchableOpacity 
                style={[styles.optionButton, { borderBottomColor: appTheme.colors.borderColor }]} 
                onPress={onManageLocations}
              >
                <Icon name="location-outline" size={24} color={appTheme.colors.iconColor} />
                <Text style={[styles.optionButtonText, { color: appTheme.colors.text }]}>Manage Locations</Text>
                <Icon name="chevron-forward" size={24} color={appTheme.colors.iconColor} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.optionButton, { borderBottomColor: appTheme.colors.borderColor }]} 
                onPress={onChangePassword}
              >
                <Icon name="key-outline" size={24} color={appTheme.colors.iconColor} />
                <Text style={[styles.optionButtonText, { color: appTheme.colors.text }]}>Change Password</Text>
                <Icon name="chevron-forward" size={24} color={appTheme.colors.iconColor} />
              </TouchableOpacity>
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>

          <View style={[styles.buttonContainer, { 
            borderTopColor: appTheme.colors.borderColor,
            backgroundColor: appTheme.colors.cardBackground 
          }]}>
            <TouchableOpacity 
              style={[styles.cancelButton, { borderColor: appTheme.colors.borderColor }]} 
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: appTheme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: appTheme.colors.accent }]} 
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  changeImageButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  changeImageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  additionalOptions: {
    marginTop: 8,
    marginBottom: 24,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  optionButtonText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  bottomPadding: {
    height: Platform.OS === 'ios' ? 34 : 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
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
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

export default EditBusinessModal; 