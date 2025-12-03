import { useState, useCallback } from 'react';
import { useClient } from 'react-supabase';
import type { Database } from '@/supabase/types';

type StationRow = Database['bikeshare']['Tables']['station']['Row'];
type NetworkRow = Database['bikeshare']['Tables']['network']['Row'];

interface StationDetails extends Omit<StationRow, 'location'> {
  network?: NetworkRow;
}

export const useStationDetails = () => {
  const supabase = useClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStationDetails = useCallback(
    async (stationId: string): Promise<StationDetails | null> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .schema('bikeshare')
          .from('station')
          .select(
            `
            *,
            network:network_id (*)
          `,
          )
          .eq('id', stationId)
          .single();

        if (fetchError) {
          console.error('Error fetching station details:', fetchError);
          setError(fetchError.message);
          setLoading(false);
          return null;
        }

        setLoading(false);
        return data as StationDetails;
      } catch (err) {
        console.error('Unexpected error fetching station details:', err);
        setError('Failed to fetch station details');
        setLoading(false);
        return null;
      }
    },
    [], // Removed supabase from deps - useClient() is stable
  );

  return {
    fetchStationDetails,
    loading,
    error,
  };
};
