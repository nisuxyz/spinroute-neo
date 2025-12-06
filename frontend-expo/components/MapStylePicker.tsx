import React, { useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, useColorScheme, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Colors, electricPurple, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

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
  const textColor = useThemeColor({}, 'text');
  const sheetRef = useRef<TrueSheet>(null);

  // Present/dismiss sheet when visible changes
  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSelectStyle = useCallback(
    (styleUrl: string) => {
      onSelectStyle(styleUrl);
      sheetRef.current?.dismiss();
    },
    [onSelectStyle],
  );

  const renderIcon = useCallback(
    (style: MapStyle, size: number = 24) => {
      if (style.iconFamily === 'MaterialIcons') {
        return <MaterialIcons name={style.icon as any} size={size} color={colors.text} />;
      }
      return <MaterialCommunityIcons name={style.icon as any} size={size} color={colors.text} />;
    },
    [colors.text],
  );

  return (
    <TrueSheet
      name="MapStylePicker"
      ref={sheetRef}
      detents={[0.65, 0.95]}
      cornerRadius={24}
      onDidDismiss={onClose}
      scrollable
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text, textAlign: 'center' }]}>Map Style</Text>
          <TouchableOpacity style={{ padding: 4 }} onPress={onClose}>
            <MaterialIcons name="close" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} nestedScrollEnabled>
          <View style={styles.content}>
            {MAP_STYLES.map((style) => {
              const isSelected = style.url === currentStyle;
              return (
                <TouchableOpacity
                  key={style.url}
                  style={[
                    styles.styleItem,
                    { backgroundColor: colors.buttonBackground },
                    isSelected && { borderColor: electricPurple, borderWidth: 2 },
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
          </View>
        </ScrollView>
      </View>
    </TrueSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  scrollContent: {
    // paddingBottom: Spacing.xl,
  },
  title: {
    ...Typography.h2,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
  styleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  styleIcon: {
    width: 40,
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  styleInfo: {
    flex: 1,
  },
  styleName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    marginBottom: 2,
  },
  styleDescription: {
    ...Typography.bodySmall,
  },
});
