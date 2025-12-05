import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, useColorScheme, ActivityIndicator, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { Colors } from '@/constants/theme';
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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
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
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
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
  if (loading) {
    return (
      <View style={styles.container}>
        <GlassView style={{ borderRadius: 16 }}>
          <View style={styles.content}>
            <ActivityIndicator size="small" color={colors.buttonIcon} />
          </View>
        </GlassView>
      </View>
    );
  }

  if (!bike) {
    return null;
  }

  const icon = bikeTypeIcons[bike.type] || 'pedal-bike';

  const bikeColor = bike.color || '#3b82f6';

  return (
    <View style={styles.container}>
      <GlassView style={{ borderRadius: 16 }}>
        <View style={styles.content}>
          <MaterialIcons name={icon} size={16} color={bikeColor} />
          <Text style={[styles.bikeText, { color: colors.text }]} numberOfLines={1}>
            {bike.name}
          </Text>
          {isRecording && (
            <Animated.View
              style={[
                styles.recordingDot,
                {
                  opacity: pulseAnim,
                },
              ]}
            />
          )}
          {weather && (
            <View style={styles.weatherContainer}>
              <View style={styles.weatherItem}>
                <MaterialIcons name="thermostat" size={14} color={colors.text} />
                <Text style={[styles.weatherText, { color: colors.text }]}>
                  {Math.round(weather.temperature)}°C
                </Text>
              </View>
              <View style={styles.weatherItem}>
                <MaterialIcons name="air" size={14} color={colors.text} />
                <Text style={[styles.weatherText, { color: colors.text }]}>
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
    // right: 80,
    // top: 100,
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
    maxWidth: 300,
  },
  bikeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginLeft: 2,
  },
  weatherContainer: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 4,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.3)',
  },
  weatherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  weatherText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default ActiveBikeIndicator;
