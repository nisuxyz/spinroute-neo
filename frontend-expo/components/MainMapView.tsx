import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import MapActionButtons from './MapActionButtons';
import StationCallout from './StationCallout';
import StationMarker from './StationMarker';
import StationLayers from './StationLayers';
import { useSupabase } from '@/hooks/use-supabase';
import { useBikeshareStations } from '@/hooks/use-bikeshare-stations';
import { useMapLocation } from '@/hooks/use-map-location';
import { useStationVisibility } from '@/hooks/use-station-visibility';
import { Colors } from '@/constants/theme';

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
    Alert.alert('Settings', 'Settings screen coming soon');
  };

  const handleOpenBikeManagement = () => {
    Alert.alert('Bike Management', 'Bike management screen coming soon');
  };

  const handleOpenRecordedTrips = () => {
    Alert.alert('Recorded Trips', 'Recorded trips screen coming soon');
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
});

export default MainMapView;
