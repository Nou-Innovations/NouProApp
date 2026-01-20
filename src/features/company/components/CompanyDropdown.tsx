import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Image,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useBusinessStore } from '@/shared/store/businessStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useNavigation } from '@react-navigation/native';

export default function CompanyDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const navigation = useNavigation();
  const { 
    companies, 
    currentCompany, 
    setCompany, 
    isLoading 
  } = useBusinessStore();
  const { theme: appTheme } = useTheme();

  const handleCompanySelect = (company: any) => {
    setCompany(company);
    setIsOpen(false);
  };

  return (
    <View>
      <TouchableOpacity 
        style={styles.dropdownTrigger}
        onPress={() => setIsOpen(true)}
        disabled={isLoading}
      >
        <View style={styles.companyInfo}>
          {currentCompany?.logoUrl && (
            <Image 
              source={{ uri: currentCompany.logoUrl }} 
              style={styles.companyLogo}
            />
          )}
          <View style={styles.companyTextContainer}>
            <Text 
              style={[styles.companyName, { color: appTheme.colors.text }]}
              numberOfLines={1}
            >
              {currentCompany?.name || 'Select Company'}
            </Text>
          </View>
        </View>
        <Icon 
          name="chevron-down" 
          size={16} 
          color={appTheme.colors.textLight} 
        />
      </TouchableOpacity>

      <Modal 
        visible={isOpen} 
        transparent 
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View 
            style={[
              styles.modalContent, 
              { backgroundColor: appTheme.colors.background }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: appTheme.colors.text }]}>
                Select Company
              </Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Icon 
                  name="close" 
                  size={24} 
                  color={appTheme.colors.textLight} 
                />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={companies}
              keyExtractor={(item) => item.id}
              style={styles.companiesList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.companyItem,
                    currentCompany?.id === item.id && styles.selectedCompanyItem,
                    { borderBottomColor: appTheme.colors.borderColor }
                  ]}
                  onPress={() => handleCompanySelect(item)}
                >
                  <View style={styles.companyItemContent}>
                    {item.logoUrl && (
                      <Image 
                        source={{ uri: item.logoUrl }} 
                        style={styles.companyItemLogo}
                      />
                    )}
                    <View style={styles.companyItemText}>
                      <Text 
                        style={[
                          styles.companyItemName,
                          { color: appTheme.colors.text },
                          currentCompany?.id === item.id && { color: appTheme.colors.primary }
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={[styles.companyItemDetails, { color: appTheme.colors.textLight }]}>
                        {item.settings.currency} • Tax: {(item.settings.taxRate * 100).toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                  {currentCompany?.id === item.id && (
                    <Icon 
                      name="checkmark" 
                      size={20} 
                      color={appTheme.colors.primary} 
                    />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyStateText, { color: appTheme.colors.textLight }]}>
                    No companies available
                  </Text>
                </View>
              )}
            />
            
            {/* Option for Personal Profile */}
            <TouchableOpacity
              style={[
                styles.personalProfileItem,
                { borderTopColor: appTheme.colors.borderColor }
              ]}
              onPress={() => {
                navigation.navigate('PersonalProfile' as never);
                setIsOpen(false);
              }}
            >
              <View style={styles.companyItemContent}>
                <View style={[styles.personalProfileIcon, { backgroundColor: appTheme.colors.primary }]}>
                  <Icon name="person" size={20} color="white" />
                </View>
                <Text style={[styles.personalProfileText, { color: appTheme.colors.text }]}>
                  Personal Profile
                </Text>
              </View>
              <Icon 
                name="chevron-forward" 
                size={16} 
                color={appTheme.colors.textLight} 
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 180,
    maxWidth: 220,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  companyLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  companyTextContainer: {
    flex: 1,
  },
  companyName: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxHeight: '70%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
  },
  companiesList: {
    maxHeight: 300,
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 8,
    marginHorizontal: 12,
    borderBottomWidth: 0.5,
  },
  selectedCompanyItem: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  companyItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  companyItemLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  companyItemText: {
    flex: 1,
  },
  companyItemName: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
    marginBottom: 2,
  },
  companyItemDetails: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
  },
  personalProfileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 8,
    marginHorizontal: 12,
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.borderColor,
  },
  personalProfileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  personalProfileText: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
    flex: 1,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
  },
}); 