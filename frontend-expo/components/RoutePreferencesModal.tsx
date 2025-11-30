import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import ProviderPicker from './ProviderPicker';
import ProfilePicker from './ProfilePicker';
import { useUserSettings } from '@/hooks/use-user-settings';

interface RoutePreferencesModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mode?: 'initial' | 'recalculate';
}

const RoutePreferencesModal: React.FC<RoutePreferencesModalProps> = ({
  visible,
  onClose,
  onConfirm,
  mode = 'initial',
}) => {
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [showProfilePicker, setShowProfilePicker] = useState(false);
  const { settings } = useUserSettings();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const hasGlassEffect = Platform.OS === 'ios' && isLiquidGlassAvailable();

  const handleProviderChange = (e: any) => {
    e.stopPropagation();
    setShowProviderPicker(true);
  };

  const handleProfileChange = (e: any) => {
    e.stopPropagation();
    setShowProfilePicker(true);
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getProviderLabel = (provider: string | null): string => {
    if (!provider) return 'Not set';
    return provider.charAt(0).toUpperCase() + provider.slice(1).replace('-', ' ');
  };

  const getProfileLabel = (profile: string | null): string => {
    if (!profile) return 'Not set';
    switch (profile) {
      case 'walking':
        return 'Walking';
      case 'cycling':
        return 'Cycling';
      case 'driving':
        return 'Driving';
      case 'public-transport':
        return 'Public Transport';
      default:
        return profile.charAt(0).toUpperCase() + profile.slice(1);
    }
  };

  const getProfileIcon = (profile: string | null): any => {
    if (!profile) return 'directions';
    switch (profile) {
      case 'walking':
        return 'directions-walk';
      case 'cycling':
        return 'directions-bike';
      case 'driving':
        return 'directions-car';
      case 'public-transport':
        return 'directions-transit';
      default:
        return 'directions';
    }
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
          <TouchableOpacity
            style={[styles.option, { borderBottomColor: colors.background }]}
            onPress={handleProviderChange}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <MaterialIcons name="route" size={24} color={colors.text} />
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionLabel, { color: colors.text + '99' }]}>Provider</Text>
                <Text style={[styles.optionValue, { color: colors.text }]}>
                  {getProviderLabel(settings?.preferred_routing_provider || null)}
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.icon} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleProfileChange} activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <MaterialIcons
                name={getProfileIcon(settings?.preferred_routing_profile || null)}
                size={24}
                color={colors.text}
              />
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionLabel, { color: colors.text + '99' }]}>Travel Mode</Text>
                <Text style={[styles.optionValue, { color: colors.text }]}>
                  {getProfileLabel(settings?.preferred_routing_profile || null)}
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.icon} />
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { borderColor: colors.text + '33' }]}
            onPress={onClose}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.confirmButton,
              { backgroundColor: Colors[colorScheme ?? 'light'].buttonIcon },
            ]}
            onPress={handleConfirm}
          >
            <Text style={[styles.buttonText, { color: 'white' }]}>
              {mode === 'initial' ? 'Get Directions' : 'Recalculate'}
            </Text>
          </TouchableOpacity>
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
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <View onStartShouldSetResponder={() => true}>{renderContent()}</View>
        </Pressable>
      </Modal>

      {/* Provider and Profile Pickers - rendered outside main modal */}
      <ProviderPicker
        visible={showProviderPicker}
        currentProvider={settings?.preferred_routing_provider || null}
        onClose={() => setShowProviderPicker(false)}
      />
      <ProfilePicker
        visible={showProfilePicker}
        currentProfile={settings?.preferred_routing_profile || null}
        currentProvider={settings?.preferred_routing_provider || null}
        onClose={() => setShowProfilePicker(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default RoutePreferencesModal;
