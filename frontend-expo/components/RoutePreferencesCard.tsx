import React from 'react';
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
import { Menu, MenuTrigger, MenuOptions, MenuOption, MenuProvider } from 'react-native-popup-menu';
import { useUserSettings } from '@/hooks/use-user-settings';

interface RoutePreferencesCardProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mode?: 'initial' | 'recalculate';
}

const RoutePreferencesCard: React.FC<RoutePreferencesCardProps> = ({
  visible,
  onClose,
  onConfirm,
  mode = 'initial',
}) => {
  const { settings, updateSettings } = useUserSettings();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const hasGlassEffect = Platform.OS === 'ios' && isLiquidGlassAvailable();

  const handleProviderSelect = async (provider: string) => {
    await updateSettings({ preferred_routing_provider: provider });
  };

  const handleProfileSelect = async (profile: string) => {
    await updateSettings({ preferred_routing_profile: profile });
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
                },
              }}
            >
              <MenuOption onSelect={() => handleProviderSelect('openrouteservice')}>
                <Text style={[styles.menuOptionText, { color: colors.text }]}>
                  Openrouteservice
                </Text>
              </MenuOption>
              <MenuOption onSelect={() => handleProviderSelect('mapbox')}>
                <Text style={[styles.menuOptionText, { color: colors.text }]}>Mapbox</Text>
              </MenuOption>
            </MenuOptions>
          </Menu>

          {/* Profile Menu */}
          <Menu>
            <MenuTrigger
              customStyles={{
                triggerWrapper: styles.option,
                triggerTouchable: { underlayColor: 'rgba(255, 255, 255, 0.1)' },
              }}
            >
              <View style={styles.optionContent}>
                <MaterialIcons
                  name={getProfileIcon(settings?.preferred_routing_profile || null)}
                  size={24}
                  color={colors.text}
                />
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionLabel, { color: colors.text + '99' }]}>
                    Travel Mode
                  </Text>
                  <Text style={[styles.optionValue, { color: colors.text }]}>
                    {getProfileLabel(settings?.preferred_routing_profile || null)}
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
                },
              }}
            >
              <MenuOption onSelect={() => handleProfileSelect('walking')}>
                <View style={styles.menuOptionContent}>
                  <MaterialIcons name="directions-walk" size={20} color={colors.text} />
                  <Text style={[styles.menuOptionText, { color: colors.text }]}>Walking</Text>
                </View>
              </MenuOption>
              <MenuOption onSelect={() => handleProfileSelect('cycling')}>
                <View style={styles.menuOptionContent}>
                  <MaterialIcons name="directions-bike" size={20} color={colors.text} />
                  <Text style={[styles.menuOptionText, { color: colors.text }]}>Cycling</Text>
                </View>
              </MenuOption>
              <MenuOption onSelect={() => handleProfileSelect('driving')}>
                <View style={styles.menuOptionContent}>
                  <MaterialIcons name="directions-car" size={20} color={colors.text} />
                  <Text style={[styles.menuOptionText, { color: colors.text }]}>Driving</Text>
                </View>
              </MenuOption>
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <MenuProvider>
        <Pressable style={styles.overlay} onPress={onClose}>
          <View onStartShouldSetResponder={() => true}>{renderContent()}</View>
        </Pressable>
      </MenuProvider>
    </Modal>
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
  menuOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuOptionText: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 12,
    paddingHorizontal: 16,
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

export default RoutePreferencesCard;
