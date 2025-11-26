import React from 'react';
import { TouchableOpacity, StyleSheet, Text, View, Platform, useColorScheme } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface SearchButtonProps {
  onPress: () => void;
}

const SearchButton: React.FC<SearchButtonProps> = ({ onPress }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const hasGlassEffect = Platform.OS === 'ios' && isLiquidGlassAvailable();

  const GlassContainer = hasGlassEffect ? GlassView : View;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel="Open search"
      accessibilityRole="button"
    >
      <GlassContainer
        style={[
          styles.glassButton,
          !hasGlassEffect && {
            backgroundColor: colors.buttonBackground,
            borderWidth: 2,
            borderColor: colors.text + '20',
          },
        ]}
        {...(hasGlassEffect && { glassEffectStyle: 'regular' })}
      >
        <MaterialIcons name="search" size={24} color={colors.text} />
        <Text style={[styles.searchText, { color: colors.text }]}>Search for places...</Text>
      </GlassContainer>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    right: 16,
    zIndex: 900,
  },
  glassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 12,
    shadowColor: Colors.dark.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  searchText: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.7,
  },
});

export default SearchButton;
