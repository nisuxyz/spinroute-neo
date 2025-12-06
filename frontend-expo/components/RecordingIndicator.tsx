import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { BorderRadius } from '@/constants/theme';

interface RecordingIndicatorProps {
  size?: number;
  color?: string;
}

/**
 * RecordingIndicator - Animated pulsing dot to indicate active recording
 *
 * Features:
 * - Smooth opacity animation (1.0 -> 0.3 -> 1.0)
 * - Configurable size and color
 * - Automatically starts/stops animation
 */
const RecordingIndicator: React.FC<RecordingIndicatorProps> = ({ size = 8, color = '#ef4444' }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: pulseAnim,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  dot: {
    // Base styles, size and color are dynamic
  },
});

export default RecordingIndicator;
