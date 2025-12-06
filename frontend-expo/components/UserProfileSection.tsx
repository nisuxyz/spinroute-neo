import React from 'react';
import { View, Text, StyleSheet, useColorScheme, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import SettingsCard from './SettingsCard';
import SettingsRow from './SettingsRow';

export default function UserProfileSection() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <SettingsCard title="Profile" icon="person">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.tint} />
        </View>
      </SettingsCard>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SettingsCard title="Profile" icon="person">
      <SettingsRow label="Email" description={user.email} />
      <SettingsRow
        label="User ID"
        description={
          <Text style={[styles.valueSmall, { color: colors.icon }]} numberOfLines={1}>
            {user.id}
          </Text>
        }
        showBorder
      />
      {user.user_metadata?.full_name && (
        <SettingsRow label="Name" description={user.user_metadata.full_name} showBorder />
      )}
    </SettingsCard>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  valueSmall: {
    fontSize: 12,
  },
});
