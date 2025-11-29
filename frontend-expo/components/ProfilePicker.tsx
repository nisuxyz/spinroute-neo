import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { Colors, electricPurple } from '@/constants/theme';
import { useUserSettings } from '@/hooks/use-user-settings';
import { useEnv } from '@/hooks/use-env';
import { supabase } from '@/utils/supabase';

interface Provider {
  name: string;
  displayName: string;
  capabilities: {
    profiles: string[];
    bikeTypes?: string[];
    multiModal: boolean;
    requiresPaidPlan: boolean;
  };
  available: boolean;
}

interface ProvidersResponse {
  providers: Provider[];
  defaultProvider: string;
}

interface ProfileOption {
  value: string;
  label: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

const PROFILE_OPTIONS: ProfileOption[] = [
  {
    value: 'walking',
    label: 'Walking',
    description: 'Pedestrian routes',
    icon: 'directions-walk',
  },
  {
    value: 'cycling',
    label: 'Cycling',
    description: 'Bike-friendly routes',
    icon: 'directions-bike',
  },
  {
    value: 'driving',
    label: 'Driving',
    description: 'Car routes',
    icon: 'directions-car',
  },
  {
    value: 'public-transport',
    label: 'Public Transport',
    description: 'Transit routes',
    icon: 'directions-transit',
  },
];

interface ProfilePickerProps {
  visible: boolean;
  currentProfile: string | null;
  currentProvider: string | null;
  onClose: () => void;
}

export default function ProfilePicker({
  visible,
  currentProfile,
  currentProvider,
  onClose,
}: ProfilePickerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { settings, updateSettings } = useUserSettings();
  const { ROUTING_SERVICE } = useEnv(settings?.useDevUrls);
  const [availableProfiles, setAvailableProfiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchProviderCapabilities();
    }
  }, [visible, currentProvider]);

  const fetchProviderCapabilities = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${ROUTING_SERVICE}/api/routing/providers`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch providers: ${response.statusText}`);
      }

      const data: ProvidersResponse = await response.json();

      // If a specific provider is selected, use its capabilities
      // Otherwise, get union of all available provider capabilities
      if (currentProvider) {
        const provider = data.providers.find((p) => p.name === currentProvider);
        if (provider) {
          setAvailableProfiles(provider.capabilities.profiles);
        } else {
          // Provider not found, show all profiles
          const allProfiles = new Set<string>();
          data.providers.forEach((p) => {
            p.capabilities.profiles.forEach((profile) => allProfiles.add(profile));
          });
          setAvailableProfiles(Array.from(allProfiles));
        }
      } else {
        // No specific provider, show union of all profiles
        const allProfiles = new Set<string>();
        data.providers.forEach((p) => {
          p.capabilities.profiles.forEach((profile) => allProfiles.add(profile));
        });
        setAvailableProfiles(Array.from(allProfiles));
      }
    } catch (err) {
      console.error('Error fetching provider capabilities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch capabilities');
      // Fallback to showing all profiles
      setAvailableProfiles(PROFILE_OPTIONS.map((p) => p.value));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfile = async (profileValue: string) => {
    const success = await updateSettings({ preferred_routing_profile: profileValue });
    if (success) {
      onClose();
    } else {
      Alert.alert('Error', 'Failed to update profile preference');
    }
  };

  const filteredProfiles = PROFILE_OPTIONS.filter((profile) =>
    availableProfiles.includes(profile.value),
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable>
          <GlassView style={styles.modalContent} glassEffectStyle="regular">
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Routing Profile</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={[styles.modalCancel, { color: colors.icon }]}>Close</Text>
              </TouchableOpacity>
            </View>

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={electricPurple} />
                <Text style={[styles.loadingText, { color: colors.icon }]}>
                  Loading profiles...
                </Text>
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={48} color={colors.icon} />
                <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: colors.buttonBackground }]}
                  onPress={fetchProviderCapabilities}
                >
                  <Text style={[styles.retryButtonText, { color: colors.text }]}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {!loading && !error && (
              <ScrollView style={styles.profileList} showsVerticalScrollIndicator={false}>
                {filteredProfiles.map((profile) => {
                  const isSelected = profile.value === (currentProfile || 'cycling');
                  return (
                    <TouchableOpacity
                      key={profile.value}
                      style={[
                        styles.profileItem,
                        { borderBottomColor: colors.background },
                        isSelected && { backgroundColor: colors.buttonBackground },
                      ]}
                      onPress={() => handleSelectProfile(profile.value)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.profileIcon}>
                        <MaterialIcons name={profile.icon} size={28} color={colors.text} />
                      </View>
                      <View style={styles.profileInfo}>
                        <Text style={[styles.profileName, { color: colors.text }]}>
                          {profile.label}
                        </Text>
                        <Text style={[styles.profileDescription, { color: colors.icon }]}>
                          {profile.description}
                        </Text>
                      </View>
                      {isSelected && (
                        <MaterialIcons name="check" size={24} color={electricPurple} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </GlassView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCancel: {
    fontSize: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  profileList: {
    maxHeight: 400,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderRadius: 8,
    marginBottom: 4,
  },
  profileIcon: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  profileDescription: {
    fontSize: 12,
  },
});
