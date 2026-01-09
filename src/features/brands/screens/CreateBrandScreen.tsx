import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from 'App';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppButton from '@/shared/components/ui/AppButton';
import AppTextField from '@/shared/components/ui/AppTextField';
import ImagePlaceholder from '@/shared/components/ui/ImagePlaceholder';
import { useTheme } from '@/shared/theme/ThemeProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateBrand'>;

const CreateBrandScreen: React.FC<Props> = ({ navigation }) => {
  const [brandName, setBrandName] = useState('');
  const [brandImage, setBrandImage] = useState<string | null>(null);
  const { theme: appTheme } = useTheme();

  const isFormValid = useMemo(() => {
    return brandName.trim() !== '';
  }, [brandName]);

  const handleSave = () => {
    navigation.navigate('CreateProduct', { selectedBrand: brandName });
  };

  const handleSelectImage = (imageUri: string) => {
    setBrandImage(imageUri);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Create New Brand"
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
          title="Save Brand" 
          onPress={handleSave} 
          style={styles.saveButton}
          disabled={!isFormValid}
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
  }
});

export default CreateBrandScreen;
