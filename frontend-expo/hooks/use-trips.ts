import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './use-auth';
import { useClient } from 'react-supabase';
import { useUserSettings } from '@/contexts/user-settings-context';
import type { Database } from '@/supabase/types';

type Trip = Database['recording']['Tables']['trips']['Row'];
type TripBasicStats = Database['recording']['Tables']['trip_basic_stats']['Row'];

const KM_TO_MI = 0.621371;

// Display stats with converted units
export interface DisplayStats {
  distance: number | null;
  avg_speed: number | null;
  max_speed: number | null;
  moving_duration_seconds: number | null;
  duration_seconds: number | null;
  distance_unit: 'km' | 'mi';
  speed_unit: 'km/h' | 'mph';
}

export interface TripWithStats extends Trip {
  trip_basic_stats?: TripBasicStats | null;
  display_stats?: DisplayStats;
}

export interface UseTripsOptions {
  pageSize?: number;
  startDate?: string;
  endDate?: string;
}

interface UseTripsReturn {
  trips: TripWithStats[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setDateRange: (startDate?: string, endDate?: string) => void;
}

export function useTrips(options: UseTripsOptions = {}): UseTripsReturn {
  const { user } = useAuth();
  const supabase = useClient();
  const { settings } = useUserSettings();
  const { pageSize = 20, startDate, endDate } = options;

  const [rawTrips, setRawTrips] = useState<TripWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [dateFilter, setDateFilter] = useState<{ start?: string; end?: string }>({
    start: startDate,
    end: endDate,
  });

  const isImperial = settings?.units === 'imperial';

  // Convert trips based on user's unit preference
  const trips: TripWithStats[] = useMemo(() => {
    return rawTrips.map((trip) => {
      const stats = trip.trip_basic_stats;
      return {
        ...trip,
        display_stats: {
          distance: stats?.distance_km
            ? isImperial
              ? stats.distance_km * KM_TO_MI
              : stats.distance_km
            : null,
          avg_speed: stats?.avg_speed_kmh
            ? isImperial
              ? stats.avg_speed_kmh * KM_TO_MI
              : stats.avg_speed_kmh
            : null,
          max_speed: stats?.max_speed_kmh
            ? isImperial
              ? stats.max_speed_kmh * KM_TO_MI
              : stats.max_speed_kmh
            : null,
          moving_duration_seconds: stats?.moving_duration_seconds ?? null,
          duration_seconds: stats?.duration_seconds ?? null,
          distance_unit: isImperial ? 'mi' : 'km',
          speed_unit: isImperial ? 'mph' : 'km/h',
        },
      };
    });
  }, [rawTrips, isImperial]);

  const fetchTrips = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        // Build query for trips with basic stats
        let query = supabase
          .schema('recording')
          .from('trips')
          .select(
            `
            *,
            trip_basic_stats (*)
          `,
          )
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('started_at', { ascending: false })
          .range(pageNum * pageSize, (pageNum + 1) * pageSize - 1);

        // Apply date range filter if provided
        if (dateFilter.start) {
          query = query.gte('started_at', dateFilter.start);
        }
        if (dateFilter.end) {
          query = query.lte('started_at', dateFilter.end);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        const tripsWithStats: TripWithStats[] = (data || []).map((trip) => ({
          ...trip,
          trip_basic_stats: Array.isArray(trip.trip_basic_stats)
            ? trip.trip_basic_stats[0] || null
            : trip.trip_basic_stats,
        }));

        if (append) {
          setRawTrips((prev) => [...prev, ...tripsWithStats]);
        } else {
          setRawTrips(tripsWithStats);
        }

        // Check if there are more trips to load
        setHasMore(tripsWithStats.length === pageSize);
      } catch (err) {
        console.error('Error fetching trips:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch trips');
      } finally {
        setLoading(false);
      }
    },
    [user, pageSize, dateFilter],
  );

  // Initial load
  useEffect(() => {
    setPage(0);
    fetchTrips(0, false);
  }, [fetchTrips]);

  const loadMore = async () => {
    if (!hasMore || loading) return;

    const nextPage = page + 1;
    setPage(nextPage);
    await fetchTrips(nextPage, true);
  };

  const refresh = async () => {
    setPage(0);
    setHasMore(true);
    await fetchTrips(0, false);
  };

  const setDateRange = (start?: string, end?: string) => {
    setDateFilter({ start, end });
    setPage(0);
    setHasMore(true);
  };

  return {
    trips,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    setDateRange,
  };
}
