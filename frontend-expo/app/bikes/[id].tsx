import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  useColorScheme,
  Text,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useBikes, BikeType } from '@/hooks/use-bikes';

const BIKE_TYPES: { value: BikeType; label: string; icon: string }[] = [
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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bikes, updateBike, loading } = useBikes();

  const bike = bikes.find((b) => b.id === id);

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

  if (!bike) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Edit Bike',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.buttonIcon} />
          </View>
        </View>
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
            <TouchableOpacity onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.buttonIcon} />
              ) : (
                <Text style={[styles.saveButton, { color: colors.buttonIcon }]}>Save</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Bike Name *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.icon }]}
              placeholder="e.g., My Road Bike"
              placeholderTextColor={colors.icon}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Bike Type</Text>
            <View style={styles.typeGrid}>
              {BIKE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeButton,
                    {
                      borderColor: formData.type === type.value ? colors.buttonBorder : colors.icon,
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
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Color</Text>
            <View style={styles.colorGrid}>
              {BIKE_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton,
                    {
                      backgroundColor: color,
                      borderWidth: formData.color === color ? 3 : 0,
                      borderColor: colors.background,
                      transform: [{ scale: formData.color === color ? 1.1 : 1 }],
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, color })}
                >
                  {formData.color === color && (
                    <MaterialIcons name="check" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Brand (optional)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.icon }]}
              placeholder="e.g., Trek, Specialized"
              placeholderTextColor={colors.icon}
              value={formData.brand}
              onChangeText={(text) => setFormData({ ...formData, brand: text })}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Model (optional)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.icon }]}
              placeholder="e.g., Domane SL 5"
              placeholderTextColor={colors.icon}
              value={formData.model}
              onChangeText={(text) => setFormData({ ...formData, model: text })}
            />
          </View>

          <View style={styles.statsSection}>
            <Text style={[styles.label, { color: colors.text }]}>Statistics</Text>
            <View style={[styles.statCard, { backgroundColor: colors.buttonBackground }]}>
              <View style={styles.statRow}>
                <MaterialIcons name="speed" size={20} color={colors.buttonIcon} />
                <Text style={[styles.statLabel, { color: colors.icon }]}>Total Mileage</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {bike.total_kilometrage?.toFixed(1) || '0.0'} miles
                </Text>
              </View>
            </View>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  statsSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    gap: 6,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    fontSize: 17,
    fontWeight: '600',
  },
  statCard: {
    borderRadius: 12,
    padding: 16,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statLabel: {
    fontSize: 15,
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});
