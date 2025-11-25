import React from 'react';
import { View, StyleSheet, useColorScheme, ScrollView } from 'react-native';
import { Colors } from '@/constants/theme';
import UserProfileSection from '@/components/UserProfileSection';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <UserProfileSection />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
