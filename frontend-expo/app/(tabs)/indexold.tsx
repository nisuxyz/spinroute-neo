import { useSupabase } from '@/hooks/use-supabase';
import Mapbox, { type SymbolLayerStyle } from '@rnmapbox/maps';
import React, { useEffect } from 'react';
import { Image, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { useBikeshareStations } from '@/hooks/use-bikeshare-stations';

const styles = StyleSheet.create({
  touchableContainer: { borderColor: 'black', borderWidth: 1.0, width: 60 },
  touchable: {
    backgroundColor: 'blue',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchableText: {
    color: 'white',
    fontWeight: 'bold',
  },
  matchParent: { flex: 1 },
});

const mapStyles: {
  matchParent: StyleProp<ViewStyle>;
  mapPinLayer: SymbolLayerStyle;
  customCalloutText: StyleProp<TextStyle>;
  calloutContainerStyle: StyleProp<ViewStyle>;
} = {
  matchParent: {
    flex: 1,
  },
  mapPinLayer: {
    iconAllowOverlap: true,
    iconAnchor: 'bottom',
    iconSize: 1.0,
    iconImage: 'pin',
  },
  customCalloutText: {
    color: 'black',
    fontSize: 16,
  },
  calloutContainerStyle: {
    backgroundColor: 'white',
    width: 60,
    height: 40,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
};

const MapViewErrors = {
  FailedToFetchStations: class FailedToFetchStationsError extends Error {
    supabaseError?: Error;
    constructor(message: string, supabaseError?: Error) {
      super(message);
      this.name = 'FailedToFetchStationsError';
      this.supabaseError = supabaseError;
    }
  },
};

const MapView = () => {
  const supabase = useSupabase('bikeshare');

  const { stationList, stationFeatureCollection, fetchStationsError, updateStationList } =
    useBikeshareStations(supabase);

  const onPressMap = (e: GeoJSON.Feature) => {
    const geometry = e.geometry as GeoJSON.Point;
    console.log({ geometry });
    // setPointList((pl) => [...pl, geometry.coordinates]);
  };

  useEffect(() => {
    console.log(JSON.stringify(stationFeatureCollection, null, 2));
  }, [stationFeatureCollection]);

  return (
    <View style={{ flex: 1 }}>
      <Mapbox.MapView style={styles.matchParent} onCameraChanged={updateStationList}>
        <Mapbox.Camera
          followUserLocation={true}
          defaultSettings={{
            zoomLevel: 16,
          }}
        />
        <Mapbox.Images images={{ pinIcon: require('../../assets/images/pin.png') }} />
        <Mapbox.ShapeSource
          id="mapPinsSource"
          shape={stationFeatureCollection}
          // onPress={onPinPress}
        >
          <Mapbox.SymbolLayer id="mapPinsLayer" style={mapStyles.mapPinLayer} />
        </Mapbox.ShapeSource>
        <Mapbox.LocationPuck
          puckBearing={'heading'}
          puckBearingEnabled={true}
          pulsing={{
            isEnabled: true,
            color: 'teal',
            radius: 30.0,
          }}
        />
        {/* {stationList.map((station) => (
          <Mapbox.PointAnnotation
            key={station.id}
            id={station.id.toString()}
            coordinate={[station.lng, station.lat]}
          >
            <View style={styles.touchableContainer}>
              <View style={styles.touchable}>
                <Text style={styles.touchableText}>
                  {station.bikes_available}
                </Text>
                <Image
                  source={{
                    uri: "https://github.com/rnmapbox/maps/blob/main/example/src/assets/pin.png?raw=true",
                  }}
                  style={{ width: 20, height: 80 }}
                />
                <Mapbox.Callout title={station.name}>
                  <Image
                    source={{
                      uri: "https://github.com/rnmapbox/maps/blob/main/example/src/assets/pin.png?raw=true",
                    }}
                    style={{ width: 50, height: 50 }}
                  />
                </Mapbox.Callout>
              </View>
            </View>
          </Mapbox.PointAnnotation>
        ))} */}
      </Mapbox.MapView>
      <Image
        source={{
          // uri: "https://github.com/rnmapbox/maps/blob/main/example/src/assets/pin.png?raw=true",
          uri: Image.resolveAssetSource(require('../../assets/images/pin.png')).uri,
        }}
        style={{ width: 20, height: 80 }}
      />
    </View>
  );
};

export default MapView;
