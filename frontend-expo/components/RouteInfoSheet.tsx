import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import BaseSheet, { BaseSheetRef } from './BaseSheet';
import type { DirectionsResponse } from '@/hooks/use-directions';
import { formatDistance, formatDuration } from '@/utils/format-route';
import { useProviderProfiles, type ProfileMetadata } from '@/hooks/use-provider-profiles';
import { Text } from './ui/text';
import { Button } from './ui/button';
import { Icon } from './icon';
import { Skeleton } from './ui/skeleton';

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
  const [isExpanded, setIsExpanded] = useState(false);

  // Preserve the last known route data to prevent race conditions during dismissal
  const [preservedRoute, setPreservedRoute] = useState<DirectionsResponse | null>(null);
  const [preservedError, setPreservedError] = useState<string | null>(null);

  // Update preserved data when props change (but don't clear when props become null)
  useEffect(() => {
    if (route) {
      setPreservedRoute(route);
      setPreservedError(null);
    } else if (error) {
      setPreservedError(error);
    }
  }, [route, error]);

  // Get the current provider from preserved route data
  const currentProvider = preservedRoute?.provider || 'openrouteservice';

  // Fetch profiles for the current provider to get metadata
  const { profiles } = useProviderProfiles(currentProvider);

  // Find the profile metadata for the current profile
  const profileMetadata = useMemo((): ProfileMetadata | null => {
    if (!profile || profiles.length === 0) return null;
    return profiles.find((p) => p.id === profile) || null;
  }, [profile, profiles]);

  // Present sheet when visible becomes true
  // Don't auto-dismiss when visible becomes false - let user dismiss manually
  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    }
  }, [visible]);

  // Called when user presses close button - triggers dismissal
  const handleClosePress = () => {
    sheetRef.current?.dismiss();
  };

  // Called after sheet is fully dismissed - cleanup and notify parent
  const handleDismiss = () => {
    setIsExpanded(false);
    // Clear preserved data now that sheet is fully dismissed
    setPreservedRoute(null);
    setPreservedError(null);
    // Notify parent (this will clear selectedStation/searchedLocation in MainMapView)
    // This happens AFTER the sheet animation completes (via onDidDismiss)
    onClearRoute();
  };

  // Handle detent changes
  const handleDetentChange = (index: number) => {
    setIsExpanded(index > 0);
  };

  /**
   * Get the icon for the current profile from metadata or fallback based on profile string
   */
  const getProfileIcon = (): string => {
    // Use metadata if available
    if (profileMetadata?.icon) {
      return profileMetadata.icon;
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
  const getManeuverIcon = (type: string, modifier?: string): string => {
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

  return (
    <BaseSheet
      ref={sheetRef}
      name="RouteInfoSheet"
      detents={[0.1, 0.45, 0.9]}
      initialDetentIndex={0}
      onDismiss={handleDismiss}
      onDetentChange={handleDetentChange}
      scrollable={!loading && !preservedError}
      dimmed={false}
    >
      {loading && (
        <View className="flex-row items-center gap-3 p-4">
          <View className="gap-3 flex-1">
            {[1, 2].map((i) => (
              <View key={i} className="flex-row items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <View className="flex-1 gap-2">
                  <Skeleton className="w-24 h-4 rounded" />
                  <Skeleton className="w-32 h-3 rounded" />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {preservedError && (
        <View className="flex-row items-start gap-3 p-4">
          <Icon name="error-outline" size={24} color="foreground" />
          <View className="flex-1">
            <Text className="font-bold mb-1">Route Error</Text>
            <Text className="text-muted-foreground">{preservedError}</Text>
          </View>
          <Button variant="ghost" size="sm" onPress={handleClosePress}>
            <Text className="text-base text-muted-foreground">Close</Text>
          </Button>
        </View>
      )}

      {!loading &&
        !preservedError &&
        preservedRoute &&
        preservedRoute.routes &&
        preservedRoute.routes.length > 0 &&
        (() => {
          const mainRoute = preservedRoute.routes[0];
          const distance = formatDistance(mainRoute.distance, units);
          const duration = formatDuration(mainRoute.duration);
          const allSteps = mainRoute.legs?.flatMap((leg) => leg.steps) || [];

          return (
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              scrollEnabled={isExpanded}
            >
              {!isExpanded ? (
                // Collapsed view - Shows distance, duration, profile icon
                <View className="flex-row items-center gap-3 p-4">
                  <View className="w-12 h-12 rounded-full bg-primary items-center justify-center">
                    <Icon name={getProfileIcon() as any} size={24} color="primaryForeground" />
                  </View>
                  <View className="flex-1 mt-2">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Text
                        variant="small"
                        className="text-muted-foreground font-semibold uppercase tracking-wide"
                      >
                        {getProfileLabel()}
                      </Text>
                      {preservedRoute.provider && (
                        <Text variant="small" className="text-muted-foreground/60">
                          via{' '}
                          {preservedRoute.provider.charAt(0).toUpperCase() +
                            preservedRoute.provider.slice(1).replace('-', ' ')}
                        </Text>
                      )}
                    </View>
                    <View className="flex-row items-center gap-3">
                      <View className="flex-row items-center gap-1.5">
                        <Icon name="straighten" size={16} color="mutedForeground" />
                        <Text className="font-bold">{distance}</Text>
                      </View>
                      <View className="w-px h-4 bg-border" />
                      <View className="flex-row items-center gap-1.5">
                        <Icon name="schedule" size={16} color="mutedForeground" />
                        <Text className="font-bold">{duration}</Text>
                      </View>
                    </View>
                    {preservedRoute.warnings && preservedRoute.warnings.length > 0 && (
                      <View className="flex-row items-start gap-1.5 mt-1.5">
                        <Icon name="info-outline" size={14} color="mutedForeground" />
                        <Text
                          variant="small"
                          className="text-muted-foreground flex-1"
                          numberOfLines={2}
                        >
                          {preservedRoute.warnings[0]}
                        </Text>
                      </View>
                    )}
                  </View>
                  {onRecalculate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      // className="w-10 h-10 rounded-full"
                      onPress={() => onRecalculate()}
                    >
                      <Icon name="tune" size={20} color="mutedForeground" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onPress={handleClosePress}>
                    <Icon name="close" size={20} color="foreground" />
                  </Button>
                </View>
              ) : (
                // Expanded view - Shows turn-by-turn instructions
                <View className="p-4">
                  <View className="flex-row items-center mb-5 gap-3">
                    <View className="flex-1">
                      <Text className="text-lg font-bold">Directions</Text>
                      {preservedRoute.provider && (
                        <Text variant="small" className="text-muted-foreground mt-0.5">
                          via{' '}
                          {preservedRoute.provider.charAt(0).toUpperCase() +
                            preservedRoute.provider.slice(1).replace('-', ' ')}
                        </Text>
                      )}
                    </View>
                    {onRecalculate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        // className="w-10 h-10 rounded-full"
                        onPress={() => onRecalculate()}
                      >
                        <Icon name="tune" size={20} color="mutedForeground" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onPress={handleClosePress}>
                      <Text className="text-base text-muted-foreground">Close</Text>
                    </Button>
                  </View>

                  {/* Route Summary */}
                  <View className="flex-row items-center gap-4 mb-6 pb-5 border-b border-border">
                    <View className="w-16 h-16 rounded-full bg-primary items-center justify-center">
                      <Icon name={getProfileIcon() as any} size={32} color="primaryForeground" />
                    </View>
                    <View className="flex-1">
                      <Text
                        variant="small"
                        className="text-muted-foreground mb-2 font-semibold uppercase tracking-wide"
                      >
                        {getProfileLabel()}
                      </Text>
                      <View className="flex-row items-center gap-4">
                        <View className="flex-row items-center gap-2">
                          <Icon name="straighten" size={18} color="mutedForeground" />
                          <Text className="text-lg font-bold">{distance}</Text>
                        </View>
                        <View className="w-px h-4 bg-border" />
                        <View className="flex-row items-center gap-2">
                          <Icon name="schedule" size={18} color="mutedForeground" />
                          <Text className="text-lg font-bold">{duration}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Turn-by-turn instructions */}
                  <View className="pb-5">
                    {allSteps.map((step, index) => (
                      <View key={index} className="flex-row mb-5">
                        <View className="items-center mr-4">
                          <View className="w-10 h-10 rounded-full bg-primary items-center justify-center">
                            <Icon
                              name={
                                getManeuverIcon(step.maneuver.type, step.maneuver.modifier) as any
                              }
                              size={20}
                              color="primaryForeground"
                            />
                          </View>
                          {index < allSteps.length - 1 && (
                            <View className="w-0.5 flex-1 mt-2 bg-border" />
                          )}
                        </View>
                        <View className="flex-1 pt-1">
                          <Text className="text-base font-semibold mb-1.5 leading-5">
                            {step.maneuver.instruction}
                          </Text>
                          <View className="flex-row items-center gap-3">
                            {step.name && (
                              <Text className="text-sm font-medium text-muted-foreground">
                                {step.name}
                              </Text>
                            )}
                            <Text variant="small" className="text-muted-foreground font-semibold">
                              {formatDistance(step.distance, units)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>

                  {preservedRoute.warnings && preservedRoute.warnings.length > 0 && (
                    <View className="flex-row items-start gap-2 p-3 rounded-lg bg-muted/30 mt-3">
                      <Icon name="info-outline" size={16} color="mutedForeground" />
                      <Text variant="small" className="text-muted-foreground flex-1 leading-4">
                        {preservedRoute.warnings[0]}
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

export default RouteInfoSheet;
