import { Platform } from 'react-native';

export const fonts = {
  // Font families (using InterCustom- prefix to avoid iOS CTFontManager conflicts)
  primary: {
    regular: 'InterCustom-Regular',
    medium: 'InterCustom-Medium',
    semiBold: 'InterCustom-SemiBold',
    bold: 'InterCustom-Bold',
    extraBold: 'InterCustom-ExtraBold',
  },
  // Fallback system fonts
  system: {
    regular: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    medium: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    semiBold: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    bold: Platform.select({
      ios: 'System',
      android: 'sans-serif-bold',
      default: 'sans-serif',
    }),
    extraBold: Platform.select({
      ios: 'System',
      android: 'sans-serif-black',
      default: 'sans-serif',
    }),
  },
};

export const fontWeights = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
};

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 56,
};

export const lineHeight = {
  xs: 16,
  sm: 20,
  base: 24,
  md: 28,
  lg: 32,
  xl: 36,
  xxl: 40,
  xxxl: 64,
};

// Typography presets
export const typography = {
  h1: {
    fontFamily: fonts.primary.bold,
    fontSize: fontSize.xxl,
    lineHeight: lineHeight.xxl,
  },
  h2: {
    fontFamily: fonts.primary.bold,
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
  },
  h3: {
    fontFamily: fonts.primary.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
  },
  h4: {
    fontFamily: fonts.primary.medium,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
  },
  // Section title — the label above a content block or list section.
  // Single source of truth for section headings across the whole app.
  sectionTitle: {
    fontFamily: fonts.primary.bold,
    fontSize: fontSize.md,      // 18
    lineHeight: lineHeight.md,  // 28
  },
  body: {
    fontFamily: fonts.primary.regular,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  bodyBold: {
    fontFamily: fonts.primary.bold,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  bodyMedium: {
    fontFamily: fonts.primary.medium,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  caption: {
    fontFamily: fonts.primary.regular,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
  button: {
    fontFamily: fonts.primary.semiBold,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  label: {
    fontFamily: fonts.primary.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
  // Special styles
  logo: {
    fontFamily: fonts.primary.extraBold,
    fontSize: fontSize.xxxl,
    letterSpacing: 2,
  }
}; 