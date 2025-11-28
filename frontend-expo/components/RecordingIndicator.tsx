import React from 'react';
import { StyleSheet, View, Text, useColorScheme } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { Colors } from '@/constants/theme';

interface RecordingIndicatorProps {
  isTracking: boolean;
  queuedPointsCount: number;
}

const RecordingIndicator: React.FC<RecordingIndicatorProps> = ({
  isTracking,
  queuedPointsCount,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.container}>
      <GlassView style={{ borderRadius: 16 }}>
        <View style={styles.content}>
          <View
            style={[styles.recordingDot, { backgroundColor: isTracking ? '#22c55e' : '#ef4444' }]}
          />
          <Text style={[styles.recordingText, { color: colors.text }]}>
            {isTracking ? 'Recording' : 'Not Recording'}
          </Text>
          {queuedPointsCount > 0 && (
            <Text style={[styles.queuedText, { color: colors.icon }]}>
              ({queuedPointsCount} queued)
            </Text>
          )}
        </View>
      </GlassView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  queuedText: {
    fontSize: 10,
    color: '#ffffff',
    opacity: 0.8,
  },
});

export default RecordingIndicator;
