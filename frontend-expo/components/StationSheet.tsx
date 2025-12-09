import React, { useRef, useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import BaseSheet, { BaseSheetRef } from './BaseSheet';
import GetDirectionsButton from './GetDirectionsButton';
import { useStationRealtime } from '@/hooks/use-station-realtime';
import { Text } from './ui/text';
import { Button } from './ui/button';
import { Icon } from './icon';
import { cn } from '@/lib/utils';

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

  const getStatusColor = (totalBikes: number): string => {
    if (totalBikes === 0) return 'text-muted-foreground';
    if (totalBikes >= 5) return 'text-green-500';
    if (totalBikes >= 2) return 'text-amber-500';
    return 'text-red-500';
  };

  const getStatusText = (station: StationData, totalBikes: number, hasDocks: boolean): string => {
    if (!station.isOperational) return 'Out of Service';
    if (!station.isRenting && !station.isReturning) return 'Closed';
    if (!station.isRenting) return 'No Rentals';
    if (!station.isReturning) return 'No Returns';
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

          return (
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              scrollEnabled={isExpanded}
            >
              {!isExpanded ? (
                // Collapsed view
                <View className="flex-row items-center gap-3 p-4">
                  <View className="w-12 h-12 rounded-full bg-primary items-center justify-center">
                    <Icon name="pedal-bike" size={24} color="primaryForeground" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-base mb-1" numberOfLines={1}>
                      {currentStation.name}
                    </Text>
                    <View className="flex-row items-center gap-3">
                      {hasClassicBikes && (
                        <View className="flex-row items-center gap-1.5">
                          <Icon name="pedal-bike" size={16} color="mutedForeground" />
                          <Text className="font-semibold">{currentStation.classicBikes}</Text>
                        </View>
                      )}
                      {hasElectricBikes && (
                        <>
                          {hasClassicBikes && <View className="w-px h-4 bg-border" />}
                          <View className="flex-row items-center gap-1.5">
                            <Icon name="electric-bike" size={16} color="mutedForeground" />
                            <Text className="font-semibold">{currentStation.electricBikes}</Text>
                          </View>
                        </>
                      )}
                      {hasDocks && (
                        <>
                          {(hasClassicBikes || hasElectricBikes) && (
                            <View className="w-px h-4 bg-border" />
                          )}
                          <View className="flex-row items-center gap-1.5">
                            <Icon name="lock-open" size={16} color="mutedForeground" />
                            <Text className="font-semibold">{currentStation.availableDocks}</Text>
                          </View>
                        </>
                      )}
                    </View>
                    {totalBikes === 0 && (
                      <View className="flex-row items-start gap-1.5 mt-1.5">
                        <Icon name="info-outline" size={14} color="mutedForeground" />
                        <Text variant="small" className="text-muted-foreground flex-1">
                          No bikes available
                        </Text>
                      </View>
                    )}
                  </View>
                  {onGetDirections && (
                    <TouchableOpacity
                      className="p-1 mr-1"
                      onPress={onGetDirections}
                      disabled={isLoadingDirections}
                    >
                      <Icon
                        name={isLoadingDirections ? 'hourglass-empty' : 'directions'}
                        size={20}
                        color="foreground"
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity className="p-1" onPress={handleClosePress}>
                    <Icon name="close" size={20} color="foreground" />
                  </TouchableOpacity>
                </View>
              ) : (
                // Expanded view
                <View className="p-4">
                  {/* Header */}
                  <View className="flex-row items-center justify-between mb-6">
                    <Text className="text-xl font-semibold">Station Details</Text>
                    <Button variant="ghost" size="sm" onPress={handleClosePress}>
                      <Text className="text-base text-muted-foreground">Close</Text>
                    </Button>
                  </View>

                  {/* Station Icon */}
                  <View className="items-center mb-8">
                    <View className="w-24 h-24 rounded-full bg-primary items-center justify-center">
                      <Icon name="pedal-bike" size={48} color="primaryForeground" />
                    </View>
                  </View>

                  {/* Station Name & Address */}
                  <Text className="text-2xl font-bold text-center mb-2">{currentStation.name}</Text>
                  {currentStation.address && (
                    <Text className="text-center text-muted-foreground mb-8">
                      {currentStation.address}
                    </Text>
                  )}

                  {/* Availability Summary */}
                  <View className="flex-row justify-around mb-8 pb-6 border-b border-border">
                    <View className="items-center gap-2">
                      <View
                        className={cn(
                          'w-16 h-16 rounded-full items-center justify-center',
                          hasClassicBikes ? 'bg-primary' : 'bg-muted',
                        )}
                      >
                        <Icon name="pedal-bike" size={32} color="primaryForeground" />
                      </View>
                      <Text className="text-2xl font-bold">{currentStation.classicBikes}</Text>
                      <Text variant="small" className="text-muted-foreground">
                        Classic
                      </Text>
                    </View>

                    <View className="items-center gap-2">
                      <View
                        className={cn(
                          'w-16 h-16 rounded-full items-center justify-center',
                          hasElectricBikes ? 'bg-primary' : 'bg-muted',
                        )}
                      >
                        <Icon name="electric-bike" size={32} color="primaryForeground" />
                      </View>
                      <Text className="text-2xl font-bold">{currentStation.electricBikes}</Text>
                      <Text variant="small" className="text-muted-foreground">
                        Electric
                      </Text>
                    </View>

                    <View className="items-center gap-2">
                      <View
                        className={cn(
                          'w-16 h-16 rounded-full items-center justify-center',
                          hasDocks ? 'bg-primary' : 'bg-muted',
                        )}
                      >
                        <Icon name="lock-open" size={32} color="primaryForeground" />
                      </View>
                      <Text className="text-2xl font-bold">{currentStation.availableDocks}</Text>
                      <Text variant="small" className="text-muted-foreground">
                        Docks
                      </Text>
                    </View>
                  </View>

                  {/* Station Details */}
                  <View className="gap-4">
                    {/* Status */}
                    <View className="flex-row items-start gap-4">
                      <Icon name="info-outline" size={20} color="mutedForeground" />
                      <View className="flex-1">
                        <Text variant="small" className="text-muted-foreground mb-1">
                          Status
                        </Text>
                        <Text className={getStatusColor(totalBikes)}>
                          {getStatusText(currentStation, totalBikes, hasDocks)}
                        </Text>
                      </View>
                    </View>

                    {/* Capacity */}
                    {currentStation.capacity !== undefined && (
                      <View className="flex-row items-start gap-4">
                        <Icon name="storage" size={20} color="mutedForeground" />
                        <View className="flex-1">
                          <Text variant="small" className="text-muted-foreground mb-1">
                            Capacity
                          </Text>
                          <Text>{currentStation.capacity} docks</Text>
                        </View>
                      </View>
                    )}

                    {/* Last Updated */}
                    <View className="flex-row items-start gap-4">
                      <Icon name="schedule" size={20} color="mutedForeground" />
                      <View className="flex-1">
                        <Text variant="small" className="text-muted-foreground mb-1">
                          Last Updated
                        </Text>
                        <Text>{formatLastReported(currentStation.lastReported)}</Text>
                      </View>
                    </View>

                    {/* Coordinates */}
                    <View className="flex-row items-start gap-4">
                      <Icon name="place" size={20} color="mutedForeground" />
                      <View className="flex-1">
                        <Text variant="small" className="text-muted-foreground mb-1">
                          Coordinates
                        </Text>
                        <Text>
                          {currentStation.coordinates[1].toFixed(6)},{' '}
                          {currentStation.coordinates[0].toFixed(6)}
                        </Text>
                      </View>
                    </View>

                    {/* Network */}
                    {currentStation.networkName && (
                      <View className="flex-row items-start gap-4">
                        <Icon name="business" size={20} color="mutedForeground" />
                        <View className="flex-1">
                          <Text variant="small" className="text-muted-foreground mb-1">
                            Network
                          </Text>
                          <Text>{currentStation.networkName}</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Get Directions Button */}
                  {onGetDirections && (
                    <View className="mt-8 mb-8">
                      <GetDirectionsButton
                        onPress={onGetDirections}
                        isLoading={isLoadingDirections}
                      />
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          );
        })()}
    </BaseSheet>
  );
};

export default StationSheet;
