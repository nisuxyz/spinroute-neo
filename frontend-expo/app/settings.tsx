import React from 'react';
import { StyleSheet, useColorScheme, ScrollView, View } from 'react-native';
import { Colors } from '@/constants/theme';
import UserProfileSection from '@/components/UserProfileSection';
import AppSettingsSection from '@/components/AppSettingsSection';
import DevSettingsSection from '@/components/DevSettingsSection';
import AccountSection from '@/components/AccountSection';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.section}>
        <UserProfileSection />
      </View>
      <View style={styles.section}>
        <AppSettingsSection />
      </View>
      {isDevelopment && (
        <View style={styles.section}>
          <DevSettingsSection />
        </View>
      )}
      <View style={styles.section}>
        <AccountSection />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  section: {},
});
