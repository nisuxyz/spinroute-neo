import React, { useEffect, useRef } from 'react';
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
  Animated,
  Easing,
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
  customLoadingIcon?: boolean;
  loadingSpinSpeed?: number;
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
  customLoadingIcon = false,
  loadingSpinSpeed = 1000,
  buttonColor,
  onActivate,
  onDeactivate,
  accessibilityLabel,
  testID,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const useGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading && customLoadingIcon) {
      const animation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: loadingSpinSpeed,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      );
      animation.start();
      return () => animation.stop();
    } else {
      spinValue.setValue(0);
    }
  }, [isLoading, customLoadingIcon, loadingSpinSpeed, spinValue]);

  const handlePress = () => {
    if (isActive && onDeactivate) {
      onDeactivate();
    } else if (!isActive && onActivate) {
      onActivate();
    }
  };

  // Both active and inactive use glass effect (iOS 26+) or dark gray background
  // Active state: 'regular' glass effect with icon glow
  // Inactive state: 'clear' glass effect
  const backgroundColor = useGlass ? 'transparent' : colors.buttonBackground;
  const borderColor = buttonColor;
  const borderWidth = useGlass ? 0 : 2;
  const iconColor = buttonColor;

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderIcon = () => {
    if (!iconName) return null;

    const iconProps = {
      name: iconName as any,
      size: 24,
      color: isActive ? iconColor : lightenColor(iconColor, 20),
      testID: `${testID}-icon`,
    };

    let IconComponent;
    switch (iconFamily) {
      case 'MaterialIcons':
        IconComponent = <MaterialIcons {...iconProps} />;
        break;
      case 'MaterialCommunityIcons':
        IconComponent = <MaterialCommunityIcons {...iconProps} />;
        break;
      case 'Ionicons':
        IconComponent = <Ionicons {...iconProps} />;
        break;
      case 'FontAwesome':
        IconComponent = <FontAwesome {...iconProps} />;
        break;
      case 'FontAwesome5':
        IconComponent = <FontAwesome5 {...iconProps} />;
        break;
      case 'Feather':
        IconComponent = <Feather {...iconProps} />;
        break;
      case 'AntDesign':
        IconComponent = <AntDesign {...iconProps} />;
        break;
      case 'Entypo':
        IconComponent = <Entypo {...iconProps} />;
        break;
      default:
        IconComponent = <MaterialIcons {...iconProps} />;
    }

    const iconWithGlow = isActive ? (
      <View style={styles.iconGlow}>{IconComponent}</View>
    ) : (
      IconComponent
    );

    if (isLoading && customLoadingIcon) {
      return (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>{iconWithGlow}</Animated.View>
      );
    }

    return iconWithGlow;
  };

  const ButtonWrapper = useGlass ? GlassView : View;
  const wrapperProps = useGlass
    ? {
        glassEffectStyle: isActive ? ('regular' as const) : ('clear' as const),
        isInteractive: true,
      }
    : {};

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
          borderWidth,
          padding: isActive ? 2 : 0,
          // padding
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
        {isLoading && !customLoadingIcon ? (
          <ActivityIndicator size="small" color={iconColor} testID={`${testID}-loading`} />
        ) : (
          <>
            {iconName ? (
              renderIcon()
            ) : iconImage ? (
              isLoading && customLoadingIcon ? (
                <Animated.Image
                  source={iconImage}
                  style={[
                    styles.icon,
                    { tintColor: iconColor, transform: [{ rotate: spin }] },
                    isActive && styles.iconGlow,
                  ]}
                  testID={`${testID}-icon`}
                />
              ) : (
                <Image
                  source={iconImage}
                  style={[styles.icon, { tintColor: iconColor }, isActive && styles.iconGlow]}
                  testID={`${testID}-icon`}
                />
              )
            ) : iconText ? (
              <Text
                style={[styles.iconText, { color: iconColor }, isActive && styles.iconGlow]}
                testID={`${testID}-icon`}
              >
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
    borderRadius: 24,
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
    borderRadius: 24,
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
  iconGlow: {
    shadowColor: '#8B5CF6', // electricPurple
    shadowOffset: {
      width: 2,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
  },
});

export default MapActionButton;
