import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useClient } from 'react-supabase';
import type { Database } from '@/supabase/types';

type Trip = Database['recording']['Tables']['trips']['Row'];
type TripInsert = Database['recording']['Tables']['trips']['Insert'];
type TripUpdate = Database['recording']['Tables']['trips']['Update'];
type PauseEventInsert = Database['recording']['Tables']['pause_events']['Insert'];

export type TripStatus = 'in_progress' | 'paused' | 'completed';

interface StartTripOptions {
  title?: string;
  bikeId?: string | null;
}

interface UseTripRecordingReturn {
  activeTrip: Trip | null;
  loading: boolean;
  error: string | null;
  startTrip: (options?: StartTripOptions) => Promise<Trip | null>;
  stopTrip: () => Promise<boolean>;
  pauseTrip: () => Promise<boolean>;
  resumeTrip: () => Promise<boolean>;
  refreshActiveTrip: () => Promise<void>;
}

export function useTripRecording(): UseTripRecordingReturn {
  const { user } = useAuth();
  const supabase = useClient();
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active trip on mount
  const fetchActiveTrip = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .schema('recording')
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['in_progress', 'paused'])
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setActiveTrip(data);
    } catch (err) {
      console.error('Error fetching active trip:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch active trip');
    }
  }, [user]);

  useEffect(() => {
    fetchActiveTrip();
  }, [fetchActiveTrip]);

  const startTrip = async (options?: StartTripOptions): Promise<Trip | null> => {
    if (!user) {
      const errorMsg = 'Not authenticated';
      setError(errorMsg);
      console.error('[useTripRecording] startTrip failed:', errorMsg);
      return null;
    }

    // Check for active trip
    if (activeTrip) {
      const errorMsg = 'An active trip already exists. Please stop or complete it first.';
      setError(errorMsg);
      console.warn('[useTripRecording] startTrip blocked:', errorMsg);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const tripData: TripInsert = {
        user_id: user.id,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        title: options?.title || undefined,
        bike_id: options?.bikeId || undefined,
      };

      console.log('[useTripRecording] Starting trip with data:', tripData);

      const { data, error: insertError } = await supabase
        .schema('recording')
        .from('trips')
        .insert(tripData)
        .select()
        .single();

      if (insertError) {
        console.error('[useTripRecording] Insert error:', insertError);
        // Preserve the full error object for RLS detection
        const errorMsg = insertError.message || 'Failed to start trip';
        setError(errorMsg);
        // Store the error code for RLS detection
        if (insertError.code === '42501') {
          setError(`RLS_POLICY_VIOLATION: ${errorMsg}`);
        }
        return null;
      }

      console.log('[useTripRecording] Trip started successfully:', data);
      setActiveTrip(data);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start trip';
      setError(errorMsg);
      console.error('[useTripRecording] Error starting trip:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const stopTrip = async (): Promise<boolean> => {
    if (!user || !activeTrip) {
      setError('No active trip to stop');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const updateData: TripUpdate = {
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .schema('recording')
        .from('trips')
        .update(updateData)
        .eq('id', activeTrip.id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setActiveTrip(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop trip');
      console.error('Error stopping trip:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const pauseTrip = async (): Promise<boolean> => {
    if (!user || !activeTrip) {
      setError('No active trip to pause');
      return false;
    }

    if (activeTrip.status !== 'in_progress') {
      setError('Trip is not in progress');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Update trip status to paused
      const updateData: TripUpdate = {
        status: 'paused',
        updated_at: new Date().toISOString(),
      };

      const { data: updatedTrip, error: updateError } = await supabase
        .schema('recording')
        .from('trips')
        .update(updateData)
        .eq('id', activeTrip.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Insert pause event
      const pauseEventData: PauseEventInsert = {
        trip_id: activeTrip.id,
        paused_at: new Date().toISOString(),
      };

      const { error: pauseError } = await supabase
        .schema('recording')
        .from('pause_events')
        .insert(pauseEventData);

      if (pauseError) throw pauseError;

      setActiveTrip(updatedTrip);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause trip');
      console.error('Error pausing trip:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resumeTrip = async (): Promise<boolean> => {
    if (!user || !activeTrip) {
      setError('No active trip to resume');
      return false;
    }

    if (activeTrip.status !== 'paused') {
      setError('Trip is not paused');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Update trip status to in_progress
      const updateData: TripUpdate = {
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      };

      const { data: updatedTrip, error: updateError } = await supabase
        .schema('recording')
        .from('trips')
        .update(updateData)
        .eq('id', activeTrip.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update the most recent pause event with resume timestamp
      const { error: resumeError } = await supabase
        .schema('recording')
        .from('pause_events')
        .update({ resumed_at: new Date().toISOString() })
        .eq('trip_id', activeTrip.id)
        .is('resumed_at', null)
        .order('paused_at', { ascending: false })
        .limit(1);

      if (resumeError) throw resumeError;

      setActiveTrip(updatedTrip);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume trip');
      console.error('Error resuming trip:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshActiveTrip = async (): Promise<void> => {
    await fetchActiveTrip();
  };

  return {
    activeTrip,
    loading,
    error,
    startTrip,
    stopTrip,
    pauseTrip,
    resumeTrip,
    refreshActiveTrip,
  };
}
