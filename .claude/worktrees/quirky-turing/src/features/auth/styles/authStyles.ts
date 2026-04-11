/**
 * Shared Auth Styles
 * Common styles used across auth screens to reduce duplication.
 */

import { StyleSheet } from 'react-native';
import theme from '@/shared/theme';

export const authStyles = StyleSheet.create({
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
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerSection: {
    alignItems: 'flex-start' as const,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.primary.bold,
    lineHeight: 40,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 24,
  },
  errorText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginBottom: 16,
  },
  formContainer: {
    gap: 16,
  },
  bottomContainer: {
    paddingHorizontal: 16,
  },
  dividerContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    marginHorizontal: 16,
  },
  socialButton: {
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 12,
  },
  socialButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  fixedBottomContainer: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  linkText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
  linkBold: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
});
