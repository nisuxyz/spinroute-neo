import React, { useRef } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useTripDetail } from '@/hooks/use-trip-detail';
import { useUserSettings, useSubscription } from '@/contexts/user-settings-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import Mapbox from '@rnmapbox/maps';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Text } from './ui/text';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Icon } from './icon';

interface TripDetailProps {
  tripId: string;
}

const TripDetail: React.FC<TripDetailProps> = ({ tripId }) => {
  const { trip, routeGeoJSON, loading, error, refresh } = useTripDetail(tripId);
  const { settings } = useUserSettings();
  const { isPro } = useSubscription();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const mapStyle = settings?.map_style || 'mapbox://styles/mapbox/standard';
  const primaryColor = useThemeColor({}, 'primary');

  // Calculate bounds for the route - MUST be before any conditional returns
  const routeBounds = React.useMemo(() => {
    if (!routeGeoJSON || routeGeoJSON.geometry.coordinates.length === 0) {
      return null;
    }

    const coords = routeGeoJSON.geometry.coordinates;
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);

    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    return {
      ne: [maxLng, maxLat] as [number, number],
      sw: [minLng, minLat] as [number, number],
      paddingTop: 40,
      paddingBottom: 40,
      paddingLeft: 40,
      paddingRight: 40,
    };
  }, [routeGeoJSON]);

  // Handler for when map finishes loading
  const handleMapLoaded = React.useCallback(() => {
    if (routeBounds && cameraRef.current) {
      // Use a small delay to ensure the camera ref is ready
      setTimeout(() => {
        cameraRef.current?.fitBounds(routeBounds.ne, routeBounds.sw, [40, 40, 40, 40], 500);
      }, 100);
    }
  }, [routeBounds]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
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
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const isImperial = settings?.units === 'imperial';
  const KM_TO_MI = 0.621371;
  const M_TO_FT = 3.28084;

  const formatDistance = (km?: number | null) => {
    if (!km) return '--';
    const value = isImperial ? km * KM_TO_MI : km;
    const unit = isImperial ? 'mi' : 'km';
    return `${value.toFixed(2)} ${unit}`;
  };

  const formatSpeed = (kmh?: number | null) => {
    if (!kmh) return '--';
    const value = isImperial ? kmh * KM_TO_MI : kmh;
    const unit = isImperial ? 'mph' : 'km/h';
    return `${value.toFixed(1)} ${unit}`;
  };

  const formatElevation = (m?: number | null) => {
    if (!m) return '--';
    const value = isImperial ? m * M_TO_FT : m;
    const unit = isImperial ? 'ft' : 'm';
    return `${value.toFixed(0)} ${unit}`;
  };

  if (loading) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
        {/* Header skeleton */}
        <View className="mb-4">
          <Skeleton className="h-8 w-3/4 rounded mb-2" />
          <View className="flex-row items-center gap-1.5">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
          </View>
        </View>

        {/* Map skeleton */}
        <Skeleton className="h-[250px] w-full rounded-xl mb-4" />

        {/* Stats card skeleton */}
        <Card className="mb-4">
          <CardContent>
            <Skeleton className="h-6 w-40 rounded mb-4" />
            <View className="flex-row flex-wrap gap-3">
              {[1, 2, 3, 4].map((i) => (
                <View key={i} className="flex-1 min-w-[45%] items-center p-3">
                  <Skeleton className="w-6 h-6 rounded-full mb-2" />
                  <Skeleton className="h-5 w-16 rounded mb-1" />
                  <Skeleton className="h-3 w-20 rounded" />
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    );
  }

  if (error || !trip) {
    return (
      <View className="flex-1 bg-background justify-center items-center p-8">
        <Icon name="error-outline" size={64} color="destructive" />
        <Text className="text-center mt-4 mb-6">{error || 'Trip not found'}</Text>
        <Button onPress={refresh}>
          <Text className="text-primary-foreground font-semibold">Retry</Text>
        </Button>
      </View>
    );
  }

  const basicStats = trip.trip_basic_stats;
  const advancedStats = trip.trip_advanced_stats;

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4">
      {/* Header */}
      <View className="mb-4">
        <Text className="text-2xl font-bold mb-2">
          {trip.title || `Trip on ${formatDate(trip.started_at)}`}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Icon name="event" size={16} color="mutedForeground" />
          <Text variant="small" className="text-muted-foreground">
            {formatDate(trip.started_at)} at {formatTime(trip.started_at)}
          </Text>
        </View>
      </View>

      {/* Notes */}
      {trip.notes && (
        <Card className="mb-4">
          <CardContent>
            <Text className="leading-6">{trip.notes}</Text>
          </CardContent>
        </Card>
      )}

      {/* Map */}
      {routeGeoJSON && routeBounds && (
        <View className="h-[250px] rounded-xl overflow-hidden mb-4">
          <Mapbox.MapView
            style={{ flex: 1 }}
            styleURL={mapStyle}
            logoEnabled={false}
            attributionEnabled={false}
            compassEnabled={true}
            onDidFinishLoadingMap={handleMapLoaded}
          >
            <Mapbox.Camera ref={cameraRef} />

            {/* Route line */}
            <Mapbox.ShapeSource id="routeSource" shape={routeGeoJSON}>
              <Mapbox.LineLayer
                id="routeLine"
                style={{
                  lineColor: primaryColor,
                  lineWidth: 4,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </Mapbox.ShapeSource>

            {/* Start point marker */}
            {routeGeoJSON.geometry.coordinates.length > 0 && (
              <Mapbox.PointAnnotation
                id="startPoint"
                coordinate={[
                  routeGeoJSON.geometry.coordinates[0][0],
                  routeGeoJSON.geometry.coordinates[0][1],
                ]}
              >
                <View className="w-9 h-9 rounded-full bg-green-500 items-center justify-center border-[3px] border-white shadow-md">
                  <Icon name="play-arrow" size={20} style={{ color: '#fff' }} />
                </View>
              </Mapbox.PointAnnotation>
            )}

            {/* End point marker */}
            {routeGeoJSON.geometry.coordinates.length > 1 && (
              <Mapbox.PointAnnotation
                id="endPoint"
                coordinate={[
                  routeGeoJSON.geometry.coordinates[
                    routeGeoJSON.geometry.coordinates.length - 1
                  ][0],
                  routeGeoJSON.geometry.coordinates[
                    routeGeoJSON.geometry.coordinates.length - 1
                  ][1],
                ]}
              >
                <View className="w-9 h-9 rounded-full bg-red-500 items-center justify-center border-[3px] border-white shadow-md">
                  <Icon name="flag" size={20} style={{ color: '#fff' }} />
                </View>
              </Mapbox.PointAnnotation>
            )}
          </Mapbox.MapView>
        </View>
      )}

      {/* Basic Statistics */}
      <View className="mb-4">
        <Card>
          <CardContent>
            <Text className="text-xl font-semibold mb-4">Basic Statistics</Text>
            <View className="flex-row flex-wrap gap-3">
              <View className="flex-1 min-w-[45%] items-center p-3">
                <Icon name="straighten" size={24} color="primary" />
                <Text className="text-xl font-semibold mt-2">
                  {formatDistance(basicStats?.distance_km)}
                </Text>
                <Text variant="small" className="text-muted-foreground mt-1 text-center">
                  Distance
                </Text>
              </View>

              <View className="flex-1 min-w-[45%] items-center p-3">
                <Icon name="schedule" size={24} color="primary" />
                <Text className="text-xl font-semibold mt-2">
                  {formatDuration(basicStats?.moving_duration_seconds)}
                </Text>
                <Text variant="small" className="text-muted-foreground mt-1 text-center">
                  Moving Time
                </Text>
              </View>

              <View className="flex-1 min-w-[45%] items-center p-3">
                <Icon name="speed" size={24} color="primary" />
                <Text className="text-xl font-semibold mt-2">
                  {formatSpeed(basicStats?.avg_speed_kmh)}
                </Text>
                <Text variant="small" className="text-muted-foreground mt-1 text-center">
                  Avg Speed
                </Text>
              </View>

              <View className="flex-1 min-w-[45%] items-center p-3">
                <Icon name="trending-up" size={24} color="primary" />
                <Text className="text-xl font-semibold mt-2">
                  {formatSpeed(basicStats?.max_speed_kmh)}
                </Text>
                <Text variant="small" className="text-muted-foreground mt-1 text-center">
                  Max Speed
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>
      </View>

      {/* Advanced Statistics - Pro Only */}
      {advancedStats && isPro && (
        <Card>
          <CardContent>
            <Text className="text-xl font-semibold mb-4">Advanced Statistics</Text>
            <View className="flex-row flex-wrap gap-3">
              {advancedStats.elevation_gain_m !== null && (
                <View className="flex-1 min-w-[45%] items-center p-3">
                  <Icon name="terrain" size={24} color="primary" />
                  <Text className="text-xl font-semibold mt-2">
                    {formatElevation(advancedStats.elevation_gain_m)}
                  </Text>
                  <Text variant="small" className="text-muted-foreground mt-1 text-center">
                    Elevation Gain
                  </Text>
                </View>
              )}

              {advancedStats.elevation_loss_m !== null && (
                <View className="flex-1 min-w-[45%] items-center p-3">
                  <Icon name="trending-down" size={24} color="primary" />
                  <Text className="text-xl font-semibold mt-2">
                    {formatElevation(advancedStats.elevation_loss_m)}
                  </Text>
                  <Text variant="small" className="text-muted-foreground mt-1 text-center">
                    Elevation Loss
                  </Text>
                </View>
              )}

              {advancedStats.speed_percentile_50_kmh !== null && (
                <View className="flex-1 min-w-[45%] items-center p-3">
                  <Icon name="show-chart" size={24} color="primary" />
                  <Text className="text-xl font-semibold mt-2">
                    {formatSpeed(advancedStats.speed_percentile_50_kmh)}
                  </Text>
                  <Text variant="small" className="text-muted-foreground mt-1 text-center">
                    Median Speed
                  </Text>
                </View>
              )}

              {advancedStats.avg_heart_rate_bpm !== null && (
                <View className="flex-1 min-w-[45%] items-center p-3">
                  <Icon name="favorite" size={24} color="destructive" />
                  <Text className="text-xl font-semibold mt-2">
                    {advancedStats.avg_heart_rate_bpm} bpm
                  </Text>
                  <Text variant="small" className="text-muted-foreground mt-1 text-center">
                    Avg Heart Rate
                  </Text>
                </View>
              )}
            </View>
          </CardContent>
        </Card>
      )}

      {/* Advanced Statistics - Locked for Free Users */}
      {!isPro && (
        <TouchableOpacity onPress={() => TrueSheet.present('paywall')} activeOpacity={0.7}>
          <Card className="overflow-hidden">
            <CardContent>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-semibold">Advanced Statistics</Text>
                <View className="flex-row items-center bg-primary px-2.5 py-1 rounded-full gap-1">
                  <Icon name="lock" size={14} style={{ color: '#fff' }} />
                  <Text className="text-white text-xs font-bold">PRO</Text>
                </View>
              </View>

              <View className="items-center">
                <View className="flex-row justify-center gap-6 mb-4 opacity-50">
                  <View className="items-center p-3">
                    <Icon name="terrain" size={24} color="mutedForeground" />
                    <Text className="text-xl font-semibold mt-2 text-muted-foreground">---</Text>
                    <Text variant="small" className="text-muted-foreground mt-1">
                      Elevation Gain
                    </Text>
                  </View>
                  <View className="items-center p-3">
                    <Icon name="show-chart" size={24} color="mutedForeground" />
                    <Text className="text-xl font-semibold mt-2 text-muted-foreground">---</Text>
                    <Text variant="small" className="text-muted-foreground mt-1">
                      Median Speed
                    </Text>
                  </View>
                </View>

                <View className="items-center gap-3">
                  <Text className="font-medium text-center">
                    Upgrade to Pro for detailed insights
                  </Text>
                  <View className="flex-row items-center bg-primary px-5 py-2.5 rounded-full gap-1.5">
                    <Text className="text-white text-sm font-semibold">Unlock</Text>
                    <Icon name="arrow-forward" size={16} style={{ color: '#fff' }} />
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>
        </TouchableOpacity>
      )}

      <View className="h-8" />
    </ScrollView>
  );
};

export default TripDetail;
