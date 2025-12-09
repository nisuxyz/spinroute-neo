import { useState, useEffect, useCallback, useMemo } from 'react';
import { useClient } from 'react-supabase';
import type { Database } from '../supabase/types';
import { useAuth } from './use-auth';
import { useUserSettings } from '@/contexts/user-settings-context';

export type BikeType = Database['vehicles']['Enums']['bike_type'];
type BikeRow = Database['vehicles']['Tables']['user_bike']['Row'];

// Extended bike type with converted distance for display
export type Bike = BikeRow & {
  display_distance: number;
  distance_unit: 'km' | 'mi';
};

export interface CreateBikeInput {
  name: string;
  type: BikeType;
  brand?: string;
  model?: string;
  purchase_date?: string;
  initial_kilometrage?: number;
  unit?: 'km' | 'mi';
  color?: string;
  metadata?: any;
}

export interface UpdateBikeInput {
  name?: string;
  type?: BikeType;
  brand?: string;
  model?: string;
  purchase_date?: string;
  color?: string;
  metadata?: any;
}

const KM_TO_MI = 0.621371;
const MI_TO_KM = 1.60934;

function convertKmToMi(km: number): number {
  return km * KM_TO_MI;
}

function convertMiToKm(mi: number): number {
  return mi * MI_TO_KM;
}

export function useBikes() {
  const supabase = useClient();
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const [rawBikes, setRawBikes] = useState<BikeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isImperial = settings?.units === 'imperial';

  // Convert bikes based on user's unit preference
  const bikes: Bike[] = useMemo(() => {
    return rawBikes.map((bike) => ({
      ...bike,
      display_distance: isImperial ? convertKmToMi(bike.total_kilometrage) : bike.total_kilometrage,
      distance_unit: isImperial ? 'mi' : 'km',
    }));
  }, [rawBikes, isImperial]);

  const fetchBikes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .schema('vehicles')
        .from('user_bike')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setRawBikes(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bikes');
      console.error('Error fetching bikes:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const createBike = async (input: CreateBikeInput): Promise<Bike | null> => {
    if (!supabase) {
      setError('Not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const unit = input.unit || 'km';
      const initialKm =
        input.initial_kilometrage !== undefined
          ? unit === 'mi'
            ? convertMiToKm(input.initial_kilometrage)
            : input.initial_kilometrage
          : 0;

      const { data, error: insertError } = await supabase
        .schema('vehicles')
        .from('user_bike')
        .insert({
          user_id: user.id,
          name: input.name,
          type: input.type,
          brand: input.brand || null,
          model: input.model || null,
          purchase_date: input.purchase_date || null,
          total_kilometrage: initialKm,
          color: input.color || '#3b82f6',
          metadata: input.metadata || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating bike:', insertError);
        // Preserve the full error for RLS detection
        const errorMsg = insertError.message || 'Failed to create bike';
        // Mark RLS policy violations for easy detection
        if (insertError.code === '42501') {
          setError(`RLS_POLICY_VIOLATION: ${errorMsg}`);
        } else {
          setError(errorMsg);
        }
        return null;
      }

      setRawBikes((prev) => [data, ...prev]);
      // Return with display values
      return {
        ...data,
        display_distance: isImperial
          ? convertKmToMi(data.total_kilometrage)
          : data.total_kilometrage,
        distance_unit: isImperial ? 'mi' : 'km',
      } as Bike;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create bike';
      setError(errorMsg);
      console.error('Error creating bike:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateBike = async (id: string, input: UpdateBikeInput): Promise<Bike | null> => {
    if (!supabase) {
      setError('Not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (input.name !== undefined) updates.name = input.name;
      if (input.type !== undefined) updates.type = input.type;
      if (input.brand !== undefined) updates.brand = input.brand;
      if (input.model !== undefined) updates.model = input.model;
      if (input.purchase_date !== undefined) updates.purchase_date = input.purchase_date;
      if (input.color !== undefined) updates.color = input.color;
      if (input.metadata !== undefined) updates.metadata = input.metadata;

      const { data, error: updateError } = await supabase
        .schema('vehicles')
        .from('user_bike')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setRawBikes((prev) => prev.map((b) => (b.id === id ? data : b)));
      // Return with display values
      return {
        ...data,
        display_distance: isImperial
          ? convertKmToMi(data.total_kilometrage)
          : data.total_kilometrage,
        distance_unit: isImperial ? 'mi' : 'km',
      } as Bike;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bike');
      console.error('Error updating bike:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteBike = async (id: string): Promise<boolean> => {
    if (!supabase) {
      setError('Not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .schema('vehicles')
        .from('user_bike')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setRawBikes((prev) => prev.filter((b) => b.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bike');
      console.error('Error deleting bike:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchBikes();
  }, [fetchBikes]);

  return {
    bikes,
    loading,
    error,
    fetchBikes,
    createBike,
    updateBike,
    deleteBike,
  };
}
