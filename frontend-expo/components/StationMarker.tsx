import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Mapbox from '@rnmapbox/maps';

interface StationMarkerProps {
  id: string;
  name: string;
  coordinate: [number, number];
  classicBikes: number;
  electricBikes: number;
  availableDocks: number;
  availabilityStatus: string;
  onPress: () => void;
}

const StationMarker: React.FC<StationMarkerProps> = ({
  id,
  coordinate,
  classicBikes,
  electricBikes,
  availabilityStatus,
  onPress,
}) => {
  const totalBikes = (classicBikes || 0) + (electricBikes || 0);
  const hasElectric = (electricBikes || 0) > 0;
  const backgroundColor = totalBikes > 0 ? '#22c55e' : '#6b7280';
  const borderColor = availabilityStatus === 'no-docks' ? '#ef4444' : '#ffffff';

  return (
    <Mapbox.MarkerView
      id={`station-${id}`}
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      allowOverlap={true}
      allowOverlapWithPuck={true}
    >
      <View style={styles.markerWrapper}>
        {hasElectric && <View style={styles.electricRing} />}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.markerContainer, { backgroundColor, borderColor }]}
          onPress={onPress}
        >
          <Text style={styles.markerText}>{String(totalBikes)}</Text>
        </TouchableOpacity>
      </View>
    </Mapbox.MarkerView>
  );
};

const styles = StyleSheet.create({
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
});

export default StationMarker;
