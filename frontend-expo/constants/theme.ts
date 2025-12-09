/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { darkenColor, lightenColor } from '@/utils/lighten-color';
import { Platform } from 'react-native';

export const tintColorLight = '#248a3d';
export const tintColorDark = '#fff';
export const electricPurple = '#8B5CF6';
export const systemGreen = '#248a3d';
export const darkGray = '#2A2A2A';
export const lightGray = '#8b8b8b';

export const Colors = {
  light: {
    // Named colors
    primary: systemGreen,
    primaryVariant: '#1e6f31',
    secondary: '#ff9800',
    secondaryVariant: '#c66900',
    accent: electricPurple,
    error: '#B00020',
    warning: '#FFAB00',
    info: '#2196F3',
    success: '#4CAF50',
    // General colors
    text: '#11181C',
    textInverse: '#ECEDEE',
    disabled: lightGray,
    background: '#cccccc',
    background20: darkenColor('#cccccc', 20),
    background40: darkenColor('#cccccc', 40),
    background60: darkenColor('#cccccc', 60),
    background80: darkenColor('#cccccc', 80),
    background100: darkenColor('#cccccc', 100),
    icon: lightGray,
    stationAvailable: '#22c55e', // Green - bikes available
    stationEmpty: '#6b7280', // Gray - no bikes
    stationElectric: '#eab308', // Yellow - electric bikes indicator
    stationNoDocks: '#ef4444', // Red - no docks available
    stationBorder: '#ffffff', // White border
    stationText: '#ffffff', // White text on markers
    stationTextShadow: '#000000', // Black text shadow
    // Button colors
    buttonBackground: darkGray,
    buttonBorder: systemGreen, // System green
    buttonIcon: systemGreen,
    buttonIconInactive: lightenColor(lightGray, 20),
    // Map colors
    locationPuck: '#14b8a6', // Teal
    // Shadow
    shadow: '#000000',
  },
  dark: {
    // Named colors
    primary: electricPurple,
    primaryVariant: '#7c3aed',
    secondary: '#ff9800',
    secondaryVariant: '#c66900',
    accent: systemGreen,
    error: '#CF6679',
    warning: '#FFAB00',
    info: '#2196F3',
    success: '#4CAF50',
    // General colors
    text: '#ECEDEE',
    textInverse: '#11181C',
    disabled: lightGray,
    background: '#151718',
    background20: lightenColor('#151718', 20),
    background40: lightenColor('#151718', 40),
    background60: lightenColor('#151718', 60),
    background80: lightenColor('#151718', 80),
    background100: lightenColor('#151718', 100),
    icon: lightGray,
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
    buttonIconInactive: lightenColor(lightGray, 20),
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
  xxxl: 32,
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
 * Common glow styles
 */
export const Glows = {
  iconGlow(color: string, size: 'sm' | 'md' | 'lg' = 'md') {
    return {
      shadowColor: color, // electricPurple
      shadowOffset: {
        width: size === 'sm' ? 1 : size === 'md' ? 2 : 3,
        height: size === 'sm' ? 1 : size === 'md' ? 2 : 3,
      },
      shadowOpacity: 1,
      shadowRadius: size === 'sm' ? 4 : size === 'md' ? 6 : 8,
      elevation: size === 'sm' ? 1 : size === 'md' ? 2 : 3,
    };
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
 * Common sheet styles
 */
export const SheetStyles = {
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopLeftRadius: Spacing.xl,
    borderTopRightRadius: Spacing.xl,
    padding: Spacing.xl,
  },
  title: Typography.h2,
  // {
  //     fontSize: 18,
  //     fontWeight: '600',
  // },
  cancel: Typography.h3,
  // {
  //   fontSize: 16,
  // },
  content: {
    borderTopLeftRadius: Spacing.xl,
    borderTopRightRadius: Spacing.xl,
    padding: Spacing.xl,
  },
  // Sheet container
  container: {
    padding: Spacing.xxl,
    paddingBottom: Spacing.xxxl,
  },
  // Sheet title
  // title: {
  //   ...Typography.h1,
  //   marginBottom: Spacing.sm,
  //   textAlign: 'center' as const,
  // },
  // Sheet subtitle
  subtitle: {
    ...Typography.bodyMedium,
    textAlign: 'center' as const,
    marginBottom: Spacing.xxl,
    lineHeight: 20,
  },
  // Section container
  section: {
    marginBottom: Spacing.xxl,
  },
  // Section label
  sectionLabel: {
    ...Typography.label,
    marginBottom: Spacing.md,
  },
  // Button container (vertical stack)
  buttonContainer: {
    flexDirection: 'column' as const,
    gap: Spacing.md,
  },
  // Button container (horizontal row)
  buttonRow: {
    flexDirection: 'row' as const,
    gap: Spacing.md,
  },
} as const;

/**
 * Common input styles
 */
export const InputStyles = {
  container: {
    borderWidth: 1,
    borderRadius: BorderRadius.round,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.md,
  },
  inputText: {
    flex: 1,
    ...Typography.bodyMedium,
    fontSize: 16,
  },
} as const;

/**
 * Common button styles
 */
export const ButtonStyles = {
  primary: {
    display: 'flex',
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.round,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  secondary: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.round,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
  },
  primaryVariant(
    variant: 'solid' | 'outline' | 'ghost' = 'solid',
    colors: (typeof Colors)['light'] | (typeof Colors)['dark'],
  ) {
    return {
      ...this.primary,
      borderWidth: variant === 'outline' ? 1 : 0,
      borderColor: variant === 'ghost' ? 'none' : colors.primary,
      backgroundColor: variant === 'solid' ? colors.primary : 'none',
    };
  },
} as const;

/**
 * Common list styles
 */
export const ListStyles = {
  contentContainer: {
    paddingHorizontal: Spacing.xxl,
    marginTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  // List container
  container: {
    flex: 1,
  },
  // List content (for ScrollView contentContainerStyle)
  content: {
    paddingBottom: Spacing.xxxl,
  },
  // Standard list item (e.g., settings, selections)
  item(colors: (typeof Colors)['light'] | (typeof Colors)['dark'], isSelected: boolean = false) {
    return {
      display: 'flex' as const,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: Spacing.lg,
      padding: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      backgroundColor: colors.background20,
      borderRadius: BorderRadius.sm,
      borderWidth: 1,
      borderColor: isSelected ? colors.primary : colors.background40,
      minHeight: 64,
      ...Shadows.small,
    };
  },
  // List item with icon on the left
  itemWithIcon: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  // Icon container for list items
  iconContainer: {
    width: 40,
    alignItems: 'center' as const,
  },
  // Text container (takes remaining space)
  textContainer: {
    flex: 1,
  },
} as const;
