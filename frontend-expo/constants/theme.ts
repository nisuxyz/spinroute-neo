/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const tintColorLight = '#0a7ea4';
export const tintColorDark = '#fff';
export const electricPurple = '#8B5CF6';
export const darkGray = '#2A2A2A';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    // Station colors
    stationAvailable: '#22c55e', // Green - bikes available
    stationEmpty: '#6b7280', // Gray - no bikes
    stationElectric: '#eab308', // Yellow - electric bikes indicator
    stationNoDocks: '#ef4444', // Red - no docks available
    stationBorder: '#ffffff', // White border
    stationText: '#ffffff', // White text on markers
    stationTextShadow: '#000000', // Black text shadow
    // Button colors
    buttonBackground: '#ffffff',
    buttonBorder: electricPurple, // Electric purple
    buttonIcon: electricPurple,
    buttonIconInactive: '#9A9A9A',
    // Callout colors
    calloutBackground: '#ffffff',
    calloutText: '#000000',
    calloutTextSecondary: '#333333',
    // Map colors
    locationPuck: '#14b8a6', // Teal
    // Shadow
    shadow: '#000000',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    // Station colors
    stationAvailable: '#22c55e', // Green - bikes available
    stationEmpty: '#6b7280', // Gray - no bikes
    stationElectric: '#eab308', // Yellow - electric bikes indicator
    stationNoDocks: '#ef4444', // Red - no docks available
    stationBorder: '#ffffff', // White border
    stationText: '#ffffff', // White text on markers
    stationTextShadow: '#000000', // Black text shadow
    // Button colors
    buttonBackground: darkGray, // Dark grey
    buttonBorder: electricPurple, // Electric purple
    buttonIcon: electricPurple,
    buttonIconInactive: '#9A9A9A',
    // Callout colors
    calloutBackground: '#1f1f1f',
    calloutText: '#ffffff',
    calloutTextSecondary: '#cccccc',
    // Map colors
    locationPuck: '#14b8a6', // Teal
    // Shadow
    shadow: '#000000',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/**
 * Common spacing values used throughout the app
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/**
 * Common border radius values
 */
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 9999, // For fully rounded elements
} as const;

/**
 * Common typography styles
 */
export const Typography = {
  // Display text (large headings)
  displayLarge: {
    fontSize: 28,
    fontWeight: '800' as const,
    lineHeight: 34,
  },
  displayMedium: {
    fontSize: 24,
    fontWeight: '800' as const,
    lineHeight: 30,
  },
  // Headings
  h1: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
  },
  h2: {
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
  h3: {
    fontSize: 16,
    fontWeight: '700' as const,
    lineHeight: 22,
  },
  // Body text
  bodyLarge: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  // Labels
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  // Caption
  caption: {
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 14,
  },
} as const;

/**
 * Common shadow styles
 */
export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
} as const;

/**
 * Common card styles
 */
export const CardStyles = {
  // Collapsed card (bottom sheet style)
  collapsed: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.medium,
  },
  // Expanded card (full screen modal style)
  expanded: {
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    ...Shadows.large,
  },
  // Settings card style
  settings: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Shadows.small,
  },
  // Detail row inside expanded cards
  detailRow: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
} as const;

/**
 * Common button styles
 */
export const ButtonStyles = {
  primary: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  secondary: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
  },
} as const;
