import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/shared/types/navigation';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppButton from '@/shared/components/ui/AppButton';
import AppTextField from '@/shared/components/ui/AppTextField';
import ImagePlaceholder from '@/shared/components/ui/ImagePlaceholder';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { createBrand, updateBrand } from '../brands.service';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateBrand'>;

const CreateBrandScreen: React.FC<Props> = ({ navigation, route }) => {
  const editingBrand = route.params?.brand;
  const isEdit = !!editingBrand;
  // "Manage" mode = opened from the Brands screen (return there on save) rather
  // than the create-product flow (which jumps on to CreateProduct).
  const manageMode = route.params?.manage || isEdit;
  const [brandName, setBrandName] = useState(editingBrand?.name ?? '');
  const [brandImage, setBrandImage] = useState<string | null>(editingBrand?.logoUrl ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const { theme: appTheme } = useTheme();
  const { activeBusiness } = useProfileStore();

  const isFormValid = useMemo(() => {
    return brandName.trim() !== '';
  }, [brandName]);

  const handleSave = async () => {
    const companyId = activeBusiness?.id;
    if (!companyId) {
      AppAlert.alert('Error', 'No active business found.');
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit && editingBrand) {
        await updateBrand(companyId, editingBrand.id, {
          name: brandName.trim(),
          logoUrl: brandImage || undefined,
        });
      } else {
        await createBrand(companyId, {
          name: brandName.trim(),
          logoUrl: brandImage || undefined,
        });
      }
      if (manageMode) {
        navigation.goBack();
      } else {
        navigation.navigate('CreateProduct', { selectedBrand: brandName.trim() });
      }
    } catch (err: any) {
      AppAlert.alert('Error', err?.message || 'Failed to save brand');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectImage = (imageUri: string) => {
    setBrandImage(imageUri);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title={isEdit ? 'Edit Brand' : 'Create New Brand'}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: appTheme.colors.text }]}>Brand Logo</Text>
          <ImagePlaceholder 
            text="Tap to add logo"
            onPress={handleSelectImage}
            imageUri={brandImage}
            style={styles.logoPlaceholder}
          />
        </View>

        <AppTextField
          label="Brand Name"
          value={brandName}
          onChangeText={setBrandName}
          placeholder="Enter brand name"
          containerStyle={styles.textField}
        />
        
        <AppButton 
          title={isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Brand'}
          onPress={handleSave} 
          style={styles.saveButton}
          disabled={!isFormValid || isSaving}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  fieldGroup: {
    marginBottom: 24,
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  textField: {
    marginBottom: 24,
  },
  logoPlaceholder: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 16,
  },
});

export default CreateBrandScreen;
