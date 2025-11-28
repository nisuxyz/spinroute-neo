import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform, useColorScheme, Text, ActivityIndicator } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetFlatList,
  TouchableOpacity,
} from '@gorhom/bottom-sheet';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useTrips, type TripWithStats } from '@/hooks/use-trips';
import { useRouter } from 'expo-router';

interface RecordedTripsSheetProps {
  visible: boolean;
  onClose: () => void;
}

const RecordedTripsSheet: React.FC<RecordedTripsSheetProps> = ({ visible, onClose }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const hasGlassEffect = Platform.OS === 'ios' && isLiquidGlassAvailable();
  const router = useRouter();

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['90%'], []);

  const { trips, loading, error, hasMore, loadMore, refresh } = useTrips({
    pageSize: 20,
  });

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  );

  const GlassContainer = hasGlassEffect ? GlassView : View;

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
    router.push(`/trip/${trip.id}` as any);
  };

  const renderTripItem = ({ item }: { item: TripWithStats }) => {
    const stats = item.trip_basic_stats;

    return (
      <TouchableOpacity
        style={[styles.tripCard, { backgroundColor: colors.buttonBackground }]}
        onPress={() => handleTripPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.tripHeader}>
          <View style={styles.tripTitleContainer}>
            <MaterialIcons name="directions-bike" size={20} color={colors.buttonIcon} />
            <Text style={[styles.tripTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title || `Trip on ${formatDate(item.started_at)}`}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.icon} />
        </View>

        <View style={styles.tripMeta}>
          <View style={styles.metaRow}>
            <MaterialIcons name="event" size={16} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]}>
              {formatDate(item.started_at)} at {formatTime(item.started_at)}
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialIcons name="straighten" size={18} color={colors.buttonIcon} />
            <View style={styles.statTextContainer}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatDistance(stats?.distance_km)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>Distance</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <MaterialIcons name="schedule" size={18} color={colors.buttonIcon} />
            <View style={styles.statTextContainer}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatDuration(stats?.moving_duration_seconds)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>Duration</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <MaterialIcons name="speed" size={18} color={colors.buttonIcon} />
            <View style={styles.statTextContainer}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatSpeed(stats?.avg_speed_kmh)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>Avg Speed</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading && trips.length === 0) {
      return null;
    }

    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="directions-bike" size={64} color={colors.icon + '40'} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No trips yet</Text>
        <Text style={[styles.emptyText, { color: colors.icon }]}>
          Start recording your rides to see them here
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.buttonIcon} />
      </View>
    );
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      onChange={handleSheetChanges}
      onDismiss={handleDismiss}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={[
        styles.sheetBackground,
        hasGlassEffect
          ? { backgroundColor: 'transparent' }
          : { backgroundColor: colors.buttonBackground },
      ]}
      handleIndicatorStyle={{ backgroundColor: colors.text + '40' }}
    >
      <GlassContainer
        style={styles.glassSheet}
        {...(hasGlassEffect && { glassEffectStyle: 'regular' })}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Recorded Trips</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color={colors.stationNoDocks} />
            <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.buttonIcon }]}
              onPress={refresh}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <BottomSheetFlatList
            data={trips}
            renderItem={renderTripItem}
            keyExtractor={(item: TripWithStats) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            onEndReached={() => {
              if (hasMore && !loading) {
                loadMore();
              }
            }}
            onEndReachedThreshold={0.5}
            refreshing={loading && trips.length === 0}
            onRefresh={refresh}
            showsVerticalScrollIndicator={false}
          />
        )}
      </GlassContainer>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  glassSheet: {
    flex: 1,
    padding: 20,
    paddingTop: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  tripCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  tripMeta: {
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#00000010',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default RecordedTripsSheet;
