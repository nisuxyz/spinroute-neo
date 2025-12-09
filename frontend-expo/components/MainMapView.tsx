import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  Alert,
  useWindowDimensions,
} from 'react-native';
import Mapbox, { UserTrackingMode } from '@rnmapbox/maps';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import MapActionButtons from './MapActionButtons';
import StationSheet from './StationSheet';
import VehicleSheet from './VehicleSheet';
import StationMarker from './StationMarker';
import StationLayers from './StationLayers';
import VehicleMarker from './VehicleMarker';
import { useClient } from 'react-supabase';
import { useBikeshareStations } from '@/hooks/use-bikeshare-stations';
import { useBikeshareVehicles } from '@/hooks/use-bikeshare-vehicles';
import { useMapLocation } from '@/hooks/use-map-location';
import { useStationVisibility } from '@/hooks/use-station-visibility';
import { useTripRecording } from '@/hooks/use-trip-recording';
import { useLocationTracking } from '@/hooks/use-location-tracking';
import { useUserSettings } from '@/contexts/user-settings-context';
import { useBikes } from '@/hooks/use-bikes';
import { useStationDetails } from '@/hooks/use-station-details';
import { useFeatureAccess } from '@/hooks/use-feature-gate';
import { usePaywall } from '@/hooks/use-paywall';
import { Colors } from '@/constants/theme';
import SearchButton from './SearchButton';
import SearchSheet from './SearchSheet';
import LocationSheet from './LocationSheet';
import FancySheet, { type FancySheetRef } from './FancySheet';
import MapStylePicker from './MapStylePicker';
import InfoPill from './InfoPill';
import InfoPillSheet from './InfoPillSheet';
import RouteInfoSheet from './RouteInfoSheet';
import RoutePreferencesSheet from './RoutePreferencesSheet';
import TripCompletionSheet from './TripCompletionSheet';
import { useDirections } from '@/hooks/use-directions';
import { useAuth } from '@/hooks/use-auth';
import { useWeather } from '@/hooks/use-weather';

// Feature flags
const ENABLE_LAYER_RENDERING_TOGGLE = false;
const ENABLE_FANCY_SHEET = true;

// Constants
const DEFAULT_LOCATION: [number, number] = [-122.4194, 37.7749];
const DEFAULT_ZOOM = 12;
const USER_LOCATION_ZOOM = 16;

interface SelectedStation {
  id: string;
  name: string;
  coordinates: [number, number];
  classicBikes: number;
  electricBikes: number;
  availableDocks: number;
  availabilityStatus: string;
  address?: string;
  capacity?: number;
  isOperational?: boolean;
  isRenting?: boolean;
  isReturning?: boolean;
  lastReported?: string;
  networkName?: string;
}

interface SearchedLocation {
  name: string;
  display_name: string;
  lat: number;
  lon: number;
  type: string;
  mapbox_id: string;
}

const MainMapView: React.FC = () => {
  const mapRef = useRef<Mapbox.MapView>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const fancySheetRef = useRef<FancySheetRef>(null);
  const router = useRouter();
  const { showPaywall } = usePaywall();
  const supabase = useClient();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const {
    updateStationList,
    stationFeatureCollection,
    fetchStationsError,
    isLoading: isStationDataFetching,
  } = useBikeshareStations();

  const { userLocation, locationPermissionGranted } = useMapLocation();

  const { isStationsVisible, isStationDataLoading, toggleStationVisibility } = useStationVisibility(
    {
      updateStationList,
      stationFeatureCollection,
      fetchStationsError,
      isStationDataFetching,
      userLocation,
      mapRef,
    },
  );

  const {
    updateVehicleList,
    vehicleFeatureCollection,
    isLoading: isVehicleDataFetching,
  } = useBikeshareVehicles();

  // Core data state
  const [selectedStation, setSelectedStation] = useState<SelectedStation | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<{
    id: string;
    coordinates: [number, number];
    isElectric: boolean;
    batteryLevel: number | null;
    vehicleType: string | null;
  } | null>(null);
  const [searchedLocation, setSearchedLocation] = useState<SearchedLocation | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<GeoJSON.LineString | null>(null);

  // UI state
  const [useMarkerView, setUseMarkerView] = useState(true);
  const [is3DMode, setIs3DMode] = useState(false);
  const [isRecentering, setIsRecentering] = useState(false);
  const [isFollowModeActive, setIsFollowModeActive] = useState(false);
  const [liveUserLocation, setLiveUserLocation] = useState<[number, number] | null>(null);
  const [isSearchSheetVisible, setIsSearchSheetVisible] = useState(false);
  const [isMapStylePickerVisible, setIsMapStylePickerVisible] = useState(false);
  const [isRoutePreferencesSheetVisible, setIsRoutePreferencesSheetVisible] = useState(false);
  const [isInfoPillSheetVisible, setIsInfoPillSheetVisible] = useState(false);
  const [isTripCompletionSheetVisible, setIsTripCompletionSheetVisible] = useState(false);

  // Directions hook
  const {
    route: directionsRoute,
    loading: directionsLoading,
    error: directionsError,
    calculateRoute,
    clearRoute,
  } = useDirections();

  // Station details hook
  const { fetchStationDetails } = useStationDetails();

  // Trip recording hook
  const { activeTrip, error: tripError, startTrip, stopTrip } = useTripRecording();

  // User settings
  const { settings, updateSettings } = useUserSettings();
  const captureInterval = settings?.capture_interval_seconds || 5;
  const mapStyle = settings?.map_style || 'mapbox://styles/mapbox/standard';

  // Bikes
  const { bikes, loading: bikesLoading, fetchBikes } = useBikes();
  const activeBike = bikes.find((bike: any) => bike.id === settings?.active_bike_id);

  // Weather
  const { weather } = useWeather({
    latitude: userLocation?.[1] ?? null,
    longitude: userLocation?.[0] ?? null,
    enabled: !!activeBike,
  });

  // Feature access
  const { canRecordUnlimitedTrips, freeWeeklyTripLimit, isPro } = useFeatureAccess();
  const [weeklyTripCount, setWeeklyTripCount] = useState(0);

  // Location tracking
  const { permissionStatus, requestPermissions, syncAllPoints, stopTracking } = useLocationTracking(
    {
      tripId: activeTrip?.id || null,
      captureInterval,
    },
  );

  const { width } = useWindowDimensions();

  // Fetch weekly trip count for free users
  React.useEffect(() => {
    if (canRecordUnlimitedTrips) return;
    const fetchCount = async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const { count, error } = await supabase
        .schema('recording')
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('started_at', oneWeekAgo.toISOString());
      if (!error && count !== null) setWeeklyTripCount(count);
    };
    fetchCount();
  }, [canRecordUnlimitedTrips, supabase]);

  // Refetch bikes on focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) fetchBikes();
    }, [fetchBikes, user]),
  );

  // Determine which sheet to show based on state
  // Priority: route > location > vehicle > station (route takes precedence when active)
  const hasActiveRoute = !!(directionsRoute || directionsLoading || directionsError);
  const showRouteSheet = hasActiveRoute;
  const showLocationSheet =
    !hasActiveRoute && !!searchedLocation && !selectedStation && !selectedVehicle;
  const showVehicleSheet = !hasActiveRoute && !!selectedVehicle && !searchedLocation;
  const showStationSheet =
    !hasActiveRoute && !!selectedStation && !searchedLocation && !selectedVehicle;

  // Update route geometry when route changes
  React.useEffect(() => {
    if (directionsRoute?.routes?.[0]?.geometry) {
      const geometry = directionsRoute.routes[0].geometry;
      if (typeof geometry === 'object' && geometry.type === 'LineString') {
        setRouteGeometry(geometry as GeoJSON.LineString);
        // Fit camera to route
        if (geometry.coordinates?.length > 0) {
          const coords = geometry.coordinates as [number, number][];
          const lons = coords.map((c) => c[0]);
          const lats = coords.map((c) => c[1]);
          cameraRef.current?.fitBounds(
            [Math.min(...lons), Math.min(...lats)],
            [Math.max(...lons), Math.max(...lats)],
            [80, 40, 280, 40],
            1000,
          );
        }
      }
    } else if (!directionsRoute && !directionsLoading) {
      // Clear geometry when route is cleared
      setRouteGeometry(null);
    }
  }, [directionsRoute, directionsLoading]);

  // Follow mode with heading tracking
  React.useEffect(() => {
    if (isFollowModeActive && liveUserLocation) {
      cameraRef.current?.setCamera({
        centerCoordinate: liveUserLocation,
        animationDuration: 300,
      });
    }
  }, [isFollowModeActive, liveUserLocation]);

  const handleRegionIsChanging = (regionFeature: any) => {
    if (regionFeature?.properties?.isUserInteraction && isFollowModeActive) {
      setIsFollowModeActive(false);
    }
    if (regionFeature?.properties?.isUserInteraction) {
      const visibleBounds = regionFeature.properties.visibleBounds;
      if (visibleBounds?.length >= 2) {
        const boundsPayload = {
          properties: { bounds: { ne: visibleBounds[0], sw: visibleBounds[1] } },
        };
        if (isStationsVisible) {
          updateStationList(boundsPayload);
          updateVehicleList(boundsPayload);
        }
      }
    }
  };

  const handleStationPress = async (event: any) => {
    const feature = event.features[0];
    if (!feature?.properties) return;
    const { id, message, classicBikes, electricBikes, availableDocks, availabilityStatus } =
      feature.properties;
    const coordinates = feature.geometry.coordinates;

    if (selectedStation?.id === id) {
      setSelectedStation(null);
    } else {
      // Clear location when selecting station
      setSearchedLocation(null);
      setSelectedStation({
        id,
        name: message,
        coordinates,
        classicBikes,
        electricBikes,
        availableDocks,
        availabilityStatus,
      });
      // Fetch details in background
      const details = await fetchStationDetails(id);
      if (details) {
        setSelectedStation((prev) => {
          if (!prev || prev.id !== id) return prev;
          return {
            ...prev,
            address: details.address || undefined,
            capacity: details.capacity,
            isOperational: details.is_operational ?? undefined,
            isRenting: details.is_renting ?? undefined,
            isReturning: details.is_returning ?? undefined,
            lastReported: details.last_reported,
            networkName: details.network?.name,
          };
        });
      }
    }
  };

  const handleMarkerPress = async (
    id: string,
    name: string,
    coordinates: [number, number],
    classicBikes: number,
    electricBikes: number,
    availableDocks: number,
    availabilityStatus: string,
  ) => {
    if (selectedStation?.id === id) {
      setSelectedStation(null);
    } else {
      setSearchedLocation(null);
      setSelectedStation({
        id,
        name,
        coordinates,
        classicBikes,
        electricBikes,
        availableDocks,
        availabilityStatus,
      });
      const details = await fetchStationDetails(id);
      if (details) {
        setSelectedStation((prev) => {
          if (!prev || prev.id !== id) return prev;
          return {
            ...prev,
            address: details.address || undefined,
            capacity: details.capacity,
            isOperational: details.is_operational ?? undefined,
            isRenting: details.is_renting ?? undefined,
            isReturning: details.is_returning ?? undefined,
            lastReported: details.last_reported,
            networkName: details.network?.name,
          };
        });
      }
    }
  };

  const handleMapPress = () => {
    if (!hasActiveRoute) {
      if (selectedStation) setSelectedStation(null);
      if (selectedVehicle) setSelectedVehicle(null);
    }
  };

  const handleVehiclePress = (
    id: string,
    coordinates: [number, number],
    isElectric: boolean,
    batteryLevel: number | null,
    vehicleType: string | null,
  ) => {
    if (selectedVehicle?.id === id) {
      setSelectedVehicle(null);
    } else {
      setSelectedStation(null);
      setSearchedLocation(null);
      setSelectedVehicle({ id, coordinates, isElectric, batteryLevel, vehicleType });
    }
  };

  const handleGetDirections = () => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Unable to calculate route without your location');
      return;
    }
    if (!searchedLocation && !selectedStation && !selectedVehicle) {
      Alert.alert('Destination Required', 'Select a destination first');
      return;
    }
    setIsRoutePreferencesSheetVisible(true);
  };

  const handleConfirmRoutePreferences = async () => {
    if (!userLocation) return;
    let dest: { lat: number; lon: number } | null = null;

    if (selectedStation) {
      dest = { lat: selectedStation.coordinates[1], lon: selectedStation.coordinates[0] };
    } else if (selectedVehicle) {
      dest = { lat: selectedVehicle.coordinates[1], lon: selectedVehicle.coordinates[0] };
    } else if (searchedLocation) {
      dest = { lat: searchedLocation.lat, lon: searchedLocation.lon };
    }

    if (!dest) return;

    await calculateRoute({
      origin: { latitude: userLocation[1], longitude: userLocation[0] },
      destination: { latitude: dest.lat, longitude: dest.lon },
    });
  };

  const handleClearRoute = useCallback(() => {
    clearRoute();
    setRouteGeometry(null);

    // Don't clear destination markers - keep them visible after route is cleared
    // setSelectedStation(null);
    // setSearchedLocation(null);

    // Center camera on destination if available, otherwise user location
    let centerCoordinate: [number, number] | null = null;

    if (selectedStation) {
      centerCoordinate = selectedStation.coordinates;
    } else if (searchedLocation) {
      centerCoordinate = [searchedLocation.lon, searchedLocation.lat];
    } else if (userLocation) {
      centerCoordinate = userLocation;
    }

    if (centerCoordinate) {
      cameraRef.current?.setCamera({
        centerCoordinate,
        zoomLevel: 15,
        animationDuration: 1000,
      });
    }
  }, [clearRoute, selectedStation, searchedLocation, userLocation]);

  const handleUserLocationUpdate = (location: Mapbox.Location) => {
    if (location?.coords) {
      setLiveUserLocation([location.coords.longitude, location.coords.latitude]);

      // Update camera heading when in follow mode
      if (
        isFollowModeActive &&
        location.coords.heading !== undefined &&
        location.coords.heading >= 0
      ) {
        cameraRef.current?.setCamera({
          centerCoordinate: [location.coords.longitude, location.coords.latitude],
          heading: location.coords.heading,
          animationDuration: 300,
        });
      }
    }
  };

  const handleRecenter = () => {
    if (!userLocation) {
      Alert.alert('Location unavailable', 'Unable to get your current location');
      return;
    }
    setIsFollowModeActive(!isFollowModeActive);
    setIsRecentering(true);
    cameraRef.current?.setCamera({
      centerCoordinate: userLocation,
      zoomLevel: USER_LOCATION_ZOOM,
      animationDuration: 1000,
    });
    setTimeout(() => setIsRecentering(false), 1000);
  };

  const handleToggle3D = () => {
    const newMode = !is3DMode;
    setIs3DMode(newMode);
    cameraRef.current?.setCamera({ pitch: newMode ? 60 : 0, animationDuration: 500 });
  };

  const handleSelectMapStyle = async (styleUrl: string) => {
    const success = await updateSettings({ map_style: styleUrl });
    if (!success) Alert.alert('Error', 'Failed to update map style');
  };

  const handleStartRecording = async () => {
    if (!canRecordUnlimitedTrips && weeklyTripCount >= freeWeeklyTripLimit) {
      showPaywall();
      return;
    }
    if (permissionStatus !== 'granted') {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert('Permission Required', 'Location permission is required to record trips');
        return;
      }
    }
    const trip = await startTrip({ bikeId: settings?.active_bike_id });
    // No alert needed - InfoPill shows recording indicator
    if (!trip && tripError) {
      if (
        tripError.includes('policy') ||
        tripError.includes('42501') ||
        tripError.includes('row-level security')
      ) {
        if (!isPro) showPaywall();
        else Alert.alert('Error', 'Unable to start trip. Please try again.');
      } else {
        Alert.alert('Error', tripError);
      }
    }
  };

  const handleStopRecording = async () => {
    // 1. Stop location tracking first to prevent new points from being queued
    stopTracking();

    // 2. Sync all remaining location points while trip is still 'in_progress'
    try {
      await syncAllPoints();
    } catch (err) {
      console.error('[MainMapView] Error syncing points:', err);
    }

    // 3. Show completion sheet to collect title and notes
    setIsTripCompletionSheetVisible(true);
  };

  const handleTripCompletionSave = async (title: string, notes: string) => {
    const success = await stopTrip({ title, notes });
    if (!success && tripError) {
      Alert.alert('Error', tripError);
    }
  };

  const handleSearchSelect = (location: SearchedLocation) => {
    clearRoute();
    setRouteGeometry(null);
    setSelectedStation(null);
    setSearchedLocation(location);
    cameraRef.current?.setCamera({
      centerCoordinate: [location.lon, location.lat],
      zoomLevel: 15,
      animationDuration: 1000,
    });
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        ref={mapRef}
        style={styles.mapView}
        styleURL={mapStyle}
        onRegionIsChanging={handleRegionIsChanging}
        onPress={handleMapPress}
        compassEnabled={true}
        compassPosition={{ right: 14, top: 2 }}
        scaleBarPosition={{ left: width / 2 - 96, bottom: -28 }}
        // logoPosition={{ left: 20, bottom: 64 }}
        logoEnabled={false}
        // attributionPosition={{ left: 14, bottom: 64 }}
        attributionEnabled={false}
      >
        <Mapbox.Camera
          ref={cameraRef}
          centerCoordinate={userLocation || DEFAULT_LOCATION}
          zoomLevel={userLocation ? USER_LOCATION_ZOOM : DEFAULT_ZOOM}
          animationDuration={1000}
          followUserLocation={isFollowModeActive}
          followUserMode={
            isFollowModeActive ? UserTrackingMode.FollowWithHeading : UserTrackingMode.Follow
          }
        />

        {isStationsVisible && !useMarkerView && (
          <StationLayers
            stationFeatureCollection={stationFeatureCollection}
            onStationPress={handleStationPress}
          />
        )}

        {isStationsVisible &&
          useMarkerView &&
          stationFeatureCollection.features.map((feature: any) => {
            const { id, message, classicBikes, electricBikes, availableDocks, availabilityStatus } =
              feature.properties;
            const coordinates = feature.geometry.coordinates as [number, number];
            return (
              <StationMarker
                key={id}
                id={id}
                name={message}
                coordinate={coordinates}
                classicBikes={classicBikes}
                electricBikes={electricBikes}
                availableDocks={availableDocks}
                availabilityStatus={availabilityStatus}
                active={selectedStation?.id === id}
                onPress={() =>
                  handleMarkerPress(
                    id,
                    message,
                    coordinates,
                    classicBikes,
                    electricBikes,
                    availableDocks,
                    availabilityStatus,
                  )
                }
              />
            );
          })}

        {/* Free-floating bikeshare vehicles */}
        {isStationsVisible &&
          vehicleFeatureCollection.features.map((feature: any) => {
            const { id, isElectric, batteryLevel, vehicleType } = feature.properties;
            const coordinates = feature.geometry.coordinates as [number, number];
            return (
              <VehicleMarker
                key={id}
                id={id}
                coordinate={coordinates}
                isElectric={isElectric}
                active={selectedVehicle?.id === id}
                onPress={() =>
                  handleVehiclePress(id, coordinates, isElectric, batteryLevel, vehicleType)
                }
              />
            );
          })}

        {locationPermissionGranted && (
          <>
            <Mapbox.LocationPuck
              puckBearing="heading"
              puckBearingEnabled={true}
              pulsing={{ isEnabled: true, color: colors.buttonIcon, radius: 30.0 }}
            />
            <Mapbox.UserLocation
              visible={false}
              onUpdate={handleUserLocationUpdate}
              minDisplacement={1}
            />
          </>
        )}

        {/* Searched location marker */}
        {searchedLocation && (
          <>
            <Mapbox.MarkerView
              id="searchedLocation"
              coordinate={[searchedLocation.lon, searchedLocation.lat]}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.searchPinContainer}>
                <View style={[styles.searchPin, { backgroundColor: colors.buttonIcon }]}>
                  <MaterialIcons name="place" size={32} color="white" />
                </View>
              </View>
            </Mapbox.MarkerView>
          </>
        )}

        {/* Route line and markers */}
        {routeGeometry && (
          <>
            <Mapbox.ShapeSource id="routeSource" shape={routeGeometry}>
              <Mapbox.LineLayer
                id="routeLine"
                style={{
                  lineColor: colors.buttonIcon,
                  lineWidth: 5,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </Mapbox.ShapeSource>

            {userLocation && (
              <Mapbox.MarkerView
                id="routeOrigin"
                coordinate={userLocation}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={[styles.routeMarker, { backgroundColor: colors.buttonIcon }]}>
                  <MaterialIcons name="trip-origin" size={16} color="white" />
                </View>
              </Mapbox.MarkerView>
            )}

            {searchedLocation && (
              <Mapbox.MarkerView
                id="routeDestination"
                coordinate={[searchedLocation.lon, searchedLocation.lat]}
                anchor={{ x: 0.5, y: 1 }}
              >
                <View style={styles.searchPinContainer}>
                  <View style={[styles.searchPin, { backgroundColor: colors.buttonIcon }]}>
                    <MaterialIcons name="place" size={32} color="white" />
                  </View>
                </View>
              </Mapbox.MarkerView>
            )}

            {selectedStation && (
              <Mapbox.MarkerView
                id="stationDestination"
                coordinate={selectedStation.coordinates}
                anchor={{ x: 0.5, y: 1 }}
              >
                <View style={styles.searchPinContainer}>
                  <View style={[styles.searchPin, { backgroundColor: colors.buttonIcon }]}>
                    <MaterialIcons name="pedal-bike" size={32} color="white" />
                  </View>
                </View>
              </Mapbox.MarkerView>
            )}
          </>
        )}
      </Mapbox.MapView>

      <MapActionButtons
        onRecenter={handleRecenter}
        isRecentering={isRecentering}
        isFollowModeActive={isFollowModeActive}
        onDisableFollowMode={() => setIsFollowModeActive(false)}
        is3DMode={is3DMode}
        onToggle3D={handleToggle3D}
        currentMapStyle={mapStyle}
        onOpenMapStyle={() => setIsMapStylePickerVisible(true)}
        onOpenSettings={() => router.push('/settings')}
        onOpenBikeManagement={() => router.push('/bikes')}
        onOpenRecordedTrips={() => router.push('/trips')}
        isRecording={!!activeTrip}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        isStationsVisible={isStationsVisible}
        isStationsLoading={isStationDataLoading || isStationDataFetching || isVehicleDataFetching}
        onToggleStations={toggleStationVisibility}
      />

      {ENABLE_LAYER_RENDERING_TOGGLE && isStationsVisible && (
        <TouchableOpacity
          style={styles.renderModeToggle}
          onPress={() => setUseMarkerView((prev) => !prev)}
        >
          <Text style={styles.renderModeText}>{useMarkerView ? 'MarkerView' : 'Layers'}</Text>
        </TouchableOpacity>
      )}

      {!ENABLE_FANCY_SHEET && <SearchButton onPress={() => setIsSearchSheetVisible(true)} />}

      {/* Fancy Sheet (Apple Maps-like) - Always present, non-dismissible */}
      {ENABLE_FANCY_SHEET && (
        <FancySheet ref={fancySheetRef} onSelectLocation={handleSearchSelect} />
      )}

      {/* Station Sheet */}
      <StationSheet
        visible={showStationSheet}
        station={selectedStation}
        onClose={() => setSelectedStation(null)}
        onGetDirections={handleGetDirections}
        isLoadingDirections={directionsLoading}
      />

      {/* Vehicle Sheet */}
      <VehicleSheet
        visible={showVehicleSheet}
        vehicle={selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        onGetDirections={handleGetDirections}
        isLoadingDirections={directionsLoading}
      />

      {/* Location Sheet */}
      <LocationSheet
        visible={showLocationSheet}
        location={searchedLocation}
        onClose={() => setSearchedLocation(null)}
        onGetDirections={handleGetDirections}
        isLoadingDirections={directionsLoading}
      />

      {/* Route Info Sheet */}
      <RouteInfoSheet
        visible={showRouteSheet}
        route={directionsRoute}
        loading={directionsLoading}
        error={directionsError}
        profile={settings?.preferred_routing_profile || 'cycling'}
        units={(settings?.units as 'metric' | 'imperial') || 'metric'}
        onClearRoute={handleClearRoute}
        onRecalculate={() => setIsRoutePreferencesSheetVisible(true)}
      />

      <RoutePreferencesSheet
        visible={isRoutePreferencesSheetVisible}
        onClose={() => setIsRoutePreferencesSheetVisible(false)}
        onConfirm={handleConfirmRoutePreferences}
        mode={directionsRoute ? 'recalculate' : 'initial'}
      />

      {!ENABLE_FANCY_SHEET && (
        <SearchSheet
          visible={isSearchSheetVisible}
          onClose={() => setIsSearchSheetVisible(false)}
          onSelectLocation={handleSearchSelect}
        />
      )}

      <MapStylePicker
        visible={isMapStylePickerVisible}
        currentStyle={mapStyle}
        onClose={() => setIsMapStylePickerVisible(false)}
        onSelectStyle={handleSelectMapStyle}
      />

      {(activeBike || (bikesLoading && settings?.active_bike_id)) && (
        <InfoPill
          bike={activeBike}
          loading={bikesLoading}
          isRecording={!!activeTrip}
          latitude={userLocation?.[1] ?? null}
          longitude={userLocation?.[0] ?? null}
          onPress={() => setIsInfoPillSheetVisible(true)}
        />
      )}

      <InfoPillSheet
        visible={isInfoPillSheetVisible}
        bike={activeBike}
        weather={weather}
        isRecording={!!activeTrip}
        onClose={() => setIsInfoPillSheetVisible(false)}
      />

      <TripCompletionSheet
        visible={isTripCompletionSheetVisible}
        onClose={() => setIsTripCompletionSheetVisible(false)}
        onSave={handleTripCompletionSave}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapView: { flex: 1 },
  renderModeToggle: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: Colors.light.buttonBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  renderModeText: { fontSize: 12, fontWeight: '600', color: Colors.light.text },
  searchPinContainer: { alignItems: 'center' },
  searchPin: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  routeMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default MainMapView;
