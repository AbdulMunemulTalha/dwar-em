// Design System - Based on Paper Ledger (Khata) Concept

export const colors = {
  // Base Colors
  paper: '#F7F8F4',        // App background - clean paper white
  ink: '#1B211F',          // Primary text - soft black
  
  // Brand & Primary
  ledgerTeal: '#0E5C4C',   // Primary accent - buttons, active states, links
  
  // Status Colors (used as left-edge bars on ledger rows)
  paidGreen: '#2E9C6B',    // Status: paid / listing available
  dueAmber: '#D98A2B',     // Status: due soon
  overdueRed: '#BE4438',   // Status: overdue
  
  // Neutral Shades
  gray100: '#F5F5F5',
  gray200: '#E5E5E5',
  gray300: '#D4D4D4',
  gray400: '#A3A3A3',
  gray500: '#737373',
  gray600: '#525252',
  gray700: '#404040',
  gray800: '#262626',
  
  // Semantic Colors
  white: '#FFFFFF',
  black: '#000000',
  success: '#2E9C6B',
  warning: '#D98A2B',
  error: '#BE4438',
  info: '#0E5C4C',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const borderRadius = {
  card: 10,
  button: 8,
  input: 8,
  small: 4,
};

export const typography = {
  // Font Families
  primary: 'System',  // Will use Inter when loaded
  
  // Font Sizes
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  
  // Font Weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadows = {
  small: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
};

export default theme;