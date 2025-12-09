import React, { useMemo, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { useUserSettings } from '@/contexts/user-settings-context';
import GetDirectionsButton from './GetDirectionsButton';
import BaseSheet, { type BaseSheetRef } from './BaseSheet';
import {
  useProviderProfiles,
  groupProfilesByCategory,
  ProfileCategory,
  type ProfileMetadata,
} from '@/hooks/use-provider-profiles';
import { Text } from './ui/text';
import { Button } from './ui/button';
import { Icon } from './icon';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

interface RoutePreferencesSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mode?: 'initial' | 'recalculate';
}

// Category display order and labels
const CATEGORY_ORDER: ProfileCategory[] = [
  ProfileCategory.CYCLING,
  ProfileCategory.WALKING,
  ProfileCategory.DRIVING,
  ProfileCategory.OTHER,
];

const CATEGORY_LABELS: Record<ProfileCategory, string> = {
  [ProfileCategory.CYCLING]: 'Cycling',
  [ProfileCategory.WALKING]: 'Walking',
  [ProfileCategory.DRIVING]: 'Driving',
  [ProfileCategory.OTHER]: 'Other',
};

const RoutePreferencesSheet: React.FC<RoutePreferencesSheetProps> = ({
  visible,
  onClose,
  onConfirm,
  mode = 'initial',
}) => {
  const sheetRef = useRef<BaseSheetRef>(null);
  const { settings, updateSettings, getProfileForProvider, setProfileForProvider } =
    useUserSettings();

  // Get the current provider from settings
  const currentProvider = settings?.preferred_routing_provider || 'openrouteservice';

  // Fetch profiles for the current provider
  const {
    profiles,
    defaultProfile,
    loading: profilesLoading,
  } = useProviderProfiles(currentProvider);

  // Track previous provider to detect changes
  const previousProviderRef = useRef<string | null>(null);

  // Local state for provider selection (to show immediate feedback)
  const [selectedProvider, setSelectedProvider] = useState<string>(currentProvider);

  // Group profiles by category for the list
  const groupedProfiles = useMemo(() => groupProfilesByCategory(profiles), [profiles]);

  // Find the currently selected profile metadata
  const selectedProfile = useMemo(() => {
    const profileId = settings?.preferred_routing_profile;
    if (!profileId) return null;
    return profiles.find((p) => p.id === profileId) || null;
  }, [settings?.preferred_routing_profile, profiles]);

  // Handle provider switching - select appropriate profile when provider changes
  useEffect(() => {
    // Skip if profiles are still loading or no profiles available
    if (profilesLoading || profiles.length === 0) return;

    // Skip if this is the initial load (no previous provider)
    if (previousProviderRef.current === null) {
      previousProviderRef.current = currentProvider;
      return;
    }

    // Skip if provider hasn't changed
    if (previousProviderRef.current === currentProvider) return;

    console.log(
      '[RoutePreferencesSheet] Provider changed from',
      previousProviderRef.current,
      'to',
      currentProvider,
    );
    previousProviderRef.current = currentProvider;

    // Check if we have a stored profile for this provider
    const storedProfile = getProfileForProvider(currentProvider);

    if (storedProfile) {
      // Verify the stored profile is still valid for this provider
      const isValidProfile = profiles.some((p) => p.id === storedProfile);

      if (isValidProfile) {
        console.log('[RoutePreferencesSheet] Using stored profile for provider:', storedProfile);
        updateSettings({ preferred_routing_profile: storedProfile });
        return;
      }

      console.log('[RoutePreferencesSheet] Stored profile no longer valid, using default');
    }

    // No stored profile or invalid - use provider's default
    if (defaultProfile) {
      console.log('[RoutePreferencesSheet] Using provider default profile:', defaultProfile);
      updateSettings({ preferred_routing_profile: defaultProfile });
    } else if (profiles.length > 0) {
      // Fallback to first profile if no default specified
      console.log('[RoutePreferencesSheet] Using first available profile:', profiles[0].id);
      updateSettings({ preferred_routing_profile: profiles[0].id });
    }
  }, [
    currentProvider,
    profiles,
    profilesLoading,
    defaultProfile,
    getProfileForProvider,
    updateSettings,
  ]);

  // Also handle initial profile selection when profiles load for the first time
  useEffect(() => {
    if (profilesLoading || profiles.length === 0) return;

    const currentProfileId = settings?.preferred_routing_profile;

    // If no profile is set, or current profile is not valid for this provider
    if (!currentProfileId || !profiles.some((p) => p.id === currentProfileId)) {
      // Check for stored profile first
      const storedProfile = getProfileForProvider(currentProvider);

      if (storedProfile && profiles.some((p) => p.id === storedProfile)) {
        console.log('[RoutePreferencesSheet] Initial load - using stored profile:', storedProfile);
        updateSettings({ preferred_routing_profile: storedProfile });
      } else if (defaultProfile) {
        console.log(
          '[RoutePreferencesSheet] Initial load - using default profile:',
          defaultProfile,
        );
        updateSettings({ preferred_routing_profile: defaultProfile });
      } else if (profiles.length > 0) {
        console.log('[RoutePreferencesSheet] Initial load - using first profile:', profiles[0].id);
        updateSettings({ preferred_routing_profile: profiles[0].id });
      }
    }
  }, [
    profiles,
    profilesLoading,
    settings?.preferred_routing_profile,
    currentProvider,
    defaultProfile,
    getProfileForProvider,
    updateSettings,
  ]);

  // Sync local provider state with settings
  useEffect(() => {
    if (settings?.preferred_routing_provider) {
      setSelectedProvider(settings.preferred_routing_provider);
    }
  }, [settings?.preferred_routing_provider]);

  // Present/dismiss sheet based on visible prop
  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleProviderSelect = async (provider: string) => {
    // Save current profile for current provider before switching
    if (settings?.preferred_routing_profile && settings?.preferred_routing_provider) {
      await setProfileForProvider(
        settings.preferred_routing_provider,
        settings.preferred_routing_profile,
      );
    }

    // Update local state immediately for visual feedback
    setSelectedProvider(provider);

    // Update to new provider - profile selection will be handled by the useEffect above
    await updateSettings({ preferred_routing_provider: provider });
  };

  const handleProfileSelect = async (profileId: string) => {
    // Update the profile and store it for this provider
    await updateSettings({ preferred_routing_profile: profileId });
    await setProfileForProvider(currentProvider, profileId);
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleDismiss = () => {
    onClose();
  };

  // const getProviderLabel = (provider: string): string => {
  //   switch (provider) {
  //     case 'openrouteservice':
  //       return 'OpenRouteService';
  //     case 'mapbox':
  //       return 'Mapbox';
  //     default:
  //       return provider.charAt(0).toUpperCase() + provider.slice(1).replace('-', ' ');
  //   }
  // };

  const getProfileIcon = (profile: ProfileMetadata | null): string => {
    if (!profile) return 'directions';
    return profile.icon || 'directions';
  };

  // Render provider selector
  const renderProviderSelector = () => {
    const providers = [
      { id: 'openrouteservice', label: 'ORS' },
      { id: 'mapbox', label: 'Mapbox' },
    ];

    return (
      <View className="mb-6">
        <Text
          variant="small"
          className="text-muted-foreground mb-3 font-semibold uppercase tracking-wide"
        >
          Provider
        </Text>
        <View className="flex-row gap-3">
          {providers.map((provider) => {
            const isSelected = selectedProvider === provider.id;
            return (
              <Button
                key={provider.id}
                variant={isSelected ? 'default' : 'outline'}
                className="flex-1"
                onPress={() => handleProviderSelect(provider.id)}
              >
                <Text>{provider.label}</Text>
              </Button>
            );
          })}
        </View>
      </View>
    );
  };

  // Render scrollable profile list grouped by category
  const renderProfileList = () => {
    if (profilesLoading) {
      return (
        <View className="gap-3">
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              className="flex-row items-center gap-3 p-4 rounded-lg border border-border"
            >
              <Skeleton className="w-6 h-6 rounded" />
              <View className="flex-1 gap-2">
                <Skeleton className="w-32 h-4 rounded" />
                <Skeleton className="w-48 h-3 rounded" />
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (profiles.length === 0) {
      return (
        <View className="p-8 items-center">
          <Text className="text-muted-foreground">No profiles available</Text>
        </View>
      );
    }

    return (
      <ScrollView
        className="max-h-[300px]"
        contentContainerStyle={{ paddingBottom: 8 }}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {CATEGORY_ORDER.map((category) => {
          const categoryProfiles = groupedProfiles[category];
          if (categoryProfiles.length === 0) return null;

          return (
            <View key={category} className="gap-3 mb-6">
              <Text
                variant="small"
                className="text-muted-foreground font-semibold uppercase tracking-wide mb-1 px-1"
              >
                {CATEGORY_LABELS[category]}
              </Text>
              {categoryProfiles.map((profile) => {
                const isSelected = settings?.preferred_routing_profile === profile.id;
                return (
                  <TouchableOpacity
                    key={profile.id}
                    className={cn(
                      'flex-row items-center gap-3 p-4 rounded-lg border',
                      isSelected ? 'bg-primary border-primary' : 'bg-card border-border',
                    )}
                    onPress={() => handleProfileSelect(profile.id)}
                  >
                    <Icon
                      name={getProfileIcon(profile) as any}
                      size={24}
                      color={isSelected ? 'primaryForeground' : 'foreground'}
                    />
                    <View className="flex-1">
                      <Text
                        className={cn(
                          'text-base font-semibold',
                          isSelected ? 'text-primary-foreground' : 'text-foreground',
                        )}
                      >
                        {profile.title}
                      </Text>
                      {profile.description && (
                        <Text
                          variant="small"
                          className={cn(
                            'mt-1',
                            isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground',
                          )}
                        >
                          {profile.description}
                        </Text>
                      )}
                    </View>
                    {isSelected && <Icon name="check" size={20} color="primaryForeground" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <BaseSheet
      ref={sheetRef}
      name="RoutePreferencesSheet"
      detents={['auto']}
      onDismiss={handleDismiss}
      scrollable={false}
      grabberVisible={true}
    >
      <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-xl font-semibold">Route Preferences</Text>
          <Button variant="ghost" size="sm" onPress={onClose}>
            <Text className="text-base text-muted-foreground">Close</Text>
          </Button>
        </View>

        {/* <Text className="text-center mb-8 text-muted-foreground">
          {mode === 'initial'
            ? 'Choose your routing provider and travel mode'
            : 'Update your routing preferences'}
        </Text> */}

        {/* Provider Selector */}
        {renderProviderSelector()}

        {/* Travel Mode Section */}
        <View className="mb-6">
          <Text
            variant="small"
            className="text-muted-foreground mb-3 font-semibold uppercase tracking-wide"
          >
            Travel Mode
          </Text>
          {renderProfileList()}
        </View>

        {/* Action Buttons */}
        <View className="flex-col gap-3 mt-2 mb-4">
          <Button variant="outline" size="xl" className="flex-1" onPress={onClose}>
            <Text>Cancel</Text>
          </Button>
          <View className="flex-1">
            <GetDirectionsButton onPress={handleConfirm} mode={mode} />
          </View>
        </View>
      </View>
    </BaseSheet>
  );
};

export default RoutePreferencesSheet;
