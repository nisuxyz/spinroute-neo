import React, { useRef, useState } from 'react';
import { View, Alert, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { GlassView } from 'expo-glass-effect';
import { useUserSettings } from '@/contexts/user-settings-context';
import { useBikes } from '@/hooks/use-bikes';
import { useRouter } from 'expo-router';
import BaseSheet, { BaseSheetRef } from './BaseSheet';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Text } from './ui/text';
import { Skeleton } from './ui/skeleton';
import { Switch } from './ui/switch';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Button } from './ui/button';
import { Icon } from './icon';

export default function AppSettingsSection() {
  const router = useRouter();
  const { settings, loading, updateSettings } = useUserSettings();
  const { bikes, loading: bikesLoading } = useBikes();
  const [tempInterval, setTempInterval] = useState<number>(5);
  const intervalSheetRef = useRef<BaseSheetRef>(null);

  const handleUnitsChange = async (value: string) => {
    const units = value === 'km' ? 'metric' : 'imperial';
    const success = await updateSettings({ units });
    if (!success) {
      Alert.alert('Error', 'Failed to update units preference');
    }
  };

  const getActiveBikeName = () => {
    if (!settings?.active_bike_id) return 'None';
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
    intervalSheetRef.current?.present();
  };

  const dismissIntervalPicker = () => {
    intervalSheetRef.current?.dismiss();
  };

  const confirmIntervalChange = async () => {
    await handleCaptureIntervalChange(tempInterval);
    dismissIntervalPicker();
  };

  // Don't render if we still don't have settings after loading
  if (!settings && !loading) {
    return null;
  }

  return (
    <>
      <Card className="w-full max-w-sm">
        <CardHeader className="flex-row">
          <View className="flex-1 gap-1.5">
            <CardTitle variant="large">Preferences</CardTitle>
          </View>
        </CardHeader>
        <CardContent>
          {loading ? (
            <View className="w-full justify-center gap-4">
              <View className="gap-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </View>
              <View className="gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-48" />
              </View>
              <View className="gap-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-52" />
              </View>
              <View className="gap-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-48" />
              </View>
            </View>
          ) : (
            <View className="w-full justify-center gap-8">
              {/* Units Setting */}
              <View className="gap-2">
                <Label>Units</Label>
                <Text variant="small" className="text-gray-500">
                  Distance measurement system
                </Text>
                <ToggleGroup
                  type="single"
                  value={settings?.units === 'metric' ? 'km' : 'mi'}
                  onValueChange={(value) => value && handleUnitsChange(value)}
                  className="mt-1"
                  variant="outline"
                >
                  <ToggleGroupItem value="km" isFirst>
                    <Text>km</Text>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="mi" isLast>
                    <Text>mi</Text>
                  </ToggleGroupItem>
                </ToggleGroup>
              </View>

              {/* Active Bike Setting */}
              <TouchableOpacity onPress={() => router.push('/bikes')} className="gap-2">
                <Label>Active Bike</Label>
                <Text variant="small" className="text-gray-500">
                  Default bike for recording rides
                </Text>
                <View className="flex-row items-center justify-between mt-1">
                  {bikesLoading ? (
                    <Skeleton className="h-4 w-20" />
                  ) : (
                    <Text variant="small" className="text-muted-foreground">
                      {getActiveBikeName()}
                    </Text>
                  )}
                  <Icon name="chevron-right" size={20} color="mutedForeground" />
                </View>
              </TouchableOpacity>

              {/* Start Recording on Launch */}
              <View className="gap-2">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 gap-1">
                    <Label>Auto-start Recording</Label>
                    <Text variant="small" className="text-gray-500">
                      Start recording rides when app launches
                    </Text>
                  </View>
                  <Switch
                    checked={settings?.start_recording_on_launch ?? false}
                    onCheckedChange={handleStartRecordingToggle}
                  />
                </View>
              </View>

              {/* Capture Interval */}
              <TouchableOpacity onPress={openIntervalPicker} className="gap-2">
                <Label>Location Capture Interval</Label>
                <Text variant="small" className="text-gray-500">
                  How often to record location during trips
                </Text>
                <View className="flex-row items-center justify-between mt-1">
                  <Text variant="small" className="text-muted-foreground">
                    {settings?.capture_interval_seconds ?? 5}s
                  </Text>
                  <Icon name="chevron-right" size={20} color="mutedForeground" />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </CardContent>
      </Card>

      <BaseSheet
        ref={intervalSheetRef}
        name="captureIntervalSheet"
        detents={['auto']}
        grabberVisible
      >
        <View className="flex-row justify-between items-center p-4">
          <Text className="text-lg font-semibold">Location Capture Interval</Text>
          <Button variant="ghost" size="sm" onPress={dismissIntervalPicker}>
            <Text className="text-base text-muted-foreground">Cancel</Text>
          </Button>
        </View>
        <Picker
          selectedValue={tempInterval}
          onValueChange={(value) => setTempInterval(value as number)}
          className="w-full"
        >
          {Array.from({ length: 30 }, (_, i) => i + 1).map((seconds) => (
            <Picker.Item key={seconds} label={`${seconds} seconds`} value={seconds} />
          ))}
        </Picker>
        <View className="px-4">
          <Button size="xl" className="w-full" onPress={confirmIntervalChange}>
            <Text>Save</Text>
          </Button>
        </View>
      </BaseSheet>
    </>
  );
}
