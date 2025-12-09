import React, { useCallback, useRef, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import BaseSheet, { BaseSheetRef } from './BaseSheet';
import { Text } from './ui/text';
import { Button } from './ui/button';
import { Icon } from './icon';
import { cn } from '@/lib/utils';

export interface MapStyle {
  name: string;
  url: string;
  description: string;
  icon: string;
  iconFamily: 'MaterialIcons' | 'MaterialCommunityIcons';
  isDark: boolean;
}

export const MAP_STYLES: MapStyle[] = [
  {
    name: 'Standard',
    url: 'mapbox://styles/mapbox/standard',
    description: 'Modern default style with dynamic features',
    icon: 'map',
    iconFamily: 'MaterialIcons',
    isDark: false,
  },
  {
    name: 'Standard Satellite',
    url: 'mapbox://styles/mapbox/standard-satellite',
    description: 'Satellite imagery with labels',
    icon: 'satellite-variant',
    iconFamily: 'MaterialCommunityIcons',
    isDark: false,
  },
  {
    name: 'Streets',
    url: 'mapbox://styles/mapbox/streets-v12',
    description: 'Classic street map',
    icon: 'map-outline',
    iconFamily: 'MaterialCommunityIcons',
    isDark: false,
  },
  {
    name: 'Outdoors',
    url: 'mapbox://styles/mapbox/outdoors-v12',
    description: 'Topographic style for outdoor activities',
    icon: 'terrain',
    iconFamily: 'MaterialIcons',
    isDark: false,
  },
  {
    name: 'Light',
    url: 'mapbox://styles/mapbox/light-v11',
    description: 'Minimalist light theme',
    icon: 'wb-sunny',
    iconFamily: 'MaterialIcons',
    isDark: false,
  },
  {
    name: 'Dark',
    url: 'mapbox://styles/mapbox/dark-v11',
    description: 'Minimalist dark theme',
    icon: 'nightlight-round',
    iconFamily: 'MaterialIcons',
    isDark: false,
  },
  {
    name: 'Satellite',
    url: 'mapbox://styles/mapbox/satellite-v9',
    description: 'Pure satellite imagery',
    icon: 'satellite',
    iconFamily: 'MaterialIcons',
    isDark: false,
  },
  {
    name: 'Satellite Streets',
    url: 'mapbox://styles/mapbox/satellite-streets-v12',
    description: 'Satellite with street overlays',
    icon: 'satellite-alt',
    iconFamily: 'MaterialIcons',
    isDark: false,
  },
  {
    name: 'Navigation Day',
    url: 'mapbox://styles/mapbox/navigation-day-v1',
    description: 'Optimized for daytime navigation',
    icon: 'navigation',
    iconFamily: 'MaterialIcons',
    isDark: false,
  },
  {
    name: 'Navigation Night',
    url: 'mapbox://styles/mapbox/navigation-night-v1',
    description: 'Optimized for nighttime navigation',
    icon: 'navigation',
    iconFamily: 'MaterialIcons',
    isDark: false,
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
  const sheetRef = useRef<BaseSheetRef>(null);

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
      const color = colorScheme === 'dark' ? '#fff' : '#000';
      if (style.iconFamily === 'MaterialIcons') {
        return <MaterialIcons name={style.icon as any} size={size} color={color} />;
      }
      return <MaterialCommunityIcons name={style.icon as any} size={size} color={color} />;
    },
    [colorScheme],
  );

  return (
    <BaseSheet
      ref={sheetRef}
      name="MapStylePicker"
      detents={[0.65, 0.95]}
      onDismiss={onClose}
      scrollable
      grabberVisible
    >
      {/* Header */}
      <View className="flex-row justify-between items-center p-4">
        <Text className="text-lg font-semibold">Map Style</Text>
        <Button variant="ghost" size="sm" onPress={onClose}>
          <Text className="text-base text-muted-foreground">Close</Text>
        </Button>
      </View>

      {/* Style List */}
      <ScrollView className="px-4" showsVerticalScrollIndicator={false}>
        <View className="gap-2 pb-8">
          {MAP_STYLES.map((style) => {
            const isSelected = style.url === currentStyle;
            return (
              <TouchableOpacity
                key={style.url}
                className={cn(
                  'flex-row items-center gap-3 p-3 rounded-lg',
                  isSelected ? 'bg-primary/50' : 'bg-muted/10',
                )}
                onPress={() => handleSelectStyle(style.url)}
                activeOpacity={0.7}
              >
                <View className="w-10 items-center">{renderIcon(style, 28)}</View>
                <View className="flex-1">
                  <Text className="font-semibold">{style.name}</Text>
                  <Text variant="small" className="text-muted-foreground">
                    {style.description}
                  </Text>
                </View>
                {isSelected && <Icon name="check" size={24} color="primary" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </BaseSheet>
  );
}
