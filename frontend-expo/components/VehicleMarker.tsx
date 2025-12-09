import React from 'react';
import { View, Pressable } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { cn } from '@/lib/utils';

interface VehicleMarkerProps {
  id: string;
  coordinate: [number, number];
  isElectric: boolean;
  active?: boolean;
  onPress: () => void;
}

const VehicleMarker: React.FC<VehicleMarkerProps> = ({
  id,
  coordinate,
  isElectric,
  active = false,
  onPress,
}) => {
  return (
    <Mapbox.MarkerView
      id={`vehicle-${id}`}
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      allowOverlap={true}
      allowOverlapWithPuck={true}
    >
      <View className={cn('items-center justify-center', active ? 'h-10 w-10' : 'h-8 w-8')}>
        {/* Active glow */}
        {active && (
          <View
            className={cn(
              'absolute h-9 w-9 rounded-full opacity-35',
              isElectric ? 'bg-primary' : 'bg-accent',
            )}
          />
        )}

        {/* Main marker - smaller than station markers */}
        <Pressable
          onPress={onPress}
          className={cn(
            'items-center justify-center rounded-full',
            active ? 'h-5 w-5 border-2 border-white' : 'h-4 w-4 border border-white',
            isElectric ? 'bg-primary' : 'bg-accent',
          )}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        />
      </View>
    </Mapbox.MarkerView>
  );
};

export default VehicleMarker;
