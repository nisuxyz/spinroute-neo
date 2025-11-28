import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from './use-supabase';
import type { Database } from '../supabase/types';

export type BikeType = Database['vehicles']['Enums']['bike_type'];
export type Bike = Database['vehicles']['Tables']['user_bike']['Row'];

export interface CreateBikeInput {
  name: string;
  type: BikeType;
  brand?: string;
  model?: string;
  purchase_date?: string;
  initial_kilometrage?: number;
  unit?: 'km' | 'mi';
  metadata?: any;
}

export interface UpdateBikeInput {
  name?: string;
  type?: BikeType;
  brand?: string;
  model?: string;
  purchase_date?: string;
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
  const supabase = useSupabase();
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBikes = useCallback(async () => {
    if (!supabase) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .schema('vehicles')
        .from('user_bike')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Convert km to miles for display
      const bikesWithMiles = (data || []).map((bike) => ({
        ...bike,
        total_kilometrage: convertKmToMi(bike.total_kilometrage),
      }));

      setBikes(bikesWithMiles);
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
          name: input.name,
          type: input.type,
          brand: input.brand || null,
          model: input.model || null,
          purchase_date: input.purchase_date || null,
          total_kilometrage: initialKm,
          metadata: input.metadata || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Convert km to miles for display
      const bikeWithMiles = {
        ...data,
        total_kilometrage: convertKmToMi(data.total_kilometrage),
      };

      setBikes((prev) => [bikeWithMiles, ...prev]);
      return bikeWithMiles;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bike');
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
      if (input.metadata !== undefined) updates.metadata = input.metadata;

      const { data, error: updateError } = await supabase
        .schema('vehicles')
        .from('user_bike')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Convert km to miles for display
      const bikeWithMiles = {
        ...data,
        total_kilometrage: convertKmToMi(data.total_kilometrage),
      };

      setBikes((prev) => prev.map((b) => (b.id === id ? bikeWithMiles : b)));
      return bikeWithMiles;
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

      setBikes((prev) => prev.filter((b) => b.id !== id));
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
    fetchBikes();
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
