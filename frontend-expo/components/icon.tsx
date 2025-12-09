import * as React from 'react';
import { useColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { THEME } from '@/lib/theme';

type ThemeColorKey = keyof typeof THEME.light;

type MaterialIconsProps = ComponentProps<typeof MaterialIcons>;

export interface IconProps extends Omit<MaterialIconsProps, 'color'> {
  /**
   * The color of the icon. Can be:
   * - A theme color key (e.g., 'foreground', 'mutedForeground', 'primary')
   * - A raw color string (e.g., '#fff', 'red', 'hsl(...)')
   * - undefined (defaults to 'foreground')
   */
  color?: ThemeColorKey | (string & {});
}

/**
 * A themed wrapper around MaterialIcons that automatically handles
 * light/dark mode color switching.
 *
 * @example
 * // Use a theme color (automatically switches with color scheme)
 * <Icon name="settings" size={24} color="mutedForeground" />
 *
 * @example
 * // Use default foreground color
 * <Icon name="home" size={24} />
 *
 * @example
 * // Use a raw color value (bypasses theming)
 * <Icon name="warning" size={20} color="#f59e0b" />
 */
export function Icon({ color = 'foreground', ...props }: IconProps) {
  const colorScheme = useColorScheme() ?? 'light';

  // Check if color is a theme key
  const resolvedColor = isThemeColorKey(color) ? THEME[colorScheme][color] : color;

  return <MaterialIcons color={resolvedColor} {...props} />;
}

/**
 * Type guard to check if a string is a valid theme color key
 */
function isThemeColorKey(color: string): color is ThemeColorKey {
  return color in THEME.light;
}

// Re-export the icon name type for convenience
export type IconName = MaterialIconsProps['name'];
