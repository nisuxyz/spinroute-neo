import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  ViewStyle,
  Switch,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { lightenColor } from '@/utils/lighten-color';

interface SettingsRowProps {
  label: string;
  description?: string | React.ReactNode;
  value?: string | React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  showBorder?: boolean;
  style?: ViewStyle;
  // Switch props
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
}

export default function SettingsRow({
  label,
  description,
  value,
  onPress,
  showChevron = false,
  showBorder = false,
  style,
  switchValue,
  onSwitchChange,
}: SettingsRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const content = (
    <View
      style={[
        styles.container,
        showBorder && styles.bordered,
        showBorder && { borderTopColor: colors.background },
        style,
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {description &&
          (typeof description === 'string' ? (
            <Text style={[styles.description, { color: colors.icon }]}>{description}</Text>
          ) : (
            description
          ))}
      </View>
      {(switchValue !== undefined || value || showChevron) && (
        <View style={styles.valueContainer}>
          {switchValue !== undefined && onSwitchChange ? (
            <Switch
              value={switchValue}
              onValueChange={onSwitchChange}
              trackColor={{
                false: colors.icon + '40',
                true: lightenColor(colors.buttonBackground, 100),
              }}
              thumbColor="#fff"
            />
          ) : (
            <>
              {typeof value === 'string' ? (
                <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
              ) : (
                value
              )}
              {showChevron && <Text style={[styles.chevron, { color: colors.icon }]}>›</Text>}
            </>
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 16,
  },
  bordered: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 12,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '400',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  value: {
    fontSize: 15,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
  },
});
