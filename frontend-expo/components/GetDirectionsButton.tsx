import React from 'react';
import { View } from 'react-native';
import { Icon } from './icon';
import { Button } from './ui/button';
import { Text } from './ui/text';
// import { Colors, ButtonStyles, Spacing, Typography } from '@/constants/theme';

interface GetDirectionsButtonProps {
  onPress: () => void;
  mode?: 'initial' | 'recalculate';
  isLoading?: boolean;
  disabled?: boolean;
  style?: any;
}

const GetDirectionsButton: React.FC<GetDirectionsButtonProps> = ({
  onPress,
  mode = 'initial',
  isLoading = false,
}) => {
  const buttonText = mode === 'initial' ? 'Get Directions' : 'Recalculate';
  const iconName = isLoading ? 'hourglass-empty' : 'directions';

  return (
    <Button size="xl" variant="secondary" disabled={isLoading} onPress={onPress}>
      <View className="flex flex-row gap-2 items-center">
        <Icon name={iconName} size={20} color="primaryForeground" />
        <Text className="font-semibold">{isLoading ? 'Calculating...' : buttonText}</Text>
      </View>
    </Button>
  );
};

export default GetDirectionsButton;
