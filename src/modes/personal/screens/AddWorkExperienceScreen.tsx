import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { AppModal } from '@/shared/components/ui';
import AppButton from '@/shared/components/ui/AppButton';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import Avatar from '@/shared/components/ui/Avatar';
import { get as apiGet } from '@/shared/services/api';

export default function AddWorkExperienceScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const addUserBusiness = useProfileStore((state) => state.addUserBusiness);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string; logo: string } | null>(null);
  const [role, setRole] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrentRole, setIsCurrentRole] = useState(false);

  // UI state
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const hasChanges = companyName.trim() !== '' || role.trim() !== '';

  // Search companies from API with debounce
  const [filteredCompanies, setFilteredCompanies] = useState<{ id: string; name: string; logo: string }[]>([]);

  useEffect(() => {
    if (!companyName.trim()) {
      setFilteredCompanies([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await apiGet<any[]>(`/companies/search?q=${encodeURIComponent(companyName.trim())}&limit=10`);
        setFilteredCompanies((results || []).map(r => ({
          id: r.id,
          name: r.name,
          logo: r.logoUrl || '',
        })));
      } catch {
        setFilteredCompanies([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [companyName]);

  const handleCompanyInputChange = (text: string) => {
    setCompanyName(text);
    setSelectedCompany(null);
    setShowSuggestions(text.trim().length > 0);
  };

  const handleSelectCompany = (company: { id: string; name: string; logo: string }) => {
    setSelectedCompany(company);
    setCompanyName(company.name);
    setShowSuggestions(false);
  };

  const handleAddNewCompany = () => {
    // Create a new company with the entered name
    setSelectedCompany({
      id: `new-${Date.now()}`,
      name: companyName.trim(),
      logo: '',
    });
    setShowSuggestions(false);
  };

  const handleSave = () => {
    if (!companyName.trim()) {
      Alert.alert('Error', 'Please enter a company name');
      return;
    }

    if (!role.trim()) {
      Alert.alert('Error', 'Please enter your role');
      return;
    }

    // In a real app, this would search for existing businesses or create a new one
    // For now, we'll just show a success message
    // The actual implementation would need backend support
    
    setShowSuccessDialog(true);
  };

  const handleCancel = () => {
    navigation.goBack();
  };


  const renderSuggestions = () => {
    if (!showSuggestions) return null;

    const hasMatches = filteredCompanies.length > 0;

    return (
      <View style={[styles.suggestionsContainer, { backgroundColor: appTheme.colors.background }]}>
        <ScrollView 
          style={styles.suggestionsList}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {hasMatches ? (
            <>
              {filteredCompanies.map((company) => (
                <TouchableOpacity
                  key={company.id}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectCompany({ ...company, logo: company.logo || '' })}
                >
                  <Avatar
                    userId={company.id}
                    userName={company.name}
                    imageUri={company.logo}
                    size={40}
                  />
                  <Text style={[styles.suggestionText, { color: appTheme.colors.text }]}>
                    {company.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <View style={styles.noResultsContainer}>
              <Text style={[styles.noResultsText, { color: appTheme.colors.textSecondary }]}>
                No company found
              </Text>
            </View>
          )}
        </ScrollView>
        {/* Add this company button */}
        <TouchableOpacity
          style={[styles.addCompanyButton, { borderTopColor: '#DAD3D1' }]}
          onPress={handleAddNewCompany}
        >
          <Icon name="add-circle-outline" size={20} color={appTheme.colors.text} />
          <Text style={[styles.addCompanyText, { color: appTheme.colors.text }]}>
            Add "{companyName.trim()}" as new company
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      <SecondaryHeader
        title="Add Work Experience"
        leftAction={{ icon: 'chevron-left', onPress: handleCancel }}
        rightActions={hasChanges ? [{ icon: 'save', onPress: handleSave }] : []}
      />
      <View style={styles.keyboardView}>
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <View style={[styles.infoItem, styles.companyInputContainer]}>
              <Text style={[styles.infoLabel, { color: '#777777' }]}>Company Name *</Text>
              <TextInput
                style={[
                  styles.infoInput,
                  {
                    color: appTheme.colors.text,
                    borderColor: showSuggestions ? '#000000' : '#DAD3D1',
                    backgroundColor: '#FFFFFF',
                  },
                ]}
                value={companyName}
                onChangeText={handleCompanyInputChange}
                placeholder="Enter company name"
                placeholderTextColor="#777777"
                onFocus={() => companyName.trim() && setShowSuggestions(true)}
              />
              {renderSuggestions()}
            </View>

            <View style={[styles.infoItem, { zIndex: 1 }]}>
              <Text style={[styles.infoLabel, { color: '#777777' }]}>Role / Position *</Text>
              <TextInput
                style={[
                  styles.infoInput,
                  {
                    color: appTheme.colors.text,
                    borderColor: '#DAD3D1',
                    backgroundColor: '#FFFFFF',
                  },
                ]}
                value={role}
                onChangeText={setRole}
                placeholder="Enter your role"
                placeholderTextColor="#777777"
              />
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: '#777777' }]}>Start Date</Text>
              <TextInput
                style={[
                  styles.infoInput,
                  {
                    color: appTheme.colors.text,
                    borderColor: '#DAD3D1',
                    backgroundColor: '#FFFFFF',
                  },
                ]}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="e.g., Jan 2020"
                placeholderTextColor="#777777"
              />
            </View>

            <View style={styles.infoItem}>
              <View style={styles.labelRow}>
                <Text style={[styles.infoLabel, styles.labelNoMargin, { color: '#777777' }]}>End Date</Text>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setIsCurrentRole(!isCurrentRole)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: '#DAD3D1',
                        backgroundColor: isCurrentRole ? '#22C55E' : 'transparent',
                      },
                    ]}
                  >
                    {isCurrentRole && <Icon name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.checkboxLabel, { color: '#777777' }]}>
                    I currently work here
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[
                  styles.infoInput,
                  {
                    color: appTheme.colors.text,
                    borderColor: '#DAD3D1',
                    backgroundColor: isCurrentRole
                      ? appTheme.colors.buttonBackgroundDisabled
                      : '#FFFFFF',
                  },
                ]}
                value={isCurrentRole ? 'Present' : endDate}
                onChangeText={setEndDate}
                placeholder="e.g., Dec 2023"
                placeholderTextColor="#777777"
                editable={!isCurrentRole}
              />
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons - Fixed at bottom */}
        <View style={styles.bottomContainer}>
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.saveButton,
                {
                  backgroundColor: hasChanges ? '#22C55E' : appTheme.colors.buttonBackgroundDisabled,
                },
              ]}
              onPress={handleSave}
              disabled={!hasChanges}
            >
              <Text
                style={[
                  styles.saveButtonText,
                  { color: hasChanges ? '#FFFFFF' : appTheme.colors.textMuted },
                ]}
              >
                Add Experience
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.cancelButton,
                {
                  backgroundColor: '#FFFFFF',
                },
              ]}
              onPress={handleCancel}
            >
              <Text style={[styles.cancelButtonText, { color: '#000000' }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Success Dialog */}
      <AppModal
        visible={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
          navigation.goBack();
        }}
        variant="success"
        title="Success"
        message="Work experience added successfully!"
        primaryButtonText="OK"
        onPrimaryAction={() => {
          setShowSuccessDialog(false);
          navigation.goBack();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  section: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  infoItem: {
    marginBottom: 20,
  },
  companyInputContainer: {
    zIndex: 1000,
    position: 'relative',
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    marginBottom: 8,
    marginLeft: 8,
  },
  labelNoMargin: {
    marginBottom: 0,
    marginLeft: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
  },
  infoInput: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DAD3D1',
    maxHeight: 350,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: 280,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E4EA',
  },
  suggestionText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
    marginLeft: 12,
    flex: 1,
  },
  noResultsContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
  },
  addCompanyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E1E4EA',
    backgroundColor: '#F6F7F9',
  },
  addCompanyText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    marginLeft: 8,
    flex: 1,
  },
  bottomContainer: {
    paddingBottom: 32,
  },
  actionButtonsContainer: {
    paddingHorizontal: 12,
    gap: 0,
  },
  actionButton: {
    borderRadius: 8,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    // Background color set dynamically
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  cancelButton: {
    // Background color set dynamically
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
});
