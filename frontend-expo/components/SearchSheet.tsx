import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Platform,
  useColorScheme,
  Keyboard,
  Text,
  ActivityIndicator,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetFlatList,
  TouchableOpacity,
} from '@gorhom/bottom-sheet';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useDebounce } from 'use-debounce';
import { useEnv } from '@/hooks/use-env';
import { useUserSettings } from '@/hooks/use-user-settings';
import { useSearchHistory, type SearchHistoryItem } from '@/hooks/use-search-history';
import { fuzzySearch } from '@/utils/fuzzy-search';

interface SearchSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation?: (location: GeocodingResult) => void;
}

interface SearchSuggestion {
  name: string;
  mapbox_id: string;
  feature_type: string;
  full_address?: string;
  place_formatted?: string;
  maki?: string;
}

interface GeocodingResult {
  name: string;
  display_name: string;
  lat: number;
  lon: number;
  type: string;
  mapbox_id: string;
}

type CombinedResult =
  | { type: 'history'; data: SearchHistoryItem }
  | { type: 'suggestion'; data: SearchSuggestion };

const SearchSheet: React.FC<SearchSheetProps> = ({ visible, onClose, onSelectLocation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 300);
  const colorScheme = useColorScheme();
  const { settings } = useUserSettings();
  const { history, addToHistory, removeFromHistory } = useSearchHistory();
  const colors = Colors[colorScheme ?? 'light'];
  const hasGlassEffect = Platform.OS === 'ios' && isLiquidGlassAvailable();
  const env = useEnv();

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['90%'], []);

  // Generate a new session token when the sheet opens
  useEffect(() => {
    if (visible) {
      setSessionToken(generateUUID());
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
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

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const accessToken = env.MAPBOX_ACCESS_TOKEN;
        if (!accessToken) {
          console.warn('Mapbox access token not configured');
          return;
        }

        const response = await fetch(
          `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(debouncedQuery)}&language=en&limit=10&session_token=${sessionToken}&access_token=${accessToken}`,
        );

        if (!response.ok) {
          throw new Error('Search request failed');
        }

        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery, sessionToken, env.MAPBOX_ACCESS_TOKEN]);

  const handleClose = () => {
    Keyboard.dismiss();
    setSearchQuery('');
    setSuggestions([]);
    onClose();
  };

  const handleSelectSuggestion = async (suggestion: SearchSuggestion) => {
    try {
      const accessToken = env.MAPBOX_ACCESS_TOKEN;
      if (!accessToken) return;

      // Retrieve full details including coordinates
      const response = await fetch(
        `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?session_token=${sessionToken}&access_token=${accessToken}`,
      );

      if (!response.ok) {
        throw new Error('Retrieve request failed');
      }

      const data = await response.json();
      const feature = data.features?.[0];

      if (feature?.geometry?.coordinates) {
        const result: GeocodingResult = {
          name: suggestion.name,
          display_name: suggestion.full_address || suggestion.place_formatted || suggestion.name,
          lon: feature.geometry.coordinates[0],
          lat: feature.geometry.coordinates[1],
          type: suggestion.feature_type,
          mapbox_id: suggestion.mapbox_id,
        };

        // Add to history
        await addToHistory(result);

        // Notify parent and close sheet
        onSelectLocation?.(result);
        handleClose();
      }
    } catch (error) {
      console.error('Retrieve error:', error);
    }
  };

  const handleSelectHistory = async (item: SearchHistoryItem) => {
    const result: GeocodingResult = {
      name: item.name,
      display_name: item.display_name,
      lon: item.lon,
      lat: item.lat,
      type: item.type,
      mapbox_id: item.mapbox_id,
    };

    // Update timestamp by re-adding to history
    await addToHistory(result);

    // Notify parent and close sheet
    onSelectLocation?.(result);
    handleClose();
  };

  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // Combine history and suggestions based on search query
  const combinedResults = useMemo((): CombinedResult[] => {
    const results: CombinedResult[] = [];

    if (debouncedQuery.trim().length < 2) {
      // Show recent history when no search query
      return history.slice(0, 10).map((item) => ({ type: 'history', data: item }));
    }

    // Fuzzy search through history
    const historyMatches = fuzzySearch(
      debouncedQuery,
      history,
      (item) => `${item.name} ${item.display_name}`,
    );

    // Add top 3 history matches at the beginning
    historyMatches.slice(0, 3).forEach((match) => {
      results.push({ type: 'history', data: match.item });
    });

    // Add API suggestions
    suggestions.forEach((suggestion) => {
      results.push({ type: 'suggestion', data: suggestion });
    });

    return results;
  }, [debouncedQuery, history, suggestions]);

  const getIconForFeatureType = (type: string): any => {
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

  const GlassContainer = hasGlassEffect ? GlassView : View;

  const renderItem = useCallback(
    ({ item }: { item: CombinedResult }) => {
      const isHistory = item.type === 'history';
      const data = item.data;

      const handlePress = () => {
        if (isHistory) {
          handleSelectHistory(data as SearchHistoryItem);
        } else {
          handleSelectSuggestion(data as SearchSuggestion);
        }
      };

      const handleRemove = (e: any) => {
        e.stopPropagation();
        if (isHistory) {
          removeFromHistory((data as SearchHistoryItem).mapbox_id);
        }
      };

      const icon = isHistory
        ? 'history'
        : getIconForFeatureType((data as any).feature_type || (data as any).type);
      const name = data.name;
      const details = isHistory
        ? (data as SearchHistoryItem).display_name
        : (data as SearchSuggestion).full_address ||
          (data as SearchSuggestion).place_formatted ||
          '';

      return (
        <TouchableOpacity style={styles.resultItem} onPress={handlePress}>
          <MaterialIcons name={icon} size={20} color={colors.text} style={styles.resultIcon} />
          <View style={styles.resultTextContainer}>
            <Text style={[styles.resultName, { color: colors.text }]}>{name}</Text>
            <Text style={[styles.resultDetails, { color: colors.text + 'CC' }]} numberOfLines={1}>
              {details}
            </Text>
          </View>
          {isHistory && (
            <TouchableOpacity onPress={handleRemove} style={styles.removeButton}>
              <MaterialIcons name="close" size={18} color={colors.text + '80'} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    },
    [colors.text, handleSelectSuggestion, handleSelectHistory, removeFromHistory],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      onChange={handleSheetChanges}
      onDismiss={handleDismiss}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={[
        styles.sheetBackground,
        hasGlassEffect
          ? { backgroundColor: 'transparent' }
          : { backgroundColor: colors.buttonBackground },
      ]}
      handleIndicatorStyle={{ backgroundColor: colors.text + '40' }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      enableBlurKeyboardOnGesture
    >
      <GlassContainer
        style={styles.glassSheet}
        {...(hasGlassEffect && { glassEffectStyle: 'regular' })}
      >
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={24} color={colors.text} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search for places..."
            placeholderTextColor={colors.text + '80'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={visible}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Results List */}
        {loading && searchQuery.length >= 2 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.text} />
          </View>
        )}

        {combinedResults.length > 0 && (
          <BottomSheetFlatList
            data={combinedResults}
            keyExtractor={(item: CombinedResult) => `${item.type}-${item.data.mapbox_id}`}
            contentContainerStyle={styles.resultsContent}
            keyboardShouldPersistTaps="handled"
            renderItem={renderItem}
            ListHeaderComponent={
              searchQuery.length < 2 && history.length > 0 ? (
                <Text style={[styles.sectionHeader, { color: colors.text + '80' }]}>
                  Recent Searches
                </Text>
              ) : null
            }
          />
        )}

        {!loading && searchQuery.length >= 2 && combinedResults.length === 0 && (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="search-off" size={48} color={colors.text + '60'} />
            <Text style={[styles.emptyText, { color: colors.text + '80' }]}>No results found</Text>
          </View>
        )}

        {!loading && searchQuery.length < 2 && history.length === 0 && (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="history" size={48} color={colors.text + '60'} />
            <Text style={[styles.emptyText, { color: colors.text + '80' }]}>
              No search history yet
            </Text>
          </View>
        )}

        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <MaterialIcons name="keyboard-arrow-down" size={32} color={colors.text} />
        </TouchableOpacity>
      </GlassContainer>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  glassSheet: {
    flex: 1,
    padding: 20,
    paddingTop: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 24,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  resultsContent: {
    paddingTop: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  resultIcon: {
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  resultDetails: {
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default SearchSheet;
