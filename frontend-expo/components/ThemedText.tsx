import { StyleSheet, Text, useColorScheme, type TextProps } from 'react-native';

// import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors, Typography } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  variant?: keyof typeof Typography;
  state?:
    | 'normal'
    | 'disabled'
    | 'error'
    | 'success'
    | 'warning'
    | 'info'
    | 'primary'
    | 'secondary'
    | 'accent';
};

export function ThemedText({
  style,
  variant = 'bodyMedium',
  state = 'normal',
  ...rest
}: ThemedTextProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const color = state === 'normal' ? colors.text : colors[state];

  return <Text style={[{ color }, Typography[variant], style]} {...rest} />;
}

// const styles = StyleSheet.create({
//   default: {
//     fontSize: 16,
//     lineHeight: 24,
//   },
//   defaultSemiBold: {
//     fontSize: 16,
//     lineHeight: 24,
//     fontWeight: '600',
//   },
//   title: {
//     fontSize: 32,
//     fontWeight: 'bold',
//     lineHeight: 32,
//   },
//   subtitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//   },
//   link: {
//     lineHeight: 30,
//     fontSize: 16,
//     color: '#0a7ea4',
//   },
// });
