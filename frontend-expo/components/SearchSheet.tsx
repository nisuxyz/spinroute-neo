import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Keyboard,
  Text,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { MaterialIcons } from '@expo/vector-icons';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useDebounce } from 'use-debounce';
import { useEnv } from '@/hooks/use-env';
import { useUserSettings } from '@/contexts/user-settings-context';
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
  const textColor = useThemeColor({}, 'text');
  const { settings } = useUserSettings();
  const { history, addToHistory, removeFromHistory } = useSearchHistory();
  const env = useEnv();

  const sheetRef = useRef<TrueSheet>(null);

  // Generate a new session token when the sheet opens
  useEffect(() => {
    if (visible) {
      setSessionToken(generateUUID());
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

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
          <MaterialIcons
            name={icon}
            size={20}
            color={textColor}
            style={{ marginRight: Spacing.md }}
          />
          <View style={{ flex: 1 }}>
            <Text style={[Typography.bodyLarge, { marginBottom: 2, color: textColor }]}>
              {name}
            </Text>
            <Text style={[{ fontSize: 13, color: textColor + 'CC' }]} numberOfLines={1}>
              {details}
            </Text>
          </View>
          {isHistory && (
            <TouchableOpacity
              onPress={handleRemove}
              style={{ padding: Spacing.sm, marginLeft: Spacing.sm }}
            >
              <MaterialIcons name="close" size={18} color={textColor + '80'} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    },
    [textColor, handleSelectSuggestion, handleSelectHistory, removeFromHistory],
  );

  return (
    <TrueSheet
      name="SearchSheet"
      ref={sheetRef}
      detents={[0.45, 0.9]}
      cornerRadius={24}
      onDidDismiss={onClose}
      scrollable
      keyboardMode="pan"
    >
      <View style={styles.container}>
        {/* Search Input - Fixed header */}
        <View style={styles.searchHeader}>
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={24} color={textColor} />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Search for places..."
              placeholderTextColor={textColor + '80'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={visible}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color={textColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Results List - Scrollable */}
        {loading && searchQuery.length >= 2 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={textColor} />
          </View>
        )}

        {combinedResults.length > 0 && (
          <FlatList
            data={combinedResults}
            keyExtractor={(item: CombinedResult) => `${item.type}-${item.data.mapbox_id}`}
            contentContainerStyle={styles.resultsContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            renderItem={renderItem}
            ListHeaderComponent={
              searchQuery.length < 2 && history.length > 0 ? (
                <Text
                  style={[
                    Typography.bodyMedium,
                    { marginBottom: Spacing.md, paddingHorizontal: 4, color: textColor + '80' },
                  ]}
                >
                  Recent Searches
                </Text>
              ) : null
            }
          />
        )}

        {!loading && searchQuery.length >= 2 && combinedResults.length === 0 && (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="search-off" size={48} color={textColor + '60'} />
            <Text
              style={[Typography.bodyLarge, { marginTop: Spacing.md, color: textColor + '80' }]}
            >
              No results found
            </Text>
          </View>
        )}

        {!loading && searchQuery.length < 2 && history.length === 0 && (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="history" size={48} color={textColor + '60'} />
            <Text
              style={[Typography.bodyLarge, { marginTop: Spacing.md, color: textColor + '80' }]}
            >
              No search history yet
            </Text>
          </View>
        )}
      </View>
    </TrueSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchHeader: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    gap: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  resultsContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: Spacing.xl,
  },
});

export default SearchSheet;
