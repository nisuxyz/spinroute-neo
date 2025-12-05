import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, useColorScheme, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/constants/theme';
import BaseSheet, { BaseSheetRef } from './BaseSheet';
import GetDirectionsButton from './GetDirectionsButton';
import { useStationRealtime } from '@/hooks/use-station-realtime';

/**
 * Station data interface matching the design document
 */
export interface StationData {
  id: string;
  name: string;
  coordinates: [number, number];
  classicBikes: number;
  electricBikes: number;
  availableDocks: number;
  availabilityStatus: string;
  address?: string;
  capacity?: number;
  isOperational?: boolean;
  isRenting?: boolean;
  isReturning?: boolean;
  lastReported?: string;
  networkName?: string;
}

/**
 * Props for StationSheet component
 */
export interface StationSheetProps {
  visible: boolean;
  station: StationData | null;
  onClose: () => void;
  onGetDirections?: () => void;
  isLoadingDirections?: boolean;
}

/**
 * StationSheet - Displays bikeshare station information in a bottom sheet
 *
 * Features:
 * - Collapsed state: Shows station name and bike counts
 * - Expanded state: Shows full station details with scrollable content
 * - Real-time updates: Automatically reflects station data changes
 * - Get Directions: Triggers route preferences selection
 *
 * Detents:
 * - Collapsed: 'auto' (~120px)
 * - Expanded: 0.7 (70% screen height)
 */
const StationSheet: React.FC<StationSheetProps> = ({
  visible,
  station,
  onClose,
  onGetDirections,
  isLoadingDirections = false,
}) => {
  const sheetRef = useRef<BaseSheetRef>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isExpanded, setIsExpanded] = useState(false);

  // Subscribe to real-time station updates
  const { stationData: realtimeStation } = useStationRealtime(station?.id ?? null);

  // Use real-time data if available, otherwise fall back to prop data
  const currentStation = realtimeStation
    ? {
        ...station!,
        classicBikes: realtimeStation.num_bikes_available || 0,
        electricBikes: realtimeStation.num_ebikes_available || 0,
        availableDocks: realtimeStation.num_docks_available || 0,
        isOperational: realtimeStation.is_operational ?? true,
        isRenting: realtimeStation.is_renting ?? true,
        isReturning: realtimeStation.is_returning ?? true,
        lastReported: realtimeStation.last_reported ?? undefined,
        capacity: realtimeStation.capacity ?? undefined,
      }
    : station;

  // Present/dismiss sheet based on visible prop
  useEffect(() => {
    if (visible && station) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible, station]);

  // Handle sheet dismissal
  const handleDismiss = () => {
    setIsExpanded(false);
    onClose();
  };

  // Handle detent changes
  const handleDetentChange = (index: number) => {
    setIsExpanded(index > 0);
  };

  return (
    <BaseSheet
      ref={sheetRef}
      name="StationSheet"
      detents={[0.1, 0.7]}
      initialDetentIndex={0}
      onDismiss={handleDismiss}
      onDetentChange={handleDetentChange}
      scrollable={true}
      dimmed={false}
    >
      {currentStation &&
        (() => {
          const totalBikes = currentStation.classicBikes + currentStation.electricBikes;
          const hasClassicBikes = currentStation.classicBikes > 0;
          const hasElectricBikes = currentStation.electricBikes > 0;
          const hasDocks = currentStation.availableDocks > 0;

          const getStatusColor = (): string => {
            if (totalBikes === 0) return colors.text + '66';
            if (totalBikes >= 5) return '#4CAF50';
            if (totalBikes >= 2) return '#FF9800';
            return '#F44336';
          };

          const getStatusText = (): string => {
            if (!currentStation.isOperational) return 'Out of Service';
            if (!currentStation.isRenting && !currentStation.isReturning) return 'Closed';
            if (!currentStation.isRenting) return 'No Rentals';
            if (!currentStation.isReturning) return 'No Returns';
            if (totalBikes === 0 && !hasDocks) return 'Empty';
            if (totalBikes === 0) return 'No Bikes';
            return 'Available';
          };

          const formatLastReported = (timestamp?: string): string => {
            if (!timestamp) return 'Unknown';
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays}d ago`;
          };

          return (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              scrollEnabled={isExpanded}
            >
              {!isExpanded ? (
                // Collapsed view
                <View style={styles.collapsedContent}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: Colors[colorScheme ?? 'light'].buttonIcon },
                    ]}
                  >
                    <MaterialIcons name="pedal-bike" size={24} color="white" />
                  </View>
                  <View style={styles.infoContainer}>
                    <Text style={[styles.stationName, { color: colors.text }]} numberOfLines={1}>
                      {currentStation.name}
                    </Text>
                    <View style={styles.statsRow}>
                      {hasClassicBikes && (
                        <View style={styles.stat}>
                          <MaterialIcons name="pedal-bike" size={16} color={colors.text + 'CC'} />
                          <Text style={[styles.statValue, { color: colors.text }]}>
                            {currentStation.classicBikes}
                          </Text>
                        </View>
                      )}
                      {hasElectricBikes && (
                        <>
                          {hasClassicBikes && <View style={styles.statDivider} />}
                          <View style={styles.stat}>
                            <MaterialIcons
                              name="electric-bike"
                              size={16}
                              color={colors.text + 'CC'}
                            />
                            <Text style={[styles.statValue, { color: colors.text }]}>
                              {currentStation.electricBikes}
                            </Text>
                          </View>
                        </>
                      )}
                      {hasDocks && (
                        <>
                          {(hasClassicBikes || hasElectricBikes) && (
                            <View style={styles.statDivider} />
                          )}
                          <View style={styles.stat}>
                            <MaterialIcons name="lock-open" size={16} color={colors.text + 'CC'} />
                            <Text style={[styles.statValue, { color: colors.text }]}>
                              {currentStation.availableDocks}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                    {totalBikes === 0 && (
                      <View style={styles.warningContainer}>
                        <MaterialIcons name="info-outline" size={14} color={colors.text + '99'} />
                        <Text style={[styles.warningText, { color: colors.text + '99' }]}>
                          No bikes available
                        </Text>
                      </View>
                    )}
                  </View>
                  {onGetDirections && !isLoadingDirections && (
                    <TouchableOpacity style={styles.directionsIconButton} onPress={onGetDirections}>
                      <MaterialIcons name="directions" size={20} color={colors.text} />
                    </TouchableOpacity>
                  )}
                  {onGetDirections && isLoadingDirections && (
                    <TouchableOpacity style={styles.directionsIconButton} disabled>
                      <MaterialIcons name="hourglass-empty" size={20} color={colors.text} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
                    <MaterialIcons name="close" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
              ) : (
                // Expanded view
                <View style={styles.expandedContentWrapper}>
                  <View style={styles.expandedHeader}>
                    <Text style={[styles.expandedTitle, { color: colors.text }]}>
                      Station Details
                    </Text>
                    <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
                      <MaterialIcons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.expandedIconContainer}>
                    <View
                      style={[
                        styles.expandedIconCircle,
                        { backgroundColor: Colors[colorScheme ?? 'light'].buttonIcon },
                      ]}
                    >
                      <MaterialIcons name="pedal-bike" size={48} color="white" />
                    </View>
                  </View>

                  <Text style={[styles.expandedName, { color: colors.text }]}>
                    {currentStation.name}
                  </Text>
                  {currentStation.address && (
                    <Text style={[styles.expandedAddress, { color: colors.text + 'CC' }]}>
                      {currentStation.address}
                    </Text>
                  )}

                  {/* Availability Summary */}
                  <View style={styles.availabilitySummary}>
                    <View style={styles.availabilityItem}>
                      <View
                        style={[
                          styles.availabilityIconCircle,
                          {
                            backgroundColor: hasClassicBikes
                              ? Colors[colorScheme ?? 'light'].buttonIcon
                              : colors.text + '33',
                          },
                        ]}
                      >
                        <MaterialIcons name="pedal-bike" size={32} color="white" />
                      </View>
                      <Text style={[styles.availabilityCount, { color: colors.text }]}>
                        {currentStation.classicBikes}
                      </Text>
                      <Text style={[styles.availabilityLabel, { color: colors.text + '99' }]}>
                        Classic
                      </Text>
                    </View>

                    <View style={styles.availabilityItem}>
                      <View
                        style={[
                          styles.availabilityIconCircle,
                          {
                            backgroundColor: hasElectricBikes
                              ? Colors[colorScheme ?? 'light'].buttonIcon
                              : colors.text + '33',
                          },
                        ]}
                      >
                        <MaterialIcons name="electric-bike" size={32} color="white" />
                      </View>
                      <Text style={[styles.availabilityCount, { color: colors.text }]}>
                        {currentStation.electricBikes}
                      </Text>
                      <Text style={[styles.availabilityLabel, { color: colors.text + '99' }]}>
                        Electric
                      </Text>
                    </View>

                    <View style={styles.availabilityItem}>
                      <View
                        style={[
                          styles.availabilityIconCircle,
                          {
                            backgroundColor: hasDocks
                              ? Colors[colorScheme ?? 'light'].buttonIcon
                              : colors.text + '33',
                          },
                        ]}
                      >
                        <MaterialIcons name="lock-open" size={32} color="white" />
                      </View>
                      <Text style={[styles.availabilityCount, { color: colors.text }]}>
                        {currentStation.availableDocks}
                      </Text>
                      <Text style={[styles.availabilityLabel, { color: colors.text + '99' }]}>
                        Docks
                      </Text>
                    </View>
                  </View>

                  {/* Station Details */}
                  <View style={styles.detailsSection}>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="info-outline" size={20} color={colors.text + 'CC'} />
                      <View style={styles.detailTextContainer}>
                        <Text style={[styles.detailLabel, { color: colors.text + '99' }]}>
                          Status
                        </Text>
                        <Text style={[styles.detailValue, { color: getStatusColor() }]}>
                          {getStatusText()}
                        </Text>
                      </View>
                    </View>

                    {currentStation.capacity !== undefined && (
                      <View style={styles.detailRow}>
                        <MaterialIcons name="storage" size={20} color={colors.text + 'CC'} />
                        <View style={styles.detailTextContainer}>
                          <Text style={[styles.detailLabel, { color: colors.text + '99' }]}>
                            Capacity
                          </Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>
                            {currentStation.capacity} docks
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.detailRow}>
                      <MaterialIcons name="schedule" size={20} color={colors.text + 'CC'} />
                      <View style={styles.detailTextContainer}>
                        <Text style={[styles.detailLabel, { color: colors.text + '99' }]}>
                          Last Updated
                        </Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {formatLastReported(currentStation.lastReported)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <MaterialIcons name="place" size={20} color={colors.text + 'CC'} />
                      <View style={styles.detailTextContainer}>
                        <Text style={[styles.detailLabel, { color: colors.text + '99' }]}>
                          Coordinates
                        </Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {currentStation.coordinates[1].toFixed(6)},{' '}
                          {currentStation.coordinates[0].toFixed(6)}
                        </Text>
                      </View>
                    </View>

                    {currentStation.networkName && (
                      <View style={styles.detailRow}>
                        <MaterialIcons name="business" size={20} color={colors.text + 'CC'} />
                        <View style={styles.detailTextContainer}>
                          <Text style={[styles.detailLabel, { color: colors.text + '99' }]}>
                            Network
                          </Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>
                            {currentStation.networkName}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {onGetDirections && (
                    <GetDirectionsButton
                      onPress={onGetDirections}
                      isLoading={isLoadingDirections}
                      style={styles.directionsButton}
                    />
                  )}
                </View>
              )}
            </ScrollView>
          );
        })()}
    </BaseSheet>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  collapsedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  expandedContentWrapper: {
    padding: Spacing.lg,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  stationName: {
    ...Typography.h3,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    ...Typography.h3,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 6,
  },
  warningText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 14,
  },
  directionsIconButton: {
    padding: 4,
    marginRight: 4,
  },
  closeButton: {
    padding: 4,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  expandedTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  expandedIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  expandedIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedName: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  expandedAddress: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  availabilitySummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  availabilityItem: {
    alignItems: 'center',
    gap: 8,
  },
  availabilityIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availabilityCount: {
    fontSize: 24,
    fontWeight: '800',
  },
  availabilityLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsSection: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  directionsButton: {
    marginTop: 24,
    marginBottom: 24,
  },
});

export default StationSheet;
