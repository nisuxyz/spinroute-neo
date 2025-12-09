import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import UserProfileSection from '@/components/UserProfileSection';
import SubscriptionSection from '@/components/SubscriptionSection';
import AppSettingsSection from '@/components/AppSettingsSection';
import RoutingSettingsSection from '@/components/RoutingSettingsSection';
import DevSettingsSection from '@/components/DevSettingsSection';
import AccountSection from '@/components/AccountSection';

export default function SettingsScreen() {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <ScrollView className="flex-1 bg-background/20" contentContainerStyle={styles.contentContainer}>
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
  contentContainer: {
    padding: 16,
    gap: 20,
  },
});
