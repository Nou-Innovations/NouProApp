import { fonts, fontWeights, fontSize, lineHeight, typography } from './typography';

// Light theme (default)
export const lightTheme = {
  fonts,
  fontWeights,
  fontSize,
  lineHeight,
  typography,
  colors: {
    // Primary colors
    primary: '#000000',
    secondary: '#33363A',
    background: '#FFFFFF',
    surface: '#F6F7F9',
    accent: '#D23030',
    
    // Text colors
    text: '#000000',
    textSecondary: '#575B66',
    textMuted: '#A4AAB8',
    textInverse: '#FFFFFF',
    
    // @deprecated - Use textSecondary instead
    textLight: '#575B66',
    
    // Status colors (base)
    success: '#2ACF01',
    error: '#FF2400',
    warning: '#FFB600',
    info: '#0075FF',
    neutral: '#A4AAB8',
    
    // Status colors (specific states)
    statusNewOrder: '#6E0000',       // New order / Discontinued
    statusDiscontinued: '#6E0000',   // Discontinued (alias)
    statusOngoing: '#0075FF',        // Ongoing
    statusDone: '#2ACF01',           // Done / Paid / Import
    statusPaid: '#2ACF01',           // Paid (alias)
    statusImport: '#2ACF01',         // Import (alias)
    statusInReview: '#A76AF0',       // In review
    statusPending: '#FFB600',        // Pending / In Production
    statusInProduction: '#FFB600',   // In Production (alias)
    statusLowStock: '#FF7A00',       // Low Stock / Export
    statusExport: '#FF7A00',         // Export (alias)
    statusCanceled: '#FF6B6B',       // Canceled
    statusUnpaid: '#FF2400',         // Unpaid / Out of Stock
    statusOutOfStock: '#FF2400',     // Out of Stock (alias)
    statusInactive: '#7BA9C1',       // Inactive
    
    // @deprecated - Status color aliases for backward compatibility (will be removed)
    // Use success, error, warning, info instead
    errorBright: '#FF2400',
    warningBright: '#FFB600',
    warningOrange: '#FFB600',
    infoBright: '#0075FF',
    
    // UI colors
    cardBackground: '#FFFFFF',
    borderColor: '#E1E4EA',
    iconColor: '#393E47',
    iconMuted: '#A4AAB8',
    buttonBackground: '#F6F7F9',
    buttonBackgroundDisabled: '#F6F7F9',
    
    // Input colors
    inputBackground: '#FFFFFF',
    inputBackgroundFocused: '#F6F7F9',
    inputBorder: '#E1E4EA',
    inputBorderFocused: '#000000',
    inputPlaceholder: '#A4AAB8',
    caretColor: '#000000',
    
    // Text field specific colors (consolidated)
    textFieldBorderDefault: '#E1E4EA',
    textFieldBorderSelected: '#000000',
    textFieldLabelDefault: '#575B66',
    textFieldLabelSelected: '#000000',
    textFieldPlaceholder: '#A4AAB8',
    textFieldText: '#000000',
    
    // Switch colors (from design.json)
    switchTrackOff: '#E9E9EA',
    switchTrackOn: '#2ACF01',
    switchThumb: '#FFFFFF',
    
    // Highlight/special states
    highlightedRow: '#F6F7F9',
    selectedBackground: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)',
    
    // Confirmation dialog backgrounds
    confirmDialogDarkRed: 'rgba(22, 0, 0, 0.9)',   // #160000 at 90%
    confirmDialogDarkGreen: 'rgba(0, 16, 4, 0.9)', // #001004 at 90%
    confirmDialogDarkGreenSolid: '#001004',        // Solid dark green for text
    
    // Special purpose colors
    imagePlaceholder: '#F6F7F9',
    badgeBackground: '#D23030',
    linkColor: '#0075FF',
    
    // Divider
    divider: '#E1E4EA',
  },
  
  // Avatar colors for random assignment
  avatarColors: [
    '#FF6B6B', // Coral Red
    '#4ECDC4', // Teal
    '#45B7D1', // Sky Blue
    '#96CEB4', // Sage Green
    '#FFEAA7', // Soft Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F', // Golden Yellow
    '#BB8FCE', // Lavender
    '#85C1E9', // Light Blue
    '#F8B500', // Amber
    '#00CED1', // Dark Cyan
    '#FF7F50', // Coral
    '#6B5B95', // Purple
    '#88B04B', // Greenery
  ],
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8, 
    lg: 16,
    xl: 24,
    round: 9999,
  },
  // Avatar sizes
  avatarSizes: {
    xs: 32,
    sm: 40,
    md: 52,
    lg: 64,
    xl: 72,
  },
  // Icon sizes
  iconSizes: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
  },
  // Component heights
  heights: {
    button: 56,
    buttonSmall: 40,
    input: 44,
    inputSmall: 40,
    header: 48,
    filterBar: 40,
    iconButton: 40,
    iconButtonSmall: 32,
  },
  // Text field specifications (from design.json)
  // Label is positioned ABOVE the field, not floating inside
  textField: {
    // Field dimensions
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    
    // Label (above field)
    label: {
      fontSize: 14,
      marginBottom: 8,
      marginLeft: 8,
    },
    
    // Input text
    input: {
      fontSize: 16,
    },
    
    // Placeholder text
    placeholder: {
      fontSize: 16,
    },
    
    // Caret
    caret: {
      width: 2,
      height: 24,
    },
    
    // Icon configuration
    iconContainerWidth: 48,
    iconSize: 20,
    
    // Dropdown/selection
    dropdown: {
      rightIconSize: 20,
    },
    
    // Multi-select count display (e.g., "4 items", "1000 products")
    multiSelect: {
      rightIconSize: 20,
      rightIconPaddingRight: 12,
    },
    
    // Multiline text area configuration
    multiline: {
      minHeight: 100,
      paddingVertical: 12,
      lineHeight: 20,
    },
  },
};

// Dark theme
export const darkTheme = {
  ...lightTheme,
  colors: {
    // Primary colors
    primary: '#FFFFFF',
    secondary: '#C4C7CC',
    background: '#121212',
    surface: '#1E1E1E',
    accent: '#D23030',
    
    // Text colors
    text: '#FFFFFF',
    textSecondary: '#A4AAB8',
    textMuted: '#6B7280',
    textInverse: '#000000',
    
    // @deprecated - Use textSecondary instead
    textLight: '#A4AAB8',
    
    // Status colors (base)
    success: '#2ACF01',
    error: '#FF2400',
    warning: '#FFB600',
    info: '#0075FF',
    neutral: '#6B7280',
    
    // Status colors (specific states) - same as light theme
    statusNewOrder: '#6E0000',
    statusDiscontinued: '#6E0000',
    statusOngoing: '#0075FF',
    statusDone: '#2ACF01',
    statusPaid: '#2ACF01',
    statusImport: '#2ACF01',
    statusInReview: '#A76AF0',
    statusPending: '#FFB600',
    statusInProduction: '#FFB600',
    statusLowStock: '#FF7A00',
    statusExport: '#FF7A00',
    statusCanceled: '#FF6B6B',
    statusUnpaid: '#FF2400',
    statusOutOfStock: '#FF2400',
    statusInactive: '#7BA9C1',
    
    // @deprecated - Status color aliases for backward compatibility (will be removed)
    errorBright: '#FF2400',
    warningBright: '#FFB600',
    warningOrange: '#FFB600',
    infoBright: '#0075FF',
    
    // UI colors
    cardBackground: '#1E1E1E',
    borderColor: '#2D2D2D',
    iconColor: '#C4C7CC',
    iconMuted: '#6B7280',
    buttonBackground: '#2D2D2D',
    buttonBackgroundDisabled: '#2D2D2D',
    
    // Input colors
    inputBackground: '#2D2D2D',
    inputBackgroundFocused: '#3F3F46',
    inputBorder: '#3F3F46',
    inputBorderFocused: '#FFFFFF',
    inputPlaceholder: '#6B7280',
    caretColor: '#FFFFFF',
    
    // Text field specific colors
    textFieldBorderDefault: '#3F3F46',
    textFieldBorderSelected: '#FFFFFF',
    textFieldLabelDefault: '#A4AAB8',
    textFieldLabelSelected: '#FFFFFF',
    textFieldPlaceholder: '#6B7280',
    textFieldText: '#FFFFFF',
    
    // Switch colors (from design.json)
    switchTrackOff: '#3F3F46',
    switchTrackOn: '#2ACF01',
    switchThumb: '#FFFFFF',
    
    // Highlight/special states
    highlightedRow: '#27272A',
    selectedBackground: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.7)',
    
    // Confirmation dialog backgrounds
    confirmDialogDarkRed: 'rgba(22, 0, 0, 0.9)',   // #160000 at 90%
    confirmDialogDarkGreen: 'rgba(0, 16, 4, 0.9)', // #001004 at 90%
    confirmDialogDarkGreenSolid: '#001004',        // Solid dark green for text
    
    // Special purpose colors
    imagePlaceholder: '#27272A',
    badgeBackground: '#D23030',
    linkColor: '#0075FF',
    
    // Divider
    divider: '#2D2D2D',
  },
  
  // Avatar colors (same for both themes)
  avatarColors: lightTheme.avatarColors,
};

export type Theme = typeof lightTheme;
export const theme = lightTheme; // For backward compatibility
export default theme;
