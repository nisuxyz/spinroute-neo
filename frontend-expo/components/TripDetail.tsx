import React from 'react';
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
import { Colors } from '@/constants/theme';
import { useTripDetail } from '@/hooks/use-trip-detail';
import Mapbox from '@rnmapbox/maps';

interface TripDetailProps {
  tripId: string;
}

const TripDetail: React.FC<TripDetailProps> = ({ tripId }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { trip, tripPoints, routeGeoJSON, loading, error, refresh } = useTripDetail(tripId);

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

  // Calculate map center from route points
  const mapCenter =
    routeGeoJSON && routeGeoJSON.geometry.coordinates.length > 0
      ? [
          routeGeoJSON.geometry.coordinates.reduce((sum, coord) => sum + coord[0], 0) /
            routeGeoJSON.geometry.coordinates.length,
          routeGeoJSON.geometry.coordinates.reduce((sum, coord) => sum + coord[1], 0) /
            routeGeoJSON.geometry.coordinates.length,
        ]
      : undefined;

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

      {routeGeoJSON && mapCenter && (
        <View style={styles.mapContainer}>
          <Mapbox.MapView style={styles.map} styleURL={Mapbox.StyleURL.Street}>
            <Mapbox.Camera zoomLevel={13} centerCoordinate={mapCenter} />
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

      {advancedStats && (
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
});

export default TripDetail;
