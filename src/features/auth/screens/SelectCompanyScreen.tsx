/**
 * SelectCompanyScreen
 * Search and select companies to join
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import AppButton from '@/shared/components/ui/AppButton';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import AppModal from '@/shared/components/ui/AppModal';
import { useProfileStore } from '@/shared/store/profileStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'SelectCompany'>;

// Mock companies data
const MOCK_COMPANIES = [
  { id: '1', name: 'NouPro Distribution Inc.', logo: 'https://picsum.photos/seed/comp1/100/100', industry: 'Food & Beverage' },
  { id: '2', name: 'Global Supply Co.', logo: 'https://picsum.photos/seed/comp2/100/100', industry: 'General Retail' },
  { id: '3', name: 'Metro Logistics', logo: 'https://picsum.photos/seed/comp3/100/100', industry: 'Logistics' },
  { id: '4', name: 'Island Traders', logo: 'https://picsum.photos/seed/comp4/100/100', industry: 'Import/Export' },
  { id: '5', name: 'Fresh Foods Ltd.', logo: 'https://picsum.photos/seed/comp5/100/100', industry: 'Food & Beverage' },
  { id: '6', name: 'Tech Solutions Mauritius', logo: 'https://picsum.photos/seed/comp6/100/100', industry: 'Technology' },
  { id: '7', name: 'Coastal Distributors', logo: 'https://picsum.photos/seed/comp7/100/100', industry: 'Distribution' },
  { id: '8', name: 'Premium Retail Group', logo: 'https://picsum.photos/seed/comp8/100/100', industry: 'Retail' },
];

interface Company {
  id: string;
  name: string;
  logo: string;
  industry: string;
}

export default function SelectCompanyScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const login = useProfileStore((state) => state.login);
  const clearNewUserFlag = useProfileStore((state) => state.clearNewUserFlag);
  
  // Get params - pendingAuth is optional (not present when coming from main app)
  const pendingAuth = route.params?.pendingAuth;
  const fromOnboarding = route.params?.fromOnboarding ?? false;
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Filter companies based on search
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return MOCK_COMPANIES;
    const query = searchQuery.toLowerCase();
    return MOCK_COMPANIES.filter(
      company =>
        company.name.toLowerCase().includes(query) ||
        company.industry.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const toggleCompanySelection = (companyId: string) => {
    setSelectedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
  };

  const handleSendRequest = async () => {
    if (selectedCompanies.size === 0) return;

    setIsSending(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSending(false);
    setShowSuccessModal(true);
  };

  const handleSuccessModalContinue = () => {
    setShowSuccessModal(false);
    
    if (pendingAuth) {
      // Coming from registration flow - complete registration and login
      // Pass isNewUser=true to show welcome message
      login(
        pendingAuth.user,
        pendingAuth.token,
        pendingAuth.refreshToken,
        pendingAuth.businesses || [],
        true // isNewUser
      );
    } else {
      // Coming from main app (onboarding notification) - clear new user flag and go back
      if (fromOnboarding) {
        clearNewUserFlag();
      }
      navigation.goBack();
    }
  };

  const renderCompanyItem = ({ item }: { item: Company }) => {
    const isSelected = selectedCompanies.has(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.companyCard,
          {
            borderColor: isSelected ? appTheme.colors.primary : appTheme.colors.borderColor,
            backgroundColor: appTheme.colors.cardBackground,
          },
        ]}
        onPress={() => toggleCompanySelection(item.id)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.logo }} style={styles.companyLogo} />
        <View style={styles.companyInfo}>
          <Text style={[styles.companyName, { color: appTheme.colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.companyIndustry, { color: appTheme.colors.textSecondary }]}>
            {item.industry}
          </Text>
        </View>
        <View style={[
          styles.checkbox,
          {
            borderColor: isSelected ? appTheme.colors.primary : appTheme.colors.borderColor,
            backgroundColor: isSelected ? appTheme.colors.primary : 'transparent',
          },
        ]}>
          {isSelected && (
            <Icon name="checkmark" size={16} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: appTheme.colors.text }]}>
            Select a company to join
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <AppSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search for companies"
            onClear={() => setSearchQuery('')}
          />
        </View>

        {/* Companies List */}
        <FlatList
          data={filteredCompanies}
          renderItem={renderCompanyItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="search" size={48} color={appTheme.colors.textMuted} />
              <Text style={[styles.emptyText, { color: appTheme.colors.textSecondary }]}>
                No companies found matching "{searchQuery}"
              </Text>
            </View>
          }
        />
      </View>

      {/* Bottom Button */}
      <View style={[
        styles.bottomContainer,
        { 
          paddingBottom: insets.bottom + 16,
          borderTopColor: appTheme.colors.borderColor,
        }
      ]}>
        <AppButton
          title={`Send request${selectedCompanies.size > 0 ? ` (${selectedCompanies.size})` : ''}`}
          onPress={handleSendRequest}
          variant={selectedCompanies.size > 0 ? 'primary' : 'disabled'}
          disabled={selectedCompanies.size === 0 || isSending}
          loading={isSending}
        />
      </View>

      {/* Success Modal */}
      <AppModal
        visible={showSuccessModal}
        variant="success"
        title="Request sent!"
        message="Your request has been sent and is waiting to be accepted by the company."
        primaryButtonText="Continue"
        onPrimaryAction={handleSuccessModalContinue}
        onClose={() => setShowSuccessModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: theme.fonts.primary.bold,
    lineHeight: 32,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  companyLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  companyInfo: {
    flex: 1,
    gap: 2,
  },
  companyName: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  companyIndustry: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
  },
  bottomContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
});
