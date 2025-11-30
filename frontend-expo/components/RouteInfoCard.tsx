import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  Platform,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { DirectionsResponse } from '@/hooks/use-directions';
import { RouteProfile } from '@/hooks/use-directions';
import RoutePreferencesCard from './RoutePreferencesCard';
import { useUserSettings } from '@/hooks/use-user-settings';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RouteInfoCardProps {
  route: DirectionsResponse | null;
  loading: boolean;
  error: string | null;
  profile: RouteProfile;
  units: 'metric' | 'imperial';
  onClearRoute: () => void;
  onRecalculate?: (provider?: string, profile?: RouteProfile) => void;
}

const RouteInfoCard: React.FC<RouteInfoCardProps> = ({
  route,
  loading,
  error,
  profile,
  units,
  onClearRoute,
  onRecalculate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const { settings } = useUserSettings();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const hasGlassEffect = Platform.OS === 'ios' && isLiquidGlassAvailable();

  const GlassContainer = hasGlassEffect ? GlassView : View;

  const handleRecalculateClick = () => {
    setShowPreferences(true);
  };

  const handleConfirmRecalculate = () => {
    if (onRecalculate) {
      setTimeout(() => onRecalculate(), 300);
    }
  };

  const formatDistance = (meters: number): string => {
    if (units === 'imperial') {
      const miles = meters * 0.000621371;
      return miles < 0.1 ? `${Math.round(meters * 3.28084)} ft` : `${miles.toFixed(1)} mi`;
    }
    return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getProfileIcon = (prof: RouteProfile): any => {
    switch (prof) {
      case RouteProfile.WALKING:
        return 'directions-walk';
      case RouteProfile.CYCLING:
        return 'directions-bike';
      case RouteProfile.DRIVING:
        return 'directions-car';
      case RouteProfile.PUBLIC_TRANSPORT:
        return 'directions-transit';
      default:
        return 'directions';
    }
  };

  const getProfileLabel = (prof: RouteProfile): string => {
    switch (prof) {
      case RouteProfile.WALKING:
        return 'Walking';
      case RouteProfile.CYCLING:
        return 'Cycling';
      case RouteProfile.DRIVING:
        return 'Driving';
      case RouteProfile.PUBLIC_TRANSPORT:
        return 'Transit';
      default:
        return 'Route';
    }
  };

  const getManeuverIcon = (type: string, modifier?: string): any => {
    // Map maneuver types to Material Icons
    let icon: string;
    switch (type) {
      case 'turn':
        if (modifier === 'slight left' || modifier === 'sharp left') {
          icon = 'turn-left';
        } else if (modifier === 'slight right' || modifier === 'sharp right') {
          icon = 'turn-slight-right';
        } else if (modifier?.includes('left')) {
          icon = 'turn-left';
        } else if (modifier?.includes('right')) {
          icon = 'turn-right';
        } else {
          icon = 'straight';
        }
        break;
      case 'new name':
        icon = 'straight';
        break;
      case 'depart':
        icon = 'trip-origin';
        break;
      case 'arrive':
        icon = 'place';
        break;
      case 'merge':
        icon = 'merge';
        break;
      case 'on ramp':
      case 'off ramp':
        icon = 'fork-right';
        break;
      case 'fork':
        if (modifier?.includes('left')) {
          icon = 'fork-left';
        } else {
          icon = 'fork-right';
        }
        break;
      case 'end of road':
        // At end of road, turn left or right
        if (modifier?.includes('left')) {
          icon = 'turn-left';
        } else if (modifier?.includes('right')) {
          icon = 'turn-right';
        } else {
          icon = 'straight';
        }
        break;
      case 'continue':
        icon = 'straight';
        break;
      case 'roundabout':
      case 'rotary':
        icon = 'rotate-right';
        break;
      case 'roundabout turn':
        icon = 'rotate-right';
        break;
      case 'notification':
        icon = 'info';
        break;
      case 'exit roundabout':
      case 'exit rotary':
        icon = 'exit-to-app';
        break;
      default:
        // Log unknown maneuver types for future improvements
        if (__DEV__) {
          console.warn(
            `[RouteInfoCard] Unknown maneuver type: "${type}" with modifier: "${modifier}"`,
          );
        }
        icon = 'navigation';
    }

    return icon;
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <GlassContainer
          style={[styles.card, !hasGlassEffect && { backgroundColor: colors.buttonBackground }]}
          {...(hasGlassEffect && { glassEffectStyle: 'regular' })}
        >
          <View style={styles.loadingContent}>
            <ActivityIndicator size="small" color={colors.text} />
            <Text style={[styles.loadingText, { color: colors.text }]}>Calculating route...</Text>
          </View>
        </GlassContainer>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <GlassContainer
          style={[styles.card, !hasGlassEffect && { backgroundColor: colors.buttonBackground }]}
          {...(hasGlassEffect && { glassEffectStyle: 'regular' })}
        >
          <View style={styles.errorContent}>
            <MaterialIcons name="error-outline" size={24} color={colors.text} />
            <View style={styles.errorTextContainer}>
              <Text style={[styles.errorTitle, { color: colors.text }]}>Route Error</Text>
              <Text style={[styles.errorMessage, { color: colors.text + 'CC' }]}>{error}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClearRoute}>
              <MaterialIcons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </GlassContainer>
      </View>
    );
  }

  if (!route || !route.routes || route.routes.length === 0) {
    return null;
  }

  const mainRoute = route.routes[0];
  const distance = formatDistance(mainRoute.distance);
  const duration = formatDuration(mainRoute.duration);

  // Collect all steps from all legs
  const allSteps = mainRoute.legs?.flatMap((leg) => leg.steps) || [];

  // Render preferences card separately so it's always available
  const renderPreferencesCard = () => (
    <RoutePreferencesCard
      visible={showPreferences}
      onClose={() => setShowPreferences(false)}
      onConfirm={handleConfirmRecalculate}
      mode="recalculate"
    />
  );

  // Expanded view with turn-by-turn instructions
  if (isExpanded) {
    return (
      <>
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
              <View style={styles.expandedTitleContainer}>
                <Text style={[styles.expandedTitle, { color: colors.text }]}>Directions</Text>
                {route.provider && (
                  <Text style={[styles.expandedProviderLabel, { color: colors.text + '66' }]}>
                    via{' '}
                    {route.provider.charAt(0).toUpperCase() +
                      route.provider.slice(1).replace('-', ' ')}
                  </Text>
                )}
              </View>
              {onRecalculate && (
                <TouchableOpacity
                  style={[
                    styles.quickSwitcherButton,
                    { backgroundColor: Colors[colorScheme ?? 'light'].buttonIcon },
                  ]}
                  onPress={handleRecalculateClick}
                >
                  <MaterialIcons name="tune" size={20} color="white" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeButton} onPress={onClearRoute}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Route Summary */}
            <View style={styles.expandedSummary}>
              <View
                style={[
                  styles.summaryIconCircle,
                  { backgroundColor: Colors[colorScheme ?? 'light'].buttonIcon },
                ]}
              >
                <MaterialIcons name={getProfileIcon(profile)} size={32} color="white" />
              </View>
              <View style={styles.summaryInfo}>
                <Text style={[styles.summaryLabel, { color: colors.text + '99' }]}>
                  {getProfileLabel(profile)}
                </Text>
                <View style={styles.summaryStats}>
                  <View style={styles.summaryStat}>
                    <MaterialIcons name="straighten" size={18} color={colors.text + 'CC'} />
                    <Text style={[styles.summaryStatValue, { color: colors.text }]}>
                      {distance}
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.summaryStat}>
                    <MaterialIcons name="schedule" size={18} color={colors.text + 'CC'} />
                    <Text style={[styles.summaryStatValue, { color: colors.text }]}>
                      {duration}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Turn-by-turn instructions */}
            <ScrollView style={styles.instructionsScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.instructionsContainer}>
                {allSteps.map((step, index) => (
                  <View key={index} style={styles.instructionItem}>
                    <View style={styles.instructionIconContainer}>
                      <View
                        style={[
                          styles.instructionIconCircle,
                          { backgroundColor: Colors[colorScheme ?? 'light'].buttonIcon },
                        ]}
                      >
                        <MaterialIcons
                          name={getManeuverIcon(step.maneuver.type, step.maneuver.modifier)}
                          size={20}
                          color="white"
                        />
                      </View>
                      {index < allSteps.length - 1 && <View style={styles.instructionLine} />}
                    </View>
                    <View style={styles.instructionContent}>
                      <Text style={[styles.instructionText, { color: colors.text }]}>
                        {step.maneuver.instruction}
                      </Text>
                      <View style={styles.instructionMeta}>
                        {step.name && (
                          <Text style={[styles.instructionRoad, { color: colors.text + 'CC' }]}>
                            {step.name}
                          </Text>
                        )}
                        <Text style={[styles.instructionDistance, { color: colors.text + '99' }]}>
                          {formatDistance(step.distance)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            {route.warnings && route.warnings.length > 0 && (
              <View style={styles.expandedWarning}>
                <MaterialIcons name="info-outline" size={16} color={colors.text + '99'} />
                <Text style={[styles.expandedWarningText, { color: colors.text + '99' }]}>
                  {route.warnings[0]}
                </Text>
              </View>
            )}
          </GlassContainer>
        </View>
        {renderPreferencesCard()}
      </>
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
              <MaterialIcons name={getProfileIcon(profile)} size={24} color="white" />
            </View>
            <View style={styles.infoContainer}>
              <View style={styles.profileRow}>
                <Text style={[styles.profileLabel, { color: colors.text + '99' }]}>
                  {getProfileLabel(profile)}
                </Text>
                {route.provider && (
                  <Text style={[styles.providerLabel, { color: colors.text + '66' }]}>
                    via{' '}
                    {route.provider.charAt(0).toUpperCase() +
                      route.provider.slice(1).replace('-', ' ')}
                  </Text>
                )}
              </View>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <MaterialIcons name="straighten" size={16} color={colors.text + 'CC'} />
                  <Text style={[styles.statValue, { color: colors.text }]}>{distance}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <MaterialIcons name="schedule" size={16} color={colors.text + 'CC'} />
                  <Text style={[styles.statValue, { color: colors.text }]}>{duration}</Text>
                </View>
              </View>
              {route.warnings && route.warnings.length > 0 && (
                <View style={styles.warningContainer}>
                  <MaterialIcons name="info-outline" size={14} color={colors.text + '99'} />
                  <Text
                    style={[styles.warningText, { color: colors.text + '99' }]}
                    numberOfLines={2}
                  >
                    {route.warnings[0]}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={(e) => {
                e.stopPropagation();
                onClearRoute();
              }}
            >
              <MaterialIcons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </GlassContainer>
      </TouchableOpacity>
      {renderPreferencesCard()}
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
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  profileLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  providerLabel: {
    fontSize: 10,
    fontWeight: '500',
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
    marginTop: 8,
  },
  warningText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 14,
  },
  closeButton: {
    padding: 4,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 13,
    lineHeight: 18,
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
    marginBottom: 20,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  expandedTitleContainer: {
    flex: 1,
  },
  expandedTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  expandedProviderLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  expandedSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  summaryIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  instructionsScroll: {
    flex: 1,
  },
  instructionsContainer: {
    paddingBottom: 20,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  instructionIconContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  instructionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: 8,
  },
  instructionContent: {
    flex: 1,
    paddingTop: 4,
  },
  instructionText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 20,
  },
  instructionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  instructionRoad: {
    fontSize: 13,
    fontWeight: '500',
  },
  instructionDistance: {
    fontSize: 12,
    fontWeight: '600',
  },
  expandedWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 12,
  },
  expandedWarningText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  quickSwitcherButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RouteInfoCard;
