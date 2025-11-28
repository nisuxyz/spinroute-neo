import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  useColorScheme,
  Text,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useBikes, BikeType } from '@/hooks/use-bikes';
import { useUserSettings } from '@/hooks/use-user-settings';

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
  const { bikes, loading, error, createBike, updateBike, deleteBike } = useBikes();
  const { settings, updateSettings, refetch: refetchSettings } = useUserSettings();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBike, setEditingBike] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'road' as BikeType,
    brand: '',
    model: '',
    initial_mileage: '',
  });

  const handleAddBike = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a bike name');
      return;
    }

    const result = await createBike({
      name: formData.name.trim(),
      type: formData.type,
      brand: formData.brand.trim() || undefined,
      model: formData.model.trim() || undefined,
      initial_kilometrage: formData.initial_mileage ? parseFloat(formData.initial_mileage) : 0,
      unit: 'mi',
    });

    if (result) {
      setShowAddForm(false);
      setFormData({
        name: '',
        type: 'road',
        brand: '',
        model: '',
        initial_mileage: '',
      });
    }
  };

  const handleEditBike = (bike: any) => {
    setEditingBike(bike.id);
    setFormData({
      name: bike.name,
      type: bike.type,
      brand: bike.brand || '',
      model: bike.model || '',
      initial_mileage: '',
    });
    setShowAddForm(false);
  };

  const handleUpdateBike = async () => {
    if (!editingBike) return;

    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a bike name');
      return;
    }

    const result = await updateBike(editingBike, {
      name: formData.name.trim(),
      type: formData.type,
      brand: formData.brand.trim() || undefined,
      model: formData.model.trim() || undefined,
    });

    if (result) {
      setEditingBike(null);
      setFormData({
        name: '',
        type: 'road',
        brand: '',
        model: '',
        initial_mileage: '',
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingBike(null);
    setFormData({
      name: '',
      type: 'road',
      brand: '',
      model: '',
      initial_mileage: '',
    });
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

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Bikes',
          // headerBackTitle: 'Back',
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {error && (
            <View style={[styles.errorBanner, { backgroundColor: '#ef4444' }]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!showAddForm && !editingBike && (
            <TouchableOpacity
              style={[styles.addButton, { borderColor: colors.buttonBorder }]}
              onPress={() => setShowAddForm(true)}
            >
              <MaterialIcons name="add" size={24} color={colors.buttonIcon} />
              <Text style={[styles.addButtonText, { color: colors.text }]}>Add New Bike</Text>
            </TouchableOpacity>
          )}

          {(showAddForm || editingBike) && (
            <View style={[styles.formCard, { backgroundColor: colors.background + '40' }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>
                {editingBike ? 'Edit Bike' : 'Add New Bike'}
              </Text>

              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.icon }]}
                placeholder="Bike Name *"
                placeholderTextColor={colors.icon}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              <View style={styles.typeGrid}>
                {BIKE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeButton,
                      {
                        borderColor:
                          formData.type === type.value ? colors.buttonBorder : colors.icon,
                        backgroundColor:
                          formData.type === type.value ? colors.buttonBorder + '20' : 'transparent',
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, type: type.value })}
                  >
                    <MaterialIcons
                      name={type.icon as any}
                      size={24}
                      color={formData.type === type.value ? colors.buttonIcon : colors.icon}
                    />
                    <Text
                      style={[
                        styles.typeLabel,
                        {
                          color: formData.type === type.value ? colors.buttonIcon : colors.text,
                        },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.icon }]}
                placeholder="Brand (optional)"
                placeholderTextColor={colors.icon}
                value={formData.brand}
                onChangeText={(text) => setFormData({ ...formData, brand: text })}
              />

              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.icon }]}
                placeholder="Model (optional)"
                placeholderTextColor={colors.icon}
                value={formData.model}
                onChangeText={(text) => setFormData({ ...formData, model: text })}
              />

              {!editingBike && (
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.icon }]}
                  placeholder="Initial Mileage (miles, optional)"
                  placeholderTextColor={colors.icon}
                  keyboardType="numeric"
                  value={formData.initial_mileage}
                  onChangeText={(text) => setFormData({ ...formData, initial_mileage: text })}
                />
              )}

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.icon }]}
                  onPress={editingBike ? handleCancelEdit : () => setShowAddForm(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.buttonBorder }]}
                  onPress={editingBike ? handleUpdateBike : handleAddBike}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingBike ? 'Update Bike' : 'Add Bike'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {loading && bikes.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.buttonIcon} />
            </View>
          ) : bikes.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="pedal-bike" size={64} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.text + '80' }]}>
                No bikes yet. Add your first bike to get started!
              </Text>
            </View>
          ) : (
            bikes.map((bike) => {
              const isActive = settings?.active_bike_id === bike.id;
              return (
                <View
                  key={bike.id}
                  style={[
                    styles.bikeCard,
                    {
                      backgroundColor: colors.background + '40',
                      borderWidth: isActive ? 2 : 0,
                      borderColor: isActive ? colors.buttonBorder : 'transparent',
                    },
                  ]}
                >
                  <View style={styles.bikeHeader}>
                    <View style={styles.bikeInfo}>
                      <View style={styles.bikeNameRow}>
                        <Text style={[styles.bikeName, { color: colors.text }]}>{bike.name}</Text>
                        {isActive && (
                          <View
                            style={[styles.activeBadge, { backgroundColor: colors.buttonBorder }]}
                          >
                            <Text style={styles.activeBadgeText}>Active</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.bikeType, { color: colors.icon }]}>
                        {BIKE_TYPES.find((t) => t.value === bike.type)?.label || bike.type}
                      </Text>
                    </View>
                    <View style={styles.bikeActions}>
                      <TouchableOpacity
                        onPress={() => handleEditBike(bike)}
                        style={styles.editButton}
                      >
                        <MaterialIcons name="edit" size={22} color={colors.buttonIcon} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteBike(bike.id, bike.name)}
                        style={styles.deleteButton}
                      >
                        <MaterialIcons name="delete" size={22} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
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
                      <Text style={[styles.activeToggleText, { color: colors.buttonIcon }]}>
                        {isActive ? 'Active' : 'Set Active'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  formCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 2,
    gap: 6,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  bikeCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  bikeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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
  bikeType: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  bikeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  bikeDetails: {
    fontSize: 14,
    marginBottom: 8,
  },
  bikeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
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
  activeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  activeToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
