import React from 'react';
import { View, Alert, TouchableOpacity, ScrollView, Text as RNText } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useBikes, BikeType } from '@/hooks/use-bikes';
import { useUserSettings } from '@/contexts/user-settings-context';
import { useFeatureAccess } from '@/hooks/use-feature-gate';
import { usePaywall } from '@/hooks/use-paywall';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon, IconName } from '@/components/icon';
import { cn } from '@/lib/utils';

const BIKE_TYPES: { value: BikeType; label: string; icon: IconName }[] = [
  { value: 'road', label: 'Road', icon: 'directions-bike' },
  { value: 'mountain', label: 'Mountain', icon: 'terrain' },
  { value: 'hybrid', label: 'Hybrid', icon: 'pedal-bike' },
  { value: 'gravel', label: 'Gravel', icon: 'landscape' },
  { value: 'ebike', label: 'E-Bike', icon: 'electric-bike' },
  { value: 'other', label: 'Other', icon: 'two-wheeler' },
];

export default function BikesScreen() {
  const router = useRouter();
  const { bikes, loading, error } = useBikes();
  const { settings, updateSettings, refetch: refetchSettings } = useUserSettings();
  const { canAddUnlimitedBikes, freeBikeLimit } = useFeatureAccess();
  const { showPaywall } = usePaywall();

  // Proactive check: Show paywall immediately if limit reached
  const handleAddBike = () => {
    if (!canAddUnlimitedBikes && bikes.length >= freeBikeLimit) {
      console.log('[Bikes] Bike limit reached (proactive check), showing paywall');
      showPaywall();
      return;
    }
    // Navigate to add bike screen - RLS policy enforces limit as security boundary
    router.push('/bikes/new');
  };

  // const handleDeleteBike = (id: string, name: string) => {
  //   Alert.alert('Delete Bike', `Are you sure you want to delete "${name}"?`, [
  //     { text: 'Cancel', style: 'cancel' },
  //     {
  //       text: 'Delete',
  //       style: 'destructive',
  //       onPress: async () => {
  //         const success = await deleteBike(id);
  //         if (success) {
  //           await refetchSettings();
  //         }
  //       },
  //     },
  //   ]);
  // };

  const handleToggleActive = async (bike: any) => {
    const isActive = settings?.active_bike_id === bike.id;

    const success = await updateSettings({
      active_bike_id: isActive ? null : bike.id,
    });

    if (success) {
      Alert.alert(
        'Success',
        isActive
          ? `"${bike.name}" is no longer your active bike`
          : `"${bike.name}" is now your active bike`,
      );
    } else {
      Alert.alert('Error', 'Failed to update active bike');
    }
  };

  const renderBikeCard = (bike: any) => {
    const isActive = settings?.active_bike_id === bike.id;
    const bikeTypeInfo = BIKE_TYPES.find((t) => t.value === bike.type);

    return (
      <TouchableOpacity
        key={bike.id}
        onPress={() => router.push(`/bikes/${bike.id}`)}
        activeOpacity={0.7}
      >
        <Card className={cn('w-full max-w-sm', isActive && 'border-2 border-primary')}>
          <CardHeader className="flex-row items-center">
            <View
              className="w-6 h-6 rounded-full mr-3"
              style={{ backgroundColor: bike.color || '#3b82f6' }}
            />
            <View className="flex-1 gap-1.5">
              <View className="flex-row items-center gap-2">
                <CardTitle variant="large">{bike.name}</CardTitle>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Icon name={bikeTypeInfo?.icon ?? 'pedal-bike'} size={14} color="mutedForeground" />
                <Text variant="small" className="text-muted-foreground">
                  {bikeTypeInfo?.label || bike.type}
                </Text>
              </View>
            </View>
            <Button
              variant="outline"
              size="icon"
              onPress={() => handleToggleActive(bike)}
              disabled={loading}
              className={cn(isActive && 'bg-primary/20', 'mr-2 border-primary')}
            >
              <Icon
                name={isActive ? 'star' : 'star-outline'}
                size={18}
                color={isActive ? 'primary' : 'mutedForeground'}
              />
            </Button>
            <Icon name="chevron-right" size={24} color="mutedForeground" />
          </CardHeader>

          <CardContent>
            <View className="w-full justify-center gap-4">
              {/* Brand/Model */}
              {(bike.brand || bike.model) && (
                <View className="gap-1">
                  <Text variant="small" className="text-muted-foreground">
                    {[bike.brand, bike.model].filter(Boolean).join(' ')}
                  </Text>
                </View>
              )}

              {/* Mileage */}
              <View className="flex-row items-center gap-1.5">
                <Icon name="speed" size={16} color="mutedForeground" />
                <Text variant="small" className="font-medium">
                  {bike.total_kilometrage?.toFixed(1) || '0.0'} miles
                </Text>
              </View>
            </View>
          </CardContent>

          <CardFooter className="flex-row justify-end gap-2">
            {isActive && (
              <View className="bg-primary px-2 py-0.5 rounded">
                <Text className="text-primary-foreground text-xs font-bold uppercase">Active</Text>
              </View>
            )}
            {/* <Button
              variant="outline"
              size="icon"
              onPress={() => handleToggleActive(bike)}
              disabled={loading}
              className={cn(isActive && 'bg-primary/20')}
            >
              <Icon
                name={isActive ? 'star' : 'star-outline'}
                size={18}
                color={isActive ? 'primary' : 'mutedForeground'}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onPress={() => handleDeleteBike(bike.id, bike.name)}
            >
              <Icon name="delete" size={20} color="#ef4444" />
            </Button> */}
          </CardFooter>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderSkeletonCard = (index: number) => (
    <Card key={index} className="w-full max-w-sm">
      <CardHeader className="flex-row items-center">
        <Skeleton className="w-6 h-6 rounded-full mr-3" />
        <View className="flex-1 gap-1.5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-20" />
        </View>
        <Skeleton className="h-6 w-6" />
      </CardHeader>
      <CardContent>
        <View className="w-full justify-center gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
        </View>
      </CardContent>
      <CardFooter className="flex-row justify-end gap-2">
        <Skeleton className="h-10 w-10 rounded-md" />
        <Skeleton className="h-10 w-10 rounded-md" />
      </CardFooter>
    </Card>
  );

  const renderEmptyState = () => (
    <Card className="w-full max-w-sm">
      <CardContent className="py-8">
        <View className="items-center gap-4">
          <Icon name="pedal-bike" size={64} color="mutedForeground" />
          <View className="items-center gap-2">
            <Text className="text-xl font-semibold">No bikes yet</Text>
            <Text className="text-muted-foreground text-center">
              Add your first bike to get started
            </Text>
          </View>
          <Button size="lg" onPress={handleAddBike} className="mt-2">
            <Icon name="add" size={20} color="primaryForeground" />
            <Text>Add Bike</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );

  if (error) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'My Bikes',
            headerBackButtonDisplayMode: 'minimal',
            headerRight: () => (
              <View className="border-2 border-transparent m-0">
                <Icon name="add" size={32} color="primaryForeground" onPress={handleAddBike} />
              </View>
              // <Text className="font-semibold mx-2" onPress={handleAddBike}>
              //   New Bike
              // </Text>
            ),
          }}
        />
        <ScrollView className="flex-1" contentContainerClassName="p-4 gap-5">
          <Card className="w-full max-w-sm">
            <CardContent className="py-8">
              <View className="items-center gap-4">
                <Icon name="error-outline" size={48} color="#ef4444" />
                <Text className="text-center">{error}</Text>
              </View>
            </CardContent>
          </Card>
        </ScrollView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Bikes',
          headerBackButtonDisplayMode: 'minimal',
          headerRight: () => (
            <View className="border-2 border-transparent m-0">
              <Icon name="add" size={32} color="primaryForeground" onPress={handleAddBike} />
            </View>
            // <Text className="font-semibold mx-2" onPress={handleAddBike}>
            //   New Bike
            // </Text>
          ),
        }}
      />
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-5">
        {loading && bikes.length === 0 ? (
          // Loading skeleton
          <>{[0, 1, 2].map(renderSkeletonCard)}</>
        ) : bikes.length === 0 ? (
          // Empty state
          renderEmptyState()
        ) : (
          // Bike list
          bikes.map(renderBikeCard)
        )}
      </ScrollView>
    </>
  );
}
