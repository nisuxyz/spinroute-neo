import React from 'react';
import { View, TouchableOpacity, FlatList } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTrips, type TripWithStats } from '@/hooks/use-trips';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/icon';

export default function TripsScreen() {
  const router = useRouter();

  const { trips, loading, error, hasMore, loadMore, refresh } = useTrips({
    pageSize: 20,
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (km?: number | null) => {
    if (!km) return '--';
    return `${km.toFixed(2)} km`;
  };

  const formatSpeed = (kmh?: number | null) => {
    if (!kmh) return '--';
    return `${kmh.toFixed(1)} km/h`;
  };

  const handleTripPress = (trip: TripWithStats) => {
    router.push(`/trip/${trip.id}`);
  };

  const renderTripItem = ({ item }: { item: TripWithStats }) => {
    const stats = item.trip_basic_stats;

    return (
      <TouchableOpacity onPress={() => handleTripPress(item)} activeOpacity={0.7}>
        <Card>
          <CardContent>
            {/* Header */}
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center flex-1 gap-2">
                <Icon name="directions-bike" size={20} color="primary" />
                <Text className="text-lg font-semibold flex-1" numberOfLines={1}>
                  {item.title || `Trip on ${formatDate(item.started_at)}`}
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color="mutedForeground" />
            </View>

            {/* Meta */}
            <View className="mb-3">
              <View className="flex-row items-center gap-1.5">
                <Icon name="event" size={16} color="mutedForeground" />
                <Text variant="small" className="text-muted-foreground">
                  {formatDate(item.started_at)} at {formatTime(item.started_at)}
                </Text>
              </View>
            </View>

            {/* Stats */}
            <View className="flex-row justify-between pt-3 border-t border-border">
              <View className="flex-row items-center gap-1.5 flex-1">
                <Icon name="straighten" size={18} color="primary" />
                <View className="flex-1">
                  <Text className="font-semibold">{formatDistance(stats?.distance_km)}</Text>
                  <Text variant="small" className="text-muted-foreground">
                    Distance
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-1.5 flex-1">
                <Icon name="schedule" size={18} color="primary" />
                <View className="flex-1">
                  <Text className="font-semibold">
                    {formatDuration(stats?.moving_duration_seconds)}
                  </Text>
                  <Text variant="small" className="text-muted-foreground">
                    Duration
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-1.5 flex-1">
                <Icon name="speed" size={18} color="primary" />
                <View className="flex-1">
                  <Text className="font-semibold">{formatSpeed(stats?.avg_speed_kmh)}</Text>
                  <Text variant="small" className="text-muted-foreground">
                    Avg Speed
                  </Text>
                </View>
              </View>
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading && trips.length === 0) {
      return null;
    }

    return (
      <View className="flex-1 justify-center items-center py-16">
        <Icon name="directions-bike" size={64} color="mutedForeground" />
        <Text className="text-xl font-semibold mt-4 mb-2">No trips yet</Text>
        <Text className="text-muted-foreground text-center">
          Start recording your rides to see them here
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;

    return (
      <View className="py-5 items-center">
        <Card className="w-full">
          <CardContent className="p-4">
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center flex-1 gap-2">
                <Skeleton className="w-5 h-5 rounded-full" />
                <Skeleton className="h-5 w-3/4 rounded" />
              </View>
              <Skeleton className="w-6 h-6 rounded" />
            </View>
            <View className="mb-3">
              <View className="flex-row items-center gap-1.5">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
              </View>
            </View>
            <View className="flex-row justify-between pt-3 border-t border-border">
              {[1, 2, 3].map((i) => (
                <View key={i} className="flex-row items-center gap-1.5 flex-1">
                  <Skeleton className="w-5 h-5 rounded" />
                  <View className="flex-1 gap-1">
                    <Skeleton className="h-4 w-12 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </View>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      </View>
    );
  };

  const renderSkeletonList = () => (
    <View className="p-4 gap-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardContent className="">
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center flex-1 gap-2">
                <Skeleton className="w-5 h-5 rounded-full" />
                <Skeleton className="h-5 w-3/4 rounded" />
              </View>
              <Skeleton className="w-6 h-6 rounded" />
            </View>
            <View className="mb-3">
              <View className="flex-row items-center gap-1.5">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
              </View>
            </View>
            <View className="flex-row justify-between pt-3 border-t border-border">
              {[1, 2, 3].map((j) => (
                <View key={j} className="flex-row items-center gap-1.5 flex-1">
                  <Skeleton className="w-5 h-5 rounded" />
                  <View className="flex-1 gap-1">
                    <Skeleton className="h-4 w-12 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </View>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      ))}
    </View>
  );

  if (error) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Recorded Trips',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <View className="flex-1 bg-background">
          <View className="flex-1 justify-center items-center p-8">
            <Icon name="error-outline" size={48} color="destructive" />
            <Text className="text-center mt-4 mb-6">{error}</Text>
            <Button onPress={refresh}>
              <Text className="text-primary-foreground font-semibold">Retry</Text>
            </Button>
          </View>
        </View>
      </>
    );
  }

  // Show skeleton loaders for initial load
  if (loading && trips.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Recorded Trips',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <View className="flex-1 bg-background">{renderSkeletonList()}</View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Recorded Trips',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <View className="flex-1">
        <FlatList
          data={trips}
          renderItem={renderTripItem}
          keyExtractor={(item: TripWithStats) => item.id}
          contentContainerClassName="p-4 pb-8 gap-4"
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={() => {
            if (hasMore && !loading) {
              loadMore();
            }
          }}
          onEndReachedThreshold={0.5}
          refreshing={false}
          onRefresh={refresh}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </>
  );
}
