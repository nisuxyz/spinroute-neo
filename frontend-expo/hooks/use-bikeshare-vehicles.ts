import React from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useClient } from 'react-supabase';

export interface BikeshareVehicle {
  id: string;
  vehicle_type: string | null;
  battery_level: number | null;
  lat: number;
  lng: number;
}

export const useBikeshareVehicles = () => {
  const client = useClient();
  const supabase = client.schema('bikeshare');
  const [vehicleFeatureCollection, setVehicleFeatureCollection] =
    React.useState<GeoJSON.FeatureCollection>({
      type: 'FeatureCollection',
      features: [],
    });
  const [fetchVehiclesError, setFetchVehiclesError] = React.useState<Error | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const _updateVehicleList = async ({ properties }: any) => {
    setIsLoading(true);

    if (!properties?.bounds?.ne || !properties?.bounds?.sw) {
      setFetchVehiclesError(new Error('Invalid bounds'));
      setIsLoading(false);
      return;
    }

    const { bounds } = properties;
    const neLat = Number(bounds.ne[1]);
    const neLng = Number(bounds.ne[0]);
    const swLat = Number(bounds.sw[1]);
    const swLng = Number(bounds.sw[0]);

    if ([neLat, neLng, swLat, swLng].some(isNaN)) {
      setFetchVehiclesError(new Error('Invalid coordinates'));
      setIsLoading(false);
      return;
    }

    const minLat = Math.min(swLat, neLat);
    const maxLat = Math.max(swLat, neLat);
    const minLng = Math.min(swLng, neLng);
    const maxLng = Math.max(swLng, neLng);

    try {
      const { data, error } = await supabase.rpc('get_vehicles_in_view', {
        ne_lat: maxLat,
        ne_lng: maxLng,
        sw_lat: minLat,
        sw_lng: minLng,
      });

      if (error) {
        setFetchVehiclesError(error);
        setIsLoading(false);
        return;
      }

      if (data) {
        setFetchVehiclesError(null);

        const features = data
          .map((vehicle: any) => {
            if (!vehicle.id || vehicle.lat == null || vehicle.lng == null) return null;

            const isElectric =
              vehicle.vehicle_type?.toLowerCase().includes('ebike') ||
              vehicle.vehicle_type?.toLowerCase().includes('electric') ||
              vehicle.battery_level != null;

            return {
              type: 'Feature' as const,
              id: vehicle.id,
              geometry: {
                type: 'Point' as const,
                coordinates: [vehicle.lng, vehicle.lat],
              },
              properties: {
                id: vehicle.id,
                vehicleType: vehicle.vehicle_type,
                batteryLevel: vehicle.battery_level,
                isElectric,
              },
            };
          })
          .filter(Boolean);

        setVehicleFeatureCollection({
          type: 'FeatureCollection',
          features,
        });
      }

      setIsLoading(false);
    } catch (err) {
      setFetchVehiclesError(err as Error);
      setIsLoading(false);
    }
  };

  const updateVehicleList = useDebouncedCallback(_updateVehicleList, 1000);

  const clearVehicles = () => {
    setVehicleFeatureCollection({ type: 'FeatureCollection', features: [] });
  };

  return {
    updateVehicleList,
    vehicleFeatureCollection,
    fetchVehiclesError,
    isLoading,
    clearVehicles,
  };
};
