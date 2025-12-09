import React, { useRef, useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BaseSheet, { BaseSheetRef } from './BaseSheet';
import GetDirectionsButton from './GetDirectionsButton';
import { Text } from './ui/text';
import { Button } from './ui/button';
import { Icon } from './icon';

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
  const getIconForFeatureType = (type: string): keyof typeof MaterialIcons.glyphMap => {
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
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          scrollEnabled={isExpanded}
        >
          {!isExpanded ? (
            // Collapsed view - Shows location name and address
            <View className="flex-row items-center gap-3 p-4">
              <View className="w-12 h-12 rounded-full bg-primary items-center justify-center">
                <Icon
                  name={getIconForFeatureType(preservedLocation.type)}
                  size={24}
                  color="primaryForeground"
                />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-base mb-1" numberOfLines={1}>
                  {preservedLocation.name}
                </Text>
                <Text variant="small" className="text-muted-foreground" numberOfLines={1}>
                  {preservedLocation.display_name}
                </Text>
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
            // Expanded view - Shows full location details
            <View className="p-4">
              {/* Header */}
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-semibold">Location Details</Text>
                <Button variant="ghost" size="sm" onPress={handleClosePress}>
                  <Text className="text-base text-muted-foreground">Close</Text>
                </Button>
              </View>

              {/* Location Icon */}
              <View className="items-center mb-8">
                <View className="w-24 h-24 rounded-full bg-primary items-center justify-center">
                  <Icon
                    name={getIconForFeatureType(preservedLocation.type)}
                    size={48}
                    color="primaryForeground"
                  />
                </View>
              </View>

              {/* Location Name & Address */}
              <Text className="text-2xl font-bold text-center mb-2">{preservedLocation.name}</Text>
              <Text className="text-center text-muted-foreground mb-8">
                {preservedLocation.display_name}
              </Text>

              {/* Location Details */}
              <View className="gap-4">
                {/* Coordinates */}
                <View className="flex-row items-start gap-4">
                  <Icon name="place" size={20} color="mutedForeground" />
                  <View className="flex-1">
                    <Text variant="small" className="text-muted-foreground mb-1">
                      Coordinates
                    </Text>
                    <Text>
                      {preservedLocation.lat.toFixed(6)}, {preservedLocation.lon.toFixed(6)}
                    </Text>
                  </View>
                </View>

                {/* Type */}
                <View className="flex-row items-start gap-4">
                  <Icon name="category" size={20} color="mutedForeground" />
                  <View className="flex-1">
                    <Text variant="small" className="text-muted-foreground mb-1">
                      Type
                    </Text>
                    <Text>
                      {preservedLocation.type.charAt(0).toUpperCase() +
                        preservedLocation.type.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Get Directions Button */}
              {onGetDirections && (
                <View className="mt-8 mb-8">
                  <GetDirectionsButton onPress={onGetDirections} isLoading={isLoadingDirections} />
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </BaseSheet>
  );
};

export default LocationSheet;
