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
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { Colors, electricPurple } from '@/constants/theme';

export interface MapStyle {
  name: string;
  url: string;
  description: string;
  icon: string;
  iconFamily: 'MaterialIcons' | 'MaterialCommunityIcons';
}

export const MAP_STYLES: MapStyle[] = [
  {
    name: 'Standard',
    url: 'mapbox://styles/mapbox/standard',
    description: 'Modern default style with dynamic features',
    icon: 'map',
    iconFamily: 'MaterialIcons',
  },
  {
    name: 'Standard Satellite',
    url: 'mapbox://styles/mapbox/standard-satellite',
    description: 'Satellite imagery with labels',
    icon: 'satellite-variant',
    iconFamily: 'MaterialCommunityIcons',
  },
  {
    name: 'Streets',
    url: 'mapbox://styles/mapbox/streets-v12',
    description: 'Classic street map',
    icon: 'map-outline',
    iconFamily: 'MaterialCommunityIcons',
  },
  {
    name: 'Outdoors',
    url: 'mapbox://styles/mapbox/outdoors-v12',
    description: 'Topographic style for outdoor activities',
    icon: 'terrain',
    iconFamily: 'MaterialIcons',
  },
  {
    name: 'Light',
    url: 'mapbox://styles/mapbox/light-v11',
    description: 'Minimalist light theme',
    icon: 'wb-sunny',
    iconFamily: 'MaterialIcons',
  },
  {
    name: 'Dark',
    url: 'mapbox://styles/mapbox/dark-v11',
    description: 'Minimalist dark theme',
    icon: 'nightlight-round',
    iconFamily: 'MaterialIcons',
  },
  {
    name: 'Satellite',
    url: 'mapbox://styles/mapbox/satellite-v9',
    description: 'Pure satellite imagery',
    icon: 'satellite',
    iconFamily: 'MaterialIcons',
  },
  {
    name: 'Satellite Streets',
    url: 'mapbox://styles/mapbox/satellite-streets-v12',
    description: 'Satellite with street overlays',
    icon: 'satellite-alt',
    iconFamily: 'MaterialIcons',
  },
  {
    name: 'Navigation Day',
    url: 'mapbox://styles/mapbox/navigation-day-v1',
    description: 'Optimized for daytime navigation',
    icon: 'navigation',
    iconFamily: 'MaterialIcons',
  },
  {
    name: 'Navigation Night',
    url: 'mapbox://styles/mapbox/navigation-night-v1',
    description: 'Optimized for nighttime navigation',
    icon: 'navigation',
    iconFamily: 'MaterialIcons',
  },
];

export function getMapStyleIcon(styleUrl: string): {
  icon: string;
  iconFamily: 'MaterialIcons' | 'MaterialCommunityIcons';
} {
  const style = MAP_STYLES.find((s) => s.url === styleUrl);
  return style
    ? { icon: style.icon, iconFamily: style.iconFamily }
    : { icon: 'map', iconFamily: 'MaterialIcons' };
}

interface MapStylePickerProps {
  visible: boolean;
  currentStyle: string;
  onClose: () => void;
  onSelectStyle: (styleUrl: string) => void;
}

export default function MapStylePicker({
  visible,
  currentStyle,
  onClose,
  onSelectStyle,
}: MapStylePickerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleSelectStyle = (styleUrl: string) => {
    onSelectStyle(styleUrl);
    onClose();
  };

  const renderIcon = (style: MapStyle, size: number = 24) => {
    if (style.iconFamily === 'MaterialIcons') {
      return <MaterialIcons name={style.icon as any} size={size} color={colors.text} />;
    }
    return <MaterialCommunityIcons name={style.icon as any} size={size} color={colors.text} />;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable>
          <GlassView style={styles.modalContent} glassEffectStyle="regular">
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Map Style</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={[styles.modalCancel, { color: colors.icon }]}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.styleList} showsVerticalScrollIndicator={false}>
              {MAP_STYLES.map((style) => {
                const isSelected = style.url === currentStyle;
                return (
                  <TouchableOpacity
                    key={style.url}
                    style={[
                      styles.styleItem,
                      { borderBottomColor: colors.background },
                      isSelected && { backgroundColor: colors.buttonBackground },
                    ]}
                    onPress={() => handleSelectStyle(style.url)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.styleIcon}>{renderIcon(style, 28)}</View>
                    <View style={styles.styleInfo}>
                      <Text style={[styles.styleName, { color: colors.text }]}>{style.name}</Text>
                      <Text style={[styles.styleDescription, { color: colors.icon }]}>
                        {style.description}
                      </Text>
                    </View>
                    {isSelected && <MaterialIcons name="check" size={24} color={electricPurple} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
  styleList: {
    maxHeight: 400,
  },
  styleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderRadius: 8,
    marginBottom: 4,
  },
  styleIcon: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  styleInfo: {
    flex: 1,
  },
  styleName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  styleDescription: {
    fontSize: 12,
  },
});
