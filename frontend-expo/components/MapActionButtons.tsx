import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { GlassContainer } from 'expo-glass-effect';
import MapActionButton from './MapActionButton';
import { electricPurple, Spacing } from '@/constants/theme';
import { getMapStyleIcon } from './MapStylePicker';

interface MapActionButtonsProps {
  // Recenter button
  onRecenter: () => void;
  isRecentering?: boolean;
  isFollowModeActive?: boolean;
  onDisableFollowMode?: () => void;

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
  isFollowModeActive = false,
  onDisableFollowMode,
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
  const mapStyleIcon = getMapStyleIcon(currentMapStyle);

  return (
    <View style={styles.container}>
      <GlassContainer spacing={8} style={[styles.buttonGroup, { paddingTop: 110 }]}>
        <MapActionButton
          icon="my-location"
          iconFamily="MaterialIcons"
          isActive={isFollowModeActive}
          isLoading={isRecentering}
          buttonColor={electricPurple}
          onActivate={onRecenter}
          onDeactivate={onDisableFollowMode}
          accessibilityLabel={
            isFollowModeActive ? 'Disable location following' : 'Follow your location'
          }
          testID="recenter-button"
        />

        <MapActionButton
          icon={is3DMode ? 'video-3d' : 'video-3d-off'}
          iconFamily="MaterialCommunityIcons"
          isActive={is3DMode}
          buttonColor={electricPurple}
          onActivate={onToggle3D}
          onDeactivate={onToggle3D}
          accessibilityLabel={is3DMode ? 'Switch to 2D view' : 'Switch to 3D view'}
          testID="3d-toggle"
        />

        <MapActionButton
          icon={mapStyleIcon.icon}
          iconFamily={mapStyleIcon.iconFamily}
          isActive={false}
          buttonColor={electricPurple}
          onActivate={onOpenMapStyle}
          accessibilityLabel="Change map style"
          testID="map-style-button"
        />

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
      </GlassContainer>

      <GlassContainer spacing={8} style={[styles.buttonGroup, { paddingBottom: 100 }]}>
        <MapActionButton
          icon="settings"
          iconFamily="MaterialIcons"
          isActive={false}
          buttonColor={electricPurple}
          onActivate={onOpenSettings}
          accessibilityLabel="Open settings"
          testID="settings-button"
        />

        <MapActionButton
          icon="bike-pedal"
          iconFamily="MaterialCommunityIcons"
          isActive={false}
          buttonColor={electricPurple}
          onActivate={onOpenBikeManagement}
          accessibilityLabel="Manage bikes"
          testID="bike-management-button"
        />

        <MapActionButton
          icon="chart-line"
          iconFamily="MaterialCommunityIcons"
          isActive={false}
          buttonColor={electricPurple}
          onActivate={onOpenRecordedTrips}
          accessibilityLabel="View recorded trips"
          testID="recorded-trips-button"
        />

        <MapActionButton
          icon="record-rec"
          iconFamily="MaterialCommunityIcons"
          isActive={isRecording}
          buttonColor={electricPurple}
          onActivate={onStartRecording}
          onDeactivate={onStopRecording}
          accessibilityLabel={isRecording ? 'Stop recording trip' : 'Start recording trip'}
          testID="record-trip-button"
        />
      </GlassContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
    // paddingTop: 100,
    // paddingBottom: 130,
  },
  buttonGroup: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingRight: Spacing.md,
    paddingTop: Spacing.xxxl,
    paddingLeft: Spacing.xxl,
  },
});

export default MapActionButtons;
