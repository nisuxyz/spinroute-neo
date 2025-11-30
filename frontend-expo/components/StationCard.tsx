import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  Platform,
  ScrollView,
} from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

import RoutePreferencesCard from './RoutePreferencesCard';
import GetDirectionsButton from './GetDirectionsButton';

interface StationCardProps {
  station: {
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
  };
  onClose: () => void;
  onGetDirections?: () => void;
  isLoadingDirections?: boolean;
}

const StationCard: React.FC<StationCardProps> = ({
  station,
  onClose,
  onGetDirections,
  isLoadingDirections = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const hasGlassEffect = Platform.OS === 'ios' && isLiquidGlassAvailable();

  const handleGetDirectionsClick = () => {
    setIsExpanded(false); // Collapse the card before showing preferences
    setShowPreferences(true);
  };

  const handleConfirmDirections = () => {
    if (onGetDirections) {
      onGetDirections();
    }
  };

  const GlassContainer = hasGlassEffect ? GlassView : View;

  const totalBikes = station.classicBikes + station.electricBikes;
  const hasClassicBikes = station.classicBikes > 0;
  const hasElectricBikes = station.electricBikes > 0;
  const hasDocks = station.availableDocks > 0;

  const getStatusColor = (): string => {
    if (totalBikes === 0) return colors.text + '66';
    if (totalBikes >= 5) return '#4CAF50';
    if (totalBikes >= 2) return '#FF9800';
    return '#F44336';
  };

  const getStatusText = (): string => {
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
            <Text style={[styles.expandedTitle, { color: colors.text }]}>Station Details</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.expandedContent} showsVerticalScrollIndicator={false}>
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

            <Text style={[styles.expandedName, { color: colors.text }]}>{station.name}</Text>
            {station.address && (
              <Text style={[styles.expandedAddress, { color: colors.text + 'CC' }]}>
                {station.address}
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
                  {station.classicBikes}
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
                  {station.electricBikes}
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
                  {station.availableDocks}
                </Text>
                <Text style={[styles.availabilityLabel, { color: colors.text + '99' }]}>Docks</Text>
              </View>
            </View>

            {/* Station Details */}
            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <MaterialIcons name="info-outline" size={20} color={colors.text + 'CC'} />
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailLabel, { color: colors.text + '99' }]}>Status</Text>
                  <Text style={[styles.detailValue, { color: getStatusColor() }]}>
                    {getStatusText()}
                  </Text>
                </View>
              </View>

              {station.capacity !== undefined && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="storage" size={20} color={colors.text + 'CC'} />
                  <View style={styles.detailTextContainer}>
                    <Text style={[styles.detailLabel, { color: colors.text + '99' }]}>
                      Capacity
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {station.capacity} docks
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
                    {formatLastReported(station.lastReported)}
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
                    {station.coordinates[1].toFixed(6)}, {station.coordinates[0].toFixed(6)}
                  </Text>
                </View>
              </View>

              {station.networkName && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="business" size={20} color={colors.text + 'CC'} />
                  <View style={styles.detailTextContainer}>
                    <Text style={[styles.detailLabel, { color: colors.text + '99' }]}>Network</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {station.networkName}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {onGetDirections && (
              <GetDirectionsButton
                onPress={handleGetDirectionsClick}
                isLoading={isLoadingDirections}
                style={styles.directionsButton}
              />
            )}
          </ScrollView>

          <RoutePreferencesCard
            visible={showPreferences}
            onClose={() => setShowPreferences(false)}
            onConfirm={handleConfirmDirections}
            mode="initial"
          />
        </GlassContainer>
      </View>
    );
  }

  // Collapsed view
  return (
    <>
      <TouchableOpacity style={styles.container} onPress={handleToggleExpand} activeOpacity={0.9}>
        <GlassContainer
          style={[styles.card, !hasGlassEffect && { backgroundColor: colors.buttonBackground }]}
          {...(hasGlassEffect && { glassEffectStyle: 'regular' })}
        >
          <View style={styles.content}>
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
                {station.name}
              </Text>
              <View style={styles.statsRow}>
                {hasClassicBikes && (
                  <View style={styles.stat}>
                    <MaterialIcons name="pedal-bike" size={16} color={colors.text + 'CC'} />
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {station.classicBikes}
                    </Text>
                  </View>
                )}
                {hasElectricBikes && (
                  <>
                    {hasClassicBikes && <View style={styles.statDivider} />}
                    <View style={styles.stat}>
                      <MaterialIcons name="electric-bike" size={16} color={colors.text + 'CC'} />
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {station.electricBikes}
                      </Text>
                    </View>
                  </>
                )}
                {hasDocks && (
                  <>
                    {(hasClassicBikes || hasElectricBikes) && <View style={styles.statDivider} />}
                    <View style={styles.stat}>
                      <MaterialIcons name="lock-open" size={16} color={colors.text + 'CC'} />
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {station.availableDocks}
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
              <TouchableOpacity
                style={styles.directionsIconButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleGetDirectionsClick();
                }}
              >
                <MaterialIcons name="directions" size={20} color={colors.text} />
              </TouchableOpacity>
            )}
            {onGetDirections && isLoadingDirections && (
              <TouchableOpacity style={styles.directionsIconButton} disabled>
                <MaterialIcons name="hourglass-empty" size={20} color={colors.text} />
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

      <RoutePreferencesCard
        visible={showPreferences}
        onClose={() => setShowPreferences(false)}
        onConfirm={handleConfirmDirections}
        mode="initial"
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
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
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 16,
    fontWeight: '700',
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
  expandedContainer: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    bottom: 120,
    zIndex: 1000,
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
  },
});

export default StationCard;
