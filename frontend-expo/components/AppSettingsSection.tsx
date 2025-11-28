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
  Modal,
  Pressable,
} from 'react-native';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { Picker } from '@react-native-picker/picker';
import { GlassContainer, GlassView } from 'expo-glass-effect';
import { Colors, electricPurple } from '@/constants/theme';
import { useUserSettings } from '@/hooks/use-user-settings';
import { useBikes } from '@/hooks/use-bikes';
import { useRouter } from 'expo-router';
import { lightenColor } from '@/utils/lighten-color';

export default function AppSettingsSection() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { settings, loading, updateSettings } = useUserSettings();
  const { bikes, loading: bikesLoading } = useBikes();
  const [showIntervalPicker, setShowIntervalPicker] = useState(false);
  const [tempInterval, setTempInterval] = useState<number>(5);

  const handleUnitsChange = async (value: string) => {
    const success = await updateSettings({ units: value });
    if (!success) {
      Alert.alert('Error', 'Failed to update units preference');
    }
  };

  const getActiveBikeName = () => {
    if (!settings?.active_bike_id) return 'None';
    // if (bikesLoading) return 'Loading...';
    const bike = bikes.find((b) => b.id === settings.active_bike_id);
    return bike?.name || 'None';
  };

  const handleStartRecordingToggle = async (value: boolean) => {
    const success = await updateSettings({ start_recording_on_launch: value });
    if (!success) {
      Alert.alert('Error', 'Failed to update recording preference');
    }
  };

  const handleCaptureIntervalChange = async (value: number) => {
    const success = await updateSettings({ capture_interval_seconds: value });
    if (!success) {
      Alert.alert('Error', 'Failed to update capture interval');
    }
  };

  const openIntervalPicker = () => {
    setTempInterval(settings?.capture_interval_seconds ?? 5);
    setShowIntervalPicker(true);
  };

  const confirmIntervalChange = () => {
    handleCaptureIntervalChange(tempInterval);
    setShowIntervalPicker(false);
  };

  // Only show loading on initial load when we have no settings at all
  if (!settings && loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  // Don't render if we still don't have settings after loading
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
              onPress={() => router.push('/bikes')}
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
                  {bikesLoading ? <ActivityIndicator /> : getActiveBikeName()}
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
              <View style={styles.valueContainer}>
                <Switch
                  value={settings.start_recording_on_launch}
                  onValueChange={handleStartRecordingToggle}
                  trackColor={{
                    false: colors.icon,
                    true: lightenColor(colors.buttonBackground, 100),
                  }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {/* Capture Interval */}
            <TouchableOpacity
              style={[
                styles.settingRow,
                styles.settingRowBorder,
                { borderTopColor: colors.background, paddingBottom: 0 },
              ]}
              onPress={openIntervalPicker}
              activeOpacity={0.7}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Location Capture Interval
                </Text>
                <Text style={[styles.settingDescription, { color: colors.icon }]}>
                  How often to record location during trips
                </Text>
              </View>
              <View style={styles.valueContainer}>
                <Text style={[styles.valueText, { color: colors.text }]}>
                  {settings.capture_interval_seconds ?? 5}s
                </Text>
                <Text style={[styles.chevron, { color: colors.icon }]}>›</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Interval Picker Modal */}
      <Modal
        visible={showIntervalPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIntervalPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowIntervalPicker(false)}>
          <Pressable>
            <GlassView style={styles.modalContent} glassEffectStyle="regular">
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Location Capture Interval
                </Text>
                <TouchableOpacity onPress={() => setShowIntervalPicker(false)}>
                  <Text style={[styles.modalCancel, { color: colors.icon }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <Picker
                selectedValue={tempInterval}
                onValueChange={(value) => setTempInterval(value as number)}
                style={[styles.modalPicker, { color: colors.text }]}
              >
                {Array.from({ length: 30 }, (_, i) => i + 1).map((seconds) => (
                  <Picker.Item key={seconds} label={`${seconds} seconds`} value={seconds} />
                ))}
              </Picker>
              <TouchableOpacity style={[styles.modalButton]} onPress={confirmIntervalChange}>
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </GlassView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {},
  section: {},
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCancel: {
    fontSize: 16,
  },
  modalPicker: {
    width: '100%',
    marginBottom: 16,
  },
  modalButton: {
    borderRadius: 12,
    backgroundColor: electricPurple,
    padding: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
