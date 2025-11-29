import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, useColorScheme, ActivityIndicator, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { Colors } from '@/constants/theme';
import type { Bike } from '@/hooks/use-bikes';

interface ActiveBikeIndicatorProps {
  bike: Bike | undefined;
  loading?: boolean;
  isRecording?: boolean;
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
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

  return (
    <View style={styles.container}>
      <GlassView style={{ borderRadius: 16 }}>
        <View style={styles.content}>
          <MaterialIcons name={icon} size={16} color={colors.buttonIcon} />
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
        </View>
      </GlassView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // top: 56,
    // right: 80,
    bottom: 16,
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
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginLeft: 2,
  },
});

export default ActiveBikeIndicator;
