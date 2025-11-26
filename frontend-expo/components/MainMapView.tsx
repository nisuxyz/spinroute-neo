import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import MapActionButtons from './MapActionButtons';
import StationCallout from './StationCallout';
import StationMarker from './StationMarker';
import StationLayers from './StationLayers';
import { useSupabase } from '@/hooks/use-supabase';
import { useBikeshareStations } from '@/hooks/use-bikeshare-stations';
import { useMapLocation } from '@/hooks/use-map-location';
import { useStationVisibility } from '@/hooks/use-station-visibility';
import { Colors } from '@/constants/theme';
import SearchButton from './SearchButton';
import SearchSheet from './SearchSheet';
import BikeManagementSheet from './BikeManagementSheet';
import RecordedTripsSheet from './RecordedTripsSheet';
import LocationCard from './LocationCard';

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
}

const MainMapView: React.FC = () => {
  const mapRef = useRef<Mapbox.MapView>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const router = useRouter();
  const supabase = useSupabase('bikeshare');
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const {
    updateStationList,
    stationFeatureCollection,
    fetchStationsError,
    isLoading: isStationDataFetching,
  } = useBikeshareStations(supabase);

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
  const [isRecording, setIsRecording] = useState(false);
  const [isRecentering, setIsRecentering] = useState(false);
  const [isSearchSheetVisible, setIsSearchSheetVisible] = useState(false);
  const [isBikeManagementSheetVisible, setIsBikeManagementSheetVisible] = useState(false);
  const [isRecordedTripsSheetVisible, setIsRecordedTripsSheetVisible] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState<{
    name: string;
    display_name: string;
    lat: number;
    lon: number;
    type: string;
    mapbox_id: string;
  } | null>(null);

  const handleRegionIsChanging = (regionFeature: any) => {
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

  const handleStationPress = (event: any) => {
    const feature = event.features[0];
    if (!feature?.properties) return;

    const { id, message, classicBikes, electricBikes, availableDocks, availabilityStatus } =
      feature.properties;
    const coordinates = feature.geometry.coordinates;

    if (selectedStation?.id === id) {
      setSelectedStation(null);
    } else {
      setSelectedStation({
        id,
        name: message,
        coordinates,
        classicBikes,
        electricBikes,
        availableDocks,
        availabilityStatus,
      });
    }
  };

  const handleMarkerPress = (
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
      setSelectedStation({
        id,
        name,
        coordinates,
        classicBikes,
        electricBikes,
        availableDocks,
        availabilityStatus,
      });
    }
  };

  const handleMapPress = () => {
    setSelectedStation(null);
  };

  const handleRecenter = () => {
    if (!userLocation) {
      Alert.alert('Location unavailable', 'Unable to get your current location');
      return;
    }

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
    cameraRef.current?.setCamera({
      pitch: newMode ? 60 : 0,
      animationDuration: 500,
    });
  };

  const handleOpenSettings = () => {
    router.push('/settings');
  };

  const handleOpenBikeManagement = () => {
    setIsBikeManagementSheetVisible(true);
  };

  const handleOpenRecordedTrips = () => {
    setIsRecordedTripsSheetVisible(true);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    Alert.alert('Recording Started', 'Your trip is now being recorded');
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    Alert.alert('Recording Stopped', 'Your trip has been saved');
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        ref={mapRef}
        style={styles.mapView}
        styleURL={'mapbox://styles/nisargj95/cm9nzzm2y00ji01s6crnj1bag'}
        onRegionIsChanging={handleRegionIsChanging}
        onPress={handleMapPress}
        compassEnabled={true}
        compassPosition={{ right: 14, top: 2 }}
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

        {selectedStation && (
          <Mapbox.MarkerView
            id="stationCallout"
            allowOverlapWithPuck={true}
            coordinate={selectedStation.coordinates}
            anchor={{ x: 0.5, y: 1 }}
          >
            <StationCallout
              stationName={selectedStation.name}
              classicBikes={selectedStation.classicBikes}
              electricBikes={selectedStation.electricBikes}
              availableDocks={selectedStation.availableDocks}
              onClose={() => setSelectedStation(null)}
            />
          </Mapbox.MarkerView>
        )}

        {locationPermissionGranted && (
          <Mapbox.LocationPuck
            puckBearing="heading"
            puckBearingEnabled={true}
            pulsing={{
              isEnabled: true,
              color: colors.locationPuck,
              radius: 30.0,
            }}
          />
        )}

        {searchedLocation && (
          <Mapbox.MarkerView
            id="searchedLocation"
            coordinate={[searchedLocation.lon, searchedLocation.lat]}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.searchPinContainer}>
              <View style={[styles.searchPin, { backgroundColor: colors.locationPuck }]}>
                <MaterialIcons name="place" size={32} color="white" />
              </View>
            </View>
          </Mapbox.MarkerView>
        )}
      </Mapbox.MapView>

      <MapActionButtons
        onRecenter={handleRecenter}
        isRecentering={isRecentering}
        is3DMode={is3DMode}
        onToggle3D={handleToggle3D}
        onOpenSettings={handleOpenSettings}
        onOpenBikeManagement={handleOpenBikeManagement}
        onOpenRecordedTrips={handleOpenRecordedTrips}
        isRecording={isRecording}
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

      {searchedLocation && (
        <LocationCard location={searchedLocation} onClose={() => setSearchedLocation(null)} />
      )}
      <SearchSheet
        visible={isSearchSheetVisible}
        onClose={() => setIsSearchSheetVisible(false)}
        onSelectLocation={(location) => {
          setSearchedLocation(location);
          cameraRef.current?.setCamera({
            centerCoordinate: [location.lon, location.lat],
            zoomLevel: 15,
            animationDuration: 1000,
          });
        }}
      />
      <BikeManagementSheet
        visible={isBikeManagementSheetVisible}
        onClose={() => setIsBikeManagementSheetVisible(false)}
      />
      <RecordedTripsSheet
        visible={isRecordedTripsSheetVisible}
        onClose={() => setIsRecordedTripsSheetVisible(false)}
      />
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
});

export default MainMapView;
