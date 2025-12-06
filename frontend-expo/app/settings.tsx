import React from 'react';
import { StyleSheet, useColorScheme, ScrollView, View } from 'react-native';
import { Colors } from '@/constants/theme';
import UserProfileSection from '@/components/UserProfileSection';
import SubscriptionSection from '@/components/SubscriptionSection';
import AppSettingsSection from '@/components/AppSettingsSection';
import RoutingSettingsSection from '@/components/RoutingSettingsSection';
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
      <UserProfileSection />
      <SubscriptionSection />
      <AppSettingsSection />
      <RoutingSettingsSection />
      {isDevelopment && <DevSettingsSection />}
      <AccountSection />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 20,
  },
});
