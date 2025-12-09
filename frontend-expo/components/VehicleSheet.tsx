import React, { useRef, useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import BaseSheet, { BaseSheetRef } from './BaseSheet';
import GetDirectionsButton from './GetDirectionsButton';
import { Text } from './ui/text';
import { Button } from './ui/button';
import { Icon } from './icon';
import { cn } from '@/lib/utils';

/**
 * Vehicle data interface for free-floating bikeshare vehicles
 */
export interface VehicleData {
  id: string;
  coordinates: [number, number];
  isElectric: boolean;
  batteryLevel: number | null;
  vehicleType: string | null;
}

/**
 * Props for VehicleSheet component
 */
export interface VehicleSheetProps {
  visible: boolean;
  vehicle: VehicleData | null;
  onClose: () => void;
  onGetDirections?: () => void;
  isLoadingDirections?: boolean;
}

/**
 * VehicleSheet - Displays free-floating bikeshare vehicle information in a bottom sheet
 */
const VehicleSheet: React.FC<VehicleSheetProps> = ({
  visible,
  vehicle,
  onClose,
  onGetDirections,
  isLoadingDirections = false,
}) => {
  const sheetRef = useRef<BaseSheetRef>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [preservedVehicle, setPreservedVehicle] = useState<VehicleData | null>(null);

  useEffect(() => {
    if (vehicle) {
      setPreservedVehicle(vehicle);
    }
  }, [vehicle]);

  useEffect(() => {
    if (visible && vehicle) {
      sheetRef.current?.present();
    }
  }, [visible, vehicle]);

  const handleClosePress = () => {
    sheetRef.current?.dismiss();
  };

  const handleDismiss = () => {
    setIsExpanded(false);
    setPreservedVehicle(null);
    onClose();
  };

  const handleDetentChange = (index: number) => {
    setIsExpanded(index > 0);
  };

  const getVehicleTypeName = (vehicleType: string | null, isElectric: boolean): string => {
    if (vehicleType) {
      const type = vehicleType.toLowerCase();
      if (type.includes('scooter')) return 'Electric Scooter';
      if (type.includes('ebike') || type.includes('electric')) return 'Electric Bike';
      if (type.includes('bike')) return 'Bike';
      return vehicleType;
    }
    return isElectric ? 'Electric Bike' : 'Bike';
  };

  const getBatteryColor = (level: number | null): string => {
    if (level === null) return 'text-muted-foreground';
    if (level >= 50) return 'text-green-500';
    if (level >= 20) return 'text-amber-500';
    return 'text-red-500';
  };

  const currentVehicle = preservedVehicle;

  return (
    <BaseSheet
      ref={sheetRef}
      name="VehicleSheet"
      detents={[0.1, 0.5]}
      initialDetentIndex={0}
      onDismiss={handleDismiss}
      onDetentChange={handleDetentChange}
      scrollable={true}
      dimmed={false}
    >
      {currentVehicle && (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          scrollEnabled={isExpanded}
        >
          {!isExpanded ? (
            // Collapsed view
            <View className="flex-row items-center gap-3 p-4">
              <View
                className={cn(
                  'w-12 h-12 rounded-full items-center justify-center',
                  currentVehicle.isElectric ? 'bg-primary' : 'bg-accent',
                )}
              >
                <Icon
                  name={currentVehicle.isElectric ? 'electric-bike' : 'pedal-bike'}
                  size={24}
                  color="primaryForeground"
                />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-base mb-1" numberOfLines={1}>
                  {getVehicleTypeName(currentVehicle.vehicleType, currentVehicle.isElectric)}
                </Text>
                <View className="flex-row items-center gap-3">
                  {currentVehicle.batteryLevel !== null && (
                    <View className="flex-row items-center gap-1.5">
                      <Icon name="battery-std" size={16} color="mutedForeground" />
                      <Text
                        className={cn(
                          'font-semibold',
                          getBatteryColor(currentVehicle.batteryLevel),
                        )}
                      >
                        {currentVehicle.batteryLevel}%
                      </Text>
                    </View>
                  )}
                  <View className="flex-row items-center gap-1.5">
                    <Icon name="place" size={16} color="mutedForeground" />
                    <Text className="text-muted-foreground text-sm">Free-floating</Text>
                  </View>
                </View>
              </View>
              {onGetDirections && (
                <TouchableOpacity
                  className="p-1 mr-1"
                  onPress={onGetDirections}
                  disabled={isLoadingDirections}
                >
                  <Icon
                    name={isLoadingDirections ? 'hourglass-empty' : 'directions'}
                    size={20}
                    color="foreground"
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity className="p-1" onPress={handleClosePress}>
                <Icon name="close" size={20} color="foreground" />
              </TouchableOpacity>
            </View>
          ) : (
            // Expanded view
            <View className="p-4">
              {/* Header */}
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-semibold">Vehicle Details</Text>
                <Button variant="ghost" size="sm" onPress={handleClosePress}>
                  <Text className="text-base text-muted-foreground">Close</Text>
                </Button>
              </View>

              {/* Vehicle Icon */}
              <View className="items-center mb-8">
                <View
                  className={cn(
                    'w-24 h-24 rounded-full items-center justify-center',
                    currentVehicle.isElectric ? 'bg-primary' : 'bg-accent',
                  )}
                >
                  <Icon
                    name={currentVehicle.isElectric ? 'electric-bike' : 'pedal-bike'}
                    size={48}
                    color="primaryForeground"
                  />
                </View>
              </View>

              {/* Vehicle Type */}
              <Text className="text-2xl font-bold text-center mb-2">
                {getVehicleTypeName(currentVehicle.vehicleType, currentVehicle.isElectric)}
              </Text>
              <Text className="text-center text-muted-foreground mb-8">Free-floating vehicle</Text>

              {/* Battery (if electric) */}
              {currentVehicle.batteryLevel !== null && (
                <View className="items-center mb-8 pb-6 border-b border-border">
                  <View className="flex-row items-center gap-3">
                    <Icon name="battery-std" size={32} color="mutedForeground" />
                    <Text
                      className={cn(
                        'text-4xl font-bold',
                        getBatteryColor(currentVehicle.batteryLevel),
                      )}
                    >
                      {currentVehicle.batteryLevel}%
                    </Text>
                  </View>
                  <Text variant="small" className="text-muted-foreground mt-2">
                    Battery Level
                  </Text>
                </View>
              )}

              {/* Vehicle Details */}
              <View className="gap-4">
                {/* Type */}
                <View className="flex-row items-start gap-4">
                  <Icon
                    name={currentVehicle.isElectric ? 'electric-bike' : 'pedal-bike'}
                    size={20}
                    color="mutedForeground"
                  />
                  <View className="flex-1">
                    <Text variant="small" className="text-muted-foreground mb-1">
                      Type
                    </Text>
                    <Text>{currentVehicle.isElectric ? 'Electric' : 'Standard'}</Text>
                  </View>
                </View>

                {/* Coordinates */}
                <View className="flex-row items-start gap-4">
                  <Icon name="place" size={20} color="mutedForeground" />
                  <View className="flex-1">
                    <Text variant="small" className="text-muted-foreground mb-1">
                      Location
                    </Text>
                    <Text>
                      {currentVehicle.coordinates[1].toFixed(6)},{' '}
                      {currentVehicle.coordinates[0].toFixed(6)}
                    </Text>
                  </View>
                </View>

                {/* Availability */}
                <View className="flex-row items-start gap-4">
                  <Icon name="check-circle" size={20} color="mutedForeground" />
                  <View className="flex-1">
                    <Text variant="small" className="text-muted-foreground mb-1">
                      Status
                    </Text>
                    <Text className="text-green-500">Available</Text>
                  </View>
                </View>
              </View>

              {/* Get Directions Button */}
              {onGetDirections && (
                <View className="mt-8 mb-8">
                  <GetDirectionsButton onPress={onGetDirections} isLoading={isLoadingDirections} />
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </BaseSheet>
  );
};

export default VehicleSheet;
