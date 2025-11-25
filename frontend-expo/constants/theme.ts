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
