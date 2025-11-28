import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useTripRecording } from '@/hooks/use-trip-recording';
import { useLocationTracking } from '@/hooks/use-location-tracking';
import { useUserSettings } from '@/hooks/use-user-settings';

interface TripRecordingControlProps {
  onTripStarted?: () => void;
  onTripStopped?: () => void;
}

export function TripRecordingControl({ onTripStarted, onTripStopped }: TripRecordingControlProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const useGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

  const { settings } = useUserSettings();
  const captureInterval = settings?.capture_interval_seconds || 5;

  const { activeTrip, loading, error, startTrip, stopTrip, pauseTrip, resumeTrip } =
    useTripRecording();

  const { isTracking, currentLocation, permissionStatus, requestPermissions, queuedPointsCount } =
    useLocationTracking({
      tripId: activeTrip?.id || null,
      captureInterval,
    });

  const [elapsedTime, setElapsedTime] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);

  // Calculate elapsed time
  useEffect(() => {
    if (!activeTrip || activeTrip.status === 'completed') {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      const startTime = new Date(activeTrip.started_at).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTrip]);

  // Update speed from current location
  useEffect(() => {
    if (currentLocation?.speed !== null && currentLocation?.speed !== undefined) {
      setSpeed(currentLocation.speed);
    }
  }, [currentLocation]);

  const handleStart = async () => {
    if (permissionStatus !== 'granted') {
      const granted = await requestPermissions();
      if (!granted) return;
    }

    const trip = await startTrip();
    if (trip) {
      onTripStarted?.();
    }
  };

  const handleStop = async () => {
    const success = await stopTrip();
    if (success) {
      setDistance(0);
      setSpeed(0);
      onTripStopped?.();
    }
  };

  const handlePause = async () => {
    await pauseTrip();
  };

  const handleResume = async () => {
    await resumeTrip();
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const Container = useGlass ? GlassView : View;
  const containerProps = useGlass
    ? { glassEffectStyle: 'regular' as const, isInteractive: false }
    : {};

  return (
    <Container
      style={[styles.container, !useGlass && { backgroundColor: colors.buttonBackground }]}
      {...containerProps}
    >
      {/* Stats Display */}
      {activeTrip && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialIcons name="timer" size={16} color={colors.icon} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatTime(elapsedTime)}
            </Text>
          </View>

          <View style={styles.statItem}>
            <MaterialIcons name="speed" size={16} color={colors.icon} />
            <Text style={[styles.statValue, { color: colors.text }]}>{speed.toFixed(1)} km/h</Text>
          </View>

          <View style={styles.statItem}>
            <MaterialIcons name="my-location" size={16} color={colors.icon} />
            <Text style={[styles.statValue, { color: colors.text }]}>{captureInterval}s</Text>
          </View>

          {queuedPointsCount > 0 && (
            <View style={styles.statItem}>
              <MaterialIcons name="cloud-upload" size={16} color={colors.icon} />
              <Text style={[styles.statValue, { color: colors.text }]}>{queuedPointsCount}</Text>
            </View>
          )}
        </View>
      )}

      {/* Error Display */}
      {error && (
        <Text style={[styles.errorText, { color: '#ef4444' }]} numberOfLines={2}>
          {error}
        </Text>
      )}

      {/* Control Buttons */}
      <View style={styles.buttonContainer}>
        {!activeTrip ? (
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={handleStart}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <MaterialIcons name="play-arrow" size={24} color="#ffffff" />
                <Text style={styles.buttonText}>Start Trip</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <>
            {activeTrip.status === 'in_progress' ? (
              <TouchableOpacity
                style={[styles.button, styles.pauseButton]}
                onPress={handlePause}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="pause" size={24} color="#ffffff" />
                    <Text style={styles.buttonText}>Pause</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.resumeButton]}
                onPress={handleResume}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="play-arrow" size={24} color="#ffffff" />
                    <Text style={styles.buttonText}>Resume</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={handleStop}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <MaterialIcons name="stop" size={24} color="#ffffff" />
                  <Text style={styles.buttonText}>Stop</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Tracking Status */}
      {activeTrip && (
        <View style={styles.statusContainer}>
          <View
            style={[styles.statusDot, { backgroundColor: isTracking ? '#22c55e' : '#6b7280' }]}
          />
          <Text style={[styles.statusText, { color: colors.icon }]}>
            {isTracking ? 'Recording' : 'Not Recording'}
          </Text>
        </View>
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    elevation: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    shadowColor: Colors.dark.shadow,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  startButton: {
    backgroundColor: '#22c55e',
  },
  pauseButton: {
    backgroundColor: '#eab308',
  },
  resumeButton: {
    backgroundColor: '#22c55e',
  },
  stopButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
  },
});
