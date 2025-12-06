import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Spacing,
  BorderRadius,
  Typography,
  ButtonStyles,
  SheetStyles,
  electricPurple,
} from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useUserSettings } from '@/contexts/user-settings-context';
import GetDirectionsButton from './GetDirectionsButton';
import BaseSheet, { type BaseSheetRef } from './BaseSheet';
import {
  useProviderProfiles,
  groupProfilesByCategory,
  ProfileCategory,
  type ProfileMetadata,
} from '@/hooks/use-provider-profiles';

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

  // Theme colors
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const buttonBackground = useThemeColor({}, 'buttonBackground');
  const backgroundColor = useThemeColor({}, 'background');

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

  const getProviderLabel = (provider: string): string => {
    switch (provider) {
      case 'openrouteservice':
        return 'OpenRouteService';
      case 'mapbox':
        return 'Mapbox';
      default:
        return provider.charAt(0).toUpperCase() + provider.slice(1).replace('-', ' ');
    }
  };

  const getProfileIcon = (profile: ProfileMetadata | null): keyof typeof MaterialIcons.glyphMap => {
    if (!profile) return 'directions';
    // Map common icon names to MaterialIcons
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
    };
    return iconMap[profile.icon] || 'directions';
  };

  // Render provider selector
  const renderProviderSelector = () => {
    const providers = [
      { id: 'openrouteservice', label: 'ORS' },
      { id: 'mapbox', label: 'Mapbox' },
    ];

    return (
      <View style={SheetStyles.section}>
        <Text style={[SheetStyles.sectionLabel, { color: textColor + '99' }]}>Provider</Text>
        <View style={styles.providerButtons}>
          {providers.map((provider) => {
            const isSelected = selectedProvider === provider.id;
            return (
              <TouchableOpacity
                key={provider.id}
                style={[
                  ButtonStyles.primaryVariant(isSelected ? 'solid' : 'outline'),
                  {
                    flex: 1,
                    // backgroundColor: isSelected ? tintColor : buttonBackground,
                    borderColor: isSelected ? electricPurple : '#ffffff' + '16',
                  },
                ]}
                onPress={() => handleProviderSelect(provider.id)}
              >
                <Text style={[Typography.bodySmall, { color: textColor }]}>{provider.label}</Text>
              </TouchableOpacity>
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={textColor} />
          <Text style={[Typography.bodyMedium, { color: textColor }]}>Loading profiles...</Text>
        </View>
      );
    }

    if (profiles.length === 0) {
      return (
        <View style={{ padding: Spacing.xxl, alignItems: 'center' }}>
          <Text style={[Typography.bodyMedium, { color: textColor }]}>No profiles available</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.profileList}
        contentContainerStyle={{ paddingBottom: Spacing.sm }}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {CATEGORY_ORDER.map((category) => {
          const categoryProfiles = groupedProfiles[category];
          if (categoryProfiles.length === 0) return null;

          return (
            <View key={category} style={{ gap: Spacing.sm, marginBottom: Spacing.lg }}>
              <Text
                style={[
                  Typography.caption,
                  {
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    marginBottom: Spacing.sm,
                    paddingHorizontal: Spacing.xs,
                    color: textColor + '99',
                  },
                ]}
              >
                {CATEGORY_LABELS[category]}
              </Text>
              {categoryProfiles.map((profile) => {
                const isSelected = settings?.preferred_routing_profile === profile.id;
                return (
                  <TouchableOpacity
                    key={profile.id}
                    style={[ButtonStyles.primaryVariant(isSelected ? 'solid' : 'ghost')]}
                    onPress={() => handleProfileSelect(profile.id)}
                  >
                    <MaterialIcons
                      name={getProfileIcon(profile)}
                      size={24}
                      color={isSelected ? tintColor : textColor}
                    />
                    <View style={styles.profileTextContainer}>
                      <Text
                        style={[styles.profileTitle, { color: isSelected ? tintColor : textColor }]}
                      >
                        {profile.title}
                      </Text>
                      {profile.description && (
                        <Text
                          style={[Typography.bodySmall, { marginTop: 2, color: textColor + '80' }]}
                        >
                          {profile.description}
                        </Text>
                      )}
                    </View>
                    {isSelected && <MaterialIcons name="check" size={20} color={tintColor} />}
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
      <View style={SheetStyles.container}>
        <View style={styles.header}>
          <Text style={[Typography.h2, { color: textColor }]}>
            {mode === 'initial' ? 'Route Preferences' : 'Recalculate Route'}
          </Text>
          <TouchableOpacity style={{ padding: 4 }} onPress={onClose}>
            <MaterialIcons name="close" size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        <Text
          style={[
            Typography.bodyMedium,
            { textAlign: 'center', marginBottom: Spacing.xxl, color: textColor + 'CC' },
          ]}
        >
          {mode === 'initial'
            ? 'Choose your routing provider and travel mode'
            : 'Update your routing preferences'}
        </Text>

        {renderProviderSelector()}

        <View style={SheetStyles.section}>
          <Text style={[SheetStyles.sectionLabel, { color: textColor + '99' }]}>Travel Mode</Text>
          {renderProfileList()}
        </View>

        <View style={SheetStyles.buttonContainer}>
          <TouchableOpacity
            style={[ButtonStyles.secondary, { borderColor: textColor + '33' }]}
            onPress={onClose}
          >
            <Text style={[Typography.bodyLarge, { color: textColor }]}>Cancel</Text>
          </TouchableOpacity>
          <GetDirectionsButton onPress={handleConfirm} mode={mode} style={ButtonStyles.primary} />
        </View>
      </View>
    </BaseSheet>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  providerButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  profileList: {
    maxHeight: 300,
  },
  profileTextContainer: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    gap: Spacing.sm,
  },
});

export default RoutePreferencesSheet;
