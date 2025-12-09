import React from 'react';
import { View } from 'react-native';
import { useUserSettings } from '@/contexts/user-settings-context';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Text } from './ui/text';
import { Switch } from './ui/switch';
import { Skeleton } from './ui/skeleton';

export default function DevSettingsSection() {
  const { settings, loading, updateDevSettings } = useUserSettings();

  const handleToggleDevServices = (value: boolean) => {
    updateDevSettings({ useDevUrls: value });
  };

  // Don't render if we still don't have settings after loading
  if (!settings && !loading) {
    return null;
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="flex-row">
        <View className="flex-1 gap-1.5">
          <CardTitle variant="large">Developer</CardTitle>
        </View>
      </CardHeader>
      <CardContent>
        {loading ? (
          <View className="w-full justify-center gap-4">
            <View className="gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-64" />
            </View>
          </View>
        ) : (
          <View className="w-full justify-center gap-4">
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 gap-1">
                  <Label>Use Dev Services</Label>
                  <Text variant="small" className="text-gray-500">
                    Connect to local development services instead of production
                  </Text>
                </View>
                <Switch
                  checked={settings?.useDevUrls ?? false}
                  onCheckedChange={handleToggleDevServices}
                />
              </View>
            </View>
          </View>
        )}
      </CardContent>
    </Card>
  );
}
