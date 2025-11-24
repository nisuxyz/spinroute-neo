import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface UseMapLocationResult {
  userLocation: [number, number] | null;
  locationPermissionGranted: boolean;
  isLocationLoading: boolean;
}

const DEFAULT_LOCATION: [number, number] = [-122.4194, 37.7749]; // San Francisco

export const useMapLocation = (): UseMapLocationResult => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(true);

  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        setIsLocationLoading(true);

        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          setLocationPermissionGranted(false);
          setUserLocation(DEFAULT_LOCATION);
          setIsLocationLoading(false);
          return;
        }

        setLocationPermissionGranted(true);

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const userCoords: [number, number] = [location.coords.longitude, location.coords.latitude];

        setUserLocation(userCoords);
        setIsLocationLoading(false);
      } catch (error) {
        console.error('Error getting location:', error);
        setLocationPermissionGranted(false);
        setUserLocation(DEFAULT_LOCATION);
        setIsLocationLoading(false);
      }
    };

    requestLocationPermission();
  }, []);

  return {
    userLocation,
    locationPermissionGranted,
    isLocationLoading,
  };
};
