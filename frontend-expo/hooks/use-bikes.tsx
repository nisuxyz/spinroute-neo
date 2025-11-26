import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
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

const VEHICLE_SERVICE_URL = process.env.EXPO_PUBLIC_VEHICLE_SERVICE_URL || 'http://localhost:3000';

export function useBikes() {
  const { session } = useAuth();
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [activeBike, setActiveBike] = useState<Bike | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBikes = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${VEHICLE_SERVICE_URL}/api/bikes?unit=mi`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        console.log('Response status:', response.status, response.statusText, response);
        throw new Error('Failed to fetch bikes');
      }

      const data = await response.json();
      setBikes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bikes');
      console.error('Error fetching bikes:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  const fetchActiveBike = useCallback(async () => {
    if (!session) return;

    try {
      const response = await fetch(`${VEHICLE_SERVICE_URL}/api/bikes/active?unit=mi`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch active bike');
      }

      const data = await response.json();
      setActiveBike(data);
    } catch (err) {
      console.error('Error fetching active bike:', err);
    }
  }, [session]);

  const createBike = async (input: CreateBikeInput): Promise<Bike | null> => {
    if (!session) {
      setError('Not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${VEHICLE_SERVICE_URL}/api/bikes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create bike');
      }

      const bike = await response.json();
      setBikes((prev) => [bike, ...prev]);
      return bike;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bike');
      console.error('Error creating bike:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateBike = async (id: string, input: UpdateBikeInput): Promise<Bike | null> => {
    if (!session) {
      setError('Not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${VEHICLE_SERVICE_URL}/api/bikes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update bike');
      }

      const updatedBike = await response.json();
      setBikes((prev) => prev.map((b) => (b.id === id ? updatedBike : b)));
      return updatedBike;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bike');
      console.error('Error updating bike:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteBike = async (id: string): Promise<boolean> => {
    if (!session) {
      setError('Not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${VEHICLE_SERVICE_URL}/api/bikes/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete bike');
      }

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
    fetchActiveBike();
  }, [fetchBikes, fetchActiveBike]);

  return {
    bikes,
    activeBike,
    loading,
    error,
    fetchBikes,
    fetchActiveBike,
    createBike,
    updateBike,
    deleteBike,
  };
}
