import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useUserSettings } from '@/hooks/use-user-settings';
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
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
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
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Routing Preferences</Text>

          <View style={[styles.card, { backgroundColor: colors.buttonBackground }]}>
            {/* Provider Setting */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowProviderPicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.settingIcon}>
                <MaterialIcons name="route" size={24} color={colors.text} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Provider</Text>
                <Text style={[styles.settingDescription, { color: colors.icon }]}>
                  Routing service to use
                </Text>
              </View>
              <View style={styles.valueContainer}>
                <Text style={[styles.valueText, { color: colors.text }]}>
                  {getProviderDisplayName()}
                </Text>
                <Text style={[styles.chevron, { color: colors.icon }]}>›</Text>
              </View>
            </TouchableOpacity>

            {/* Profile Setting */}
            <TouchableOpacity
              style={[
                styles.settingRow,
                styles.settingRowBorder,
                { borderTopColor: colors.background },
              ]}
              onPress={() => setShowProfilePicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.settingIcon}>
                <MaterialIcons name="directions-bike" size={24} color={colors.text} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Profile</Text>
                <Text style={[styles.settingDescription, { color: colors.icon }]}>
                  Transportation mode
                </Text>
              </View>
              <View style={styles.valueContainer}>
                <Text style={[styles.valueText, { color: colors.text }]}>
                  {getProfileDisplayName()}
                </Text>
                <Text style={[styles.chevron, { color: colors.icon }]}>›</Text>
              </View>
            </TouchableOpacity>

            {/* Bike Type Setting */}
            <TouchableOpacity
              style={[
                styles.settingRow,
                styles.settingRowBorder,
                { borderTopColor: colors.background, paddingBottom: 0 },
              ]}
              onPress={() => setShowBikeTypePicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.settingIcon}>
                <MaterialIcons name="pedal-bike" size={24} color={colors.text} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Bike Type</Text>
                <Text style={[styles.settingDescription, { color: colors.icon }]}>
                  Optimize routes for bike type
                </Text>
              </View>
              <View style={styles.valueContainer}>
                <Text style={[styles.valueText, { color: colors.text }]}>
                  {getBikeTypeDisplayName()}
                </Text>
                <Text style={[styles.chevron, { color: colors.icon }]}>›</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

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
  container: {},
  section: {},
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
  },
  settingRowBorder: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  settingIcon: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
  },
});
