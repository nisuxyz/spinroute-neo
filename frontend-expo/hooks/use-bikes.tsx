import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';

export type BikeType = 'road' | 'mountain' | 'hybrid' | 'gravel' | 'ebike' | 'other';

export interface Bike {
  id: string;
  user_id: string;
  name: string;
  type: BikeType;
  brand?: string | null;
  model?: string | null;
  purchase_date?: string | null;
  total_kilometrage: number;
  is_active: boolean;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

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

  const setActiveBikeById = async (id: string): Promise<boolean> => {
    if (!session) {
      setError('Not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${VEHICLE_SERVICE_URL}/api/bikes/${id}/set-active`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set active bike');
      }

      const updatedBike = await response.json();

      // Update bikes list to reflect new active status
      setBikes((prev) =>
        prev.map((b) => ({
          ...b,
          is_active: b.id === id,
        })),
      );

      setActiveBike(updatedBike);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set active bike');
      console.error('Error setting active bike:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deactivateBike = async (id: string): Promise<boolean> => {
    if (!session) {
      setError('Not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${VEHICLE_SERVICE_URL}/api/bikes/${id}/deactivate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to deactivate bike');
      }

      const updatedBike = await response.json();

      // Update bikes list to reflect deactivated status
      setBikes((prev) => prev.map((b) => (b.id === id ? { ...b, is_active: false } : b)));

      setActiveBike(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate bike');
      console.error('Error deactivating bike:', err);
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
    setActiveBike: setActiveBikeById,
    deactivateBike,
  };
}
