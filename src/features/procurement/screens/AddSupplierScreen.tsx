/**
 * AddSupplierScreen
 *
 * Form screen for creating a new supplier.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Modal, FlatList } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { KeyboardAwareScreen } from '@/shared/components/layout';
import { ListItemCard } from '@/shared/components/ui';
import { getConnectedBusinesses, type ConnectedBusiness } from '@/features/pricing/priceLists.service';
import * as procurementService from '../services/procurement.service';
import { useProcurementStore } from '../store/procurement.store';
import type { CreateSupplierData } from '@/shared/types/procurement';
import { getApiErrorMessage } from '@/shared/utils/apiError';

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

  /**
   * Link this supplier to a real company you're connected to.
   *
   * The schema, the backend and the `AddSupplier: { supplierBusinessId? }` nav param all
   * existed — only the UI was missing, so nothing ever set it (B-3). Customers has had
   * this picker all along; this mirrors it, including the "connected businesses only"
   * gate, so you can't claim an arbitrary company as your supplier.
   */
  const [linkedBusinessId, setLinkedBusinessId] = useState<string | null>(
    route.params?.supplierBusinessId ?? null,
  );
  const [linkedBusinessName, setLinkedBusinessName] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [connections, setConnections] = useState<ConnectedBusiness[]>([]);

  const openLinkPicker = useCallback(async () => {
    setPickerOpen(true);
    if (connections.length === 0 && activeBusiness?.id) {
      try {
        setConnections(await getConnectedBusinesses(activeBusiness.id));
      } catch {
        /* no connections is fine */
      }
    }
  }, [activeBusiness?.id, connections.length]);

  const selectLinked = (cb: ConnectedBusiness) => {
    setLinkedBusinessId(cb.business.id);
    setLinkedBusinessName(cb.business.name);
    if (!name.trim()) setName(cb.business.name);
    setPickerOpen(false);
  };

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
        AppAlert.alert('Error', 'Failed to load supplier data');
        navigation.goBack();
      })
      .finally(() => setIsLoadingSupplier(false));
  }, [isEditMode, activeBusiness?.id, editSupplierId]);

  const isFormValid = name.trim().length > 0;

  const handleSubmit = async () => {
    if (!activeBusiness?.id) {
      AppAlert.alert('Error', 'No active business selected');
      return;
    }

    if (!isFormValid) {
      AppAlert.alert('Error', 'Please enter a supplier name');
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
        supplierBusinessId: linkedBusinessId || undefined,
      };

      if (isEditMode && editSupplierId) {
        const updated = await procurementService.updateSupplier(activeBusiness.id, editSupplierId, data);
        updateSupplierInStore(editSupplierId, updated);
        AppAlert.alert('Success', 'Supplier updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        const supplier = await procurementService.createSupplier(activeBusiness.id, data);
        addSupplier(supplier);
        AppAlert.alert('Success', 'Supplier added successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      // Surface what the server actually said. The generic message swallowed real
      // reasons — a plan limit, a duplicate link, or (now) "you can only link a company
      // you are connected with", which is actionable and was invisible here (B-4).
      AppAlert.alert(
        'Error',
        getApiErrorMessage(error, `Failed to ${isEditMode ? 'update' : 'add'} supplier. Please try again.`),
      );
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

      <KeyboardAwareScreen
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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

          {/* Optional link to a connected NouPro business */}
          <Text style={[styles.fieldLabel, { color: appTheme.colors.textSecondary }]}>
            Linked business (optional)
          </Text>
          <TouchableOpacity
            style={[styles.textInput, { borderColor: appTheme.colors.borderColor, backgroundColor: appTheme.colors.cardBackground, justifyContent: 'center' }]}
            onPress={openLinkPicker}
            activeOpacity={0.7}
          >
            <Text
              style={{ color: linkedBusinessName || linkedBusinessId ? appTheme.colors.text : appTheme.colors.textMuted }}
              numberOfLines={1}
            >
              {linkedBusinessName || (linkedBusinessId ? 'Linked' : 'Not linked — tap to choose a connection')}
            </Text>
          </TouchableOpacity>
          {linkedBusinessId ? (
            <TouchableOpacity onPress={() => { setLinkedBusinessId(null); setLinkedBusinessName(null); }}>
              <Text style={{ color: appTheme.colors.error, marginBottom: 12 }}>Remove link</Text>
            </TouchableOpacity>
          ) : null}

          {renderField('Payment Terms', paymentTerms, setPaymentTerms, {
            placeholder: 'e.g., Net 30, COD',
          })}

          {renderField('Notes', notes, setNotes, {
            placeholder: 'Additional notes...',
            multiline: true,
          })}
      </KeyboardAwareScreen>

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: appTheme.colors.background }} edges={['top']}>
          <SecondaryHeader title="Link a connection" leftAction={{ icon: 'close', onPress: () => setPickerOpen(false) }} />
          <FlatList
            data={connections}
            keyExtractor={(cb) => cb.connectionId}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <Text style={{ color: appTheme.colors.textLight, textAlign: 'center', marginTop: 24 }}>
                No connected businesses yet. Connect with a business first, or just save this as a standalone supplier.
              </Text>
            }
            renderItem={({ item }) => (
              <ListItemCard
                avatar={item.business.logoUrl
                  ? { type: 'image', imageUri: item.business.logoUrl, userName: item.business.name }
                  : { type: 'initials', userName: item.business.name }}
                title={item.business.name}
                onPress={() => selectLinked(item)}
              />
            )}
          />
        </SafeAreaView>
      </Modal>

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
