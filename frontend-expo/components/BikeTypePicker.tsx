import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { Colors, electricPurple } from '@/constants/theme';
import { useUserSettings } from '@/contexts/user-settings-context';

interface BikeTypeOption {
  value: string;
  label: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

const BIKE_TYPE_OPTIONS: BikeTypeOption[] = [
  {
    value: 'generic',
    label: 'Generic',
    description: 'Standard bike routing',
    icon: 'pedal-bike',
  },
  {
    value: 'road',
    label: 'Road',
    description: 'Optimized for road bikes',
    icon: 'directions-bike',
  },
  {
    value: 'mountain',
    label: 'Mountain',
    description: 'Off-road and trail routing',
    icon: 'terrain',
  },
  {
    value: 'ebike',
    label: 'E-Bike',
    description: 'Electric bike routing',
    icon: 'electric-bike',
  },
];

interface BikeTypePickerProps {
  visible: boolean;
  currentBikeType: string | null;
  currentProfile: string | null;
  onClose: () => void;
}

export default function BikeTypePicker({
  visible,
  currentBikeType,
  currentProfile,
  onClose,
}: BikeTypePickerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { updateSettings } = useUserSettings();

  // Only show bike type picker when profile is cycling
  const isCyclingProfile = currentProfile === 'cycling' || !currentProfile;

  const handleSelectBikeType = async (bikeTypeValue: string) => {
    const success = await updateSettings({ preferred_bike_type: bikeTypeValue });
    if (success) {
      onClose();
    } else {
      Alert.alert('Error', 'Failed to update bike type preference');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable>
          <GlassView style={styles.modalContent} glassEffectStyle="regular">
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Bike Type</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={[styles.modalCancel, { color: colors.icon }]}>Close</Text>
              </TouchableOpacity>
            </View>

            {!isCyclingProfile && (
              <View style={styles.infoContainer}>
                <MaterialIcons name="info-outline" size={24} color={colors.icon} />
                <Text style={[styles.infoText, { color: colors.icon }]}>
                  Bike type is only available when cycling profile is selected
                </Text>
              </View>
            )}

            {isCyclingProfile && (
              <>
                <View style={styles.infoContainer}>
                  <MaterialIcons name="info-outline" size={20} color={colors.icon} />
                  <Text style={[styles.infoTextSmall, { color: colors.icon }]}>
                    Some providers may fall back to generic cycling if specific bike type is not
                    supported
                  </Text>
                </View>

                <ScrollView style={styles.bikeTypeList} showsVerticalScrollIndicator={false}>
                  {BIKE_TYPE_OPTIONS.map((bikeType) => {
                    const isSelected = bikeType.value === (currentBikeType || 'generic');
                    return (
                      <TouchableOpacity
                        key={bikeType.value}
                        style={[
                          styles.bikeTypeItem,
                          { borderBottomColor: colors.background },
                          isSelected && { backgroundColor: colors.buttonBackground },
                        ]}
                        onPress={() => handleSelectBikeType(bikeType.value)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.bikeTypeIcon}>
                          <MaterialIcons name={bikeType.icon} size={28} color={colors.text} />
                        </View>
                        <View style={styles.bikeTypeInfo}>
                          <Text style={[styles.bikeTypeName, { color: colors.text }]}>
                            {bikeType.label}
                          </Text>
                          <Text style={[styles.bikeTypeDescription, { color: colors.icon }]}>
                            {bikeType.description}
                          </Text>
                        </View>
                        {isSelected && (
                          <MaterialIcons name="check" size={24} color={electricPurple} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </GlassView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 20,
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
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
  },
  infoTextSmall: {
    flex: 1,
    fontSize: 12,
  },
  bikeTypeList: {
    maxHeight: 400,
  },
  bikeTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderRadius: 8,
    marginBottom: 4,
  },
  bikeTypeIcon: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  bikeTypeInfo: {
    flex: 1,
  },
  bikeTypeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  bikeTypeDescription: {
    fontSize: 12,
  },
});
