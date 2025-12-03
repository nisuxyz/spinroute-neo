import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useClient } from 'react-supabase';
import type { Database } from '@/supabase/types';

type Trip = Database['recording']['Tables']['trips']['Row'];
type TripBasicStats = Database['recording']['Tables']['trip_basic_stats']['Row'];

export interface TripWithStats extends Trip {
  trip_basic_stats?: TripBasicStats | null;
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
  const { pageSize = 20, startDate, endDate } = options;

  const [trips, setTrips] = useState<TripWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [dateFilter, setDateFilter] = useState<{ start?: string; end?: string }>({
    start: startDate,
    end: endDate,
  });

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
          setTrips((prev) => [...prev, ...tripsWithStats]);
        } else {
          setTrips(tripsWithStats);
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
