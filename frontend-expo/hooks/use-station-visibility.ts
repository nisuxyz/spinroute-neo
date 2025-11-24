import { useState, useEffect } from 'react';
import type { FeatureCollection } from 'geojson';

interface UseStationVisibilityProps {
  updateStationList: (feature: any) => void;
  stationFeatureCollection: FeatureCollection;
  fetchStationsError: Error | null;
  isStationDataFetching: boolean;
  userLocation: [number, number] | null;
  mapRef: React.RefObject<any>;
}

interface UseStationVisibilityResult {
  isStationsVisible: boolean;
  isStationDataLoading: boolean;
  toggleStationVisibility: () => void;
}

const DEFAULT_LOCATION: [number, number] = [-122.4194, 37.7749];

export const useStationVisibility = ({
  updateStationList,
  stationFeatureCollection,
  fetchStationsError,
  isStationDataFetching,
  userLocation,
  mapRef,
}: UseStationVisibilityProps): UseStationVisibilityResult => {
  const [isStationsVisible, setIsStationsVisible] = useState(false);
  const [isStationDataLoading, setIsStationDataLoading] = useState(false);

  const toggleStationVisibility = () => {
    setIsStationsVisible((prev) => {
      const newVisibility = !prev;
      if (newVisibility) {
        setIsStationDataLoading(true);
      }
      return newVisibility;
    });
  };

  // Handle station data loading completion
  useEffect(() => {
    if (
      isStationDataLoading &&
      !isStationDataFetching &&
      stationFeatureCollection.features.length > 0
    ) {
      setIsStationDataLoading(false);
    }
  }, [stationFeatureCollection.features.length, isStationDataLoading, isStationDataFetching]);

  // Handle station data fetch errors
  useEffect(() => {
    if (fetchStationsError && (isStationDataLoading || isStationDataFetching)) {
      setIsStationDataLoading(false);
      if (stationFeatureCollection.features.length === 0) {
        setIsStationsVisible(false);
      }
      console.error('Station data fetch failed:', fetchStationsError);
    }
  }, [
    fetchStationsError,
    isStationDataLoading,
    isStationDataFetching,
    stationFeatureCollection.features.length,
  ]);

  // Trigger initial station fetch when stations are enabled
  useEffect(() => {
    if (isStationsVisible && isStationDataLoading) {
      const fetchInitialStations = async () => {
        try {
          if (mapRef.current) {
            const bounds = await mapRef.current.getVisibleBounds();
            if (bounds && bounds.length >= 2) {
              const feature = {
                properties: {
                  bounds: {
                    ne: bounds[1],
                    sw: bounds[0],
                  },
                },
              };
              updateStationList(feature);
              return;
            }
          }
        } catch (error) {
          console.error('Error getting map bounds:', error);
        }

        // Fallback: use current location
        const center = userLocation || DEFAULT_LOCATION;
        const offset = 0.01;
        const feature = {
          properties: {
            bounds: {
              ne: [center[0] + offset, center[1] + offset],
              sw: [center[0] - offset, center[1] - offset],
            },
          },
        };
        updateStationList(feature);
      };

      fetchInitialStations();
    }
  }, [isStationsVisible, isStationDataLoading, userLocation, mapRef, updateStationList]);

  return {
    isStationsVisible,
    isStationDataLoading,
    toggleStationVisibility,
  };
};
