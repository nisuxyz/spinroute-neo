import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import TripDetail from '@/components/TripDetail';
import { useTripDetail } from '@/hooks/use-trip-detail';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip } = useTripDetail(id as string);

  if (!id) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const title = trip?.title || (trip ? `Trip on ${formatDate(trip.started_at)}` : 'Trip Details');

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerBackTitle: 'Trips',
        }}
      />
      <View style={styles.container}>
        <TripDetail tripId={id} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    zIndex: 9999,
    elevation: 9999, // For Android
  },
});
