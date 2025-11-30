import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, useColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, ButtonStyles, Spacing, Typography } from '@/constants/theme';

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
  disabled = false,
  style,
}) => {
  const colorScheme = useColorScheme();

  const buttonText = mode === 'initial' ? 'Get Directions' : 'Recalculate';
  const iconName = isLoading ? 'hourglass-empty' : 'directions';

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: Colors[colorScheme ?? 'light'].buttonIcon }, style]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <MaterialIcons name={iconName} size={20} color="white" />
        <Text style={styles.text}>{isLoading ? 'Calculating...' : buttonText}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    ...ButtonStyles.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  text: {
    color: 'white',
    ...Typography.h3,
  },
});

export default GetDirectionsButton;
