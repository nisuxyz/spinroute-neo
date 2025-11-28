import React from 'react';
import { StyleSheet, useColorScheme, ScrollView } from 'react-native';
import { Colors } from '@/constants/theme';
import UserProfileSection from '@/components/UserProfileSection';
import AppSettingsSection from '@/components/AppSettingsSection';
import DevSettingsSection from '@/components/DevSettingsSection';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <UserProfileSection />
      <AppSettingsSection />
      {isDevelopment && <DevSettingsSection />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
