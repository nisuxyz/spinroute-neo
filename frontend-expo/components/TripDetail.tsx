import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useTripDetail } from '@/hooks/use-trip-detail';
import { useUserSettings } from '@/contexts/user-settings-context';
import { useSubscription } from '@/contexts/user-settings-context';
import Mapbox from '@rnmapbox/maps';
import { TrueSheet } from '@lodev09/react-native-true-sheet';

interface TripDetailProps {
  tripId: string;
}

const TripDetail: React.FC<TripDetailProps> = ({ tripId }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { trip, routeGeoJSON, loading, error, refresh } = useTripDetail(tripId);
  const { settings } = useUserSettings();
  const { isPro } = useSubscription();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const mapStyle = settings?.map_style || 'mapbox://styles/mapbox/standard';

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

  const formatDistance = (km?: number | null) => {
    if (!km) return '--';
    return `${km.toFixed(2)} km`;
  };

  const formatSpeed = (kmh?: number | null) => {
    if (!kmh) return '--';
    return `${kmh.toFixed(1)} km/h`;
  };

  const formatElevation = (m?: number | null) => {
    if (!m) return '--';
    return `${m.toFixed(0)} m`;
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.buttonIcon} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading trip details...</Text>
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <MaterialIcons name="error-outline" size={64} color={colors.stationNoDocks} />
        <Text style={[styles.errorText, { color: colors.text }]}>{error || 'Trip not found'}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.buttonIcon }]}
          onPress={refresh}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const basicStats = trip.trip_basic_stats;
  const advancedStats = trip.trip_advanced_stats;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {trip.title || `Trip on ${formatDate(trip.started_at)}`}
        </Text>
        <View style={styles.dateContainer}>
          <MaterialIcons name="event" size={16} color={colors.icon} />
          <Text style={[styles.dateText, { color: colors.icon }]}>
            {formatDate(trip.started_at)} at {formatTime(trip.started_at)}
          </Text>
        </View>
      </View>

      {trip.notes && (
        <View style={[styles.notesCard, { backgroundColor: colors.buttonBackground }]}>
          <Text style={[styles.notesText, { color: colors.text }]}>{trip.notes}</Text>
        </View>
      )}

      {routeGeoJSON && routeBounds && (
        <View style={styles.mapContainer}>
          <Mapbox.MapView
            style={styles.map}
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
                  lineColor: colors.buttonIcon,
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
                <View style={styles.startMarker}>
                  <MaterialIcons name="play-arrow" size={20} color="#fff" />
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
                <View style={styles.endMarker}>
                  <MaterialIcons name="flag" size={20} color="#fff" />
                </View>
              </Mapbox.PointAnnotation>
            )}
          </Mapbox.MapView>
        </View>
      )}

      <View style={[styles.statsCard, { backgroundColor: colors.buttonBackground }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Statistics</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <MaterialIcons name="straighten" size={24} color={colors.buttonIcon} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatDistance(basicStats?.distance_km)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Distance</Text>
          </View>

          <View style={styles.statBox}>
            <MaterialIcons name="schedule" size={24} color={colors.buttonIcon} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatDuration(basicStats?.moving_duration_seconds)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Moving Time</Text>
          </View>

          <View style={styles.statBox}>
            <MaterialIcons name="speed" size={24} color={colors.buttonIcon} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatSpeed(basicStats?.avg_speed_kmh)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Avg Speed</Text>
          </View>

          <View style={styles.statBox}>
            <MaterialIcons name="trending-up" size={24} color={colors.buttonIcon} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatSpeed(basicStats?.max_speed_kmh)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Max Speed</Text>
          </View>
        </View>
      </View>

      {/* Advanced Statistics - Pro Only */}
      {advancedStats && isPro && (
        <View style={[styles.statsCard, { backgroundColor: colors.buttonBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Advanced Statistics</Text>

          <View style={styles.statsGrid}>
            {advancedStats.elevation_gain_m !== null && (
              <View style={styles.statBox}>
                <MaterialIcons name="terrain" size={24} color={colors.buttonIcon} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {formatElevation(advancedStats.elevation_gain_m)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.icon }]}>Elevation Gain</Text>
              </View>
            )}

            {advancedStats.elevation_loss_m !== null && (
              <View style={styles.statBox}>
                <MaterialIcons name="trending-down" size={24} color={colors.buttonIcon} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {formatElevation(advancedStats.elevation_loss_m)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.icon }]}>Elevation Loss</Text>
              </View>
            )}

            {advancedStats.speed_percentile_50_kmh !== null && (
              <View style={styles.statBox}>
                <MaterialIcons name="show-chart" size={24} color={colors.buttonIcon} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {formatSpeed(advancedStats.speed_percentile_50_kmh)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.icon }]}>Median Speed</Text>
              </View>
            )}

            {advancedStats.avg_heart_rate_bpm !== null && (
              <View style={styles.statBox}>
                <MaterialIcons name="favorite" size={24} color={colors.stationNoDocks} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {advancedStats.avg_heart_rate_bpm} bpm
                </Text>
                <Text style={[styles.statLabel, { color: colors.icon }]}>Avg Heart Rate</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Advanced Statistics - Locked for Free Users */}
      {!isPro && (
        <TouchableOpacity
          style={[
            styles.statsCard,
            styles.lockedCard,
            { backgroundColor: colors.buttonBackground },
          ]}
          onPress={() => TrueSheet.present('paywall')}
          activeOpacity={0.7}
        >
          <View style={styles.lockedHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Advanced Statistics</Text>
            <View style={[styles.proBadge, { backgroundColor: colors.buttonIcon }]}>
              <MaterialIcons name="lock" size={14} color="#fff" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>

          <View style={styles.lockedContent}>
            <View style={styles.lockedStatsPreview}>
              <View style={styles.lockedStatBox}>
                <MaterialIcons name="terrain" size={24} color={colors.icon} />
                <Text style={[styles.lockedStatValue, { color: colors.icon }]}>---</Text>
                <Text style={[styles.statLabel, { color: colors.icon }]}>Elevation Gain</Text>
              </View>
              <View style={styles.lockedStatBox}>
                <MaterialIcons name="show-chart" size={24} color={colors.icon} />
                <Text style={[styles.lockedStatValue, { color: colors.icon }]}>---</Text>
                <Text style={[styles.statLabel, { color: colors.icon }]}>Median Speed</Text>
              </View>
            </View>

            <View style={styles.upgradePrompt}>
              <Text style={[styles.upgradeText, { color: colors.text }]}>
                Upgrade to Pro for detailed insights
              </Text>
              <View style={[styles.upgradeButton, { backgroundColor: colors.buttonIcon }]}>
                <Text style={styles.upgradeButtonText}>Unlock</Text>
                <MaterialIcons name="arrow-forward" size={16} color="#fff" />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 14,
  },
  notesCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    flex: 1,
  },
  startMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  endMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 32,
  },
  // Locked card styles
  lockedCard: {
    overflow: 'hidden',
  },
  lockedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  proBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  lockedContent: {
    alignItems: 'center',
  },
  lockedStatsPreview: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
    opacity: 0.5,
  },
  lockedStatBox: {
    alignItems: 'center',
    padding: 12,
  },
  lockedStatValue: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
  },
  upgradePrompt: {
    alignItems: 'center',
    gap: 12,
  },
  upgradeText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TripDetail;
