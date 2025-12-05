import React from 'react';
import {
  View,
  StyleSheet,
  useColorScheme,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { FlatList } from 'react-native-gesture-handler';
import { Colors } from '@/constants/theme';
import { useBikes, BikeType } from '@/hooks/use-bikes';
import { useUserSettings } from '@/contexts/user-settings-context';
import { useFeatureAccess } from '@/hooks/use-feature-gate';
import { usePaywall } from '@/hooks/use-paywall';

const BIKE_TYPES: { value: BikeType; label: string; icon: string }[] = [
  { value: 'road', label: 'Road', icon: 'directions-bike' },
  { value: 'mountain', label: 'Mountain', icon: 'terrain' },
  { value: 'hybrid', label: 'Hybrid', icon: 'pedal-bike' },
  { value: 'gravel', label: 'Gravel', icon: 'landscape' },
  { value: 'ebike', label: 'E-Bike', icon: 'electric-bike' },
  { value: 'other', label: 'Other', icon: 'two-wheeler' },
];

export default function BikesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { bikes, loading, error, deleteBike } = useBikes();
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

  const handleDeleteBike = (id: string, name: string) => {
    Alert.alert('Delete Bike', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const success = await deleteBike(id);
          if (success) {
            await refetchSettings();
          }
        },
      },
    ]);
  };

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

  const renderBikeItem = ({ item: bike }: { item: any }) => {
    const isActive = settings?.active_bike_id === bike.id;
    const bikeTypeInfo = BIKE_TYPES.find((t) => t.value === bike.type);

    return (
      <TouchableOpacity
        style={[
          styles.bikeCard,
          {
            backgroundColor: colors.buttonBackground,
            borderWidth: isActive ? 2 : 0,
            borderColor: isActive ? colors.buttonBorder : 'transparent',
          },
        ]}
        onPress={() => router.push(`/bikes/${bike.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.bikeHeader}>
          <View style={styles.bikeColorIndicator}>
            <View style={[styles.colorDot, { backgroundColor: bike.color || '#3b82f6' }]} />
          </View>
          <View style={styles.bikeInfo}>
            <View style={styles.bikeNameRow}>
              <Text style={[styles.bikeName, { color: colors.text }]}>{bike.name}</Text>
              {isActive && (
                <View style={[styles.activeBadge, { backgroundColor: colors.buttonBorder }]}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              )}
            </View>
            <View style={styles.bikeTypeRow}>
              <MaterialIcons name={bikeTypeInfo?.icon as any} size={16} color={colors.icon} />
              <Text style={[styles.bikeType, { color: colors.icon }]}>
                {bikeTypeInfo?.label || bike.type}
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.icon} />
        </View>

        {(bike.brand || bike.model) && (
          <Text style={[styles.bikeDetails, { color: colors.text + '80' }]}>
            {[bike.brand, bike.model].filter(Boolean).join(' ')}
          </Text>
        )}

        <View style={styles.bikeFooter}>
          <View style={styles.mileageContainer}>
            <MaterialIcons name="speed" size={16} color={colors.icon} />
            <Text style={[styles.mileageText, { color: colors.text }]}>
              {bike.total_kilometrage?.toFixed(1) || '0.0'} miles
            </Text>
          </View>
          <View style={styles.bikeActions}>
            <TouchableOpacity
              style={[
                styles.activeToggle,
                {
                  backgroundColor: isActive ? colors.buttonBorder + '20' : 'transparent',
                  borderColor: colors.buttonBorder,
                },
              ]}
              onPress={() => handleToggleActive(bike)}
              disabled={loading}
            >
              <MaterialIcons
                name={isActive ? 'star' : 'star-outline'}
                size={18}
                color={colors.buttonIcon}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteBike(bike.id, bike.name)}
              style={styles.deleteButton}
            >
              <MaterialIcons name="delete" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading && bikes.length === 0) {
      return null;
    }

    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="pedal-bike" size={64} color={colors.icon + '40'} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No bikes yet</Text>
        <Text style={[styles.emptyText, { color: colors.icon }]}>
          Add your first bike to get started
        </Text>
      </View>
    );
  };

  if (error) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'My Bikes',
            headerBackButtonDisplayMode: 'minimal',
            headerRight: () => (
              <TouchableOpacity onPress={handleAddBike}>
                <Text style={[styles.saveButton]}>New Bike</Text>
              </TouchableOpacity>
            ),
          }}
        />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color="#ef4444" />
            <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          </View>
        </View>
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
            <TouchableOpacity onPress={handleAddBike}>
              <Text style={[styles.saveButton]}>New Bike</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={bikes}
          renderItem={renderBikeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshing={loading && bikes.length === 0}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  bikeCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bikeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bikeColorIndicator: {
    marginRight: 12,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  bikeInfo: {
    flex: 1,
  },
  bikeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bikeName: {
    fontSize: 18,
    fontWeight: '600',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bikeTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bikeType: {
    fontSize: 14,
    fontWeight: '500',
  },
  bikeDetails: {
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 36,
  },
  bikeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#00000010',
  },
  mileageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mileageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bikeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  activeToggle: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  saveButton: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
    paddingHorizontal: 16,
  },
});
