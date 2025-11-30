import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, useColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

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
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default GetDirectionsButton;
