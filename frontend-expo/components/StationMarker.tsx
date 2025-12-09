import React from 'react';
import { View, Pressable } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

interface StationMarkerProps {
  id: string;
  name: string;
  coordinate: [number, number];
  classicBikes: number;
  electricBikes: number;
  availableDocks: number;
  availabilityStatus: string;
  active?: boolean;
  onPress: () => void;
}

const StationMarker: React.FC<StationMarkerProps> = ({
  id,
  coordinate,
  classicBikes,
  electricBikes,
  availabilityStatus,
  active = false,
  onPress,
}) => {
  const totalBikes = (classicBikes || 0) + (electricBikes || 0);
  const hasElectric = (electricBikes || 0) > 0;
  const hasBikes = totalBikes > 0;
  const noDocks = availabilityStatus === 'no-docks';

  return (
    <Mapbox.MarkerView
      id={`station-${id}`}
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      allowOverlap={true}
      allowOverlapWithPuck={true}
    >
      <View className={cn('items-center justify-center', active ? 'h-12 w-12' : 'h-9 w-9')}>
        {/* Active glow */}
        {active && <View className="absolute h-11 w-11 rounded-full bg-primary opacity-35" />}

        {/* Electric ring indicator */}
        {hasElectric && (
          <View className="absolute rounded-full bg-yellow-500" style={{ height: 28, width: 28 }} />
        )}

        {/* Main marker */}
        <Pressable
          onPress={onPress}
          className={cn(
            'items-center justify-center rounded-full p-2',
            active ? 'h-6 w-6 border-[3px] border-primary' : 'h-6 w-6 border-[3px]',
            hasBikes ? 'bg-green-500' : 'h-6 w-6 bg-background',
            !active && (noDocks ? 'border-red-500' : 'border-white'),
          )}
        >
          <Text
            className={cn(
              'text-center text-xs font-bold text-white rounded-full w-4 h-4',
              // Text shadow isn't supported in NativeWind, but the white on colored bg has good contrast
            )}
          >
            {String(totalBikes)}
          </Text>
        </Pressable>
      </View>
    </Mapbox.MarkerView>
  );
};

export default StationMarker;
