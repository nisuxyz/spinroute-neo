import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useUserSettings } from '@/contexts/user-settings-context';
import ProviderPicker from './ProviderPicker';
import ProfilePicker from './ProfilePicker';
// import BikeTypePicker from './BikeTypePicker';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Text } from './ui/text';
import { Skeleton } from './ui/skeleton';
import { Icon } from './icon';

export default function RoutingSettingsSection() {
  const { settings, loading } = useUserSettings();
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [showProfilePicker, setShowProfilePicker] = useState(false);
  // const [showBikeTypePicker, setShowBikeTypePicker] = useState(false);

  // Don't render if we still don't have settings after loading
  if (!settings && !loading) {
    return null;
  }

  const getProviderDisplayName = () => {
    if (!settings?.preferred_routing_provider) return 'Auto';
    // Capitalize first letter of each word
    return settings.preferred_routing_provider
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getProfileDisplayName = () => {
    if (!settings?.preferred_routing_profile) return 'Cycling';
    return (
      settings.preferred_routing_profile.charAt(0).toUpperCase() +
      settings.preferred_routing_profile.slice(1)
    );
  };

  // const getBikeTypeDisplayName = () => {
  //   if (!settings?.preferred_bike_type) return 'Generic';
  //   return (
  //     settings.preferred_bike_type.charAt(0).toUpperCase() + settings.preferred_bike_type.slice(1)
  //   );
  // };

  return (
    <>
      <Card className="w-full max-w-sm">
        <CardHeader className="flex-row">
          <View className="flex-1 gap-1.5">
            <CardTitle variant="large">Routing</CardTitle>
          </View>
        </CardHeader>
        <CardContent>
          {loading ? (
            <View className="w-full justify-center gap-4">
              <View className="gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-40" />
              </View>
              <View className="gap-2">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-36" />
              </View>
              <View className="gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-44" />
              </View>
            </View>
          ) : (
            <View className="w-full justify-center gap-8">
              {/* Provider Setting */}
              <TouchableOpacity onPress={() => setShowProviderPicker(true)} className="gap-2">
                <Label>Provider</Label>
                <Text variant="small" className="text-gray-500">
                  Routing service to use
                </Text>
                <View className="flex-row items-center justify-between mt-1">
                  <Text variant="small" className="text-muted-foreground">
                    {getProviderDisplayName()}
                  </Text>
                  <Icon name="chevron-right" size={20} color="mutedForeground" />
                </View>
              </TouchableOpacity>

              {/* Profile Setting */}
              <TouchableOpacity onPress={() => setShowProfilePicker(true)} className="gap-2">
                <Label>Profile</Label>
                <Text variant="small" className="text-gray-500">
                  Transportation mode
                </Text>
                <View className="flex-row items-center justify-between mt-1">
                  <Text variant="small" className="text-muted-foreground">
                    {getProfileDisplayName()}
                  </Text>
                  <Icon name="chevron-right" size={20} color="mutedForeground" />
                </View>
              </TouchableOpacity>

              {/* Bike Type Setting */}
              {/* <TouchableOpacity onPress={() => setShowBikeTypePicker(true)} className="gap-2">
                <Label>Bike Type</Label>
                <Text variant="small" className="text-gray-500">
                  Optimize routes for bike type
                </Text>
                <View className="flex-row items-center justify-between mt-1">
                  <Text variant="small" className="text-muted-foreground">
                    {getBikeTypeDisplayName()}
                  </Text>
                  <Icon name="chevron-right" size={20} color="mutedForeground" />
                </View>
              </TouchableOpacity> */}
            </View>
          )}
        </CardContent>
      </Card>

      {/* Pickers */}
      <ProviderPicker
        visible={showProviderPicker}
        currentProvider={settings?.preferred_routing_provider ?? null}
        onClose={() => setShowProviderPicker(false)}
      />
      <ProfilePicker
        visible={showProfilePicker}
        currentProfile={settings?.preferred_routing_profile ?? null}
        currentProvider={settings?.preferred_routing_provider ?? null}
        onClose={() => setShowProfilePicker(false)}
      />
      {/* <BikeTypePicker
        visible={showBikeTypePicker}
        currentBikeType={settings?.preferred_bike_type ?? null}
        currentProfile={settings?.preferred_routing_profile ?? null}
        onClose={() => setShowBikeTypePicker(false)}
      /> */}
    </>
  );
}
