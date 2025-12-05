import React from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Menu, MenuTrigger, MenuOptions, MenuOption } from 'react-native-popup-menu';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useUserSettings } from '@/contexts/user-settings-context';

interface RoutePreferencesMenuProps {
  children: React.ReactNode;
  onConfirm: () => void;
  onProviderPress: () => void;
  onProfilePress: () => void;
}

const RoutePreferencesMenu: React.FC<RoutePreferencesMenuProps> = ({
  children,
  onConfirm,
  onProviderPress,
  onProfilePress,
}) => {
  const { settings } = useUserSettings();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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

  return (
    <Menu>
      <MenuTrigger customStyles={{ triggerTouchable: { underlayColor: 'transparent' } }}>
        {children}
      </MenuTrigger>
      <MenuOptions
        customStyles={{
          optionsContainer: {
            backgroundColor: colors.buttonBackground,
            borderRadius: 16,
            padding: 8,
            minWidth: 280,
          },
        }}
      >
        <View style={[styles.header, { borderBottomColor: colors.background }]}>
          <Text style={[styles.headerText, { color: colors.text }]}>Route Preferences</Text>
        </View>

        <MenuOption
          onSelect={onProviderPress}
          customStyles={{
            optionWrapper: styles.optionWrapper,
          }}
        >
          <View style={styles.optionContent}>
            <MaterialIcons name="route" size={20} color={colors.text} />
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionLabel, { color: colors.text + '99' }]}>Provider</Text>
              <Text style={[styles.optionValue, { color: colors.text }]}>
                {getProviderLabel(settings?.preferred_routing_provider || null)}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
          </View>
        </MenuOption>

        <MenuOption
          onSelect={onProfilePress}
          customStyles={{
            optionWrapper: styles.optionWrapper,
          }}
        >
          <View style={styles.optionContent}>
            <MaterialIcons
              name={getProfileIcon(settings?.preferred_routing_profile || null)}
              size={20}
              color={colors.text}
            />
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionLabel, { color: colors.text + '99' }]}>Travel Mode</Text>
              <Text style={[styles.optionValue, { color: colors.text }]}>
                {getProfileLabel(settings?.preferred_routing_profile || null)}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
          </View>
        </MenuOption>

        <View style={[styles.divider, { backgroundColor: colors.background }]} />

        <MenuOption
          onSelect={onConfirm}
          customStyles={{
            optionWrapper: [styles.optionWrapper, styles.confirmOption],
          }}
        >
          <View style={styles.confirmContent}>
            <MaterialIcons
              name="directions"
              size={20}
              color={Colors[colorScheme ?? 'light'].buttonIcon}
            />
            <Text
              style={[styles.confirmText, { color: Colors[colorScheme ?? 'light'].buttonIcon }]}
            >
              Get Directions
            </Text>
          </View>
        </MenuOption>
      </MenuOptions>
    </Menu>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  optionWrapper: {
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  optionValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  confirmOption: {
    paddingVertical: 14,
  },
  confirmContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default RoutePreferencesMenu;
