import React from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useSupabase } from './use-supabase';

const UseBikeshareStationsErrors = {
  FailedToFetchStations: class FailedToFetchStationsError extends Error {
    supabaseError?: Error;
    constructor(message: string, supabaseError?: Error) {
      super(message);
      this.name = 'FailedToFetchStationsError';
      this.supabaseError = supabaseError;
    }
  },
  InvalidCoordinates: class InvalidCoordinatesError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'InvalidCoordinatesError';
    }
  },
};

export const useBikeshareStations = (supabase: ReturnType<typeof useSupabase>) => {
  const [stationList, setStationList] = React.useState<any[]>([]);
  const [stationFeatureCollection, setStationFeatureCollection] =
    React.useState<GeoJSON.FeatureCollection>({
      type: 'FeatureCollection',
      features: [],
    });
  const [fetchStationsError, setFetchStationsError] = React.useState<Error | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const _updateStationList = async ({ properties }: any) => {
    console.log('Region changed, fetching stations...', properties);

    // Set loading state
    setIsLoading(true);

    // Validate input parameters
    if (!properties || !properties.bounds) {
      const validationError = new UseBikeshareStationsErrors.InvalidCoordinates(
        'Invalid region properties: missing bounds data',
      );
      setFetchStationsError(validationError);
      setIsLoading(false);
      console.error(validationError);
      return;
    }

    const { bounds } = properties;

    // Validate bounds structure
    if (!bounds.ne || !bounds.sw || !Array.isArray(bounds.ne) || !Array.isArray(bounds.sw)) {
      const validationError = new UseBikeshareStationsErrors.InvalidCoordinates(
        'Invalid bounds structure: ne and sw must be coordinate arrays',
      );
      setFetchStationsError(validationError);
      setIsLoading(false);
      console.error(validationError);
      return;
    }

    // Extract coordinates and ensure proper bounding box
    const neLat = Number(bounds.ne[1]);
    const neLng = Number(bounds.ne[0]);
    const swLat = Number(bounds.sw[1]);
    const swLng = Number(bounds.sw[0]);

    // Validate coordinate ranges
    if (
      isNaN(neLat) ||
      isNaN(neLng) ||
      isNaN(swLat) ||
      isNaN(swLng) ||
      neLat < -90 ||
      neLat > 90 ||
      swLat < -90 ||
      swLat > 90 ||
      neLng < -180 ||
      neLng > 180 ||
      swLng < -180 ||
      swLng > 180
    ) {
      const validationError = new UseBikeshareStationsErrors.InvalidCoordinates(
        `Invalid coordinate values: ne=[${neLng}, ${neLat}], sw=[${swLng}, ${swLat}]`,
      );
      setFetchStationsError(validationError);
      setIsLoading(false);
      console.error(validationError);
      return;
    }

    // Validate and correct bounding box coordinates
    // SW should be south-west of NE (sw_lat <= ne_lat and sw_lng <= ne_lng)
    const minLat = Math.min(swLat, neLat);
    const maxLat = Math.max(swLat, neLat);
    const minLng = Math.min(swLng, neLng);
    const maxLng = Math.max(swLng, neLng);

    console.log('Original bounds:', {
      ne_lat: neLat,
      ne_lng: neLng,
      sw_lat: swLat,
      sw_lng: swLng,
    });

    console.log('Corrected bounds for RPC:', {
      ne_lat: maxLat,
      ne_lng: maxLng,
      sw_lat: minLat,
      sw_lng: minLng,
    });

    try {
      const { count, data, error, statusText } = await supabase.rpc(
        'get_stations_in_view',
        {
          ne_lat: maxLat,
          ne_lng: maxLng,
          sw_lat: minLat,
          sw_lng: minLng,
        },
        { count: 'exact' },
      );

      console.log('Supabase RPC result:', { count, data, error, statusText });

      if (error) {
        const fetchError = new UseBikeshareStationsErrors.FailedToFetchStations(
          'Failed to fetch stations from Supabase.',
          error,
        );
        setFetchStationsError(fetchError);
        setIsLoading(false);
        console.error(fetchError, error);
        return;
      }

      // Handle successful response
      if (data) {
        // Clear any previous errors on successful fetch
        setFetchStationsError(null);

        setStationList(data);

        const features = data
          ?.map((station: any) => {
            // Validate required fields
            if (!station.id || !station.name || station.lat == null || station.lng == null) {
              console.warn(`Skipping station with missing required fields:`, station);
              return null;
            }

            // Validate coordinate ranges
            const lat = Number(station.lat);
            const lng = Number(station.lng);

            if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
              console.warn(
                `Skipping station with invalid coordinates: lat=${lat}, lng=${lng}`,
                station,
              );
              return null;
            }

            // Calculate availability status for visual indicators
            const classicBikes = station.num_bikes_available || 0;
            const electricBikes = station.num_ebikes_available || 0;
            const availableDocks = station.num_docks_available || 0;

            let availabilityStatus: string;

            if (classicBikes > 0 && electricBikes > 0) {
              availabilityStatus = 'full'; // Both classic and electric bikes available
            } else if (classicBikes > 0 && electricBikes === 0) {
              availabilityStatus = 'classic-only'; // Only classic bikes available
            } else if (classicBikes === 0 && electricBikes > 0) {
              availabilityStatus = 'electric-only'; // Only electric bikes available
            } else if (classicBikes === 0 && electricBikes === 0 && availableDocks > 0) {
              availabilityStatus = 'empty'; // No bikes, but docks available
            } else {
              availabilityStatus = 'no-docks'; // Station full, no available docks
            }

            return {
              type: 'Feature' as const,
              id: station.id,
              geometry: {
                type: 'Point' as const,
                coordinates: [lng, lat], // Fixed: GeoJSON format is [longitude, latitude]
              },
              properties: {
                message: station.name,
                icon: 'pin',
                id: station.id,
                // Vehicle availability data for enhanced callouts
                classicBikes: classicBikes,
                electricBikes: electricBikes,
                availableDocks: availableDocks,
                // Availability status for visual indicators
                availabilityStatus: availabilityStatus,
              },
            };
          })
          .filter(Boolean); // Remove null entries from validation failures

        const validFeatures = features || [];
        const skippedCount = data.length - validFeatures.length;

        setStationFeatureCollection({
          type: 'FeatureCollection',
          features: validFeatures,
        });

        console.log(
          `Fetched ${data.length} stations, ${validFeatures.length} valid, ${skippedCount} skipped due to invalid data.`,
        );

        // Clear loading state on successful completion
        setIsLoading(false);
      }
    } catch (networkError) {
      // Handle network errors, timeouts, etc.
      const fetchError = new UseBikeshareStationsErrors.FailedToFetchStations(
        'Network error while fetching stations.',
        networkError as Error,
      );
      setFetchStationsError(fetchError);
      setIsLoading(false);
      console.error('Network error fetching stations:', networkError);
    }
  };

  const updateStationList = useDebouncedCallback(_updateStationList, 1000);

  return {
    updateStationList,
    stationList,
    stationFeatureCollection,
    fetchStationsError,
    isLoading,
    UseBikeshareStationsErrors,
  };
};
