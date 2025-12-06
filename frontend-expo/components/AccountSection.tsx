import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Alert } from 'react-native';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import SettingsCard from './SettingsCard';

export default function AccountSection() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  return (
    <SettingsCard title="Account" icon="manage-accounts">
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </SettingsCard>
  );
}

const styles = StyleSheet.create({
  signOutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
