import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, Image, View } from 'react-native';

interface StationToggleButtonProps {
  isStationsVisible: boolean;
  isLoading: boolean;
  onToggle: () => void;
}

const StationToggleButton: React.FC<StationToggleButtonProps> = ({
  isStationsVisible,
  isLoading,
  onToggle,
}) => {
  // Define custom colors for the station toggle button
  const DARK_GREY = '#2A2A2A';
  const LIGHT_GREY = '#9A9A9A';
  const ELECTRIC_PURPLE = '#8B5CF6'; // Lilac/electric purple

  // Button styling based on state
  const buttonBackgroundColor = DARK_GREY;
  const buttonBorderColor = ELECTRIC_PURPLE;
  const buttonIconColor = isStationsVisible ? ELECTRIC_PURPLE : LIGHT_GREY;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: buttonBackgroundColor,
          borderColor: buttonBorderColor,
          borderWidth: 2,
        },
      ]}
      onPress={onToggle}
      activeOpacity={0.8}
      accessibilityLabel={
        isStationsVisible ? 'Hide bike share stations' : 'Show bike share stations'
      }
      accessibilityRole="button"
    >
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="small" color={buttonIconColor} testID="loading-spinner" />
        ) : (
          <Image
            source={require('../assets/images/pin.png')}
            style={[styles.icon, { tintColor: buttonIconColor }]}
            testID="station-icon"
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100, // Bottom margin
    right: 10, // Right margin
    width: 48, // Standard FAB size (minimum 44pt touch target)
    height: 48,
    borderRadius: 12, // Rounded corners instead of circular
    elevation: 6, // Android shadow
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    shadowColor: '#000',
    zIndex: 1000, // Ensure button appears above map
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
    marginTop: 16, // Shift up to visually center the pin shape
  },
});

export default StationToggleButton;
