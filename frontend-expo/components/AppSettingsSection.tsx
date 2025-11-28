import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Switch,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { Colors } from '@/constants/theme';
import { useUserSettings } from '@/hooks/use-user-settings';
import { useBikes } from '@/hooks/use-bikes';
import BikeManagementSheet from './BikeManagementSheet';

export default function AppSettingsSection() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { settings, loading, updateSettings } = useUserSettings();
  const { bikes, loading: bikesLoading } = useBikes();
  const [updating, setUpdating] = useState(false);
  const [showBikeSheet, setShowBikeSheet] = useState(false);

  const handleUnitsChange = async (value: string) => {
    setUpdating(true);
    const success = await updateSettings({ units: value });
    if (!success) {
      Alert.alert('Error', 'Failed to update units preference');
    }
    setUpdating(false);
  };

  const getActiveBikeName = () => {
    if (!settings?.active_bike_id) return 'None';
    const bike = bikes.find((b) => b.id === settings.active_bike_id);
    return bike?.name || 'None';
  };

  const handleStartRecordingToggle = async (value: boolean) => {
    setUpdating(true);
    const success = await updateSettings({ start_recording_on_launch: value });
    if (!success) {
      Alert.alert('Error', 'Failed to update recording preference');
    }
    setUpdating(false);
  };

  const handleCaptureIntervalChange = async (value: number) => {
    setUpdating(true);
    const success = await updateSettings({ capture_interval_seconds: value });
    if (!success) {
      Alert.alert('Error', 'Failed to update capture interval');
    }
    setUpdating(false);
  };

  if (loading || bikesLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>

          <View style={[styles.card, { backgroundColor: colors.buttonBackground }]}>
            {/* Units Setting */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Units</Text>
                <Text style={[styles.settingDescription, { color: colors.icon }]}>
                  Distance measurement system
                </Text>
              </View>
              <SegmentedControl
                values={['km', 'mi']}
                selectedIndex={settings.units === 'metric' ? 0 : 1}
                onChange={(event) => {
                  const index = event.nativeEvent.selectedSegmentIndex;
                  handleUnitsChange(index === 0 ? 'metric' : 'imperial');
                }}
                enabled={!updating}
                style={styles.segmentedControl}
              />
            </View>

            {/* Active Bike Setting */}
            <TouchableOpacity
              style={[
                styles.settingRow,
                styles.settingRowBorder,
                { borderTopColor: colors.background },
              ]}
              onPress={() => setShowBikeSheet(true)}
              disabled={updating}
              activeOpacity={0.7}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Active Bike</Text>
                <Text style={[styles.settingDescription, { color: colors.icon }]}>
                  Default bike for recording rides
                </Text>
              </View>
              <View style={styles.valueContainer}>
                <Text style={[styles.valueText, { color: colors.text }]}>
                  {getActiveBikeName()}
                </Text>
                <Text style={[styles.chevron, { color: colors.icon }]}>›</Text>
              </View>
            </TouchableOpacity>

            {/* Start Recording on Launch */}
            <View
              style={[
                styles.settingRow,
                styles.settingRowBorder,
                { borderTopColor: colors.background },
              ]}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Auto-start Recording
                </Text>
                <Text style={[styles.settingDescription, { color: colors.icon }]}>
                  Start recording rides when app launches
                </Text>
              </View>
              <Switch
                value={settings.start_recording_on_launch}
                onValueChange={handleStartRecordingToggle}
                disabled={updating}
                trackColor={{ false: colors.icon, true: colors.tint }}
                thumbColor="#fff"
              />
            </View>

            {/* Capture Interval */}
            <View
              style={[
                styles.settingRow,
                styles.settingRowBorder,
                { borderTopColor: colors.background },
                { paddingBottom: 0 },
              ]}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Location Capture Interval
                </Text>
                <Text style={[styles.settingDescription, { color: colors.icon }]}>
                  How often to record location during trips
                </Text>
              </View>
              <SegmentedControl
                values={['1s', '5s', '10s', '30s', '60s']}
                selectedIndex={
                  settings.capture_interval_seconds === 1
                    ? 0
                    : settings.capture_interval_seconds === 5
                      ? 1
                      : settings.capture_interval_seconds === 10
                        ? 2
                        : settings.capture_interval_seconds === 30
                          ? 3
                          : 4
                }
                onChange={(event) => {
                  const index = event.nativeEvent.selectedSegmentIndex;
                  const intervals = [1, 5, 10, 30, 60];
                  handleCaptureIntervalChange(intervals[index]);
                }}
                enabled={!updating}
                style={styles.segmentedControlWide}
              />
            </View>
          </View>
        </View>
      </View>

      <BikeManagementSheet visible={showBikeSheet} onClose={() => setShowBikeSheet(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },
  settingRowBorder: {
    borderTopWidth: 1,
    // marginTop: 12,
    paddingTop: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
  },
  segmentedControl: {
    width: 120,
  },
  segmentedControlWide: {
    width: 200,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
  },
});
