import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface StationCalloutProps {
  stationName: string;
  classicBikes?: number;
  electricBikes?: number;
  availableDocks?: number;
  onClose?: () => void;
}

const StationCallout: React.FC<StationCalloutProps> = ({
  stationName,
  classicBikes,
  electricBikes,
  availableDocks,
  onClose,
}) => {
  const formatVehicleCount = (count: number | undefined, label: string): string => {
    return count !== undefined ? `${label}: ${count}` : `${label}: Data unavailable`;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onClose} activeOpacity={0.8}>
      <View style={styles.callout}>
        <Text style={styles.stationName}>{stationName}</Text>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleCount}>{formatVehicleCount(classicBikes, 'Classic')}</Text>
          <Text style={styles.vehicleCount}>{formatVehicleCount(electricBikes, 'Electric')}</Text>
          <Text style={styles.vehicleCount}>{formatVehicleCount(availableDocks, 'Docks')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  callout: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 120,
    maxWidth: 250,
  },
  stationName: {
    fontSize: 16, // Minimum 16pt font size for accessibility (requirement 4.4)
    color: 'black', // Black text for contrast (requirement 4.1)
    textAlign: 'center', // Center-aligned text (requirement 4.5)
    fontWeight: '600',
    marginBottom: 8, // Spacing between station name and vehicle info
  },
  vehicleInfo: {
    alignItems: 'center',
    gap: 4, // Spacing between vehicle count lines
  },
  vehicleCount: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontWeight: '400',
  },
});

export default StationCallout;
