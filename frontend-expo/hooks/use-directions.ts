import { useState, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useEnv } from './use-env';
import { useUserSettings } from './use-user-settings';

interface Coordinate {
  latitude: number;
  longitude: number;
}

enum RouteProfile {
  WALKING = 'walking',
  CYCLING = 'cycling',
  DRIVING = 'driving',
  PUBLIC_TRANSPORT = 'public-transport',
}

enum BikeType {
  ROAD = 'road',
  MOUNTAIN = 'mountain',
  EBIKE = 'ebike',
  GENERIC = 'generic',
}

interface DirectionsRequest {
  origin: Coordinate;
  destination: Coordinate;
  profile?: RouteProfile;
  bikeType?: BikeType;
  provider?: string;
}

interface Maneuver {
  type: string;
  instruction: string;
  bearing_after: number;
  bearing_before: number;
  location: [number, number];
  modifier?: string;
}

interface RouteStep {
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString | string;
  name: string;
  mode: string;
  maneuver: Maneuver;
}

interface RouteLeg {
  distance: number;
  duration: number;
  steps: RouteStep[];
  summary: string;
}

interface Route {
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString | string;
  legs: RouteLeg[];
  weight: number;
  weight_name: string;
}

interface Waypoint {
  name: string;
  location: [number, number];
  distance?: number;
}

interface DirectionsResponse {
  code: string;
  routes: Route[];
  waypoints: Waypoint[];
  provider: string;
  warnings?: string[];
}

interface UseDirectionsResult {
  route: DirectionsResponse | null;
  loading: boolean;
  error: string | null;
  calculateRoute: (request: DirectionsRequest) => Promise<void>;
  clearRoute: () => void;
}

export const useDirections = (): UseDirectionsResult => {
  const [route, setRoute] = useState<DirectionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  const { settings } = useUserSettings();
  const env = useEnv(settings?.useDevUrls);

  const calculateRoute = useCallback(
    async (request: DirectionsRequest) => {
      if (!session?.access_token) {
        setError('Authentication required');
        return;
      }

      // Get routing service URL from environment
      // Note: useEnv strips EXPO_PUBLIC_ prefix and _URL suffix, so EXPO_PUBLIC_ROUTING_SERVICE_URL becomes ROUTING_SERVICE
      const routingServiceUrl = env.ROUTING_SERVICE || env.SUPABASE;
      if (!routingServiceUrl) {
        console.error('Available env keys:', Object.keys(env));
        setError('Routing service URL not configured');
        return;
      }

      console.log('Using routing service URL:', routingServiceUrl);

      setLoading(true);
      setError(null);

      try {
        // Use user preferences as defaults, but allow override via request parameters
        const profile =
          request.profile ||
          (settings?.preferred_routing_profile as RouteProfile) ||
          RouteProfile.CYCLING;

        const bikeType =
          request.bikeType || (settings?.preferred_bike_type as BikeType) || BikeType.GENERIC;

        const provider = request.provider || settings?.preferred_routing_provider || undefined;

        const requestBody = {
          waypoints: [
            {
              latitude: request.origin.latitude,
              longitude: request.origin.longitude,
            },
            {
              latitude: request.destination.latitude,
              longitude: request.destination.longitude,
            },
          ],
          profile,
          bikeType,
          provider,
        };

        const response = await fetch(`${routingServiceUrl}/api/routing/directions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(requestBody),
        });

        console.log({ response });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Route calculation failed: ${response.statusText}`);
        }

        const data: DirectionsResponse = await response.json();

        if (data.code !== 'Ok') {
          throw new Error(`Route calculation failed: ${data.code}`);
        }

        setRoute(data);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to calculate route';
        setError(errorMessage);
        setRoute(null);
        console.error('Error calculating route:', err);
      } finally {
        setLoading(false);
      }
    },
    [session, env, settings],
  );

  const clearRoute = useCallback(() => {
    setRoute(null);
    setError(null);
  }, []);

  return {
    route,
    loading,
    error,
    calculateRoute,
    clearRoute,
  };
};

// Export types for use in components
export type { DirectionsRequest, DirectionsResponse, Route, RouteStep, RouteLeg };
export { RouteProfile, BikeType };
