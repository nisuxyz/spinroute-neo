import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Colors, electricPurple, Spacing, BorderRadius, Typography } from '@/constants/theme';

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
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Snap points for the bottom sheet
  const snapPoints = useMemo(() => ['65%'], []);

  // Open/close bottom sheet based on visible prop
  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  const handleSelectStyle = useCallback(
    (styleUrl: string) => {
      onSelectStyle(styleUrl);
      bottomSheetRef.current?.close();
    },
    [onSelectStyle],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
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

  if (!visible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.background }}
      handleIndicatorStyle={{ backgroundColor: colors.icon }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Map Style</Text>
      </View>
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {MAP_STYLES.map((style) => {
          const isSelected = style.url === currentStyle;
          return (
            <View
              key={style.url}
              style={[
                styles.styleItem,
                { backgroundColor: colors.buttonBackground },
                isSelected && { borderColor: electricPurple, borderWidth: 2 },
              ]}
            >
              <View style={styles.styleIcon}>{renderIcon(style, 28)}</View>
              <View style={styles.styleInfo}>
                <Text style={[styles.styleName, { color: colors.text }]}>{style.name}</Text>
                <Text style={[styles.styleDescription, { color: colors.icon }]}>
                  {style.description}
                </Text>
              </View>
              {isSelected && <MaterialIcons name="check" size={24} color={electricPurple} />}
            </View>
          );
        })}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    ...Typography.h1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.sm,
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
