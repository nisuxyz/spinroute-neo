import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, useColorScheme, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/constants/theme';
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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
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
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: Colors[colorScheme ?? 'light'].buttonIcon },
                ]}
              >
                <MaterialIcons
                  name={getIconForFeatureType(preservedLocation.type)}
                  size={24}
                  color="white"
                />
              </View>
              <View style={styles.infoContainer}>
                <Text style={[styles.locationName, { color: colors.text }]} numberOfLines={1}>
                  {preservedLocation.name}
                </Text>
                <Text
                  style={[styles.locationAddress, { color: colors.text + 'CC' }]}
                  numberOfLines={1}
                >
                  {preservedLocation.display_name}
                </Text>
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
              <TouchableOpacity style={styles.closeButton} onPress={handleClosePress}>
                <MaterialIcons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          ) : (
            // Expanded view - Shows full location details
            <View style={styles.expandedContentWrapper}>
              <View style={styles.expandedHeader}>
                <Text style={[styles.expandedTitle, { color: colors.text }]}>Location Details</Text>
                <TouchableOpacity style={styles.closeButton} onPress={handleClosePress}>
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
                  <MaterialIcons
                    name={getIconForFeatureType(preservedLocation.type)}
                    size={48}
                    color="white"
                  />
                </View>
              </View>

              <Text style={[styles.expandedName, { color: colors.text }]}>
                {preservedLocation.name}
              </Text>
              <Text style={[styles.expandedAddress, { color: colors.text + 'CC' }]}>
                {preservedLocation.display_name}
              </Text>

              {/* Location Details */}
              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <MaterialIcons name="place" size={20} color={colors.text + 'CC'} />
                  <View style={styles.detailTextContainer}>
                    <Text style={[styles.detailLabel, { color: colors.text + '99' }]}>
                      Coordinates
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {preservedLocation.lat.toFixed(6)}, {preservedLocation.lon.toFixed(6)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <MaterialIcons name="category" size={20} color={colors.text + 'CC'} />
                  <View style={styles.detailTextContainer}>
                    <Text style={[styles.detailLabel, { color: colors.text + '99' }]}>Type</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
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
                  style={styles.directionsButton}
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
  locationName: {
    ...Typography.h3,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 13,
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

export default LocationSheet;
