import React, { useState } from 'react';
import { View, StyleSheet, useColorScheme, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { useUserSettings } from '@/contexts/user-settings-context';
import SettingsCard from './SettingsCard';
import SettingsRow from './SettingsRow';
import ProviderPicker from './ProviderPicker';
import ProfilePicker from './ProfilePicker';
import BikeTypePicker from './BikeTypePicker';

export default function RoutingSettingsSection() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { settings, loading } = useUserSettings();
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [showProfilePicker, setShowProfilePicker] = useState(false);
  const [showBikeTypePicker, setShowBikeTypePicker] = useState(false);

  // Only show loading on initial load when we have no settings at all
  if (!settings && loading) {
    return (
      <SettingsCard title="Routing" icon="route">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.tint} />
        </View>
      </SettingsCard>
    );
  }

  // Don't render if we still don't have settings after loading
  if (!settings) {
    return null;
  }

  const getProviderDisplayName = () => {
    if (!settings.preferred_routing_provider) return 'Auto';
    // Capitalize first letter of each word
    return settings.preferred_routing_provider
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getProfileDisplayName = () => {
    if (!settings.preferred_routing_profile) return 'Cycling';
    return (
      settings.preferred_routing_profile.charAt(0).toUpperCase() +
      settings.preferred_routing_profile.slice(1)
    );
  };

  const getBikeTypeDisplayName = () => {
    if (!settings.preferred_bike_type) return 'Generic';
    return (
      settings.preferred_bike_type.charAt(0).toUpperCase() + settings.preferred_bike_type.slice(1)
    );
  };

  return (
    <>
      <SettingsCard title="Routing" icon="route">
        <SettingsRow
          label="Provider"
          description="Routing service to use"
          value={getProviderDisplayName()}
          onPress={() => setShowProviderPicker(true)}
          showChevron
        />

        <SettingsRow
          label="Profile"
          description="Transportation mode"
          value={getProfileDisplayName()}
          onPress={() => setShowProfilePicker(true)}
          showChevron
          showBorder
        />

        <SettingsRow
          label="Bike Type"
          description="Optimize routes for bike type"
          value={getBikeTypeDisplayName()}
          onPress={() => setShowBikeTypePicker(true)}
          showChevron
          showBorder
        />
      </SettingsCard>

      {/* Pickers */}
      <ProviderPicker
        visible={showProviderPicker}
        currentProvider={settings.preferred_routing_provider}
        onClose={() => setShowProviderPicker(false)}
      />
      <ProfilePicker
        visible={showProfilePicker}
        currentProfile={settings.preferred_routing_profile}
        currentProvider={settings.preferred_routing_provider}
        onClose={() => setShowProfilePicker(false)}
      />
      <BikeTypePicker
        visible={showBikeTypePicker}
        currentBikeType={settings.preferred_bike_type}
        currentProfile={settings.preferred_routing_profile}
        onClose={() => setShowBikeTypePicker(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
});
