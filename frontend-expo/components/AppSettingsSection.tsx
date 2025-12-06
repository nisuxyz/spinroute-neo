import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { Picker } from '@react-native-picker/picker';
import { GlassView } from 'expo-glass-effect';
import { Colors, electricPurple } from '@/constants/theme';
import { useUserSettings } from '@/contexts/user-settings-context';
import { useBikes } from '@/hooks/use-bikes';
import { useRouter } from 'expo-router';
import SettingsCard from './SettingsCard';
import SettingsRow from './SettingsRow';

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
      <SettingsCard title="Preferences" icon="settings">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.tint} />
        </View>
      </SettingsCard>
    );
  }

  // Don't render if we still don't have settings after loading
  if (!settings) {
    return null;
  }

  return (
    <>
      <SettingsCard title="Preferences" icon="settings">
        {/* Units Setting */}
        <View style={styles.unitsRow}>
          <View style={styles.unitsInfo}>
            <Text style={[styles.unitsLabel, { color: colors.text }]}>Units</Text>
            <Text style={[styles.unitsDescription, { color: colors.icon }]}>
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
        <SettingsRow
          label="Active Bike"
          description="Default bike for recording rides"
          value={bikesLoading ? <ActivityIndicator size="small" /> : getActiveBikeName()}
          onPress={() => router.push('/bikes')}
          showChevron
          showBorder
        />

        {/* Start Recording on Launch */}
        <SettingsRow
          label="Auto-start Recording"
          description="Start recording rides when app launches"
          switchValue={settings.start_recording_on_launch}
          onSwitchChange={handleStartRecordingToggle}
          showBorder
        />

        {/* Capture Interval */}
        <SettingsRow
          label="Location Capture Interval"
          description="How often to record location during trips"
          value={`${settings.capture_interval_seconds ?? 5}s`}
          onPress={openIntervalPicker}
          showChevron
          showBorder
        />
      </SettingsCard>

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
  loadingContainer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  unitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  unitsInfo: {
    flex: 1,
    marginRight: 16,
    gap: 4,
  },
  unitsLabel: {
    fontSize: 15,
    fontWeight: '400',
  },
  unitsDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  segmentedControl: {
    width: 120,
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
