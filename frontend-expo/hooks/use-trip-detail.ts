import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { supabase } from '@/utils/supabase';
import type { Database } from '@/supabase/types';

type Trip = Database['recording']['Tables']['trips']['Row'];
type TripBasicStats = Database['recording']['Tables']['trip_basic_stats']['Row'];
type TripAdvancedStats = Database['recording']['Tables']['trip_advanced_stats']['Row'];
type TripPoint = Database['recording']['Tables']['trip_points']['Row'];

export interface TripDetail extends Trip {
  trip_basic_stats?: TripBasicStats | null;
  trip_advanced_stats?: TripAdvancedStats | null;
}

export interface RouteGeometry {
  type: 'LineString';
  coordinates: Array<[number, number] | [number, number, number]>; // [longitude, latitude, altitude?]
}

export interface RouteFeature {
  type: 'Feature';
  geometry: RouteGeometry;
  properties: {
    trip_id: string;
    point_count: number;
  };
}

interface UseTripDetailReturn {
  trip: TripDetail | null;
  tripPoints: TripPoint[];
  routeGeoJSON: RouteFeature | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTripDetail(tripId: string): UseTripDetailReturn {
  const { user } = useAuth();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [tripPoints, setTripPoints] = useState<TripPoint[]>([]);
  const [routeGeoJSON, setRouteGeoJSON] = useState<RouteFeature | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTripDetail = useCallback(async () => {
    if (!user || !tripId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch trip with basic stats and advanced stats
      const { data: tripData, error: tripError } = await supabase
        .schema('recording')
        .from('trips')
        .select(
          `
          *,
          trip_basic_stats (*),
          trip_advanced_stats (*)
        `,
        )
        .eq('id', tripId)
        .eq('user_id', user.id)
        .single();

      if (tripError) throw tripError;

      if (!tripData) {
        throw new Error('Trip not found');
      }

      const tripDetail: TripDetail = {
        ...tripData,
        trip_basic_stats: Array.isArray(tripData.trip_basic_stats)
          ? tripData.trip_basic_stats[0] || null
          : tripData.trip_basic_stats,
        trip_advanced_stats: Array.isArray(tripData.trip_advanced_stats)
          ? tripData.trip_advanced_stats[0] || null
          : tripData.trip_advanced_stats,
      };

      setTrip(tripDetail);

      // Fetch trip points for route visualization
      const { data: pointsData, error: pointsError } = await supabase
        .schema('recording')
        .from('trip_points')
        .select('*')
        .eq('trip_id', tripId)
        .order('recorded_at', { ascending: true });

      if (pointsError) throw pointsError;

      setTripPoints(pointsData || []);

      // Generate GeoJSON LineString from points
      if (pointsData && pointsData.length > 0) {
        const coordinates: Array<[number, number] | [number, number, number]> = pointsData
          .map((point) => {
            // Parse PostGIS geography point format
            // Format: POINT(longitude latitude)
            const locationStr = point.location as unknown as string;
            if (typeof locationStr === 'string') {
              const match = locationStr.match(/POINT\(([^ ]+) ([^ ]+)\)/);
              if (match) {
                const lng = parseFloat(match[1]);
                const lat = parseFloat(match[2]);
                if (point.altitude_m !== null && point.altitude_m !== undefined) {
                  return [lng, lat, point.altitude_m] as [number, number, number];
                }
                return [lng, lat] as [number, number];
              }
            }
            return null;
          })
          .filter((coord): coord is [number, number] | [number, number, number] => coord !== null);

        if (coordinates.length > 0) {
          const geoJSON: RouteFeature = {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates,
            },
            properties: {
              trip_id: tripId,
              point_count: coordinates.length,
            },
          };
          setRouteGeoJSON(geoJSON);
        }
      }
    } catch (err) {
      console.error('Error fetching trip detail:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trip details');
    } finally {
      setLoading(false);
    }
  }, [user, tripId]);

  useEffect(() => {
    fetchTripDetail();
  }, [fetchTripDetail]);

  const refresh = async () => {
    await fetchTripDetail();
  };

  return {
    trip,
    tripPoints,
    routeGeoJSON,
    loading,
    error,
    refresh,
  };
}
