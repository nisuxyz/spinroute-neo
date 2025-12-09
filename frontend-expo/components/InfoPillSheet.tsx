import React, { useRef, useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import BaseSheet, { BaseSheetRef } from './BaseSheet';
import RecordingIndicator from './RecordingIndicator';
import type { Bike } from '@/hooks/use-bikes';
import { Text } from './ui/text';
import { Button } from './ui/button';
import { Icon, type IconName } from './icon';

/**
 * Weather data interface
 */
export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  description: string;
  icon: string;
}

/**
 * Props for InfoPillSheet component
 */
export interface InfoPillSheetProps {
  visible: boolean;
  bike: Bike | undefined;
  weather: WeatherData | null;
  isRecording?: boolean;
  onClose: () => void;
}

const bikeTypeIcons: Record<string, IconName> = {
  road: 'pedal-bike',
  mountain: 'terrain',
  hybrid: 'directions-bike',
  ebike: 'electric-bike',
  gravel: 'landscape',
  other: 'two-wheeler',
};

const bikeTypeLabels: Record<string, string> = {
  road: 'Road Bike',
  mountain: 'Mountain Bike',
  hybrid: 'Hybrid Bike',
  ebike: 'E-Bike',
  gravel: 'Gravel Bike',
  other: 'Other',
};

/**
 * InfoPillSheet - Displays detailed bike, recording, and weather information
 *
 * Features:
 * - Collapsed state: Shows bike name, type, and basic weather
 * - Expanded state: Shows full bike details, recording status, and detailed weather
 *
 * Detents:
 * - Collapsed: 0.1 (~10% screen height)
 * - Mid: 0.45 (45% screen height)
 * - Expanded: 0.9 (90% screen height)
 */
const InfoPillSheet: React.FC<InfoPillSheetProps> = ({
  visible,
  bike,
  weather,
  isRecording = false,
  onClose,
}) => {
  const sheetRef = useRef<BaseSheetRef>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // Present sheet when visible becomes true
  useEffect(() => {
    if (visible && bike) {
      sheetRef.current?.present(1);
      setIsExpanded(true);
    }
  }, [visible, bike]);

  // Called when user presses close button
  const handleClosePress = () => {
    sheetRef.current?.dismiss();
  };

  // Called after sheet is fully dismissed
  const handleDismiss = () => {
    setIsExpanded(false);
    onClose();
  };

  // Handle detent changes
  const handleDetentChange = (index: number) => {
    setIsExpanded(index > 0);
  };

  if (!bike) {
    return null;
  }

  const icon = bikeTypeIcons[bike.type] || 'pedal-bike';
  const bikeColor = bike.color || '#3b82f6';
  const bikeTypeLabel = bikeTypeLabels[bike.type] || 'Bike';

  /**
   * Get wind direction label from degrees
   */
  const getWindDirection = (degrees: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  return (
    <BaseSheet
      ref={sheetRef}
      name="InfoPillSheet"
      detents={[0.1, 0.45, 0.9]}
      initialDetentIndex={1}
      onDismiss={handleDismiss}
      onDetentChange={handleDetentChange}
      scrollable={true}
      dimmed={false}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        scrollEnabled={isExpanded}
      >
        {!isExpanded ? (
          // Collapsed view - Shows bike name, type, and basic info
          <View className="flex-row items-center gap-3 p-4">
            <View
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: bikeColor }}
            >
              <Icon name={icon} size={24} style={{ color: 'white' }} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="font-semibold text-base mb-0.5" numberOfLines={1}>
                  {bike.name}
                </Text>
                {isRecording && <RecordingIndicator size={8} />}
              </View>
              <Text variant="small" className="text-muted-foreground" numberOfLines={1}>
                {bikeTypeLabel}
                {weather && ` • ${Math.round(weather.temperature)}°C`}
              </Text>
            </View>
            <TouchableOpacity className="p-1" onPress={handleClosePress}>
              <Icon name="close" size={20} color="foreground" />
            </TouchableOpacity>
          </View>
        ) : (
          // Expanded view - Shows full details
          <View className="p-4">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center gap-3">
                <Text className="text-xl font-semibold">Ride Details</Text>
                {isRecording && (
                  <View className="flex-row items-center px-3 py-1 rounded-md bg-red-500/10">
                    <Icon name="fiber-manual-record" size={12} style={{ color: '#ef4444' }} />
                    <Text className="text-red-500 text-xs font-medium ml-1">Recording</Text>
                  </View>
                )}
              </View>
              <Button variant="ghost" size="sm" onPress={handleClosePress}>
                <Text className="text-base text-muted-foreground">Close</Text>
              </Button>
            </View>

            {/* Bike Icon */}
            <View className="items-center mb-8">
              <View
                className="w-24 h-24 rounded-full items-center justify-center"
                style={{ backgroundColor: bikeColor }}
              >
                <Icon name={icon} size={48} style={{ color: 'white' }} />
              </View>
            </View>

            {/* Bike Name & Type */}
            <Text className="text-2xl font-bold text-center mb-2">{bike.name}</Text>
            <Text className="text-center text-muted-foreground mb-8">{bikeTypeLabel}</Text>

            {/* Bike Details */}
            <View className="gap-4 mb-8">
              {bike.brand && (
                <View className="flex-row items-start gap-4">
                  <Icon name="business" size={20} color="mutedForeground" />
                  <View className="flex-1">
                    <Text variant="small" className="text-muted-foreground mb-1">
                      Brand
                    </Text>
                    <Text>
                      {bike.brand}
                      {bike.model && ` ${bike.model}`}
                    </Text>
                  </View>
                </View>
              )}

              <View className="flex-row items-start gap-4">
                <Icon name="speed" size={20} color="mutedForeground" />
                <View className="flex-1">
                  <Text variant="small" className="text-muted-foreground mb-1">
                    Total Distance
                  </Text>
                  <Text>{bike.total_kilometrage.toFixed(1)} mi</Text>
                </View>
              </View>

              {bike.purchase_date && (
                <View className="flex-row items-start gap-4">
                  <Icon name="event" size={20} color="mutedForeground" />
                  <View className="flex-1">
                    <Text variant="small" className="text-muted-foreground mb-1">
                      Purchase Date
                    </Text>
                    <Text>{new Date(bike.purchase_date).toLocaleDateString()}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Weather Details */}
            {weather && (
              <>
                <Text className="text-lg font-semibold mb-4">Weather Conditions</Text>
                <View className="gap-4">
                  <View className="flex-row items-start gap-4">
                    <Icon name="thermostat" size={20} color="mutedForeground" />
                    <View className="flex-1">
                      <Text variant="small" className="text-muted-foreground mb-1">
                        Temperature
                      </Text>
                      <Text>
                        {Math.round(weather.temperature)}°C (Feels like{' '}
                        {Math.round(weather.feelsLike)}°C)
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-start gap-4">
                    <Icon name="air" size={20} color="mutedForeground" />
                    <View className="flex-1">
                      <Text variant="small" className="text-muted-foreground mb-1">
                        Wind
                      </Text>
                      <Text>
                        {Math.round(weather.windSpeed)} km/h{' '}
                        {getWindDirection(weather.windDirection)}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-start gap-4">
                    <Icon name="water-drop" size={20} color="mutedForeground" />
                    <View className="flex-1">
                      <Text variant="small" className="text-muted-foreground mb-1">
                        Humidity
                      </Text>
                      <Text>{weather.humidity}%</Text>
                    </View>
                  </View>

                  <View className="flex-row items-start gap-4">
                    <Icon name="wb-sunny" size={20} color="mutedForeground" />
                    <View className="flex-1">
                      <Text variant="small" className="text-muted-foreground mb-1">
                        Conditions
                      </Text>
                      <Text>{weather.description}</Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </BaseSheet>
  );
};

export default InfoPillSheet;
