import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spacing, Typography, BorderRadius, CardStyles } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import BaseSheet, { BaseSheetRef } from './BaseSheet';
import RecordingIndicator from './RecordingIndicator';
import type { Bike } from '@/hooks/use-bikes';

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

const bikeTypeIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
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
 * - Collapsed: 'auto' (~120px)
 * - Expanded: 0.6 (60% screen height)
 */
const InfoPillSheet: React.FC<InfoPillSheetProps> = ({
  visible,
  bike,
  weather,
  isRecording = false,
  onClose,
}) => {
  const sheetRef = useRef<BaseSheetRef>(null);
  const textColor = useThemeColor({}, 'text');
  const buttonIcon = useThemeColor({}, 'buttonIcon');
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        scrollEnabled={isExpanded}
      >
        {!isExpanded ? (
          // Collapsed view - Shows bike name, type, and basic info
          <View style={styles.collapsedContent}>
            <View style={[styles.iconCircle, { backgroundColor: bikeColor }]}>
              <MaterialIcons name={icon} size={24} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text
                  style={[Typography.h3, { marginBottom: 2, color: textColor }]}
                  numberOfLines={1}
                >
                  {bike.name}
                </Text>
                {isRecording && <RecordingIndicator size={8} />}
              </View>
              <Text style={[{ fontSize: 13, color: textColor + 'CC' }]} numberOfLines={1}>
                {bikeTypeLabel}
                {weather && ` • ${Math.round(weather.temperature)}°C`}
              </Text>
            </View>
            <TouchableOpacity style={{ padding: 4 }} onPress={handleClosePress}>
              <MaterialIcons name="close" size={20} color={textColor} />
            </TouchableOpacity>
          </View>
        ) : (
          // Expanded view - Shows full details
          <View style={{ padding: Spacing.lg }}>
            <View style={styles.expandedHeader}>
              <View style={{ display: 'flex', flexDirection: 'row', gap: Spacing.md }}>
                <Text style={[Typography.h2, { color: textColor }]}>Ride Details</Text>
                {isRecording && (
                  <View style={styles.recordingBadge}>
                    <MaterialIcons name="fiber-manual-record" size={12} color="#ef4444" />
                    <Text style={[Typography.label, { color: '#ef4444', marginLeft: 4 }]}>
                      Recording
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={{ padding: 4 }} onPress={handleClosePress}>
                <MaterialIcons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            {/* Bike Icon */}
            <View style={{ alignItems: 'center', marginBottom: Spacing.xxl }}>
              <View style={[styles.expandedIconCircle, { backgroundColor: bikeColor }]}>
                <MaterialIcons name={icon} size={48} color="white" />
              </View>
            </View>

            {/* Bike Name & Recording Status */}
            <View style={{ alignItems: 'center', marginBottom: Spacing.xxxl }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <Text style={[Typography.displayLarge, { textAlign: 'center', color: textColor }]}>
                  {bike.name}
                </Text>
                {/* {isRecording && <View style={styles.recordingDotLarge} />} */}
              </View>
              <Text
                style={[
                  Typography.bodyLarge,
                  { textAlign: 'center', marginTop: Spacing.xs, color: textColor + 'CC' },
                ]}
              >
                {bikeTypeLabel}
              </Text>
            </View>

            {/* Bike Details */}
            <View style={{ gap: Spacing.lg, marginBottom: Spacing.xxxl }}>
              {bike.brand && (
                <View
                  style={[
                    CardStyles.detailRow,
                    { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
                  ]}
                >
                  <MaterialIcons name="business" size={20} color={textColor + 'CC'} />
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.label, { marginBottom: 4, color: textColor + '99' }]}>
                      Brand
                    </Text>
                    <Text style={[Typography.bodyLarge, { color: textColor }]}>
                      {bike.brand}
                      {bike.model && ` ${bike.model}`}
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
                <MaterialIcons name="speed" size={20} color={textColor + 'CC'} />
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.label, { marginBottom: 4, color: textColor + '99' }]}>
                    Total Distance
                  </Text>
                  <Text style={[Typography.bodyLarge, { color: textColor }]}>
                    {bike.total_kilometrage.toFixed(1)} mi
                  </Text>
                </View>
              </View>

              {bike.purchase_date && (
                <View
                  style={[
                    CardStyles.detailRow,
                    { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
                  ]}
                >
                  <MaterialIcons name="event" size={20} color={textColor + 'CC'} />
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.label, { marginBottom: 4, color: textColor + '99' }]}>
                      Purchase Date
                    </Text>
                    <Text style={[Typography.bodyLarge, { color: textColor }]}>
                      {new Date(bike.purchase_date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Weather Details */}
            {weather && (
              <>
                <Text style={[Typography.h3, { marginBottom: Spacing.lg, color: textColor }]}>
                  Weather Conditions
                </Text>
                <View style={{ gap: Spacing.lg }}>
                  <View
                    style={[
                      CardStyles.detailRow,
                      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
                    ]}
                  >
                    <MaterialIcons name="thermostat" size={20} color={textColor + 'CC'} />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[Typography.label, { marginBottom: 4, color: textColor + '99' }]}
                      >
                        Temperature
                      </Text>
                      <Text style={[Typography.bodyLarge, { color: textColor }]}>
                        {Math.round(weather.temperature)}°C (Feels like{' '}
                        {Math.round(weather.feelsLike)}°C)
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      CardStyles.detailRow,
                      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
                    ]}
                  >
                    <MaterialIcons name="air" size={20} color={textColor + 'CC'} />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[Typography.label, { marginBottom: 4, color: textColor + '99' }]}
                      >
                        Wind
                      </Text>
                      <Text style={[Typography.bodyLarge, { color: textColor }]}>
                        {Math.round(weather.windSpeed)} km/h{' '}
                        {getWindDirection(weather.windDirection)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      CardStyles.detailRow,
                      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
                    ]}
                  >
                    <MaterialIcons name="water-drop" size={20} color={textColor + 'CC'} />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[Typography.label, { marginBottom: 4, color: textColor + '99' }]}
                      >
                        Humidity
                      </Text>
                      <Text style={[Typography.bodyLarge, { color: textColor }]}>
                        {weather.humidity}%
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      CardStyles.detailRow,
                      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
                    ]}
                  >
                    <MaterialIcons name="wb-sunny" size={20} color={textColor + 'CC'} />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[Typography.label, { marginBottom: 4, color: textColor + '99' }]}
                      >
                        Conditions
                      </Text>
                      <Text style={[Typography.bodyLarge, { color: textColor }]}>
                        {weather.description}
                      </Text>
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

  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    // marginTop: Spacing.sm,
  },
});

export default InfoPillSheet;
