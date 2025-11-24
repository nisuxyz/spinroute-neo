import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import StationToggleButton from './StationToggleButton';
import StationCallout from './StationCallout';
import { useSupabase } from '@/hooks/use-supabase';
import { useBikeshareStations } from '@/hooks/use-bikeshare-stations';

// TypeScript interfaces for component state
interface MainMapViewState {
  isStationsVisible: boolean;
  useMarkerView: boolean; // Toggle between MarkerView and Layer rendering
  selectedStationId: string | null;
  selectedStationCoordinates: [number, number] | null; // [longitude, latitude]
  selectedStationName: string | null;
  selectedStationClassicBikes: number | undefined;
  selectedStationElectricBikes: number | undefined;
  selectedStationAvailableDocks: number | undefined;
  selectedStationAvailabilityStatus: string | undefined;
  userLocation: [number, number] | null; // [longitude, latitude]
  locationPermissionGranted: boolean;
  isLocationLoading: boolean;
  isStationDataLoading: boolean;
}

interface MainMapViewProps {
  // No props - this is a root view component as per design
}

const MainMapView: React.FC<MainMapViewProps> = () => {
  // Initialize Supabase client and bikeshare stations hook
  const supabase = useSupabase('bikeshare');
  const {
    updateStationList,
    stationFeatureCollection,
    fetchStationsError,
    isLoading: isStationDataFetching,
  } = useBikeshareStations(supabase);

  // Ref to access map for getting current bounds
  const mapRef = useRef<Mapbox.MapView>(null);

  // Component state management for station layer visibility and location
  const [mapState, setMapState] = useState<MainMapViewState>({
    isStationsVisible: false,
    useMarkerView: true, // Start with MarkerView for better z-ordering
    selectedStationId: null,
    selectedStationCoordinates: null,
    selectedStationName: null,
    selectedStationClassicBikes: undefined,
    selectedStationElectricBikes: undefined,
    selectedStationAvailableDocks: undefined,
    selectedStationAvailabilityStatus: undefined,
    userLocation: null,
    locationPermissionGranted: false,
    isLocationLoading: true,
    isStationDataLoading: false,
  });

  // Handler for toggling station visibility
  const toggleStationVisibility = () => {
    console.log('Toggle station visibility clicked');
    setMapState((prevState) => {
      const newVisibility = !prevState.isStationsVisible;
      console.log('New visibility state:', newVisibility);
      return {
        ...prevState,
        isStationsVisible: newVisibility,
        // Clear selected station when hiding stations
        selectedStationId: newVisibility ? prevState.selectedStationId : null,
        selectedStationCoordinates: newVisibility ? prevState.selectedStationCoordinates : null,
        selectedStationName: newVisibility ? prevState.selectedStationName : null,
        selectedStationClassicBikes: newVisibility
          ? prevState.selectedStationClassicBikes
          : undefined,
        selectedStationElectricBikes: newVisibility
          ? prevState.selectedStationElectricBikes
          : undefined,
        selectedStationAvailableDocks: newVisibility
          ? prevState.selectedStationAvailableDocks
          : undefined,
        selectedStationAvailabilityStatus: newVisibility
          ? prevState.selectedStationAvailabilityStatus
          : undefined,
        // Set loading state when enabling stations for the first time
        isStationDataLoading: newVisibility,
      };
    });
  };

  // // Handler for map region changes - update station data when stations are visible
  // const handleRegionChange = (regionFeature: any) => {
  //   console.log("🗺️ onRegionDidChange called:", regionFeature);

  //   // Only update station data when layer is active (requirement 1.3)
  //   if (mapState.isStationsVisible) {
  //     console.log("✅ Stations visible, updating station list...");

  //     // Extract bounds from the region feature (as per Mapbox documentation)
  //     if (
  //       regionFeature &&
  //       regionFeature.properties &&
  //       regionFeature.properties.visibleBounds
  //     ) {
  //       const visibleBounds = regionFeature.properties.visibleBounds;
  //       console.log(
  //         "📍 Got visible bounds from region feature:",
  //         visibleBounds
  //       );

  //       // visibleBounds is an array with [ne, sw] coordinates
  //       if (visibleBounds.length >= 2) {
  //         const feature = {
  //           properties: {
  //             bounds: {
  //               ne: visibleBounds[0], // northeast
  //               sw: visibleBounds[1], // southwest
  //             },
  //           },
  //         };

  //         console.log(
  //           "📦 Formatted bounds for update:",
  //           feature.properties.bounds
  //         );
  //         // Don't show loading state for subsequent map movements (requirement 6.2)
  //         updateStationList(feature);
  //       } else {
  //         console.warn("⚠️ Invalid visibleBounds format:", visibleBounds);
  //       }
  //     } else {
  //       console.warn("⚠️ No visibleBounds in region feature:", regionFeature);
  //     }
  //   } else {
  //     console.log("❌ Stations not visible, skipping update");
  //   }
  // };

  // // Additional debug handlers
  // const handleRegionWillChange = (regionFeature: any) => {
  //   console.log(
  //     "🔄 onRegionWillChange called:",
  //     regionFeature?.properties?.isUserInteraction
  //   );
  // };

  const handleRegionIsChanging = (regionFeature: any) => {
    // console.log(
    //   "⏳ onRegionIsChanging called:",
    //   regionFeature?.properties?.isUserInteraction
    // );

    // Only process user interactions (not programmatic camera changes)
    if (regionFeature?.properties?.isUserInteraction && mapState.isStationsVisible) {
      console.log('👆 User interaction detected, will update stations...');

      // Extract bounds from the region feature
      if (regionFeature && regionFeature.properties && regionFeature.properties.visibleBounds) {
        const visibleBounds = regionFeature.properties.visibleBounds;
        console.log('📍 Got visible bounds from region feature:', visibleBounds);

        // visibleBounds is an array with [ne, sw] coordinates
        if (visibleBounds.length >= 2) {
          const feature = {
            properties: {
              bounds: {
                ne: visibleBounds[0], // northeast
                sw: visibleBounds[1], // southwest
              },
            },
          };

          console.log('📦 Formatted bounds for update:', feature.properties.bounds);
          // Use debounced update (1 second delay) to avoid excessive API calls
          updateStationList(feature);
        } else {
          console.warn('⚠️ Invalid visibleBounds format:', visibleBounds);
        }
      } else {
        console.warn('⚠️ No visibleBounds in region feature:', regionFeature);
      }
    }
  };

  // Handler for when station data loading completes
  const handleStationDataLoaded = () => {
    setMapState((prevState) => ({
      ...prevState,
      isStationDataLoading: false,
    }));
  };

  // Handler for station pin press - show callout (requirement 2.1, 2.2, 2.3)
  const handleStationPress = (event: any) => {
    const feature = event.features[0];
    if (feature && feature.properties) {
      const stationId = feature.properties.id;
      const stationName = feature.properties.message;
      const coordinates = feature.geometry.coordinates;
      const classicBikes = feature.properties.classicBikes;
      const electricBikes = feature.properties.electricBikes;
      const availableDocks = feature.properties.availableDocks;
      const availabilityStatus = feature.properties.availabilityStatus;

      console.log('Station pressed:', stationId, stationName, {
        classicBikes,
        electricBikes,
        availableDocks,
        availabilityStatus,
      });

      setMapState((prevState) => {
        // If same station is already selected, hide callout (requirement 2.2)
        if (prevState.selectedStationId === stationId) {
          return {
            ...prevState,
            selectedStationId: null,
            selectedStationCoordinates: null,
            selectedStationName: null,
            selectedStationClassicBikes: undefined,
            selectedStationElectricBikes: undefined,
            selectedStationAvailableDocks: undefined,
            selectedStationAvailabilityStatus: undefined,
          };
        }

        // Show callout for new station (requirement 2.1, 2.3)
        return {
          ...prevState,
          selectedStationId: stationId,
          selectedStationCoordinates: coordinates,
          selectedStationName: stationName,
          selectedStationClassicBikes: classicBikes,
          selectedStationElectricBikes: electricBikes,
          selectedStationAvailableDocks: availableDocks,
          selectedStationAvailabilityStatus: availabilityStatus,
        };
      });
    }
  };

  // Handler for map press - hide callout when tapping empty areas (requirement 2.4)
  const handleMapPress = () => {
    console.log('Map pressed, hiding callout');
    setMapState((prevState) => ({
      ...prevState,
      selectedStationId: null,
      selectedStationCoordinates: null,
      selectedStationName: null,
      selectedStationClassicBikes: undefined,
      selectedStationElectricBikes: undefined,
      selectedStationAvailableDocks: undefined,
      selectedStationAvailabilityStatus: undefined,
    }));
  };

  // Handler for callout close
  const handleCalloutClose = () => {
    console.log('Callout closed');
    setMapState((prevState) => ({
      ...prevState,
      selectedStationId: null,
      selectedStationCoordinates: null,
      selectedStationName: null,
      selectedStationClassicBikes: undefined,
      selectedStationElectricBikes: undefined,
      selectedStationAvailableDocks: undefined,
      selectedStationAvailabilityStatus: undefined,
    }));
  };

  // Handler for MarkerView station press
  const handleMarkerViewPress = (
    stationId: string,
    stationName: string,
    coordinates: [number, number],
    classicBikes: number,
    electricBikes: number,
    availableDocks: number,
    availabilityStatus: string,
  ) => {
    console.log('MarkerView station pressed:', stationId, stationName);

    setMapState((prevState) => {
      // If same station is already selected, hide callout
      if (prevState.selectedStationId === stationId) {
        return {
          ...prevState,
          selectedStationId: null,
          selectedStationCoordinates: null,
          selectedStationName: null,
          selectedStationClassicBikes: undefined,
          selectedStationElectricBikes: undefined,
          selectedStationAvailableDocks: undefined,
          selectedStationAvailabilityStatus: undefined,
        };
      }

      // Show callout for new station
      return {
        ...prevState,
        selectedStationId: stationId,
        selectedStationCoordinates: coordinates,
        selectedStationName: stationName,
        selectedStationClassicBikes: classicBikes,
        selectedStationElectricBikes: electricBikes,
        selectedStationAvailableDocks: availableDocks,
        selectedStationAvailabilityStatus: availabilityStatus,
      };
    });
  };

  // Helper to get color based on bike availability
  const getColorForBikes = (classicBikes: number, electricBikes: number): string => {
    const totalBikes = (classicBikes || 0) + (electricBikes || 0);
    return totalBikes > 0 ? '#22c55e' : '#6b7280'; // Green if any bikes, gray if none
  };

  // Helper to get border color based on dock availability
  const getBorderColorForStatus = (status: string): string => {
    return status === 'no-docks' ? '#ef4444' : '#ffffff';
  };

  // Helper to check if electric bikes are available
  const hasElectricBikes = (electricBikes: number): boolean => {
    return (electricBikes || 0) > 0;
  };

  // Default fallback location (San Francisco downtown as example)
  const DEFAULT_LOCATION: [number, number] = [-122.4194, 37.7749]; // [longitude, latitude]
  const DEFAULT_ZOOM = 12;
  const USER_LOCATION_ZOOM = 16;

  // Request location permissions and get user location
  const requestLocationPermission = async () => {
    try {
      setMapState((prevState) => ({ ...prevState, isLocationLoading: true }));

      // Request foreground location permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        // Permission denied - use fallback location
        setMapState((prevState) => ({
          ...prevState,
          locationPermissionGranted: false,
          userLocation: DEFAULT_LOCATION,
          isLocationLoading: false,
        }));
        return;
      }

      // Permission granted - get current location
      setMapState((prevState) => ({
        ...prevState,
        locationPermissionGranted: true,
      }));

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const userCoords: [number, number] = [location.coords.longitude, location.coords.latitude];

      setMapState((prevState) => ({
        ...prevState,
        userLocation: userCoords,
        isLocationLoading: false,
      }));
    } catch (error) {
      console.error('Error getting location:', error);
      // Handle error gracefully with fallback location
      setMapState((prevState) => ({
        ...prevState,
        locationPermissionGranted: false,
        userLocation: DEFAULT_LOCATION,
        isLocationLoading: false,
      }));
    }
  };

  // Effect to request location on component mount
  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Effect to handle station data loading completion
  useEffect(() => {
    console.log(
      'Station feature collection updated:',
      stationFeatureCollection.features.length,
      'features',
    );

    // Update local loading state based on hook loading state and initial fetch
    if (
      mapState.isStationDataLoading &&
      !isStationDataFetching &&
      stationFeatureCollection.features.length > 0
    ) {
      console.log('Initial station data loaded successfully, stopping loading state');
      handleStationDataLoaded();
    }
  }, [
    stationFeatureCollection.features.length,
    mapState.isStationDataLoading,
    isStationDataFetching,
  ]);

  // Effect to handle station data fetch errors
  useEffect(() => {
    if (fetchStationsError && (mapState.isStationDataLoading || isStationDataFetching)) {
      // On error during initial load, return toggle button to inactive state (requirement 6.4)
      // But maintain existing pins if this is a subsequent fetch (requirement 1.6)
      setMapState((prevState) => ({
        ...prevState,
        isStationDataLoading: false,
        // Only hide stations if this was the initial load (no existing features)
        isStationsVisible:
          stationFeatureCollection.features.length > 0 ? prevState.isStationsVisible : false,
      }));
      console.error('Station data fetch failed:', fetchStationsError);
    }
  }, [
    fetchStationsError,
    mapState.isStationDataLoading,
    isStationDataFetching,
    stationFeatureCollection.features.length,
  ]);

  // Effect to trigger initial station fetch when stations are enabled
  useEffect(() => {
    if (mapState.isStationsVisible && mapState.isStationDataLoading) {
      console.log('Stations enabled, triggering initial fetch...');

      // Simulate a region change event to trigger initial station fetch
      // We'll use the current map bounds
      const simulateRegionChange = async () => {
        try {
          if (mapRef.current) {
            const bounds = await mapRef.current.getVisibleBounds();
            console.log('Got visible bounds:', bounds);

            if (bounds && bounds.length >= 2) {
              const feature = {
                properties: {
                  bounds: {
                    ne: bounds[1], // northeast
                    sw: bounds[0], // southwest
                  },
                },
              };
              updateStationList(feature);
            } else {
              throw new Error('Invalid bounds returned from map');
            }
          } else {
            throw new Error('Map reference not available');
          }
        } catch (error) {
          console.error('Error getting map bounds, using fallback:', error);

          // Fallback: create bounds based on current location
          const center = mapState.userLocation || DEFAULT_LOCATION;
          const offset = 0.01; // roughly 1km
          const feature = {
            properties: {
              bounds: {
                ne: [center[0] + offset, center[1] + offset],
                sw: [center[0] - offset, center[1] - offset],
              },
            },
          };

          console.log('Using fallback bounds:', feature.properties.bounds);
          updateStationList(feature);
        }
      };

      simulateRegionChange();
    }
  }, [mapState.isStationsVisible, mapState.isStationDataLoading, mapState.userLocation]);

  return (
    <View style={styles.container}>
      {/* Basic Mapbox MapView with full screen styling */}
      <Mapbox.MapView
        ref={mapRef}
        style={styles.mapView}
        // onRegionWillChange={handleRegionWillChange}
        onRegionIsChanging={handleRegionIsChanging}
        // onRegionDidChange={handleRegionChange}
        onPress={handleMapPress}
      >
        {/* Camera component for map positioning */}
        <Mapbox.Camera
          centerCoordinate={mapState.userLocation || DEFAULT_LOCATION}
          zoomLevel={mapState.userLocation ? USER_LOCATION_ZOOM : DEFAULT_ZOOM}
          animationDuration={1000}
        />

        {/* Location puck to show user position - only when permission granted */}
        {mapState.locationPermissionGranted && (
          <Mapbox.LocationPuck
            puckBearing="heading"
            puckBearingEnabled={true}
            pulsing={{
              isEnabled: true,
              color: 'teal',
              radius: 30.0,
            }}
          />
        )}

        {/* Conditional rendering of station markers based on toggle state and rendering mode */}
        {mapState.isStationsVisible && !mapState.useMarkerView && (
          <Mapbox.ShapeSource
            id="stationSource"
            shape={stationFeatureCollection}
            onPress={handleStationPress}
          >
            {/* Outer yellow ring for electric bike availability */}
            <Mapbox.CircleLayer
              id="stationElectricRing"
              style={{
                circleRadius: 16,
                circleColor: 'transparent',
                circleStrokeWidth: 3,
                circleStrokeColor: [
                  'case',
                  ['>', ['get', 'electricBikes'], 0],
                  '#eab308', // Yellow ring if electric bikes available
                  'transparent', // No ring otherwise
                ],
                circleStrokeOpacity: 0.8,
                circleSortKey: ['+', ['get', 'classicBikes'], ['get', 'electricBikes']],
              }}
            />

            {/* Main circle with bike availability */}
            <Mapbox.CircleLayer
              id="stationCircle"
              style={{
                circleRadius: 14,
                circleColor: [
                  'case',
                  ['>', ['+', ['get', 'classicBikes'], ['get', 'electricBikes']], 0],
                  '#22c55e', // Green if any bikes available
                  '#6b7280', // Gray if no bikes
                ],
                circleStrokeWidth: 2,
                circleStrokeColor: [
                  'case',
                  ['==', ['get', 'availabilityStatus'], 'no-docks'],
                  '#ef4444', // Red border when no docks available
                  '#ffffff', // White border otherwise
                ],
                circleSortKey: ['+', ['get', 'classicBikes'], ['get', 'electricBikes']],
              }}
            />

            {/* Text label showing total number of bikes available */}
            <Mapbox.SymbolLayer
              id="stationLabel"
              style={{
                textField: ['to-string', ['+', ['get', 'classicBikes'], ['get', 'electricBikes']]],
                textSize: 12,
                textColor: '#ffffff',
                textHaloColor: '#000000',
                textHaloWidth: 1,
                textAllowOverlap: true,
                symbolSortKey: ['+', ['get', 'classicBikes'], ['get', 'electricBikes']], // Match circle sort order
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* MarkerView-based rendering for proper z-ordering (slower with many markers) */}
        {mapState.isStationsVisible &&
          mapState.useMarkerView &&
          stationFeatureCollection.features.map((feature) => {
            const { id, message, classicBikes, electricBikes, availableDocks, availabilityStatus } =
              feature.properties;
            const coordinates = feature.geometry.coordinates as [number, number];
            const totalBikes = (classicBikes || 0) + (electricBikes || 0);
            const color = getColorForBikes(classicBikes || 0, electricBikes || 0);
            const borderColor = getBorderColorForStatus(availabilityStatus);
            const showElectricRing = hasElectricBikes(electricBikes || 0);

            return (
              <Mapbox.MarkerView
                key={id}
                id={`station-${id}`}
                coordinate={coordinates}
                anchor={{ x: 0.5, y: 0.5 }}
                allowOverlap={true}
                allowOverlapWithPuck={true}
              >
                <View style={styles.markerWrapper}>
                  {/* Yellow ring for electric bikes */}
                  {showElectricRing && <View style={styles.electricRing} />}

                  {/* Main marker circle */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.markerContainer,
                      { backgroundColor: color, borderColor: borderColor },
                    ]}
                    onPress={() =>
                      handleMarkerViewPress(
                        id,
                        message,
                        coordinates,
                        classicBikes,
                        electricBikes,
                        availableDocks,
                        availabilityStatus,
                      )
                    }
                  >
                    <Text style={styles.markerText}>{String(totalBikes)}</Text>
                  </TouchableOpacity>
                </View>
              </Mapbox.MarkerView>
            );
          })}

        {/* Station callout - positioned above selected pin (requirement 4.2) */}
        {mapState.selectedStationId &&
          mapState.selectedStationCoordinates &&
          mapState.selectedStationName && (
            <Mapbox.MarkerView
              id="stationCallout"
              allowOverlapWithPuck={true}
              coordinate={mapState.selectedStationCoordinates}
              anchor={{ x: 0.5, y: 1 }} // Center horizontally, bottom of callout at pin location
            >
              <StationCallout
                stationName={mapState.selectedStationName}
                classicBikes={mapState.selectedStationClassicBikes}
                electricBikes={mapState.selectedStationElectricBikes}
                availableDocks={mapState.selectedStationAvailableDocks}
                onClose={handleCalloutClose}
              />
            </Mapbox.MarkerView>
          )}
      </Mapbox.MapView>

      {/* Station toggle button */}
      <StationToggleButton
        isStationsVisible={mapState.isStationsVisible}
        isLoading={mapState.isStationDataLoading || isStationDataFetching}
        onToggle={toggleStationVisibility}
      />

      {/* Rendering mode toggle (dev tool) */}
      {mapState.isStationsVisible && (
        <TouchableOpacity
          style={styles.renderModeToggle}
          onPress={() => setMapState((prev) => ({ ...prev, useMarkerView: !prev.useMarkerView }))}
        >
          <Text style={styles.renderModeText}>
            {mapState.useMarkerView ? 'MarkerView' : 'Layers'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, // Full screen styling
  },
  mapView: {
    flex: 1, // Full screen map view
  },
  markerWrapper: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  electricRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#eab308',
    opacity: 0.8,
  },
  markerContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  renderModeToggle: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  renderModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
});

export default MainMapView;
