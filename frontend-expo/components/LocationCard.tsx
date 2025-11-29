import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  Platform,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface LocationCardProps {
  location: {
    name: string;
    display_name: string;
    lat: number;
    lon: number;
    type: string;
    mapbox_id: string;
  };
  onClose: () => void;
  onGetDirections?: () => void;
  isLoadingDirections?: boolean;
}

const LocationCard: React.FC<LocationCardProps> = ({
  location,
  onClose,
  onGetDirections,
  isLoadingDirections = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const hasGlassEffect = Platform.OS === 'ios' && isLiquidGlassAvailable();

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

  const GlassContainer = hasGlassEffect ? GlassView : View;

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (isExpanded) {
    return (
      <View style={styles.expandedContainer}>
        <GlassContainer
          style={[
            styles.expandedCard,
            !hasGlassEffect && { backgroundColor: colors.buttonBackground },
          ]}
          {...(hasGlassEffect && { glassEffectStyle: 'regular' })}
        >
          <View style={styles.expandedHeader}>
            <TouchableOpacity style={styles.backButton} onPress={handleToggleExpand}>
              <MaterialIcons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.expandedTitle, { color: colors.text }]}>Location Details</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.expandedContent} showsVerticalScrollIndicator={false}>
            <View style={styles.expandedIconContainer}>
              <View style={[styles.expandedIconCircle, { backgroundColor: colors.locationPuck }]}>
                <MaterialIcons
                  name={getIconForFeatureType(location.type)}
                  size={48}
                  color="white"
                />
              </View>
            </View>

            <Text style={[styles.expandedName, { color: colors.text }]}>{location.name}</Text>
            <Text style={[styles.expandedAddress, { color: colors.text + 'CC' }]}>
              {location.display_name}
            </Text>

            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <MaterialIcons name="place" size={20} color={colors.text + 'CC'} />
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailLabel, { color: colors.text + '99' }]}>
                    Coordinates
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <MaterialIcons name="category" size={20} color={colors.text + 'CC'} />
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailLabel, { color: colors.text + '99' }]}>Type</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {location.type.charAt(0).toUpperCase() + location.type.slice(1)}
                  </Text>
                </View>
              </View>
            </View>

            {onGetDirections && (
              <TouchableOpacity
                style={[styles.directionsButton, { backgroundColor: colors.locationPuck }]}
                onPress={onGetDirections}
                disabled={isLoadingDirections}
              >
                {isLoadingDirections ? (
                  <View style={styles.directionsButtonContent}>
                    <MaterialIcons name="hourglass-empty" size={20} color="white" />
                    <Text style={styles.directionsButtonText}>Calculating...</Text>
                  </View>
                ) : (
                  <View style={styles.directionsButtonContent}>
                    <MaterialIcons name="directions" size={20} color="white" />
                    <Text style={styles.directionsButtonText}>Get Directions</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </GlassContainer>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handleToggleExpand} activeOpacity={0.9}>
      <GlassContainer
        style={[styles.card, !hasGlassEffect && { backgroundColor: colors.buttonBackground }]}
        {...(hasGlassEffect && { glassEffectStyle: 'regular' })}
      >
        <View style={styles.content}>
          <MaterialIcons
            name={getIconForFeatureType(location.type)}
            size={24}
            color={colors.text}
          />
          <View style={styles.textContainer}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {location.name}
            </Text>
            <Text style={[styles.address, { color: colors.text + 'CC' }]} numberOfLines={1}>
              {location.display_name}
            </Text>
          </View>
          {onGetDirections && (
            <TouchableOpacity
              style={styles.directionsIconButton}
              onPress={(e) => {
                e.stopPropagation();
                onGetDirections();
              }}
              disabled={isLoadingDirections}
            >
              <MaterialIcons
                name={isLoadingDirections ? 'hourglass-empty' : 'directions'}
                size={20}
                color={colors.text}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <MaterialIcons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </GlassContainer>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 64,
    zIndex: 999,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  address: {
    fontSize: 13,
  },
  closeButton: {
    padding: 4,
  },
  expandedContainer: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 64,
    bottom: 120,
    zIndex: 100,
  },
  expandedCard: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  expandedTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  expandedContent: {
    flex: 1,
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
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  directionsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  directionsIconButton: {
    padding: 4,
    marginRight: 4,
  },
});

export default LocationCard;
