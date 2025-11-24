import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import StationToggleButton from './StationToggleButton';
import StationCallout from './StationCallout';
import StationMarker from './StationMarker';
import StationLayers from './StationLayers';
import { useSupabase } from '@/hooks/use-supabase';
import { useBikeshareStations } from '@/hooks/use-bikeshare-stations';
import { useMapLocation } from '@/hooks/use-map-location';
import { useStationVisibility } from '@/hooks/use-station-visibility';

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
  const supabase = useSupabase('bikeshare');

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

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        ref={mapRef}
        style={styles.mapView}
        onRegionIsChanging={handleRegionIsChanging}
        onPress={handleMapPress}
      >
        <Mapbox.Camera
          centerCoordinate={userLocation || DEFAULT_LOCATION}
          zoomLevel={userLocation ? USER_LOCATION_ZOOM : DEFAULT_ZOOM}
          animationDuration={1000}
        />

        {locationPermissionGranted && (
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
      </Mapbox.MapView>

      <StationToggleButton
        isStationsVisible={isStationsVisible}
        isLoading={isStationDataLoading || isStationDataFetching}
        onToggle={toggleStationVisibility}
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
