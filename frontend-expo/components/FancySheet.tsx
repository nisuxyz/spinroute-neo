import React, { forwardRef, useImperativeHandle, useRef, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, useWindowDimensions, FlatList, Keyboard } from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { usePathname } from 'expo-router';
import {
  useMapboxSearch,
  type GeocodingResult,
  type CombinedResult,
  type SearchSuggestion,
} from '@/hooks/use-mapbox-search';
import type { SearchHistoryItem } from '@/hooks/use-search-history';
import { Text } from './ui/text';
import { Input } from './ui/input';
import { Icon, IconName } from './icon';
import { Skeleton } from './ui/skeleton';

export type { GeocodingResult } from '@/hooks/use-mapbox-search';

interface FancySheetProps {
  onSelectLocation?: (location: GeocodingResult) => void;
}

export interface FancySheetRef {
  present: (index?: number) => Promise<void>;
  dismiss: () => Promise<void>;
}

const FancySheet = forwardRef<FancySheetRef, FancySheetProps>(({ onSelectLocation }, ref) => {
  const sheetRef = useRef<TrueSheet>(null);
  const { height } = useWindowDimensions();

  const {
    searchQuery,
    setSearchQuery,
    loading,
    combinedResults,
    history,
    selectItem,
    removeFromHistory,
    clearSearch,
  } = useMapboxSearch();

  useImperativeHandle(ref, () => ({
    present: async (index = 0) => {
      await sheetRef.current?.present(index);
    },
    dismiss: async () => {
      await sheetRef.current?.dismiss();
    },
  }));

  const pathname = usePathname();

  // Auto-present/dismiss based on current route
  useEffect(() => {
    // Only show on the main map screen
    if (pathname === '/' || pathname === '/(tabs)') {
      sheetRef.current?.present(0);
    } else {
      setTimeout(() => sheetRef.current?.dismiss(), 100);
    }
  }, [pathname]);

  const getIconForFeatureType = (type: string): IconName => {
    switch (type) {
      case 'poi':
        return 'place';
      case 'address':
        return 'home';
      case 'place':
      case 'city':
      case 'locality':
        return 'location-city';
      case 'neighborhood':
        return 'location-on';
      case 'street':
        return 'route';
      case 'postcode':
        return 'markunread-mailbox';
      case 'region':
      case 'district':
        return 'map';
      case 'country':
        return 'public';
      default:
        return 'place';
    }
  };

  const handleSelectItem = useCallback(
    async (item: CombinedResult) => {
      const result = await selectItem(item);
      if (result) {
        onSelectLocation?.(result);
        clearSearch();
        Keyboard.dismiss();
        await sheetRef.current?.present(0);
      }
    },
    [selectItem, onSelectLocation, clearSearch],
  );

  const renderItem = useCallback(
    ({ item }: { item: CombinedResult }) => {
      const isHistory = item.type === 'history';
      const data = item.data;

      const icon: IconName = isHistory
        ? 'history'
        : getIconForFeatureType((data as SearchSuggestion).feature_type || 'place');
      const name = data.name;
      const details = isHistory
        ? (data as SearchHistoryItem).display_name
        : (data as SearchSuggestion).full_address ||
          (data as SearchSuggestion).place_formatted ||
          '';

      return (
        <TouchableOpacity
          className="flex-row items-center py-3 px-3 rounded-xl bg-muted/30 mb-2"
          onPress={() => handleSelectItem(item)}
        >
          <Icon name={icon} size={20} color="foreground" className="mr-3" />
          <View className="flex-1">
            <Text className="font-semibold mb-0.5">{name}</Text>
            {details && (
              <Text variant="small" className="text-muted-foreground" numberOfLines={1}>
                {details}
              </Text>
            )}
          </View>
          {isHistory && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                removeFromHistory((data as SearchHistoryItem).mapbox_id);
              }}
              className="p-2 ml-2"
            >
              <Icon name="close" size={18} color="mutedForeground" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    },
    [handleSelectItem, removeFromHistory],
  );

  return (
    <TrueSheet
      ref={sheetRef}
      detents={[72 / height, 0.5, 1]}
      initialDetentIndex={0}
      dimmedDetentIndex={2}
      dismissible={false}
      edgeToEdgeFullScreen
      cornerRadius={36}
      grabber={true}
      keyboardMode="pan"
      scrollable
    >
      <View className="flex-1 pt-3.5">
        {/* Search Header */}
        <View className="pb-4 px-4">
          <View className="flex-row items-center dark:bg-input/30 border-input bg-background/30 rounded-full px-4">
            <Icon name="search" size={20} color="mutedForeground" className="mr-2" />
            <Input
              variant="ghost"
              className="flex-1 h-11 border-0 bg-transparent shadow-none font-semibold"
              placeholder="Search for a place or address"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
                <Icon name="cancel" size={18} color="mutedForeground" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content Area */}
        <View className="flex-1">
          {loading && searchQuery.length >= 2 && (
            <View className="gap-2 px-4 pt-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} className="flex-row items-center py-3 px-3 rounded-xl bg-muted/30">
                  <Skeleton className="w-5 h-5 rounded-full mr-3" />
                  <View className="flex-1 gap-1.5">
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </View>
                </View>
              ))}
            </View>
          )}

          {combinedResults.length > 0 && (
            <FlatList
              data={combinedResults}
              keyExtractor={(item: CombinedResult) => `${item.type}-${item.data.mapbox_id}`}
              className="px-0 m-0"
              contentContainerClassName="mx-4 pt-4 px-0 m-0"
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              renderItem={renderItem}
              ListHeaderComponent={
                searchQuery.length < 2 && history.length > 0 ? (
                  <Text className="font-semibold text-muted-foreground mb-3 px-1">
                    Recent Searches
                  </Text>
                ) : null
              }
            />
          )}

          {!loading && searchQuery.length >= 2 && combinedResults.length === 0 && (
            <View className="flex-1 justify-center items-center py-12">
              <Icon name="search-off" size={48} color="mutedForeground" />
              <Text className="text-muted-foreground mt-4 text-center">No results found</Text>
            </View>
          )}

          {!loading && searchQuery.length < 2 && history.length === 0 && (
            <View className="flex-1 justify-center items-center py-12">
              <Icon name="location-on" size={48} color="mutedForeground" />
              <Text className="text-muted-foreground mt-4 text-center">
                Search for places, addresses, or stations
              </Text>
            </View>
          )}
        </View>
      </View>
    </TrueSheet>
  );
});

FancySheet.displayName = 'FancySheet';

export default FancySheet;
