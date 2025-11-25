import React from 'react';
import { useColorScheme } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import type { FeatureCollection } from 'geojson';
import { Colors } from '@/constants/theme';

interface StationLayersProps {
  stationFeatureCollection: FeatureCollection;
  onStationPress: (event: any) => void;
}

const StationLayers: React.FC<StationLayersProps> = ({
  stationFeatureCollection,
  onStationPress,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Mapbox.ShapeSource
      id="stationSource"
      shape={stationFeatureCollection}
      onPress={onStationPress}
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
            colors.stationElectric,
            'transparent',
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
            colors.stationAvailable,
            colors.stationEmpty,
          ],
          circleStrokeWidth: 2,
          circleStrokeColor: [
            'case',
            ['==', ['get', 'availabilityStatus'], 'no-docks'],
            colors.stationNoDocks,
            colors.stationBorder,
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
          textColor: colors.stationText,
          textHaloColor: colors.stationTextShadow,
          textHaloWidth: 1,
          textAllowOverlap: true,
          symbolSortKey: ['+', ['get', 'classicBikes'], ['get', 'electricBikes']],
        }}
      />
    </Mapbox.ShapeSource>
  );
};

export default StationLayers;
