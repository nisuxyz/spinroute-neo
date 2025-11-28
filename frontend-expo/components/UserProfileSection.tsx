import React from 'react';
import { View, Text, StyleSheet, useColorScheme, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';

export default function UserProfileSection() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile</Text>
        <View style={[styles.card, { backgroundColor: colors.buttonBackground }]}>
          <View style={styles.userInfo}>
            <Text style={[styles.label, { color: colors.icon }]}>Email</Text>
            <Text style={[styles.value, { color: colors.text }]}>{user.email}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.label, { color: colors.icon }]}>User ID</Text>
            <Text style={[styles.valueSmall, { color: colors.icon }]} numberOfLines={1}>
              {user.id}
            </Text>
          </View>
          {user.user_metadata?.full_name && (
            <View style={styles.userInfo}>
              <Text style={[styles.label, { color: colors.icon }]}>Name</Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {user.user_metadata.full_name}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  section: {},
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
  },
  valueSmall: {
    fontSize: 12,
  },
});
