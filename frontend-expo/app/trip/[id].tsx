import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import TripDetail from '@/components/TripDetail';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  if (!id) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TripDetail tripId={id} onBack={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
