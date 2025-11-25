import React from 'react';
import { useColorScheme } from 'react-native';
import MapActionButton from './MapActionButton';
import { Colors } from '@/constants/theme';

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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <MapActionButton
      iconImage={require('../assets/images/pin.png')}
      isActive={isStationsVisible}
      isLoading={isLoading}
      buttonColor={colors.buttonBorder}
      onActivate={onToggle}
      onDeactivate={onToggle}
      accessibilityLabel={
        isStationsVisible ? 'Hide bike share stations' : 'Show bike share stations'
      }
      testID="station-toggle"
    />
  );
};

export default StationToggleButton;
