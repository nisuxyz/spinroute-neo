import React from 'react';
import { View, Text, StyleSheet, useColorScheme, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { lightenColor } from '@/utils/lighten-color';

interface SettingsCardProps {
  title?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function SettingsCard({ title, icon, children, style }: SettingsCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View
      style={[styles.container, { backgroundColor: lightenColor(colors.background, 40) }, style]}
    >
      {(title || icon) && (
        <View style={[styles.header, { borderBottomColor: colors.background }]}>
          {icon && <MaterialIcons name={icon} size={22} color={colors.icon} />}
          {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
        </View>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
});
