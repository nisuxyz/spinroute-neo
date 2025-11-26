import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  View,
  useColorScheme,
  ImageSourcePropType,
  Text,
  Platform,
} from 'react-native';
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome,
  FontAwesome5,
  Feather,
  AntDesign,
  Entypo,
} from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Colors } from '@/constants/theme';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { lightenColor } from '@/utils/lighten-color';

type IconFamily =
  | 'MaterialIcons'
  | 'MaterialCommunityIcons'
  | 'Ionicons'
  | 'FontAwesome'
  | 'FontAwesome5'
  | 'Feather'
  | 'AntDesign'
  | 'Entypo';

type IconName<T extends IconFamily> = T extends 'MaterialIcons'
  ? ComponentProps<typeof MaterialIcons>['name']
  : T extends 'MaterialCommunityIcons'
    ? ComponentProps<typeof MaterialCommunityIcons>['name']
    : T extends 'Ionicons'
      ? ComponentProps<typeof Ionicons>['name']
      : T extends 'FontAwesome'
        ? ComponentProps<typeof FontAwesome>['name']
        : T extends 'FontAwesome5'
          ? ComponentProps<typeof FontAwesome5>['name']
          : T extends 'Feather'
            ? ComponentProps<typeof Feather>['name']
            : T extends 'AntDesign'
              ? ComponentProps<typeof AntDesign>['name']
              : T extends 'Entypo'
                ? ComponentProps<typeof Entypo>['name']
                : string;

interface MapActionButtonProps {
  icon?: string;
  iconFamily?: IconFamily;
  iconImage?: ImageSourcePropType;
  iconText?: string;
  text?: string;
  isActive: boolean;
  isLoading?: boolean;
  buttonColor: string;
  onActivate?: () => void;
  onDeactivate?: () => void;
  accessibilityLabel: string;
  testID?: string;
}

const MapActionButton: React.FC<MapActionButtonProps> = ({
  icon: iconName,
  iconFamily = 'MaterialIcons',
  iconImage,
  iconText,
  text,
  isActive,
  isLoading = false,
  buttonColor,
  onActivate,
  onDeactivate,
  accessibilityLabel,
  testID,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const useGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

  const handlePress = () => {
    if (isActive && onDeactivate) {
      onDeactivate();
    } else if (!isActive && onActivate) {
      onActivate();
    }
  };

  // Active: solid background with button color
  // Inactive: glass effect (iOS 26+) or dark gray background with colored icon and border
  const buttonAccentColor = lightenColor(buttonColor, 100);
  const backgroundColor = isActive
    ? buttonColor
    : useGlass
      ? 'transparent'
      : colors.buttonBackground;
  const borderColor = buttonColor;
  const borderWidth = isActive ? 0 : useGlass ? 0 : 2;
  // const iconColor = isActive ? '#FFFFFF' : buttonColor;
  const iconColor = isActive ? buttonAccentColor : buttonColor;

  const renderIcon = () => {
    if (!iconName) return null;

    const iconProps = {
      name: iconName as any,
      size: 24,
      color: iconColor,
      testID: `${testID}-icon`,
    };

    switch (iconFamily) {
      case 'MaterialIcons':
        return <MaterialIcons {...iconProps} />;
      case 'MaterialCommunityIcons':
        return <MaterialCommunityIcons {...iconProps} />;
      case 'Ionicons':
        return <Ionicons {...iconProps} />;
      case 'FontAwesome':
        return <FontAwesome {...iconProps} />;
      case 'FontAwesome5':
        return <FontAwesome5 {...iconProps} />;
      case 'Feather':
        return <Feather {...iconProps} />;
      case 'AntDesign':
        return <AntDesign {...iconProps} />;
      case 'Entypo':
        return <Entypo {...iconProps} />;
      default:
        return <MaterialIcons {...iconProps} />;
    }
  };

  const ButtonWrapper = useGlass && !isActive ? GlassView : View;
  const wrapperProps =
    useGlass && !isActive ? { glassEffectStyle: 'regular' as const, isInteractive: true } : {};

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
          borderWidth,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      testID={testID}
    >
      <ButtonWrapper style={styles.content} {...wrapperProps}>
        {isLoading ? (
          <ActivityIndicator size="small" color={iconColor} testID={`${testID}-loading`} />
        ) : (
          <>
            {iconName ? (
              renderIcon()
            ) : iconImage ? (
              <Image
                source={iconImage}
                style={[styles.icon, { tintColor: iconColor }]}
                testID={`${testID}-icon`}
              />
            ) : iconText ? (
              <Text style={[styles.iconText, { color: iconColor }]} testID={`${testID}-icon`}>
                {iconText}
              </Text>
            ) : null}
            {text && (
              <Text style={[styles.text, { color: iconColor }]} numberOfLines={1}>
                {text}
              </Text>
            )}
          </>
        )}
      </ButtonWrapper>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
    borderRadius: 12,
    elevation: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    shadowColor: Colors.dark.shadow,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  icon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  iconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default MapActionButton;
