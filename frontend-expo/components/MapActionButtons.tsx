import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import MapActionButton from './MapActionButton';
import { Colors, electricPurple } from '@/constants/theme';
import { getMapStyleIcon } from './MapStylePicker';

interface MapActionButtonsProps {
  // Recenter button
  onRecenter: () => void;
  isRecentering?: boolean;

  // 3D/2D toggle
  is3DMode: boolean;
  onToggle3D: () => void;

  // Map style
  currentMapStyle: string;
  onOpenMapStyle: () => void;

  // Settings
  onOpenSettings: () => void;

  // Bike management
  onOpenBikeManagement: () => void;

  // Recorded trips
  onOpenRecordedTrips: () => void;

  // Record trip
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;

  // Station visibility
  isStationsVisible: boolean;
  isStationsLoading: boolean;
  onToggleStations: () => void;
}

const MapActionButtons: React.FC<MapActionButtonsProps> = ({
  onRecenter,
  isRecentering = false,
  is3DMode,
  onToggle3D,
  currentMapStyle,
  onOpenMapStyle,
  onOpenSettings,
  onOpenBikeManagement,
  onOpenRecordedTrips,
  isRecording,
  onStartRecording,
  onStopRecording,
  isStationsVisible,
  isStationsLoading,
  onToggleStations,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const mapStyleIcon = getMapStyleIcon(currentMapStyle);

  return (
    <View style={styles.container}>
      <View style={styles.buttonGroup}>
        {/* Recenter on user location */}
        <MapActionButton
          icon="my-location"
          iconFamily="MaterialIcons"
          isActive={false}
          isLoading={isRecentering}
          buttonColor={electricPurple}
          onActivate={onRecenter}
          accessibilityLabel="Recenter on your location"
          testID="recenter-button"
        />

        {/* 3D/2D toggle */}
        <MapActionButton
          icon={is3DMode ? 'video-3d' : 'video-3d-off'}
          iconFamily="MaterialCommunityIcons"
          // text={is3DMode ? '3D' : '2D'}
          isActive={is3DMode}
          buttonColor={electricPurple}
          onActivate={onToggle3D}
          onDeactivate={onToggle3D}
          accessibilityLabel={is3DMode ? 'Switch to 2D view' : 'Switch to 3D view'}
          testID="3d-toggle"
        />

        {/* Map style selector */}
        <MapActionButton
          icon={mapStyleIcon.icon}
          iconFamily={mapStyleIcon.iconFamily}
          isActive={false}
          buttonColor={electricPurple}
          onActivate={onOpenMapStyle}
          accessibilityLabel="Change map style"
          testID="map-style-button"
        />

        {/* Station visibility toggle */}
        <MapActionButton
          icon={isStationsVisible ? 'attach-money' : 'money-off'}
          iconFamily="MaterialIcons"
          isActive={isStationsVisible}
          isLoading={isStationsLoading}
          buttonColor={electricPurple}
          onActivate={onToggleStations}
          onDeactivate={onToggleStations}
          accessibilityLabel={
            isStationsVisible ? 'Hide bike share stations' : 'Show bike share stations'
          }
          testID="station-toggle"
        />
      </View>
      <View style={styles.buttonGroup}>
        {/* Settings */}
        <MapActionButton
          icon="settings"
          iconFamily="MaterialIcons"
          isActive={false}
          buttonColor={electricPurple}
          onActivate={onOpenSettings}
          accessibilityLabel="Open settings"
          testID="settings-button"
        />

        {/* Bike management */}
        <MapActionButton
          icon="bike-pedal"
          iconFamily="MaterialCommunityIcons"
          isActive={false}
          buttonColor={electricPurple}
          onActivate={onOpenBikeManagement}
          accessibilityLabel="Manage bikes"
          testID="bike-management-button"
        />

        {/* Recorded trips */}
        <MapActionButton
          icon="chart-line"
          iconFamily="MaterialCommunityIcons"
          isActive={false}
          buttonColor={electricPurple}
          onActivate={onOpenRecordedTrips}
          accessibilityLabel="View recorded trips"
          testID="recorded-trips-button"
        />

        {/* Record trip */}
        <MapActionButton
          icon="tire"
          iconFamily="MaterialCommunityIcons"
          isActive={isRecording}
          isLoading={isRecording}
          customLoadingIcon={true}
          loadingSpinSpeed={1000}
          buttonColor={electricPurple}
          onActivate={onStartRecording}
          onDeactivate={onStopRecording}
          accessibilityLabel={isRecording ? 'Stop recording trip' : 'Start recording trip'}
          testID="record-trip-button"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 10,
    gap: 12,
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
    paddingTop: 100,
    paddingBottom: 130,
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
});

export default MapActionButtons;
