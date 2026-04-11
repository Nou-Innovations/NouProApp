/**
 * Business Admin Route Guard
 * 
 * Prevents staff members from accessing Business Profile mode screens.
 * Even if UI is bypassed, this guard ensures staff cannot access admin functionality.
 * 
 * Usage:
 * Wrap business admin screens with this guard in navigation.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { getCapabilities } from '@/shared/auth/capabilities';
import theme from '@/shared/theme';

interface BusinessAdminGuardProps {
  children: React.ReactNode;
  /**
   * Optional custom message
   */
  message?: string;
  /**
   * Whether to auto-redirect to Personal mode instead of showing error
   */
  autoRedirect?: boolean;
}

/**
 * Guard component that blocks staff from accessing business admin screens
 */
export function BusinessAdminGuard({ 
  children, 
  message,
  autoRedirect = false 
}: BusinessAdminGuardProps) {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const currentUserRole = useProfileStore((state) => state.currentUserRole);
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const switchToPersonal = useProfileStore((state) => state.switchToPersonal);
  
  const capabilities = currentUserRole ? getCapabilities(currentUserRole) : null;
  const canAccessBusinessProfile = capabilities?.canAccessBusinessProfile ?? false;
  
  // Auto-redirect staff to personal mode
  useEffect(() => {
    if (autoRedirect && capabilities?.isStaff) {
      switchToPersonal();
      navigation.goBack();
    }
  }, [autoRedirect, capabilities?.isStaff, switchToPersonal, navigation]);
  
  // If staff member, show access denied screen
  if (capabilities?.isStaff) {
    return (
      <SafeAreaView 
        style={[styles.container, { backgroundColor: appTheme.colors.background }]} 
        edges={['top']}
      >
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="lock-closed" size={48} color="#F59E0B" />
          </View>
          
          <Text style={[styles.title, { color: appTheme.colors.text }]}>
            Access Restricted
          </Text>
          
          <Text style={[styles.message, { color: appTheme.colors.textSecondary }]}>
            {message || `You're a Staff member in ${activeBusiness?.name || 'this business'}. Only Admins can access Business Profile mode.`}
          </Text>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: appTheme.colors.primary }]}
            onPress={() => {
              switchToPersonal();
              navigation.goBack();
            }}
          >
            <Text style={styles.buttonText}>Go to Personal Mode</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // Admin/Super Admin - render children
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    color: '#FFFFFF',
  },
});

export default BusinessAdminGuard;
