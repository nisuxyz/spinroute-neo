import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Bike } from '@/hooks/use-bikes';
import { useWeather } from '@/hooks/use-weather';

interface ActiveBikeIndicatorProps {
  bike: Bike | undefined;
  loading?: boolean;
  isRecording?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

const bikeTypeIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  road: 'pedal-bike',
  mountain: 'terrain',
  hybrid: 'directions-bike',
  ebike: 'electric-bike',
  gravel: 'landscape',
  other: 'two-wheeler',
};

const ActiveBikeIndicator: React.FC<ActiveBikeIndicatorProps> = ({
  bike,
  loading = false,
  isRecording = false,
  latitude = null,
  longitude = null,
}) => {
  const textColor = useThemeColor({}, 'text');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { weather } = useWeather({ latitude, longitude, enabled: !!bike });

  // Flashing animation for recording indicator
  useEffect(() => {
    if (isRecording) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // Always show loading indicator when loading
  // if (loading) {
  //   return (
  //     <View style={styles.container}>
  //       <GlassView style={{ borderRadius: 32 }}>
  //         <View style={styles.content}>
  //           <ActivityIndicator size="small" color={colors.buttonIcon} />
  //         </View>
  //       </GlassView>
  //     </View>
  //   );
  // }

  if (!bike) {
    return null;
  }

  const icon = bikeTypeIcons[bike.type] || 'pedal-bike';

  const bikeColor = bike.color || '#3b82f6';

  return (
    <View style={styles.container}>
      <GlassView style={{ borderRadius: BorderRadius.xxxl }} glassEffectStyle="clear">
        <View style={styles.content}>
          <MaterialIcons name={icon} size={16} color={bikeColor} />
          <Text
            style={[Typography.bodySmall, { fontWeight: '600', color: textColor }]}
            numberOfLines={1}
          >
            {bike.name}
          </Text>
          {isRecording && <Animated.View style={[styles.recordingDot, { opacity: pulseAnim }]} />}
          {weather && (
            <View style={styles.weatherContainer}>
              <View style={styles.weatherItem}>
                <MaterialIcons name="thermostat" size={14} color={textColor} />
                <Text style={[Typography.caption, { fontWeight: '500', color: textColor }]}>
                  {Math.round(weather.temperature)}°C
                </Text>
              </View>
              <View style={styles.weatherItem}>
                <MaterialIcons name="air" size={14} color={textColor} />
                <Text style={[Typography.caption, { fontWeight: '500', color: textColor }]}>
                  {Math.round(weather.windSpeed)} km/h
                </Text>
              </View>
            </View>
          )}
        </View>
      </GlassView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 6,
    maxWidth: 300,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.round,
    backgroundColor: '#ef4444',
    marginLeft: 2,
  },
  weatherContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginLeft: 4,
    paddingLeft: Spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.3)',
  },
  weatherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});

export default ActiveBikeIndicator;
