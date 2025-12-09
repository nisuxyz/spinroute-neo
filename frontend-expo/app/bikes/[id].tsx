import React, { useState, useEffect } from 'react';
import { View, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useBikes, BikeType } from '@/hooks/use-bikes';
import { useUserSettings } from '@/contexts/user-settings-context';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const BIKE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
];

export default function EditBikeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bikes, updateBike, deleteBike, loading } = useBikes();
  const { settings, refetch: refetchSettings } = useUserSettings();

  const bike = bikes.find((b) => b.id === id);
  const isActiveBike = settings?.active_bike_id === id;

  const [formData, setFormData] = useState({
    name: '',
    type: 'road' as BikeType,
    brand: '',
    model: '',
    color: '#3b82f6',
  });

  useEffect(() => {
    if (bike) {
      setFormData({
        name: bike.name,
        type: bike.type,
        brand: bike.brand || '',
        model: bike.model || '',
        color: bike.color || '#3b82f6',
      });
    }
  }, [bike]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a bike name');
      return;
    }

    if (!id) return;

    const result = await updateBike(id, {
      name: formData.name.trim(),
      type: formData.type,
      brand: formData.brand.trim() || undefined,
      model: formData.model.trim() || undefined,
      color: formData.color,
    });

    if (result) {
      router.back();
    }
  };

  const handleDelete = () => {
    if (!id || !bike) return;

    const warningMessage = isActiveBike
      ? `"${bike.name}" is your active bike. Are you sure you want to delete it?`
      : `Are you sure you want to delete "${bike.name}"?`;

    Alert.alert('Delete Bike', warningMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const success = await deleteBike(id);
          if (success) {
            await refetchSettings();
            router.back();
          } else {
            Alert.alert('Error', 'Failed to delete bike');
          }
        },
      },
    ]);
  };

  if (!bike) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Edit Bike',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <ScrollView className="flex-1" contentContainerClassName="p-4 gap-5">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <View className="gap-6">
                <View className="gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </View>
                <View className="gap-2">
                  <Skeleton className="h-4 w-16" />
                  <View className="flex-row flex-wrap gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-12 w-24 rounded-lg" />
                    ))}
                  </View>
                </View>
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
          title: 'Edit Bike',
          headerBackButtonDisplayMode: 'minimal',
          headerRight: () => (
            <Text className="font-semibold mx-2" onPress={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          ),
        }}
      />
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-5">
        {/* Basic Info Card */}
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle variant="large">Basic Info</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="w-full gap-6">
              {/* Bike Name */}
              <View className="gap-2">
                <Label>Bike Name *</Label>
                <Input
                  placeholder="e.g., My Road Bike"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              {/* Brand */}
              <View className="gap-2">
                <Label>Brand (optional)</Label>
                <Input
                  placeholder="e.g., Trek, Specialized"
                  value={formData.brand}
                  onChangeText={(text) => setFormData({ ...formData, brand: text })}
                />
              </View>

              {/* Model */}
              <View className="gap-2">
                <Label>Model (optional)</Label>
                <Input
                  placeholder="e.g., Domane SL 5"
                  value={formData.model}
                  onChangeText={(text) => setFormData({ ...formData, model: text })}
                />
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Bike Type Card */}
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle variant="large">Bike Type</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="flex-row flex-wrap gap-2">
              {BIKE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => setFormData({ ...formData, type: type.value })}
                  className={cn(
                    'flex-1 min-w-24 flex-row items-center gap-1.5 px-3 py-2.5 rounded-lg border-2',
                    formData.type === type.value
                      ? 'border-primary bg-primary/20'
                      : 'border-border bg-transparent',
                  )}
                >
                  <Icon
                    name={type.icon}
                    size={20}
                    color={formData.type === type.value ? 'primary' : 'mutedForeground'}
                  />
                  <Text
                    className={cn(
                      'text-sm font-medium',
                      formData.type === type.value ? 'text-primary' : 'text-foreground',
                    )}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </CardContent>
        </Card>

        {/* Color Card */}
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle variant="large">Color</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="flex-row flex-wrap gap-3">
              {BIKE_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setFormData({ ...formData, color })}
                  className="w-12 h-12 rounded-full items-center justify-center border-4"
                  style={{
                    backgroundColor: color,
                    borderColor: formData.color === color ? 'white' : color,
                  }}
                >
                  {formData.color === color && <Icon name="check" size={20} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          </CardContent>
        </Card>

        {/* Statistics Card */}
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle variant="large">Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="flex-row items-center gap-3">
              <Icon name="speed" size={20} color="mutedForeground" />
              <View className="flex-1">
                <Text variant="small" className="text-muted-foreground">
                  Total Mileage
                </Text>
              </View>
              <Text className="font-semibold">
                {bike.total_kilometrage?.toFixed(1) || '0.0'} miles
              </Text>
            </View>
          </CardContent>
        </Card>

        {/* Danger Zone Card */}
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle variant="large" className="text-rose-500">
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <View className="gap-4">
              <Text variant="small" className="text-muted-foreground">
                Deleting this bike will remove all associated data. This action cannot be undone.
              </Text>
              {isActiveBike && (
                <View className="bg-amber-500/20 rounded-md p-3 flex-row gap-2 items-center">
                  <Icon name="warning" size={20} color="#f59e0b" />
                  <Text className="flex-1 text-sm text-amber-500 leading-[18px]">
                    This is your active bike.
                  </Text>
                </View>
              )}
            </View>
          </CardContent>
          <CardFooter>
            <Button
              // variant="destructive"
              size="lg"
              className="w-full bg-rose-500/20"
              onPress={handleDelete}
              disabled={loading}
            >
              <Icon name="delete" size={20} color="#f43f5e" />
              <Text className="text-rose-500">Delete Bike</Text>
            </Button>
          </CardFooter>
        </Card>
      </ScrollView>
    </>
  );
}
