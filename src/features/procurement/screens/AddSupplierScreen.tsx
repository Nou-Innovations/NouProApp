/**
 * AddSupplierScreen
 *
 * Form screen for creating a new supplier.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import * as procurementService from '../services/procurement.service';
import { useProcurementStore } from '../store/procurement.store';
import type { CreateSupplierData } from '@/shared/types/procurement';

export default function AddSupplierScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const addSupplier = useProcurementStore((s) => s.addSupplier);
  const updateSupplierInStore = useProcurementStore((s) => s.updateSupplier);

  // Edit mode: if supplierId is passed, we're editing an existing supplier
  const editSupplierId: string | undefined = route.params?.supplierId;
  const isEditMode = !!editSupplierId;

  // Form state
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSupplier, setIsLoadingSupplier] = useState(isEditMode);

  // Fetch existing supplier data when in edit mode
  useEffect(() => {
    if (!isEditMode || !activeBusiness?.id || !editSupplierId) return;
    setIsLoadingSupplier(true);
    procurementService.getSupplier(activeBusiness.id, editSupplierId)
      .then((supplier) => {
        setName(supplier.name || '');
        setContactName(supplier.contactName || '');
        setEmail(supplier.email || '');
        setPhone(supplier.phone || '');
        setAddress(supplier.address || '');
        setPaymentTerms(supplier.paymentTerms || '');
        setNotes(supplier.notes || '');
      })
      .catch(() => {
        Alert.alert('Error', 'Failed to load supplier data');
        navigation.goBack();
      })
      .finally(() => setIsLoadingSupplier(false));
  }, [isEditMode, activeBusiness?.id, editSupplierId]);

  const isFormValid = name.trim().length > 0;

  const handleSubmit = async () => {
    if (!activeBusiness?.id) {
      Alert.alert('Error', 'No active business selected');
      return;
    }

    if (!isFormValid) {
      Alert.alert('Error', 'Please enter a supplier name');
      return;
    }

    setIsSubmitting(true);

    try {
      const data: CreateSupplierData = {
        name: name.trim(),
        contactName: contactName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        paymentTerms: paymentTerms.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (isEditMode && editSupplierId) {
        const updated = await procurementService.updateSupplier(activeBusiness.id, editSupplierId, data);
        updateSupplierInStore(editSupplierId, updated);
        Alert.alert('Success', 'Supplier updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        const supplier = await procurementService.createSupplier(activeBusiness.id, data);
        addSupplier(supplier);
        Alert.alert('Success', 'Supplier added successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'add'} supplier. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    options?: {
      placeholder?: string;
      required?: boolean;
      keyboardType?: 'default' | 'email-address' | 'phone-pad';
      autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
      multiline?: boolean;
    },
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={[styles.fieldLabel, { color: appTheme.colors.textSecondary }]}>
        {label}
        {options?.required ? (
          <Text style={{ color: appTheme.colors.error }}> *</Text>
        ) : null}
      </Text>
      <TextInput
        style={[
          options?.multiline ? styles.textArea : styles.textInput,
          {
            borderColor: appTheme.colors.borderColor,
            backgroundColor: appTheme.colors.cardBackground,
            color: appTheme.colors.text,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={options?.placeholder}
        placeholderTextColor={appTheme.colors.textMuted}
        keyboardType={options?.keyboardType || 'default'}
        autoCapitalize={options?.autoCapitalize || 'sentences'}
        autoCorrect={false}
        multiline={options?.multiline}
        textAlignVertical={options?.multiline ? 'top' : 'center'}
      />
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      {isLoadingSupplier ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      ) : null}

      <SecondaryHeader
        title={isEditMode ? 'Edit Supplier' : 'Add Supplier'}
        leftAction={{
          icon: 'chevron-left',
          onPress: () => navigation.goBack(),
          accessibilityLabel: 'Go back',
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderField('Name', name, setName, {
            placeholder: 'Supplier name',
            required: true,
            autoCapitalize: 'words',
          })}

          {renderField('Contact Name', contactName, setContactName, {
            placeholder: 'Contact person',
            autoCapitalize: 'words',
          })}

          {renderField('Email', email, setEmail, {
            placeholder: 'email@example.com',
            keyboardType: 'email-address',
            autoCapitalize: 'none',
          })}

          {renderField('Phone', phone, setPhone, {
            placeholder: '+1 234 567 890',
            keyboardType: 'phone-pad',
          })}

          {renderField('Address', address, setAddress, {
            placeholder: 'Street, City, Country',
            autoCapitalize: 'words',
          })}

          {renderField('Payment Terms', paymentTerms, setPaymentTerms, {
            placeholder: 'e.g., Net 30, COD',
          })}

          {renderField('Notes', notes, setNotes, {
            placeholder: 'Additional notes...',
            multiline: true,
          })}
        </ScrollView>

        {/* Submit Button */}
        <View
          style={[
            styles.bottomActions,
            {
              borderTopColor: appTheme.colors.borderColor,
              backgroundColor: appTheme.colors.background,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: isFormValid
                  ? appTheme.colors.primary
                  : appTheme.colors.surface,
              },
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            activeOpacity={0.7}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={appTheme.colors.textInverse} />
            ) : (
              <Text
                style={[
                  styles.submitButtonText,
                  {
                    color: isFormValid
                      ? appTheme.colors.textInverse
                      : appTheme.colors.textMuted,
                  },
                ]}
              >
                {isEditMode ? 'Save Changes' : 'Add Supplier'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 20,
  },
  fieldContainer: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  textInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 88,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  bottomActions: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
