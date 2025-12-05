import { useEffect, useState } from 'react';
import { useClient } from 'react-supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/supabase/types';

type StationRow = Database['bikeshare']['Tables']['station']['Row'];

/**
 * Hook for subscribing to real-time station updates
 *
 * Listens for changes to a specific station and returns updated data
 * when the station's availability or status changes.
 *
 * @param stationId - The ID of the station to subscribe to
 * @returns The latest station data or null if not available
 */
export const useStationRealtime = (stationId: string | null) => {
  const supabase = useClient();
  const [stationData, setStationData] = useState<StationRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stationId) {
      setStationData(null);
      return;
    }

    let channel: RealtimeChannel | null = null;

    const setupSubscription = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch initial station data
        const { data, error: fetchError } = await supabase
          .schema('bikeshare')
          .from('station')
          .select('*')
          .eq('id', stationId)
          .single();

        if (fetchError) {
          console.error('Error fetching initial station data:', fetchError);
          setError(fetchError.message);
          setLoading(false);
          return;
        }

        setStationData(data);
        setLoading(false);

        // Set up real-time subscription
        channel = supabase
          .channel(`station:${stationId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'bikeshare',
              table: 'station',
              filter: `id=eq.${stationId}`,
            },
            (payload) => {
              console.log('Station update received:', payload);
              setStationData(payload.new as StationRow);
            },
          )
          .subscribe((status) => {
            console.log(`Station subscription status: ${status}`);
          });
      } catch (err) {
        console.error('Error setting up station subscription:', err);
        setError('Failed to subscribe to station updates');
        setLoading(false);
      }
    };

    setupSubscription();

    // Cleanup subscription on unmount or when stationId changes
    return () => {
      if (channel) {
        console.log(`Unsubscribing from station:${stationId}`);
        supabase.removeChannel(channel);
      }
    };
  }, [stationId, supabase]);

  return {
    stationData,
    loading,
    error,
  };
};
