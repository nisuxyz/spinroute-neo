import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import BaseSheet, { BaseSheetRef } from './BaseSheet';
import type { DirectionsResponse } from '@/hooks/use-directions';
import { formatDistance, formatDuration } from '@/utils/format-route';
import { useProviderProfiles, type ProfileMetadata } from '@/hooks/use-provider-profiles';

/**
 * Props for RouteInfoSheet component
 */
export interface RouteInfoSheetProps {
  visible: boolean;
  route: DirectionsResponse | null;
  loading: boolean;
  error: string | null;
  /** Provider-specific profile ID (e.g., "cycling-road", "foot-walking") */
  profile: string;
  units: 'metric' | 'imperial';
  onClearRoute: () => void;
  onRecalculate?: (provider?: string, profile?: string) => void;
}

/**
 * RouteInfoSheet - Displays calculated route information in a bottom sheet
 *
 * Features:
 * - Collapsed state: Shows distance, duration, and profile icon
 * - Expanded state: Shows turn-by-turn instructions in a scrollable list
 * - Recalculate: Opens RoutePreferencesSheet for profile selection
 * - Close: Dismisses sheet and clears route
 *
 * Detents:
 * - Collapsed: 'auto' (~100px)
 * - Expanded: 0.85 (85% screen height)
 *
 * Validates Requirements: 6.1, 6.2, 6.3, 6.4
 */
const RouteInfoSheet: React.FC<RouteInfoSheetProps> = ({
  visible,
  route,
  loading,
  error,
  profile,
  units,
  onClearRoute,
  onRecalculate,
}) => {
  const sheetRef = useRef<BaseSheetRef>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isExpanded, setIsExpanded] = useState(false);

  // Get the current provider from route data
  const currentProvider = route?.provider || 'openrouteservice';

  // Fetch profiles for the current provider to get metadata
  const { profiles } = useProviderProfiles(currentProvider);

  // Find the profile metadata for the current profile
  const profileMetadata = useMemo((): ProfileMetadata | null => {
    if (!profile || profiles.length === 0) return null;
    return profiles.find((p) => p.id === profile) || null;
  }, [profile, profiles]);

  // Present/dismiss sheet based on visible prop
  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  // Handle sheet dismissal
  const handleDismiss = () => {
    setIsExpanded(false);
    onClearRoute();
  };

  // Handle detent changes
  const handleDetentChange = (index: number) => {
    setIsExpanded(index > 0);
  };

  /**
   * Get the icon for the current profile from metadata or fallback based on profile string
   */
  const getProfileIcon = (): keyof typeof MaterialIcons.glyphMap => {
    // Use metadata if available
    if (profileMetadata?.icon) {
      const iconMap: Record<string, keyof typeof MaterialIcons.glyphMap> = {
        'directions-bike': 'directions-bike',
        'directions-walk': 'directions-walk',
        'directions-car': 'directions-car',
        'local-shipping': 'local-shipping',
        terrain: 'terrain',
        'electric-bike': 'electric-bike',
        hiking: 'hiking',
        accessible: 'accessible',
        traffic: 'traffic',
        directions: 'directions',
        'directions-transit': 'directions-transit',
      };
      return iconMap[profileMetadata.icon] || 'directions';
    }

    // Fallback: infer from profile string
    if (profile.includes('walk') || profile.includes('foot') || profile.includes('hiking')) {
      return 'directions-walk';
    }
    if (profile.includes('cycling') || profile.includes('bike')) {
      return 'directions-bike';
    }
    if (profile.includes('driving') || profile.includes('car')) {
      return 'directions-car';
    }
    if (profile.includes('wheelchair') || profile.includes('accessible')) {
      return 'accessible';
    }
    return 'directions';
  };

  /**
   * Get the label for the current profile from metadata or fallback
   */
  const getProfileLabel = (): string => {
    // Use metadata title if available
    if (profileMetadata?.title) {
      return profileMetadata.title;
    }

    // Fallback: format the profile string
    if (!profile) return 'Route';

    // Convert profile ID to readable label (e.g., "cycling-road" -> "Cycling Road")
    return profile
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  /**
   * Get appropriate icon for maneuver type
   */
  const getManeuverIcon = (
    type: string,
    modifier?: string,
  ): keyof typeof MaterialIcons.glyphMap => {
    switch (type) {
      case 'turn':
        if (modifier === 'slight left' || modifier === 'sharp left') {
          return 'turn-left';
        }
        if (modifier === 'slight right' || modifier === 'sharp right') {
          return 'turn-slight-right';
        }
        if (modifier?.includes('left')) {
          return 'turn-left';
        }
        if (modifier?.includes('right')) {
          return 'turn-right';
        }
        return 'straight';
      case 'new name':
        return 'straight';
      case 'depart':
        return 'trip-origin';
      case 'arrive':
        return 'place';
      case 'merge':
        return 'merge';
      case 'on ramp':
      case 'off ramp':
        return 'fork-right';
      case 'fork':
        return modifier?.includes('left') ? 'fork-left' : 'fork-right';
      case 'end of road':
        if (modifier?.includes('left')) {
          return 'turn-left';
        }
        if (modifier?.includes('right')) {
          return 'turn-right';
        }
        return 'straight';
      case 'continue':
        return 'straight';
      case 'roundabout':
      case 'rotary':
      case 'roundabout turn':
        return 'rotate-right';
      case 'notification':
        return 'info';
      case 'exit roundabout':
      case 'exit rotary':
        return 'exit-to-app';
      default:
        return 'navigation';
    }
  };

  // Determine detents based on state
  const detents: ('auto' | number)[] = loading || error ? ['auto'] : [0.2, 0.85];

  return (
    <BaseSheet
      ref={sheetRef}
      name="RouteInfoSheet"
      detents={detents}
      initialDetentIndex={0}
      onDismiss={handleDismiss}
      onDetentChange={handleDetentChange}
      scrollable={!loading && !error}
      dimmed={false}
    >
      {loading && (
        <View style={styles.loadingContent}>
          <ActivityIndicator size="small" color={colors.text} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Calculating route...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContent}>
          <MaterialIcons name="error-outline" size={24} color={colors.text} />
          <View style={styles.errorTextContainer}>
            <Text style={[styles.errorTitle, { color: colors.text }]}>Route Error</Text>
            <Text style={[styles.errorMessage, { color: colors.text + 'CC' }]}>{error}</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
            <MaterialIcons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {!loading &&
        !error &&
        route &&
        route.routes &&
        route.routes.length > 0 &&
        (() => {
          const mainRoute = route.routes[0];
          const distance = formatDistance(mainRoute.distance, units);
          const duration = formatDuration(mainRoute.duration);
          const allSteps = mainRoute.legs?.flatMap((leg) => leg.steps) || [];

          return (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              scrollEnabled={isExpanded}
            >
              {!isExpanded ? (
                // Collapsed view - Shows distance, duration, profile icon
                <View style={styles.collapsedContent}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: Colors[colorScheme ?? 'light'].buttonIcon },
                    ]}
                  >
                    <MaterialIcons name={getProfileIcon()} size={24} color="white" />
                  </View>
                  <View style={styles.infoContainer}>
                    <View style={styles.profileRow}>
                      <Text style={[styles.profileLabel, { color: colors.text + '99' }]}>
                        {getProfileLabel()}
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
                  <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
                    <MaterialIcons name="close" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
              ) : (
                // Expanded view - Shows turn-by-turn instructions
                <View style={styles.expandedContentWrapper}>
                  <View style={styles.expandedHeader}>
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
                          styles.recalculateButton,
                          { backgroundColor: Colors[colorScheme ?? 'light'].buttonIcon },
                        ]}
                        onPress={() => onRecalculate()}
                      >
                        <MaterialIcons name="tune" size={20} color="white" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
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
                      <MaterialIcons name={getProfileIcon()} size={32} color="white" />
                    </View>
                    <View style={styles.summaryInfo}>
                      <Text style={[styles.summaryLabel, { color: colors.text + '99' }]}>
                        {getProfileLabel()}
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
                          {index < allSteps.length - 1 && (
                            <View
                              style={[
                                styles.instructionLine,
                                { backgroundColor: colors.text + '33' },
                              ]}
                            />
                          )}
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
                            <Text
                              style={[styles.instructionDistance, { color: colors.text + '99' }]}
                            >
                              {formatDistance(step.distance, units)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>

                  {route.warnings && route.warnings.length > 0 && (
                    <View style={[styles.expandedWarning, { backgroundColor: colors.text + '1A' }]}>
                      <MaterialIcons name="info-outline" size={16} color={colors.text + '99'} />
                      <Text style={[styles.expandedWarningText, { color: colors.text + '99' }]}>
                        {route.warnings[0]}
                      </Text>
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
    padding: Spacing.lg,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: Spacing.lg,
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
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
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
  recalculateButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: BorderRadius.md,
    marginTop: 12,
  },
  expandedWarningText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
});

export default RouteInfoSheet;
