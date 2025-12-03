import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { useClient } from 'react-supabase';
import type { Database } from '@/supabase/types';

type TripPointInsert = Database['recording']['Tables']['trip_points']['Insert'];

interface LocationPoint {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  timestamp: number;
}

interface UseLocationTrackingOptions {
  tripId: string | null;
  captureInterval: number; // in seconds
  batchSize?: number; // number of points to batch before sending
  batchTimeout?: number; // max time in ms to wait before sending batch
}

interface UseLocationTrackingReturn {
  isTracking: boolean;
  currentLocation: LocationPoint | null;
  error: string | null;
  permissionStatus: Location.PermissionStatus | null;
  requestPermissions: () => Promise<boolean>;
  startTracking: () => Promise<boolean>;
  stopTracking: () => void;
  syncAllPoints: () => Promise<void>;
  queuedPointsCount: number;
}

export function useLocationTracking({
  tripId,
  captureInterval = 5,
  batchSize = 10,
  batchTimeout = 30000,
}: UseLocationTrackingOptions): UseLocationTrackingReturn {
  const supabase = useClient();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [queuedPointsCount, setQueuedPointsCount] = useState(0);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const pointsQueue = useRef<TripPointInsert[]>([]);
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncing = useRef(false);

  // Request location permissions
  const requestPermissions = async (): Promise<boolean> => {
    try {
      console.log('[useLocationTracking] Requesting location permissions...');

      // Request foreground permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

      console.log('[useLocationTracking] Foreground permission status:', foregroundStatus);

      if (foregroundStatus !== 'granted') {
        setError('Foreground location permission not granted');
        setPermissionStatus(foregroundStatus);
        return false;
      }

      // Request background permissions
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

      console.log('[useLocationTracking] Background permission status:', backgroundStatus);

      if (backgroundStatus !== 'granted') {
        setError(
          'Background location permission not granted. Recording will stop when app is backgrounded.',
        );
        // Still allow tracking with foreground only
      }

      setPermissionStatus(foregroundStatus);
      setError(null);
      console.log('[useLocationTracking] Permissions granted successfully');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request permissions');
      console.error('[useLocationTracking] Error requesting location permissions:', err);
      return false;
    }
  };

  // Check permission status on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
    })();
  }, []);

  // Sync queued points to database
  const syncQueuedPoints = useCallback(async () => {
    if (isSyncing.current || pointsQueue.current.length === 0 || !tripId) {
      return;
    }

    isSyncing.current = true;
    const pointsToSync = [...pointsQueue.current];

    try {
      console.log(`[useLocationTracking] Syncing ${pointsToSync.length} points for trip:`, tripId);

      const { error: insertError } = await supabase
        .schema('recording')
        .from('trip_points')
        .insert(pointsToSync);

      if (insertError) {
        console.error('[useLocationTracking] Insert error:', insertError);
        throw insertError;
      }

      console.log(`[useLocationTracking] Successfully synced ${pointsToSync.length} points`);

      // Remove synced points from queue
      pointsQueue.current = pointsQueue.current.slice(pointsToSync.length);
      setQueuedPointsCount(pointsQueue.current.length);
    } catch (err) {
      console.error('[useLocationTracking] Error syncing location points:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync location points');
      // Keep points in queue for retry
    } finally {
      isSyncing.current = false;
    }
  }, [tripId]);

  // Add point to queue and trigger sync if needed
  const queuePoint = useCallback(
    (point: TripPointInsert) => {
      pointsQueue.current.push(point);
      setQueuedPointsCount(pointsQueue.current.length);

      // Clear existing timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }

      // Sync immediately if batch size reached
      if (pointsQueue.current.length >= batchSize) {
        syncQueuedPoints();
      } else {
        // Set timeout to sync after batchTimeout
        batchTimeoutRef.current = setTimeout(() => {
          syncQueuedPoints();
        }, batchTimeout);
      }
    },
    [batchSize, batchTimeout, syncQueuedPoints],
  );

  // Start location tracking
  const startTracking = async (): Promise<boolean> => {
    if (!tripId) {
      setError('No active trip to track');
      return false;
    }

    if (permissionStatus !== 'granted') {
      const granted = await requestPermissions();
      if (!granted) return false;
    }

    try {
      setError(null);

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: captureInterval * 1000,
          distanceInterval: 0, // Capture based on time only
        },
        (location) => {
          const { latitude, longitude, altitude, accuracy, speed } = location.coords;

          // Validate coordinates
          if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            console.warn('Invalid coordinates received:', { latitude, longitude });
            return;
          }

          const locationPoint: LocationPoint = {
            latitude,
            longitude,
            altitude,
            accuracy,
            speed: speed ? speed * 3.6 : null, // Convert m/s to km/h
            timestamp: location.timestamp,
          };

          setCurrentLocation(locationPoint);

          // Create trip point for database
          const tripPoint: TripPointInsert = {
            trip_id: tripId,
            location: `POINT(${longitude} ${latitude})`,
            altitude_m: altitude,
            accuracy_m: accuracy,
            speed_kmh: locationPoint.speed,
            recorded_at: new Date(location.timestamp).toISOString(),
          };

          console.log('[useLocationTracking] Captured point:', {
            lat: latitude,
            lon: longitude,
            speed: locationPoint.speed,
            tripId,
          });

          queuePoint(tripPoint);
        },
      );

      locationSubscription.current = subscription;
      setIsTracking(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start tracking');
      console.error('Error starting location tracking:', err);
      return false;
    }
  };

  // Stop location tracking
  const stopTracking = useCallback(() => {
    console.log('[useLocationTracking] Stopping location tracking');

    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }

    // Note: We don't sync points here anymore - caller should use syncAllPoints() first
    // This prevents race conditions where points are synced after trip is completed

    setIsTracking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  // Auto-start tracking when tripId changes
  useEffect(() => {
    console.log('[useLocationTracking] Auto-start effect triggered:', {
      tripId,
      permissionStatus,
      isTracking,
    });

    if (tripId && permissionStatus === 'granted' && !isTracking) {
      console.log('[useLocationTracking] Auto-starting tracking for trip:', tripId);
      startTracking();
    } else if (!tripId && isTracking) {
      console.log('[useLocationTracking] Auto-stopping tracking');
      stopTracking();
    } else if (tripId && permissionStatus !== 'granted') {
      console.warn('[useLocationTracking] Cannot auto-start: permission not granted');
    }
  }, [tripId, permissionStatus, isTracking, startTracking, stopTracking]);

  // Force sync all queued points (useful before stopping a trip)
  const syncAllPoints = useCallback(async () => {
    console.log('[useLocationTracking] Force syncing all queued points...');

    // Clear any pending timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }

    // Sync all points
    await syncQueuedPoints();

    console.log('[useLocationTracking] Force sync complete');
  }, [syncQueuedPoints]);

  return {
    isTracking,
    currentLocation,
    error,
    permissionStatus,
    requestPermissions,
    startTracking,
    stopTracking,
    syncAllPoints,
    queuedPointsCount,
  };
}
