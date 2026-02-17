/**
 * SelectCompanyScreen
 * Search and select companies to join
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
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
import { authAPI, get, post } from '@/shared/services/api';

type Props = NativeStackScreenProps<AuthStackParamList, 'SelectCompany'>;

interface Company {
  id: string;
  name: string;
  logoUrl: string | null;
  industry: string | null;
  category: string | null;
}

export default function SelectCompanyScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const login = useProfileStore((state) => state.login);
  const clearNewUserFlag = useProfileStore((state) => state.clearNewUserFlag);

  const pendingAuth = route.params?.pendingAuth;
  const fromOnboarding = route.params?.fromOnboarding ?? false;

  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchCompanies = useCallback(async (q: string) => {
    setIsLoadingCompanies(true);
    setErrorMessage(null);
    try {
      const results = await get<Company[]>('/companies/search', { q, limit: 30 });
      setCompanies(Array.isArray(results) ? results : []);
    } catch {
      setErrorMessage('Could not load companies. Please try again.');
      setCompanies([]);
    } finally {
      setIsLoadingCompanies(false);
    }
  }, []);

  // Load initial list + debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCompanies(searchQuery);
    }, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchCompanies]);

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
    setErrorMessage(null);

    let successCount = 0;
    const errors: string[] = [];

    for (const companyId of selectedCompanies) {
      try {
        await post(`/companies/${companyId}/request-membership`, {});
        successCount++;
      } catch (err: any) {
        const msg = err?.response?.data?.error?.message || err?.message || 'Failed to send request';
        errors.push(msg);
      }
    }

    setIsSending(false);

    if (successCount > 0) {
      setShowSuccessModal(true);
    } else {
      setErrorMessage(errors[0] || 'Failed to send requests. Please try again.');
    }
  };

  const handleSuccessModalContinue = async () => {
    setShowSuccessModal(false);

    if (pendingAuth) {
      try {
        const fresh = await authAPI.refreshTokenIfNeeded(pendingAuth.token, pendingAuth.refreshToken);
        login(
          pendingAuth.user,
          fresh.token,
          fresh.refreshToken,
          pendingAuth.businesses || [],
          true
        );
      } catch (err) {
        if (__DEV__) {
          console.log('[SelectCompany] Error completing registration:', err);
        }
        login(
          pendingAuth.user,
          pendingAuth.token,
          pendingAuth.refreshToken,
          pendingAuth.businesses || [],
          true
        );
      }
    } else {
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
        {item.logoUrl ? (
          <Image source={{ uri: item.logoUrl }} style={styles.companyLogo} />
        ) : (
          <View style={[styles.companyLogo, styles.companyLogoFallback, { backgroundColor: appTheme.colors.surface }]}>
            <Icon name="business-outline" size={24} color={appTheme.colors.textSecondary} />
          </View>
        )}
        <View style={styles.companyInfo}>
          <Text style={[styles.companyName, { color: appTheme.colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.companyIndustry, { color: appTheme.colors.textSecondary }]}>
            {item.industry || item.category || 'Company'}
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
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: appTheme.colors.text }]}>
            Select a company to join
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <AppSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search for companies"
            onClear={() => setSearchQuery('')}
          />
        </View>

        {errorMessage && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: appTheme.colors.error || '#EF4444' }]}>
              {errorMessage}
            </Text>
          </View>
        )}

        {isLoadingCompanies ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={appTheme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={companies}
            renderItem={renderCompanyItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="search" size={48} color={appTheme.colors.textMuted} />
                <Text style={[styles.emptyText, { color: appTheme.colors.textSecondary }]}>
                  {searchQuery
                    ? `No companies found matching "${searchQuery}"`
                    : 'No published companies found'}
                </Text>
              </View>
            }
          />
        )}
      </View>

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
  errorContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  companyLogoFallback: {
    justifyContent: 'center',
    alignItems: 'center',
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
