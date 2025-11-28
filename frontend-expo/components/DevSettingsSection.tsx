import React from 'react';
import { View, Text, StyleSheet, useColorScheme, Switch } from 'react-native';
import { Colors } from '@/constants/theme';
import { useUserSettings } from '@/hooks/use-user-settings';
import { lightenColor } from '@/utils/lighten-color';

export default function DevSettingsSection() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { settings, updateDevSettings } = useUserSettings();

  const handleToggleDevServices = (value: boolean) => {
    updateDevSettings({ useDevUrls: value });
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Developer Settings</Text>

      <View style={[styles.settingRow, { backgroundColor: colors.buttonBackground }]}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Use Dev Services</Text>
          <Text style={[styles.settingDescription, { color: colors.text + 'CC' }]}>
            Connect to local development services instead of production
          </Text>
        </View>
        <View style={styles.valueContainer}>
          <Switch
            value={settings?.useDevUrls ?? false}
            onValueChange={handleToggleDevServices}
            trackColor={{
              false: colors.text + '40',
              true: lightenColor(colors.buttonBackground, 100),
            }}
            thumbColor={colors.buttonBackground}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {},
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  settingInfo: {
    flex: 1,
    gap: 4,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
