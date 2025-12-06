import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spacing, Typography, BorderRadius, CardStyles } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import BaseSheet, { BaseSheetRef } from './BaseSheet';
import GetDirectionsButton from './GetDirectionsButton';

/**
 * Location data interface matching the design document
 */
export interface LocationData {
  name: string;
  display_name: string;
  lat: number;
  lon: number;
  type: string;
  mapbox_id: string;
}

/**
 * Props for LocationSheet component
 */
export interface LocationSheetProps {
  visible: boolean;
  location: LocationData | null;
  onClose: () => void;
  onGetDirections?: () => void;
  isLoadingDirections?: boolean;
}

/**
 * LocationSheet - Displays search result location information in a bottom sheet
 *
 * Features:
 * - Collapsed state: Shows location name and address
 * - Expanded state: Shows full location details including coordinates and type
 * - Get Directions: Triggers route preferences selection
 *
 * Detents:
 * - Collapsed: 'auto' (~100px)
 * - Expanded: 0.5 (50% screen height)
 *
 * Validates Requirements: 5.1, 5.2, 5.3
 */
const LocationSheet: React.FC<LocationSheetProps> = ({
  visible,
  location,
  onClose,
  onGetDirections,
  isLoadingDirections = false,
}) => {
  const sheetRef = useRef<BaseSheetRef>(null);
  const textColor = useThemeColor({}, 'text');
  const buttonIcon = useThemeColor({}, 'buttonIcon');
  const [isExpanded, setIsExpanded] = useState(false);

  // Preserve the last known location data to prevent race conditions during dismissal
  const [preservedLocation, setPreservedLocation] = useState<LocationData | null>(null);

  // Update preserved location when prop changes (but don't clear it when prop becomes null)
  useEffect(() => {
    if (location) {
      setPreservedLocation(location);
    }
  }, [location]);

  // Present sheet when visible becomes true
  // Don't auto-dismiss when visible becomes false - let user dismiss manually
  useEffect(() => {
    if (visible && location) {
      sheetRef.current?.present();
    }
  }, [visible, location]);

  // Called when user presses close button - triggers dismissal
  const handleClosePress = () => {
    sheetRef.current?.dismiss();
  };

  // Called after sheet is fully dismissed - cleanup and notify parent
  const handleDismiss = () => {
    setIsExpanded(false);
    // Clear preserved location data now that sheet is fully dismissed
    setPreservedLocation(null);
    // Notify parent (this will clear searchedLocation in MainMapView)
    // This happens AFTER the sheet animation completes (via onDidDismiss)
    onClose();
  };

  // Handle detent changes
  const handleDetentChange = (index: number) => {
    setIsExpanded(index > 0);
  };

  /**
   * Get appropriate icon for location type
   */
  const getIconForFeatureType = (type: string): any => {
    switch (type) {
      case 'poi':
        return 'place';
      case 'address':
        return 'home';
      case 'place':
      case 'city':
      case 'locality':
        return 'location-city';
      case 'neighborhood':
        return 'location-on';
      case 'street':
        return 'route';
      case 'postcode':
        return 'markunread-mailbox';
      case 'region':
      case 'district':
        return 'map';
      case 'country':
        return 'public';
      default:
        return 'place';
    }
  };

  return (
    <BaseSheet
      ref={sheetRef}
      name="LocationSheet"
      detents={[0.1, 0.5]}
      initialDetentIndex={0}
      onDismiss={handleDismiss}
      onDetentChange={handleDetentChange}
      scrollable={true}
      dimmed={false}
    >
      {preservedLocation && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          scrollEnabled={isExpanded}
        >
          {!isExpanded ? (
            // Collapsed view - Shows location name and address
            <View style={styles.collapsedContent}>
              <View style={[styles.iconCircle, { backgroundColor: buttonIcon }]}>
                <MaterialIcons
                  name={getIconForFeatureType(preservedLocation.type)}
                  size={24}
                  color="white"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[Typography.h3, { marginBottom: 4, color: textColor }]}
                  numberOfLines={1}
                >
                  {preservedLocation.name}
                </Text>
                <Text style={[{ fontSize: 13, color: textColor + 'CC' }]} numberOfLines={1}>
                  {preservedLocation.display_name}
                </Text>
              </View>
              {onGetDirections && !isLoadingDirections && (
                <TouchableOpacity style={{ padding: 4, marginRight: 4 }} onPress={onGetDirections}>
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
            // Expanded view - Shows full location details
            <View style={{ padding: Spacing.lg }}>
              <View style={styles.expandedHeader}>
                <Text style={[Typography.h2, { color: textColor }]}>Location Details</Text>
                <TouchableOpacity style={{ padding: 4 }} onPress={handleClosePress}>
                  <MaterialIcons name="close" size={24} color={textColor} />
                </TouchableOpacity>
              </View>

              <View style={{ alignItems: 'center', marginBottom: Spacing.xxl }}>
                <View style={[styles.expandedIconCircle, { backgroundColor: buttonIcon }]}>
                  <MaterialIcons
                    name={getIconForFeatureType(preservedLocation.type)}
                    size={48}
                    color="white"
                  />
                </View>
              </View>

              <Text
                style={[
                  Typography.displayLarge,
                  { marginBottom: Spacing.sm, textAlign: 'center', color: textColor },
                ]}
              >
                {preservedLocation.name}
              </Text>
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
                {preservedLocation.display_name}
              </Text>

              {/* Location Details */}
              <View style={{ gap: Spacing.lg }}>
                <View
                  style={[
                    CardStyles.detailRow,
                    { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
                  ]}
                >
                  <MaterialIcons name="place" size={20} color={textColor + 'CC'} />
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.label, { marginBottom: 4, color: textColor + '99' }]}>
                      Coordinates
                    </Text>
                    <Text style={[Typography.bodyLarge, { color: textColor }]}>
                      {preservedLocation.lat.toFixed(6)}, {preservedLocation.lon.toFixed(6)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    CardStyles.detailRow,
                    { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
                  ]}
                >
                  <MaterialIcons name="category" size={20} color={textColor + 'CC'} />
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.label, { marginBottom: 4, color: textColor + '99' }]}>
                      Type
                    </Text>
                    <Text style={[Typography.bodyLarge, { color: textColor }]}>
                      {preservedLocation.type.charAt(0).toUpperCase() +
                        preservedLocation.type.slice(1)}
                    </Text>
                  </View>
                </View>
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
      )}
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
});

export default LocationSheet;
