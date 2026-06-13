import { fonts, fontWeights, fontSize, lineHeight, typography } from './typography';

// Light theme (default)
export const lightTheme = {
  fonts,
  fontWeights,
  fontSize,
  lineHeight,
  typography,
  colors: {
    // Primary colors (warm bespoke palette — warm near-black + orange accent)
    primary: '#1C1917',
    secondary: '#57534E',
    background: '#FFFFFF',
    surface: '#FAF8F5',
    accent: '#FF7A00',

    // Text colors
    text: '#1C1917',
    textSecondary: '#57534E',
    textMuted: '#A8A29E',
    textInverse: '#FFFFFF',

    // @deprecated - Use textSecondary instead
    textLight: '#57534E',

    // Status colors (base) - harmonized with warm palette
    success: '#34A853',
    error: '#D6453E',
    warning: '#F2A900',
    info: '#2A75E6',
    neutral: '#A8A29E',

    // Status colors (specific states)
    statusNewOrder: '#7A1F12',       // New order / Discontinued
    statusDiscontinued: '#7A1F12',   // Discontinued (alias)
    statusDiscontinuedBg: '#2A0E07', // Discontinued background (dark warm brown-red)
    statusOngoing: '#2A75E6',        // Ongoing
    statusDone: '#34A853',           // Done / Paid / Import
    statusPaid: '#34A853',           // Paid (alias)
    statusPaidText: '#10391F',       // Paid text (dark green)
    statusImport: '#34A853',         // Import (alias)
    statusInReview: '#8B5CF6',       // In review
    statusPending: '#F2A900',        // Pending / In Production
    statusInProduction: '#F2A900',   // In Production (alias)
    statusLowStock: '#E8590C',       // Low Stock / Export (deeper burnt orange, distinct from accent)
    statusLowStockText: '#FFE4C4',   // Low Stock text
    statusExport: '#E8590C',         // Export (alias)
    statusCanceled: '#F0705F',       // Canceled
    statusUnpaid: '#D6453E',         // Unpaid / Out of Stock
    statusOutOfStock: '#D6453E',     // Out of Stock (alias)
    statusInactive: '#A89B92',       // Inactive

    // @deprecated - Status color aliases for backward compatibility (will be removed)
    // Use success, error, warning, info instead
    errorBright: '#D6453E',
    warningBright: '#F2A900',
    warningOrange: '#F2A900',
    infoBright: '#2A75E6',

    // UI colors
    cardBackground: '#FFFFFF',
    borderColor: '#ECE6DF',
    iconColor: '#44403C',
    iconMuted: '#A8A29E',
    buttonBackground: '#F4F0EB',
    buttonBackgroundDisabled: '#F4F0EB',

    // Input colors
    inputBackground: '#FFFFFF',
    inputBackgroundFocused: '#FAF8F5',
    inputBorder: '#ECE6DF',
    inputBorderFocused: '#1C1917',
    inputPlaceholder: '#A8A29E',
    caretColor: '#1C1917',

    // Text field specific colors (consolidated)
    textFieldBorderDefault: 'textMuted',
    textFieldBorderSelected: 'primary',
    textFieldLabelDefault: 'textSecondary',
    textFieldPlaceholderDefault: 'textMuted',
    textFieldPlaceholderSelected: 'borderColor',
    textFieldText: 'primary',

    // Switch colors (from design.json)
    switchTrackOff: '#E7E1DA',
    switchTrackOn: '#34A853',
    switchThumb: '#FFFFFF',

    // Highlight/special states
    highlightedRow: '#FAF8F5',
    selectedBackground: '#1C1917',
    overlay: 'rgba(28, 25, 23, 0.5)',

    // Confirmation dialog backgrounds
    confirmDialogDarkRed: 'rgba(42, 14, 7, 0.9)',   // #2A0E07 at 90%
    confirmDialogDarkGreen: 'rgba(16, 57, 31, 0.9)', // #10391F at 90%
    confirmDialogDarkGreenSolid: '#10391F',          // Solid dark green for text

    // Special purpose colors
    imagePlaceholder: '#FAF8F5',
    badgeBackground: '#FF7A00',
    linkColor: '#2A75E6',

    // Divider
    divider: '#ECE6DF',
  },
  
  // Avatar colors for random assignment (muted, warm-leaning set)
  avatarColors: [
    '#F0705F', // Coral
    '#E8825A', // Terracotta
    '#E8A33D', // Amber
    '#C9A227', // Gold
    '#8DA34B', // Olive
    '#5FA88C', // Sage Teal
    '#4E9BB5', // Blue
    '#5B7FD6', // Indigo
    '#8B6FD6', // Violet
    '#B06BB5', // Orchid
    '#C77BA0', // Rose
    '#A8826B', // Clay
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
  // Text field specifications
  // Label is positioned ABOVE the field, not floating inside
  textField: {
    // Field dimensions
    height: 52,
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    
    // Color tokens (reference names from colors object)
    // These indicate which color to use from appTheme.colors
    colorTokens: {
      borderDefault: 'borderColor',
      borderActive: 'primary',
      labelColor: 'textSecondary',
      inputColor: 'primary',  // Text being typed uses primary color
      placeholderColor: 'borderColor',
      caretColor: 'primary',
      iconDefault: 'textSecondary',
      iconActive: 'primary',
    },
    
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
      marginVertical: 4,
    },
    
    // Icon configuration
    icon: {
      size: 20,
      containerWidth: 48,
      strokeWidthDefault: 2,
      strokeWidthActive: 2.5,
    },
    
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
    // Primary colors (warm dark palette)
    primary: '#FAFAF9',
    secondary: '#D6D3D1',
    background: '#1A1714',
    surface: '#232020',
    accent: '#FF7A00',

    // Text colors
    text: '#FAFAF9',
    textSecondary: '#A8A29E',
    textMuted: '#78716C',
    textInverse: '#1A1714',

    // @deprecated - Use textSecondary instead
    textLight: '#A8A29E',

    // Status colors (base) - harmonized with warm palette
    success: '#34A853',
    error: '#D6453E',
    warning: '#F2A900',
    info: '#2A75E6',
    neutral: '#78716C',

    // Status colors (specific states) - same as light theme
    statusNewOrder: '#7A1F12',
    statusDiscontinued: '#7A1F12',
    statusDiscontinuedBg: '#2A0E07',
    statusOngoing: '#2A75E6',
    statusDone: '#34A853',
    statusPaid: '#34A853',
    statusPaidText: '#10391F',
    statusImport: '#34A853',
    statusInReview: '#8B5CF6',
    statusPending: '#F2A900',
    statusInProduction: '#F2A900',
    statusLowStock: '#E8590C',
    statusLowStockText: '#FFE4C4',
    statusExport: '#E8590C',
    statusCanceled: '#F0705F',
    statusUnpaid: '#D6453E',
    statusOutOfStock: '#D6453E',
    statusInactive: '#A89B92',

    // @deprecated - Status color aliases for backward compatibility (will be removed)
    errorBright: '#D6453E',
    warningBright: '#F2A900',
    warningOrange: '#F2A900',
    infoBright: '#2A75E6',

    // UI colors
    cardBackground: '#232020',
    borderColor: '#332E2A',
    iconColor: '#D6D3D1',
    iconMuted: '#78716C',
    buttonBackground: '#332E2A',
    buttonBackgroundDisabled: '#332E2A',

    // Input colors
    inputBackground: '#332E2A',
    inputBackgroundFocused: '#44403C',
    inputBorder: '#44403C',
    inputBorderFocused: '#FAFAF9',
    inputPlaceholder: '#78716C',
    caretColor: '#FAFAF9',

    // Text field specific colors
    textFieldBorderDefault: '#44403C',
    textFieldBorderSelected: '#FAFAF9',
    textFieldLabelDefault: '#A8A29E',
    textFieldLabelSelected: '#FAFAF9',
    textFieldPlaceholder: '#78716C',
    textFieldText: '#FAFAF9',

    // Switch colors (from design.json)
    switchTrackOff: '#44403C',
    switchTrackOn: '#34A853',
    switchThumb: '#FFFFFF',

    // Highlight/special states
    highlightedRow: '#2A2622',
    selectedBackground: '#FAFAF9',
    overlay: 'rgba(0, 0, 0, 0.7)',

    // Confirmation dialog backgrounds
    confirmDialogDarkRed: 'rgba(42, 14, 7, 0.9)',   // #2A0E07 at 90%
    confirmDialogDarkGreen: 'rgba(16, 57, 31, 0.9)', // #10391F at 90%
    confirmDialogDarkGreenSolid: '#10391F',          // Solid dark green for text

    // Special purpose colors
    imagePlaceholder: '#2A2622',
    badgeBackground: '#FF7A00',
    linkColor: '#2A75E6',

    // Divider
    divider: '#332E2A',
  },
  
  // Avatar colors (same for both themes)
  avatarColors: lightTheme.avatarColors,
};

export type Theme = typeof lightTheme;
export const theme = lightTheme; // For backward compatibility
export default theme;
