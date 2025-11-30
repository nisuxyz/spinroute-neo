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
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
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

export default function NewBikeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { createBike, loading } = useBikes();

  const [formData, setFormData] = useState({
    name: '',
    type: 'road' as BikeType,
    brand: '',
    model: '',
    initial_mileage: '',
    color: '#3b82f6',
  });

  const handleSave = async () => {
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
      color: formData.color,
    });

    if (result) {
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add New Bike',
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

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Initial Mileage (optional)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.icon }]}
              placeholder="0"
              placeholderTextColor={colors.icon}
              keyboardType="numeric"
              value={formData.initial_mileage}
              onChangeText={(text) => setFormData({ ...formData, initial_mileage: text })}
            />
            <Text style={[styles.hint, { color: colors.icon }]}>
              Enter the current mileage in miles if this bike has been used before
            </Text>
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
  section: {
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
  hint: {
    fontSize: 13,
    marginTop: 6,
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
});
