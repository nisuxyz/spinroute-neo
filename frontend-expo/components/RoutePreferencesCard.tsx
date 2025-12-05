import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  Modal,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Menu, MenuTrigger, MenuOptions, MenuOption, MenuProvider } from 'react-native-popup-menu';
import { useUserSettings } from '@/contexts/user-settings-context';
import GetDirectionsButton from './GetDirectionsButton';
import {
  useProviderProfiles,
  groupProfilesByCategory,
  ProfileCategory,
  type ProfileMetadata,
} from '@/hooks/use-provider-profiles';

interface RoutePreferencesCardProps {
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

const RoutePreferencesCard: React.FC<RoutePreferencesCardProps> = ({
  visible,
  onClose,
  onConfirm,
  mode = 'initial',
}) => {
  const { settings, updateSettings, getProfileForProvider, setProfileForProvider } =
    useUserSettings();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const hasGlassEffect = Platform.OS === 'ios' && isLiquidGlassAvailable();

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

  // Group profiles by category for the menu
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
      '[RoutePreferencesCard] Provider changed from',
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
        console.log('[RoutePreferencesCard] Using stored profile for provider:', storedProfile);
        updateSettings({ preferred_routing_profile: storedProfile });
        return;
      }

      console.log('[RoutePreferencesCard] Stored profile no longer valid, using default');
    }

    // No stored profile or invalid - use provider's default
    if (defaultProfile) {
      console.log('[RoutePreferencesCard] Using provider default profile:', defaultProfile);
      updateSettings({ preferred_routing_profile: defaultProfile });
    } else if (profiles.length > 0) {
      // Fallback to first profile if no default specified
      console.log('[RoutePreferencesCard] Using first available profile:', profiles[0].id);
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
        console.log('[RoutePreferencesCard] Initial load - using stored profile:', storedProfile);
        updateSettings({ preferred_routing_profile: storedProfile });
      } else if (defaultProfile) {
        console.log('[RoutePreferencesCard] Initial load - using default profile:', defaultProfile);
        updateSettings({ preferred_routing_profile: defaultProfile });
      } else if (profiles.length > 0) {
        console.log('[RoutePreferencesCard] Initial load - using first profile:', profiles[0].id);
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

  const handleProviderSelect = async (provider: string) => {
    // Save current profile for current provider before switching
    if (settings?.preferred_routing_profile && settings?.preferred_routing_provider) {
      await setProfileForProvider(
        settings.preferred_routing_provider,
        settings.preferred_routing_profile,
      );
    }

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

  const getProviderLabel = (provider: string | null): string => {
    if (!provider) return 'Not set';
    switch (provider) {
      case 'openrouteservice':
        return 'OpenRouteService';
      case 'mapbox':
        return 'Mapbox';
      default:
        return provider.charAt(0).toUpperCase() + provider.slice(1).replace('-', ' ');
    }
  };

  const getProfileLabel = (profile: ProfileMetadata | null): string => {
    if (!profile) return defaultProfile ? 'Default' : 'Not set';
    return profile.title;
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

  // Render profile menu options grouped by category
  const renderProfileMenuOptions = () => {
    // TEMP DEBUG: Log what we're rendering
    console.log('[RoutePreferencesCard] renderProfileMenuOptions called:', {
      profilesLoading,
      profileCount: profiles.length,
      profiles: profiles.map((p) => ({ id: p.id, title: p.title, category: p.category })),
      groupedProfiles: Object.entries(groupedProfiles).map(([cat, profs]) => ({
        category: cat,
        count: profs.length,
        profiles: profs.map((p) => p.id),
      })),
    });

    if (profilesLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.text} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading profiles...</Text>
        </View>
      );
    }

    if (profiles.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.text }]}>No profiles available</Text>
        </View>
      );
    }

    const menuItems: React.ReactNode[] = [];

    for (const category of CATEGORY_ORDER) {
      const categoryProfiles = groupedProfiles[category];
      if (categoryProfiles.length === 0) continue;

      // TEMP DEBUG: Log each category being rendered
      console.log(
        '[RoutePreferencesCard] Rendering category:',
        category,
        'with',
        categoryProfiles.length,
        'profiles',
      );

      // Add category header
      menuItems.push(
        <View key={`header-${category}`} style={styles.categoryHeader}>
          <Text style={[styles.categoryHeaderText, { color: colors.text + '99' }]}>
            {CATEGORY_LABELS[category]}
          </Text>
        </View>,
      );

      // Add profiles in this category
      for (const profile of categoryProfiles) {
        const isSelected = settings?.preferred_routing_profile === profile.id;
        menuItems.push(
          <MenuOption key={profile.id} onSelect={() => handleProfileSelect(profile.id)}>
            <View
              style={[
                styles.menuOptionContent,
                isSelected && { backgroundColor: colors.tint + '20' },
              ]}
            >
              <MaterialIcons
                name={getProfileIcon(profile)}
                size={20}
                color={isSelected ? colors.tint : colors.text}
              />
              <View style={styles.menuOptionTextContainer}>
                <Text
                  style={[styles.menuOptionText, { color: isSelected ? colors.tint : colors.text }]}
                >
                  {profile.title}
                </Text>
                {profile.description && (
                  <Text style={[styles.menuOptionDescription, { color: colors.text + '80' }]}>
                    {profile.description}
                  </Text>
                )}
              </View>
              {isSelected && <MaterialIcons name="check" size={18} color={colors.tint} />}
            </View>
          </MenuOption>,
        );
      }
    }

    // TEMP DEBUG: Log total menu items
    console.log('[RoutePreferencesCard] Total menu items to render:', menuItems.length);

    return menuItems;
  };

  const renderContent = () => {
    const content = (
      <>
        <Text style={[styles.title, { color: colors.text }]}>
          {mode === 'initial' ? 'Route Preferences' : 'Recalculate Route'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.text + 'CC' }]}>
          {mode === 'initial'
            ? 'Choose your routing provider and travel mode'
            : 'Update your routing preferences'}
        </Text>

        <View style={styles.optionsContainer}>
          {/* Provider Menu */}
          <Menu>
            <MenuTrigger
              customStyles={{
                triggerWrapper: [styles.option, { borderBottomColor: colors.background }],
                triggerTouchable: { underlayColor: 'rgba(255, 255, 255, 0.1)' },
              }}
            >
              <View style={styles.optionContent}>
                <MaterialIcons name="route" size={24} color={colors.text} />
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionLabel, { color: colors.text + '99' }]}>Provider</Text>
                  <Text style={[styles.optionValue, { color: colors.text }]}>
                    {getProviderLabel(settings?.preferred_routing_provider || null)}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.icon} />
              </View>
            </MenuTrigger>
            <MenuOptions
              customStyles={{
                optionsContainer: {
                  backgroundColor: colors.buttonBackground,
                  borderRadius: 12,
                  padding: 4,
                  minWidth: 200,
                  marginLeft: 100,
                },
              }}
            >
              <MenuOption onSelect={() => handleProviderSelect('openrouteservice')}>
                <Text style={[styles.menuOptionTextSimple, { color: colors.text }]}>
                  OpenRouteService
                </Text>
              </MenuOption>
              <MenuOption onSelect={() => handleProviderSelect('mapbox')}>
                <Text style={[styles.menuOptionTextSimple, { color: colors.text }]}>Mapbox</Text>
              </MenuOption>
            </MenuOptions>
          </Menu>

          {/* Profile Menu - Dynamic profiles from provider */}
          <Menu>
            <MenuTrigger
              customStyles={{
                triggerWrapper: styles.option,
                triggerTouchable: { underlayColor: 'rgba(255, 255, 255, 0.1)' },
              }}
            >
              <View style={styles.optionContent}>
                <MaterialIcons
                  name={getProfileIcon(selectedProfile)}
                  size={24}
                  color={colors.text}
                />
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionLabel, { color: colors.text + '99' }]}>
                    Travel Mode
                  </Text>
                  <View style={styles.profileValueContainer}>
                    <Text style={[styles.optionValue, { color: colors.text }]}>
                      {getProfileLabel(selectedProfile)}
                    </Text>
                    {profilesLoading && (
                      <ActivityIndicator
                        size="small"
                        color={colors.text}
                        style={styles.inlineLoader}
                      />
                    )}
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.icon} />
              </View>
            </MenuTrigger>
            <MenuOptions
              customStyles={{
                optionsContainer: {
                  backgroundColor: colors.buttonBackground,
                  borderRadius: 12,
                  padding: 4,
                  minWidth: 260,
                  maxHeight: 400,
                  marginLeft: 60,
                },
              }}
            >
              {renderProfileMenuOptions()}
            </MenuOptions>
          </Menu>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { borderColor: colors.text + '33' }]}
            onPress={onClose}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <GetDirectionsButton onPress={handleConfirm} mode={mode} style={styles.button} />
        </View>
      </>
    );

    if (hasGlassEffect) {
      return (
        <GlassView style={styles.content} glassEffectStyle="regular">
          {content}
        </GlassView>
      );
    }

    return (
      <View style={[styles.content, { backgroundColor: colors.buttonBackground }]}>{content}</View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <MenuProvider style={styles.modalContainer}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <View onStartShouldSetResponder={() => true}>{renderContent()}</View>
        </Pressable>
      </MenuProvider>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    borderRadius: 20,
    padding: 24,
    minWidth: 320,
    maxWidth: 400,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  option: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  profileValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineLoader: {
    marginLeft: 4,
  },
  categoryHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  categoryHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  menuOptionTextContainer: {
    flex: 1,
  },
  menuOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuOptionTextSimple: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuOptionDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  cancelButton: {
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default RoutePreferencesCard;
