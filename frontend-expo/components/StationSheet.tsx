import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spacing, Typography, BorderRadius, CardStyles } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
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
  const textColor = useThemeColor({}, 'text');
  const buttonIcon = useThemeColor({}, 'buttonIcon');
  const [isExpanded, setIsExpanded] = useState(false);

  // Preserve the last known station data to prevent race conditions during dismissal
  const [preservedStation, setPreservedStation] = useState<StationData | null>(null);

  // Subscribe to real-time station updates (only when we have a station)
  const { stationData: realtimeStation } = useStationRealtime(preservedStation?.id ?? null);

  // Update preserved station when prop changes (but don't clear it when prop becomes null)
  useEffect(() => {
    if (station) {
      setPreservedStation(station);
    }
  }, [station]);

  // Use real-time data if available, otherwise fall back to preserved data
  const currentStation =
    realtimeStation && preservedStation
      ? {
          ...preservedStation,
          classicBikes: realtimeStation.num_bikes_available || 0,
          electricBikes: realtimeStation.num_ebikes_available || 0,
          availableDocks: realtimeStation.num_docks_available || 0,
          isOperational: realtimeStation.is_operational ?? true,
          isRenting: realtimeStation.is_renting ?? true,
          isReturning: realtimeStation.is_returning ?? true,
          lastReported: realtimeStation.last_reported ?? undefined,
          capacity: realtimeStation.capacity ?? undefined,
        }
      : preservedStation;

  // Present sheet when visible becomes true
  // Don't auto-dismiss when visible becomes false - let user dismiss manually
  useEffect(() => {
    if (visible && station) {
      sheetRef.current?.present();
    }
  }, [visible, station]);

  // Called when user presses close button - triggers dismissal
  const handleClosePress = () => {
    sheetRef.current?.dismiss();
  };

  // Called after sheet is fully dismissed - cleanup and notify parent
  const handleDismiss = () => {
    setIsExpanded(false);
    // Clear preserved station data now that sheet is fully dismissed
    setPreservedStation(null);
    // Notify parent (this will clear selectedStation in MainMapView)
    // This happens AFTER the sheet animation completes (via onDidDismiss)
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
            if (totalBikes === 0) return textColor + '66';
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
                  <View style={[styles.iconCircle, { backgroundColor: buttonIcon }]}>
                    <MaterialIcons name="pedal-bike" size={24} color="white" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[Typography.h3, { marginBottom: 4, color: textColor }]}
                      numberOfLines={1}
                    >
                      {currentStation.name}
                    </Text>
                    <View style={styles.statsRow}>
                      {hasClassicBikes && (
                        <View style={styles.stat}>
                          <MaterialIcons name="pedal-bike" size={16} color={textColor + 'CC'} />
                          <Text style={[Typography.h3, { color: textColor }]}>
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
                              color={textColor + 'CC'}
                            />
                            <Text style={[Typography.h3, { color: textColor }]}>
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
                            <MaterialIcons name="lock-open" size={16} color={textColor + 'CC'} />
                            <Text style={[Typography.h3, { color: textColor }]}>
                              {currentStation.availableDocks}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                    {totalBikes === 0 && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          gap: 6,
                          marginTop: 6,
                        }}
                      >
                        <MaterialIcons name="info-outline" size={14} color={textColor + '99'} />
                        <Text
                          style={{ fontSize: 11, flex: 1, lineHeight: 14, color: textColor + '99' }}
                        >
                          No bikes available
                        </Text>
                      </View>
                    )}
                  </View>
                  {onGetDirections && !isLoadingDirections && (
                    <TouchableOpacity
                      style={{ padding: 4, marginRight: 4 }}
                      onPress={onGetDirections}
                    >
                      <MaterialIcons name="directions" size={20} color={textColor} />
                    </TouchableOpacity>
                  )}
                  {onGetDirections && isLoadingDirections && (
                    <TouchableOpacity style={{ padding: 4, marginRight: 4 }} disabled>
                      <MaterialIcons name="hourglass-empty" size={20} color={textColor} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={{ padding: 4 }} onPress={handleClosePress}>
                    <MaterialIcons name="close" size={20} color={textColor} />
                  </TouchableOpacity>
                </View>
              ) : (
                // Expanded view
                <View style={{ padding: Spacing.lg }}>
                  <View style={styles.expandedHeader}>
                    <Text style={[Typography.h2, { color: textColor }]}>Station Details</Text>
                    <TouchableOpacity style={{ padding: 4 }} onPress={handleClosePress}>
                      <MaterialIcons name="close" size={24} color={textColor} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ alignItems: 'center', marginBottom: Spacing.xxl }}>
                    <View style={[styles.expandedIconCircle, { backgroundColor: buttonIcon }]}>
                      <MaterialIcons name="pedal-bike" size={48} color="white" />
                    </View>
                  </View>

                  <Text
                    style={[
                      Typography.displayLarge,
                      { marginBottom: Spacing.sm, textAlign: 'center', color: textColor },
                    ]}
                  >
                    {currentStation.name}
                  </Text>
                  {currentStation.address && (
                    <Text
                      style={[
                        Typography.bodyLarge,
                        {
                          textAlign: 'center',
                          marginBottom: Spacing.xxxl,
                          lineHeight: 24,
                          color: textColor + 'CC',
                        },
                      ]}
                    >
                      {currentStation.address}
                    </Text>
                  )}

                  {/* Availability Summary */}
                  <View style={styles.availabilitySummary}>
                    <View style={styles.availabilityItem}>
                      <View
                        style={[
                          styles.availabilityIconCircle,
                          { backgroundColor: hasClassicBikes ? buttonIcon : textColor + '33' },
                        ]}
                      >
                        <MaterialIcons name="pedal-bike" size={32} color="white" />
                      </View>
                      <Text style={[Typography.displayMedium, { color: textColor }]}>
                        {currentStation.classicBikes}
                      </Text>
                      <Text style={[Typography.label, { color: textColor + '99' }]}>Classic</Text>
                    </View>

                    <View style={styles.availabilityItem}>
                      <View
                        style={[
                          styles.availabilityIconCircle,
                          { backgroundColor: hasElectricBikes ? buttonIcon : textColor + '33' },
                        ]}
                      >
                        <MaterialIcons name="electric-bike" size={32} color="white" />
                      </View>
                      <Text style={[Typography.displayMedium, { color: textColor }]}>
                        {currentStation.electricBikes}
                      </Text>
                      <Text style={[Typography.label, { color: textColor + '99' }]}>Electric</Text>
                    </View>

                    <View style={styles.availabilityItem}>
                      <View
                        style={[
                          styles.availabilityIconCircle,
                          { backgroundColor: hasDocks ? buttonIcon : textColor + '33' },
                        ]}
                      >
                        <MaterialIcons name="lock-open" size={32} color="white" />
                      </View>
                      <Text style={[Typography.displayMedium, { color: textColor }]}>
                        {currentStation.availableDocks}
                      </Text>
                      <Text style={[Typography.label, { color: textColor + '99' }]}>Docks</Text>
                    </View>
                  </View>

                  {/* Station Details */}
                  <View style={{ gap: Spacing.lg }}>
                    <View
                      style={[
                        CardStyles.detailRow,
                        { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
                      ]}
                    >
                      <MaterialIcons name="info-outline" size={20} color={textColor + 'CC'} />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[Typography.label, { marginBottom: 4, color: textColor + '99' }]}
                        >
                          Status
                        </Text>
                        <Text style={[Typography.bodyLarge, { color: getStatusColor() }]}>
                          {getStatusText()}
                        </Text>
                      </View>
                    </View>

                    {currentStation.capacity !== undefined && (
                      <View
                        style={[
                          CardStyles.detailRow,
                          { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
                        ]}
                      >
                        <MaterialIcons name="storage" size={20} color={textColor + 'CC'} />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[Typography.label, { marginBottom: 4, color: textColor + '99' }]}
                          >
                            Capacity
                          </Text>
                          <Text style={[Typography.bodyLarge, { color: textColor }]}>
                            {currentStation.capacity} docks
                          </Text>
                        </View>
                      </View>
                    )}

                    <View
                      style={[
                        CardStyles.detailRow,
                        { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
                      ]}
                    >
                      <MaterialIcons name="schedule" size={20} color={textColor + 'CC'} />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[Typography.label, { marginBottom: 4, color: textColor + '99' }]}
                        >
                          Last Updated
                        </Text>
                        <Text style={[Typography.bodyLarge, { color: textColor }]}>
                          {formatLastReported(currentStation.lastReported)}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        CardStyles.detailRow,
                        { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
                      ]}
                    >
                      <MaterialIcons name="place" size={20} color={textColor + 'CC'} />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[Typography.label, { marginBottom: 4, color: textColor + '99' }]}
                        >
                          Coordinates
                        </Text>
                        <Text style={[Typography.bodyLarge, { color: textColor }]}>
                          {currentStation.coordinates[1].toFixed(6)},{' '}
                          {currentStation.coordinates[0].toFixed(6)}
                        </Text>
                      </View>
                    </View>

                    {currentStation.networkName && (
                      <View
                        style={[
                          CardStyles.detailRow,
                          { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
                        ]}
                      >
                        <MaterialIcons name="business" size={20} color={textColor + 'CC'} />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[Typography.label, { marginBottom: 4, color: textColor + '99' }]}
                          >
                            Network
                          </Text>
                          <Text style={[Typography.bodyLarge, { color: textColor }]}>
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
                      style={{ marginTop: Spacing.xxl, marginBottom: Spacing.xxl }}
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
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xxl,
  },
  expandedIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availabilitySummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xxxl,
    paddingBottom: Spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  availabilityItem: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  availabilityIconCircle: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.xxxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default StationSheet;
