import React from 'react';
import { StyleSheet, View, Text, useColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { Colors } from '@/constants/theme';
import type { Bike } from '@/hooks/use-bikes';

interface ActiveBikeIndicatorProps {
  bike: Bike;
}

const bikeTypeIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  road: 'pedal-bike',
  mountain: 'terrain',
  hybrid: 'directions-bike',
  ebike: 'electric-bike',
  gravel: 'landscape',
  other: 'two-wheeler',
};

const ActiveBikeIndicator: React.FC<ActiveBikeIndicatorProps> = ({ bike }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const icon = bikeTypeIcons[bike.type] || 'pedal-bike';

  // console.log('[ActiveBikeIndicator] Rendering with bike:', { name: bike.name, type: bike.type });

  return (
    <View style={styles.container}>
      <GlassView style={{ borderRadius: 16 }}>
        <View style={styles.content}>
          <MaterialIcons name={icon} size={16} color={colors.locationPuck} />
          <Text style={[styles.bikeText, { color: colors.text }]} numberOfLines={1}>
            {bike.name}
          </Text>
        </View>
      </GlassView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    maxWidth: 200,
  },
  bikeText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ActiveBikeIndicator;
