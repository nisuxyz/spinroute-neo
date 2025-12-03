import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import MapActionButtons from './MapActionButtons';
import StationCard from './StationCard';
import StationMarker from './StationMarker';
import StationLayers from './StationLayers';
import { useClient } from 'react-supabase';
import { useBikeshareStations } from '@/hooks/use-bikeshare-stations';
import { useMapLocation } from '@/hooks/use-map-location';
import { useStationVisibility } from '@/hooks/use-station-visibility';
import { useTripRecording } from '@/hooks/use-trip-recording';
import { useLocationTracking } from '@/hooks/use-location-tracking';
import { useUserSettings } from '@/hooks/use-user-settings';
import { useBikes } from '@/hooks/use-bikes';
import { useStationDetails } from '@/hooks/use-station-details';
import { useFeatureAccess } from '@/hooks/use-feature-gate';
import { Colors } from '@/constants/theme';
import SearchButton from './SearchButton';
import SearchSheet from './SearchSheet';
import LocationCard from './LocationCard';
import MapStylePicker from './MapStylePicker';
import ActiveBikeIndicator from './ActiveBikeIndicator';
import RecordingIndicator from './RecordingIndicator';
import RouteInfoCard from './RouteInfoCard';
import { useDirections, RouteProfile } from '@/hooks/use-directions';

// Feature flags
const ENABLE_LAYER_RENDERING_TOGGLE = false;

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

const MainMapView: React.FC = () => {
  const mapRef = useRef<Mapbox.MapView>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const router = useRouter();
  const supabase = useClient();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const {
    updateStationList,
    stationFeatureCollection,
    fetchStationsError,
    isLoading: isStationDataFetching,
  } = useBikeshareStations(); // No longer needs supabase param - uses useClient() internally

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

  const [selectedStation, setSelectedStation] = useState<SelectedStation | null>(null);
  const [useMarkerView, setUseMarkerView] = useState(true);
  const [is3DMode, setIs3DMode] = useState(false);
  const [isRecentering, setIsRecentering] = useState(false);
  const [isFollowModeActive, setIsFollowModeActive] = useState(false);
  const [liveUserLocation, setLiveUserLocation] = useState<[number, number] | null>(null);
  const [isSearchSheetVisible, setIsSearchSheetVisible] = useState(false);
  const [isMapStylePickerVisible, setIsMapStylePickerVisible] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState<{
    name: string;
    display_name: string;
    lat: number;
    lon: number;
    type: string;
    mapbox_id: string;
  } | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<GeoJSON.LineString | null>(null);

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
  const {
    activeTrip,
    loading: tripLoading,
    error: tripError,
    startTrip,
    stopTrip,
  } = useTripRecording();

  // User settings for capture interval and map style
  const { settings, updateSettings } = useUserSettings();
  const captureInterval = settings?.capture_interval_seconds || 5;
  const mapStyle = settings?.map_style || 'mapbox://styles/mapbox/standard';

  // Get bikes and find active bike
  const { bikes, loading: bikesLoading, fetchBikes } = useBikes();
  const activeBike = bikes.find((bike) => bike.id === settings?.active_bike_id);

  // Feature access for trip limits
  const { canRecordUnlimitedTrips, freeWeeklyTripLimit, isPro } = useFeatureAccess();

  // Track weekly completed trips for free users (for proactive limit check)
  const [weeklyTripCount, setWeeklyTripCount] = useState(0);
  const [tripsLoading, setTripsLoading] = useState(true);

  // Fetch weekly completed trip count for free users
  React.useEffect(() => {
    if (canRecordUnlimitedTrips) {
      setTripsLoading(false);
      return;
    }

    const fetchWeeklyTripCount = async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { count, error } = await supabase
        .schema('recording')
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('started_at', oneWeekAgo.toISOString());

      if (!error && count !== null) {
        setWeeklyTripCount(count);
      }
      setTripsLoading(false);
    };

    fetchWeeklyTripCount();
  }, [canRecordUnlimitedTrips]); // Removed supabaseRecording from deps

  // Refetch bikes when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchBikes();
    }, [fetchBikes]),
  );

  // Location tracking hook - auto-starts when activeTrip exists
  const {
    isTracking,
    currentLocation,
    permissionStatus,
    requestPermissions,
    syncAllPoints,
    queuedPointsCount,
  } = useLocationTracking({
    tripId: activeTrip?.id || null,
    captureInterval,
  });

  // Note: Trip limit is enforced by RLS policy at database level
  // We rely on catching the RLS error in handleStartRecording

  const handleRegionIsChanging = (regionFeature: any) => {
    // Disable follow mode when user manually interacts with the map
    if (regionFeature?.properties?.isUserInteraction && isFollowModeActive) {
      setIsFollowModeActive(false);
    }

    if (regionFeature?.properties?.isUserInteraction && isStationsVisible) {
      const visibleBounds = regionFeature.properties.visibleBounds;
      if (visibleBounds?.length >= 2) {
        const feature = {
          properties: {
            bounds: {
              ne: visibleBounds[0],
              sw: visibleBounds[1],
            },
          },
        };
        updateStationList(feature);
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
      // Set basic info immediately
      setSelectedStation({
        id,
        name: message,
        coordinates,
        classicBikes,
        electricBikes,
        availableDocks,
        availabilityStatus,
      });

      // Fetch detailed info in the background
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
      // Set basic info immediately
      setSelectedStation({
        id,
        name,
        coordinates,
        classicBikes,
        electricBikes,
        availableDocks,
        availabilityStatus,
      });

      // Fetch detailed info in the background
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
    setSelectedStation(null);
  };

  const handleGetDirections = async (destination?: { lat: number; lon: number }) => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Unable to calculate route without your location');
      return;
    }

    const dest = destination || searchedLocation;
    if (!dest) {
      Alert.alert('Destination Required', 'Unable to calculate route without a destination');
      return;
    }

    // Use user preferences from settings (via useDirections hook)
    // Profile, bike type, and provider will be automatically applied from user settings
    await calculateRoute({
      origin: {
        latitude: userLocation[1],
        longitude: userLocation[0],
      },
      destination: {
        latitude: dest.lat,
        longitude: dest.lon,
      },
    });
  };

  const handleGetStationDirections = async () => {
    if (!selectedStation) return;
    await handleGetDirections({
      lat: selectedStation.coordinates[1],
      lon: selectedStation.coordinates[0],
    });
  };

  const handleClearRoute = () => {
    clearRoute();
    setRouteGeometry(null);
    if (userLocation) {
      cameraRef.current?.setCamera({
        centerCoordinate: userLocation,
        zoomLevel: USER_LOCATION_ZOOM,
        animationDuration: 1000,
      });
    }
  };

  // Update route geometry when directions route changes
  React.useEffect(() => {
    if (directionsRoute?.routes?.[0]?.geometry) {
      const geometry = directionsRoute.routes[0].geometry;
      if (typeof geometry === 'object' && geometry.type === 'LineString') {
        setRouteGeometry(geometry as GeoJSON.LineString);

        // Fit camera to route bounds
        if (geometry.coordinates && geometry.coordinates.length > 0) {
          const coords = geometry.coordinates as [number, number][];
          const lons = coords.map((c) => c[0]);
          const lats = coords.map((c) => c[1]);

          const bounds: [number, number, number, number] = [
            Math.min(...lons), // west
            Math.min(...lats), // south
            Math.max(...lons), // east
            Math.max(...lats), // north
          ];

          cameraRef.current?.fitBounds(
            [bounds[0], bounds[1]], // southwest
            [bounds[2], bounds[3]], // northeast
            [80, 40, 280, 40], // padding [top, right, bottom, left] - extra bottom padding for RouteInfoCard
            1000, // animation duration
          );
        }
      }
    }
  }, [directionsRoute]);

  // Follow user location when follow mode is active
  React.useEffect(() => {
    if (isFollowModeActive && liveUserLocation) {
      cameraRef.current?.setCamera({
        centerCoordinate: liveUserLocation,
        animationDuration: 300,
      });
    }
  }, [isFollowModeActive, liveUserLocation]);

  // Handler for location updates from LocationPuck
  const handleUserLocationUpdate = (location: Mapbox.Location) => {
    if (location?.coords) {
      const newLocation: [number, number] = [location.coords.longitude, location.coords.latitude];
      setLiveUserLocation(newLocation);
    }
  };

  const handleRecenter = () => {
    if (!userLocation) {
      Alert.alert('Location unavailable', 'Unable to get your current location');
      return;
    }

    // Toggle follow mode
    const newFollowMode = !isFollowModeActive;
    setIsFollowModeActive(newFollowMode);

    // Center on user location
    setIsRecentering(true);
    cameraRef.current?.setCamera({
      centerCoordinate: userLocation,
      zoomLevel: USER_LOCATION_ZOOM,
      animationDuration: 1000,
    });
    setTimeout(() => setIsRecentering(false), 1000);
  };

  const handleDisableFollowMode = () => {
    setIsFollowModeActive(false);
  };

  const handleToggle3D = () => {
    const newMode = !is3DMode;
    setIs3DMode(newMode);
    cameraRef.current?.setCamera({
      pitch: newMode ? 60 : 0,
      animationDuration: 500,
    });
  };

  const handleOpenSettings = () => {
    router.push('/settings');
  };

  const handleOpenBikeManagement = () => {
    router.push('/bikes');
  };

  const handleOpenRecordedTrips = () => {
    router.push('/trips');
  };

  const handleOpenMapStyle = () => {
    setIsMapStylePickerVisible(true);
  };

  const handleSelectMapStyle = async (styleUrl: string) => {
    const success = await updateSettings({ map_style: styleUrl });
    if (!success) {
      Alert.alert('Error', 'Failed to update map style');
    }
  };

  const handleStartRecording = async () => {
    // Proactive check: Show paywall immediately if limit reached
    // This provides better UX than waiting for RLS error
    if (!canRecordUnlimitedTrips && weeklyTripCount >= freeWeeklyTripLimit) {
      console.log('[MainMapView] Trip limit reached (proactive check), showing paywall');
      router.push('/paywall');
      return;
    }

    // Check and request location permissions
    if (permissionStatus !== 'granted') {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert('Permission Required', 'Location permission is required to record trips');
        return;
      }
    }

    // Try to start trip - RLS policy enforces limits as security boundary
    const trip = await startTrip();
    if (trip) {
      Alert.alert('Recording Started', 'Your trip is now being recorded');
    } else if (tripError) {
      // Fallback: Catch RLS errors (race conditions, edge cases)
      // RLS error could be auth failure OR limit exceeded - we assume limit for free users
      if (
        tripError.includes('RLS_POLICY_VIOLATION') ||
        tripError.includes('policy') ||
        tripError.includes('42501') ||
        tripError.includes('row-level security') ||
        tripError.includes('new row violates')
      ) {
        if (!isPro) {
          // Free user hit RLS error - likely the limit (could be race condition)
          console.log('[MainMapView] RLS error for free user, showing paywall');
          router.push('/paywall');
        } else {
          // Pro user hit RLS error - something else is wrong (auth?)
          console.error('[MainMapView] RLS error for pro user:', tripError);
          Alert.alert('Error', 'Unable to start trip. Please try again or contact support.');
        }
      } else {
        Alert.alert('Error', tripError);
      }
    }
  };

  const handleStopRecording = async () => {
    // First, sync all queued location points
    console.log('[MainMapView] Syncing queued points before stopping trip...');
    await syncAllPoints();

    // Then stop the trip (which will mark it as completed)
    const success = await stopTrip();
    if (success) {
      Alert.alert('Recording Stopped', 'Your trip has been saved');
    } else if (tripError) {
      Alert.alert('Error', tripError);
    }
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
        scaleBarPosition={{ left: 20, top: 8 }}
        logoPosition={{ left: 20, bottom: -16 }}
        attributionPosition={{ right: 12, bottom: -16 }}
      >
        <Mapbox.Camera
          ref={cameraRef}
          centerCoordinate={userLocation || DEFAULT_LOCATION}
          zoomLevel={userLocation ? USER_LOCATION_ZOOM : DEFAULT_ZOOM}
          animationDuration={1000}
        />

        {isStationsVisible && !useMarkerView && (
          <StationLayers
            stationFeatureCollection={stationFeatureCollection}
            onStationPress={handleStationPress}
          />
        )}

        {isStationsVisible &&
          useMarkerView &&
          stationFeatureCollection.features.map((feature) => {
            const { id, message, classicBikes, electricBikes, availableDocks, availabilityStatus } =
              feature.properties as any;
            const coordinates = (feature.geometry as any).coordinates as [number, number];

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

        {locationPermissionGranted && (
          <>
            <Mapbox.LocationPuck
              puckBearing="heading"
              puckBearingEnabled={true}
              pulsing={{
                isEnabled: true,
                color: colors.buttonIcon,
                radius: 30.0,
              }}
            />
            {/* Hidden UserLocation component to track location updates */}
            <Mapbox.UserLocation
              visible={false}
              onUpdate={handleUserLocationUpdate}
              minDisplacement={1}
            />
          </>
        )}

        {searchedLocation && (
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
        )}

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
          </>
        )}
      </Mapbox.MapView>

      <MapActionButtons
        onRecenter={handleRecenter}
        isRecentering={isRecentering}
        isFollowModeActive={isFollowModeActive}
        onDisableFollowMode={handleDisableFollowMode}
        is3DMode={is3DMode}
        onToggle3D={handleToggle3D}
        currentMapStyle={mapStyle}
        onOpenMapStyle={handleOpenMapStyle}
        onOpenSettings={handleOpenSettings}
        onOpenBikeManagement={handleOpenBikeManagement}
        onOpenRecordedTrips={handleOpenRecordedTrips}
        isRecording={!!activeTrip}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        isStationsVisible={isStationsVisible}
        isStationsLoading={isStationDataLoading || isStationDataFetching}
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

      <SearchButton onPress={() => setIsSearchSheetVisible(true)} />

      {selectedStation && !routeGeometry && (
        <StationCard
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
          onGetDirections={handleGetStationDirections}
          isLoadingDirections={directionsLoading}
        />
      )}

      {searchedLocation && !routeGeometry && !selectedStation && (
        <LocationCard
          location={searchedLocation}
          onClose={() => setSearchedLocation(null)}
          onGetDirections={() => handleGetDirections()}
          isLoadingDirections={directionsLoading}
        />
      )}

      {(directionsRoute || directionsLoading || directionsError) && (
        <RouteInfoCard
          route={directionsRoute}
          loading={directionsLoading}
          error={directionsError}
          profile={RouteProfile.CYCLING}
          units={(settings?.units as 'metric' | 'imperial') || 'metric'}
          onClearRoute={handleClearRoute}
          onRecalculate={
            selectedStation
              ? handleGetStationDirections
              : searchedLocation
                ? () => handleGetDirections()
                : undefined
          }
        />
      )}

      <SearchSheet
        visible={isSearchSheetVisible}
        onClose={() => setIsSearchSheetVisible(false)}
        onSelectLocation={(location) => {
          // Clear any existing route when selecting a new location
          handleClearRoute();
          setSearchedLocation(location);
          cameraRef.current?.setCamera({
            centerCoordinate: [location.lon, location.lat],
            zoomLevel: 15,
            animationDuration: 1000,
          });
        }}
      />

      <MapStylePicker
        visible={isMapStylePickerVisible}
        currentStyle={mapStyle}
        onClose={() => setIsMapStylePickerVisible(false)}
        onSelectStyle={handleSelectMapStyle}
      />

      {/* Active Bike Indicator */}
      {(activeBike || (bikesLoading && settings?.active_bike_id)) && (
        <ActiveBikeIndicator bike={activeBike} loading={bikesLoading} isRecording={!!activeTrip} />
      )}

      {/* Recording Status Indicator */}
      {/* {activeTrip && (
        <RecordingIndicator isTracking={isTracking} queuedPointsCount={queuedPointsCount} />
      )} */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapView: {
    flex: 1,
  },
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
  renderModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.calloutText,
  },
  searchPinContainer: {
    alignItems: 'center',
  },
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
